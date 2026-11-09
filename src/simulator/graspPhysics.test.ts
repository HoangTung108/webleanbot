import {describe,expect,it} from 'vitest';
import {MissionWorld} from './missionWorld';
import {SYNAPSE_CITY} from './boardConfigs';
import {LEANBOT_GEOMETRY} from './robotGeometry';
const pose={x:600,y:900,heading:0};
function scene(x=676,y=901,rotation=0){
  const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('pollution')[0];
  const block=world.place('pollution','red',site.x,site.y);Object.assign(block,{x,y,rotation});return {world,block};
}
describe('grasp contact and rigid attachment regressions',()=>{
  it('tests the actual block position and binds without snapping its centre',()=>{
    const {world,block}=scene();world.setGripper(90,90,pose);
    expect(block.held).toBe(true);expect(block.x).toBe(676);expect(block.y).toBe(901);
    world.step(1,{...pose,heading:90});
    expect(block.held).toBe(true);expect(block.x).toBeCloseTo(599);expect(block.y).toBeCloseTo(976);
  });
  it('does not combine separate one-sided contacts into a false grasp',()=>{
    const {world,block}=scene(675,892);
    const site=SYNAPSE_CITY.cityZones![1].sites[0],other=world.place('pollution','blue',site.x,site.y);
    Object.assign(other,{x:675,y:908,rotation:0});world.setGripper(90,90,pose);
    expect(block.held).toBe(false);expect(other.held).toBe(false);
    const actual=world.getGripperAngles(pose);expect(actual.left).toBeLessThan(90);expect(actual.right).toBeLessThan(90);
  });
  it('keeps a one-sided nearby block free rather than attracting it',()=>{
    const {world,block}=scene(675,908);world.setGripper(90,90,pose);
    expect(block.held).toBe(false);expect(block.x).toBe(675);expect(block.y).toBe(908);
  });
  it('releases at the current offset with linear AND angular velocity',()=>{
    const {world,block}=scene();world.setGripper(90,90,pose);
    world.setGripper(0,0,pose,70,-70);
    const omega=140/LEANBOT_GEOMETRY.wheelBase;
    expect(block.held).toBe(false);expect(block.x).toBe(676);expect(block.y).toBe(901);
    expect(block.vx).toBeCloseTo(-omega);expect(block.vy).toBeCloseTo(76*omega);
    expect(block.spin).toBeCloseTo(omega*180/Math.PI);
  });
  it('does not topple every block released at a low speed',()=>{
    const {world,block}=scene(675,900);world.setGripper(90,90,pose);world.setGripper(0,0,pose,70,70);
    expect(block.state).toBe('standing');world.syncPose({x:900,y:500,heading:0});world.step(1,{x:900,y:500,heading:0});
    expect(block.state).toBe('standing');expect(Math.hypot(block.vx,block.vy)).toBe(0);
  });
  it('keeps a held block attached through abrupt motor changes and rotation',()=>{
    const {world,block}=scene(675,900);Object.assign(block,{state:'fallen',tilt:Math.PI/2});
    world.setGripper(90,90,pose);expect(block.held).toBe(true);
    world.step(.005,pose,70,70);expect(block.held).toBe(true);
    world.step(.02,{x:605,y:900,heading:90},-70,70);
    expect(block.held).toBe(true);
    expect(block.x).toBeCloseTo(605);
    expect(block.y).toBeCloseTo(975);
  });
  it('does not bounce an unsupported released block back onto the mat',()=>{
    const {world,block}=scene(675,900);world.setGripper(90,90,pose);
    const edge={x:SYNAPSE_CITY.width+10,y:600,heading:0};world.syncPose(edge);world.setGripper(0,0,edge,70,0);
    const x=block.x;world.step(.5,edge);
    expect(block.offBoard).toBe(true);expect(block.x).toBeGreaterThanOrEqual(x);
    expect(block.elevation).toBe(-750);expect(world.hasMotion).toBe(false);
  });
  it('breaks a finite-strength grip instead of making it an infinite bulldozer',()=>{
    const {world,block}=scene(675,900);world.setGripper(90,90,pose,500,500);expect(block.held).toBe(true);
    const site=SYNAPSE_CITY.cityZones![1].sites[0],other=world.place('pollution','blue',site.x,site.y);
    Object.assign(other,{x:688,y:900,rotation:0});world.step(.005,pose,500,500);
    expect(block.held).toBe(false);expect(Number.isFinite(other.vx)).toBe(true);
  });
});

describe('pickup away from the old fixed centre gate',()=>{
  it('captures a reachable narrow-face block beyond the old 12 mm radius',()=>{
    const {world,block}=scene(663,901,90);
    world.setGripper(90,90,pose);
    expect(block.held).toBe(true);
    expect(block.x).toBe(663);
  });
});

describe('bilateral contact tolerance',()=>{
  it('holds at the contact angles without requiring the servo to push through',()=>{
    const {world,block}=scene(676,901);
    world.setGripper(90,90,pose);
    const contact=world.getGripperAngles(pose);
    world.setGripper(0,0,pose);
    world.setGripper(contact.left-.1,contact.right-.1,pose);
    expect(block.held).toBe(true);
    world.step(.05,pose);
    expect(block.held).toBe(true);
    world.setGripper(contact.left-2,contact.right-2,pose);
    expect(block.held).toBe(false);
  });
  it('still rejects a grasp when only one finger has reached the object',()=>{
    const {world,block}=scene();
    world.setGripper(90,30,pose);
    expect(block.held).toBe(false);
  });
});

describe('grip stability with 1 ms feedback loops',()=>{
  it.each([.001,.002,.005,.01])('keeps an upright block on motor start/stop with %s s physics steps',dt=>{
    const {world,block}=scene(675,900);
    world.setGripper(90,90,pose);expect(block.held).toBe(true);
    for(const speed of [65,0,-65,0]) for(let i=0;i<20;i++) {
      world.step(dt,pose,speed,speed);
      expect(block.held).toBe(true);
    }
  });
});

describe('shared mission grip ownership',()=>{
 it('allows two robots to hold separate blocks without stealing or releasing each other',()=>{
  const a=new MissionWorld(SYNAPSE_CITY,'a'),b=new MissionWorld(SYNAPSE_CITY,'b');b.blocks=a.blocks;b.integrateFreeBodies=false;
  const sites=a.slots('pollution');
  const first=a.place('pollution','red',sites[0].x,sites[0].y),second=a.place('pollution','blue',sites[4].x,sites[4].y);
  Object.assign(first,{x:676,y:901,rotation:0});Object.assign(second,{x:876,y:901,rotation:0});
  a.setGripper(90,90,pose);b.setGripper(90,90,pose);
  expect(a.heldBlock?.id).toBe(first.id);expect(b.heldBlock).toBeUndefined();
  b.setGripper(0,0,{...pose,x:800});b.setGripper(90,90,{...pose,x:800});
  expect(b.heldBlock?.id).toBe(second.id);expect(first.heldBy).toBe('a');expect(second.heldBy).toBe('b');
  b.setGripper(0,0,{...pose,x:800});expect(first.held).toBe(true);expect(second.held).toBe(false);
 });
 it('integrates free-body gravity only once across shared robot views',()=>{
  const a=new MissionWorld(SYNAPSE_CITY,'a'),b=new MissionWorld(SYNAPSE_CITY,'b');b.blocks=a.blocks;b.integrateFreeBodies=false;
  const site=a.slots('pollution')[0],block=a.place('pollution','red',site.x,site.y);
  Object.assign(block,{offBoard:true,elevation:0,verticalVelocity:0,x:1300,y:600});
  a.step(.005,pose);const height=block.elevation;b.step(.005,{...pose,x:900});expect(block.elevation).toBe(height);
 });
});
