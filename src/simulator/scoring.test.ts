import { describe, expect, it } from 'vitest';
import { SYNAPSE_CITY } from './boardConfigs';
import { MissionWorld, type MissionBlock } from './missionWorld';
import { calculateScore, createScoringMission, SCORE_CATEGORIES, normalizeScore, type ScoreCategory } from './scoring';

function block(id:string,color:MissionBlock['color'],kind:MissionBlock['kind']='pollution'):MissionBlock {
  return {id,color,kind,originZone:kind==='pollution'?'A':undefined,x:259.6,y:259.6,rotation:0,tilt:0,tipSpeed:0,vx:0,vy:0,spin:0,state:'standing',held:false,mass:.025};
}
const score=(blocks:MissionBlock[],category:ScoreCategory='explorer')=>calculateScore(SYNAPSE_CITY,blocks,category,[]);
describe('Rulebook V6 scoring',()=>{
  it('scores one same-colour pair once, excluding the replaced 45 points',()=>{
    const p=block('p','green'),n=block('n','green','neutralizer');
    expect(score([p,n])).toMatchObject({pairs:1,neutralization:160,containment:0,total:160});
    expect(score([p,{...n,color:'blue'}])).toMatchObject({pairs:0,containment:45,total:45});
    expect(score([p,{...p,id:'p2'},n])).toMatchObject({pairs:1,containment:45,total:205});
  });
  it('accepts partial ground contact, including robot contact, but not lifted blocks or wrong cities',()=>{
    const p=block('p','green');
    expect(score([p]).total).toBe(45);
    expect(score([{...p,held:true}]).total).toBe(45);
    expect(score([{...p,held:true,elevation:10}]).total).toBe(0);
    expect(score([{...p,x:259.6+95}]).total).toBe(45);
    expect(score([{...p,x:259.6+120}]).total).toBe(0);
    expect(score([{...p,originZone:'B'}]).total).toBe(0);
  });
  it('scores all pollution colours for analysis and substitutes Master Mystery points',()=>{
    const red={...block('red','red'),x:959.6,y:959.6};
    const mystery={...red,id:'m',color:'mystery' as const};
    expect(score([red,{...red,id:'y',color:'yellow'}]).analysis).toBe(200);
    expect(score([{...red,color:'green'}]).total).toBe(100);
    expect(score([{...red,color:'blue'}]).total).toBe(100);
    expect(score([{...red,color:'purple'}]).total).toBe(100);
    expect(score([{...red,x:SYNAPSE_CITY.analysisArea!.x-SYNAPSE_CITY.analysisArea!.width/2-7.5}]).total).toBe(0); // touches only the edge, not inner colour
    expect(score([{...red,x:SYNAPSE_CITY.analysisArea!.x-SYNAPSE_CITY.analysisArea!.width/2-2.5}]).total).toBe(100); // partial overlap with inner CRL
    expect(score([mystery]).total).toBe(0);
    expect(score([mystery],'master').mystery).toBe(150);
  });
  it('requires whole robot return, rejects falls, and caps robot count by category',()=>{
    const pose={x:959.6,y:959.6,heading:0};
    expect(calculateScore(SYNAPSE_CITY,[],'explorer',[{pose,startPose:pose},{pose,startPose:pose}]).returned).toBe(40);
    expect(calculateScore(SYNAPSE_CITY,[],'innovator',[{pose,startPose:pose},{pose,startPose:pose}]).returned).toBe(80);
    expect(calculateScore(SYNAPSE_CITY,[],'master',[{pose,startPose:pose,fallen:true}]).returned).toBe(0);
    expect(calculateScore(SYNAPSE_CITY,[],'master',Array(3).fill({pose,startPose:pose})).returned).toBe(80);
    expect(calculateScore(SYNAPSE_CITY,[],'explorer',[{pose,startPose:{x:500,y:500,heading:0}}]).returned).toBe(0);
    expect(calculateScore(SYNAPSE_CITY,[],'explorer',[{pose:{...pose,x:1090},startPose:pose}]).returned).toBe(0);
  });
  it.each(Object.keys(SCORE_CATEGORIES) as ScoreCategory[])('creates and restores the exact %s preset',category=>{
    const world=new MissionWorld(SYNAPSE_CITY),preset=SCORE_CATEGORIES[category];createScoringMission(world,category,123);
    expect(world.blocks.filter(b=>b.kind==='pollution').map(b=>b.color)).toEqual([...preset.pollution]);
    expect(world.blocks.filter(b=>b.kind==='neutralizer').map(b=>b.color)).toEqual([...preset.neutralizers]);
    expect(new Set(world.blocks.filter(b=>b.kind==='pollution').map(b=>b.originZone)).size).toBe(preset.pollution.length);
    world.reset();expect(world.blocks).toHaveLength(preset.pollution.length+preset.neutralizers.length);
    expect(world.blocks.filter(b=>b.color==='mystery')).toHaveLength(category==='master'?1:0);
  });
  it('normalizes using the official Top 5 example without a 1000-point cap',()=>{
    const result=normalizeScore(535,[535,530,390,140,125]);
    expect(result.baseTopScore).toBe(344);expect(result.normalized).toBeCloseTo(1555.2,1);
    expect(()=>normalizeScore(100,[1,2])).toThrow();
    expect(()=>normalizeScore(100,[0,0,0,0,0])).toThrow();
  });
  it('preserves an organizer-specified fixed pollution site and origin on reset',()=>{
    const world=new MissionWorld(SYNAPSE_CITY);createScoringMission(world,'master',42,'H3');
    expect(world.blocks[0].slotId).toBe('H3');expect(world.blocks[0].originZone).toBe('H');
    world.blocks[0].slotId=undefined;world.blocks[0].x=100;world.reset();
    expect(world.blocks[0].slotId).toBe('H3');expect(world.blocks[0].originZone).toBe('H');
  });

});
