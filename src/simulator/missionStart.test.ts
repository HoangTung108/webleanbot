import {MOTION_CALIBRATION} from './motionCalibration';
import {describe,it,expect} from 'vitest';
import {CppRuntime} from './cppRuntime';
import {CppSimulatorBridge} from './cppBridge';
import {RobotSimulator} from './robotSimulator';
const source='void loop(){LbMission.begin(TB1A+TB1B);LbMotion.runLR(2000,2000);LbDelay(1000);LbMotion.stopAndWait();}';
describe('mission start requires a new start signal',()=>{
 it('does not repeat a gated Arduino loop when Mission.end is omitted',()=>{
  const r=new CppRuntime(source,{motors(){},advance(){}});r.start();r.tick(10000);
  expect(r.running).toBe(false);expect(r.distance).toBeCloseTo(65/MOTION_CALIBRATION.physicalMmPerEncoderMm,6);expect(r.time).toBeCloseTo(1000,6);
 });
 it('requires another Run for a second begin in the same loop',()=>{
  const r=new CppRuntime('void loop(){LbMission.begin();LbMotion.runLR(2000,2000);LbDelay(1000);LbMission.begin();LbDelay(1000);}',{motors(){},advance(){}});
  r.start();r.tick(5000);expect(r.running).toBe(false);expect(r.distance).toBeCloseTo(65/MOTION_CALIBRATION.physicalMmPerEncoderMm,6);
 });
 it('allows an explicit restart after a gated mission completes',()=>{
  const r=new CppRuntime(source,{motors(){},advance(){}});
  for(let i=0;i<2;i++){r.start();r.tick(5000);expect(r.running).toBe(false);expect(r.distance).toBeCloseTo(65/MOTION_CALIBRATION.physicalMmPerEncoderMm,6);}
 });
 it('keeps continuous Arduino control loops running when no mission gate is used',()=>{
  const r=new CppRuntime('void loop(){LbMotion.runLR(2000,2000);LbDelay(1);}',{motors(){},advance(){}});
  r.start();r.tick(1000);expect(r.running).toBe(true);expect(r.distance).toBeCloseTo(65/MOTION_CALIBRATION.physicalMmPerEncoderMm,6);r.stop();
 });
 it('keeps a continuous loop running when the single gate is only in setup',()=>{
  const r=new CppRuntime('void setup(){LbMission.begin();}void loop(){LbMotion.runLR(2000,2000);LbDelay(1);}',{motors(){},advance(){}});
  r.start();r.tick(1000);expect(r.running).toBe(true);expect(r.distance).toBeCloseTo(65/MOTION_CALIBRATION.physicalMmPerEncoderMm,6);r.stop();
 });
 it.each([1,10])('runs one gated route at %sx, without multiplying its distance',multiplier=>{
  const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot);robot.reset({x:400,y:600,heading:0});robot.setSpeedMultiplier(multiplier);
  expect(bridge.loadCode(source).success).toBe(true);robot.start();bridge.startExecution(0);
  for(let wall=0;wall<=10000&&bridge.isExecuting();wall+=20)bridge.executeStep(wall);
  expect(bridge.isExecuting()).toBe(false);expect(bridge.getCompletionReason()).toBe('program');expect(robot.getRobotPose().x).toBeCloseTo(465,6);
 });
 it('preserves the official clock after the gated program completes once',()=>{
  const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot);robot.reset({x:400,y:600,heading:0});
  bridge.loadCode(source);robot.start();bridge.startExecution(0,{keepRoundClock:true});bridge.executeStep(2000);
  expect(bridge.isExecuting()).toBe(true);expect(bridge.isProgramRunning()).toBe(false);expect(robot.getRobotPose().x).toBeCloseTo(465,6);bridge.stopExecution();
 });
});
