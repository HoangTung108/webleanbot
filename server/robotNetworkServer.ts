import {OnlineCompetition} from './onlineCompetition';
import type {OnlineCommand} from '../src/simulator/onlineCompetition';
import {isFinitePose,separateRobots} from '../src/simulator/robotCollision';
import {isValidRobotMessage} from '../src/lib/robotMessage';
import {normalizeRobotColor} from '../src/lib/robotColorSignal';
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
  ownerId?: string;
  competition?: OnlineCompetition;
  password?: string;
  maxPeers: number;
  clients: Map<string, ClientConnection>;
  wifiPeers: Set<string>;
  createdAt: number;
  lastColorSignal?: {
    peerId: string;
    color: string;
    timestamp: number;
    senderRobotId?: string;
  };
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
  command?: OnlineCommand;
  type: string;
  clientId?: string;
  roomId?: string;
  password?: string;
  peerId?: string;
  state?: any;
  robotId?: string;
  maxPeers?: number;
  payload?: unknown;
  color?: string;
  senderRobotId?: string;
  timestamp?: number;
}

class RobotNetworkServer {
  private rooms: Map<string, Room> = new Map();
  private wss: WebSocketServer;
  private server: http.Server;
  private port: number;
  private timer?: ReturnType<typeof setInterval>;
  private snapshotTimer?: ReturnType<typeof setInterval>;
  private iotAttributes = new Map<string, string>();

  constructor(port: number = 8080) {
    this.port = port;
    this.server = http.createServer((request, response) => {
      this.handleHttpRequest(request, response);
    });
    this.wss = new WebSocketServer({ noServer: true,maxPayload:300000 });
    this.setupRoutes();
  }

  private async handleHttpRequest(request: http.IncomingMessage, response: http.ServerResponse) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const host = request.headers.host || 'localhost';
    const parsedUrl = new URL(request.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        ok: true,
        service: 'leanbot-robot-network',
        competitionProtocol: 1,
        colorProtocol: 1,
        revision: process.env.RENDER_GIT_COMMIT ?? null,
      }));
      return;
    }

    // GET /api/rooms/:roomId/color
    const roomColorMatch = pathname.match(/^\/api\/rooms\/([^/]+)\/color$/);
    if (roomColorMatch && request.method === 'GET') {
      const roomId = decodeURIComponent(roomColorMatch[1]).toUpperCase();
      const wifiClientId = parsedUrl.searchParams.get('clientId');
      let room = this.rooms.get(roomId);
      if (wifiClientId) {
        if (!room) {
          this.handleCreateRoom({ type: 'create-room', roomId, maxPeers: 2 }, roomId);
          room = this.rooms.get(roomId);
        }
        room?.wifiPeers.add(wifiClientId);
      }
      const signal = room?.lastColorSignal;
      const iotColor = normalizeRobotColor(this.iotAttributes.get(JSON.stringify([roomId, 'Color'])));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        ok: true,
        roomId,
        color: signal?.color ?? iotColor ?? 'WAITING',
        peerId: signal?.peerId ?? null,
        senderRobotId: signal?.senderRobotId ?? null,
        timestamp: signal?.timestamp ?? null,
        wifiPeers: room ? [...room.wifiPeers] : [],
      }));
      return;
    }

    // POST /api/rooms/:roomId/color
    if (roomColorMatch && request.method === 'POST') {
      const roomId = decodeURIComponent(roomColorMatch[1]).toUpperCase();
      try {
        const body = await this.readJsonBody(request);
        const rawColor = body.color ?? body.payload ?? body;
        const color = normalizeRobotColor(rawColor);
        if (!color) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({
            ok: false,
            message: 'Tín hiệu màu không hợp lệ. Các màu được hỗ trợ: RED, GREEN, BLUE, YELLOW, PURPLE, UNKNOWN, WAITING.',
          }));
          return;
        }

        let room = this.rooms.get(roomId);
        if (!room) {
          this.handleCreateRoom({ type: 'create-room', roomId, maxPeers: 2 }, roomId);
          room = this.rooms.get(roomId);
        }

        if (room?.password && body.password !== undefined && room.password !== body.password) {
          response.writeHead(403, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ ok: false, message: 'Sai mật khẩu phòng.' }));
          return;
        }

        const timestamp = typeof body.timestamp === 'number' && Number.isFinite(body.timestamp) ? body.timestamp : Date.now();
        const senderRobotId = String(body.senderRobotId || body.clientId || 'wifi-robot');
        const colorPayload = {
          type: 'color-signal',
          peerId: senderRobotId,
          senderRobotId,
          color,
          timestamp,
        };

        this.iotAttributes.set(JSON.stringify([roomId, 'Color']), color);
        if (room) {
          room.wifiPeers.add(senderRobotId);
          room.lastColorSignal = { peerId: senderRobotId, color, timestamp, senderRobotId };
          const data = JSON.stringify(colorPayload);
          for (const recipient of room.clients.values()) {
            if (recipient.ws.readyState === WebSocket.OPEN) {
              recipient.ws.send(data);
            }
          }
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
          ok: true,
          roomId,
          color,
          senderRobotId,
          broadcastedTo: room ? room.clients.size : 0,
          timestamp,
        }));
        return;
      } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, message: 'Dữ liệu JSON không hợp lệ.' }));
        return;
      }
    }

    // GET /api/iot/attribute?assetId=...&attribute=...
    if (pathname === '/api/iot/attribute' && request.method === 'GET') {
      const assetId = parsedUrl.searchParams.get('assetId') || '';
      const attribute = parsedUrl.searchParams.get('attribute') || 'Color';
      const wifiClientId = parsedUrl.searchParams.get('clientId');
      const key = JSON.stringify([assetId, attribute]);
      const upperKey = JSON.stringify([assetId.toUpperCase(), attribute]);
      const room = assetId ? this.rooms.get(assetId.toUpperCase()) : undefined;
      if (wifiClientId && room) {
        room.wifiPeers.add(wifiClientId);
      }
      const value =
        this.iotAttributes.get(key) ??
        this.iotAttributes.get(upperKey) ??
        (attribute === 'Color' && room?.lastColorSignal ? room.lastColorSignal.color : undefined) ??
        'waiting';
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, assetId, attribute, value }));
      return;
    }

    // POST /api/iot/attribute
    if (pathname === '/api/iot/attribute' && request.method === 'POST') {
      try {
        const body = await this.readJsonBody(request);
        const assetId = String(body.assetId || '');
        const attribute = String(body.attribute || 'Color');
        const value = String(body.value ?? '');
        const key = JSON.stringify([assetId, attribute]);
        this.iotAttributes.set(key, value);
        if (assetId) {
          this.iotAttributes.set(JSON.stringify([assetId.toUpperCase(), attribute]), value);
        }

        if (attribute === 'Color') {
          const color = normalizeRobotColor(value);
          if (color) {
            const roomId = assetId.toUpperCase();
            let room = this.rooms.get(roomId);
            if (!room && roomId) {
              this.handleCreateRoom({ type: 'create-room', roomId, maxPeers: 2 }, roomId);
              room = this.rooms.get(roomId);
            }
            if (room) {
              const timestamp = Date.now();
              const sender = String(body.clientId || body.senderRobotId || 'iot-wifi-robot');
              room.wifiPeers.add(sender);
              room.lastColorSignal = { peerId: sender, color, timestamp, senderRobotId: sender };
              const data = JSON.stringify({
                type: 'color-signal',
                peerId: sender,
                senderRobotId: sender,
                color,
                timestamp,
              });
              for (const recipient of room.clients.values()) {
                if (recipient.ws.readyState === WebSocket.OPEN) {
                  recipient.ws.send(data);
                }
              }
            }
          }
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true, assetId, attribute, value }));
        return;
      } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, message: 'Dữ liệu JSON không hợp lệ.' }));
        return;
      }
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: false, message: 'Endpoint không tồn tại.' }));
  }

  private readJsonBody(request: http.IncomingMessage, maxBytes = 32768): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      request.on('data', chunk => {
        body += chunk;
        if (body.length > maxBytes) {
          request.destroy();
          reject(new Error('Payload too large'));
        }
      });
      request.on('end', () => {
        if (!body.trim()) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ payload: body.trim() });
        }
      });
      request.on('error', reject);
    });
  }

  private setupRoutes() {
    this.server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const clientId = url.searchParams.get('clientId');
      const roomId = url.searchParams.get('roomId');
      const autoJoin = url.searchParams.get('mode') === 'wifi' || url.searchParams.get('autoJoin') === '1';

      if (!clientId || !roomId) {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.handleNewConnection(ws, clientId, roomId, autoJoin);
      });
    });
  }

  private handleNewConnection(ws: WebSocket, clientId: string, roomId: string, autoJoin = false) {
    console.log(`New connection: ${clientId} to room ${roomId}`);

    const client: ClientConnection = {
      id: clientId,
      ws,
    };

    if (autoJoin) {
      if (!this.rooms.has(roomId)) {
        this.handleCreateRoom({ type: 'create-room', roomId, maxPeers: 2 }, roomId);
      }
      this.joinRoom(client, roomId);
    }

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

      case 'competition-command':
        try {
          room.competition?.advanceWall(performance.now());
          const cmd=message.command;if(!cmd)throw new Error('Thiếu lệnh phiên thi.');
          if(cmd.action==='enable'){
            if(client.id!==room.ownerId||room.competition)throw new Error('Chỉ chủ phòng có thể tạo phiên thi mới.');
            room.competition=new OnlineCompetition(client.id,[...room.clients.keys()]);
          }else if(cmd.action==='disable'||cmd.action==='new'){
            const session=room.competition;
            if(!session||client.id!==session.ownerId||cmd.sessionId!==session.sessionId||cmd.round!==session.flow.round)throw new Error('Phiên thi hoặc quyền điều khiển không hợp lệ.');
            if(cmd.action==='new'&&session.flow.phase!=='complete')throw new Error('Cần hoàn tất hai vòng.');
            if(cmd.action==='disable'&&(session.flow.locked||[...session.players.values()].some(p=>p.locked)))throw new Error('Không thể tắt phiên đang khóa code.');
            session.dispose();room.competition=cmd.action==='new'?new OnlineCompetition(client.id,[...room.clients.keys()]):undefined;
          }else {if(!room.competition)throw new Error('Chưa bật phiên thi online.');room.competition.command(client.id,cmd);}
          this.broadcastCompetition(room);
        }catch(error){client.ws.send(JSON.stringify({type:'error',message:(error as Error).message}));}
        break;
      case 'robot-state':
        if(room.competition)return;
        this.handleRobotStateUpdate(client, message, room);
        break;

      case 'robot-message': {
        if (room.competition) {
          client.ws.send(JSON.stringify({type:'error', message:'Không thể gửi dữ liệu riêng trong phiên thi online.'}));
          break;
        }
        if (!isValidRobotMessage(message.payload)) {
          client.ws.send(JSON.stringify({type:'error', message:'Dữ liệu phải là chuỗi UTF-8 từ 1 đến 1024 byte.'}));
          break;
        }
        const recipients = [...room.clients.values()].filter(peer => peer !== client && peer.ws.readyState === WebSocket.OPEN);
        if (!recipients.length) {
          client.ws.send(JSON.stringify({type:'error', message:'Không có robot khác trong phòng để nhận dữ liệu.'}));
          break;
        }
        if (recipients.some(peer => peer.ws.bufferedAmount > 65536)) {
          client.ws.send(JSON.stringify({type:'error', message:'Kết nối nhận đang bận; dữ liệu chưa được gửi.'}));
          break;
        }
        const data = JSON.stringify({type:'robot-message', peerId:client.id, payload:message.payload});
        for (const recipient of recipients) recipient.ws.send(data);
        break;
      }

      case 'color-signal': {
        if (room.competition) {
          client.ws.send(JSON.stringify({ type: 'error', message: 'Không thể gửi tín hiệu màu trong phiên thi online.' }));
          break;
        }
        const rawColor = message.color ?? (typeof message.payload === 'string' ? message.payload : (message.payload as any)?.color);
        const color = normalizeRobotColor(rawColor);
        if (!color) {
          client.ws.send(JSON.stringify({ type: 'error', message: 'Tín hiệu màu không hợp lệ. Các màu được hỗ trợ: RED, GREEN, BLUE, YELLOW, PURPLE, UNKNOWN, WAITING.' }));
          break;
        }
        const timestamp = typeof message.timestamp === 'number' && Number.isFinite(message.timestamp) ? message.timestamp : Date.now();
        const senderRobotId = message.senderRobotId || client.robotId || client.id;
        room.lastColorSignal = { peerId: client.id, color, timestamp, senderRobotId };
        this.iotAttributes.set(JSON.stringify([roomId.toUpperCase(), 'Color']), color);
        const recipients = [...room.clients.values()].filter(peer => peer !== client && peer.ws.readyState === WebSocket.OPEN);
        if (!recipients.length && room.wifiPeers.size === 0) {
          client.ws.send(JSON.stringify({ type: 'error', message: 'Không có robot khác trong phòng để nhận tín hiệu màu.' }));
          break;
        }
        if (recipients.some(peer => peer.ws.bufferedAmount > 65536)) {
          client.ws.send(JSON.stringify({ type: 'error', message: 'Kết nối nhận đang bận; tín hiệu màu chưa được gửi.' }));
          break;
        }
        const colorPayload = {
          type: 'color-signal',
          peerId: client.id,
          senderRobotId,
          color,
          timestamp,
        };
        const data = JSON.stringify(colorPayload);
        for (const recipient of recipients) recipient.ws.send(data);
        break;
      }

      case 'get-color-signal': {
        if (room.lastColorSignal) {
          client.ws.send(JSON.stringify({
            type: 'color-signal',
            ...room.lastColorSignal,
          }));
        } else {
          client.ws.send(JSON.stringify({
            type: 'color-signal',
            color: 'WAITING',
            peerId: 'system',
            timestamp: Date.now(),
          }));
        }
        break;
      }

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
      wifiPeers: new Set(),
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

    if(room.competition&&!room.competition.canJoin){client.ws.send(JSON.stringify({type:'error',message:'Phiên thi đã khóa danh sách robot.'}));client.ws.close();return;}
    room.clients.set(client.id, client);
    room.ownerId??=client.id;room.competition?.addPlayer(client.id);
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
      ownerId:room.ownerId,competitionProtocol:1,
      roomId,
      clientId: client.id,
      robotId: client.robotId,
      lastColorSignal: room.lastColorSignal ?? null,
      peers: Array.from(room.clients.entries())
        .filter(([id]) => id !== client.id)
        .map(([id, c]) => ({
          id,
          robotId: c.robotId,
          state: c.lastState,
        })),
    }));

    this.broadcastCompetition(room);
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

    room.competition?.removePlayer(client.id);
    room.clients.delete(client.id);
    if(room.ownerId===client.id)room.ownerId=room.clients.keys().next().value;
    this.broadcastCompetition(room);
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
    if (room.clients.size === 0 && room.wifiPeers.size === 0) {
      room.competition?.dispose();this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted`);
    }
  }

  private findClientRoom(client: ClientConnection): string | null {
    for (const [roomId, room] of this.rooms) {
      if (room.clients.get(client.id)===client) {
        return roomId;
      }
    }
    return null;
  }

  private broadcastCompetition(room:Room){
    const data=JSON.stringify({type:'competition-state',state:room.competition?.snapshot()??null,ownerId:room.ownerId});
    for(const c of room.clients.values())if(c.ws.readyState===WebSocket.OPEN)c.ws.send(data);
  }
  start() {
    // Give physics enough CPU opportunities at 10x without increasing snapshot
    // traffic or asking clients to run their own authoritative simulation.
    this.timer=setInterval(()=>{for(const room of this.rooms.values())room.competition?.advanceWall(performance.now());},20);
    this.snapshotTimer=setInterval(()=>{for(const room of this.rooms.values())if(room.competition)this.broadcastCompetition(room);},50);
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`Robot Network Server running on ws://localhost:${this.port}`);
      console.log('Waiting for connections...');
    });
  }

  stop() {
    clearInterval(this.timer);clearInterval(this.snapshotTimer);for(const room of this.rooms.values())room.competition?.dispose();
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
