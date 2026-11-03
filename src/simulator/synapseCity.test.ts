import { describe, expect, it, vi } from 'vitest';
import { SYNAPSE_CITY } from './boardConfigs';
import { RobotSimulator } from './robotSimulator';

describe('Synapse City mat', () => {
  it('uses a four-foot square and keeps all track geometry on the mat', () => {
    expect(SYNAPSE_CITY.width).toBe(4 * 304.8);
    expect(SYNAPSE_CITY.height).toBe(4 * 304.8);
    for (const line of SYNAPSE_CITY.lines) {
      for (const point of line.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(SYNAPSE_CITY.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(SYNAPSE_CITY.height);
      }
    }
  });

  it('travels exactly one city side when both wheels advance 350 mm', () => {
    const clock = vi.spyOn(Date, 'now');
    try {
      clock.mockReturnValue(1000);
      const robot = new RobotSimulator();
      robot.setBoard(SYNAPSE_CITY);
      const leftRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-1')!;
      const rightRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-2')!;
      const topRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-3')!;
      const bottomRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-4')!;
      expect(rightRoad.points[0].x - leftRoad.points[0].x).toBeCloseTo(350, 4);
      expect(bottomRoad.points[0].y - topRoad.points[0].y).toBeCloseTo(350, 4);
      robot.reset({ x: leftRoad.points[0].x, y: topRoad.points[0].y, heading: 0 });
      robot.start();
      robot.setMotorSpeeds(200, 200);
      clock.mockReturnValue(2750); // 200 mm/s × 1.75 s = 350 mm
      robot.update();
      expect(robot.getRobotPose().x).toBeCloseTo(rightRoad.points[0].x, 4);
      expect(robot.getRobotPose().y).toBeCloseTo(topRoad.points[0].y, 4);
    } finally {
      clock.mockRestore();
    }
  });

  it('resets to its start and detects the printed track without treating it as a wall', () => {
    const simulator = new RobotSimulator();
    simulator.setBoard(SYNAPSE_CITY);
    expect(simulator.getRobotPose()).toEqual(SYNAPSE_CITY.initialPose);
    simulator.start();
    simulator.update();
    expect(simulator.getSensorReadings().irLine.center).toBe(4095);
    expect(SYNAPSE_CITY.walls).toHaveLength(0);
    simulator.reset();
    expect(simulator.getRobotPose()).toEqual(SYNAPSE_CITY.initialPose);
  });
});
