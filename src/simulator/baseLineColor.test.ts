import {it,expect} from 'vitest';
import baseCode from '../../docs/baseCode.cpp?raw';
import {CppRuntime} from './cppRuntime';
const debugBase=baseCode.replace('const bool COLOR_DEBUG = false;', 'const bool COLOR_DEBUG = true;');
const helpers=debugBase.slice(0,debugBase.search(/void\s+(?:FullMission|setup)\s*\(\s*\)\s*\{/));
function run(body:string,samples:readonly (readonly [number,number,number])[],ready=true,ambient:readonly [number,number,number]=[0,0,0]){
 let reads=0;const logs:string[]=[],lights:number[][]=[];
 const runtime=new CppRuntime(`${helpers}\nvoid setup(){colorSensorReady=${ready?'true':'false'};}void loop(){${body}LbMission.end();}`,{
  motors(){},advance(){},color:()=>samples[Math.min(Math.floor(reads++/12),samples.length-1)]??null,colorAmbient:()=>ambient,
  log:m=>logs.push(m),led:(rgb)=>lights.push([...rgb]),
 });
 // Two availability calls + one read for each of four illumination phases.
 runtime.start();for(let i=0;i<1000&&runtime.running;i++)runtime.tick(10);expect(runtime.running).toBe(false);
 return{logs,lights,reads,time:runtime.time};
}
it.each([
 ['RED',[200,20,10]],['YELLOW',[200,180,10]],['GREEN',[20,200,20]],['BLUE',[20,30,200]],['PURPLE',[140,20,180]],
] as const)('uses four agreeing ambient-corrected samples and caches %s',(color,rgb)=>{
 const r=run(`Serial.println(read_color()==${color});`,[rgb]);
 expect(r.logs.some(log=>log.includes(`-> ${color}`))).toBe(true);expect(r.logs.at(-1)).toBe('true');expect(r.reads).toBe(48);expect(r.lights).toHaveLength(18);
 expect(r.time).toBe(560); // 16 exposures at 35 ms, instead of 20 exposures / 700 ms.
});
it('rejects neutral samples early and clears the stale color notification',()=>{
 const r=run('read_color();Serial.println(read_color());',Array.from({length:6},(_,i)=>i<4?[200,20,10] as const:[60,60,60] as const));
 expect(r.logs.at(-1)).toBe('0');expect(r.reads).toBe(72);expect(r.lights.at(-1)).toEqual([0,0,0]);
});
it('subtracts a strong colored ambient light and restores brightness',()=>{
 const r=run('LbRGB.setBrightness(37);Serial.println(read_color());Serial.println(LbRGB.getBrightness());',[[20,30,200]],true,[800,100,50]);
 expect(r.logs).toContain('Color RGB: 20 30 200 -> BLUE');expect(r.logs.slice(-2)).toEqual(['3','37']);
});
it('takes the fifth sample when one vote disagrees, but rejects a split decision',()=>{
 const red=[200,20,10] as const,blue=[20,30,200] as const;
 expect(run('Serial.println(read_color());',[red,blue,red,red,red]).logs.at(-1)).toBe('1');
 expect(run('Serial.println(read_color());',[red,blue,red,blue,red]).logs.at(-1)).toBe('0');
});
it('bounds a missing sensor wait and restores brightness on failure',()=>{
 const r=run('LbRGB.setBrightness(37);Serial.println(read_color());Serial.println(LbRGB.getBrightness());',[],true);
 expect(r.logs).toEqual(['MISSION ERROR: 8','0','37']);expect(r.lights.at(-1)).toEqual([0,0,0]);
});
it('cancels a measurement on TB2B without reporting a sensor error',()=>{
 const logs:string[]=[],lights:Array<{rgb:number[];brightness:number}>=[];
 const runtime:CppRuntime=new CppRuntime(`${helpers}
 void setup(){LbRGB.setBrightness(37);}
 void loop(){Serial.println(read_color());Serial.println(missionError);Serial.println(LbRGB.getBrightness());LbMission.end();}`,{
  motors(){},advance(){},color:()=>[200,20,10],
  touch:mask=>!!(mask&8)&&runtime.time>=50,
  log:m=>logs.push(m),led:(rgb,brightness)=>lights.push({rgb:[...rgb],brightness}),
 });runtime.start();for(let i=0;i<200&&runtime.running;i++)runtime.tick(10);
 expect(runtime.running).toBe(false);expect(logs.slice(-3)).toEqual(['0','0','37']);
 expect(logs.some(m=>m.startsWith('MISSION RESET:'))).toBe(true);
 expect(logs.some(m=>m.startsWith('MISSION ERROR:'))).toBe(false);
 expect(lights.at(-1)).toEqual({rgb:[0,128,0],brightness:37});
});
it('reports unavailable sensors and mismatched required colors',()=>{
 expect(run('Serial.println(read_color());',[],false).logs).toEqual(['MISSION ERROR: 8','0']);

});
it('uses the actual shared MyBlock core for all line wrappers',()=>{
 for(const name of ['followLineDistance','followLineCm','followLineSeconds','followLineUntilJunction'])expect(helpers).toContain(`void ${name}(`);
 expect(helpers).toContain('lbmbFollowCoreStep(&ctx, &state, speedPercent, mode, targetVal)');
});
