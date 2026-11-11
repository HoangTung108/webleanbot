import { expect, it } from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import { CppRuntime } from './cppRuntime'
import oldMove from './fixtures/move-tank-before-pid.cpp?raw'

const helpers = base.slice(0, base.search(/void\s+(?:FullMission|setup)\s*\(/))
const moveStart = helpers.indexOf('void move_tank(')
const moveEnd = helpers.indexOf('\n// ', moveStart)
const previous = (helpers.slice(0, moveStart) + oldMove + helpers.slice(moveEnd))
  .replace(/MOVE_ACCEL_INCREMENT = \d+/, 'MOVE_ACCEL_INCREMENT = 100')
  .replace(/LBMB_FLL_ACCEL = [\d.]+f/, 'LBMB_FLL_ACCEL = 3600.0f')
  .replace(/LBMB_FLL_JERK = [\d.]+f/, 'LBMB_FLL_JERK = 30000.0f')
  .replace(/LBMB_WHEEL_ACCEL = \d+/, 'LBMB_WHEEL_ACCEL = 9000')

function run(source: string, command: string) {
  let distance = 0, peak = 0
  const logs: string[] = []
  const runtime = new CppRuntime(`${source}
    void setup() { set_line(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R); }
    void loop() { ${command} LbMission.end(); }
  `, {
    motors(l, r) { peak = Math.max(peak, Math.abs(l), Math.abs(r)) },
    advance(dt) { distance += (runtime.left + runtime.right) / 2 * dt },
    rawLine: () => [0, 4095, 4095, 0],
    log: message => logs.push(message),
  })
  runtime.start()
  for (let i = 0; i < 10000 && runtime.running; i++) runtime.tick(10)
  expect(runtime.running).toBe(false)
  expect(logs).toEqual([])
  expect([runtime.left, runtime.right]).toEqual([0, 0])
  expect(peak).toBeLessThanOrEqual(2000)
  return { time: runtime.time, distance }
}

it.each([10, 32.5, 100])('reaches %s cm sooner within the same distance tolerance', cm => {
  for (const command of [`move_tank(2000,2000,${cm});`, `move_tank(-2000,-2000,${cm});`, `followLineCm(${cm});`]) {
    const old = run(previous, command), current = run(helpers, command)
    expect(current.time, command).toBeLessThan(old.time)
    expect(Math.abs(Math.abs(current.distance) - cm * 10), command).toBeLessThan(2)
    expect(Math.abs(current.distance - old.distance), command).toBeLessThan(2)
    console.info(`${command} ${old.time} -> ${current.time} ms`)
  }
}, 20000)
