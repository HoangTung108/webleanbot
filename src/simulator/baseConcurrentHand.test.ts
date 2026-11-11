import {expect,it} from 'vitest';
import {generateRouteCode} from './routePlanner';
import {CppRuntime} from './cppRuntime';
function run(body:string){
 let moving=false,overlap=false,angle=0;
 const code=generateRouteCode({x:400,y:600,heading:0},[]).replace('void plannedRoute() {','void plannedRoute() {\n'+body);
 const logs:string[]=[];
 const runtime=new CppRuntime(code,{advance(){},motors(l,r){moving=!!(l||r);},gripper(l){angle=l;if(moving&&l>0)overlap=true;},lineMask(){return 6;},log(v){logs.push(v);}});
 runtime.start();
 for(let i=0;i<20000&&runtime.running;i++)runtime.tick(1);
 expect(runtime.running).toBe(false);
 return {angle,overlap,logs};
}
it('finishes blocking closure after one movement plus settling interval',()=>{
 const result=run('unsigned long start=millis();close_hand(50);Serial.println(millis()-start);');
 expect(result.angle).toBe(50);expect(result.logs).toContain('870');
});
it('services the hand concurrently during straight motion and waits for completion',()=>{
 const result=run('close_hand_async(50);Forward(2000,40);wait_hand();');
 expect(result.overlap).toBe(true);expect(result.angle).toBe(50);
});
it('services the hand while turning and can reverse an unfinished movement',()=>{
 const result=run('close_hand_async(50);Rotate(2000,20);open_hand_async();wait_hand();');
 expect(result.overlap).toBe(true);expect(result.angle).toBe(0);
});
it('exposes line measurement and threshold setup to generated programs',()=>{
 const result=run('set_line(69,78,106,70);print_line();');
 expect(result.logs).toContain('6');
});
