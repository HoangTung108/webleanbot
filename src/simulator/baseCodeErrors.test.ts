import baseCode from '../../docs/baseCode.cpp?raw';
import {describe,it,expect} from 'vitest';
import {generateRouteCode} from './routePlanner';
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';
function execute(body:string){
 const robot=new RobotSimulator(),start={x:400,y:600,heading:0};robot.reset(start);
 const code=generateRouteCode(start,[]).replace('void plannedRoute() {','void plannedRoute() {\n'+body);
 const bridge=new CppSimulatorBridge(robot);expect(bridge.loadCode(code)).toEqual({success:true});robot.start();bridge.startExecution(0);
 for(let t=0;t<12000&&bridge.isExecuting();t+=20)bridge.executeStep(t);
 expect(bridge.isExecuting()).toBe(false);return{robot,logs:bridge.getLogs()};
}
describe('base helpers without a mission-wide success latch',()=>{
 it('removes the flag from both the base source and generated code',()=>{
  expect(baseCode).not.toMatch(/missionOK/i);
  expect(generateRouteCode({x:400,y:600,heading:0},[{kind:'move',x:450,y:600,follow:false}])).not.toMatch(/missionOK/i);
 });
 it('reports an invalid command locally and still executes following motion and gripper commands',()=>{
  const {robot,logs}=execute('Serial.println(move_tank(0,0,5));Serial.println(Forward(2000,50));close_hand(90);');
  expect(logs).toContain('false');expect(logs).toContain('true');expect(logs.join(' ')).toContain('MISSION ERROR');
  expect(robot.getRobotPose().x).toBeCloseTo(449.82,1);expect(robot.getGripper()).toEqual({left:90,right:90});
 });
 it('exits a lost-line operation locally, allowing the following operation to run',()=>{
  const {logs}=execute('Serial.println(followLineDistance(100));Serial.println(Rotate(2000,10));');
  expect(logs).toContain('false');expect(logs).toContain('true');expect(logs.join(' ')).toContain('MISSION ERROR');
 });
});
