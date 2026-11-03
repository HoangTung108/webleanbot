/**
 * Leanbot 2D Simulator - Main Export
 */

export { RobotSimulator } from './robotSimulator';
export { SimulatorRenderer } from './renderer';
export { CppSimulatorBridge } from './cppBridge';
export {
  SYNAPSE_CITY,
  AIROC2026_MAZE,
  AIROC2026_DELIVERY,
  SIMPLE_LINE_FOLLOWING,
  OBSTACLE_AVOIDANCE,
  AVAILABLE_BOARDS,
  getBoardByName,
  getAllBoardNames,
} from './boardConfigs';

export type {
  Vector2D,
  Pose,
  RobotConfig,
  RobotState2D,
  BoardConfig,
  CityZone,
  CompetitionSite,
  StorageSite,
  Obstacle,
  Wall,
  Line,
  SensorReading,
  SimulationStep,
  SimulationState,
} from './types';

export type { RendererOptions } from './renderer';
export type { SimulatorCommand, CommandQueue } from './cppBridge';
