import { BLOCK_COLORS, NEUTRALIZER_COLORS, MissionWorld, type BlockColor, type BlockKind } from './missionWorld';
import type { Pose } from './types';

interface EditorOptions {
  canvas: HTMLCanvasElement; toBoard(x: number,y: number): { x: number;y: number };
  locked(): boolean; pose(): Pose; render(): void;
}
const MIME='application/x-leanbot-mission-block';
export function mountMissionEditor(host: HTMLElement, world: MissionWorld, options: EditorOptions): () => void {
  host.classList.add('mission-editor');
  host.innerHTML=`<h3>Mission blocks</h3>
    <div class="mission-tools"><button type="button" data-tool="robot" aria-pressed="true">Robot</button><button type="button" data-tool="erase" aria-pressed="false">Erase block</button></div>
    <p>Drag a color to a site, or select it and click the mat. Drag placed blocks to move them.</p>
    <strong>Pollution — solid color</strong><div class="mission-palette" data-palette="pollution"></div>
    <strong>Neutralizer — white stripe</strong><div class="mission-palette" data-palette="neutralizer"></div>
    <small>15 × 25 × 75 mm. Pollution: one per city, sites 1–4. Neutralizers: Storage S1–S6.</small>
    <div class="mission-counts"><label>Pollution <input data-count="pollution" aria-label="Pollution count" type="number" min="0" max="8" value="8"></label><label>Neutralizers <input data-count="neutralizer" aria-label="Neutralizer count" type="number" min="0" max="6" value="3"></label><label>Seed <input data-seed aria-label="Mission seed" type="number" step="1" placeholder="random"></label></div>
    <div class="mission-tools"><button type="button" data-action="random">Randomize layout</button><button type="button" data-action="clear">Clear blocks</button></div>
    <label>Friction <input data-friction aria-label="Block friction" type="range" min="0" max="1" step="0.05" value="${world.friction}"><output data-friction-value>${world.friction.toFixed(2)}</output></label>
    <div class="mission-tools"><button type="button" data-action="save">Download mission</button><button type="button" data-action="open">Open mission</button></div>
    <input data-file type="file" accept=".json" hidden>
    <small>2.5D physics approximation. Block mass: 25 g (estimated). Reset restores this layout.</small>
    <div data-summary></div><div data-message role="status" aria-live="polite"></div>`;
  let tool: 'robot'|'erase'|{kind:BlockKind;color:BlockColor}='robot';
  let drag: { id:string;x:number;y:number }|undefined;
  let frame=0,lastTime=performance.now(), disposed=false;
  const canvas=options.canvas;
  const query=<T extends HTMLElement>(selector:string)=>host.querySelector<T>(selector)!;
  const message=(text:string)=>{query('[data-message]').textContent=text;};
  const guarded=(fn:()=>void)=>{ if(options.locked()) return; try{fn();message('');options.render();}catch(e){message(e instanceof Error?e.message:String(e));} };
  let lastLocked:boolean|undefined;
  const controls=()=> {
    const locked=options.locked();lastLocked=locked;
    host.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input').forEach(el=>{if(el.disabled!==locked)el.disabled=locked;});
    query('[data-summary]').textContent=`${world.blocks.filter(b=>b.kind==='pollution').length} pollution · ${world.blocks.filter(b=>b.kind==='neutralizer').length} neutralizers${world.heldBlock?` · Carrying ${world.heldBlock.color} ${world.heldBlock.kind}`:''}`;
    host.querySelectorAll<HTMLButtonElement>('[data-tool],[data-block-kind]').forEach(button=>{
      const selected=typeof tool==='string'?button.dataset.tool===tool:button.dataset.blockKind===tool.kind&&button.dataset.color===tool.color;
      button.setAttribute('aria-pressed',String(selected));
    });
  };
  for(const kind of ['pollution','neutralizer'] as const) {
    const colors=kind==='pollution'?Object.keys(BLOCK_COLORS) as BlockColor[]:NEUTRALIZER_COLORS;
    for(const color of colors) {
      const button=document.createElement('button');button.type='button';button.draggable=true;
      button.dataset.blockKind=kind;button.dataset.color=color;button.setAttribute('aria-label',`${color} ${kind}`);
      const swatch=document.createElement('span');swatch.className=`mission-swatch ${kind}`;swatch.style.backgroundColor=BLOCK_COLORS[color];swatch.setAttribute('aria-hidden','true');
      button.append(swatch,document.createTextNode(color));
      query(`[data-palette="${kind}"]`).append(button);
    }
  }
  const click=(event:Event)=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||options.locked())return;
    if(button.dataset.tool)tool=button.dataset.tool as 'robot'|'erase';
    if(button.dataset.blockKind)tool={kind:button.dataset.blockKind as BlockKind,color:button.dataset.color as BlockColor};
    switch(button.dataset.action){
      case 'random':guarded(()=>world.randomize(Number(query<HTMLInputElement>('[data-count="pollution"]').value),Number(query<HTMLInputElement>('[data-count="neutralizer"]').value),query<HTMLInputElement>('[data-seed]').value.trim() ? Number(query<HTMLInputElement>('[data-seed]').value) : Math.floor(Math.random()*4294967296)));break;
      case 'clear':guarded(()=>world.clear());break;
      case 'open':query<HTMLInputElement>('[data-file]').click();break;
      case 'save':{
        const url=URL.createObjectURL(new Blob([world.serialize()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='synapse-mission.json';document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);break;
      }
    }
    controls();
  };
  const input=(event:Event)=>{
    if(options.locked())return;
    const target=event.target as HTMLInputElement;
    if(target.hasAttribute('data-friction')){world.friction=Number(target.value);query('[data-friction-value]').textContent=world.friction.toFixed(2);world.changed();}
  };
  const fileChange=async(event:Event)=>{
    const target=event.target as HTMLInputElement;if(!target.hasAttribute('data-file'))return;
    const file=target.files?.[0];if(!file)return;
    try{const text=await file.text();guarded(()=>world.load(text));query<HTMLInputElement>('[data-friction]').value=String(world.friction);query('[data-friction-value]').textContent=world.friction.toFixed(2);}
    catch(e){message(e instanceof Error?e.message:String(e));}target.value='';
  };
  const dragStart=(event:DragEvent)=>{
    const button=(event.target as Element).closest<HTMLElement>('[data-block-kind]');if(!button||options.locked()){event.preventDefault();return;}
    event.dataTransfer?.setData(MIME,JSON.stringify({kind:button.dataset.blockKind,color:button.dataset.color}));
    if(event.dataTransfer)event.dataTransfer.effectAllowed='copy';
  };
  const over=(event:DragEvent)=>{if(!options.locked()&&event.dataTransfer?.types.includes(MIME))event.preventDefault();};
  const drop=(event:DragEvent)=>{
    if(options.locked())return;const data=event.dataTransfer?.getData(MIME);if(!data)return;
    event.preventDefault();const point=options.toBoard(event.clientX,event.clientY);
    guarded(()=>{const block=JSON.parse(data);if(!['pollution','neutralizer'].includes(block.kind))throw new Error('Invalid block type.');world.place(block.kind,block.color,point.x,point.y);});
  };
  const down=(event:PointerEvent)=>{
    if(options.locked()||event.button!==0)return;
    const point=options.toBoard(event.clientX,event.clientY),block=world.hit(point.x,point.y);
    if(typeof tool==='string'&&tool==='robot'&&!block)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(tool==='erase'){if(block)guarded(()=>world.remove(block.id));return;}
    if(block){drag={id:block.id,x:block.x,y:block.y};canvas.setPointerCapture?.(event.pointerId);}
    else if(typeof tool!=='string'){const selected=tool;guarded(()=>world.place(selected.kind,selected.color,point.x,point.y));}
  };
  const move=(event:PointerEvent)=>{
    if(!drag||options.locked())return;event.stopImmediatePropagation();
    const point=options.toBoard(event.clientX,event.clientY),block=world.blocks.find(b=>b.id===drag!.id);
    if(block){block.x=point.x;block.y=point.y;options.render();}
  };
  const up=(event:PointerEvent)=>{
    if(!drag)return;event.stopImmediatePropagation();const original=drag;drag=undefined;
    const block=world.blocks.find(b=>b.id===original.id);if(!block)return;
    const point=options.toBoard(event.clientX,event.clientY);
    try{if(options.locked())throw new Error('Placement is locked while running.');world.place(block.kind,block.color,point.x,point.y,block.id);message('');}
    catch(e){block.x=original.x;block.y=original.y;message(e instanceof Error?e.message:String(e));}options.render();
  };
  const cancel=()=>{if(drag){const b=world.blocks.find(b=>b.id===drag!.id);if(b){b.x=drag.x;b.y=drag.y;}drag=undefined;options.render();}};
  host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',fileChange);host.addEventListener('dragstart',dragStart);
  canvas.addEventListener('dragover',over);canvas.addEventListener('drop',drop);
  canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',up,true);canvas.addEventListener('pointercancel',cancel,true);
  const storageKey='leanbot.synapse.mission.v1';
  let saved='';
  const persist=()=>{
    const text=world.serialize();if(text===saved)return;
    try{localStorage.setItem(storageKey,text);saved=text;}catch{message('Mission autosave unavailable. Use Download mission.');}
  };
  const unsubscribe=world.subscribe(()=>{controls();if(!options.locked())options.render();persist();});
  try {
    const stored=localStorage.getItem(storageKey);
    if(stored&&!world.blocks.length){world.load(stored);saved=world.serialize();}
    query<HTMLInputElement>('[data-friction]').value=String(world.friction);
    query('[data-friction-value]').textContent=world.friction.toFixed(2);
  } catch { message('Saved mission could not be loaded. Use Open mission or create a new layout.'); }
  const animate=(now:number)=>{
    if(disposed)return;const dt=Math.min(0.1,Math.max(0,(now-lastTime)/1000));lastTime=now;
    if(options.locked()!==lastLocked)controls();if(!options.locked()&&world.hasMotion){world.step(dt,options.pose());options.render();}
    frame=requestAnimationFrame(animate);
  };
  controls();frame=requestAnimationFrame(animate);
  return()=>{disposed=true;cancelAnimationFrame(frame);cancel();unsubscribe();host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',fileChange);host.removeEventListener('dragstart',dragStart);canvas.removeEventListener('dragover',over);canvas.removeEventListener('drop',drop);canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel,true);host.replaceChildren();};
}
