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
    if (!code.trim()) return { success: false, error: 'Chưa có code C++. Hãy mở hoặc viết code trong IDE.' };
    try {
      this.runtime = new CppRuntime(code, {
        motors: (left, right) => this.simulator.setMotorSpeeds(left, right),
        advance: seconds => {
          this.simulator.advanceSimulatedTime(seconds * 1000);
          if (this.simulator.getFallState().status !== 'supported') this.runtime?.stop();
        },
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
    if (!this.isExecuting()) return;
    if (this.simulator.getSimulationState().isPaused) { this.lastTick = currentTime; return; }
    const delta = this.lastTick === undefined ? 0 : currentTime - this.lastTick;
    this.lastTick = currentTime;
    if (this.simulator.getFallState().status === 'falling') this.simulator.advanceSimulatedTime(delta * this.simulator.getSpeedMultiplier());
    else this.runtime?.tick(delta * this.simulator.getSpeedMultiplier());
    if (this.simulator.getFallState().status === 'fallen') {
      this.stopExecution();
      throw new Error('Robot đã rơi khỏi sa bàn. Đặt lại mô phỏng hoặc kéo robot trở lại trước khi chạy.');
    }
    this.commandQueue.isExecuting = this.isExecuting();
  }

  resetClock(): void { this.lastTick = undefined; }

  isExecuting(): boolean { return (this.runtime?.running ?? false) || (this.simulator.getFallState().status === 'falling' && this.simulator.getSimulationState().isRunning); }

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
