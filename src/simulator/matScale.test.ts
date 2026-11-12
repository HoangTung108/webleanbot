import {afterEach,expect,it,vi} from 'vitest';
import {MM_PER_FOOT,SYNAPSE_MAT_SIDE_MM} from './boardUnits';
import {SYNAPSE_CITY} from './boardConfigs';
import svg from '../../public/simulator/synapse-city.svg?raw';
import {RobotSimulator} from './robotSimulator';
import {SimulatorRenderer} from './renderer';
import {formatRouteLength,measureRouteSegments} from './routeMeasurements';
import {generateRouteCommands} from './routePlanner';
afterEach(()=>vi.unstubAllGlobals());
it('uses exactly 4 international feet for the mat and the SVG outer frame',()=>{
 expect(MM_PER_FOOT).toBe(304.8);expect(SYNAPSE_MAT_SIDE_MM).toBe(1219.2);
 expect([SYNAPSE_CITY.width,SYNAPSE_CITY.height]).toEqual([1219.2,1219.2]);
 const root=svg.match(/<svg\b[^>]+>/)![0];expect(root).toContain('viewBox="0 0 1219.2 1219.2"');
 expect(root).toContain('width="1219.2"');expect(root).toContain('height="1219.2"');
 expect(formatRouteLength(SYNAPSE_MAT_SIDE_MM)).toBe('121,92 cm');
});
it('aligns every displayed SVG road with its physical IR geometry',()=>{
 const transform=svg.match(/id="measured-layout" transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/)!;
 const [cx,cy,scale]=transform.slice(1).map(Number);
 const roads=[...svg.matchAll(/<polyline\b[^>]+>/g)].map(m=>m[0]).filter(tag=>tag.includes('stroke="black"'));
 expect(roads).toHaveLength(SYNAPSE_CITY.lines.length);
 roads.forEach((tag,i)=>{
  const points=tag.match(/points="([^"]+)"/)![1].trim().split(/\s+/).map(pair=>pair.split(',').map(Number));
  expect(points).toHaveLength(SYNAPSE_CITY.lines[i].points.length);
  points.forEach(([x,y],j)=>{
   expect(cx+(x-cx)*scale).toBeCloseTo(SYNAPSE_CITY.lines[i].points[j].x,4);
   expect(cy+(y-cy)*scale).toBeCloseTo(SYNAPSE_CITY.lines[i].points[j].y,4);
  });
 });
});
it.each([1,2,3])('measures a whole side at DPR %s across CSS sizes, zoom and pan',dpr=>{
 vi.stubGlobal('window',{devicePixelRatio:dpr});
 for(const [vw,vh,cw,ch,left,top] of [[800,600,400,300,30,70],[400,700,400,700,210,130]]){
  const ctx=new Proxy({},{get:()=>()=>{}});
  const canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:cw,height:ch,left,top})} as unknown as HTMLCanvasElement;
  const board={...SYNAPSE_CITY,backgroundImage:undefined};const robot=new RobotSimulator();robot.setBoard(board);
  const r=new SimulatorRenderer(canvas,robot,board);r.resizeCanvas(vw,vh);
  const client=(x:number,y:number)=>({x:left+x*cw/vw,y:top+y*ch/vh});
  const point=(x:number,y:number)=>{const c=client(x,y);return r.clientToBoard(c.x,c.y);};
  const anchor=point(90,75);r.zoom(2,90,75);
  expect(point(90,75).x).toBeCloseTo(anchor.x,8);expect(point(90,75).y).toBeCloseTo(anchor.y,8);
  const center=point(vw/2,vh/2);r.zoom(.8);
  expect(point(vw/2,vh/2).x).toBeCloseTo(center.x,8);expect(point(vw/2,vh/2).y).toBeCloseTo(center.y,8);
  for(const pan of [0,25]){
   if(pan)r.pan(pan,-10);
   const from=point(50,50),to=point(50+SYNAPSE_MAT_SIDE_MM*r.getScale(),50);
   expect(measureRouteSegments([from,to])[0].lengthMm).toBeCloseTo(1219.2,8);
   expect(formatRouteLength(Math.hypot(to.x-from.x,to.y-from.y))).toBe('121,92 cm');
  }
 }
});
it('emits precise cm for both straight and line-following routes',()=>{
 for(const follow of [false,true]){
  const code=generateRouteCommands({x:0,y:0,heading:0},[{kind:'move',x:SYNAPSE_MAT_SIDE_MM,y:0,follow}]);
  expect(code).toBe(follow?'followLineCm(121.920);':'move_tank(2000, 2000, 121.920);');
 }
});
