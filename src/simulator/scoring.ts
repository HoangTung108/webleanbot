import type { BoardConfig, Pose } from './types';
import { blockFootprint, type BlockColor, type MissionBlock, type MissionWorld } from './missionWorld';
import { LEANBOT_GEOMETRY } from './robotGeometry';

export const SCORE_CATEGORIES = {
  explorer: {name:'Explorer', pollution:['green','blue','red','yellow'], neutralizers:['green','blue'], robots:1},
  creator: {name:'Creator', pollution:['green','blue','red','yellow','purple'], neutralizers:['green','blue','purple'], robots:1},
  innovator: {name:'Innovator', pollution:['green','blue','red','yellow','purple','yellow'], neutralizers:['green','blue','purple'], robots:2},
  master: {name:'Master', pollution:['green','blue','red','yellow','purple','yellow','mystery'], neutralizers:['green','blue','purple'], robots:3},
} as const;
export type ScoreCategory = keyof typeof SCORE_CATEGORIES;
interface Rect {x:number;y:number;width:number;height:number;rotation:number}
export interface ScoreResult {
  containment:number; neutralization:number; analysis:number; mystery:number; returned:number; total:number;
  containedBlocks:number; pairs:number; analyzedBlocks:number; mysteryBlocks:number; returnedRobots:number;
}
function corners(x:number,y:number,length:number,width:number,rotation:number) {
  const a=rotation*Math.PI/180;
  return [-1,1].flatMap(i=>[-1,1].map(j=>({x:x+i*length/2*Math.cos(a)-j*width/2*Math.sin(a),y:y+i*length/2*Math.sin(a)+j*width/2*Math.cos(a)})));
}
function within(points:{x:number;y:number}[],rect:Rect) {
  const a=-rect.rotation*Math.PI/180;
  return points.every(p=>Math.abs((p.x-rect.x)*Math.cos(a)-(p.y-rect.y)*Math.sin(a))<=rect.width/2+1e-6 && Math.abs((p.x-rect.x)*Math.sin(a)+(p.y-rect.y)*Math.cos(a))<=rect.height/2+1e-6);
}
const settled=(b:MissionBlock)=>!b.held && b.state!=='falling' && Math.hypot(b.vx,b.vy)<=1 && Math.abs(b.spin)<=1;
const footprint=(b:MissionBlock)=>{const size=blockFootprint(b);return corners(b.x,b.y,size.length,size.width,b.rotation)};
/** Photo-based scoring interpretation; pairs replace containment points by default.
 * Entire ground footprint must be in the area. Held/moving blocks are excluded.
 */
export function calculateScore(board:BoardConfig,blocks:MissionBlock[],category:ScoreCategory,robots:{pose:Pose;fallen?:boolean}[],addContainmentForPairs=false):ScoreResult {
  const score:ScoreResult={containment:0,neutralization:0,analysis:0,mystery:0,returned:0,total:0,containedBlocks:0,pairs:0,analyzedBlocks:0,mysteryBlocks:0,returnedRobots:0};
  const available=blocks.filter(settled),assigned=new Set<string>();
  for(const zone of board.cityZones??[]) {
    const area={...zone.containment,width:zone.containment.side,height:zone.containment.side};
    const inside=available.filter(b=>!assigned.has(b.id)&&within(footprint(b),area));inside.forEach(b=>assigned.add(b.id));
    const pollution=inside.filter(b=>b.kind==='pollution'),paired=new Set<string>();
    for(const color of ['green','blue','purple'] as const) {
      const p=pollution.filter(b=>b.color===color),n=inside.filter(b=>b.kind==='neutralizer'&&b.color===color);
      for(const block of p.slice(0,n.length))paired.add(block.id);
    }
    score.pairs+=paired.size;
    score.containedBlocks+=pollution.filter(b=>addContainmentForPairs||!paired.has(b.id)).length;
  }
  if(board.analysisArea) {
    for(const b of available.filter(b=>b.kind==='pollution'&&!assigned.has(b.id)&&within(footprint(b),board.analysisArea!))) {
      if(b.color==='red'||b.color==='yellow')score.analyzedBlocks++;
      if(b.color==='mystery'&&category==='master')score.mysteryBlocks++;
    }
    // The robot drawing is asymmetric around its axle: rear -92 mm, front +88 mm.
    score.returnedRobots=robots.filter(r=>!r.fallen&&within(corners(r.pose.x-2*Math.cos(r.pose.heading*Math.PI/180),r.pose.y-2*Math.sin(r.pose.heading*Math.PI/180),LEANBOT_GEOMETRY.length,LEANBOT_GEOMETRY.width,r.pose.heading),board.analysisArea!)).slice(0,SCORE_CATEGORIES[category].robots).length;
  }
  score.containment=score.containedBlocks*45;score.neutralization=score.pairs*160;
  score.analysis=score.analyzedBlocks*100;score.mystery=score.mysteryBlocks*150;score.returned=score.returnedRobots*40;
  score.total=score.containment+score.neutralization+score.analysis+score.mystery+score.returned;
  return score;
}
export function createScoringMission(world:MissionWorld,category:ScoreCategory,seed:number) {
  const preset=SCORE_CATEGORIES[category];world.randomize(preset.pollution.length,preset.neutralizers.length,seed);
  const layout=JSON.parse(world.serialize());
  let p=0,n=0;
  for(const block of layout.blocks)block.color=(block.kind==='pollution'?preset.pollution[p++]:preset.neutralizers[n++]) as BlockColor;
  world.load(JSON.stringify(layout));
}
