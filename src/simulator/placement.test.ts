import { describe, expect, it } from 'vitest';
import { RobotSimulator } from './robotSimulator';
import { SimulatorRenderer } from './renderer';

describe('robot placement', () => {
  it('maps CSS-scaled pointer coordinates, supports dragging and locks placement during a run', () => {
    const handlers = new Map<string, (event: any) => void>();
    const context = new Proxy({}, { get: () => () => {} });
    const canvas = {
      width: 800, height: 600, style: {}, getContext: () => context,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 400, height: 300 }),
      addEventListener: (name: string, fn: (event: any) => void) => handlers.set(name, fn),
      removeEventListener: (name: string) => handlers.delete(name),
    } as unknown as HTMLCanvasElement;
    const robot = new RobotSimulator();
    const board = { name: 'Test', width: 1000, height: 1000, walls: [], obstacles: [], lines: [] };
    robot.setBoard(board);
    const renderer = new SimulatorRenderer(canvas, robot, board);
    const dispose = renderer.enablePlacement();
    // 800 × 600 backing store displayed at 400 × 300 CSS pixels.
    expect(renderer.clientToBoard(210, 170).x).toBeCloseTo(500);
    expect(renderer.clientToBoard(210, 170).y).toBeCloseTo(500);
    handlers.get('pointerdown')!({ button: 0, clientX: 210, clientY: 170, pointerId: 1 });
    expect(robot.getRobotPose().x).toBeCloseTo(500);
    expect(robot.getRobotPose().y).toBeCloseTo(500);
    handlers.get('pointermove')!({ clientX: 267, clientY: 170 });
    expect(robot.getRobotPose().x).toBeCloseTo(700);
    handlers.get('pointerup')!({});
    robot.start();
    handlers.get('pointerdown')!({ button: 0, clientX: 210, clientY: 170, pointerId: 1 });
    expect(robot.getRobotPose().x).toBeCloseTo(700);
    dispose(); expect(handlers.size).toBe(0);
  });
  it('clamps the full robot footprint inside the mat and rejects invalid positions', () => {
    const robot = new RobotSimulator();
    robot.setPose({ x: -10, y: 99999, heading: -15 });
    expect(robot.getRobotPose()).toEqual({ x: 75, y: 1144.2, heading: 345 });
    robot.setPose({ x: NaN, y: 100, heading: 0 });
    expect(robot.getRobotPose()).toEqual({ x: 75, y: 1144.2, heading: 345 });
  });
});
