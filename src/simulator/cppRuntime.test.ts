import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEANBOT_GEOMETRY } from './robotGeometry';
import { CppRuntime } from './cppRuntime';

const custom = readFileSync(new URL('./fixtures/custom-mission.ino', import.meta.url), 'utf8');
function run(code: string, frame = 16) {
  const motors: number[][] = [], hands: number[][] = [];
  let path = 0, angle = 0;
  const runtime = new CppRuntime(code, {
    motors: (l, r) => motors.push([l, r]),
    advance: dt => { path += (runtime.left + runtime.right) / 2 * dt; angle += (runtime.left - runtime.right) / LEANBOT_GEOMETRY.wheelBase * 180 / Math.PI * dt; },
    gripper: (l, r) => hands.push([l, r]),
  });
  runtime.start();
  for (let i = 0; i < 10000 && runtime.running; i++) runtime.tick(frame);
  expect(runtime.running).toBe(false);
  return { runtime, motors, hands, path, angle };
}

describe('custom C++ execution', () => {
  it('executes the supplied mission, ramps, encoder waits, switches, reverse and gripper loops', () => {
    const { runtime, motors, hands, path, angle } = run(custom);
    expect(path).toBeCloseTo(200 + 580 - 120 + 300, 0);
    expect(angle).toBeCloseTo((22 + 133 - 32) * 1.05, 0);
    expect(runtime.time).toBeGreaterThan(3000);
    expect(hands).toHaveLength(30);
    expect(hands.slice(0, 10)).toEqual(Array(10).fill([90, 90]));
    expect(hands.slice(10, 20)).toEqual(Array(10).fill([0, 0]));
    expect(motors.some(([l, r]) => l < 0 && r < 0)).toBe(true);
    expect(motors.at(-1)).toEqual([0, 0]);
  });
  it('uses the correct duration argument for moveTo and moveToLR',()=>{
    const result=run('void loop(){ LbGripper.moveTo(90,100); LbGripper.moveToLR(0,45,200); LbMission.end(); }');
    expect(result.hands).toEqual([[90,90],[0,45]]);
    expect(result.runtime.time).toBe(300);
  });
  it('matches measured 32.5 cm in 5 seconds at command 2000', () => {
    const runtime = new CppRuntime('void loop(){ LbMotion.runLR(2000,2000); LbMotion.waitDistanceMm(325); LbMission.end(); }', { motors() {}, advance() {} });
    runtime.start(); runtime.tick(0); runtime.tick(4900);
    expect(runtime.running).toBe(true);
    expect(runtime.distance).toBeCloseTo(318.5, 6);
    runtime.tick(100);
    expect(runtime.distance).toBeCloseTo(325, 6);
    expect(runtime.time).toBeCloseTo(5000, 6);
    expect(runtime.running).toBe(false);
  });

  it('travels exactly 350 mm with waitDistanceMm and respects same-line command order', () => {
    const result = run('void setup() {} void loop() { LbMotion.runLR(2000,2000); LbMotion.waitDistanceMm(350); LbMotion.stopAndWait(); LbMission.end(); }');
    expect(result.path).toBeCloseTo(350, 6);
  });
  it('runs single-wheel helpers and string comparisons', () => {
    const setupOnly = custom.replace(/void loop\(\)[\s\S]*$/, 'void loop() { turn_one_wheel(2000, 90, "L"); turn_one_wheel(2000, 90, "R"); LbMission.end(); }');
    const result = run(setupOnly);
    expect(result.motors.some(([l, r]) => l !== 0 && r === 0)).toBe(true);
    expect(result.motors.some(([l, r]) => l === 0 && r !== 0)).toBe(true);
    expect(result.angle).toBeCloseTo(0, 0);
  });
  it('rejects unsupported functions and stops runaway loops', () => {
    expect(() => new CppRuntime('void loop(){ mystery(); }', { motors() {}, advance() {} })).toThrow('mystery');
    const runtime = new CppRuntime('void loop(){ while(true) {} }', { motors() {}, advance() {} });
    runtime.start();
    expect(() => runtime.tick(16)).toThrow('Vòng lặp');
    expect(runtime.running).toBe(false);
  });
  it('keeps simulation distances independent of display frame rate', () => {
    const a = run(custom, 8), b = run(custom, 500);
    expect(a.path).toBeCloseTo(b.path, 6);
    expect(a.angle).toBeCloseTo(b.angle, 6);
  });
});


it('supports the square-root braking profile used by generated route turns',()=>{
 const logs:string[]=[];
 const runtime=new CppRuntime('void loop(){Serial.println(sqrtf(9));Serial.println(sqrt(0.25));Serial.println(isfinite(sqrtf(-1)));LbMission.end();}',{motors(){},advance(){},log:message=>logs.push(message)});
 runtime.start();runtime.tick(0);expect(runtime.running).toBe(false);expect(logs).toEqual(['3','0.5','false']);
});
