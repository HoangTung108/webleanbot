/**
 * Connect the cooperative C++ interpreter to the robot physics engine
 */

import { ROUND_LIMIT_MS } from './scoring';
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
  private pendingTime = 0;
  private roundClockActive=false;
  private executionLimitMs=Infinity;
  private logs: string[] = [];
  private elapsed = 0;
  private completionReason: 'program' | 'time-limit' | undefined;
  getCompletionReason() { return this.completionReason; }

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
        gripper: (left, right, duration) => this.simulator.setGripper(left, right, duration),
        sensors: () => this.simulator.getSensorReadings(),
        lineMask: () => this.simulator.getLineMask(),
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

  executeStep(currentTime: number, maxWorkMs = Infinity): void {
    if (!Number.isFinite(currentTime) || !this.isExecuting()) return;
    if (this.simulator.getSimulationState().isPaused) { this.lastTick = currentTime; return; }
    if(this.lastTick!==undefined&&currentTime<this.lastTick)return;
    const delta = this.lastTick === undefined ? 0 : currentTime-this.lastTick;
    this.lastTick = currentTime;
    this.pendingTime=Math.min(this.pendingTime+delta*this.simulator.getSpeedMultiplier(),Math.max(0,this.executionLimitMs-this.elapsed));
    const deadline=Number.isFinite(maxWorkMs)?performance.now()+Math.max(0,maxWorkMs):Infinity;
    // Prime commands without advancing time, including zero-duration programs.
    if(this.runtime?.running)this.runtime.tick(0);
    while(this.isExecuting()) {
      const slice=Math.min(5,Math.max(0,this.executionLimitMs-this.elapsed));
      if(slice<=1e-8) {this.runtime?.stop();this.simulator.stop();this.completionReason='time-limit';this.roundClockActive=false;break;}
      if(this.pendingTime+1e-8<slice||performance.now()>=deadline)break;
      const before=this.simulator.getSimulationState().currentTime;
      if(this.simulator.getFallState().status==='falling'||!this.runtime?.running)this.simulator.advanceSimulatedTime(slice);
      else this.runtime?.tick(slice);
      this.pendingTime=Math.max(0,this.pendingTime-slice);
      this.elapsed+=this.simulator.getSimulationState().currentTime-before;
      if(this.elapsed>=this.executionLimitMs-1e-6) {this.runtime?.stop();this.simulator.stop();this.completionReason='time-limit';this.roundClockActive=false;break;}
    }
    if (!this.runtime?.running && !this.isExecuting() && !this.completionReason) this.completionReason='program';
    if (this.simulator.getFallState().status === 'fallen') {
      this.stopExecution();
      throw new Error('Robot đã rơi khỏi sa bàn. Đặt lại mô phỏng hoặc kéo robot trở lại trước khi chạy.');
    }
    this.commandQueue.isExecuting = this.isExecuting();
  }

  /** Change scheduling rate at a single clock boundary; never restart the
   * interpreter, rescale wheel commands, or reset the turn's encoder origin. */
  setPlaybackSpeed(multiplier:number,currentTime:number,maxWorkMs=8):void {
    if(!Number.isFinite(multiplier)||!Number.isFinite(currentTime))return;
    if(this.isExecuting())this.executeStep(currentTime,maxWorkMs);
    this.simulator.setSpeedMultiplier(multiplier);
  }

  resetClock(currentTime?:number): void { this.lastTick = currentTime; }

  isProgramRunning():boolean {return this.runtime?.running??false;}

  isExecuting(): boolean { return (this.roundClockActive&&this.simulator.getSimulationState().isRunning)||(this.runtime?.running ?? false) || (this.simulator.getFallState().status === 'falling' && this.simulator.getSimulationState().isRunning); }

  /**
   * Start executing command queue
   */
  startExecution(currentTime?:number,options?:{keepRoundClock?:boolean}): void {
    this.roundClockActive=options?.keepRoundClock??false;
    this.executionLimitMs=this.roundClockActive?ROUND_LIMIT_MS:Infinity;
    this.elapsed=0;this.pendingTime=0;this.completionReason=undefined;
    this.runtime?.start();
    this.lastTick = currentTime;
    this.commandQueue.isExecuting = true;
    this.commandQueue.currentIndex = 0;
  }

  /**
   * Stop execution
   */
  stopExecution(): void {
    this.runtime?.stop();
    this.pendingTime=0;this.roundClockActive=false;
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
    this.lastTick = undefined;this.pendingTime=0;this.roundClockActive=false;
    this.commandQueue.currentIndex = 0;
    this.commandQueue.isExecuting = false;
    this.logs = [];
  }
}
