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
  gripper: { pivotX: 53, pivotY: 35, openAngle: 0.2, closedAngle: -0.75 },
} as const;

// Fork outline in servo-local coordinates. Both jaws use the same mirrored shape.
const FINGER = [[0,-5],[21,-5],[32,-1],[33,4],[26,9],[19,3],[15,3],[22,14],[18,18],[9,13],[1,4]] as const;
export function gripperJaw(side: -1|1, degrees: number) {
  const g=LEANBOT_GEOMETRY.gripper;
  const t=Math.max(0,Math.min(90,degrees))/90,a=g.openAngle+(g.closedAngle-g.openAngle)*t;
  return FINGER.map(([x,y])=>({x:g.pivotX+x*Math.cos(a)-y*Math.sin(a),y:side*(g.pivotY+x*Math.sin(a)+y*Math.cos(a))}));
}
/** Inner jaw-to-jaw clearance at the shared grasp point, in mm. */
export function gripperOpening(left: number,right: number) {
  const at=(side:-1|1,degrees:number)=>{
    const p=gripperJaw(side,degrees),ys:number[]=[];
    for(let i=0;i<p.length;i++) {
      const a=p[i],b=p[(i+1)%p.length],x=LEANBOT_GEOMETRY.graspOffset;
      if(Math.abs(b.x-a.x)>1e-9 && x>=Math.min(a.x,b.x) && x<=Math.max(a.x,b.x))ys.push(a.y+(x-a.x)/(b.x-a.x)*(b.y-a.y));
    }
    return ys.length?(side===1?Math.min(...ys):Math.max(...ys)):side*100;
  };
  return Math.max(0,at(1,right)-at(-1,left));
}
