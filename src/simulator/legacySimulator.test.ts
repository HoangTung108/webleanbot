import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

function harness() {
  const ids = new Map<string, any>();
  const ctx = new Proxy({}, { get: () => () => {} });
  const element = (id: string): any => {
    if (!ids.has(id)) ids.set(id, {
      style: {}, classList: { contains: () => false, remove() {}, add() {} },
      value: 0, checked: false, textContent: '', children: [],
      appendChild(child: any) { this.children.push(child); }, removeChild() { this.children.shift(); },
      addEventListener() {}, getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 800, height: 650, left: 0, top: 0 }),
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 650 }) },
    });
    return ids.get(id);
  };
  let ready = () => {}, now = 0, nextId = 0;
  const frames = new Map<number, () => void>();
  const context: any = {
    console, Date, URL, performance: { now: () => now },
    document: { getElementById: element, createElement: () => element(`log-${nextId++}`), addEventListener: (event: string, cb: () => void) => { if (event === 'DOMContentLoaded') ready = cb; } },
    Image: class { complete = false; naturalWidth = 0; },
    requestAnimationFrame: (cb: () => void) => { frames.set(++nextId, cb); return nextId; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    addEventListener() {},
  };
  context.window = context;
  runInNewContext(readFileSync('public/leanbot-ide/cpp-runtime.js', 'utf8') + '\n' + readFileSync('public/leanbot-ide/simulator-ui.js', 'utf8'), context);
  ready();
  return { context, element, frame: () => { now += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb()); } };
}
describe('static IDE simulator', () => {
  it('runs current custom C++ beyond 3 seconds, pauses, finishes and reloads edited code', () => {
    const h = harness();
    let source = 'void setup(){} void loop(){ LbMotion.runLR(2000,2000); LbDelay(4000); LbMotion.stopAndWait(); LbMission.end(); }';
    let reads = 0;
    h.context.getLeanbotSimulatorCode = () => { reads++; return source; };
    const sim = h.context.leanbotSimulator;
    sim.robotX = 400; sim.robotY = 600; sim.robotHeading = 0;
    sim.start();
    for (let i = 0; i < 200; i++) h.frame();
    expect(sim.isRunning).toBe(true);
    expect(sim.robotX).toBeCloseTo(608);
    sim.togglePause(); for (let i = 0; i < 50; i++) h.frame();
    expect(sim.robotX).toBeCloseTo(608);
    sim.togglePause(); for (let i = 0; i < 60; i++) h.frame();
    expect(sim.isRunning).toBe(false);
    expect(sim.robotX).toBeCloseTo(660);
    source = 'void loop(){ LbMotion.runLR(-2000,-2000); LbDelay(1000); LbMission.end(); }';
    sim.start(); for (let i = 0; i < 65; i++) h.frame();
    expect(sim.robotX).toBeCloseTo(595);
    expect(reads).toBe(2);
  });
  it('reports missing editor source instead of starting a demonstration', () => {
    const h = harness(); h.context.leanbotSimulator.start();
    expect(h.context.leanbotSimulator.isRunning).toBe(false);
    expect(h.element('simLogs').children.some((n: any) => n.textContent.includes('Chưa có code'))).toBe(true);
  });
});
