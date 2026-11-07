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
    if (!message.state) return;

    client.lastState = message.state;

    // Broadcast state to all other clients in room
    const syncMessage = {
      type: 'state-sync',
      peerId: client.id,
      robotId: client.robotId,
      state: message.state,
    };

    room.clients.forEach((c, id) => {
      if (id !== client.id && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify(syncMessage));
      }
    });
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
