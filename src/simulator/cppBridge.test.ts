import { describe, expect, it } from 'vitest';
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
  it('uses freshly loaded code on the next run and reports unsupported code', () => {
    const robot = new RobotSimulator(), bridge = new CppSimulatorBridge(robot);
    expect(bridge.loadCode(code).success).toBe(true);
    expect(bridge.loadCode('void loop(){ LbMotion.runLR(-400,-400); LbDelay(100); LbMission.end(); }').success).toBe(true);
    robot.reset({ x: 400, y: 500, heading: 0 }); robot.start(); bridge.startExecution();
    bridge.executeStep(0); bridge.executeStep(100);
    expect(robot.getRobotPose().x).toBeCloseTo(398.6);
    expect(bridge.loadCode('void loop(){ unknown(); }')).toMatchObject({ success: false });
  });
});
