import {afterEach,expect,it,vi} from 'vitest';
import {measureRouteSegments,formatRouteLength} from './routeMeasurements';
import {routePoses} from './routePlanner';
import {RobotSimulator} from './robotSimulator';
import {SimulatorRenderer} from './renderer';
afterEach(()=>vi.unstubAllGlobals());
it('measures actual move segments in mm without counting turns or gripper events',()=>{
 const points=routePoses({x:0,y:0,heading:0},[
  {kind:'move',x:300,y:400,follow:false},{kind:'turn',angle:90},{kind:'grab'},
  {kind:'move',x:625,y:400,follow:true},{kind:'release'},
 ]);
 const segments=measureRouteSegments(points);
 expect(segments.map(s=>[s.stepIndex,s.lengthMm])).toEqual([[0,500],[3,325]]);
 expect(segments.map(s=>formatRouteLength(s.lengthMm))).toEqual(['50 cm','32,5 cm']);
});
it('keeps canvas measurements independent of viewport scale and pixel density',()=>{
 vi.stubGlobal('window',{devicePixelRatio:3});
 const fillText=vi.fn();const ctx=new Proxy({fillText,measureText:(label:string)=>({width:label.length*8})},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}});
 const canvas={width:800,height:600,getContext:()=>ctx,getBoundingClientRect:()=>({width:800,height:600,left:0,top:0})} as unknown as HTMLCanvasElement;
 const sim=new RobotSimulator();const board={name:'Measurements',width:2000,height:2000,lines:[],walls:[],obstacles:[]};sim.setBoard(board);
 const renderer=new SimulatorRenderer(canvas,sim,board);
 renderer.plannedRoute=[{x:500,y:500,heading:0},{x:825,y:500,heading:0},{x:825,y:500,heading:90}];
 renderer.routeDraft={from:{x:825,y:500},to:{x:1125,y:900}};
 for(const [width,height] of [[800,600],[400,300]]){
  renderer.resizeCanvas(width,height);fillText.mockClear();renderer.render();
  expect(fillText.mock.calls.filter(([text])=>typeof text==='string'&&text.endsWith(' cm')).map(([text])=>text)).toEqual(['32,5 cm','50 cm']);
 }
});
