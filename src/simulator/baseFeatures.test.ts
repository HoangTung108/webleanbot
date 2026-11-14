import {expect,it} from 'vitest';
import rawBase from '../../docs/baseCode.cpp?raw';
import {BASE_FEATURES,configureBaseFeatures,preprocessBaseFeatures} from './baseFeatures';
import {CppRuntime} from './cppRuntime';
const disabledBase=configureBaseFeatures(rawBase,[]);
const minimal=preprocessBaseFeatures(disabledBase);
it('excludes optional libraries, globals and SDK calls from the default firmware',()=>{
 expect(minimal).not.toContain('#include <LeanbotIoT.h>');expect(minimal).not.toContain('#include <Arduino_APDS9960.h>');
 expect(minimal).not.toContain('LbIoT.');expect(minimal).not.toContain('APDS.');expect(minimal).not.toContain('String wifiSsid');expect(minimal).not.toContain('float colorReference');
 expect(minimal.split('\n')).toHaveLength(rawBase.split('\n').length);
});
it('can enable IoT and color independently',()=>{
 const wifi=preprocessBaseFeatures(configureBaseFeatures(rawBase,['BASE_USE_IOT']));
 expect(wifi).toContain('LbIoT.Wifi.begin');expect(wifi).not.toContain('APDS.');
 const color=preprocessBaseFeatures(configureBaseFeatures(rawBase,['BASE_USE_COLOR']));
 expect(color).toContain('APDS.begin');expect(color).not.toContain('LbIoT.');
});
it('runs motion, line PID, and the hand without loading optional services',()=>{
 const helpers=disabledBase.slice(0,disabledBase.indexOf('void setup()'));
 let networkCalls=0;const logs:string[]=[];
 const runtime=new CppRuntime(`${helpers}void loop(){close_hand(50);move_tank(2000,2000,5);turn_two_wheels(1000,45);followLineCm(5);LbMission.end();}`,{motors(){},advance(){},rawLine:()=>[0,4095,4095,0],iotRead(){networkCalls++;return 'Blue'},iotWrite(){networkCalls++},log:v=>logs.push(v)});
 runtime.start();for(let i=0;i<4000&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);expect(logs).toEqual([]);expect(networkCalls).toBe(0);expect([runtime.left,runtime.right]).toEqual([0,0]);
});
it('rejects disabled APIs clearly instead of silently pretending to read or send',()=>{
 const helpers=disabledBase.slice(0,disabledBase.indexOf('void setup()'));const logs:string[]=[];
 const runtime=new CppRuntime(`${helpers}void loop(){read_color();send_iot_color(BLUE);Serial.println(read_iot_color());LbMission.end();}`,{motors(){},advance(){},log:v=>logs.push(v)});
 runtime.start();for(let i=0;i<100&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);expect(logs.some(v=>v.startsWith('MISSION ERROR:'))).toBe(false);expect(logs.at(-1)).toBe('0');
});
it('uses full SDK flow when both features are explicitly enabled',()=>{
 const source=configureBaseFeatures(rawBase,BASE_FEATURES);const helpers=source.slice(0,source.indexOf('void setup()'));const writes:string[]=[];const logs:string[]=[];
 const runtime=new CppRuntime(`${helpers}void loop(){set_wifi();send_iot_color(BLUE,2);Serial.println(read_iot_color(0,2));LbMission.end();}`,{motors(){},advance(){},iotWrite:(attribute,value)=>writes.push(`${attribute}:${value}`),iotRead:()=> 'Green',log:v=>logs.push(v)});
 runtime.start();for(let i=0;i<100&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);expect(writes).toEqual(['Color2:Blue']);expect(logs).toContain('2');
});
it('preserves the original PID core and configuration verbatim',()=>{
 const full=preprocessBaseFeatures(configureBaseFeatures(rawBase,BASE_FEATURES));
 const core=(source:string)=>source.slice(source.indexOf('inline int32_t lbmbAbs32'),source.indexOf('LbmbFollowCtx defaultLineContext'));
 expect(core(minimal)).toBe(core(full));
});

it('matches the native C++ preprocessor for every feature combination',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {execFileSync}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'base-features-'));
 try{
  for(const header of ['Leanbot.h','LeanbotIoT.h','Arduino_APDS9960.h'])writeFileSync(join(dir,header),'');
  for(const enabled of [[],['BASE_USE_IOT'],['BASE_USE_COLOR'],[...BASE_FEATURES]] as (typeof BASE_FEATURES[number])[][]){
   const source=configureBaseFeatures(rawBase,enabled),path=join(dir,'base.cpp');writeFileSync(path,source);
   const native=execFileSync('c++',['-E','-P','-x','c++','-I',dir,path],{encoding:'utf8',timeout:10000});
   const simulated=preprocessBaseFeatures(source);
   expect(/LbIoT\s*\.\s*Wifi/.test(native)).toBe(simulated.includes('LbIoT.Wifi'));
   expect(/APDS\s*\.\s*begin/.test(native)).toBe(simulated.includes('APDS.begin'));
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
it('rejects ambiguous feature values and incomplete branches',()=>{
 expect(()=>preprocessBaseFeatures('#define BASE_USE_IOT 0 + 1')).toThrow('0 hoặc 1');
 expect(()=>preprocessBaseFeatures('#define BASE_USE_IOT 2')).toThrow('0 hoặc 1');
 expect(()=>preprocessBaseFeatures('#define BASE_USE_IOT 1\n#if BASE_USE_IOT\nint value;')).toThrow('Unclosed');
});
