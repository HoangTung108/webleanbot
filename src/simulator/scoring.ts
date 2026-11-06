import type { BoardConfig, Pose } from './types';
import { blockFootprint, type BlockColor, type MissionBlock, type MissionWorld, seededRandom } from './missionWorld';
import { LEANBOT_GEOMETRY } from './robotGeometry';

export const SCORE_CATEGORIES = {
  explorer: {name:'Explorer', pollution:['green','blue','red','yellow'], neutralizers:['green','blue'], robots:1},
  creator: {name:'Creator', pollution:['green','blue','red','yellow','purple'], neutralizers:['green','blue','purple'], robots:1},
  innovator: {name:'Innovator', pollution:['green','blue','red','yellow','purple','yellow'], neutralizers:['green','blue','purple'], robots:2},
  master: {name:'Master', pollution:['green','blue','red','yellow','purple','yellow','mystery'], neutralizers:['green','blue','purple'], robots:2},
} as const;
export type ScoreCategory = keyof typeof SCORE_CATEGORIES;
export const RULEBOOK_URL = 'https://drive.google.com/file/d/1KBwprFcB4-8hPliPkTJlqjujqLcO3FP_/view';
export const ROUND_LIMIT_MS = 120000;
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
const grounded=(b:MissionBlock)=>(b.elevation??0)<=1e-6;
const footprint=(b:MissionBlock)=>{const size=blockFootprint(b);return corners(b.x,b.y,size.length,size.width,b.rotation)};
function touches(points:{x:number;y:number}[],rect:Rect,strict=false) {
  const target=corners(rect.x,rect.y,rect.width,rect.height,rect.rotation);
  // Separating-axis test handles edge/corner overlaps and rotated fallen blocks.
  const axes=[points[1],points[2],target[1],target[2]].map((p,i)=>{
    const q=i<2?points[0]:target[0],dx=p.x-q.x,dy=p.y-q.y,l=Math.hypot(dx,dy);
    return {x:-dy/l,y:dx/l};
  });
  return axes.every(a=>{
    const p=points.map(v=>v.x*a.x+v.y*a.y),q=target.map(v=>v.x*a.x+v.y*a.y);
    const overlap=Math.min(Math.max(...p),Math.max(...q))-Math.max(Math.min(...p),Math.min(...q));
    return strict?overlap>1e-6:overlap>=-1e-6;
  });
}
/** V6 sections 9–10: ground contact, correct origin zone, colour match.
 * 160/pair is the combined matrix award; it replaces that pollution's 45.
 */
export function calculateScore(board:BoardConfig,blocks:MissionBlock[],category:ScoreCategory,robots:{pose:Pose;startPose?:Pose;fallen?:boolean}[]):ScoreResult {
  const score:ScoreResult={containment:0,neutralization:0,analysis:0,mystery:0,returned:0,total:0,containedBlocks:0,pairs:0,analyzedBlocks:0,mysteryBlocks:0,returnedRobots:0};
  const available=blocks.filter(grounded),assigned=new Set<string>();
  for(const zone of board.cityZones??[]) {
    const area={...zone.containment,width:zone.containment.side,height:zone.containment.side};
    const inside=available.filter(b=>!assigned.has(b.id)&&touches(footprint(b),area)&&(b.kind==='neutralizer'||b.originZone===zone.id));inside.forEach(b=>assigned.add(b.id));
    const pollution=inside.filter(b=>b.kind==='pollution'),paired=new Set<string>();
    for(const color of ['green','blue','purple'] as const) {
      const p=pollution.filter(b=>b.color===color),n=inside.filter(b=>b.kind==='neutralizer'&&b.color===color);
      for(const block of p.slice(0,n.length))paired.add(block.id);
    }
    score.pairs+=paired.size;
    score.containedBlocks+=pollution.filter(b=>!paired.has(b.id)).length;
  }
  if(board.analysisArea) {
    for(const b of available.filter(b=>b.kind==='pollution'&&!assigned.has(b.id)&&touches(footprint(b),board.analysisArea!,true))) {
      if(b.color==='mystery') { if(category==='master')score.mysteryBlocks++; }
      else score.analyzedBlocks++;
    }
    // The robot drawing is asymmetric around its axle: rear -92 mm, front +88 mm.
    score.returnedRobots=robots.filter(r=>!r.fallen&&r.startPose&&robotWithinCRL(board,r.startPose)&&within(corners(r.pose.x-2*Math.cos(r.pose.heading*Math.PI/180),r.pose.y-2*Math.sin(r.pose.heading*Math.PI/180),LEANBOT_GEOMETRY.length,LEANBOT_GEOMETRY.width,r.pose.heading),board.analysisArea!)).slice(0,SCORE_CATEGORIES[category].robots).length;
  }
  score.containment=score.containedBlocks*45;score.neutralization=score.pairs*160;
  score.analysis=score.analyzedBlocks*100;score.mystery=score.mysteryBlocks*150;score.returned=score.returnedRobots*40;
  score.total=score.containment+score.neutralization+score.analysis+score.mystery+score.returned;
  return score;
}
export function robotWithinCRL(board:BoardConfig,pose:Pose) {
  const a=pose.heading*Math.PI/180;
  return !!board.analysisArea&&within(corners(pose.x-2*Math.cos(a),pose.y-2*Math.sin(a),LEANBOT_GEOMETRY.length,LEANBOT_GEOMETRY.width,pose.heading),board.analysisArea);
}
export function normalizeScore(raw:number,topFive:number[]) {
  if(!Number.isFinite(raw)||raw<0||topFive.length!==5||topFive.some(n=>!Number.isFinite(n)||n<0))throw new Error('Cần đúng 5 Raw Score hợp lệ của Top 5 trong cùng cấu hình/vòng.');
  const baseTopScore=topFive.reduce((a,b)=>a+b,0)/5;
  if(baseTopScore<=0)throw new Error('Base Top Score phải lớn hơn 0.');
  return {baseTopScore,normalized:raw/baseTopScore*1000};
}
/** Practice draw; the organizer must supply the unspecified fixed site. */
export function createScoringMission(world:MissionWorld,category:ScoreCategory,seed:number,fixedSiteId?:string) {
  const random=seededRandom(seed),preset=SCORE_CATEGORIES[category];
  const shuffle=<T,>(items:readonly T[])=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const zones=world.board.cityZones??[];
  const fixed=fixedSiteId?zones.find(z=>z.sites.some(s=>s.id===fixedSiteId)):undefined;
  if(fixedSiteId&&!fixed)throw new Error('Vị trí pollution cố định không hợp lệ.');
  const selected=[...(fixed?[fixed]:[]),...shuffle(zones.filter(z=>z!==fixed))].slice(0,preset.pollution.length);
  if(selected.length!==preset.pollution.length)throw new Error('Không đủ thành phố cho hạng mục này.');
  const storage=shuffle(world.board.storageSites??[]);
  const blocks=[...selected.map((zone,i)=>({kind:'pollution',color:preset.pollution[i],slotId:fixed&&i===0?fixedSiteId:shuffle(zone.sites)[0].id})),...preset.neutralizers.map((color,i)=>({kind:'neutralizer',color,slotId:storage[i].id}))];
  world.load(JSON.stringify({version:1,friction:world.friction,blocks}));
}
