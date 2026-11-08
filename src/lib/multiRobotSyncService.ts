/**
 * Multi-Robot Synchronization Service
 * Integrates robot simulator with network manager for state sync
 */

import { RobotSimulator } from '../simulator/robotSimulator';
import { robotNetworkManager, type RobotPeerState, type NetworkEventType, type NetworkEvent } from './robotNetworkManager';

export class MultiRobotSyncService {
  private localRobot: RobotSimulator;
  private remoteRobots: Map<string, RobotSimulator> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private syncRate = 50; // ms (20 FPS)
  private enabled = false;
  private unsubscribers:(()=>void)[]=[];

  constructor(localRobot: RobotSimulator) {
    this.localRobot = localRobot;
    this.setupNetworkListeners();
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners() {
    const listen=(type:NetworkEventType,callback:(event:NetworkEvent)=>void)=>{
      robotNetworkManager.on(type,callback);this.unsubscribers.push(()=>robotNetworkManager.off(type,callback));
    };
    listen('pose-correction',event=>{
      for(const peer of robotNetworkManager.getAllPeers())this.updateRemoteRobotState(peer.id,peer);
      this.localRobot.setRemoteRobots(robotNetworkManager.getAllPeers());this.localRobot.applyNetworkPose(event.data?.pose);
    });
    listen('disconnected',()=>{this.remoteRobots.clear();this.localRobot.setRemoteRobots([]);});
    listen('peer-joined', (event) => {
      console.log('Peer joined:', event.data.peerId);
      const remoteRobot = new RobotSimulator();
      this.remoteRobots.set(event.data.peerId, remoteRobot);
    });

    listen('peer-left', (event) => {
      console.log('Peer left:', event.data.peerId);
      this.remoteRobots.delete(event.data.peerId);
      this.localRobot.setRemoteRobots(robotNetworkManager.getAllPeers());
    });

    listen('state-sync', (event) => {
      const { peerId, state } = event.data;
      this.updateRemoteRobotState(peerId, state);
      this.localRobot.setRemoteRobots(robotNetworkManager.getAllPeers());
    });
  }

  /**
   * Start synchronization
   */
  start() {
    if (this.enabled) return;
    if(!this.unsubscribers.length)this.setupNetworkListeners();
    this.enabled = true;

    this.syncInterval = setInterval(() => {
      if (robotNetworkManager.isConnected()) {
        const pose = this.localRobot.getRobotPose();
        const state = this.localRobot.getSimulationState();
        robotNetworkManager.sendRobotState(
          pose,
          state.robotState.velocityLeft,
          state.robotState.velocityRight,
          {gripper:this.localRobot.getGripper(),supported:this.localRobot.getFallState().status==='supported'}
        );
      }
    }, this.syncRate);
  }

  /**
   * Stop synchronization
   */
  stop() {
    this.enabled = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Update remote robot state
   */
  private updateRemoteRobotState(peerId: string, state: any) {
    const remoteRobot = this.remoteRobots.get(peerId);
    if (!remoteRobot || !state.pose) return;

    remoteRobot.setPose(state.pose);
    remoteRobot.setMotorSpeeds(state.motorLeft || 0, state.motorRight || 0);
    if(state.gripper&&[state.gripper.left,state.gripper.right].every(Number.isFinite))remoteRobot.setGripper(state.gripper.left,state.gripper.right);
  }

  /**
   * Get remote robot by peer ID
   */
  getRemoteRobot(peerId: string): RobotSimulator | undefined {
    return this.remoteRobots.get(peerId);
  }

  /**
   * Get all remote robots
   */
  getAllRemoteRobots(): RobotSimulator[] {
    return Array.from(this.remoteRobots.values());
  }

  /**
   * Get all remote robot states
   */
  getRemoteRobotStates(): Map<string, any> {
    const states = new Map();
    for (const [peerId, robot] of this.remoteRobots) {
      states.set(peerId, {
        pose: robot.getRobotPose(),
        sensors: robot.getSensorReadings(),
      });
    }
    return states;
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.stop();
    robotNetworkManager.disconnect();
    this.remoteRobots.clear();this.localRobot.setRemoteRobots([]);
    this.unsubscribers.splice(0).forEach(dispose=>dispose());
  }

  /**
   * Is synchronized
   */
  isSynchronized(): boolean {
    return this.enabled && robotNetworkManager.isConnected();
  }
}

export let multiRobotSync: MultiRobotSyncService | null = null;

/**
 * Initialize multi-robot sync service
 */
export function initializeMultiRobotSync(localRobot: RobotSimulator): MultiRobotSyncService {
  multiRobotSync = new MultiRobotSyncService(localRobot);
  return multiRobotSync;
}

/**
 * Get multi-robot sync service
 */
export function getMultiRobotSync(): MultiRobotSyncService | null {
  return multiRobotSync;
}
