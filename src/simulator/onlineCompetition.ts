import type {CompetitionPhase,RoundRecord} from './competitionFlow';
import type {MissionBlock} from './missionWorld';
import type {Pose} from './types';
import type {ScoreCategory} from './scoring';
export type OnlineAction='enable'|'disable'|'category'|'announce'|'lock-code'|'reveal'|'start'|'stop'|'next'|'new'|'speed'|'practice-run'|'practice-reset'|'place-robot';
export interface OnlineCommand {action:OnlineAction;sessionId?:string;round?:number;category?:ScoreCategory;code?:string;speed?:number;pose?:Pose}
export interface OnlinePlayer {rgb?:readonly number[];simulationTimeMs?:number;id:string;pose:Pose;motorLeft:number;motorRight:number;gripper:{left:number;right:number};supported:boolean;fall:{status:'supported'|'falling'|'fallen';drop:number;velocityZ:number;vx:number;vy:number};locked:boolean;programRunning:boolean;connected:boolean}
export interface OnlineCompetitionState {
 sessionId:string;revision:number;frame:number;ownerId:string;round:number;category:ScoreCategory;phase:CompetitionPhase;
 elapsedMs:number;rate:number;layout:string;blocks:MissionBlock[];players:OnlinePlayer[];records:RoundRecord[];hiddenColors:boolean;notice?:string;
}
