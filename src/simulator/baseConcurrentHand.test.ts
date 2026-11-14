import {expect,it} from 'vitest';
import {generateRouteCode} from './routePlanner';
import {CppRuntime} from './cppRuntime';
import base from '../../docs/baseCode.cpp?raw';
import {apiReference} from '../student/apiReference';
it('passes closing and opening angles directly to the Leanbot SDK',()=>{
 const sdk=base.slice(base.indexOf('void close_hand('),base.indexOf('// Đi và quay'));
 expect(sdk).toContain('void close_hand(int degree) { LbGripper.moveTo(degree); }');
 expect(sdk).toContain('void open_hand() { LbGripper.moveTo(0); }');
 const angles:number[][]=[];
 const helpers=base.slice(0,base.indexOf('void setup()'));
 const runtime=new CppRuntime(`${helpers}void loop(){close_hand(90);open_hand();close_hand(50);LbMission.end();}`,{motors(){},advance(){},gripper:(l,r)=>angles.push([l,r])});
 runtime.start();for(let i=0;i<100&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);expect(angles).toEqual([[90,90],[0,0],[50,50]]);
});
it('removes custom hand state, asynchronous actions and individual knock actions',()=>{
 for(const name of ['handAngle','handBusy','update_hand','close_hand_async','open_hand_async','wait_hand','knock_left_hand','knock_right_hand','GRIP_MOVE_MS','GRIP_SETTLE_MS']){
  expect(base).not.toContain(name);expect(apiReference.some(entry=>entry.api.startsWith(name+'('))).toBe(false);
 }
});
it('still executes gripper and motion actions in generated routes',()=>{
 const angles:number[]=[];
 const code=generateRouteCode({x:400,y:600,heading:0},[]).replace('void plannedRoute() {','void plannedRoute() {close_hand(90);move_tank(1000,1000,5);open_hand();');
 const runtime=new CppRuntime(code,{motors(){},advance(){},gripper:l=>angles.push(l)});
 runtime.start();for(let i=0;i<3000&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);expect(angles).toEqual([0,90,0]);expect(runtime.distance).toBeGreaterThan(49);
});
