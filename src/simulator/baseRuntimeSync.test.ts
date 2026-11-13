import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {CppRuntime} from './cppRuntime';
const base=readFileSync(new URL('../../docs/baseCode.cpp',import.meta.url),'utf8');
const prefix=base.slice(0,base.search(/void\s+(?:FullMission|setup)\s*\(\s*\)\s*\{/));
function run(commands:string, frame=20){
 let path=0,angle=0;const logs:string[]=[];const hands:number[][]=[];
 const runtime=new CppRuntime(`${prefix}\nvoid setup(){Leanbot.begin();set_line(IR_TH_2L,IR_TH_0L,IR_TH_1R,IR_TH_3R);colorSensorReady=APDS.begin();}\nvoid loop(){LbMission.begin(TB1A+TB1B);${commands} LbMission.end();}`,{
 motors(){},advance(dt){path+=(runtime.left+runtime.right)/2*dt;angle+=(runtime.left-runtime.right)/100*180/Math.PI*dt;},rawLine:()=>[0,4095,4095,0],color:()=>[200,20,10],log:m=>logs.push(m),gripper:(l,r)=>hands.push([l,r]),
 });runtime.start();for(let i=0;i<10000&&runtime.running;i++)runtime.tick(frame);expect(runtime.running).toBe(false);return{runtime,path,angle,logs,hands};
}
describe('current base runs without helper rewrites',()=>{
 it('uses the current encoder scale and acceleration/braking for 32.5 cm',()=>{const r=run('move_tank(2000,2000,32.5);');expect(r.path).toBeCloseTo(325,0);expect(r.logs).toEqual([]);});
 it('runs the actual turn profile',()=>{const r=run('turn_two_wheels(2000,90);');expect(r.angle).toBeGreaterThan(89.4);expect(r.angle).toBeLessThan(90);});
 it('runs MyBlock pointer/struct feedback in mm and cm',()=>{const r=run('followLineDistance(100);followLineCm(22.5);');expect(r.path).toBeCloseTo(325,0);expect(r.logs).toEqual([]);});
 it('runs the asynchronous hand, color voting and IoT attribute',()=>{const r=run('set_wifi("test","pass",F("ROOM"));close_hand_async(50);read_color();send_iot_color();Serial.println(read_iot_color());wait_hand();');expect(r.hands.at(-1)).toEqual([50,50]);expect(r.logs).toContain('1');expect(r.logs).toContain('1');});
 it('knocks each hand separately and returns it to rest',()=>{const r=run('knock_left_hand();knock_right_hand();');expect(r.hands).toContainEqual([90,0]);expect(r.hands).toContainEqual([0,90]);expect(r.hands.at(-1)).toEqual([0,0]);expect(r.logs).toEqual([]);});
});

it('follows the actual Synapse curved line in both directions',async()=>{
 const {SYNAPSE_CITY}=await import('./boardConfigs');
 const {readVirtualLine}=await import('./virtualSensors');
 for(const reverse of [false,true]){
  const pose=reverse?{x:370,y:122.1,heading:180}:{x:122.1,y:370,heading:270};
  const logs:string[]=[];
  const r=new CppRuntime(`${prefix}\nvoid setup(){set_line(IR_TH_2L,IR_TH_0L,IR_TH_1R,IR_TH_3R);}\nvoid loop(){followLineCm(45);LbMission.end();}`,{
   motors(){},advance(dt){pose.heading+=(r.left-r.right)/100*180/Math.PI*dt;pose.x+=(r.left+r.right)/2*Math.cos(pose.heading*Math.PI/180)*dt;pose.y+=(r.left+r.right)/2*Math.sin(pose.heading*Math.PI/180)*dt;},
   rawLine:()=>readVirtualLine(SYNAPSE_CITY,pose),log:m=>logs.push(m),
  });r.start();for(let i=0;i<1500&&r.running;i++)r.tick(20);
  expect(r.running).toBe(false);expect(logs).toEqual([]);
  if(reverse){expect(Math.abs(pose.x-122.1)).toBeLessThan(20);expect(pose.y).toBeGreaterThan(250);}
  else{expect(Math.abs(pose.y-122.1)).toBeLessThan(20);expect(pose.x).toBeGreaterThan(250);}
 }
},15000);

it('preserves references, value-copy structs, overloads, defaults and bit masks',()=>{
 const logs:string[]=[];
 const r=new CppRuntime(`struct Pair{int x;int y;};
 void change(int &v){v+=2;} void update(Pair* p){p->x+=3;}
 int helper(int n){return n;} int helper(){return 2;}
 int defaulted(int n=7);int defaulted(int n){return n;}
 void valueCopy(Pair p){p.x=100;}
 void loop(){Pair p={1,2};update(&p);valueCopy(p);change(p.y);int a[2][2]={{1,2},{3,4}};a[1][0]+=2;Serial.println(p.x+p.y+a[1][0]);Serial.println((0b1010>>1)&3);Serial.println(helper());Serial.println(defaulted());LbMission.end();}`,
 {motors(){},advance(){},log:m=>logs.push(m)});r.start();r.tick(1);expect(logs).toEqual(['13','1','2','7']);
});

it('runs timed line following and stops on line loss using base timeouts',()=>{
 for(const visible of [true,false]){
  const logs:string[]=[];
  const r=new CppRuntime(`${prefix}\nvoid loop(){followLineSeconds(visibleSeconds);LbMission.end();}`.replace('visibleSeconds',visible?'0.255f':'5.0f'),{motors(){},advance(){},rawLine:()=>visible?[0,4095,4095,0]:[0,0,0,0],log:m=>logs.push(m)});
  r.start();r.tick(5000);expect(r.running).toBe(false);expect([r.left,r.right]).toEqual([0,0]);
  if(visible){expect(r.time).toBe(260);expect(logs).toEqual([]);}else{expect(r.time).toBe(3500);expect(logs.some(m=>m.includes('MISSION ERROR'))).toBe(true);}
 }
});

it('rejects unsupported SDK calls before accepting a program',()=>{
 expect(()=>new CppRuntime('void loop(){LbMotion.fly(100);}',{motors(){},advance(){}})).toThrow('LbMotion.fly');
});

it('bounds array allocation before running uploaded C++',()=>{
 const r=new CppRuntime('int huge[1000000000];void loop(){}',{motors(){},advance(){}});
 r.start();expect(()=>r.tick(0)).toThrow('65536');expect(r.running).toBe(false);
});
