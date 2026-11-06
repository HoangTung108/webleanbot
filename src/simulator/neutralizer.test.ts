import {describe,expect,it,vi} from 'vitest';
import {SYNAPSE_CITY} from './boardConfigs';
import {MissionWorld,blockFootprint,drawMissionBlocks} from './missionWorld';

describe('neutralizer dimensions and Storage pickup',()=>{
  for(const site of SYNAPSE_CITY.storageSites!) for(const offset of [-2,0,2]) {
    it(`picks up ${site.id} with lateral offset ${offset} mm`,()=>{
      const world=new MissionWorld(SYNAPSE_CITY);
      const block=world.place('neutralizer','green',site.x,site.y);
      const heading=site.id==='S1'||site.id==='S3'||site.id==='S5'?90:0;
      const a=heading*Math.PI/180;
      const pose={x:site.x-75*Math.cos(a)-offset*Math.sin(a),y:site.y-75*Math.sin(a)+offset*Math.cos(a),heading};
      expect(blockFootprint(block)).toEqual({length:15,width:25});
      world.setGripper(90,90,pose);
      expect(block.held).toBe(true);
      world.step(.1,pose);
      expect(block.held).toBe(true);
    });
  }
  for(const tilt of [0,Math.PI/2]) it(`renders the same footprint as collisions at tilt ${tilt}`,()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('neutralizer')[0];
    const b=world.place('neutralizer','purple',site.x,site.y);b.tilt=tilt;
    const ctx={save:vi.fn(),restore:vi.fn(),translate:vi.fn(),rotate:vi.fn(),fillRect:vi.fn(),strokeRect:vi.fn()} as unknown as CanvasRenderingContext2D;
    drawMissionBlocks(ctx,world);
    const shape=blockFootprint(b);
    expect(ctx.strokeRect).toHaveBeenCalledWith(-shape.length/2,-shape.width/2,shape.length,shape.width);
    // Body, highlight and white band are all contained by the collider. Skip the shadow.
    for(const [x,y,w,h] of vi.mocked(ctx.fillRect).mock.calls.slice(1)) {
      expect(x).toBeGreaterThanOrEqual(-shape.length/2);
      expect(y).toBeGreaterThanOrEqual(-shape.width/2);
      expect(x+w).toBeLessThanOrEqual(shape.length/2);
      expect(y+h).toBeLessThanOrEqual(shape.width/2);
    }
  });
  it('accepts a small alignment error when both fingers can reach the narrow face',()=>{
    const world=new MissionWorld(SYNAPSE_CITY),site=world.slots('neutralizer')[0];
    const b=world.place('neutralizer','blue',site.x,site.y);
    b.x=675;b.y=902;b.rotation=90;
    world.setGripper(90,90,{x:600,y:900,heading:0});
    expect(b.held).toBe(true);
  });
});
