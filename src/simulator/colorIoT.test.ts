import {expect,it} from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import {CppRuntime} from './cppRuntime'
const helpers=base.slice(0,base.indexOf('void setup()')).replace('const bool IOT_DEBUG = true;','const bool IOT_DEBUG = false;')
function run(body:string,incoming:(time:number)=>string=()=> 'waiting'){
 const logs:string[]=[],writes:string[]=[]
 let currentValue:string|undefined
 const runtime:CppRuntime=new CppRuntime(`${helpers}void loop(){set_wifi("test","pass",F("ROOM"));${body}LbMission.end();}`,{motors(){},advance(){},color:()=>[200,20,10],iotRead:()=>currentValue??incoming(runtime.time),iotWrite:(_key,value)=>{writes.push(value);currentValue=value},log:v=>logs.push(v)})
 runtime.start();for(let i=0;i<1000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false);return {logs:logs.filter(v=>!v.startsWith("IoT giả lập:")),writes,time:runtime.time}
}
it('sends only the measured color by default, preserving repeated explicit sends',()=>{
 expect(run('send_iot_color();read_color();send_iot_color();send_iot_color(BLUE);send_iot_color(BLUE);send_iot_color(UNKNOWN);').writes).toEqual(['Red','Blue','Blue'])
})
it('reads the latest attribute without manufacturing FIFO entries',()=>{
 expect(run('Serial.println(read_iot_color());Serial.println(read_iot_color());',()=> '  bLuE ').logs).toEqual(['3','3'])
})
it('waits for a valid color and supports all five signals',()=>{
 for(const [name,value] of [['Red','1'],['Green','2'],['Blue','3'],['Yellow','4'],['Purple','5']]){
  const result=run('Serial.println(read_iot_color(500));',time=>time>=200?name:'waiting')
  expect(result.logs).toEqual([value]);expect(result.time).toBeGreaterThanOrEqual(200);expect(result.time).toBeLessThan(500)
 }
})
it('returns UNKNOWN on timeout without latching a mission error',()=>{
 const result=run('Serial.println(read_iot_color(120));Serial.println(missionError);')
 expect(result.logs).toEqual(['0','0']);expect(result.time).toBe(120)
})
it('offers exactly three public color workflow functions',()=>{
 const names=[...base.matchAll(/^(?:void|bool|ObjectColor|int) (\w*color\w*)\([^;\n]*\)\s*\{/gm)].map(m=>m[1])
 expect(names.sort()).toEqual(['read_color','read_iot_color','send_iot_color'])
})

it('requires both SSID and AssetID and never emits COLOR frames as fallback',()=>{
 for(const config of ['set_wifi("test","pass");','set_wifi("","pass",F("ROOM"));']){
  let networkCalls=0;const logs:string[]=[]
  const runtime=new CppRuntime(`${helpers}void loop(){${config}send_iot_color(RED);Serial.println(read_iot_color());LbMission.end();}`,{motors(){},advance(){},iotRead(){networkCalls++;return 'Blue'},iotWrite(){networkCalls++},log:v=>logs.push(v)})
  runtime.start();for(let i=0;i<100&&runtime.running;i++)runtime.tick(10)
  expect(runtime.running).toBe(false);expect(networkCalls).toBe(0);expect(logs).toContain('MISSION ERROR: 11');expect(logs.some(v=>v.startsWith('COLOR:'))).toBe(false)
 }
 expect(base).not.toContain('Serial.readStringUntil');expect(base).not.toContain('connect_robot_room');
})
