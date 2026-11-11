import {describe,it,expect} from 'vitest';
import {OnlineCompetition} from './onlineCompetition';
import type {OnlineCommand} from '../src/simulator/onlineCompetition';
const code='void setup(){} void loop(){LbMotion.stopAndWait();LbMission.end();}';
function command(s:OnlineCompetition,id:string,cmd:OnlineCommand){s.command(id,{sessionId:s.sessionId,round:s.flow.round,...cmd});}
function prepare(){const s=new OnlineCompetition('a',['a','b']);command(s,'a',{action:'category',category:'innovator'});command(s,'a',{action:'announce'});return s;}
function ready(s:OnlineCompetition){for(const id of ['a','b'])command(s,id,{action:'lock-code',code});command(s,'a',{action:'reveal'});}
describe('shared online competition',()=>{
 it('requires host controls and fresh session/round, rejects excess robots for category',()=>{
  const s=new OnlineCompetition('a',['a','b']);
  expect(()=>command(s,'b',{action:'announce'})).toThrow('chủ phòng');
  expect(()=>command(s,'a',{action:'announce'})).toThrow('giới hạn');
  expect(()=>s.command('a',{action:'speed',speed:10})).toThrow('thay đổi');
 });
 it('redacts colors and code, waits for both locks, preserves slots on reveal',()=>{
  const s=prepare(),before=s.snapshot();
  expect(before.hiddenColors).toBe(true);
  expect(before.blocks.filter(b=>b.kind==='pollution').every(b=>b.color==='mystery')).toBe(true);
  expect(JSON.parse(before.layout).blocks.filter((b:any)=>b.kind==='pollution').every((b:any)=>b.color==='mystery')).toBe(true);
  command(s,'a',{action:'lock-code',code});expect(s.flow.phase).toBe('preparation');expect(s.canJoin).toBe(false);
  expect(()=>command(s,'a',{action:'reveal'})).toThrow();
  command(s,'b',{action:'lock-code',code});expect(s.flow.phase).toBe('quarantine');
  command(s,'a',{action:'reveal'});const after=s.snapshot();expect(after.hiddenColors).toBe(false);
  expect(after.blocks.map(b=>b.slotId)).toEqual(before.blocks.map(b=>b.slotId));
  expect(JSON.stringify(after)).not.toContain('void setup');
 });
 it('runs one shared 120-second clock and awards both returned robots once',()=>{
  const s=prepare();ready(s);command(s,'a',{action:'start'});
  command(s,'a',{action:'speed',speed:10});s.advanceWall(0,Infinity);s.advanceWall(12000,Infinity);
  expect(s.flow.phase).toBe('finished');expect(s.elapsedMs).toBe(120000);
  expect(s.flow.records).toHaveLength(1);expect(s.flow.records[0].score.returned).toBe(80);
  s.advanceWall(13000,Infinity);expect(s.flow.records).toHaveLength(1);
  command(s,'a',{action:'next'});command(s,'a',{action:'announce'});
  expect(s.flow.round).toBe(2);expect(s.flow.layout).not.toBe(s.flow.records[0].configuration);
 },20000);
 it('any member stops the team and disconnect cannot earn return points',()=>{
  const s=prepare();ready(s);command(s,'a',{action:'start'});s.removePlayer('b');
  expect(s.flow.phase).toBe('finished');expect(s.flow.records[0].score.returned).toBe(40);
 });
 it('shares practice and locks only after practice stops',()=>{
  const s=prepare();command(s,'a',{action:'practice-run',code:'void loop(){LbMotion.runLR(2000,2000);LbDelay(1000);}'});
  expect(()=>command(s,'b',{action:'lock-code',code})).toThrow('Dừng');
  s.advanceWall(0,Infinity);s.advanceWall(50,Infinity);expect(s.elapsedMs).toBe(0);
  command(s,'b',{action:'stop'});command(s,'a',{action:'practice-reset'});
  expect(s.snapshot().players.every(p=>!p.programRunning)).toBe(true);
 });
});

it('keeps movement identical when the host changes from 1x to 10x mid-run',()=>{
 const run=(fast:boolean)=>{
  const s=prepare();const movement='void loop(){LbMotion.runLR(2000,2000);LbDelay(3000);LbMission.end();}';
  for(const id of ['a','b'])command(s,id,{action:'lock-code',code:movement});
  command(s,'a',{action:'reveal'});command(s,'a',{action:'start'});
  s.advanceWall(0,Infinity);s.advanceWall(200,Infinity);
  if(fast)command(s,'a',{action:'speed',speed:10});
  s.advanceWall(fast?480:3000,Infinity);
  return s.snapshot();
 };
 const a=run(false),b=run(true);expect(a.elapsedMs).toBe(3000);expect(b.elapsedMs).toBe(3000);
 expect(b.players.map(p=>p.pose)).toEqual(a.players.map(p=>p.pose));
});

it('resolves two moving robots on the authoritative shared field',()=>{
 const s=prepare(),movement='void loop(){LbMotion.runLR(2000,2000);LbDelay(3000);LbMission.end();}';
 for(const id of ['a','b'])command(s,id,{action:'lock-code',code:movement});
 command(s,'a',{action:'reveal'});command(s,'a',{action:'start'});
 s.players.get('a')!.robot.applyNetworkPose({x:500,y:600,heading:0});
 s.players.get('b')!.robot.applyNetworkPose({x:780,y:600,heading:180});
 s.advanceWall(0,Infinity);s.advanceWall(3000,Infinity);
 const [a,b]=s.snapshot().players;expect(b.pose.x-a.pose.x).toBeGreaterThanOrEqual(175.99);
 expect(a.pose.x).toBeGreaterThan(500);expect(b.pose.x).toBeLessThan(780);
});

it('does not truncate long online preparation programs at 120 seconds',()=>{
 const s=new OnlineCompetition('a',['a']);command(s,'a',{action:'announce'});
 const start=s.snapshot().players[0].pose;
 command(s,'a',{action:'practice-run',code:'void loop(){LbDelay(125000);LbMotion.runLR(2000,2000);LbDelay(1000);LbMission.end();}'});
 s.advanceWall(0,Infinity);s.advanceWall(126000,Infinity);
 const player=s.snapshot().players[0];expect(player.programRunning).toBe(false);
 expect(player.pose.y).toBeCloseTo(start.y-65,4);expect(player.simulationTimeMs).toBe(126000);expect(s.flow.phase).toBe('preparation');
 expect(s.flow.records).toHaveLength(0);expect(s.elapsedMs).toBe(0);
},20000);

it('shares virtual IoT by asset within a session and clears it on field reset',()=>{
 const s=prepare();
 const source=(asset:string,send=false)=>`auto c=LbIoT.Asset.attribute(F("Color"));void setup(){LbIoT.Asset.begin(F("${asset}"));}void loop(){${send?'c.write("Blue");':'LbDelay(10);if(c.read()=="Blue"){LbRGB.fillColor(CRGB::Blue);LbRGB.show();}'}LbMission.end();}`;
 command(s,'a',{action:'practice-run',code:source('team',true)});
 command(s,'b',{action:'practice-run',code:source('team')});
 s.advanceWall(0,Infinity);s.advanceWall(50,Infinity);
 expect(s.snapshot().players.find(p=>p.id==='b')?.rgb).toEqual([0,0,255]);
 command(s,'b',{action:'practice-run',code:source('other')});s.advanceWall(100,Infinity);
 expect(s.snapshot().players.find(p=>p.id==='b')?.rgb).toEqual([0,0,0]);
 command(s,'a',{action:'practice-reset'});
 command(s,'b',{action:'practice-run',code:source('team')});s.advanceWall(0,Infinity);s.advanceWall(50,Infinity);
 expect(s.snapshot().players.find(p=>p.id==='b')?.rgb).toEqual([0,0,0]);
});
