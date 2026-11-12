import type {BoardConfig} from './types';
import {createSynapseBoard} from './synapseGeometry';
export const SYNAPSE_CITY:BoardConfig=createSynapseBoard();
export const AVAILABLE_BOARDS:Record<string,BoardConfig>={synapse_city:SYNAPSE_CITY};
export function getBoardByName(name:string):BoardConfig|undefined{return AVAILABLE_BOARDS[name];}
export function getAllBoardNames():string[]{return Object.keys(AVAILABLE_BOARDS);}
