import {describe,it,expect} from 'vitest';
import {generateRouteCode,type RouteStep} from './routePlanner';
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';
function run(steps:RouteStep[]){
 const sim=new RobotSimulator(),start={x:1000,y:1000,heading:0};sim.setBoard({name:'Test',width:5000,height:5000,walls:[],obstacles:[],lines:[],initialPose:start});
 const b=new CppSimulatorBridge(sim);expect(b.loadCode(generateRouteCode(start,steps)).success).toBe(true);sim.start();b.startExecution(0);
 for(let t=0;t<120000&&b.isExecuting();t+=20)b.executeStep(t);
 expect(b.isExecuting()).toBe(false);return sim.getRobotPose().x-start.x;
}
describe('distance versus the base controller brake lead',()=>{
 it('preserves the controller intentional 3 mm brake lead for a single move',()=>{
  expect(run([{kind:'move',x:2000,y:1000,follow:false}])).toBeCloseTo(997,1);
 });
 it('exposes per-command brake lead rather than silently rescaling the field',()=>{
  const distance=run(Array.from({length:10},(_,i)=>({kind:'move' as const,x:1100+i*100,y:1000,follow:false})));
  // At 1 ms feedback, the final low-speed step can overshoot a few microns.
  expect(distance).toBeGreaterThanOrEqual(970);expect(distance).toBeLessThan(970.1);
 });
 it('does not lose fractional encoder origins across decimal-length moves',()=>{
  const distance=run(Array.from({length:10},(_,i)=>({kind:'move' as const,x:1000+(i+1)*105.76,y:1000,follow:false})));
  // The only intentional loss is 3 mm of braking lead for each command.
  expect(distance).toBeGreaterThanOrEqual(1027.6);expect(distance).toBeLessThan(1027.8);
 });
});
