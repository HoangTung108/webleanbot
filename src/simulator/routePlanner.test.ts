import { describe, expect, it } from 'vitest';
import { generateRouteCode, normalizeTurn, routePoses } from './routePlanner';
import { CppSimulatorBridge } from './cppBridge';
import { RobotSimulator } from './robotSimulator';
import { SYNAPSE_CITY } from './boardConfigs';

describe('route planner', () => {
  it('converts mm to cm and preserves rotations and gripper order', () => {
    const code = generateRouteCode({ x: 400, y: 400, heading: 270 }, [
      { kind: 'move', x: 500, y: 400, follow: false }, { kind: 'grab' },
      { kind: 'turn', angle: -90 }, { kind: 'release' },
      { kind: 'move', x: 500, y: 300, follow: true },
    ]);
    expect(code).toContain('turn_two_wheels(2000, 90.00)');
    expect(code).toContain('move_tank(2000, 2000, 10.000)');
    expect(code).toContain('followLineDistance(100)');
    const mission = code.slice(code.indexOf('void plannedRoute()'));
    expect(mission.indexOf('close_hand(90)')).toBeLessThan(mission.indexOf('open_hand()'));
    expect(code).not.toContain('void set_wifi');
    expect(normalizeTurn(350)).toBe(-10);
  });
  it('executes generated base helpers in the simulator', () => {
    const sim = new RobotSimulator(); sim.setBoard(SYNAPSE_CITY);
    const start = { x: 600, y: 600, heading: 0 }; sim.reset(start);
    const bridge = new CppSimulatorBridge(sim);
    const code = generateRouteCode(start, [{ kind: 'move', x: 700, y: 600, follow: false }, { kind: 'turn', angle: 90 }, { kind: 'grab' }, { kind: 'release' }]);
    expect(bridge.loadCode(code)).toEqual({ success: true });
    sim.start(); bridge.startExecution(0);
    for (let t = 20; t < 30000 && bridge.isExecuting(); t += 20) bridge.executeStep(t, 100);
    expect(bridge.isExecuting()).toBe(false);
    expect(sim.getRobotPose().x).toBeGreaterThan(690);
    expect(sim.getRobotPose().heading).toBeGreaterThan(85);
    expect(sim.getRobotPose().heading).toBeLessThan(100);
  });
  it('tracks the heading after an explicit turn', () => {
    expect(routePoses({ x: 0, y: 0, heading: 0 }, [{ kind: 'turn', angle: 90 }, { kind: 'grab' }]).at(-1)?.heading).toBe(90);
  });
  it('follows a black line using the four-bit sensor mask', () => {
    const sim = new RobotSimulator(); sim.setBoard(SYNAPSE_CITY);
    const start = { x: 500, y: 447.1, heading: 0 }; sim.reset(start);
    expect(sim.getLineMask()).toBe(0b0110);
    const bridge = new CppSimulatorBridge(sim);
    expect(bridge.loadCode(generateRouteCode(start, [{ kind: 'move', x: 580, y: 447.1, follow: true }])).success).toBe(true);
    sim.start(); bridge.startExecution(0);
    for (let t = 20; t < 15000 && bridge.isExecuting(); t += 20) bridge.executeStep(t, 100);
    expect(bridge.isExecuting()).toBe(false);
    expect(sim.getRobotPose().x).toBeGreaterThan(578);
    expect(sim.getRobotPose().y).toBeCloseTo(447.1, 0);
  });
});
