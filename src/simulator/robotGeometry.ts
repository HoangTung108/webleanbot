/** mm / kg. Origin: drive axle midpoint; +X points toward the gripper.
 * Overall 180 x 120 x 70 mm, 0.400 kg: supplied by the user on 2026-11-06.
 * Internal layout is fitted from the supplied Leanbot look video, not measured:
 * https://youtu.be/p64iZY-Bba4 (28 s, front/side/rear/overhead reference frames).
 */
export const LEANBOT_GEOMETRY = {
  length: 180,
  width: 120,
  height: 70,
  mass: 0.400,
  collisionRadius: 110, // conservative editing/wall hit radius, not the body width
  wheelBase: 100, // estimated axle track: 120 mm overall minus 20 mm tyre width
  graspOffset: 75,
  body: { x: -27, y: 0, length: 130, width: 70 },
  wheel: { length: 32.5, width: 20 },
  gripper: { pivotX: 53, pivotY: 35, openAngle: 0.75, closedAngle: -0.98 },
} as const;

// Fork outline in servo-local coordinates. Both jaws use the same mirrored shape.
// The fork notch faces the centreline, not the outside of the robot.
const FINGER = [[0,5],[21,5],[32,1],[33,-4],[26,-9],[19,-3],[15,-3],[22,-14],[18,-18],[9,-13],[1,-4]] as const;
export function gripperJaw(side: -1|1, degrees: number) {
  const g=LEANBOT_GEOMETRY.gripper;
  const t=Math.max(0,Math.min(90,degrees))/90,a=g.openAngle+(g.closedAngle-g.openAngle)*t;
  return FINGER.map(([x,y])=>({x:g.pivotX+x*Math.cos(a)-y*Math.sin(a),y:side*(g.pivotY+x*Math.sin(a)+y*Math.cos(a))}));
}
// Full-closure sweeps reuse immutable jaw polygons; moving blocks only need
// rectangle tests. Keep result caching bounded for long sessions.
const jawSamples = {
  '-1':Array.from({length:181},(_,i)=>gripperJaw(-1,i/2)),
  '1':Array.from({length:181},(_,i)=>gripperJaw(1,i/2)),
};
const contactCache=new Map<string,{left:number;right:number}>();
export type GripFootprint={length:number;width:number;rotation:number;x?:number;y?:number};
function intersects(a:{x:number;y:number}[],b:{x:number;y:number}[]) {
  const inside=(p:{x:number;y:number},poly:{x:number;y:number}[])=>{
    let result=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const u=poly[i],v=poly[j];
      if((u.y>p.y)!==(v.y>p.y)&&p.x<(v.x-u.x)*(p.y-u.y)/(v.y-u.y)+u.x)result=!result;
    }
    return result;
  };
  const cross=(p:{x:number;y:number},q:{x:number;y:number},r:{x:number;y:number})=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  if(a.some(p=>inside(p,b))||b.some(p=>inside(p,a)))return true;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++) {
    const p=a[i],q=a[(i+1)%a.length],r=b[j],t=b[(j+1)%b.length];
    if(cross(p,q,r)*cross(p,q,t)<-1e-9&&cross(r,t,p)*cross(r,t,q)<-1e-9)return true;
  }
  return false;
}
/** Limit each finger at its first contact with the entire oriented block. */
export function fitGripperToBlock(left:number,right:number,width:number,shape?:GripFootprint) {
  const l=Math.max(0,Math.min(90,left)),r=Math.max(0,Math.min(90,right));
  if(!Number.isFinite(width)||width<=0||(l===0&&r===0))return {left:l,right:r};
  const target=shape??{length:15,width,rotation:0};
  const key=[l,r,target.length,target.width,target.rotation,target.x??LEANBOT_GEOMETRY.graspOffset,target.y??0].map(n=>Math.round(n*1e6)/1e6).join(',');
  const cached=contactCache.get(key);if(cached)return {...cached};
  const a=target.rotation*Math.PI/180;
  const rectangle=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([x,y])=>({x:(target.x??LEANBOT_GEOMETRY.graspOffset)+x*(target.length+.2)/2*Math.cos(a)-y*(target.width+.2)/2*Math.sin(a),y:(target.y??0)+x*(target.length+.2)/2*Math.sin(a)+y*(target.width+.2)/2*Math.cos(a)}));
  const safe=(t:number,side:-1|1)=>!intersects(gripperJaw(side,t),rectangle);
  const firstContact=(max:number,side:-1|1)=>{
    let lo=0,hi=max,found=false;
    for(let step=1;step<=180;step++) {
      const t=max*step/180;
      if(max===90?intersects(jawSamples[side][step],rectangle):!safe(t,side)){lo=max*(step-1)/180;hi=t;found=true;break;}
    }
    if(!found)return max;
    for(let i=0;i<28;i++){const t=(lo+hi)/2;if(safe(t,side))lo=t;else hi=t;}
    return lo;
  };
  const result={left:firstContact(l,-1),right:firstContact(r,1)};
  if(contactCache.size>=512)contactCache.clear();
  contactCache.set(key,result);
  return {...result};
}
