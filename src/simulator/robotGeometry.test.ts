import {describe,expect,it} from 'vitest';
import {fitGripperToBlock,gripperJaw,LEANBOT_GEOMETRY,polygonsIntersect,jawBlockContact} from './robotGeometry';
import {RobotSimulator} from './robotSimulator';
import {MissionWorld} from './missionWorld';
import {SYNAPSE_CITY} from './boardConfigs';

describe('video-referenced Leanbot geometry',()=>{
  it('uses the supplied envelope and mass while deriving tyre track separately',()=>{
    expect(LEANBOT_GEOMETRY).toMatchObject({length:180,width:120,height:70,mass:.4});
    expect(LEANBOT_GEOMETRY.wheelBase+LEANBOT_GEOMETRY.wheel.width).toBe(120);
  });
  it('keeps both independent mirrored jaws within the physical envelope',()=>{
    for(const angle of [0,45,90]) {
      const left=gripperJaw(-1,angle),right=gripperJaw(1,angle);
      right.forEach((p,i)=>{
        expect(p.x).toBeCloseTo(left[i].x);expect(p.y).toBeCloseTo(-left[i].y);
        expect(p.x).toBeLessThanOrEqual(88);expect(Math.abs(p.y)).toBeLessThanOrEqual(60);
      });
    }
    const normal=fitGripperToBlock(90,90,25,{length:15,width:25,rotation:0});
    expect(normal.left).toBeLessThan(90);expect(normal.right).toBeLessThan(90);
  });
  it('requires bilateral polygon contact and releases when either finger opens',()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('pollution')[0];
    const block=world.place('pollution','red',site.x,site.y),pose={x:site.x-75,y:site.y,heading:0};
    const contact=fitGripperToBlock(90,90,25,{length:15,width:25,rotation:block.rotation});
    const open=Math.min(contact.left,contact.right)-2;
    world.setGripper(open,open,pose);expect(block.held).toBe(false);
    world.setGripper(90,0,pose);expect(block.held).toBe(false);
    world.setGripper(90,90,pose);expect(block.held).toBe(true);
    world.setGripper(open,open,pose);expect(block.held).toBe(false);
    block.rotation=90;world.setGripper(90,90,pose);expect(block.held).toBe(true); // deeper closure reaches both sides of the narrow face
  });
  it('stops both fingers at contact with a rotated/wider block',()=>{
    const fitted=fitGripperToBlock(90,90,28.3);
    expect(fitted.left).toBeLessThan(90);expect(fitted.left).toBeGreaterThan(0);
    const angled=fitGripperToBlock(90,90,28.3,{length:15,width:25,rotation:45});
    expect(angled.left).toBeLessThan(90);expect(angled.right).toBeLessThan(90);
    expect(Math.abs(angled.left-angled.right)).toBeGreaterThan(.1);
    const wide=fitGripperToBlock(90,90,50);
    expect(wide.left).toBeLessThan(40); // first contact, before the fork notch crosses
    expect(wide.left).toBeLessThan(fitted.left);
  });
  it('animates a timed grip on the simulation clock, pauses and releases correctly',()=>{
    const robot=new RobotSimulator(),site=robot.mission.slots('pollution')[0];
    robot.reset({x:site.x-75,y:site.y,heading:0});
    const block=robot.mission.place('pollution','red',site.x,site.y);block.rotation=0;
    robot.start();robot.setGripper(90,90,100);robot.advanceSimulatedTime(50);
    expect(robot.getGripper().left).toBeCloseTo(45);expect(block.held).toBe(false);
    robot.pause();robot.advanceSimulatedTime(500);expect(robot.getGripper().left).toBeCloseTo(45);
    robot.resume();robot.advanceSimulatedTime(50);expect(block.held).toBe(true);
    robot.setGripper(0,0,100);robot.advanceSimulatedTime(50);expect(block.held).toBe(false);
    robot.advanceSimulatedTime(50);expect(robot.getGripper()).toEqual({left:0,right:0});
  });
  it('transfers a finite-mass impulse from the 400g chassis to a 25g block',()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('pollution')[0];
    const b=world.place('pollution','red',site.x,site.y);Object.assign(b,{x:639,y:900,rotation:0});
    world.step(.005,{x:600,y:900,heading:0},70,70);
    expect(b.vx).toBeCloseTo(72.4705882353,5);
  });
});

describe('precise finger and block hitboxes',()=>{
  it('pushes an unheld block intersecting an open finger rather than passing through it',()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('pollution')[0];
    const b=world.place('pollution','red',site.x,site.y);
    Object.assign(b,{x:680,y:935,rotation:0});
    world.step(.005,{x:600,y:900,heading:0});
    expect(Math.hypot(b.x-680,b.y-935)).toBeGreaterThan(0.1);
    expect(b.held).toBe(false);
  });
  it('recognizes edge contact and resolves overlap with the concave finger',()=>{
    const square=(x:number,y:number,size:number)=>[{x,y},{x:x+size,y},{x:x+size,y:y+size},{x,y:y+size}];
    expect(polygonsIntersect(square(0,0,10),square(10,0,10))).toBe(true);
    expect(polygonsIntersect(square(0,0,10),square(10.1,0,10))).toBe(false);
    const jaw=gripperJaw(1,0),block=square(75,34,4),hit=jawBlockContact(jaw,block)!;
    expect(hit).not.toBeNull();
    expect(polygonsIntersect(jaw,block.map(p=>({x:p.x+hit.nx*(hit.depth+.01),y:p.y+hit.ny*(hit.depth+.01)})))).toBe(false);
    expect(jawBlockContact(jaw,square(73,-4,8))).toBeNull();
  });
  it('does not select beyond the actual rotated block footprint',()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('pollution')[0];
    const b=world.place('pollution','red',site.x,site.y);b.rotation=0;
    expect(world.hit(b.x+9,b.y)).toBeUndefined();expect(world.hit(b.x+7,b.y)).toBe(b);
    b.rotation=90;expect(world.hit(b.x,b.y+9)).toBeUndefined();
  });
});

describe('servo movement from physical contact',()=>{
  it('opens immediately from each stopped jaw angle without waiting at the block',()=>{
    const robot=new RobotSimulator(),site=robot.mission.slots('pollution')[0];
    robot.reset({x:site.x-76,y:site.y-1,heading:0});
    const b=robot.mission.place('pollution','green',site.x,site.y);b.rotation=0;
    robot.start();robot.setGripper(90,90,100);robot.advanceSimulatedTime(100);
    expect(b.held).toBe(true);
    const before=robot.getGripper();
    expect(Math.abs(before.left-before.right)).toBeGreaterThan(1);
    robot.setGripper(0,0,100);robot.advanceSimulatedTime(10);
    expect(robot.getGripper().left).toBeCloseTo(before.left*.9,5);
    expect(robot.getGripper().right).toBeCloseTo(before.right*.9,5);
    expect(b.held).toBe(false);
    robot.advanceSimulatedTime(90);
    expect(robot.getGripper()).toEqual({left:0,right:0});
  });
  it('starts an interrupted motion at the visible angle without a jump',()=>{
    const robot=new RobotSimulator();robot.start();
    robot.setGripper(90,90,100);robot.advanceSimulatedTime(40);
    const before=robot.getGripper();robot.setGripper(0,0,100);
    expect(robot.getGripper()).toEqual(before);
    robot.advanceSimulatedTime(10);
    expect(robot.getGripper().left).toBeCloseTo(before.left*.9);
  });
});
