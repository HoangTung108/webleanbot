import { expect, it } from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import oldMove from './fixtures/move-tank-before-pid.cpp?raw'
import { CppRuntime } from './cppRuntime'
import { MOTION_CALIBRATION } from './motionCalibration'

const helpers = base.slice(0, base.search(/void\s+(?:FullMission|setup)\s*\(/))
const start = helpers.indexOf('void move_tank(')
const previous = helpers.slice(0, start) + oldMove + helpers.slice(helpers.indexOf('\n// ', start))

function run(source: string, body: string, options: { bias?: number; stall?: boolean; quantize?: boolean; frame?: number; kick?: boolean } = {}) {
  let heading = 0, x = 0, y = 0, path = 0, feedbackOffset = 0
  let peak = 0, wrongDirection = false, hand = 0, overlap = false, kicked = false
  const logs: string[] = []
  const history: { time: number; left: number; right: number }[] = []
  const runtime = new CppRuntime(`${source}
    void setup() {}
    void loop() { ${body} LbMission.end(); }
  `, {
    motors(l, r) {
      peak = Math.max(peak, Math.abs(l), Math.abs(r))
      if (l * r < 0) wrongDirection = true
      history.push({ time: runtime.time, left: l, right: r })
    },
    gripper(l) { hand = l; if (runtime.left || runtime.right) overlap = true },
    advance(dt) {
      const l = options.stall ? 0 : runtime.left * (1 + (options.bias ?? 0))
      const r = options.stall ? 0 : runtime.right
      const idealV = (runtime.left + runtime.right) / 2
      const v = (l + r) / 2
      const idealW = (runtime.left - runtime.right) / 100 * 180 / Math.PI
      const w = (l - r) / 100 * 180 / Math.PI
      heading += w * dt
      path += v * dt
      x += v * Math.cos(heading * Math.PI / 180) * dt
      y += v * Math.sin(heading * Math.PI / 180) * dt
      runtime.distance += (v - idealV) * dt / MOTION_CALIBRATION.physicalMmPerEncoderMm
      runtime.rotation += (w - idealW) * dt
      if (options.kick && !kicked && runtime.time >= 500) {
        heading += 15; runtime.rotation += 15; kicked = true
      }
      const offset = options.quantize ? Math.round(heading) - heading : 0
      runtime.rotation += offset - feedbackOffset
      feedbackOffset = offset
    },
    log: value => logs.push(value),
  })
  runtime.start()
  for (let i = 0; i < 20000 && runtime.running; i++) runtime.tick(options.frame ?? 20)
  expect(runtime.running).toBe(false)
  expect([runtime.left, runtime.right]).toEqual([0, 0])
  expect(peak).toBeLessThanOrEqual(65)
  expect(wrongDirection).toBe(false)
  return { heading, x, y, path, logs, time: runtime.time, history, hand, overlap }
}

it.each([1, -1])('reduces heading and lateral error with 8%% wheel mismatch, direction %s', direction => {
  const command = `move_tank(${direction * 2000},${direction * 2000},32.5);`
  const old = run(previous, command, { bias: 0.08 })
  const current = run(helpers, command, { bias: 0.08 })
  console.info({ direction, old: { angle: old.heading, lateral: old.y, time: old.time }, pid: { angle: current.heading, lateral: current.y, time: current.time } })
  expect(current.logs).toEqual([])
  expect(Math.abs(current.heading)).toBeLessThan(Math.abs(old.heading) * 0.6)
  expect(Math.abs(current.y)).toBeLessThan(Math.abs(old.y) * 0.6)
  expect(Math.abs(current.path - direction * 325)).toBeLessThan(0.5)
}, 20000)

it('handles quantized heading feedback and a heading disturbance', () => {
  const result = run(helpers, 'move_tank(2000,2000,32.5);', { bias: 0.05, quantize: true, kick: true })
  expect(result.logs).toEqual([])
  expect(Math.abs(result.path - 325)).toBeLessThan(0.5)
  expect(Math.abs(result.heading)).toBeLessThan(4)
}, 20000)

it('keeps short travel accurate and services the hand during movement', () => {
  const short = run(helpers, 'move_tank(2000,2000,0.1);')
  expect(short.path).toBeGreaterThanOrEqual(1)
  expect(short.path).toBeLessThan(1.2)
  const concurrent = run(helpers, 'close_hand_async(50);move_tank(2000,2000,10);wait_hand();')
  expect(concurrent.logs).toEqual([])
  expect(concurrent.hand).toBe(50)
  expect(concurrent.overlap).toBe(true)
})

it('preserves stall, input validation and zero-distance handling', () => {
  expect(run(helpers, 'move_tank(2000,2000,10);', { stall: true }).logs).toEqual(['MISSION ERROR: 3'])
  for (const command of ['move_tank(0,2000,10);', 'move_tank(2000,-2000,10);', 'move_tank(2000,2000,-1);', 'move_tank(2000,2000,NAN);', 'move_tank(100,100,10);']) {
    expect(run(helpers, command).logs).toEqual(['MISSION ERROR: 1'])
  }
  expect(run(helpers, 'move_tank(2000,2000,0);').path).toBe(0)
})

it('bounds acceleration and deceleration between motor commands', () => {
  const result = run(helpers, 'move_tank(2000,2000,10);')
  const commands = result.history.filter(command => command.left > 0 && command.right > 0)
  let accelerating = false, braking = false
  for (let i = 1; i < commands.length; i++) {
    const dt = (commands[i].time - commands[i - 1].time) / 1000
    const delta = (commands[i].left - commands[i - 1].left) * 2000 / 65
    // The API takes whole steps/s, so allow one step/s of rounding.
    if (delta > 0) { accelerating = true; expect(delta).toBeLessThanOrEqual(22000 * dt + 1.001) }
    if (delta < 0) { braking = true; expect(-delta).toBeLessThanOrEqual(2600 * dt + 1.001) }
  }
  expect(accelerating && braking).toBe(true)
})

it('accepts unequal speeds and clamps oversized commands without reversing wheels', () => {
  for (const command of ['move_tank(1800,1600,10);', 'move_tank(-1800,-1600,10);', 'move_tank(3000,3000,10);']) {
    const result = run(helpers, command)
    expect(result.logs).toEqual([])
    expect(Math.abs(Math.abs(result.path) - 100)).toBeLessThan(0.5)
  }
}, 20000)

it('uses elapsed time consistently across simulator frame sizes', () => {
  const a = run(helpers, 'move_tank(2000,2000,10);', { frame: 1 })
  const b = run(helpers, 'move_tank(2000,2000,10);', { frame: 37 })
  expect(b).toEqual(a)
})
