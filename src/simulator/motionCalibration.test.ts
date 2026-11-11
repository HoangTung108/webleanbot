import {describe,it,expect} from 'vitest';
import {CppRuntime} from './cppRuntime';
import {MOTION_CALIBRATION} from './motionCalibration';
import {generateRouteCode} from './routePlanner';
import {CppSimulatorBridge} from './cppBridge';
import {RobotSimulator} from './robotSimulator';
function run(code:string,scale?:number){
 let physical=0;const r=new CppRuntime(code,{motors(){},advance:dt=>physical+=(r.left+r.right)/2*dt},scale);
 r.start();for(let i=0;i<10000&&r.running;i++)r.tick(5);
 expect(r.running).toBe(false);return{physical,r};
}
describe('physical distance and encoder feedback calibration',()=>{
 it('keeps the verified timed 325 mm / 5 seconds measurement unchanged',()=>{
  const {physical,r}=run('void loop(){LbMotion.runLR(2000,2000);LbDelay(5000);LbMission.end();}');
  expect(physical).toBeCloseTo(325,6);expect(r.time).toBe(5000);expect(r.distance).toBeCloseTo(325/MOTION_CALIBRATION.physicalMmPerEncoderMm,6);
 });
 it.each([2000,-2000])('calibrates feedback distance for command %s without changing wheel speeds',v=>{
  const {physical,r}=run(`void loop(){LbMotion.runLR(${v},${v});LbMotion.waitDistanceMm(100);LbMission.end();}`);
  expect(physical).toBeCloseTo(Math.sign(v)*100*MOTION_CALIBRATION.physicalMmPerEncoderMm,6);expect(Math.abs(r.distance)).toBeCloseTo(100,6);
 });
 it('leaves turn angle feedback unchanged',()=>{
  const {r}=run('void loop(){LbMotion.runLR(2000,-2000);LbMotion.waitRotationDeg(90);LbMission.end();}');
  expect(r.rotation).toBeCloseTo(90,6);expect(r.distance).toBe(0);
 });
 it('can reproduce the nominal encoder profile for comparison',()=>{
  const {physical}=run('void loop(){LbMotion.runLR(2000,2000);LbMotion.waitDistanceMm(100);LbMission.end();}',1);
  expect(physical).toBeCloseTo(100,6);
 });
 it('matches the latest base scale without applying compensation twice',()=>{
  const robot=new RobotSimulator(),start={x:400,y:600,heading:0};robot.reset(start);
  const b=new CppSimulatorBridge(robot);b.loadCode(generateRouteCode(start,[{kind:'move',x:732.74,y:600,follow:false}]));robot.start();b.startExecution(0);
  for(let t=0;t<20000&&b.isExecuting();t+=20)b.executeStep(t);
  expect(b.isExecuting()).toBe(false);expect(robot.getRobotPose().x-start.x).toBeCloseTo(332.74,0);
 });
 it('rejects invalid calibration values',()=>{
  for(const gain of [0,-1,NaN,Infinity])expect(()=>new CppRuntime('void loop(){}',{motors(){},advance(){}},gain)).toThrow('hiệu chuẩn');
  expect(MOTION_CALIBRATION.physicalMmPerEncoderMm).toBe(320/322);
 });
});
