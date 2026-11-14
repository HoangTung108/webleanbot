import { expect, it } from 'vitest'
import sourceBase from './baseFeatures.fixture'
const base = sourceBase.replace('const bool LINE_DEBUG = false;', 'const bool LINE_DEBUG = true;')
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
  expect(logs.filter(log => log.includes('hiệu chuẩn nút chạm'))).toHaveLength(1)
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

it('exchanges color signals in WiFi mode (no USB) through the Color attribute', () => {
  const iotWrites: Array<{ attribute: string; value: string; assetId: string }> = []
  let incomingColor = 'waiting'
  const logs: string[] = []
  const source = base.slice(0, base.indexOf('void loop()'))
  const runtime: CppRuntime = new CppRuntime(`${source}
    void loop() {
      set_wifi("LeanbotWiFi", "12345678", F("ROOM99"));
      send_iot_color(BLUE);
      bool ok = (read_iot_color(500UL) == GREEN);
      Serial.println(ok);
      LbMission.end();
    }
  `, {
    motors() {}, advance() {},
    iotRead: (attribute) => attribute === 'Color1' ? incomingColor : 'waiting',
    iotWrite: (attribute, value, assetId) => {
      iotWrites.push({ attribute, value, assetId })
      if (value === 'Blue') incomingColor = 'Green'
    },
    log: value => logs.push(value),
  })
  runtime.start()
  for (let i = 0; i < 200 && runtime.running; i++) runtime.tick(10)
  expect(runtime.running).toBe(false)
  expect(iotWrites).toEqual([{ attribute: 'Color1', value: 'Blue', assetId: 'ROOM99' }])
  expect(logs).toContain('true')
})

it('uses the configured Asset ID when TB2A starts WiFi',()=>{
 const writes:Array<{attribute:string;value:string;assetId:string}>=[];
 const source=base.slice(0,base.indexOf('void loop()')).replace('declare_wifi("", "", F("AssetID"));','declare_wifi("TestWiFi", "test-password", F("TEAM42"));');
 const runtime:CppRuntime=new CppRuntime(`${source}
 void loop(){FullMission();if(millis()>=250){send_iot_color(BLUE);LbMission.end();}}`,{
  motors(){},advance(){},touch:mask=>runtime.time>=100&&runtime.time<200&&!!(mask&4),
  iotWrite:(attribute,value,assetId)=>writes.push({attribute,value,assetId}),
 });
 runtime.start();for(let i=0;i<100&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);expect(writes).toEqual([{attribute:'Color1',value:'Blue',assetId:'TEAM42'}]);
});

it('rejects unconfigured IoT without falling back to Serial Bridge',()=>{
 let calls=0;const logs:string[]=[];
 const helpers=base.slice(0,base.indexOf('void FullMission()'));
 const runtime=new CppRuntime(`${helpers}void loop(){send_iot_color(BLUE);Serial.println(read_iot_color());LbMission.end();}`,{
  motors(){},advance(){},log:m=>logs.push(m),iotRead(){calls++;return 'Red';},iotWrite(){calls++;},
 });runtime.start();for(let i=0;i<100&&runtime.running;i++)runtime.tick(10);expect(calls).toBe(0);expect(logs).toEqual(['MISSION ERROR: 11','MISSION ERROR: 11','0']);
});


it('reports SDK ADC and mask when the measurement helper is requested', () => {
  const logs = run(t => t >= 100 && t < 400 ? 2 : 0, 2500, 'measure_line_values();')
  expect(logs.some(log => log.startsWith('IR ADC 2L/0L/1R/3R: '))).toBe(true)
})

it('ignores TB2B and accepts a new TB1B press after completion', () => {
  const logs = run(t => t >= 100 && t < 200 ? 2 : t >= 350 && t < 700 ? 8 : t >= 1100 && t < 1200 ? 2 : 0,
    2500, 'set_wifi("test","pass",F("ROOM")); robot_delay(600); send_iot_color(RED);')
  expect(logs.filter(log => log === 'RUN')).toHaveLength(2)
  expect(logs.filter(log => log.startsWith('MISSION RESET:'))).toHaveLength(0)
  expect(logs.slice(-5)).toEqual(['0', 'false', 'false', 'false', 'false'])
})
