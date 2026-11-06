import { LEANBOT_GEOMETRY } from './robotGeometry';
import type { BoardConfig, Pose } from './types';

export type BlockKind = 'pollution' | 'neutralizer';
export type BlockColor = 'green' | 'blue' | 'purple' | 'red' | 'yellow' | 'mystery';
export const BLOCK_COLORS: Record<BlockColor, string> = { green: '#83a73e', blue: '#278fa9', purple: '#795272', red: '#bd3d2f', yellow: '#d8b721', mystery: '#cbd0d5' };
export const BLOCK_SIZE = { length: 15, width: 25, height: 75 } as const;
export const NEUTRALIZER_COLORS: BlockColor[] = ['green', 'blue', 'purple'];
export interface MissionBlock {
  id: string; kind: BlockKind; color: BlockColor; x: number; y: number; rotation: number;
  slotId?: string; vx: number; vy: number; spin: number; tilt: number; tipSpeed: number;
  state: 'standing' | 'falling' | 'fallen'; held: boolean; mass: number;
}
interface Slot { id: string; x: number; y: number; rotation: number }
interface Box { x: number; y: number; rotation: number; length: number; width: number }
const RAD = Math.PI / 180, GRAVITY = 9810;
const copy = (blocks: MissionBlock[]) => blocks.map(b => ({ ...b }));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let x = state; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
export function blockFootprint(block: MissionBlock): { length: number; width: number } {
  return { length: BLOCK_SIZE.length * Math.cos(block.tilt) + BLOCK_SIZE.height * Math.sin(block.tilt), width: BLOCK_SIZE.width };
}
function contact(a: Box, b: Box) {
  const aa = a.rotation * RAD, ba = b.rotation * RAD;
  const axes = [[Math.cos(aa), Math.sin(aa)], [-Math.sin(aa), Math.cos(aa)], [Math.cos(ba), Math.sin(ba)], [-Math.sin(ba), Math.cos(ba)]];
  let depth = Infinity, nx = 0, ny = 0;
  for (const [x, y] of axes) {
    const radius = (box: Box, angle: number) => Math.abs(x * Math.cos(angle) + y * Math.sin(angle)) * box.length / 2 + Math.abs(-x * Math.sin(angle) + y * Math.cos(angle)) * box.width / 2;
    const distance = (b.x - a.x) * x + (b.y - a.y) * y;
    const overlap = radius(a, aa) + radius(b, ba) - Math.abs(distance);
    if (overlap <= 0) return null;
    if (overlap < depth) { depth = overlap; nx = x * (distance >= 0 ? 1 : -1); ny = y * (distance >= 0 ? 1 : -1); }
  }
  return { depth, nx, ny };
}

/** 2.5D rigid-block approximation: oriented collisions, Coulomb friction and tipping. */
export class MissionWorld {
  blocks: MissionBlock[] = [];
  friction = 0.35;
  restitution = 0.1;
  private initial: MissionBlock[] = [];
  private listeners = new Set<() => void>();
  private serial = 0;
  private heldOffset = 0;
  private gripper = { left: 0, right: 0 };
  private velocity = { x: 0, y: 0, omega: 0 };
  private lastPose?: Pose;
  constructor(readonly board: Pick<BoardConfig, 'width' | 'height' | 'cityZones' | 'storageSites'>) {}
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  changed() { this.listeners.forEach(fn => fn()); }
  get heldBlock() { return this.blocks.find(b => b.held); }
  get hasMotion() { return this.blocks.some(b => !b.held && (Math.hypot(b.vx, b.vy) > 0.01 || Math.abs(b.spin) > 0.01 || b.state === 'falling')); }
  slots(kind: BlockKind): Slot[] {
    return kind === 'pollution' ? (this.board.cityZones ?? []).flatMap(z => z.sites) : this.board.storageSites ?? [];
  }
  private make(kind: BlockKind, color: BlockColor, slot: Slot): MissionBlock {
    if (!Object.hasOwn(BLOCK_COLORS, color) || (kind === 'neutralizer' && !NEUTRALIZER_COLORS.includes(color))) throw new Error('Invalid color for this block type.');
    return { id: `block-${++this.serial}`, kind, color, x: slot.x, y: slot.y, rotation: slot.rotation, slotId: slot.id, vx: 0, vy: 0, spin: 0, tilt: 0, tipSpeed: 0, state: 'standing', held: false, mass: 0.025 };
  }
  private available(kind: BlockKind, except?: string) {
    return this.slots(kind).filter(s => ![...this.blocks,...this.initial].some(b => b.id !== except && b.slotId === s.id));
  }
  place(kind: BlockKind, color: BlockColor, x: number, y: number, id?: string) {
    const slots = this.available(kind, id).sort((a,b) => Math.hypot(a.x-x,a.y-y) - Math.hypot(b.x-x,b.y-y));
    const slot = slots[0];
    if (!slot || Math.hypot(slot.x-x,slot.y-y) > 65) throw new Error(kind === 'neutralizer' ? 'Drop on an empty Storage slot S1–S6.' : 'Drop on an empty numbered city site.');
    const old = id ? this.blocks.find(b => b.id === id) : undefined;
    if (id && !old) throw new Error('Block no longer exists.');
    const next = this.make(kind, color, slot);
    if (old) Object.assign(old, next, { id }); else this.blocks.push(next);
    const placed = old ?? next;
    const index = this.initial.findIndex(b => b.id === placed.id);
    if (index < 0) this.initial.push({ ...placed }); else this.initial[index] = { ...placed };
    this.changed(); return placed;
  }
  remove(id: string) { this.blocks = this.blocks.filter(b => b.id !== id); this.initial = this.initial.filter(b => b.id !== id); this.changed(); }
  clear() { this.blocks = []; this.commitLayout(); }
  randomize(pollution: number, neutralizers: number, seed = Date.now()) {
    if (!Number.isInteger(pollution) || !Number.isInteger(neutralizers) || pollution < 0 || pollution > this.slots('pollution').length || neutralizers < 0 || neutralizers > this.slots('neutralizer').length) throw new Error('Choose 0–32 pollution blocks and 0–6 neutralizers.');
    if (!Number.isFinite(seed)) throw new Error('Seed must be a finite number.');
    const random = seededRandom(seed);
    const shuffle = (slots: Slot[]) => { const result = [...slots]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i+1)); [result[i], result[j]] = [result[j], result[i]]; } return result; };
    const blocks: MissionBlock[] = [];
    for (const [kind, count] of [['pollution', pollution], ['neutralizer', neutralizers]] as const) {
      const colors = kind === 'pollution' ? Object.keys(BLOCK_COLORS).filter(color=>color!=='mystery') as BlockColor[] : NEUTRALIZER_COLORS;
      for (const slot of shuffle(this.slots(kind)).slice(0,count)) blocks.push(this.make(kind, colors[Math.floor(random() * colors.length)], slot));
    }
    this.blocks = blocks; this.commitLayout();
  }
  commitLayout() { this.initial = copy(this.blocks); this.changed(); }
  reset() {
    this.blocks = copy(this.initial); this.gripper = { left: 0, right: 0 }; this.lastPose = undefined; this.velocity = { x: 0, y: 0, omega: 0 }; this.changed();
  }
  hit(x: number, y: number) {
    return [...this.blocks].reverse().find(b => {
      const a = -b.rotation * RAD, dx = x-b.x, dy = y-b.y, shape = blockFootprint(b);
      return Math.abs(dx*Math.cos(a)-dy*Math.sin(a)) <= Math.max(12,shape.length/2) && Math.abs(dx*Math.sin(a)+dy*Math.cos(a)) <= Math.max(12,shape.width/2);
    });
  }
  syncPose(pose: Pose) {
    const block = this.heldBlock;
    if (block) { const point = this.graspPoint(pose); block.x=point.x; block.y=point.y; block.rotation=pose.heading+this.heldOffset; }
  }
  distance(pose: Pose, maxDistance = 300) {
    const angle=pose.heading*RAD, sx=pose.x+40*Math.cos(angle), sy=pose.y+40*Math.sin(angle);
    let nearest=maxDistance;
    for(const block of this.blocks) {
      if(block.held || BLOCK_SIZE.height*Math.cos(block.tilt)+BLOCK_SIZE.length*Math.sin(block.tilt)<35) continue;
      const a=-block.rotation*RAD,dx=sx-block.x,dy=sy-block.y,shape=blockFootprint(block);
      const origin=[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)];
      const direction=[Math.cos(angle+a),Math.sin(angle+a)];
      let near=0,far=maxDistance;
      for(let i=0;i<2;i++) {
        const half=(i===0?shape.length:shape.width)/2;
        if(Math.abs(direction[i])<1e-8) { if(Math.abs(origin[i])>half) { far=-1; break; } }
        else { const t1=(-half-origin[i])/direction[i],t2=(half-origin[i])/direction[i];near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2)); }
      }
      if(far>=near)nearest=Math.min(nearest,near);
    }
    return nearest;
  }
  private graspPoint(pose: Pose) { const a = pose.heading * RAD; return { x: pose.x + LEANBOT_GEOMETRY.graspOffset*Math.cos(a), y: pose.y + LEANBOT_GEOMETRY.graspOffset*Math.sin(a) }; }
  setGripper(left: number, right: number, pose: Pose, motorLeft = 0, motorRight = 0) {
    const angle = pose.heading * RAD, speed = (motorLeft + motorRight) / 2;
    this.velocity = { x: speed * Math.cos(angle), y: speed * Math.sin(angle), omega: (motorLeft - motorRight) / LEANBOT_GEOMETRY.wheelBase };
    const wasClosed = this.gripper.left >= 55 && this.gripper.right >= 55;
    this.gripper = { left, right };
    const closed = left >= 55 && right >= 55;
    if (this.heldBlock && !closed) {
      const block = this.heldBlock, point = this.graspPoint(pose);
      block.held = false;
      block.vx = this.velocity.x - this.velocity.omega * (point.y-pose.y);
      block.vy = this.velocity.y + this.velocity.omega * (point.x-pose.x);
      if (Math.hypot(block.vx, block.vy) > 20) this.tip(block, Math.atan2(block.vy,block.vx)/RAD);
      this.changed();
    } else if (closed && !wasClosed && !this.heldBlock) {
      const point = this.graspPoint(pose), a = pose.heading * RAD;
      const candidates = this.blocks.filter(b => {
        const dx = b.x-pose.x, dy = b.y-pose.y;
        if (b.held || b.state === 'falling') return false;
        const height = BLOCK_SIZE.height*Math.cos(b.tilt)+BLOCK_SIZE.length*Math.sin(b.tilt);
        // Low fingers only overlap a fallen block by a few millimetres. Require
        // precise, lengthwise alignment and a settled robot/block, not chance.
        const low = height < 30;
        if (height < 12) return false;
        if (low && (Math.abs(Math.cos((b.rotation-pose.heading)*RAD)) < 0.96 ||
          Math.hypot(b.vx,b.vy) > 5 || Math.abs(b.spin) > 5 || Math.max(Math.abs(motorLeft),Math.abs(motorRight)) > 10)) return false;
        return dx*Math.cos(a)+dy*Math.sin(a) >= LEANBOT_GEOMETRY.graspOffset - (low ? 6 : 16) &&
          Math.abs(-dx*Math.sin(a)+dy*Math.cos(a)) <= (low ? 4 : 17) &&
          Math.hypot(b.x-point.x,b.y-point.y) <= (low ? 6 : 23);
      }).sort((a,b) => Math.hypot(a.x-point.x,a.y-point.y) - Math.hypot(b.x-point.x,b.y-point.y));
      if (candidates[0]) {
        const block = candidates[0]; block.held = true; block.slotId = undefined; block.vx = block.vy = block.spin = 0;
        this.heldOffset = block.rotation - pose.heading; block.x = point.x; block.y = point.y; this.changed();
      }
    }
  }
  private tip(block: MissionBlock, rotation: number) {
    if (block.state !== 'standing' || block.held) return;
    block.state = 'falling'; block.rotation = rotation; block.tipSpeed = 1.8; block.slotId = undefined; this.changed();
  }
  step(seconds: number, pose: Pose, left = 0, right = 0) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let remaining = seconds;
    while (remaining > 1e-9) { const dt = Math.min(0.005,remaining); this.substep(dt,pose,left,right); remaining -= dt; }
    this.lastPose = { ...pose };
  }
  private substep(dt: number, pose: Pose, left: number, right: number) {
    const angle = pose.heading*RAD, speed = (left+right)/2, omega = (left-right)/LEANBOT_GEOMETRY.wheelBase;
    this.velocity = { x: speed*Math.cos(angle), y: speed*Math.sin(angle), omega };
    const held = this.heldBlock;
    if (held) { const p = this.graspPoint(pose); held.x = p.x; held.y = p.y; held.rotation = pose.heading + this.heldOffset; }
    for (const b of this.blocks) {
      if (b.held) continue;
      const speed = Math.hypot(b.vx,b.vy), next = Math.max(0,speed - this.friction*GRAVITY*dt);
      if (speed > 0) { b.vx *= next/speed; b.vy *= next/speed; }
      b.spin *= Math.max(0,1-this.friction*30*dt);
      b.x += b.vx*dt; b.y += b.vy*dt; b.rotation += b.spin*dt;
      if (b.state === 'falling') {
        const before = Math.sin(b.tilt);
        b.tipSpeed += GRAVITY / (BLOCK_SIZE.height*0.65) * Math.sin(Math.max(0.08,b.tilt)) * dt;
        b.tilt = Math.min(Math.PI/2,b.tilt + b.tipSpeed*dt);
        const shift = BLOCK_SIZE.height/2 * (Math.sin(b.tilt)-before);
        b.x += Math.cos(b.rotation*RAD)*shift; b.y += Math.sin(b.rotation*RAD)*shift;
        if (b.tilt === Math.PI/2) { b.state = 'fallen'; b.tipSpeed = 0; this.changed(); }
      }
      const robotShapes = [LEANBOT_GEOMETRY.body, ...[-1,1].map(side => ({x:0,y:side*LEANBOT_GEOMETRY.wheelBase/2,...LEANBOT_GEOMETRY.wheel}))];
      for (const shape of robotShapes) {
        const box = { ...shape, x: pose.x+shape.x*Math.cos(angle)-shape.y*Math.sin(angle), y: pose.y+shape.x*Math.sin(angle)+shape.y*Math.cos(angle), rotation: pose.heading };
        const hit = contact(box,{ ...b,...blockFootprint(b) });
        if (!hit) continue;
        b.x += hit.nx*(hit.depth+0.01); b.y += hit.ny*(hit.depth+0.01); b.slotId = undefined;
        const rvx = this.velocity.x - omega*(b.y-pose.y), rvy = this.velocity.y + omega*(b.x-pose.x);
        const closing = Math.max(0,(rvx-b.vx)*hit.nx + (rvy-b.vy)*hit.ny);
        b.vx += hit.nx*closing*(1+this.restitution); b.vy += hit.ny*closing*(1+this.restitution);
        // Off-centre contacts apply a yaw impulse around the block's centre.
        const localX=(b.x-box.x)*Math.cos(angle)+(b.y-box.y)*Math.sin(angle);
        const localY=-(b.x-box.x)*Math.sin(angle)+(b.y-box.y)*Math.cos(angle);
        const cx=clamp(localX,-box.length/2,box.length/2),cy=clamp(localY,-box.width/2,box.width/2);
        const rx=box.x+cx*Math.cos(angle)-cy*Math.sin(angle)-b.x;
        const ry=box.y+cx*Math.sin(angle)+cy*Math.cos(angle)-b.y;
        const footprint=blockFootprint(b),inertia=b.mass*(footprint.length**2+footprint.width**2)/12;
        b.spin=clamp(b.spin+(rx*hit.ny-ry*hit.nx)*b.mass*closing*(1+this.restitution)/inertia/RAD,-720,720);
        // Contact force × centre-of-mass height exceeds the restoring gravity torque.
        if (closing/dt > GRAVITY*(BLOCK_SIZE.length/2)/(BLOCK_SIZE.height*0.65)) this.tip(b,Math.atan2(hit.ny,hit.nx)/RAD);
      }
    }
    // Oriented block/block contacts, equal-and-opposite impulses, including carried blocks.
    for (let i=0;i<this.blocks.length;i++) for (let j=i+1;j<this.blocks.length;j++) {
      const a=this.blocks[i],b=this.blocks[j], hit=contact({...a,...blockFootprint(a)},{...b,...blockFootprint(b)});
      if (!hit) continue;
      const ia=a.held?0:1/a.mass, ib=b.held?0:1/b.mass, total=ia+ib; if (!total) continue;
      a.x-=hit.nx*hit.depth*ia/total; a.y-=hit.ny*hit.depth*ia/total;
      b.x+=hit.nx*hit.depth*ib/total; b.y+=hit.ny*hit.depth*ib/total;
      const avx=a.held?this.velocity.x:a.vx, avy=a.held?this.velocity.y:a.vy;
      const bvx=b.held?this.velocity.x:b.vx, bvy=b.held?this.velocity.y:b.vy;
      const closing=(bvx-avx)*hit.nx+(bvy-avy)*hit.ny;
      if (closing<0) {
        const impulse=-(1+this.restitution)*closing/total;
        a.vx-=impulse*ia*hit.nx; a.vy-=impulse*ia*hit.ny; b.vx+=impulse*ib*hit.nx; b.vy+=impulse*ib*hit.ny;
        if (Math.abs(closing)/dt > GRAVITY*7.5/48.75) { this.tip(a,Math.atan2(-hit.ny,-hit.nx)/RAD); this.tip(b,Math.atan2(hit.ny,hit.nx)/RAD); }
      }
    }
    for (const b of this.blocks) {
      if (b.held) continue;
      const shape=blockFootprint(b),a=b.rotation*RAD;
      const rx=Math.abs(Math.cos(a))*shape.length/2+Math.abs(Math.sin(a))*shape.width/2;
      const ry=Math.abs(Math.sin(a))*shape.length/2+Math.abs(Math.cos(a))*shape.width/2;
      if (b.x<rx || b.x>this.board.width-rx) b.vx*=-this.restitution;
      if (b.y<ry || b.y>this.board.height-ry) b.vy*=-this.restitution;
      b.x=clamp(b.x,rx,this.board.width-rx); b.y=clamp(b.y,ry,this.board.height-ry);
      if (Math.hypot(b.vx,b.vy)>0.1) b.slotId=undefined;
    }
  }
  serialize() { return JSON.stringify({ version: 1, friction: this.friction, blocks: this.initial }); }
  load(text: string) {
    const value = JSON.parse(text);
    if (value.version !== 1 || !Array.isArray(value.blocks) || value.blocks.length > 38 || !Number.isFinite(value.friction) || value.friction < 0 || value.friction > 1) throw new Error('Invalid mission layout.');
    const seen = new Set<string>();
    const next = value.blocks.map((input: MissionBlock) => {
      if (!['pollution','neutralizer'].includes(input.kind)) throw new Error('Invalid block type.');
      const slot = this.slots(input.kind).find(s=>s.id===input.slotId);
      if (!slot || seen.has(slot.id)) throw new Error('Invalid or occupied mission site.');
      seen.add(slot.id); return this.make(input.kind,input.color,slot);
    });
    this.blocks=next; this.friction=value.friction; this.commitLayout();
  }
}

export function drawMissionBlocks(ctx: CanvasRenderingContext2D, world: MissionWorld) {
  for (const b of world.blocks) {
    const shape=blockFootprint(b),h=BLOCK_SIZE.height*Math.cos(b.tilt)*0.18;
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rotation*RAD);
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fillRect(-shape.length/2+3,-shape.width/2+4,shape.length,shape.width);
    ctx.fillStyle=BLOCK_COLORS[b.color]; ctx.strokeStyle=b.held?'#fff':'#26333a'; ctx.lineWidth=b.held?2:0.8;
    ctx.fillRect(-shape.length/2,-shape.width/2-h,shape.length,shape.width+h);
    ctx.strokeRect(-shape.length/2,-shape.width/2-h,shape.length,shape.width+h);
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(-shape.length/2,-shape.width/2-h,shape.length,Math.min(5,shape.width));
    if (b.color==='mystery') { ctx.fillStyle='#344357';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('?',0,4); }
    if (b.kind==='neutralizer') { ctx.fillStyle='#f3efe0'; if(b.tilt>Math.PI/4)ctx.fillRect(-7.5,-shape.width/2,15,shape.width);else ctx.fillRect(-shape.length/2,-4-h/2,shape.length,8); }
    ctx.restore();
  }
}
