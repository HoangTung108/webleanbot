import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { MissionWorld } from './missionWorld';
import { mountMissionEditor } from './missionEditor';
import { SYNAPSE_CITY } from './boardConfigs';
let dispose=()=>{};
beforeEach(()=>localStorage.clear());
afterEach(()=>{dispose();document.body.replaceChildren();vi.unstubAllGlobals();});
function setup() {
  vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
  const host=document.createElement('div'),canvas=document.createElement('canvas');document.body.append(host,canvas);
  const world=new MissionWorld(SYNAPSE_CITY);let locked=false;
  dispose=mountMissionEditor(host,world,{canvas,toBoard:(x,y)=>({x,y}),locked:()=>locked,pose:()=>({x:900,y:900,heading:0}),render:()=>{}});
  const pointer=(type:string,x:number,y:number)=>canvas.dispatchEvent(new MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0}));
  return {host,canvas,world,pointer,lock:()=>{locked=true;world.changed();}};
}
describe('mission setup controls',()=>{
  it('creates and moves custom blocks using canvas placement without moving the robot',()=>{
    const {host,canvas,world,pointer}=setup(),site=world.slots('pollution')[0],next=world.slots('pollution')[1];
    const robotHandler=vi.fn();canvas.addEventListener('pointerdown',robotHandler);
    fireEvent.click(host.querySelector('[aria-label="red pollution"]')!);
    pointer('pointerdown',site.x,site.y);
    expect(world.blocks[0]).toMatchObject({color:'red',slotId:site.id});expect(robotHandler).not.toHaveBeenCalled();
    pointer('pointerdown',site.x,site.y);pointer('pointermove',next.x,next.y);pointer('pointerup',next.x,next.y);
    expect(world.blocks[0].slotId).toBe(next.id);world.reset();expect(world.blocks[0].slotId).toBe(next.id);
  });
  it('snaps HTML drag/drop neutralizers to Storage and randomizes chosen counts',()=>{
    const {host,canvas,world}=setup(),storage=world.slots('neutralizer')[3];
    const dataTransfer={getData:()=>JSON.stringify({kind:'neutralizer',color:'blue'}),types:['application/x-leanbot-mission-block']};
    const event=new Event('drop',{bubbles:true,cancelable:true});Object.assign(event,{clientX:storage.x,clientY:storage.y,dataTransfer});canvas.dispatchEvent(event);
    expect(world.blocks[0]).toMatchObject({kind:'neutralizer',color:'blue',slotId:storage.id});
    fireEvent.input(host.querySelector('[data-count="pollution"]')!,{target:{value:'5'}});
    fireEvent.input(host.querySelector('[data-count="neutralizer"]')!,{target:{value:'2'}});
    fireEvent.click(host.querySelector('[data-action="random"]')!);
    expect(world.blocks.filter(b=>b.kind==='pollution')).toHaveLength(5);expect(world.blocks.filter(b=>b.kind==='neutralizer')).toHaveLength(2);
  });
  it('locks editing during a run and restores a cancelled drag',()=>{
    const {host,world,pointer,lock}=setup(),site=world.slots('pollution')[0];world.place('pollution','green',site.x,site.y);
    pointer('pointerdown',site.x,site.y);pointer('pointermove',800,800);pointer('pointercancel',800,800);
    expect(world.blocks[0].x).toBe(site.x);expect(world.blocks[0].y).toBe(site.y);
    lock();expect((host.querySelector('[data-action="random"]') as HTMLButtonElement).disabled).toBe(true);
    pointer('pointerdown',site.x,site.y);pointer('pointermove',500,500);expect(world.blocks[0].x).toBe(site.x);
  });
  it('restores the starting mission when returning from the IDE',()=>{
    const first=setup(),site=first.world.slots('pollution')[0];first.world.place('pollution','purple',site.x,site.y);
    dispose();document.body.replaceChildren();
    const second=setup();expect(second.world.blocks).toHaveLength(1);
    expect(second.world.blocks[0]).toMatchObject({color:'purple',slotId:site.id,x:site.x,y:site.y,state:'standing'});
  });

});
