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
  gripper: { pivotX: 53, pivotY: 35, openAngle: 0, closedAngle: -0.98 },
} as const;

// Fork outline in servo-local coordinates. Both jaws use the same mirrored shape.
// The fork notch faces the centreline, not the outside of the robot.
// Open jaws point forward, as in the supplied overhead photograph IMG_5459.
// Narrow wooden fork, 35 mm from servo pivot to tip; dimensions remain estimates.
const FINGER = [[0,3],[26,3],[35,0],[35,-4],[29,-8],[23,-3],[17,-3],[23,-11],[19,-14],[10,-11],[1,-3]] as const;
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
export function polygonsIntersect(a:{x:number;y:number}[],b:{x:number;y:number}[]) {
  const inside=(p:{x:number;y:number},poly:{x:number;y:number}[])=>{
    let result=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const u=poly[i],v=poly[j];
      if((u.y>p.y)!==(v.y>p.y)&&p.x<(v.x-u.x)*(p.y-u.y)/(v.y-u.y)+u.x)result=!result;
    }
    return result;
  };
  const cross=(p:{x:number;y:number},q:{x:number;y:number},r:{x:number;y:number})=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const onSegment=(p:{x:number;y:number},q:{x:number;y:number},r:{x:number;y:number})=>Math.abs(cross(p,q,r))<1e-8&&r.x>=Math.min(p.x,q.x)-1e-8&&r.x<=Math.max(p.x,q.x)+1e-8&&r.y>=Math.min(p.y,q.y)-1e-8&&r.y<=Math.max(p.y,q.y)+1e-8;
  if(a.some(p=>inside(p,b))||b.some(p=>inside(p,a)))return true;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++) {
    const p=a[i],q=a[(i+1)%a.length],r=b[j],t=b[(j+1)%b.length];
    if(onSegment(p,q,r)||onSegment(p,q,t)||onSegment(r,t,p)||onSegment(r,t,q))return true;
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
  const safe=(t:number,side:-1|1)=>!polygonsIntersect(gripperJaw(side,t),rectangle);
  const firstContact=(max:number,side:-1|1)=>{
    if(!safe(0,side))return 0;
    let lo=0,hi=max,found=false;
    for(let step=1;step<=180;step++) {
      const t=max*step/180;
      if(max===90?polygonsIntersect(jawSamples[side][step],rectangle):!safe(t,side)){lo=max*(step-1)/180;hi=t;found=true;break;}
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

/** Exact overlap test for the concave finger, then separate along rectangle axes.
 * Do not use a convex hull: it would fill the visible fork notch. */
export function jawBlockContact(jaw:{x:number;y:number}[], rectangle:{x:number;y:number}[]) {
  if(!polygonsIntersect(jaw,rectangle))return null;
  let best={depth:Infinity,nx:0,ny:0};
  for(let i=0;i<2;i++) {
    const p=rectangle[i],q=rectangle[i+1],length=Math.hypot(q.x-p.x,q.y-p.y);
    for(const sign of [-1,1]) {
      const nx=sign*(q.x-p.x)/length,ny=sign*(q.y-p.y)/length;
      let lo=0,hi=Math.max(...jaw.map(p=>p.x*nx+p.y*ny))-Math.min(...rectangle.map(p=>p.x*nx+p.y*ny))+.001;
      for(let j=0;j<18;j++) {
        const distance=(lo+hi)/2;
        if(polygonsIntersect(jaw,rectangle.map(p=>({x:p.x+nx*distance,y:p.y+ny*distance}))))lo=distance;else hi=distance;
      }
      if(hi<best.depth)best={depth:hi,nx,ny};
    }
  }
  return best;
}
