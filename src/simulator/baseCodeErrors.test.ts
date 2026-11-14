import baseCode from '../../docs/baseCode.cpp?raw';
import {describe,it,expect} from 'vitest';
import {generateRouteCode} from './routePlanner';
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';
function execute(body:string){
 const robot=new RobotSimulator(),start={x:400,y:600,heading:0};robot.setBoard({name:'Test',width:5000,height:5000,lines:[],walls:[],obstacles:[],initialPose:start});
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
 it('uses void action functions in the base source',()=>{
  for(const name of ['turn_two_wheels','move_tank','runFollowLine','followLineUntilJunction','centerDetectedJunction','followLineMultipleJunctions','goToJunction','followLineDistance']){
   expect(baseCode).toMatch(new RegExp('void '+name+'\\('));expect(baseCode).not.toMatch(new RegExp('bool '+name+'\\('));
  }
 });
 it('reports an invalid command locally and still executes following motion and gripper commands',()=>{
  const {robot,logs}=execute('move_tank(0,0,5);Serial.println("after-invalid");move_tank(2000,2000,5);close_hand(90);');
  expect(logs).toContain('after-invalid');expect(logs.join(' ')).toContain('MISSION ERROR');
  expect(robot.getRobotPose().x).toBeCloseTo(450,1);expect(robot.getGripper()).toEqual({left:90,right:90});
 });
 it('exits a lost-line operation locally, allowing the following operation to run',()=>{
  const {logs}=execute('followLineDistance(100);Serial.println("line-returned");turn_two_wheels(2000,10);Serial.println("turn-returned");');
  expect(logs).toContain('line-returned');expect(logs).toContain('turn-returned');expect(logs.join(' ')).toContain('MISSION ERROR');
 });
});
