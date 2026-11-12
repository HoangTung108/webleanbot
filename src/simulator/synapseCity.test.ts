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

  it('scores the full green CRL interior up to the inside edge of its black roads',()=>{
    const area=SYNAPSE_CITY.analysisArea!,road=SYNAPSE_CITY.lines.find(l=>l.id==='synapse-2')!;
    expect(area.x-area.width/2).toBeCloseTo(road.points[0].x+road.width/2,5);
    expect(area.y-area.height/2).toBeCloseTo(SYNAPSE_CITY.lines.find(l=>l.id==='synapse-4')!.points[0].y+road.width/2,5);
  });

  it('travels exactly one city side when both wheels advance 325 mm', () => {
    const clock = vi.spyOn(Date, 'now');
    try {
      clock.mockReturnValue(1000);
      const robot = new RobotSimulator();
      robot.setBoard(SYNAPSE_CITY);
      const leftRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-1')!;
      const rightRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-2')!;
      const topRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-3')!;
      const bottomRoad = SYNAPSE_CITY.lines.find(line => line.id === 'synapse-4')!;
      expect(rightRoad.points[0].x - leftRoad.points[0].x).toBeCloseTo(325, 4);
      expect(bottomRoad.points[0].y - topRoad.points[0].y).toBeCloseTo(325, 4);
      robot.reset({ x: leftRoad.points[0].x, y: topRoad.points[0].y, heading: 0 });
      robot.start();
      robot.setMotorSpeeds(65, 65);
      clock.mockReturnValue(6000); // 65 mm/s × 5 s = 325 mm
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
    simulator.reset({ x: SYNAPSE_CITY.lines.find(l=>l.id==='synapse-1')!.points[0].x-50, y: 609.6, heading: 0 });
    simulator.start();
    simulator.update();
    expect(simulator.getSensorReadings().irLine.center).toBe(4095);
    expect(SYNAPSE_CITY.walls).toHaveLength(0);
    simulator.reset();
    expect(simulator.getRobotPose()).toEqual(SYNAPSE_CITY.initialPose);
  });
});

it('uses AIROC proportions consistently for the measured 325 mm pitch',()=>{
 const board=SYNAPSE_CITY,ref=board.metadata!.randomizerReference;
 expect(ref.scaleMmPerDrawingUnit).toBeCloseTo(.975,9);
 expect(ref.frameInsetMm).toBeCloseTo(24.6,8);
 expect(board.lines[0].width).toBeCloseTo(16.25,8);
 const a=board.cityZones!.find(z=>z.id==='A')!;
 expect(a.center.x-a.sites[0].x).toBeCloseTo(54.1666667,5);
 expect(a.sites.map(s=>s.rotation)).toEqual([45,135,135,45]);
 expect(board.storageSites!.find(s=>s.id==='S1')!.y).toBeCloseTo(1155.6,5);
 expect(board.storageSites!.find(s=>s.id==='S2')!.x).toBeCloseTo(1155.6,5);
});
