import {it,expect} from 'vitest';
import baseCode from '../../docs/baseCode.cpp?raw';
import {CppRuntime} from './cppRuntime';
const helpers=baseCode.slice(0,baseCode.search(/void\s+(?:FullMission|setup)\s*\(\s*\)\s*\{/));
function run(body:string,samples:readonly (readonly [number,number,number])[],ready=true){
 let reads=0;const logs:string[]=[],lights:number[][]=[];
 const runtime=new CppRuntime(`${helpers}\nvoid setup(){colorSensorReady=${ready?'true':'false'};}void loop(){${body}LbMission.end();}`,{
  motors(){},advance(){},color:()=>samples[Math.min(Math.floor(reads++/3),samples.length-1)]??null,
  log:m=>logs.push(m),led:(rgb)=>lights.push([...rgb]),
 });
 // APDS colorAvailable is queried twice before readColor per sample.
 runtime.start();for(let i=0;i<1000&&runtime.running;i++)runtime.tick(10);expect(runtime.running).toBe(false);
 return{logs,lights,reads};
}
it.each([
 ['RED',[200,20,10]],['YELLOW',[200,180,10]],['GREEN',[20,200,20]],['BLUE',[20,30,200]],['PURPLE',[140,20,180]],
] as const)('executes five-sample voting and caches %s without requiring caller variables',(color,rgb)=>{
 const r=run(`read_color();Serial.println(is_color(${color}));`,[rgb]);
 expect(r.logs.some(log=>log.includes(`-> ${color}`))).toBe(true);expect(r.logs.at(-1)).toBe('true');expect(r.reads).toBe(15);expect(r.lights).toHaveLength(2);
});
it('rejects neutral samples and keeps the previous LED notification',()=>{
 const r=run('read_color();read_color();Serial.println(get_color());',Array.from({length:10},(_,i)=>i<5?[200,20,10] as const:[60,60,60] as const));
 expect(r.logs.at(-1)).toBe('0');expect(r.lights).toHaveLength(2);expect(r.lights.at(-1)).toEqual([255,0,0]);
});
it('reports unavailable sensors and mismatched required colors',()=>{
 expect(run('read_color();Serial.println(get_color());',[],false).logs).toEqual(['MISSION ERROR: 8','0']);
 expect(run('requireColor(BLUE);',[[200,20,10]]).logs.at(-1)).toBe('MISSION ERROR: 9');
});
it('uses the actual shared MyBlock core for all line wrappers',()=>{
 for(const name of ['followLineDistance','followLineCm','followLineSeconds','followLineUntilJunction'])expect(helpers).toContain(`void ${name}(`);
 expect(helpers).toContain('lbmbFollowCoreStep(&ctx, &state, speedPercent, mode, targetVal)');
});
