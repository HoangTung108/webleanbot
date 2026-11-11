/**
 * Real Robot Color Bridge
 * Bridges physical Leanbot (via Web Serial / USB) with WebSocket Multi-Robot Network.
 * Enables two real robots to exchange color signals in real time.
 */

import { LeanbotSerialClient } from './serial';
import { RobotNetworkManager, robotNetworkManager, type NetworkEvent } from './robotNetworkManager';
import {
  type RobotColor,
  type ColorSignalMessage,
  type ColorExchangeEntry,
  parseSerialColorSignal,
  formatSerialColorCommand,
  normalizeRobotColor,
} from './robotColorSignal';

export class RealRobotColorBridge {
  private active = false;
  private serialClient: LeanbotSerialClient | null = null;
  private networkManager: RobotNetworkManager;
  private unsubscribeSerial: (() => void) | null = null;
  private serialBuffer = '';
  private history: ColorExchangeEntry[] = [];
  private maxHistory = 100;
  private listeners = new Set<(entry: ColorExchangeEntry) => void>();
  private statusListeners = new Set<(active: boolean) => void>();
  private boundNetworkListener: ((event: NetworkEvent) => void) | null = null;

  constructor(serialClient?: LeanbotSerialClient | null, networkManager: RobotNetworkManager = robotNetworkManager) {
    this.serialClient = serialClient ?? null;
    this.networkManager = networkManager;
    this.setupNetworkListener();
    if (this.serialClient) {
      this.attachSerialClient(this.serialClient);
    }
  }

  /**
   * Set or change the serial client instance (e.g. when connecting/disconnecting USB)
   */
  setSerialClient(client: LeanbotSerialClient | null) {
    if (this.serialClient === client) return;
    this.detachSerialClient();
    this.serialClient = client;
    if (this.serialClient && this.active) {
      this.attachSerialClient(this.serialClient);
    }
  }

  getSerialClient(): LeanbotSerialClient | null {
    return this.serialClient;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Start automatic bidirectional bridging between Serial and WebSocket
   */
  start(): boolean {
    if (this.active) return true;
    this.active = true;
    if (this.serialClient) {
      this.attachSerialClient(this.serialClient);
    }
    this.notifyStatus(true);
    return true;
  }

  /**
   * Stop bridging
   */
  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.detachSerialClient();
    this.notifyStatus(false);
  }

  /**
   * Send a color signal manually (from UI or script) through WebSocket and optionally to local robot
   */
  async sendColor(colorInput: RobotColor | string, echoToLocalSerial = false): Promise<boolean> {
    const color = normalizeRobotColor(colorInput);
    if (!color) return false;

    const sent = this.networkManager.sendColorSignal(color);
    if (sent) {
      this.recordEntry({
        id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        direction: 'out',
        source: 'manual',
        color,
        timestamp: Date.now(),
        senderRobotId: this.networkManager.getRobotId() || this.networkManager.getClientId(),
      });
    }

    if (echoToLocalSerial && this.serialClient?.connected) {
      try {
        await this.serialClient.send(formatSerialColorCommand(color));
      } catch (err) {
        console.warn('Failed to echo color to local serial:', err);
      }
    }

    return sent;
  }

  /**
   * Subscribe to color exchange events
   */
  onColorExchange(callback: (entry: ColorExchangeEntry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Subscribe to bridge active/inactive changes
   */
  onStatusChange(callback: (active: boolean) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  getHistory(): readonly ColorExchangeEntry[] {
    return this.history;
  }

  clearHistory(): void {
    this.history = [];
  }

  private setupNetworkListener() {
    this.boundNetworkListener = (event: NetworkEvent) => {
      const data = event.data as ColorSignalMessage | undefined;
      if (!data || !data.color) return;

      const entry: ColorExchangeEntry = {
        id: `in-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        direction: 'in',
        source: 'websocket',
        color: data.color,
        timestamp: data.timestamp || Date.now(),
        peerId: data.peerId,
        senderRobotId: data.senderRobotId,
      };
      this.recordEntry(entry);

      // Forward down to physical robot via Serial
      if (this.active && this.serialClient?.connected) {
        const cmd = formatSerialColorCommand(data.color);
        this.serialClient.send(cmd).catch(err => {
          console.warn('RealRobotColorBridge: Failed to forward color to Serial:', err);
        });
      }
    };

    this.networkManager.on('color-signal', this.boundNetworkListener);
  }

  private attachSerialClient(client: LeanbotSerialClient) {
    this.detachSerialClient();
    this.unsubscribeSerial = client.addTextListener((chunk: string) => {
      this.handleSerialChunk(chunk);
    });
  }

  private detachSerialClient() {
    if (this.unsubscribeSerial) {
      this.unsubscribeSerial();
      this.unsubscribeSerial = null;
    }
    this.serialBuffer = '';
  }

  private handleSerialChunk(chunk: string) {
    if (!this.active) return;
    this.serialBuffer += chunk;
    if (this.serialBuffer.length > 8192) {
      this.serialBuffer = this.serialBuffer.slice(-2048);
    }

    const lines = this.serialBuffer.split(/[\r\n]+/);
    this.serialBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const color = parseSerialColorSignal(trimmed);
      if (color) {
        const sent = this.networkManager.sendColorSignal(color);
        this.recordEntry({
          id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          direction: 'out',
          source: 'serial',
          color,
          timestamp: Date.now(),
          senderRobotId: this.networkManager.getRobotId() || this.networkManager.getClientId(),
        });
      }
    }
  }

  private recordEntry(entry: ColorExchangeEntry) {
    this.history = [entry, ...this.history.slice(0, this.maxHistory - 1)];
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('RealRobotColorBridge listener error:', err);
      }
    }
  }

  private notifyStatus(active: boolean) {
    for (const listener of this.statusListeners) {
      try {
        listener(active);
      } catch (err) {
        console.error('RealRobotColorBridge status listener error:', err);
      }
    }
  }

  dispose() {
    this.stop();
    if (this.boundNetworkListener) {
      this.networkManager.off('color-signal', this.boundNetworkListener);
      this.boundNetworkListener = null;
    }
    this.listeners.clear();
    this.statusListeners.clear();
  }
}

export const realRobotColorBridge = new RealRobotColorBridge();

