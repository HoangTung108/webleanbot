import type {Pose} from './types';
import {LEANBOT_GEOMETRY} from './robotGeometry';

// Conservative plan-view envelope, axle origin shared with drawLeanbot.
export const ROBOT_ENVELOPE={x:LEANBOT_GEOMETRY.body.x-LEANBOT_GEOMETRY.body.length/2,y:-LEANBOT_GEOMETRY.width/2,length:LEANBOT_GEOMETRY.length,width:LEANBOT_GEOMETRY.width};
export function isFinitePose(p:unknown):p is Pose {
  const pose=p as Pose|undefined;
  return !!pose&&[pose.x,pose.y,pose.heading].every(n=>typeof n==='number'&&Number.isFinite(n));
}
export function robotContact(a:Pose,b:Pose){
  if(!isFinitePose(a)||!isFinitePose(b))return null;
  const ar=a.heading*Math.PI/180,br=b.heading*Math.PI/180;
  const ac=Math.cos(ar),as=Math.sin(ar),bc=Math.cos(br),bs=Math.sin(br);
  const offset=ROBOT_ENVELOPE.x+ROBOT_ENVELOPE.length/2;
  const dx=b.x+offset*bc-a.x-offset*ac,dy=b.y+offset*bs-a.y-offset*as;
  if(Math.abs(dx)>300||Math.abs(dy)>300)return null;
  let depth=Infinity,nx=0,ny=0;
  for(const [x,y] of [[ac,as],[-as,ac],[bc,bs],[-bs,bc]]){
    const radius=(c:number,s:number)=>(Math.abs(x*c+y*s)*ROBOT_ENVELOPE.length+Math.abs(-x*s+y*c)*ROBOT_ENVELOPE.width)/2;
    const distance=dx*x+dy*y,overlap=radius(ac,as)+radius(bc,bs)-Math.abs(distance);
    if(overlap<=1e-7)return null;
    if(overlap<depth){depth=overlap;nx=x*(distance>=0?1:-1);ny=y*(distance>=0?1:-1);}
  }
  return {depth,nx,ny};
}
/** Equal-mass reconciliation on the server. Returns independent poses. */
export function separateRobots(a:Pose,b:Pose){
  const hit=robotContact(a,b);if(!hit)return null;
  const shift=(hit.depth+.02)/2;
  return {a:{...a,x:a.x-hit.nx*shift,y:a.y-hit.ny*shift},b:{...b,x:b.x+hit.nx*shift,y:b.y+hit.ny*shift}};
}

/** Sensor ray against the same oriented envelope used for contact. */
export function robotRayDistance(origin:{x:number;y:number},heading:number,peer:Pose,maxDistance=300):number {
  const angle=peer.heading*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),a=heading*Math.PI/180;
  const offset=ROBOT_ENVELOPE.x+ROBOT_ENVELOPE.length/2;
  const dx=origin.x-peer.x-offset*c,dy=origin.y-peer.y-offset*s;
  const o=[dx*c+dy*s,-dx*s+dy*c],d=[Math.cos(a-angle),Math.sin(a-angle)],half=[ROBOT_ENVELOPE.length/2,ROBOT_ENVELOPE.width/2];
  let near=0,far=maxDistance;
  for(let i=0;i<2;i++) {
    if(Math.abs(d[i])<1e-9){if(Math.abs(o[i])>half[i])return maxDistance;}
    else {const t1=(-half[i]-o[i])/d[i],t2=(half[i]-o[i])/d[i];near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));}
  }
  return far>=near?near:maxDistance;
}
