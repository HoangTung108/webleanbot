/**
 * Connect the cooperative C++ interpreter to the robot physics engine
 */

import { CppRuntime } from './cppRuntime';
import { RobotSimulator } from './robotSimulator';

export interface SimulatorCommand {
  type: 'motor' | 'delay' | 'sensor' | 'gripper' | 'log';
  timestamp: number;
  data?: any;
}

export interface CommandQueue {
  commands: SimulatorCommand[];
  currentIndex: number;
  isExecuting: boolean;
}

/**
 * Parse and execute Leanbot C++ code in the simulator
 */
export class CppSimulatorBridge {
  private simulator: RobotSimulator;
  private commandQueue: CommandQueue;
  private runtime?: CppRuntime;
  private lastTick?: number;
  private logs: string[] = [];

  constructor(simulator: RobotSimulator) {
    this.simulator = simulator;
    this.commandQueue = {
      commands: [],
      currentIndex: 0,
      isExecuting: false,
    };
  }

  /**
   * Load and compile C++ code for simulation
   */
  loadCode(code: string): { success: boolean; error?: string } {
    try {
      this.runtime = new CppRuntime(code, {
        motors: (left, right) => this.simulator.setMotorSpeeds(left, right),
        advance: seconds => this.simulator.update(seconds * 1000),
        gripper: (left, right) => this.simulator.setGripper(left, right),
        sensors: () => this.simulator.getSensorReadings(),
        log: message => this.logs.push(message),
      });
      this.commandQueue = { commands: [], currentIndex: 0, isExecuting: false };
      this.logs = [];
      return { success: true };
    } catch (error) {
      this.runtime = undefined;
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  executeStep(currentTime: number): void {
    if (!this.runtime?.running) return;
    if (this.simulator.getSimulationState().isPaused) { this.lastTick = currentTime; return; }
    const delta = this.lastTick === undefined ? 0 : currentTime - this.lastTick;
    this.lastTick = currentTime;
    this.runtime.tick(delta);
    this.commandQueue.isExecuting = this.runtime.running;
  }

  isExecuting(): boolean { return this.runtime?.running ?? false; }

  /**
   * Start executing command queue
   */
  startExecution(): void {
    this.runtime?.start();
    this.lastTick = undefined;
    this.commandQueue.isExecuting = true;
    this.commandQueue.currentIndex = 0;
  }

  /**
   * Stop execution
   */
  stopExecution(): void {
    this.runtime?.stop();
    this.commandQueue.isExecuting = false;
    this.simulator.setMotorSpeeds(0, 0);
  }

  /**
   * Get execution logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Get command queue
   */
  getCommandQueue(): CommandQueue {
    return { ...this.commandQueue };
  }

  /**
   * Reset execution
   */
  reset(): void {
    this.runtime?.stop();
    this.lastTick = undefined;
    this.commandQueue.currentIndex = 0;
    this.commandQueue.isExecuting = false;
    this.logs = [];
  }
}
