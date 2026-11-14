import {expect,it} from 'vitest';
import base from './baseFeatures.fixture';
import {CppRuntime} from './cppRuntime';

it('writes the numbered Color attribute selected by the object argument',()=>{
 const writes:Array<{attribute:string;value:string;asset:string}>=[];
 const logs:string[]=[];
 const helpers=base.slice(0,base.indexOf('void FullMission()'));
 const runtime=new CppRuntime(`${helpers}
 void loop(){set_wifi("TestWiFi","secret-test-password",F("TeamAsset"));send_iot_color(UNKNOWN,2);send_iot_color(BLUE,2);LbMission.end();}`,{
  motors(){},advance(){},iotWrite:(attribute,value,asset)=>writes.push({attribute,value,asset}),log:m=>logs.push(m),
 });
 runtime.start();runtime.tick(1);
 expect(runtime.running).toBe(false);
 expect(writes).toEqual([{attribute:'Color2',value:'Blue',asset:'TeamAsset'}]);
 expect(logs.join('\n')).not.toContain('secret-test-password');
});

it('reads from the same numbered Color attribute as the sender',()=>{
 const reads:string[]=[];
 const logs:string[]=[];
 const helpers=base.slice(0,base.indexOf('void FullMission()'));
 const runtime=new CppRuntime(`${helpers}
 void loop(){set_wifi("TestWiFi","test-password",F("TeamAsset"));Serial.println(read_iot_color(0,2));LbMission.end();}`,{
  motors(){},advance(){},iotRead:(attribute)=>{reads.push(attribute);return 'Green';},log:m=>logs.push(m),
 });
 runtime.start();runtime.tick(1);
 expect(runtime.running).toBe(false);
 expect(reads).toEqual(['Color2']);
 expect(logs).toContain('2');
});

it('rejects object numbers outside the supported Color1-Color7 range',()=>{
 const writes:string[]=[];
 const logs:string[]=[];
 const helpers=base.slice(0,base.indexOf('void FullMission()'));
 const runtime=new CppRuntime(`${helpers}
 void loop(){set_wifi("TestWiFi","test-password",F("TeamAsset"));send_iot_color(BLUE,8);LbMission.end();}`,{
  motors(){},advance(){},iotWrite:(_attribute,value)=>writes.push(value),log:m=>logs.push(m),
 });
 runtime.start();runtime.tick(1);
 expect(runtime.running).toBe(false);
 expect(writes).toEqual([]);
 expect(logs).toContain('MISSION ERROR: 12');
});

it('sends each numbered color attribute on a TB1B press from the mission template',()=>{
 const writes:Array<{attribute:string;value:string;asset:string}>=[];
 const source=base.slice(0,base.indexOf('void setup()')).replace('// Chạy bài: đặt các lệnh nhiệm vụ tại đây.', 'send_iot_color(BLUE,1);send_iot_color(RED,2);send_iot_color(YELLOW,3);send_iot_color(PURPLE,4);send_iot_color(GREEN,5);')+`
 void setup(){Leanbot.begin();set_wifi("TestWiFi","test-password",F("SenderAsset"));}
 void loop(){FullMission();}`;
 const runtime=new CppRuntime(source,{
  motors(){},advance(){},iotWrite:(attribute,value,asset)=>writes.push({attribute,value,asset}),
 });runtime.start();runtime.pressTouch(2);runtime.tick(500);
 expect(writes).toEqual([
  {attribute:'Color1',value:'Blue',asset:'SenderAsset'},
  {attribute:'Color2',value:'Red',asset:'SenderAsset'},
  {attribute:'Color3',value:'Yellow',asset:'SenderAsset'},
  {attribute:'Color4',value:'Purple',asset:'SenderAsset'},
  {attribute:'Color5',value:'Green',asset:'SenderAsset'},
 ]);
 runtime.stop();
});
