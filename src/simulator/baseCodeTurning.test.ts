import {describe,it,expect,vi} from 'vitest';
import {generateRouteCode} from './routePlanner';
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';
function run(fractional=false,multiplier=1){
 const robot=new RobotSimulator();robot.setBoard({name:'Test',width:5000,height:5000,walls:[],lines:[],obstacles:[],initialPose:{x:2500,y:2500,heading:0}});
 const physics=vi.spyOn(robot,'advanceSimulatedTime');
 const bridge=new CppSimulatorBridge(robot);let code=generateRouteCode(robot.getRobotPose(),[{kind:'turn',angle:90},{kind:'turn',angle:-90}]);
 code=code.replace('turn_two_wheels(2000, 90.00);','turn_two_wheels(2000, 90.00); Serial.println(LbMotion.getRotationDeg());');
 if(fractional)code=code.replaceAll('robot_delay(MOTION_FEEDBACK_MS)','LbDelay(0.1f)');
 expect(bridge.loadCode(code).success).toBe(true);robot.setSpeedMultiplier(multiplier);robot.start();bridge.startExecution(0);
 for(let wall=0;wall<30000&&bridge.isExecuting();wall+=16.666667)bridge.executeStep(wall);
 expect(bridge.isExecuting()).toBe(false);expect(bridge.getLogs().join(' ')).not.toContain('MISSION ERROR');
 expect(Number(bridge.getLogs()[0])).toBeGreaterThanOrEqual(93);expect(Number(bridge.getLogs()[0])).toBeLessThan(93.1);
 return {pose:robot.getRobotPose(),time:robot.getSimulationState().currentTime,physicsCalls:physics.mock.calls.length};
}
describe('baseCode feedback controller',()=>{
 it('uses 1 ms feedback for both movement and turning',()=>{
  const source=generateRouteCode({x:500,y:500,heading:0},[]);
  expect(source).toContain('MOTION_FEEDBACK_MS = 1UL');expect(source).not.toMatch(/LbDelay\(0\.1f?\)/);
 });
 it('preserves the fractional controller final angle and duration',()=>{
  const old=run(true),current=run();
  expect(current.physicsCalls).toBeLessThan(old.physicsCalls/5);
  expect(Math.abs(old.pose.heading-current.pose.heading)).toBeLessThan(.05);
  expect(Math.abs(old.time-current.time)).toBeLessThan(15);
  expect(current.pose.x).toBeCloseTo(old.pose.x,6);expect(current.pose.y).toBeCloseTo(old.pose.y,6);
 });
 it('produces identical results at 1x and 10x',()=>{expect(run(false,10)).toEqual(run());});
});
