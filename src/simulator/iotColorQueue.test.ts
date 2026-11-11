import { expect, it } from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import { CppRuntime } from './cppRuntime'

const helpers = base.slice(0, base.search(/void\s+(?:FullMission|setup)\s*\(/))

function run(commands: string) {
  const logs: string[] = []
  const runtime = new CppRuntime(`${helpers}
    void setup() {}
    void loop() { ${commands} LbMission.end(); }
  `, { motors() {}, advance() {}, log: value => logs.push(value) })
  runtime.start()
  for (let i = 0; i < 1000 && runtime.running; i++) runtime.tick(10)
  expect(runtime.running).toBe(false)
  return logs
}

it('queues consecutive equal colors without a waiting signal', () => {
  expect(run(`
    send_iot_color(RED); read_iot_color();
    send_iot_color(RED); read_iot_color();
    send_iot_color(BLUE); read_iot_color();
    Serial.println(iot_queue_count());
    Serial.println(pop_iot_color());
    Serial.println(pop_iot_color());
    Serial.println(pop_iot_color());
    Serial.println(iot_queue_count());
  `)).toEqual(['3', '1', '1', '3', '0'])
})

it('ignores unknown values and bounds repeated reads by queue capacity', () => {
  expect(run(`
    reset_iot_color(); read_iot_color();
    send_iot_color(UNKNOWN); read_iot_color();
    Serial.println(iot_queue_count());
    send_iot_color(RED);
    for (int i = 0; i < IOT_QUEUE_CAPACITY + 1; ++i) read_iot_color();
    Serial.println(iot_queue_count());
    Serial.println(iotQueueOverflow);
    clear_iot_queue();
    Serial.println(iot_queue_count());
    Serial.println(iotQueueOverflow);
  `)).toEqual(['0', '16', 'true', '0', 'false'])
})
