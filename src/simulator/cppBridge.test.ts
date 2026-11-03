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
  it.each([[2000, -2000, 90], [-2000, 2000, -90]])('turns and reports matching encoder direction for runLR(%s, %s)', (left, right, angle) => {
    const robot = new RobotSimulator(), bridge = new CppSimulatorBridge(robot);
    robot.reset({ x: 500, y: 500, heading: 0 });
    expect(bridge.loadCode(`void loop(){ LbMotion.runLR(${left},${right}); LbMotion.waitRotationDeg(90); LbMotion.stopAndWait(); Serial.println(LbMotion.getRotationDeg()); LbMission.end(); }`).success).toBe(true);
    robot.start(); bridge.startExecution();
    for (let time = 0; time <= 2000; time += 10) bridge.executeStep(time);
    expect(bridge.isExecuting()).toBe(false);
    expect(robot.getRobotPose().heading).toBeCloseTo(angle, 6);
    expect(Number(bridge.getLogs()[0])).toBeCloseTo(angle, 6);
    expect(robot.getRobotPose().x).toBeCloseTo(500);
    expect(robot.getRobotPose().y).toBeCloseTo(500);
  });

});
