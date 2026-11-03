/**
 * C++ to Simulator Command Transpiler
 * Converts Leanbot C++ code to simulator API calls
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
  private executionTime: number = 0;
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
   * Parse simplified C++ code and generate simulator commands
   * This is a basic parser for common Leanbot API calls
   */
  parseCode(code: string): SimulatorCommand[] {
    const commands: SimulatorCommand[] = [];
    const lines = code.split('\n');
    let timestamp = 0;

    // Regex patterns for common Leanbot API calls
    const motorPattern = /LbMotion\.runLR\s*\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)/g;
    const delayPattern = /LbDelay\s*\(\s*(\d+\.?\d*)\s*\)/g;
    const distancePattern = /LbMotion\.waitDistanceMm\s*\(\s*(\d+\.?\d*)\s*\)/g;
    const rotationPattern = /LbMotion\.waitRotationDeg\s*\(\s*(-?\d+\.?\d*)\s*\)/g;
    const stopPattern = /LbMotion\.stopAndWait\s*\(\s*\)/g;
    const logPattern = /Serial\.println\s*\(\s*"([^"]*)"\s*\)/g;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('//')) {
        continue;
      }

      // Motor commands
      let match;
      while ((match = motorPattern.exec(trimmedLine))) {
        const leftSpeed = parseFloat(match[1]);
        const rightSpeed = parseFloat(match[2]);
        commands.push({
          type: 'motor',
          timestamp,
          data: { left: leftSpeed, right: rightSpeed },
        });
      }

      // Delay commands
      motorPattern.lastIndex = 0;
      while ((match = delayPattern.exec(trimmedLine))) {
        const delayMs = parseFloat(match[1]);
        timestamp += delayMs;
        commands.push({
          type: 'delay',
          timestamp,
          data: { ms: delayMs },
        });
      }

      // Distance wait commands
      delayPattern.lastIndex = 0;
      while ((match = distancePattern.exec(trimmedLine))) {
        const distance = parseFloat(match[1]);
        commands.push({
          type: 'motor',
          timestamp,
          data: { distance, duration: distance / 100 }, // estimated duration
        });
      }

      // Rotation wait commands
      distancePattern.lastIndex = 0;
      while ((match = rotationPattern.exec(trimmedLine))) {
        const rotation = parseFloat(match[1]);
        commands.push({
          type: 'motor',
          timestamp,
          data: { rotation, duration: Math.abs(rotation) / 90 * 1000 },
        });
      }

      // Stop commands
      rotationPattern.lastIndex = 0;
      if (stopPattern.test(trimmedLine)) {
        commands.push({
          type: 'motor',
          timestamp,
          data: { left: 0, right: 0 },
        });
      }

      // Log commands
      stopPattern.lastIndex = 0;
      while ((match = logPattern.exec(trimmedLine))) {
        const message = match[1];
        commands.push({
          type: 'log',
          timestamp,
          data: { message },
        });
        this.logs.push(`[${timestamp}ms] ${message}`);
      }

      logPattern.lastIndex = 0;
    }

    return commands;
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
   * Execute a single command
   */
  private executeCommand(command: SimulatorCommand): void {
    switch (command.type) {
      case 'motor':
        if (command.data?.left !== undefined && command.data?.right !== undefined) {
          this.simulator.setMotorSpeeds(
            command.data.left,
            command.data.right
          );
        }
        break;

      case 'delay':
        // Delay is handled by timestamp
        break;

      case 'sensor':
        // Could trigger sensor-based actions
        break;

      case 'gripper':
        // Gripper actions (not implemented in basic simulator yet)
        break;

      case 'log':
        console.log(`[Simulation] ${command.data?.message || ''}`);
        break;
    }
  }

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
    this.executionTime = 0;
    this.logs = [];
  }
}
