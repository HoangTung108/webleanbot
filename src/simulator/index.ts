/**
 * Leanbot 2D Simulator - Main Export
 */

export { RobotSimulator } from './robotSimulator';
export { SimulatorRenderer } from './renderer';
export { CppSimulatorBridge } from './cppBridge';
export {
  SYNAPSE_CITY,
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

export { MissionWorld, BLOCK_SIZE, BLOCK_COLORS, NEUTRALIZER_COLORS } from './missionWorld';
export type { MissionBlock, BlockColor, BlockKind } from './missionWorld';
