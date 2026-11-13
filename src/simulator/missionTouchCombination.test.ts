import {expect,it} from 'vitest';
import base from '../../docs/baseCode.cpp?raw';
import {CppRuntime} from './cppRuntime';

function run(touches:(time:number)=>number){
 const logs:string[]=[];
 const source=base.slice(0,base.indexOf('void setup()'))
  .replace('    send_iot_color(BLUE);','    Serial.println("RUN");')+
  'void loop(){FullMission();if(millis()>=2000) LbMission.end();}';
 const runtime:CppRuntime=new CppRuntime(source,{
  motors(){},advance(){},log:m=>logs.push(m),touch:mask=>!!(mask&touches(runtime.time)),
 });runtime.start();for(let i=0;i<300&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);return logs;
}
it('runs once while TB1A and TB1B are held together, without calibrating line',()=>{
 expect(run(t=>t>=100&&t<1200?3:0)).toEqual(['RUN']);
});
it('does not run from TB1B alone, noise, or a combination containing another button',()=>{
 expect(run(t=>t>=100&&t<300?2:t>=500&&t<520?3:t>=700&&t<1000?7:0)).toEqual([]);
});
it('requires release at startup and before a second run',()=>{
 expect(run(t=>t<200||t>=400&&t<700||t>=1000&&t<1300?3:0)).toEqual(['RUN','RUN']);
});
