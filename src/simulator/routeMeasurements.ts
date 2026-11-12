export type RoutePoint = { x:number; y:number };

/** Route coordinates are physical millimetres, independent of canvas zoom/DPR. */
export function measureRouteSegments(points:readonly RoutePoint[]) {
  return points.slice(1).flatMap((to,index)=>{
    const from=points[index],lengthMm=Math.hypot(to.x-from.x,to.y-from.y);
    return lengthMm>0.001&&Number.isFinite(lengthMm)?[{from,to,stepIndex:index,lengthMm}]:[];
  });
}
const cmFormat=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3});
export function formatRouteLength(lengthMm:number):string {
  return lengthMm>0&&lengthMm<0.01?'<0,001 cm':`${cmFormat.format(lengthMm/10)} cm`;
}
