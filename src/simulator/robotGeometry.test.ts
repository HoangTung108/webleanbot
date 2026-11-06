import {describe,expect,it} from 'vitest';
import {fitGripperToBlock,gripperJaw,gripperOpening,LEANBOT_GEOMETRY} from './robotGeometry';
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
    expect(gripperOpening(0,0)).toBeGreaterThan(65);
    expect(gripperOpening(90,90)).toBeCloseTo(25.5,0);
    expect(gripperOpening(90,0)).toBeGreaterThan(40);
  });
  it('requires actual jaw closure rather than capturing a block at 55 degrees',()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('pollution')[0];
    const block=world.place('pollution','red',site.x,site.y),pose={x:site.x-75,y:site.y,heading:0};
    world.setGripper(55,55,pose);expect(block.held).toBe(false);
    world.setGripper(90,0,pose);expect(block.held).toBe(false);
    world.setGripper(90,90,pose);expect(block.held).toBe(true);
    world.setGripper(55,55,pose);expect(block.held).toBe(false);
    block.rotation=90;world.setGripper(90,90,pose);expect(block.held).toBe(false); // neither jaw reaches the narrow face
  });
  it('stops both fingers at contact with a rotated/wider block',()=>{
    const fitted=fitGripperToBlock(90,90,28.3);
    expect(fitted.left).toBeLessThan(90);expect(fitted.left).toBeGreaterThan(80);
    expect(gripperOpening(fitted.left,fitted.right)).toBeCloseTo(28.8,5);
    const angled=fitGripperToBlock(90,90,28.3,{length:15,width:25,rotation:45});
    expect(angled.left).toBeLessThan(90);expect(angled.right).toBeLessThan(90);
    expect(Math.abs(angled.left-angled.right)).toBeGreaterThan(.1);
    const wide=fitGripperToBlock(90,90,50);
    expect(wide.left).toBeLessThan(40); // first contact, before the fork notch crosses
    for(let t=0;t<=1;t+=.1)expect(gripperOpening(wide.left*t,wide.right*t)).toBeGreaterThanOrEqual(50.5-1e-6);
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
