import {expect,it} from 'vitest';
import base from '../../docs/baseCode.cpp?raw';
import {CppRuntime} from './cppRuntime';

it('identifies the Asset and write stages without claiming delivery or exposing the WiFi password',()=>{
 const logs:string[]=[],writes:string[]=[];
 const helpers=base.slice(0,base.indexOf('void FullMission()')).replace('const bool IOT_DEBUG = false;','const bool IOT_DEBUG = true;');
 const runtime=new CppRuntime(`${helpers}
 void loop(){set_wifi("TestWiFi","secret-test-password",F("TeamAsset"));send_iot_color(UNKNOWN);send_iot_color(BLUE);LbMission.end();}`,{
  motors(){},advance(){},log:m=>logs.push(m),iotWrite:(_attr,value)=>writes.push(value),
 });runtime.start();runtime.tick(1);
 expect(runtime.running).toBe(false);expect(writes).toEqual(['Blue']);
 expect(logs).toContain('IOT: Asset.begin START, ID=TeamAsset');
 expect(logs).toContain('IOT: Asset.begin RETURNED (not an online confirmation)');
 expect(logs).toContain('IOT: send skipped, UNKNOWN/invalid color');
 expect(logs).toContain('IOT: Color.write START, value=Blue');
 expect(logs).toContain('IOT: Color.write RETURNED (not a delivery confirmation)');
 expect(logs.join('\n')).not.toContain('secret-test-password');
});

it('writes Color to the configured Asset once per TB1B press instead of only reading',()=>{
 const writes:Array<{attribute:string;value:string;asset:string}>=[];
 let reads=0;
 // Keep the actual FullMission branch; replace setup to avoid using real credentials.
 const source=base.slice(0,base.indexOf('void setup()'))+`
 void setup(){Leanbot.begin();set_wifi("TestWiFi","test-password",F("SenderAsset"));}
 void loop(){FullMission();}`;
 const runtime=new CppRuntime(source,{
  motors(){},advance(){},iotWrite:(attribute,value,asset)=>writes.push({attribute,value,asset}),
  iotRead:()=>{reads++;return 'Blue';},
 });runtime.start();runtime.pressTouch(3);runtime.tick(500);
 expect(writes).toEqual([{attribute:'Color',value:'Blue',asset:'SenderAsset'}]);
 runtime.tick(1000);expect(writes).toHaveLength(1);expect(reads).toBe(0);
 runtime.pressTouch(3);runtime.tick(500);expect(writes).toHaveLength(2);
 runtime.stop();
});
