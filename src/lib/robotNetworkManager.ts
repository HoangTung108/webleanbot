/**
 * Robot Network Manager - Multi-robot online synchronization
 * Handles WebSocket connection, room management, and state sync
 */

export interface RobotPeerState {
  id: string;
  robotId: string;
  pose: { x: number; y: number; heading: number };
  motorLeft: number;
  motorRight: number;
  timestamp: number;
}

export interface RoomConfig {
  roomId: string;
  password?: string;
  maxPeers: number;
}

export type NetworkEventType = 'connected' | 'disconnected' | 'peer-joined' | 'peer-left' | 'state-sync' | 'error';

export interface NetworkEvent {
  type: NetworkEventType;
  data?: any;
  error?: string;
}

export class RobotNetworkManager {
  private joined = false;
  private password?: string;
  private creating = false;
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private clientId: string;
  private peers: Map<string, RobotPeerState> = new Map();
  private listeners: Map<NetworkEventType, Set<(event: NetworkEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private serverUrl: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(serverUrl?: string) {
    const configuredUrl = serverUrl || import.meta.env.VITE_WEBSOCKET_URL;
    const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost:8080/';
    const url = new URL(configuredUrl || '/ws', base);
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (url.protocol === 'https:') url.protocol = 'wss:';
    this.serverUrl = url.toString();

    this.clientId = this.generateClientId();
    this.initializeListeners();
    console.log('RobotNetworkManager initialized with server:', this.serverUrl);
  }

  private initializeListeners() {
    const eventTypes: NetworkEventType[] = ['connected', 'disconnected', 'peer-joined', 'peer-left', 'state-sync', 'error'];
    eventTypes.forEach(type => {
      this.listeners.set(type, new Set());
    });
  }

  /**
   * Subscribe to network events
   */
  on(type: NetworkEventType, callback: (event: NetworkEvent) => void): void {
    this.listeners.get(type)?.add(callback);
  }

  /**
   * Unsubscribe from network events
   */
  off(type: NetworkEventType, callback: (event: NetworkEvent) => void): void {
    this.listeners.get(type)?.delete(callback);
  }

  /**
   * Emit network event to all listeners
   */
  private emit(type: NetworkEventType, data?: any, error?: string): void {
    const callbacks = this.listeners.get(type);
    callbacks?.forEach(callback => {
      callback({ type, data, error });
    });
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `robot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Connect to room
   */
  async connectToRoom(roomId: string, password?: string): Promise<boolean> {
    try {
      this.disconnect();
      this.reconnectAttempts = 0;
      this.roomId = roomId;
      this.password = password;
      this.creating = false;
      return await this.connectWebSocket();
    } catch (error) {
      this.emit('error', undefined, `Failed to connect to room: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Create new room
   */
  async createRoom(password?: string, maxPeers: number = 2): Promise<string | null> {
    try {
      this.disconnect();
      this.reconnectAttempts = 0;
      this.roomId = this.generateRoomId();
      this.password = password;
      this.creating = true;
      const connected = await this.connectWebSocket();
      if (connected) return this.roomId;
      return null;
    } catch (error) {
      this.emit('error', undefined, `Failed to create room: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Generate random room ID
   */
  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Connect WebSocket
   */
  private connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let settled = false;
      const settle = (connected: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(connected);
      };
      try {
        const url = new URL(this.serverUrl);
        url.searchParams.set('clientId', this.clientId);
        url.searchParams.set('roomId', this.roomId || '');
        const socket = new WebSocket(url.toString());
        this.ws = socket;
        const reportError = () => this.emit('error', undefined,
          `Không kết nối được máy chủ nhiều robot (${this.serverUrl}). Khi chạy local, dùng npm run dev hoặc npm run server:network. Khi triển khai, cấu hình VITE_WEBSOCKET_URL tới máy chủ WSS đang hoạt động.`);
        timeout = setTimeout(() => {
          if (this.ws !== socket) return;
          reportError();
          settle(false);
          socket.close();
        }, 8000);
        socket.onopen = () => {
          if (this.ws !== socket) return;
          this.reconnectAttempts = 0;
          socket.send(JSON.stringify({ type: this.creating ? 'create-room' : 'join-room', password: this.password }));
        };
        socket.onmessage = (event) => {
          if (this.ws !== socket) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'room-joined') {
              this.joined = true;
              this.creating = false;
              this.peers.clear();
              for (const peer of message.peers || []) {
                this.handleMessage({ type: 'peer-joined', peerId: peer.id, ...peer });
                if (peer.state) this.handleMessage({ type: 'state-sync', peerId: peer.id, state: peer.state });
              }
              settle(true);
              this.emit('connected', message);
            } else {
              this.handleMessage(message);
              if (message.type === 'error' && !this.joined) {
                this.roomId = null;
                settle(false);
                socket.close();
              }
            }
          }
          catch { this.emit('error', undefined, 'Máy chủ nhiều robot trả dữ liệu không hợp lệ.'); }
        };
        socket.onerror = () => {
          if (this.ws !== socket) return;
          reportError();
          settle(false);
        };
        socket.onclose = () => {
          settle(false);
          if (this.ws !== socket) return;
          this.ws = null;
          this.joined = false;
          this.peers.clear();
          this.emit('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        this.emit('error', undefined, `Không thể mở WebSocket: ${error instanceof Error ? error.message : String(error)}`);
        settle(false);
      }
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'peer-joined':
        this.peers.set(message.peerId, {
          id: message.peerId,
          robotId: message.robotId || message.peerId,
          pose: message.pose || { x: 0, y: 0, heading: 0 },
          motorLeft: 0,
          motorRight: 0,
          timestamp: Date.now(),
        });
        this.emit('peer-joined', message);
        break;

      case 'peer-left':
        this.peers.delete(message.peerId);
        this.emit('peer-left', message);
        break;

      case 'state-sync':
        this.updatePeerState(message.peerId, message.state);
        this.emit('state-sync', { peerId: message.peerId, state: message.state });
        break;

      case 'error':
        this.emit('error', undefined, message.message);
        break;
    }
  }

  /**
   * Send robot state update
   */
  sendRobotState(pose: { x: number; y: number; heading: number }, motorLeft: number, motorRight: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.sendMessage({
      type: 'robot-state',
      clientId: this.clientId,
      state: {
        pose,
        motorLeft,
        motorRight,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send message via WebSocket
   */
  private sendMessage(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, message not sent:', message);
      return;
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Update peer state
   */
  private updatePeerState(peerId: string, state: any): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.pose = state.pose;
      peer.motorLeft = state.motorLeft;
      peer.motorRight = state.motorRight;
      peer.timestamp = state.timestamp;
    }
  }

  /**
   * Get peer state
   */
  getPeerState(peerId: string): RobotPeerState | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all peers
   */
  getAllPeers(): RobotPeerState[] {
    return Array.from(this.peers.values());
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.joined = false;
    const socket = this.ws;
    this.ws = null;
    socket?.close();
    this.emit('disconnected');
    this.roomId = null;
    this.peers.clear();
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (this.roomId) {
          this.connectWebSocket();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Is connected
   */
  isConnected(): boolean {
    return this.joined && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current room ID
   */
  getRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Get client ID
   */
  getClientId(): string {
    return this.clientId;
  }
}

export const robotNetworkManager = new RobotNetworkManager();
