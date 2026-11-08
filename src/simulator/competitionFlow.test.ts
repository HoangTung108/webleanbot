import {describe,expect,it} from 'vitest';
import {CompetitionFlow} from './competitionFlow';
import {MissionWorld} from './missionWorld';
import {SYNAPSE_CITY} from './boardConfigs';
import {calculateScore} from './scoring';
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';
const pose=SYNAPSE_CITY.initialPose!;
describe('Gameplay document two-round competition flow',()=>{
 it.each(['explorer','creator','innovator','master'] as const)('announces the correct color visibility and restores the fixed %s layout',category=>{
  const world=new MissionWorld(SYNAPSE_CITY),flow=new CompetitionFlow();flow.announce(world,category,42);
  expect(world.hidePollutionColors).toBe(['innovator','master'].includes(category));
  const before=world.blocks.map(b=>({kind:b.kind,slot:b.slotId,x:b.x,y:b.y}));
  expect(()=>flow.start(world)).toThrow();flow.quarantine(world,'void loop(){LbMission.end();}',pose);
  expect(flow.locked).toBe(true);flow.reveal(world,84);
  expect(world.hidePollutionColors).toBe(false);
  expect(world.blocks.map(b=>({kind:b.kind,slot:b.slotId,x:b.x,y:b.y}))).toEqual(before);
  expect(world.blocks.filter(b=>b.color==='mystery')).toHaveLength(category==='master'?1:0);
  world.blocks[0].x+=100;const start=flow.start(world);
  expect(start.code).toContain('LbMission.end');expect(start.pose).toEqual(pose);
  expect(world.blocks[0].x).toBe(before[0].x);
 });
 it('requires valid code and a whole robot in CRL before locking, then preserves the snapshot',()=>{
  const world=new MissionWorld(SYNAPSE_CITY),flow=new CompetitionFlow();flow.announce(world,'explorer',1);
  expect(()=>flow.quarantine(world,'',pose)).toThrow('C++');
  expect(()=>flow.quarantine(world,'code',{x:100,y:100,heading:0})).toThrow('CRL');
  flow.quarantine(world,'original code',pose);expect(flow.frozenCode).toBe('original code');
  expect(()=>flow.quarantine(world,'replacement',pose)).toThrow();expect(flow.frozenCode).toBe('original code');
 });
 it('records exactly two rounds and uses different locations even if the seed repeats',()=>{
  const world=new MissionWorld(SYNAPSE_CITY),flow=new CompetitionFlow();
  const configs:string[]=[];
  for(let round=1;round<=2;round++){
   flow.announce(world,'master',1);configs.push(world.blocks.map(b=>b.slotId).sort().join('|'));
   flow.quarantine(world,'code',pose);flow.reveal(world,1);flow.start(world);
   const score=calculateScore(SYNAPSE_CITY,world.blocks,'master',[]);flow.finish(score,120000,'Time limit');
   flow.finish(score,1,'duplicate');expect(flow.records).toHaveLength(round);flow.next();
  }
  expect(configs[0]).not.toBe(configs[1]);expect(flow.phase).toBe('complete');
  expect(()=>flow.announce(world,'master',2)).toThrow();
 });
 it('returns to the original CRL after preparation without mutating a saved start pose',()=>{
  const robot=new RobotSimulator(),original={...pose};robot.reset();robot.start();robot.setMotorSpeeds(65,65);robot.advanceSimulatedTime(1000);
  expect(SYNAPSE_CITY.initialPose).toEqual(original);robot.reset();expect(robot.getRobotPose()).toEqual(original);
  const custom={...original,heading:90};robot.reset(custom);robot.start();robot.setMotorSpeeds(65,65);robot.advanceSimulatedTime(1000);
  expect(custom).toEqual({...original,heading:90});robot.reset(custom);expect(robot.getRobotPose()).toEqual(custom);
 });
 it('keeps the competition clock and physics running after C++ ends, but not in free practice',()=>{
  for(const official of [false,true]){
   const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot);bridge.loadCode('void loop(){LbMission.end();}');
   robot.start();bridge.startExecution(0,{keepRoundClock:official});bridge.executeStep(1000);
   expect(bridge.isProgramRunning()).toBe(false);expect(bridge.isExecuting()).toBe(official);
   expect(robot.getSimulationState().currentTime).toBe(official?1000:0);
   if(official){bridge.executeStep(120000);expect(bridge.getCompletionReason()).toBe('time-limit');expect(robot.getSimulationState().currentTime).toBe(120000);expect(bridge.isExecuting()).toBe(false);}
  }
 });
});
