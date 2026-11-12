import {expect,it} from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import {CppRuntime} from './cppRuntime'
function run(visibleAt:number, distance=100){
 const logs:string[]=[]
 const source=base.slice(0,base.indexOf('void loop()'))+`void loop(){moveUntilLine(600,${distance});Serial.println(missionError);LbMission.end();}`
 const runtime:CppRuntime=new CppRuntime(source,{motors(){},advance(){},rawLine:()=>runtime.time>=visibleAt?[0,4095,0,0]:[0,0,0,0],log:v=>logs.push(v)})
 runtime.start();for(let i=0;i<3000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false);expect([runtime.left,runtime.right]).toEqual([0,0]);return {logs,time:runtime.time}
}
it('stops immediately when already on black',()=>{expect(run(0).logs).toContain('0')})
it('drives blind and stops when a sensor detects black',()=>{const result=run(500);expect(result.logs).toContain('0');expect(result.time).toBeGreaterThanOrEqual(500);expect(result.time).toBeLessThan(700)})
it('reports failure and stops if no line is found within the distance limit',()=>{const result=run(Infinity,1);expect(result.logs).toContain('6');expect(result.logs.some(v=>v.startsWith('MISSION ERROR:'))).toBe(true)})

it('uses fresh origins after moving and turning, and on repeated searches',()=>{
 const logs:string[]=[];let searchOrigin=0, searching=false, searches=0, peak=0
 const source=base.slice(0,base.indexOf('void setup()'))+`void loop(){
   move_tank(1000,1000,5);turn_two_wheels(1000,90);
   Serial.println("SEARCH");moveUntilLine(2000,10);Serial.println("FOUND");
   move_tank(1000,1000,5);turn_two_wheels(1000,-90);
   Serial.println("SEARCH");moveUntilLine(2000,10);Serial.println("FOUND");
   Serial.println(missionError);LbMission.end();
 }`
 const runtime:CppRuntime=new CppRuntime(source,{
   motors(l,r){if(searching)peak=Math.max(peak,Math.abs(l),Math.abs(r))},advance(){},
   rawLine:()=>searching&&runtime.distance-searchOrigin>=20?[0,4095,0,0]:[0,0,0,0],
   log(v){logs.push(v);if(v==='SEARCH'){searchOrigin=runtime.distance;searching=true;searches++}
     if(v==='FOUND'){expect(runtime.distance-searchOrigin).toBeGreaterThanOrEqual(20);expect(runtime.distance-searchOrigin).toBeLessThan(22);searching=false}}
 })
 runtime.start();for(let i=0;i<4000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false);expect(searches).toBe(2);expect(logs.at(-1)).toBe('0');expect(peak).toBeLessThanOrEqual(350)
})

it('does not move away from a line already detected after the previous commands',()=>{
 let origin=0, searching=false;const logs:string[]=[]
 const source=base.slice(0,base.indexOf('void setup()'))+`void loop(){move_tank(1000,1000,5);turn_two_wheels(1000,90);junctionPending=true;Serial.println("SEARCH");moveUntilLine();Serial.println(junctionPending);LbMission.end();}`
 const runtime:CppRuntime=new CppRuntime(source,{motors(){},advance(){},rawLine:()=>[0,4095,0,0],log(v){logs.push(v);if(v==='SEARCH'){origin=runtime.distance;searching=true}}})
 runtime.start();for(let i=0;i<4000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false);expect(searching).toBe(true);expect(logs.at(-1)).toBe('false');expect(runtime.distance).toBe(origin);expect([runtime.left,runtime.right]).toEqual([0,0])
})

it('does not execute subsequent motion if the line was not found',()=>{
 const logs:string[]=[];let missedDistance=0,missedRotation=0
 const source=base.slice(0,base.indexOf('void setup()'))+`void loop(){moveUntilLine(1500,1);Serial.println("MISSED");turn_two_wheels(2000,45);move_tank(2000,2000,32.5);LbMission.end();}`
 const runtime:CppRuntime=new CppRuntime(source,{motors(){},advance(){},rawLine:()=>[0,0,0,0],log(v){logs.push(v);if(v==='MISSED'){missedDistance=runtime.distance;missedRotation=runtime.rotation}}})
 runtime.start();for(let i=0;i<4000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false);expect(logs).toContain('MISSION ERROR: 6');expect(runtime.distance).toBe(missedDistance);expect(runtime.rotation).toBe(missedRotation)
})
