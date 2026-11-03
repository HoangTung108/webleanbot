/**
 * 2D Robot Physics Simulator Engine
 * Simulates Leanbot robot movement and sensor interactions
 */

import {
  Vector2D,
  Pose,
  RobotConfig,
  RobotState2D,
  BoardConfig,
  SensorReading,
  SimulationState,
  SimulationStep,
  Obstacle,
  Wall,
} from './types';

const DEFAULT_ROBOT_CONFIG: RobotConfig = {
  wheelRadius: 16.25, // mm
  wheelBase: 75, // mm - distance between wheels
  maxSpeed: 500, // mm/s
  maxAcceleration: 2000, // mm/s²
  sensorOffsets: {
    irLineLeft: { x: 37.5, y: -20 },
    irLineCenter: { x: 37.5, y: 0 },
    irLineRight: { x: 37.5, y: 20 },
    irFront: { x: 40, y: 0 },
  },
};

const MM_TO_PIXELS = 0.5; // conversion for rendering

export class RobotSimulator {
  private gripper = { left: 0, right: 0 };
  private state: SimulationState;
  private robotConfig: RobotConfig;
  private board: BoardConfig;
  private timestep: number = 10; // ms
  private simulationTime: number = 0;
  private lastUpdateTime: number = 0;

  constructor(robotConfig?: RobotConfig) {
    this.robotConfig = robotConfig || DEFAULT_ROBOT_CONFIG;
    this.board = this.getDefaultBoard();

    this.state = {
      isRunning: false,
      isPaused: false,
      robotState: {
        pose: { x: 100, y: 100, heading: 0 },
        velocityLeft: 0,
        velocityRight: 0,
        accelerationLeft: 0,
        accelerationRight: 0,
      },
      sensorReadings: this.readSensors(),
      history: [],
      currentTime: 0,
    };

    this.lastUpdateTime = Date.now();
  }

  /**
   * Get default board configuration (AIROC 2026 style)
   */
  private getDefaultBoard(): BoardConfig {
    return {
      name: 'Default Arena',
      width: 2000, // mm
      height: 2000, // mm
      obstacles: [],
      walls: [
        // Border walls
        { id: 'wall-north', x1: 0, y1: 0, x2: 2000, y2: 0 },
        { id: 'wall-south', x1: 0, y1: 2000, x2: 2000, y2: 2000 },
        { id: 'wall-west', x1: 0, y1: 0, x2: 0, y2: 2000 },
        { id: 'wall-east', x1: 2000, y1: 0, x2: 2000, y2: 2000 },
      ],
      lines: [
        // Black lines for line follower
        {
          id: 'line-1',
          points: [
            { x: 100, y: 100 },
            { x: 900, y: 100 },
            { x: 900, y: 900 },
            { x: 100, y: 900 },
            { x: 100, y: 100 },
          ],
          width: 50,
          color: '#000000',
        },
      ],
      metadata: {
        competition: 'AIROC 2026',
        boardType: 'default_arena',
      },
    };
  }

  /**
   * Set custom board configuration
   */
  setBoard(board: BoardConfig): void {
    this.board = board;
    this.reset();
  }

  /**
   * Start simulation
   */
  start(): void {
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.lastUpdateTime = Date.now();
    this.simulationTime = 0;
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.robotState.velocityLeft = 0;
    this.state.robotState.velocityRight = 0;
  }

  /**
   * Pause simulation
   */
  pause(): void {
    this.state.isPaused = true;
  }

  /**
   * Resume simulation
   */
  resume(): void {
    if (this.state.isRunning) {
      this.state.isPaused = false;
      this.lastUpdateTime = Date.now();
    }
  }

  /**
   * Reset simulation to initial state
   */
  reset(initialPose?: Pose): void {
    this.stop();
    this.state.robotState.pose = initialPose || this.board.initialPose || {
      x: 100,
      y: 100,
      heading: 0,
    };
    this.state.robotState.velocityLeft = 0;
    this.state.robotState.velocityRight = 0;
    this.state.robotState.accelerationLeft = 0;
    this.state.robotState.accelerationRight = 0;
    this.state.history = [];
    this.state.currentTime = 0;
    this.setGripper(0, 0);
    this.simulationTime = 0;
  }

  /**
   * Set motor speeds (mm/s or in terms of steps per second)
   */
  setMotorSpeeds(leftSpeed: number, rightSpeed: number): void {
    // Clamp speeds to max
    const maxSpeed = this.robotConfig.maxSpeed;
    this.state.robotState.velocityLeft = Math.max(
      -maxSpeed,
      Math.min(maxSpeed, leftSpeed)
    );
    this.state.robotState.velocityRight = Math.max(
      -maxSpeed,
      Math.min(maxSpeed, rightSpeed)
    );
  }

  /**
   * Get current robot pose
   */
  /** Set the starting direction while stopped; preserve position and history. */
  setPose(pose: Pose): void {
    if (this.state.isRunning || ![pose.x, pose.y, pose.heading].every(Number.isFinite)) return;
    this.state.robotState.pose = {
      x: Math.max(60, Math.min(this.board.width - 60, pose.x)),
      y: Math.max(60, Math.min(this.board.height - 60, pose.y)),
      heading: ((pose.heading % 360) + 360) % 360,
    };
    this.state.history = [];
    this.state.sensorReadings = this.readSensors();
  }

  setHeading(heading: number): void {
    if (this.state.isRunning || !Number.isFinite(heading)) return;
    this.state.robotState.pose.heading = ((heading % 360) + 360) % 360;
    this.state.sensorReadings = this.readSensors();
  }

  setGripper(left: number, right: number): void {
    this.gripper = { left: Math.max(0, Math.min(90, left)), right: Math.max(0, Math.min(90, right)) };
  }

  getGripper(): { left: number; right: number } { return { ...this.gripper }; }

  getRobotPose(): Pose {
    return { ...this.state.robotState.pose };
  }

  /**
   * Get current sensor readings
   */
  getSensorReadings(): SensorReading {
    return { ...this.state.sensorReadings };
  }

  /**
   * Get simulation state
   */
  getSimulationState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Update simulation step
   */
  update(deltaMilliseconds?: number): void {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }

    const now = Date.now();
    const deltaTime = deltaMilliseconds === undefined ? (now - this.lastUpdateTime) / 1000 : deltaMilliseconds / 1000; // convert to seconds
    this.lastUpdateTime = now;
    this.simulationTime += deltaTime * 1000; // convert back to ms for tracking

    // Update robot kinematics
    this.updateRobotKinematics(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Read sensors
    this.state.sensorReadings = this.readSensors();

    // Store history
    this.state.history.push({
      timestamp: this.simulationTime,
      robotPose: { ...this.state.robotState.pose },
      sensorReadings: { ...this.state.sensorReadings },
      motorSpeeds: {
        left: this.state.robotState.velocityLeft,
        right: this.state.robotState.velocityRight,
      },
    });

    this.state.currentTime = this.simulationTime;
  }

  /**
   * Update robot position based on differential drive kinematics
   */
  private updateRobotKinematics(deltaTime: number): void {
    const pose = this.state.robotState.pose;
    const vL = this.state.robotState.velocityLeft;
    const vR = this.state.robotState.velocityRight;
    const wheelBase = this.robotConfig.wheelBase;

    // Differential drive kinematics
    const v = (vL + vR) / 2; // linear velocity
    const w = (vR - vL) / wheelBase; // angular velocity (rad/s)

    // Update heading
    const headingRad = (pose.heading * Math.PI) / 180;
    pose.heading += (w * deltaTime * 180) / Math.PI;
    pose.heading = pose.heading % 360;

    // Update position
    const headingRadUpdated = (pose.heading * Math.PI) / 180;
    pose.x += v * Math.cos(headingRadUpdated) * deltaTime;
    pose.y += v * Math.sin(headingRadUpdated) * deltaTime;
  }

  /**
   * Check for collisions with obstacles and walls
   */
  private checkCollisions(): void {
    const pose = this.state.robotState.pose;
    const robotRadius = 60; // mm - approximate robot size

    // Check wall collisions
    for (const wall of this.board.walls) {
      if (this.isPointNearLine(pose.x, pose.y, wall.x1, wall.y1, wall.x2, wall.y2, robotRadius)) {
        // Push robot away from wall
        this.resolveWallCollision(pose, wall);
      }
    }

    // Check obstacle collisions
    for (const obstacle of this.board.obstacles) {
      if (this.isPointInObstacle(pose.x, pose.y, obstacle, robotRadius)) {
        this.resolveObstacleCollision(pose, obstacle);
      }
    }

    // Keep robot within bounds
    pose.x = Math.max(robotRadius, Math.min(this.board.width - robotRadius, pose.x));
    pose.y = Math.max(robotRadius, Math.min(this.board.height - robotRadius, pose.y));
  }

  /**
   * Check if point is near a line segment
   */
  private isPointNearLine(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    distance: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return false;

    let t = ((px - x1) * dx + (py - y1) * dy) / (len * len);
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    return dist < distance;
  }

  /**
   * Check if point is in obstacle
   */
  private isPointInObstacle(px: number, py: number, obstacle: Obstacle, margin: number): boolean {
    const dx = px - obstacle.x;
    const dy = py - obstacle.y;
    return dx * dx + dy * dy < (obstacle.width / 2 + margin) ** 2;
  }

  /**
   * Resolve wall collision by stopping robot
   */
  private resolveWallCollision(pose: Pose, wall: Wall): void {
    this.state.robotState.velocityLeft *= -0.5;
    this.state.robotState.velocityRight *= -0.5;
  }

  /**
   * Resolve obstacle collision
   */
  private resolveObstacleCollision(pose: Pose, obstacle: Obstacle): void {
    this.state.robotState.velocityLeft = 0;
    this.state.robotState.velocityRight = 0;
  }

  /**
   * Read sensors based on robot position and board state
   */
  private readSensors(): SensorReading {
    // Safety check for initialization
    if (!this.state || !this.state.robotState) {
      return {
        irLine: { left: 0, center: 0, right: 0 },
        distance: 0,
        touch: [false, false, false, false],
        battery: 12.0,
      };
    }

    const pose = this.state.robotState.pose;
    const headingRad = (pose.heading * Math.PI) / 180;

    // IR line sensor reading
    const irLineLeft = this.readIRSensor(
      pose,
      headingRad,
      this.robotConfig.sensorOffsets.irLineLeft
    );
    const irLineCenter = this.readIRSensor(
      pose,
      headingRad,
      this.robotConfig.sensorOffsets.irLineCenter
    );
    const irLineRight = this.readIRSensor(
      pose,
      headingRad,
      this.robotConfig.sensorOffsets.irLineRight
    );

    // Distance sensor (simple raycast)
    const distance = this.readDistanceSensor(pose, headingRad);

    return {
      irLine: {
        left: irLineLeft,
        center: irLineCenter,
        right: irLineRight,
      },
      distance: distance,
      touch: [false, false, false, false], // touch sensors not triggered
      battery: 12.0,
    };
  }

  /**
   * Simulate IR line sensor reading
   */
  private readIRSensor(pose: Pose, headingRad: number, offset: Vector2D): number {
    // Rotate offset by robot heading
    const rotatedX =
      offset.x * Math.cos(headingRad) - offset.y * Math.sin(headingRad);
    const rotatedY =
      offset.x * Math.sin(headingRad) + offset.y * Math.cos(headingRad);

    const sensorX = pose.x + rotatedX;
    const sensorY = pose.y + rotatedY;

    // Check if sensor is over a black line
    for (const line of this.board.lines) {
      if (this.isPointOnLine(sensorX, sensorY, line.points, line.width)) {
        return 4095; // Maximum reading (over black line)
      }
    }

    return 0; // No line detected
  }

  /**
   * Check if point is on a line
   */
  private isPointOnLine(
    px: number,
    py: number,
    points: Array<{ x: number; y: number }>,
    width: number
  ): boolean {
    for (let i = 0; i < points.length - 1; i++) {
      if (
        this.isPointNearLine(
          px,
          py,
          points[i].x,
          points[i].y,
          points[i + 1].x,
          points[i + 1].y,
          width / 2
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Simulate ultrasonic distance sensor
   */
  private readDistanceSensor(pose: Pose, headingRad: number): number {
    const rayLength = 300; // mm
    const rayEndX = pose.x + rayLength * Math.cos(headingRad);
    const rayEndY = pose.y + rayLength * Math.sin(headingRad);

    let minDistance = rayLength;

    // Check distance to walls
    for (const wall of this.board.walls) {
      const distance = this.raycastToLine(
        pose.x,
        pose.y,
        rayEndX,
        rayEndY,
        wall.x1,
        wall.y1,
        wall.x2,
        wall.y2
      );
      if (distance > 0 && distance < minDistance) {
        minDistance = distance;
      }
    }

    // Check distance to obstacles
    for (const obstacle of this.board.obstacles) {
      const distance = this.raycastToObstacle(
        pose.x,
        pose.y,
        rayEndX,
        rayEndY,
        obstacle
      );
      if (distance > 0 && distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Raycast from start to end, check intersection with line
   */
  private raycastToLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lx1: number,
    ly1: number,
    lx2: number,
    ly2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const ldx = lx2 - lx1;
    const ldy = ly2 - ly1;

    const det = dx * ldy - dy * ldx;
    if (Math.abs(det) < 1e-6) return -1; // parallel

    const t = ((lx1 - x1) * ldy - (ly1 - y1) * ldx) / det;
    const s = ((lx1 - x1) * dy - (ly1 - y1) * dx) / det;

    if (t > 0 && t < 1 && s > 0 && s < 1) {
      return Math.sqrt(dx * dx + dy * dy) * t;
    }

    return -1;
  }

  /**
   * Raycast to obstacle (circle approximation)
   */
  private raycastToObstacle(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    obstacle: Obstacle
  ): number {
    // Simple raycast to circle (obstacle approximated as circle)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    const dirX = dx / len;
    const dirY = dy / len;

    const toObjX = obstacle.x - x1;
    const toObjY = obstacle.y - y1;

    const t = toObjX * dirX + toObjY * dirY;

    if (t < 0) return -1;

    const closestX = x1 + t * dirX;
    const closestY = y1 + t * dirY;

    const dist =
      Math.sqrt(
        (obstacle.x - closestX) ** 2 + (obstacle.y - closestY) ** 2
      ) - obstacle.width / 2;

    return dist > 0 && t < len ? t : -1;
  }
}
