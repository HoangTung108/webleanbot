/**
 * 2D Robot Simulator Types for Leanbot
 * Supports AIROC 2026 competition board and general robotics simulation
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface Pose {
  x: number;
  y: number;
  heading: number; // in degrees, 0 = right, 90 = down, 180 = left, 270 = up
}

export enum RobotState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

export interface RobotConfig {
  wheelRadius: number; // mm
  wheelBase: number; // distance between wheels, mm
  maxSpeed: number; // mm/s
  maxAcceleration: number; // mm/s²
  sensorOffsets: {
    irLineLeft: Vector2D;
    irLineCenter: Vector2D;
    irLineRight: Vector2D;
    irFront: Vector2D;
  };
}

export interface RobotState2D {
  pose: Pose;
  velocityLeft: number; // mm/s
  velocityRight: number; // mm/s
  accelerationLeft: number; // mm/s²
  accelerationRight: number; // mm/s²
}

export interface CompetitionSite {
  id: string;
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface CityZone {
  id: string;
  center: Vector2D;
  containment: { x: number; y: number; side: number; rotation: number };
  sites: CompetitionSite[];
}

export interface StorageSite {
  rotation: number;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoardConfig {
  name: string;
  width: number; // mm
  height: number; // mm
  backgroundImage?: string;
  initialPose?: Pose;
  analysisArea?: { x:number; y:number; width:number; height:number; rotation:number };
  cityZones?: CityZone[];
  storageSites?: StorageSite[];
  obstacles: Obstacle[];
  walls: Wall[];
  lines: Line[];
  metadata?: Record<string, any>;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees
  type?: string; // cube, cylinder, etc
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  height?: number;
}

export interface Line {
  id: string;
  points: Array<{ x: number; y: number }>;
  width: number;
  color?: string;
}

export interface SensorReading {
  irLine: {
    left: number; // 0-4095
    center: number;
    right: number;
  };
  irArray?: number[]; // if available
  distance?: number; // mm (from ultrasonic)
  touch?: boolean[];
  battery?: number; // voltage
}

export interface SimulationStep {
  timestamp: number;
  robotPose: Pose;
  sensorReadings: SensorReading;
  motorSpeeds: {
    left: number; // rpm or mm/s
    right: number;
  };
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  robotState: RobotState2D;
  sensorReadings: SensorReading;
  history: SimulationStep[];
  currentTime: number; // simulation time in ms
}
