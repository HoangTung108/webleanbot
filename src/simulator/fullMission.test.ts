import { expect, it } from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import { CppRuntime } from './cppRuntime'

function run(touches: (time: number) => number, duration = 2500, mission = 'robot_delay(100);') {
  const logs: string[] = [], lights: number[][] = []
  const source = base.slice(0, base.indexOf('void loop()'))
    .replace('// Chạy bài: đặt các lệnh nhiệm vụ tại đây.', `Serial.println("RUN"); ${mission}`)
    .replace('// Kết nối Internet: gọi set_wifi() sau khi đã declare_wifi().', 'Serial.println("WIFI");')
  const runtime: CppRuntime = new CppRuntime(`${source}
    void loop() {
      FullMission();
      if (millis() >= ${duration}) {
        Serial.println(missionError); Serial.println(junctionPending);
        Serial.println(lineOperationCompleted); Serial.println(lineControlReady);
        Serial.println(handBusy);
        LbMission.end();
      }
    }
  `, {
    motors() {}, advance() {},
    touch: (mask: number): boolean => !!(touches(runtime.time) & mask),
    log: value => logs.push(value), led: rgb => lights.push([...rgb]),
  })
  runtime.start()
  for (let i = 0; i < 1000 && runtime.running; i++) runtime.tick(10)
  expect(runtime.running).toBe(false)
  expect([runtime.left, runtime.right]).toEqual([0, 0])
  expect(lights.at(-1)).toEqual([0, 128, 0])
  return logs
}

it('stays idle without touches, including at startup', () => {
  expect(run(() => 0)).toEqual(['0', 'false', 'false', 'false', 'false'])
})

it('requires startup release and runs once while the start button remains held', () => {
  const logs = run(t => t < 250 || (t >= 500 && t < 2200) ? 2 : 0)
  expect(logs.filter(log => log === 'RUN')).toHaveLength(1)
})

it('requires a stable release before accepting another press', () => {
  const logs = run(t => (t >= 100 && t < 300) || (t >= 500 && t < 800) ? 2 : 0)
  expect(logs.filter(log => log === 'RUN')).toHaveLength(2)
})

it('ignores short touch noise and button combinations', () => {
  const noise = run(t => (t >= 100 && t < 115) || (t >= 150 && t < 170) ? 2 : 0)
  expect(noise).not.toContain('RUN')
  const mixed = run(t => t >= 100 && t < 200 ? 3 : ((t >= 200 && t < 600) || (t >= 800 && t < 1000) ? 2 : 0))
  expect(mixed.filter(log => log === 'RUN')).toHaveLength(1)
  expect(mixed.some(log => log.includes('hiệu chuẩn'))).toBe(false)
})

it('does not queue presses occurring during a blocking mission', () => {
  const logs = run(t => (t >= 100 && t < 180) || (t >= 300 && t < 1600) || (t >= 1800 && t < 2200) ? 2 : 0,
    3500, 'robot_delay(1000);')
  expect(logs.filter(log => log === 'RUN')).toHaveLength(2)
})

it('dispatches calibration and WiFi exclusively and returns to idle', () => {
  const logs = run(t => t >= 100 && t < 400 ? 1 : (t >= 700 && t < 1100 ? 4 : 0))
  expect(logs.filter(log => log.includes('Line calibration:'))).toHaveLength(1)
  expect(logs.filter(log => log === 'WIFI')).toHaveLength(1)
  expect(logs).not.toContain('RUN')
})

it('stops, finishes the hand and clears motion state after an error', () => {
  const logs = run(t => t >= 100 && t < 600 ? 2 : 0, 2000, `
    close_hand_async(25); junctionPending = true; lineOperationCompleted = true;
    lineControlReady = true; LbMotion.runLR(600,600); failMission(ERR_MOVE_STALL);
  `)
  expect(logs.filter(log => log === 'RUN')).toHaveLength(1)
  expect(logs.slice(-5)).toEqual(['3', 'false', 'false', 'false', 'false'])
})

it('clears the previous error at the start of a deliberately requested new run', () => {
  const logs = run(t => (t >= 100 && t < 200) || (t >= 500 && t < 700) ? 2 : 0, 1200,
    'Serial.println(missionError); failMission(ERR_MOVE_STALL);')
  expect(logs.filter(log => log === 'RUN')).toHaveLength(2)
  expect(logs.filter(log => log === '0')).toHaveLength(2)
})
