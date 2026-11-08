import {isFinitePose,separateRobots} from '../src/simulator/robotCollision';
/**
 * Multi-Robot WebSocket Server
 * Handles room management and robot state synchronization
 * 
 * Run with: npm run server:network
 */

import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

interface Room {
  id: string;
  password?: string;
  maxPeers: number;
  clients: Map<string, ClientConnection>;
  createdAt: number;
}

interface ClientConnection {
  id: string;
  ws: WebSocket;
  robotId?: string;
  lastState?: {
    pose: { x: number; y: number; heading: number };
    motorLeft: number;
    motorRight: number;
    timestamp: number;
    supported?:boolean;
    gripper?:{left:number;right:number};
  };
}

interface Message {
  type: string;
  clientId?: string;
  roomId?: string;
  password?: string;
  peerId?: string;
  state?: any;
  robotId?: string;
  maxPeers?: number;
}

class RobotNetworkServer {
  private rooms: Map<string, Room> = new Map();
  private wss: WebSocketServer;
  private server: http.Server;
  private port: number;

  constructor(port: number = 8080) {
    this.port = port;
    this.server = http.createServer((request, response) => {
      if (request.url?.split('?')[0] === '/health') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true, service: 'leanbot-robot-network' }));
        return;
      }
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Not found');
    });
    this.wss = new WebSocketServer({ noServer: true });
    this.setupRoutes();
  }

  private setupRoutes() {
    this.server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const clientId = url.searchParams.get('clientId');
      const roomId = url.searchParams.get('roomId');

      if (!clientId || !roomId) {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.handleNewConnection(ws, clientId, roomId);
      });
    });
  }

  private handleNewConnection(ws: WebSocket, clientId: string, roomId: string) {
    console.log(`New connection: ${clientId} to room ${roomId}`);

    const client: ClientConnection = {
      id: clientId,
      ws,
    };

    ws.on('message', (data) => {
      try {
        const message: Message = JSON.parse(data.toString());
        if (!this.findClientRoom(client)) {
          if (message.type !== 'create-room' && message.type !== 'join-room') return;
          const existing = this.rooms.get(roomId);
          const error = message.type === 'create-room' && existing ? 'Room already exists'
            : message.type === 'join-room' && !existing ? 'Room not found'
            : existing?.password && existing.password !== message.password ? 'Incorrect password' : null;
          if (error) { ws.send(JSON.stringify({ type: 'error', message: error })); ws.close(); return; }
          if (!existing) this.handleCreateRoom({ ...message, maxPeers: 2 }, roomId);
          this.joinRoom(client, roomId);
          return;
        }
        this.handleMessage(client, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('close', () => {
      this.handleClientDisconnect(client, roomId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });


  }

  private handleMessage(client: ClientConnection, message: Message) {
    const roomId = this.findClientRoom(client);

    if (!roomId) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Not in any room',
      }));
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) return;

    switch (message.type) {
      case 'create-room':
        this.handleCreateRoom(message, roomId);
        break;

      case 'robot-state':
        this.handleRobotStateUpdate(client, message, room);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleCreateRoom(message: Message, roomId: string) {
    if (this.rooms.has(roomId)) {
      return; // Room already exists
    }

    const room: Room = {
      id: roomId,
      password: message.password,
      maxPeers: message.maxPeers || 2,
      clients: new Map(),
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    console.log(`Room created: ${roomId}`);
  }

  private joinRoom(client: ClientConnection, roomId: string) {
    let room = this.rooms.get(roomId);

    // Create room if it doesn't exist
    if (!room) {
      this.handleCreateRoom({ type: 'create-room', roomId }, roomId);
      room = this.rooms.get(roomId)!;
    }

    if (room.clients.has(client.id) || room.clients.size >= room.maxPeers) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Room is full',
      }));
      client.ws.close();
      return;
    }

    room.clients.set(client.id, client);
    client.robotId = Array.from(room.clients.values()).some(c => c !== client && c.robotId === 'Robot-1') ? 'Robot-2' : 'Robot-1';

    // Notify existing clients about new peer
    const joinMessage = {
      type: 'peer-joined',
      peerId: client.id,
      robotId: client.robotId,
      timestamp: Date.now(),
    };

    room.clients.forEach((c, id) => {
      if (id !== client.id) {
        c.ws.send(JSON.stringify(joinMessage));
      }
    });

    // Send room info to new client
    client.ws.send(JSON.stringify({
      type: 'room-joined',
      roomId,
      clientId: client.id,
      robotId: client.robotId,
      peers: Array.from(room.clients.entries())
        .filter(([id]) => id !== client.id)
        .map(([id, c]) => ({
          id,
          robotId: c.robotId,
          state: c.lastState,
        })),
    }));

    console.log(`Client ${client.id} joined room ${roomId}. Total: ${room.clients.size}`);
  }

  private handleRobotStateUpdate(client: ClientConnection, message: Message, room: Room) {
    if (!isFinitePose(message.state?.pose)) return;
    const state=message.state;
    const grip=state.gripper;
    client.lastState={
      pose:{...state.pose},motorLeft:Number.isFinite(state.motorLeft)?Math.max(-65,Math.min(65,state.motorLeft)):0,
      motorRight:Number.isFinite(state.motorRight)?Math.max(-65,Math.min(65,state.motorRight)):0,
      timestamp:Date.now(),supported:state.supported!==false,
      gripper:grip&&[grip.left,grip.right].every(Number.isFinite)?{left:Math.max(0,Math.min(90,grip.left)),right:Math.max(0,Math.min(90,grip.right))}:undefined,
    };
    const corrected=new Set<ClientConnection>();
    if(client.lastState.supported)for(let pass=0;pass<4;pass++) {
      let changed=false;
      for(const other of room.clients.values()) {
        if(other===client||!other.lastState||other.lastState.supported===false)continue;
        const separated=separateRobots(client.lastState.pose,other.lastState.pose);if(!separated)continue;
        client.lastState.pose=separated.a;other.lastState.pose=separated.b;
        corrected.add(client);corrected.add(other);changed=true;
      }
      if(!changed)break;
    }
    for(const subject of corrected)if(subject.ws.readyState===WebSocket.OPEN)subject.ws.send(JSON.stringify({type:'pose-correction',pose:subject.lastState!.pose,peers:[...room.clients.values()].filter(peer=>peer!==subject&&peer.lastState).map(peer=>({peerId:peer.id,state:peer.lastState}))}));
    // Broadcast canonical positions, including corrections to a stationary peer.
    for(const subject of new Set([client,...corrected]))for(const recipient of room.clients.values()) {
      if(recipient!==subject&&recipient.ws.readyState===WebSocket.OPEN)recipient.ws.send(JSON.stringify({type:'state-sync',peerId:subject.id,robotId:subject.robotId,state:subject.lastState}));
    }
  }

  private handleClientDisconnect(client: ClientConnection, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.clients.get(client.id) !== client) return;

    room.clients.delete(client.id);
    console.log(`Client ${client.id} disconnected. Remaining: ${room.clients.size}`);

    // Notify others
    const leaveMessage = {
      type: 'peer-left',
      peerId: client.id,
      robotId: client.robotId,
    };

    room.clients.forEach((c) => {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify(leaveMessage));
      }
    });

    // Clean up empty rooms
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted`);
    }
  }

  private findClientRoom(client: ClientConnection): string | null {
    for (const [roomId, room] of this.rooms) {
      if (room.clients.has(client.id)) {
        return roomId;
      }
    }
    return null;
  }

  start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`Robot Network Server running on ws://localhost:${this.port}`);
      console.log('Waiting for connections...');
    });
  }

  stop() {
    this.wss.close();
    this.server.close();
  }
}

// Start server
const server = new RobotNetworkServer(process.env.PORT ? parseInt(process.env.PORT) : 8080);
server.start();

process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.stop();
  process.exit(0);
});
