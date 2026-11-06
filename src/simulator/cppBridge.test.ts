import { describe, expect, it } from 'vitest';
import { LEANBOT_GEOMETRY } from './robotGeometry';
import { CppSimulatorBridge } from './cppBridge';
import { RobotSimulator } from './robotSimulator';

const code = 'void setup(){} void loop(){ LbMotion.runLR(2000,2000); LbMotion.waitDistanceMm(350); LbMotion.stopAndWait(); LbMission.end(); }';
describe('editor code bridge', () => {
  it('preserves the configured pose, pauses without adding elapsed time, and stops at 350 mm', () => {
    const robot = new RobotSimulator();
    robot.reset({ x: 400, y: 500, heading: 90 });
    const bridge = new CppSimulatorBridge(robot);
    expect(bridge.loadCode(code).success).toBe(true);
    robot.start(); bridge.startExecution(); bridge.executeStep(0);
    for (let t = 10; t <= 300; t += 10) bridge.executeStep(t);
    expect(robot.getRobotPose().y).toBeCloseTo(521);
    robot.pause(); bridge.executeStep(10000);
    expect(robot.getRobotPose().y).toBeCloseTo(521);
    robot.resume();
    for (let t = 10010; t <= 14700; t += 10) bridge.executeStep(t);
    expect(robot.getRobotPose().y).toBeCloseTo(850);
    expect(robot.getRobotPose().x).toBeCloseTo(400);
    expect(bridge.isExecuting()).toBe(false);
  });
  it.each([1, 2, 5, 10])('keeps C++ delays, feedback encoders and physics synchronized at %sx', multiplier => {
    const robot = new RobotSimulator(), bridge = new CppSimulatorBridge(robot);
    robot.reset({x:400,y:500,heading:0});
    robot.setSpeedMultiplier(multiplier);
    expect(bridge.loadCode(`void loop(){
      LbMotion.runLR(2000,2000);
      while(LbMotion.getDistanceMm()<350) { LbDelay(1); }
      LbMotion.stopAndWait();
      LbDelay(250);
      LbMotion.runLR(2000,-2000); LbMotion.waitRotationDeg(90);
      LbMotion.stopAndWait();
      Serial.println(LbMotion.getDistanceMm()); Serial.println(LbMotion.getRotationDeg()); Serial.println(millis());
      LbMission.end();
    }`).success).toBe(true);
    robot.start();bridge.startExecution();
    let wall = 0;
    for(;wall<=10000 && bridge.isExecuting();wall+=16)bridge.executeStep(wall);
    expect(bridge.isExecuting()).toBe(false);
    expect(robot.getRobotPose().x).toBeCloseTo(750,0);
    expect(robot.getRobotPose().y).toBeCloseTo(500,5);
    expect(robot.getRobotPose().heading).toBeCloseTo(90,5);
    const [distance,rotation,time]=bridge.getLogs().map(Number);
    expect(distance).toBeCloseTo(350,0);expect(rotation).toBeCloseTo(90,5);
    // Arduino millis() reports whole milliseconds.
    expect(Math.floor(robot.getSimulationState().currentTime)).toBe(time);
    expect(wall).toBeLessThan(6500/multiplier+50);
  });

  it('changes fast-forward mid-program without changing the target distance', () => {
    const robot = new RobotSimulator(), bridge = new CppSimulatorBridge(robot);
    robot.reset({x:400,y:500,heading:0});bridge.loadCode(code);robot.start();bridge.startExecution();
    bridge.executeStep(0);bridge.executeStep(1000);
    expect(robot.getRobotPose().x).toBeCloseTo(470,5);
    robot.setSpeedMultiplier(10);
    bridge.executeStep(1400);
    expect(robot.getRobotPose().x).toBeCloseTo(750,5);
    expect(robot.getSimulationState().currentTime).toBeCloseTo(5000,5);
    expect(bridge.isExecuting()).toBe(false);
  });

  it.each([1,10])('enforces the 120-second simulation limit at %sx', multiplier => {
    const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot);
    robot.setSpeedMultiplier(multiplier);
    expect(bridge.loadCode('void loop(){ LbDelay(1000000); }').success).toBe(true);
    robot.start();bridge.startExecution();
    for(let wall=0;wall<=125000&&bridge.isExecuting();wall+=1000)bridge.executeStep(wall);
    expect(bridge.isExecuting()).toBe(false);
    expect(bridge.getCompletionReason()).toBe('time-limit');
    expect(robot.getSimulationState().currentTime).toBeCloseTo(120000,5);
    expect(robot.getSimulationState().isRunning).toBe(false);
  });

  it('uses freshly loaded code on the next run and reports unsupported code', () => {
    const robot = new RobotSimulator(), bridge = new CppSimulatorBridge(robot);
    expect(bridge.loadCode(code).success).toBe(true);
    expect(bridge.loadCode('void loop(){ LbMotion.runLR(-400,-400); LbDelay(100); LbMission.end(); }').success).toBe(true);
    robot.reset({ x: 400, y: 500, heading: 0 }); robot.start(); bridge.startExecution();
    bridge.executeStep(0); bridge.executeStep(100);
    expect(robot.getRobotPose().x).toBeCloseTo(398.6);
    expect(bridge.loadCode('void loop(){ unknown(); }')).toMatchObject({ success: false });
  });
  it.each([[2000, -2000, 90], [-2000, 2000, -90]])('turns and reports matching encoder direction for runLR(%s, %s)', (left, right, angle) => {
    const robot = new RobotSimulator(), bridge = new CppSimulatorBridge(robot);
    robot.reset({ x: 500, y: 500, heading: 0 });
    expect(bridge.loadCode(`void loop(){ LbMotion.runLR(${left},${right}); LbMotion.waitRotationDeg(90); LbMotion.stopAndWait(); Serial.println(LbMotion.getRotationDeg()); LbMission.end(); }`).success).toBe(true);
    robot.start(); bridge.startExecution();
    for (let time = 0; time <= 2000; time += 10) bridge.executeStep(time);
    expect(bridge.isExecuting()).toBe(false);
    expect(robot.getRobotPose().heading).toBeCloseTo((angle + 360) % 360, 6);
    expect(Number(bridge.getLogs()[0])).toBeCloseTo(angle, 6);
    expect(robot.getRobotPose().x).toBeCloseTo(500);
    expect(robot.getRobotPose().y).toBeCloseTo(500);
  });

  it('picks up, carries and releases an actual mission block from C++ commands', () => {
    const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot),site=robot.mission.slots('pollution')[0];
    const block=robot.mission.place('pollution','red',site.x,site.y);
    robot.reset({x:site.x-LEANBOT_GEOMETRY.graspOffset,y:site.y,heading:0});
    expect(bridge.loadCode('void loop(){ LbGripper.close(); LbMotion.runLR(2000,2000); LbMotion.waitDistanceMm(35); LbMotion.stopAndWait(); LbGripper.open(); LbDelay(500); LbMission.end(); }').success).toBe(true);
    robot.start();bridge.startExecution();
    for(let time=0;time<=1500;time+=10)bridge.executeStep(time);
    const carried=robot.mission.blocks.find(b=>b.id===block.id)!;
    expect(carried.x).toBeCloseTo(site.x+35,3);expect(carried.y).toBeCloseTo(site.y,3);
    expect(carried.held).toBe(false);expect(carried.state).toBe('standing');expect(bridge.isExecuting()).toBe(false);
    robot.reset();expect(robot.mission.blocks[0].x).toBe(site.x);
  });

});
