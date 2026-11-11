import {LEANBOT_GEOMETRY} from './robotGeometry';
import type {BoardConfig,Pose} from './types';
import type {MissionBlock} from './missionWorld';

export const LINE_SENSOR_LATERAL_MM = [-24,-6,6,24] as const;
export const LINE_SENSOR_FORWARD_MM = 50;

/** Ideal four-channel IR model. ADC/lighting noise requires measurements from hardware. */
export function readVirtualLine(board:Pick<BoardConfig,'lines'>,pose:Pose):number[]{
 const angle=pose.heading*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
 return LINE_SENSOR_LATERAL_MM.map(y=>{
  const x=pose.x+LINE_SENSOR_FORWARD_MM*cos-y*sin,sy=pose.y+LINE_SENSOR_FORWARD_MM*sin+y*cos;
  for(const line of board.lines)for(let i=1;i<line.points.length;i++){
   const a=line.points[i-1],b=line.points[i],dx=b.x-a.x,dy=b.y-a.y;
   const t=Math.max(0,Math.min(1,((x-a.x)*dx+(sy-a.y)*dy)/(dx*dx+dy*dy||1)));
   if(Math.hypot(x-a.x-t*dx,sy-a.y-t*dy)<=line.width/2)return 4095;
  }
  return 0;
 });
}
/** Synthetic APDS RGB at the gripper: verifies program behavior, not optical calibration. */
export function readVirtualColor(blocks:readonly MissionBlock[],pose:Pose,hidePollutionColors=false):readonly [number,number,number]{
 const angle=pose.heading*Math.PI/180;
 const x=pose.x+LEANBOT_GEOMETRY.graspOffset*Math.cos(angle),y=pose.y+LEANBOT_GEOMETRY.graspOffset*Math.sin(angle);
 let nearest:MissionBlock|undefined,distance=35;
 for(const block of blocks){if(block.offBoard||block.state!=='standing')continue;const d=Math.hypot(block.x-x,block.y-y);if(d<distance){nearest=block;distance=d;}}
 const samples:Record<string,[number,number,number]>={red:[200,20,10],yellow:[200,180,10],green:[20,200,20],blue:[20,30,200],purple:[140,20,180]};
 return nearest?samples[hidePollutionColors&&nearest.kind==='pollution'?'mystery':nearest.color]??[60,60,60]:[0,0,0];
}
