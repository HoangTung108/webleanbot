import {describe,it,expect} from 'vitest';
import {generateRouteCode} from './routePlanner';
import {CppSimulatorBridge} from './cppBridge';
import {RobotSimulator} from './robotSimulator';
function run(angle:number,multiplier=1){
 const sim=new RobotSimulator();sim.setBoard({name:'Test',width:5000,height:5000,lines:[],walls:[],obstacles:[],initialPose:{x:2500,y:2500,heading:0}});
 let code=generateRouteCode(sim.getRobotPose(),[{kind:'turn',angle}]);
 code=code.replace('  plannedRoute();','  Serial.println(millis()); plannedRoute(); Serial.println(millis());');
 const bridge=new CppSimulatorBridge(sim);expect(bridge.loadCode(code)).toEqual({success:true});sim.setSpeedMultiplier(multiplier);sim.start();bridge.startExecution(0);
 for(let t=0;t<20000&&bridge.isExecuting();t+=16)bridge.executeStep(t);
 expect(bridge.isExecuting()).toBe(false);
 const [a,b]=bridge.getLogs().map(Number);return {angle:sim.getRobotPose().heading,time:b-a};
}
describe('drawn route turning speed',()=>{
 it.each([10,22,-22,90,-90,180])('uses the current precision envelope for a %s-degree turn',angle=>{
  const current=run(angle);
  const difference=((current.angle-angle+180)%360+360)%360-180;
  expect(Math.abs(difference)).toBeLessThan(.51);
  expect(current.time).toBeGreaterThan(0);
  expect(current.time).toBeLessThan(5000);
 });
 it('retains the precision slowdown rather than claiming the old sub-second turn',()=>{expect(run(22).time).toBe(1478);});
 it('keeps drawn-route physics identical at 1x and 10x',()=>{expect(run(90,10)).toEqual(run(90));});
});
