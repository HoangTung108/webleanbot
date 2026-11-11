import {expect,it} from 'vitest';
import {readVirtualLine,readVirtualColor} from './virtualSensors';
import {CppRuntime} from './cppRuntime';
import type {MissionBlock} from './missionWorld';
it('uses the same four sensor positions for straight and diagonal placement',()=>{
 const board={lines:[{id:'line',points:[{x:0,y:0},{x:1000,y:0}],width:16,color:'#000'}]};
 expect(readVirtualLine(board,{x:100,y:0,heading:0})).toEqual([0,4095,4095,0]);
 expect(readVirtualLine(board,{x:100,y:24,heading:0})).toEqual([4095,0,0,0]);
 expect(readVirtualLine(board,{x:100,y:-24,heading:0})).toEqual([0,0,0,4095]);
});
it('applies thresholds to raw readings and caches the last digital read',()=>{
 const logs:string[]=[];
 const r=new CppRuntime('void loop(){LbIRLine.setThreshold(5000,100,100,5000);LbIRLine.read();Serial.println(LbIRLine.value());Serial.println(LbIRArray.read(ir2L));LbMission.end();}',{motors(){},advance(){},rawLine:()=>[4095,4095,4095,4095],log:m=>logs.push(m)});
 r.start();r.tick(0);expect(logs).toEqual(['6','4095']);
});
it('reads nearby block colors without exposing hidden or off-board colors',()=>{
 const pose={x:100,y:100,heading:0};
 const block={x:175,y:100,color:'blue',kind:'pollution',state:'standing',offBoard:false} as MissionBlock;
 expect(readVirtualColor([block],pose)).toEqual([20,30,200]);
 expect(readVirtualColor([block],pose,true)).toEqual([60,60,60]);
 expect(readVirtualColor([{...block,offBoard:true}],pose)).toEqual([0,0,0]);
 expect(readVirtualColor([{...block,x:300}],pose)).toEqual([0,0,0]);
});
