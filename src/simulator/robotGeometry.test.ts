import {describe,expect,it} from 'vitest';
import {gripperJaw,gripperOpening,LEANBOT_GEOMETRY} from './robotGeometry';
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
  });
  it('transfers a finite-mass impulse from the 400g chassis to a 25g block',()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('pollution')[0];
    const b=world.place('pollution','red',site.x,site.y);Object.assign(b,{x:639,y:900,rotation:0});
    world.step(.005,{x:600,y:900,heading:0},70,70);
    expect(b.vx).toBeCloseTo(72.4705882353,5);
  });
});
