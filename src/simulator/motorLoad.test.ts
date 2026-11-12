import {expect,it} from 'vitest'
import base from '../../docs/baseCode.cpp?raw'
import {CppRuntime} from './cppRuntime'
function run(command:string){
 let peak=0;const logs:string[]=[]
 const source=base.slice(0,base.indexOf('void setup()'))+`void loop(){${command}LbMission.end();}`
 const runtime=new CppRuntime(source,{motors(l,r){peak=Math.max(peak,Math.abs(l),Math.abs(r))},advance(){},rawLine:()=>[0,4095,4095,0],log:v=>logs.push(v)})
 runtime.start();for(let i=0;i<5000&&runtime.running;i++)runtime.tick(10)
 expect(runtime.running).toBe(false);expect([runtime.left,runtime.right]).toEqual([0,0]);return {runtime,peak,logs}
}
it('caps forward and reverse movement and still reaches the calibrated target',()=>{
 for(const direction of [1,-1]){const {runtime,peak}=run(`move_tank(${direction*2000},${direction*2000},32.5);`);expect(peak).toBeLessThanOrEqual(1600);expect(runtime.distance*direction).toBeCloseTo(325*1.00625,0)}
})
it('caps turning while preserving feedback termination',()=>{const {runtime,peak}=run('turn_two_wheels(2000,90);');expect(peak).toBeLessThanOrEqual(1300);expect(runtime.rotation).toBeGreaterThanOrEqual(89.5);expect(runtime.rotation).toBeLessThan(91)})
it('caps explicitly requested full speed line following',()=>{expect(run('followLineSeconds(2,100);').peak).toBeLessThanOrEqual(1600)})
it('does not restart motors after a stall error',()=>{const {peak,logs}=run('failMission(ERR_TURN_STALL);move_tank(2000,2000,10);turn_two_wheels(2000,90);followLineSeconds(1);runFollowLine();Serial.println(missionError);');expect(peak).toBe(0);expect(logs).toContain('5')})
