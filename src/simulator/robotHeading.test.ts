import { describe, expect, it, vi } from 'vitest';
import { RobotSimulator } from './robotSimulator';

describe('starting robot direction', () => {
  it('normalizes angles and preserves position', () => {
    const robot = new RobotSimulator();
    const before = robot.getRobotPose();
    robot.setHeading(-15);
    expect(robot.getRobotPose()).toEqual({ ...before, heading: 345 });
    robot.setHeading(360);
    expect(robot.getRobotPose().heading).toBe(0);
    robot.setHeading(NaN);
    expect(robot.getRobotPose().heading).toBe(0);
  });

  it('moves in the selected direction and prevents rotation during a run or pause', () => {
    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(1000);
      const robot = new RobotSimulator();
      robot.reset({ x: 500, y: 500, heading: 0 });
      robot.setHeading(90);
      robot.start();
      robot.setHeading(180);
      robot.setMotorSpeeds(100, 100);
      now.mockReturnValue(1100);
      robot.update();
      expect(robot.getRobotPose().heading).toBe(90);
      expect(robot.getRobotPose().x).toBeCloseTo(500);
      expect(robot.getRobotPose().y).toBeCloseTo(510);
      robot.pause();
      robot.setHeading(270);
      expect(robot.getRobotPose().heading).toBe(90);
      robot.stop();
      robot.setHeading(270);
      expect(robot.getRobotPose().heading).toBe(270);
    } finally {
      now.mockRestore();
    }
  });
});
