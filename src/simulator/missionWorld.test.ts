import { describe, expect, it } from 'vitest';
import { LEANBOT_GEOMETRY } from './robotGeometry';
import { SYNAPSE_CITY } from './boardConfigs';
import { BLOCK_SIZE, MissionWorld, NEUTRALIZER_COLORS, blockFootprint } from './missionWorld';
const pose = { x: 600, y: 900, heading: 0 };
function oneBlock() {
  const world = new MissionWorld(SYNAPSE_CITY);
  const slot = world.slots('pollution')[0];
  return { world, block: world.place('pollution','red',slot.x,slot.y) };
}
describe('mission layout', () => {
  it('persists contact settings and loads older missions with defaults', () => {
    const {world}=oneBlock();
    world.setContactSetting('spinFriction',2);world.setContactSetting('gripFriction',0.5);world.setContactSetting('restitution',0.6);
    const loaded=new MissionWorld(SYNAPSE_CITY);loaded.load(world.serialize());
    expect([loaded.spinFriction,loaded.gripFriction,loaded.restitution]).toEqual([2,0.5,0.6]);
    const old=JSON.parse(world.serialize());delete old.spinFriction;delete old.gripFriction;delete old.restitution;
    loaded.load(JSON.stringify(old));expect([loaded.spinFriction,loaded.gripFriction,loaded.restitution]).toEqual([1,1,0.1]);
    const before=loaded.serialize();expect(()=>loaded.load(JSON.stringify({...old,gripFriction:-1}))).toThrow();expect(loaded.serialize()).toBe(before);
  });
  it('applies the extra spin friction to block motion independently of sliding', () => {
    const slow=oneBlock(),fast=oneBlock();
    slow.world.setContactSetting('spinFriction',0);fast.world.setContactSetting('spinFriction',3);
    slow.block.spin=100;fast.block.spin=100;
    slow.world.step(0.1,pose);fast.world.step(0.1,pose);
    expect(slow.block.spin).toBe(100);expect(fast.block.spin).toBeLessThan(50);
    expect(()=>fast.world.setContactSetting('friction',NaN)).toThrow();
    fast.world.resetContactSettings();expect(fast.world.spinFriction).toBe(1);
  });
  it('places all requested blocks at unique legal sites with type-specific colors', () => {
    const world = new MissionWorld(SYNAPSE_CITY); world.randomize(8,6,123);
    expect(world.blocks).toHaveLength(14);
    expect(new Set(world.blocks.map(b=>b.slotId)).size).toBe(14);
    for(const b of world.blocks) {
      expect(world.slots(b.kind).some(s=>s.id===b.slotId)).toBe(true);
      if(b.kind==='neutralizer')expect(NEUTRALIZER_COLORS).toContain(b.color);
    }
    expect(BLOCK_SIZE).toEqual({length:15,width:25,height:75});
    const layout=world.blocks.map(({id,...b})=>b);
    world.randomize(8,6,123);expect(world.blocks.map(({id,...b})=>b)).toEqual(layout);
  });
  it('rejects invalid counts, occupied sites and neutralizers outside Storage', () => {
    const {world,block}=oneBlock(); const snapshot=world.serialize();
    expect(()=>world.randomize(33,0)).toThrow();expect(world.serialize()).toBe(snapshot);
    expect(()=>world.place('pollution','blue',block.x,block.y)).toThrow();
    expect(()=>world.place('neutralizer','green',block.x,block.y)).toThrow('Storage');
    const storage=world.slots('neutralizer')[0];
    expect(()=>world.place('neutralizer','red',storage.x,storage.y)).toThrow('color');
  });
  it('saves, restores and resets a custom task independently of its run state', () => {
    const world=new MissionWorld(SYNAPSE_CITY);world.randomize(8,3,5);world.friction=.5;
    const saved=world.serialize(), restored=new MissionWorld(SYNAPSE_CITY);restored.load(saved);
    expect(restored.blocks.map(b=>[b.kind,b.color,b.slotId])).toEqual(world.blocks.map(b=>[b.kind,b.color,b.slotId]));
    expect(restored.friction).toBe(.5);
    restored.blocks[0].x+=100;restored.blocks[0].held=true;restored.reset();
    expect(restored.blocks[0].x).toBe(world.blocks[0].x);expect(restored.blocks[0].held).toBe(false);
    expect(()=>restored.load('{"version":1,"friction":0.5,"blocks":[{}]}')).toThrow();
  });
});
describe('gripping and block physics', () => {
  it('requires a nearby block, carries only one, rotates it and releases at the carried position', () => {
    const {world,block}=oneBlock();block.x=pose.x+LEANBOT_GEOMETRY.graspOffset;block.y=pose.y;block.rotation=0;
    world.setGripper(90,90,{...pose,y:pose.y+100});expect(world.heldBlock).toBeUndefined();
    world.setGripper(0,0,pose);world.setGripper(90,90,pose);expect(world.heldBlock?.id).toBe(block.id);
    world.step(1,{...pose,x:650,heading:90}); // bounded angular acceleration, not a 90-degree teleport in 10 ms
    expect(block.x).toBeCloseTo(650);expect(block.y).toBeCloseTo(pose.y+LEANBOT_GEOMETRY.graspOffset);expect(block.rotation).toBe(90);
    world.setGripper(0,0,{...pose,x:650,heading:90});
    expect(block.held).toBe(false);expect(block.state).toBe('standing');
    expect(block.x).toBeCloseTo(650);expect(block.y).toBeCloseTo(pose.y+LEANBOT_GEOMETRY.graspOffset);
  });
  it('requires a much tighter, settled and aligned grip for a low fallen block', () => {
    const {world,block}=oneBlock();
    Object.assign(block,{x:pose.x+LEANBOT_GEOMETRY.graspOffset+10,y:pose.y,rotation:0});
    world.setGripper(90,90,pose);expect(block.held).toBe(true);
    world.setGripper(0,0,pose);
    Object.assign(block,{state:'fallen',tilt:Math.PI/2,x:pose.x+LEANBOT_GEOMETRY.graspOffset+10});
    world.setGripper(90,90,pose);expect(block.held).toBe(false);
    world.setGripper(0,0,pose);block.x=pose.x+LEANBOT_GEOMETRY.graspOffset;block.rotation=90;
    world.setGripper(90,90,pose);expect(block.held).toBe(false);
    world.setGripper(0,0,pose);block.rotation=0;
    world.setGripper(90,90,pose,70,70);expect(block.held).toBe(false);
    world.setGripper(0,0,pose);block.vx=20;
    world.setGripper(90,90,pose);expect(block.held).toBe(false);
    world.setGripper(0,0,pose);block.vx=0;
    world.setGripper(90,90,pose);expect(block.held).toBe(true);
    expect(block.state).toBe('fallen');
  });
  it('applies Coulomb friction and settles a released moving block horizontally', () => {
    const {world,block}=oneBlock();block.x=pose.x+LEANBOT_GEOMETRY.graspOffset;block.y=900;block.rotation=0;world.setGripper(90,90,pose);
    world.setGripper(0,0,pose,200,200);expect(block.state).toBe('falling');
    const initialSpeed=Math.hypot(block.vx,block.vy);expect(initialSpeed).toBeCloseTo(200);
    world.syncPose({x:900,y:500,heading:0});
    world.step(.005,{x:900,y:500,heading:0});expect(Math.hypot(block.vx,block.vy)).toBeLessThan(initialSpeed);
    world.step(1,{x:900,y:500,heading:0});
    expect(block.state).toBe('fallen');expect(blockFootprint(block).length).toBeCloseTo(75);
    expect(Math.hypot(block.vx,block.vy)).toBe(0);
  });
  it('pushes and topples a standing block on a moving chassis impact', () => {
    const {world,block}=oneBlock();block.x=639;block.y=900;block.rotation=0;
    world.step(.005,pose,70,70);
    expect(block.vx).toBeGreaterThan(0);expect(block.state).toBe('falling');
    world.step(1,{x:900,y:500,heading:0});expect(block.state).toBe('fallen');
  });
  it('resolves block collisions and lets unsupported blocks fall outside the mat', () => {
    const world=new MissionWorld(SYNAPSE_CITY);world.randomize(2,0,1);
    const [a,b]=world.blocks;Object.assign(a,{x:500,y:500,rotation:0,vx:70});Object.assign(b,{x:510,y:500,rotation:0});
    world.friction=0;world.step(.005,{x:900,y:900,heading:0});
    expect(b.vx).toBeGreaterThan(0);expect(b.x-a.x).toBeGreaterThanOrEqual(15-1e-6);
    Object.assign(a,{x:-100,y:-100,state:'fallen',tilt:Math.PI/2,rotation:0});world.step(.005,{x:900,y:900,heading:0});
    expect(a.offBoard).toBe(true);expect(a.x).toBeLessThan(0);expect(a.y).toBeLessThan(0);
  });
  it('detects upright mission blocks with ultrasound but ignores held or low fallen blocks', () => {
    const {world,block}=oneBlock();Object.assign(block,{x:700,y:900,rotation:0});
    expect(world.distance(pose)).toBeCloseTo(52.5);
    block.held=true;expect(world.distance(pose)).toBe(300);
    block.held=false;block.state='fallen';block.tilt=Math.PI/2;expect(world.distance(pose)).toBe(300);
  });

});
