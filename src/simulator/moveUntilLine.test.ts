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
it('drives blind and stops when a sensor detects black',()=>{const result=run(500);expect(result.logs).toContain('0');expect(result.time).toBeGreaterThanOrEqual(500);expect(result.time).toBeLessThan(600)})
it('reports failure and stops if no line is found within the distance limit',()=>{const result=run(Infinity,1);expect(result.logs).toContain('6');expect(result.logs.some(v=>v.startsWith('MISSION ERROR:'))).toBe(true)})
