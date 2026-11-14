import { expect, it } from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import { CppRuntime } from './cppRuntime'
const helpers = base.slice(0, base.indexOf('void FullMission()'))
const previous = helpers
  .replace(/MOVE_ACCEL = [\d.]+f/, 'MOVE_ACCEL = 18000.0f')
  .replace(/TURN_ACCEL_INCREMENT = \d+/, 'TURN_ACCEL_INCREMENT = 54')
  .replace(/LBMB_FLL_ACCEL = [\d.]+f/, 'LBMB_FLL_ACCEL = 4200.0f')
  .replace(/LBMB_FLL_JERK = [\d.]+f/, 'LBMB_FLL_JERK = 36000.0f')
  .replace(/LBMB_WHEEL_ACCEL = \d+/, 'LBMB_WHEEL_ACCEL = 10000')

function run(source: string, command: string) {
  const logs: string[] = []
  let hand = 0
  const runtime = new CppRuntime(`${source}
    void setup(){set_line(IR_TH_2L,IR_TH_0L,IR_TH_1R,IR_TH_3R);}
    void loop(){${command} LbMission.end();}
  `, { motors() {}, advance() {}, rawLine: () => [0,4095,4095,0], log: v => logs.push(v), gripper: l => { hand = l } })
  runtime.start()
  for (let i = 0; i < 10000 && runtime.running; i++) runtime.tick(20)
  expect(runtime.running).toBe(false)
  expect(logs).toEqual([])
  expect([runtime.left,runtime.right]).toEqual([0,0])
  return { time: runtime.time, distance: runtime.distance, rotation: runtime.rotation, hand }
}

it.each([
  'move_tank(2000,2000,10);', 'move_tank(-2000,-2000,10);',
  'turn_two_wheels(2000,90);', 'turn_two_wheels(2000,-90);',
  'followLineCm(10);',
])('runs sooner with the same endpoint tolerance: %s', command => {
  const old = run(previous, command), next = run(helpers, command)
  console.info(command, old.time, '->', next.time)
  expect(next.time).toBeLessThan(old.time)
  expect(Math.abs(next.distance - old.distance)).toBeLessThan(0.5)
  expect(Math.abs(next.rotation - old.rotation)).toBeLessThan(0.05)
})

it('shortens partial gripper travel while retaining the full settling interval', () => {
  const partial = run(helpers, 'close_hand(25);')
  expect(partial.hand).toBe(25)
  expect(partial.time).toBe(495) // 375 ms movement + 120 ms settling
  const full = run(helpers, 'close_hand(50);')
  expect(full.hand).toBe(50)
  expect(full.time).toBe(870)
  expect(run(helpers, 'close_hand(25);open_hand();').time).toBe(990)
})
