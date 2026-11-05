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
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private clientId: string;
  private peers: Map<string, RobotPeerState> = new Map();
  private listeners: Map<NetworkEventType, Set<(event: NetworkEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private serverUrl: string;

  constructor(serverUrl?: string) {
    // Auto-detect server URL if not provided
    if (!serverUrl) {
      // Get from environment variable or use default
      const envUrl = import.meta.env.VITE_WEBSOCKET_URL;
      if (envUrl) {
        this.serverUrl = envUrl;
      } else {
        // Default: localhost for dev, or detect from current host for production
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          this.serverUrl = 'ws://localhost:8080';
        } else {
          // For production, use environment variable or fallback to /webleanbot-ws/
          this.serverUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8080`;
        }
      }
    } else {
      this.serverUrl = serverUrl;
    }
    
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
      this.roomId = roomId;
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
      this.roomId = this.generateRoomId();
      const connected = await this.connectWebSocket();
      if (connected) {
        this.sendMessage({
          type: 'create-room',
          roomId: this.roomId,
          password,
          maxPeers,
        });
        return this.roomId;
      }
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
      try {
        this.ws = new WebSocket(`${this.serverUrl}?clientId=${this.clientId}&roomId=${this.roomId}`);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.emit('connected', { clientId: this.clientId, roomId: this.roomId });
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', undefined, 'WebSocket connection error');
          resolve(false);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.emit('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.emit('error', undefined, `WebSocket creation error: ${error instanceof Error ? error.message : String(error)}`);
        resolve(false);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
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
      setTimeout(() => {
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
    return this.ws?.readyState === WebSocket.OPEN;
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
