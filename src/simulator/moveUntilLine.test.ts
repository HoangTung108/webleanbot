import {expect,it} from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import {apiReference} from '../student/apiReference'
import {CppRuntime} from './cppRuntime'

it('removes blind line search and single-wheel helpers from the compact base and API catalog',()=>{
 for(const name of ['moveUntilLine','moveTankCore','stopOnDetectedLine','turn_one_wheel','turn_angle','TurnMode']){
  expect(base).not.toContain(name)
  expect(apiReference.some(entry=>entry.api.startsWith(name+'('))).toBe(false)
 }
})
it('keeps forward/reverse travel and signed two-wheel turns after pruning motion modes',()=>{
 const logs:string[]=[]
 const helpers=base.slice(0,base.indexOf('void setup()'))
 const runtime=new CppRuntime(`${helpers}void loop(){
 move_tank(1500,1500,5);Serial.println(LbMotion.getDistanceMm());
 turn_two_wheels(1500,90);Serial.println(LbMotion.getRotationDeg());
 turn_two_wheels(1500,-90);Serial.println(LbMotion.getRotationDeg());
 move_tank(-1500,-1500,5);Serial.println(LbMotion.getDistanceMm());
LbMission.end();}`,{motors(){},advance(){},log:v=>logs.push(v)})
 runtime.start();for(let i=0;i<4000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false)
 expect(Number(logs[0])).toBeCloseTo(50,0)
 expect(Number(logs[1])).toBeGreaterThanOrEqual(89)
 expect(Math.abs(Number(logs[2]))).toBeLessThan(1)
 expect(Math.abs(Number(logs[3]))).toBeLessThan(1)
 expect([runtime.left,runtime.right]).toEqual([0,0])
})
it('stops an invalid move locally and allows the next move without a failure latch',()=>{
 const logs:string[]=[];const commands:number[][]=[]
 const helpers=base.slice(0,base.indexOf('void setup()'))
 const runtime=new CppRuntime(`${helpers}void loop(){move_tank(0,0,5);move_tank(1000,1000,5);LbMission.end();}`,{motors:(l,r)=>commands.push([l,r]),advance(){},log:v=>logs.push(v)})
 runtime.start();for(let i=0;i<2000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false);expect(runtime.distance).toBeGreaterThan(49)
 expect(commands[0]).toEqual([0,0]);expect([runtime.left,runtime.right]).toEqual([0,0]);expect(logs).toEqual([])
 expect(base).not.toContain('failMission');expect(base).not.toContain('missionError')
})
