import {readVirtualLine,readVirtualColor} from './virtualSensors';
import {isFinitePose,robotContact,robotRayDistance} from './robotCollision';
import { MissionWorld } from './missionWorld';
import { LEANBOT_APPEARANCE } from './robotAppearance';
/**
 * 2D Robot Physics Simulator Engine
 * Simulates Leanbot robot movement and sensor interactions
 */

import { SYNAPSE_CITY } from './boardConfigs';

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
  wheelBase: LEANBOT_APPEARANCE.wheelBase, // mm, shared with drawing and encoders
  maxSpeed: 65, // mm/s: measured 325 mm / 5 s
  maxAcceleration: 2000, // mm/s²
  sensorOffsets: {
    irLineLeft: { x: 50, y: -30 },    // Updated from 37.5, -20
    irLineCenter: { x: 50, y: 0 },    // Updated from 37.5, 0
    irLineRight: { x: 50, y: 30 },    // Updated from 37.5, 20
    irFront: { x: 55, y: 0 },         // Updated from 40, 0
  },
};

const MM_TO_PIXELS = 0.5; // conversion for rendering

export class RobotSimulator {
  mission: MissionWorld;
  missionStepEnabled=true;
  peerCollisionEnabled=true;
  private presentedGripper?:{left:number;right:number};
  private gripper = { left: 0, right: 0 };
  private gripperMotion?: {from:{left:number;right:number};to:{left:number;right:number};duration:number;elapsed:number};
  private state: SimulationState;
  private robotConfig: RobotConfig;
  private board: BoardConfig;
  private timestep: number = 10; // ms
  private simulationTime: number = 0;
  private lastUpdateTime: number = 0;
  private remotePoses:Pose[]=[];
  private fall = { status: 'supported' as 'supported' | 'falling' | 'fallen', drop: 0, velocityZ: 0, vx: 0, vy: 0 };
  getFallState() { return { ...this.fall }; }

  private speedMultiplier: number = 1; // 1x, 2x, 5x, 10x

  constructor(robotConfig?: RobotConfig) {
    this.robotConfig = robotConfig || DEFAULT_ROBOT_CONFIG;
    this.board = SYNAPSE_CITY;
    this.mission = new MissionWorld(this.board);

    this.state = {
      isRunning: false,
      isPaused: false,
      robotState: {
        pose: { ...SYNAPSE_CITY.initialPose! },
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
   * Set custom board configuration
   */
  setBoard(board: BoardConfig): void {
    this.board = board;
    this.mission = new MissionWorld(board);
    this.reset();
  }

  /**
   * Start simulation
   */
  start(): void {
    if (this.fall.status !== 'supported') return;
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.lastUpdateTime = Date.now();
    this.simulationTime = 0;
    this.state.currentTime = 0;
    this.state.history = [];
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.gripperMotion=undefined;
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
    this.rgb=[0,0,0];
    this.fall = {status:'supported',drop:0,velocityZ:0,vx:0,vy:0};
    this.state.robotState.pose = {...(initialPose || this.board.initialPose || {
      x: 100,
      y: 100,
      heading: 0,
    })};
    this.state.robotState.velocityLeft = 0;
    this.state.robotState.velocityRight = 0;
    this.state.robotState.accelerationLeft = 0;
    this.state.robotState.accelerationRight = 0;
    this.state.history = [];
    this.state.currentTime = 0;
    this.gripper = { left: 0, right: 0 };
    this.mission.reset();
    this.simulationTime = 0;
  }

  /**
   * Set motor speeds (mm/s or in terms of steps per second)
   */
  setMotorSpeeds(leftSpeed: number, rightSpeed: number): void {
    if (this.fall.status !== 'supported') { this.state.robotState.velocityLeft = this.state.robotState.velocityRight = 0; return; }
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
    this.fall = {status:'supported',drop:0,velocityZ:0,vx:0,vy:0};
    this.state.robotState.pose = {
      x: pose.x,
      y: pose.y,
      heading: ((pose.heading % 360) + 360) % 360,
    };
    this.state.history = [];
    this.mission.syncPose(this.getRobotPose());
    this.state.sensorReadings = this.readSensors();
  }

  presentOnline(state:{rgb?:readonly number[];pose:Pose;gripper:{left:number;right:number};motorLeft:number;motorRight:number;fall:ReturnType<RobotSimulator['getFallState']>},timeMs:number):void {
    if(!isFinitePose(state.pose))return;
    this.rgb=[...(state.rgb??[0,0,0])];this.peerCollisionEnabled=false;this.presentedGripper={...state.gripper};
    this.state.robotState.pose={...state.pose};this.state.robotState.velocityLeft=state.motorLeft;this.state.robotState.velocityRight=state.motorRight;
    this.state.currentTime=timeMs;this.state.isRunning=false;this.state.isPaused=false;this.fall={...state.fall};
    this.state.sensorReadings=this.readSensors();
  }
  releaseOnlinePresentation():void {this.presentedGripper=undefined;this.peerCollisionEnabled=true;this.stop();}

  getBoard():BoardConfig {return this.board;}

  setRemoteRobots(robots:{pose:Pose;supported?:boolean}[]):void {
    this.remotePoses=robots.filter(r=>r.supported!==false&&isFinitePose(r.pose)).map(r=>({...r.pose}));
    if(this.resolveRobotContacts())this.mission.syncPose(this.getRobotPose());
    this.state.sensorReadings=this.readSensors();
  }

  applyNetworkPose(pose:Pose):void {
    if(!isFinitePose(pose)||this.fall.status!=='supported')return;
    this.state.robotState.pose={...pose,heading:((pose.heading%360)+360)%360};
    this.mission.syncPose(this.getRobotPose());this.state.sensorReadings=this.readSensors();
  }

  private resolveRobotContacts():boolean {
    if(this.fall.status!=='supported'||!this.peerCollisionEnabled)return false;
    let collided=false;
    for(let pass=0;pass<4;pass++) {
      let changed=false;
      for(const remote of this.remotePoses){
        const pose=this.state.robotState.pose,hit=robotContact(pose,remote);if(!hit)continue;
        pose.x-=hit.nx*(hit.depth+.01);pose.y-=hit.ny*(hit.depth+.01);changed=collided=true;
      }
      if(!changed)break;
    }
    return collided;
  }

  setHeading(heading: number): void {
    if (this.state.isRunning || !Number.isFinite(heading)) return;
    this.state.robotState.pose.heading = ((heading % 360) + 360) % 360;
    this.mission.syncPose(this.getRobotPose());
    this.state.sensorReadings = this.readSensors();
  }

  setGripper(left: number, right: number, durationMs = 0): void {
    if (![left,right,durationMs].every(Number.isFinite)||durationMs<0) throw new Error('Thông số tay gắp không hợp lệ');
    const to={left:Math.max(0,Math.min(90,left)),right:Math.max(0,Math.min(90,right))};
    if(durationMs>0) { this.gripperMotion={from:this.getGripper(),to,duration:durationMs,elapsed:0}; return; }
    this.gripperMotion=undefined;this.applyGripper(to);
  }

  private applyGripper(value:{left:number;right:number}) {
    this.gripper=value;
    this.mission.setGripper(value.left,value.right,this.getRobotPose(),this.state.robotState.velocityLeft,this.state.robotState.velocityRight);
  }

  private advanceGripper(milliseconds:number) {
    const motion=this.gripperMotion;if(!motion)return;
    motion.elapsed=Math.min(motion.duration,motion.elapsed+milliseconds);
    const t=motion.elapsed/motion.duration;
    const next={left:motion.from.left+(motion.to.left-motion.from.left)*t,right:motion.from.right+(motion.to.right-motion.from.right)*t};
    if(t>=1||Math.abs(next.left-this.gripper.left)>1e-9||Math.abs(next.right-this.gripper.right)>1e-9)this.applyGripper(next);
    if(t>=1)this.gripperMotion=undefined;
  }

  getGripper(): { left: number; right: number } { if(this.presentedGripper)return {...this.presentedGripper};return this.mission.getGripperAngles(this.getRobotPose()); }

  getRobotPose(): Pose {
    return { ...this.state.robotState.pose };
  }

  /**
   * Get current sensor readings
   */
  getSensorReadings(): SensorReading {
    this.state.sensorReadings = this.readSensors();
    return { ...this.state.sensorReadings };
  }

  /**
   * Get simulation state
   */
  getSimulationState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Set speed multiplier for fast-forward (1x, 2x, 5x, 10x)
   */
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier)); // clamp between 0.1x and 10x
  }

  /**
   * Get current speed multiplier
   */
  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  /**
   * Update simulation step
   */
  update(deltaMilliseconds?: number): void {
    if (!this.state.isRunning || this.state.isPaused) return;
    const now = Date.now();
    const elapsed = deltaMilliseconds ?? now - this.lastUpdateTime;
    this.lastUpdateTime = now;
    this.advanceSimulatedTime(elapsed * this.speedMultiplier);
  }

  /** Advance an already-scaled simulation clock (used by the C++ runtime). */
  advanceSimulatedTime(deltaMilliseconds: number): void {
    if (!this.state.isRunning || this.state.isPaused || !Number.isFinite(deltaMilliseconds) || deltaMilliseconds <= 0) return;
    let remaining=deltaMilliseconds;
    while(remaining>1e-8&&this.state.isRunning&&!this.state.isPaused) {
      const step=Math.min(5,remaining);this.advancePhysicsStep(step);remaining-=step;
    }
  }

  private advancePhysicsStep(deltaMilliseconds:number):void {
    const wasSupported=this.fall.status==='supported';
    const before={...this.state.robotState.pose};
    if(wasSupported)this.advanceGripper(deltaMilliseconds);
    const deltaTime = deltaMilliseconds / 1000;
    this.simulationTime += deltaMilliseconds;

    // Once unsupported, motors no longer drive the chassis across the mat.
    if (this.fall.status === 'supported') this.updateRobotKinematics(deltaTime);

    // Check collisions
    if (this.fall.status === 'supported') this.checkCollisions();
    const robotCollision=this.resolveRobotContacts();
    const pose = this.state.robotState.pose;
    // Approximate centre of mass lies behind the drive axle, inside the PCB.
    const angle = pose.heading*Math.PI/180;
    const cx = pose.x - 20*Math.cos(angle), cy = pose.y - 20*Math.sin(angle);
    if (this.fall.status === 'supported' && (cx < 0 || cy < 0 || cx > this.board.width || cy > this.board.height)) {
      const speed = (this.state.robotState.velocityLeft + this.state.robotState.velocityRight)/2;
      this.fall.status = 'falling'; this.fall.vx = speed*Math.cos(angle); this.fall.vy = speed*Math.sin(angle);
      this.setGripper(0,0);
      this.state.robotState.velocityLeft = this.state.robotState.velocityRight = 0;
    }
    if (this.fall.status === 'falling') {
      if(!wasSupported) {pose.x += this.fall.vx*deltaTime; pose.y += this.fall.vy*deltaTime;}
      this.fall.drop += this.fall.velocityZ*deltaTime + 0.5*9810*deltaTime*deltaTime;
      this.fall.velocityZ += 9810*deltaTime;
      // Assumed tabletop drop: 750 mm. A 2.5D fall, not a rigid-body solver.
      if (this.fall.drop >= 750) { this.fall.drop = 750; this.fall.status = 'fallen'; this.state.isRunning = false; }
    }

    const stationaryContact=robotCollision&&Math.hypot(pose.x-before.x,pose.y-before.y)<1e-7&&Math.abs(pose.heading-before.heading)<1e-7;
    if(this.missionStepEnabled)this.mission.step(deltaTime,this.getRobotPose(),stationaryContact?0:this.state.robotState.velocityLeft,stationaryContact?0:this.state.robotState.velocityRight);

    // Read sensors
    this.state.sensorReadings = this.readSensors();

    // History is a display trace, not the encoder/physics clock. Sample at 50 Hz.
    const previous=this.state.history[this.state.history.length-1];
    if(!previous||this.simulationTime-previous.timestamp>=20) this.state.history.push({
      timestamp: this.simulationTime,
      robotPose: { ...this.state.robotState.pose },
      sensorReadings: { ...this.state.sensorReadings },
      motorSpeeds: {
        left: this.state.robotState.velocityLeft,
        right: this.state.robotState.velocityRight,
      },
    });

    if(this.state.history.length>6001)this.state.history.splice(0,this.state.history.length-6001);
    this.state.currentTime = this.simulationTime;
  }

  /**
   * Update robot position based on differential drive kinematics
   * Uses proper integration for accurate diagonal and curved movement
   */
  private updateRobotKinematics(deltaTime: number): void {
    const pose = this.state.robotState.pose;
    const vL = this.state.robotState.velocityLeft;
    const vR = this.state.robotState.velocityRight;
    const wheelBase = this.robotConfig.wheelBase;
    const dt = deltaTime; // deltaTime is already in seconds from update()

    // Differential drive kinematics
    const v = (vL + vR) / 2; // linear velocity (mm/s)
    const w = (vL - vR) / wheelBase; // Screen coordinates: positive heading is clockwise, matching C++ encoders.

    const theta = (pose.heading * Math.PI) / 180; // current heading in radians

    // Use more accurate integration for small time steps
    // This handles both straight and curved motion correctly
    if (Math.abs(w) < 1e-6) {
      // Nearly straight line motion
      const dx = v * Math.cos(theta) * dt;
      const dy = v * Math.sin(theta) * dt;
      pose.x += dx;
      pose.y += dy;
    } else {
      // Curved motion with rotation
      // Radius of curvature
      const R = v / w;
      
      // Change in heading
      const dtheta = w * dt;
      
      // New heading
      const newTheta = theta + dtheta;
      
      // Position change using circular arc
      // This is more accurate than simple Euler integration
      const dx = R * (Math.sin(newTheta) - Math.sin(theta));
      const dy = R * (Math.cos(theta) - Math.cos(newTheta));
      
      pose.x += dx;
      pose.y += dy;
      pose.heading = (newTheta * 180 / Math.PI) % 360;
    }

    // Keep heading in range [0, 360)
    if (pose.heading < 0) pose.heading += 360;
    if (pose.heading >= 360) pose.heading -= 360;
  }

  /**
   * Check for collisions with obstacles and walls
   */
  private checkCollisions(): void {
    const pose = this.state.robotState.pose;
    const robotRadius = LEANBOT_APPEARANCE.collisionRadius; // mm - approximate robot size

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

    // The mat perimeter is an unsupported edge, not an invisible wall.
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
  getRawLineReadings(): number[] {
    return readVirtualLine(this.board,this.getRobotPose());
  }

  private rgb:number[]=[0,0,0];
  setLedColors(colors:readonly number[],brightness=255):void{this.rgb=colors.map(v=>Math.max(0,Math.min(255,v))*Math.max(0,Math.min(255,brightness))/255);}
  getLedColors():readonly number[]{return this.rgb;}

  getColorReading():readonly [number,number,number]{
    return readVirtualColor(this.mission.blocks,this.getRobotPose(),this.mission.hidePollutionColors);
  }

  getLineMask(): number {
    return this.getRawLineReadings().reduce((mask, value, i) => mask | (value > 0 ? 1 << (3 - i) : 0), 0);
  }

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

    let minDistance = this.mission.distance(pose, rayLength);
    const sensor={x:pose.x+40*Math.cos(headingRad),y:pose.y+40*Math.sin(headingRad)};
    for(const remote of this.remotePoses)minDistance=Math.min(minDistance,robotRayDistance(sensor,pose.heading,remote,rayLength));

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
