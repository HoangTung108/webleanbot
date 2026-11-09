import { fitGripperToBlock, gripperJaw, jawBlockContact, LEANBOT_GEOMETRY } from './robotGeometry';
import type { BoardConfig, Pose } from './types';

export type BlockKind = 'pollution' | 'neutralizer';
export type BlockColor = 'green' | 'blue' | 'purple' | 'red' | 'yellow' | 'mystery';
export const BLOCK_COLORS: Record<BlockColor, string> = { green: '#83a73e', blue: '#278fa9', purple: '#795272', red: '#bd3d2f', yellow: '#d8b721', mystery: '#cbd0d5' };
export const BLOCK_SIZE = { length: 15, width: 25, height: 75 } as const;
export const NEUTRALIZER_COLORS: BlockColor[] = ['green', 'blue', 'purple'];
export interface MissionBlock {
  id: string; kind: BlockKind; color: BlockColor; x: number; y: number; rotation: number;
  originZone?: string; elevation?: number; offBoard?: boolean; verticalVelocity?: number;
  slotId?: string; vx: number; vy: number; spin: number; tilt: number; tipSpeed: number;
  state: 'standing' | 'falling' | 'fallen'; held: boolean; heldBy?:string; mass: number;
}
interface Slot { id: string; x: number; y: number; rotation: number }
interface Box { x: number; y: number; rotation: number; length: number; width: number }
const RAD = Math.PI / 180, GRAVITY = 9810;
export const CONTACT_SETTINGS = {
  friction: { label: 'Ma sát trượt', min: 0, max: 1, step: 0.01, default: 0.35, help: 'Khối vật – sa bàn. Tăng để khối trượt chậm và dừng sớm hơn.' },
  spinFriction: { label: 'Hệ số cản xoay', min: 0, max: 3, step: 0.05, default: 1, help: 'Nhân với ma sát trượt. Tăng để khối ngừng xoay nhanh hơn.' },
  gripFriction: { label: 'Hệ số bám tay gắp', min: 0, max: 2, step: 0.05, default: 1, help: 'Nhân với lực giữ tay gắp. Giảm để vật dễ tuột khi tăng tốc hoặc va chạm.' },
  restitution: { label: 'Độ nảy va chạm', min: 0, max: 1, step: 0.01, default: 0.1, help: '0: không nảy; 1: va chạm đàn hồi lý tưởng.' },
} as const;
export type ContactSetting = keyof typeof CONTACT_SETTINGS;
const STANDING_FOOTPRINT={length:BLOCK_SIZE.length,width:BLOCK_SIZE.width};
const FALLEN_FOOTPRINT={length:BLOCK_SIZE.height,width:BLOCK_SIZE.width};
const ROBOT_SHAPES=[LEANBOT_GEOMETRY.body,...[-1,1].map(side=>({x:0,y:side*LEANBOT_GEOMETRY.wheelBase/2,...LEANBOT_GEOMETRY.wheel}))];
const copy = (blocks: MissionBlock[]) => blocks.map(b => ({ ...b }));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let x = state; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
export function blockFootprint(block: MissionBlock): { length: number; width: number } {
  if(block.tilt===0)return STANDING_FOOTPRINT;
  if(block.tilt===Math.PI/2)return FALLEN_FOOTPRINT;
  return { length: BLOCK_SIZE.length * Math.cos(block.tilt) + BLOCK_SIZE.height * Math.sin(block.tilt), width: BLOCK_SIZE.width };
}
function blockBox(block:MissionBlock):Box {
  const shape=blockFootprint(block);
  return {x:block.x,y:block.y,rotation:block.rotation,length:shape.length,width:shape.width};
}
function contact(a: Box, b: Box) {
  // Conservative axis bounds reject distant pairs before allocating SAT axes.
  const reach=(a.length+a.width+b.length+b.width)/2;
  if(Math.abs(a.x-b.x)>reach||Math.abs(a.y-b.y)>reach)return null;
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
  hidePollutionColors=false;
  integrateFreeBodies=true;
  friction = 0.35;
  spinFriction = 1;
  gripFriction = 1;
  restitution = 0.1;
  setContactSetting(key: ContactSetting, value: number) {
    const spec = CONTACT_SETTINGS[key];
    if (!Number.isFinite(value) || value < spec.min || value > spec.max) throw new Error(`${spec.label}: ${spec.min}–${spec.max}`);
    this[key] = value; this.changed();
  }
  resetContactSettings() {
    for (const key of Object.keys(CONTACT_SETTINGS) as ContactSetting[]) this[key] = CONTACT_SETTINGS[key].default;
    this.changed();
  }
  private initial: MissionBlock[] = [];
  private listeners = new Set<() => void>();
  private serial = 0;
  private heldAnchor = {x:LEANBOT_GEOMETRY.graspOffset as number,y:0,rotation:0};
  private gripper = { left: 0, right: 0 };
  private velocity = { x: 0, y: 0, omega: 0 };
  private lastPose?: Pose;
  private regripBlocked = new Set<string>();
  constructor(readonly board: Pick<BoardConfig, 'width' | 'height' | 'cityZones' | 'storageSites' | 'analysisArea'>,readonly actorId='local') {}
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  changed() { this.listeners.forEach(fn => fn()); }
  get heldBlock() { return this.blocks.find(b => b.held&&(!b.heldBy||b.heldBy===this.actorId)); }
  get hasMotion() { return this.blocks.some(b => !b.held && (Math.hypot(b.vx, b.vy) > 0.01 || Math.abs(b.spin) > 0.01 || b.state === 'falling' || (!!b.offBoard && (b.elevation??0)>-750))); }
  slots(kind: BlockKind): Slot[] {
    return kind === 'pollution' ? (this.board.cityZones ?? []).flatMap(z => z.sites) : this.board.storageSites ?? [];
  }
  private make(kind: BlockKind, color: BlockColor, slot: Slot): MissionBlock {
    if (!Object.hasOwn(BLOCK_COLORS, color) || (kind === 'neutralizer' && !NEUTRALIZER_COLORS.includes(color))) throw new Error('Invalid color for this block type.');
    return { id: `block-${++this.serial}`, kind, color, originZone: kind==='pollution'?this.board.cityZones?.find(z=>z.sites.some(s=>s.id===slot.id))?.id:undefined, elevation:0, x: slot.x, y: slot.y, rotation: slot.rotation, slotId: slot.id, vx: 0, vy: 0, spin: 0, tilt: 0, tipSpeed: 0, state: 'standing', held: false, mass: 0.025 };
  }
  private available(kind: BlockKind, except?: string) {
    return this.slots(kind).filter(s => {
      const zone=this.board.cityZones?.find(z=>z.sites.some(site=>site.id===s.id))?.id;
      return ![...this.blocks,...this.initial].some(b=>b.id!==except&&(b.slotId===s.id||(kind==='pollution'&&b.kind==='pollution'&&b.originZone===zone)));
    });
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
    if (!Number.isInteger(pollution) || !Number.isInteger(neutralizers) || pollution < 0 || pollution > (this.board.cityZones?.length??0) || neutralizers < 0 || neutralizers > this.slots('neutralizer').length) throw new Error('Choose 0–8 pollution blocks (one per city) and 0–6 neutralizers.');
    if (!Number.isFinite(seed)) throw new Error('Seed must be a finite number.');
    const random = seededRandom(seed);
    const shuffle = (slots: Slot[]) => { const result = [...slots]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i+1)); [result[i], result[j]] = [result[j], result[i]]; } return result; };
    const blocks: MissionBlock[] = [];
    for (const [kind, count] of [['pollution', pollution], ['neutralizer', neutralizers]] as const) {
      const colors = kind === 'pollution' ? Object.keys(BLOCK_COLORS).filter(color=>color!=='mystery') as BlockColor[] : NEUTRALIZER_COLORS;
      const seenZones=new Set<string>();
      const slots=shuffle(this.slots(kind)).filter(slot=>{
        if(kind!=='pollution')return true;
        const zone=this.board.cityZones?.find(z=>z.sites.some(s=>s.id===slot.id))?.id;
        if(!zone||seenZones.has(zone))return false;seenZones.add(zone);return true;
      });
      for (const slot of slots.slice(0,count)) blocks.push(this.make(kind, colors[Math.floor(random() * colors.length)], slot));
    }
    this.blocks = blocks; this.commitLayout();
  }
  commitLayout() { this.initial = copy(this.blocks); this.changed(); }
  reset() {
    this.blocks = copy(this.initial); this.gripper = { left: 0, right: 0 }; this.lastPose = undefined; this.regripBlocked.clear(); this.velocity = { x: 0, y: 0, omega: 0 }; this.changed();
  }
  hit(x: number, y: number) {
    return [...this.blocks].reverse().find(b => {
      const a = -b.rotation * RAD, dx = x-b.x, dy = y-b.y, shape = blockFootprint(b);
      return !b.offBoard && Math.abs(dx*Math.cos(a)-dy*Math.sin(a)) <= shape.length/2 && Math.abs(dx*Math.sin(a)+dy*Math.cos(a)) <= shape.width/2;
    });
  }
  syncPose(pose: Pose) {
    this.syncHeld(pose);
    this.lastPose={...pose};
  }
  distance(pose: Pose, maxDistance = 300) {
    const angle=pose.heading*RAD, sx=pose.x+40*Math.cos(angle), sy=pose.y+40*Math.sin(angle);
    let nearest=maxDistance;
    for(const block of this.blocks) {
      if(block.held || block.offBoard || BLOCK_SIZE.height*Math.cos(block.tilt)+BLOCK_SIZE.length*Math.sin(block.tilt)<35) continue;
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
  private local(block:MissionBlock,pose:Pose) {
    const a=pose.heading*RAD,dx=block.x-pose.x,dy=block.y-pose.y;
    return {x:dx*Math.cos(a)+dy*Math.sin(a),y:-dx*Math.sin(a)+dy*Math.cos(a),rotation:block.rotation-pose.heading};
  }
  private fingerContact(block:MissionBlock,pose:Pose,left=this.gripper.left,right=this.gripper.right) {
    const shape=blockFootprint(block),local=this.local(block,pose);
    return fitGripperToBlock(left,right,shape.width,{...shape,...local});
  }
  /** Visible servo angles include obstructions, even when no block is held. */
  getGripperAngles(pose:Pose) {
    let left=this.gripper.left,right=this.gripper.right;
    for(const block of this.blocks) {
      if(block.offBoard || (block.elevation??0)>0 || Math.hypot(block.x-pose.x,block.y-pose.y)>150)continue;
      const actual=this.fingerContact(block,pose);
      left=Math.min(left,actual.left);right=Math.min(right,actual.right);
    }
    return {left,right};
  }
  private syncHeld(pose:Pose) {
    const b=this.heldBlock;if(!b)return;
    const a=pose.heading*RAD;
    b.x=pose.x+this.heldAnchor.x*Math.cos(a)-this.heldAnchor.y*Math.sin(a);
    b.y=pose.y+this.heldAnchor.x*Math.sin(a)+this.heldAnchor.y*Math.cos(a);
    b.rotation=pose.heading+this.heldAnchor.rotation;
  }
  private pointVelocity(block:MissionBlock,pose:Pose) {
    return {x:this.velocity.x-this.velocity.omega*(block.y-pose.y),y:this.velocity.y+this.velocity.omega*(block.x-pose.x)};
  }
  private release(pose:Pose,inhibitRegrip=true) {
    const block=this.heldBlock;if(!block)return;
    this.syncHeld(pose);
    if(inhibitRegrip)this.regripBlocked.add(block.id);
    const v=this.pointVelocity(block,pose);block.held=false;block.heldBy=undefined;block.vx=v.x;block.vy=v.y;block.spin=this.velocity.omega/RAD;
    // Sliding slowly does not automatically topple an upright block. It needs
    // enough kinetic energy to lift the centre of mass over a support edge.
    const speed=Math.hypot(v.x,v.y),a=Math.atan2(v.y,v.x)-block.rotation*RAD;
    const base=(Math.abs(Math.cos(a))*BLOCK_SIZE.length+Math.abs(Math.sin(a))*BLOCK_SIZE.width)/2,h=BLOCK_SIZE.height/2;
    if(this.friction*h>base && speed*speed>2*GRAVITY*(Math.hypot(h,base)-h))this.tip(block,Math.atan2(v.y,v.x)/RAD);
    this.changed();
  }
  setGripper(left: number, right: number, pose: Pose, motorLeft = 0, motorRight = 0) {
    if(![left,right,pose.x,pose.y,pose.heading,motorLeft,motorRight].every(Number.isFinite))throw new Error('Thông số tay gắp không hợp lệ');
    const angle=pose.heading*RAD,speed=(motorLeft+motorRight)/2;
    this.velocity={x:speed*Math.cos(angle),y:speed*Math.sin(angle),omega:(motorLeft-motorRight)/LEANBOT_GEOMETRY.wheelBase};
    this.syncHeld(pose);
    const opening=left<this.gripper.left-1e-6||right<this.gripper.right-1e-6;
    if(opening)this.regripBlocked.clear();
    this.gripper={left:clamp(left,0,90),right:clamp(right,0,90)};
    const stops=this.getGripperAngles(pose);
    const touchesBoth=(b:MissionBlock)=>{
      // Find the actual contact independently of the requested endpoint. At contact,
      // commands need not push through the object to count as a closed grasp.
      const c=this.fingerContact(b,pose,90,90),tolerance=.5;
      return c.left>1e-4&&c.right>1e-4&&c.left<90-1e-4&&c.right<90-1e-4
        &&c.left<=this.gripper.left+tolerance&&c.right<=this.gripper.right+tolerance
        &&c.left<=stops.left+tolerance&&c.right<=stops.right+tolerance;
    };
    if(this.heldBlock) { if(!touchesBoth(this.heldBlock))this.release(pose,!opening);return; }
    const point=this.graspPoint(pose);
    const candidates=this.blocks.filter(b=>{
      if(b.held||b.offBoard||this.regripBlocked.has(b.id)||b.state==='falling'||(b.elevation??0)>0)return false;
      const local=this.local(b,pose),height=BLOCK_SIZE.height*Math.cos(b.tilt)+BLOCK_SIZE.length*Math.sin(b.tilt),low=height<30;
      // Upright capture is governed by bilateral polygon contact, not a fixed centre target.
      if(height<12||local.x<40||local.x>110||Math.abs(local.y)>5)return false;
      if(low&&(Math.hypot(b.x-point.x,b.y-point.y)>6||Math.abs(local.y)>4))return false;
      if(low&&(Math.abs(Math.cos(local.rotation*RAD))<.96||Math.hypot(b.vx,b.vy)>5||Math.abs(b.spin)>5||Math.max(Math.abs(motorLeft),Math.abs(motorRight))>10))return false;
      const body=LEANBOT_GEOMETRY.body,a=pose.heading*RAD;
      const hit=contact({...body,x:pose.x+body.x*Math.cos(a),y:pose.y+body.x*Math.sin(a),rotation:pose.heading},blockBox(b));
      if(hit&&hit.depth>1)return false;
      return touchesBoth(b);
    }).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y));
    const block=candidates[0];if(!block)return;
    this.heldAnchor=this.local(block,pose); // bind at contact; never snap to a fixed centre
    block.held=true;block.heldBy=this.actorId;block.slotId=undefined;
    const v=this.pointVelocity(block,pose);block.vx=v.x;block.vy=v.y;block.spin=this.velocity.omega/RAD;
    this.lastPose={...pose};this.changed();
  }
  private tip(block: MissionBlock, rotation: number) {
    if (block.state !== 'standing' || block.held) return;
    block.state = 'falling'; block.rotation = rotation; block.tipSpeed = 1.8; block.slotId = undefined; this.changed();
  }
  step(seconds: number, pose: Pose, left = 0, right = 0) {
    if (!Number.isFinite(seconds) || seconds <= 0 || ![pose.x,pose.y,pose.heading,left,right].every(Number.isFinite)) return;
    const start=this.lastPose??pose,dh=((pose.heading-start.heading+180)%360+360)%360-180;
    const moved=Math.hypot(pose.x-start.x,pose.y-start.y)>1e-8||Math.abs(dh)>1e-8;
    const a=pose.heading*RAD,speed=(left+right)/2;
    const velocity=moved?{x:(pose.x-start.x)/seconds,y:(pose.y-start.y)/seconds,omega:dh*RAD/seconds}:{x:speed*Math.cos(a),y:speed*Math.sin(a),omega:(left-right)/LEANBOT_GEOMETRY.wheelBase};
    let elapsed=0;
    while(elapsed<seconds-1e-9) {
      const dt=Math.min(.005,seconds-elapsed);elapsed+=dt;const t=elapsed/seconds;
      this.substep(dt,{x:start.x+(pose.x-start.x)*t,y:start.y+(pose.y-start.y)*t,heading:start.heading+dh*t},velocity);
    }
    this.lastPose={...pose};
  }
  private gripLimit(block:MissionBlock) {
    const height=BLOCK_SIZE.height*Math.cos(block.tilt)+BLOCK_SIZE.length*Math.sin(block.tilt);
    return 1.5*this.gripFriction*clamp((height-12)/30,.1,1); // N; estimated contact/servo strength
  }
  private substep(dt: number, pose: Pose, velocity:{x:number;y:number;omega:number}) {
    const angle=pose.heading*RAD,omega=velocity.omega;
    this.velocity=velocity;
    if(!this.heldBlock && this.gripper.left>10 && this.gripper.right>10) {
      const v=velocity.x*Math.cos(angle)+velocity.y*Math.sin(angle);
      this.setGripper(this.gripper.left,this.gripper.right,pose,v+omega*LEANBOT_GEOMETRY.wheelBase/2,v-omega*LEANBOT_GEOMETRY.wheelBase/2);
      this.velocity=velocity;
    }
    const held=this.heldBlock;
    if(held) {
      this.syncHeld(pose);
      const v=this.pointVelocity(held,pose);
      held.vx=v.x;held.vy=v.y;held.spin=omega/RAD;
    }
    const cos=Math.cos(angle),sin=Math.sin(angle);
    const robotBoxes=ROBOT_SHAPES.map(shape=>({...shape,x:pose.x+shape.x*cos-shape.y*sin,y:pose.y+shape.x*sin+shape.y*cos,rotation:pose.heading}));
    const grip=this.getGripperAngles(pose);
    const jaws=([-1,1] as const).map(side=>gripperJaw(side,side===-1?grip.left:grip.right).map(p=>({x:pose.x+p.x*cos-p.y*sin,y:pose.y+p.x*sin+p.y*cos})));
    for (const b of this.blocks) {
      if (b.held) continue;
      if(this.integrateFreeBodies) {
      if(!b.offBoard&&(b.x<0||b.y<0||b.x>this.board.width||b.y>this.board.height)) { b.offBoard=true;b.elevation=0;b.verticalVelocity=0;b.slotId=undefined;this.changed(); }
      if(b.offBoard) {
        if((b.elevation??0)>-750) {
          b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=b.spin*dt;
          b.elevation=Math.max(-750,(b.elevation??0)-(b.verticalVelocity??0)*dt-.5*GRAVITY*dt*dt);
          b.verticalVelocity=(b.verticalVelocity??0)+GRAVITY*dt;
          if(b.elevation<=-750) {b.vx=b.vy=b.spin=b.verticalVelocity=b.tipSpeed=0;b.state='fallen';b.tilt=Math.PI/2;this.changed();}
        }
        continue;
      }
      const speed = Math.hypot(b.vx,b.vy), next = Math.max(0,speed - this.friction*GRAVITY*dt);
      if (speed > 0) { b.vx *= next/speed; b.vy *= next/speed; }
      b.spin *= Math.max(0,1-this.friction*this.spinFriction*30*dt);
      b.x += b.vx*dt; b.y += b.vy*dt; b.rotation += b.spin*dt;
      if(b.x<0||b.y<0||b.x>this.board.width||b.y>this.board.height){b.offBoard=true;b.elevation=0;b.verticalVelocity=0;b.slotId=undefined;this.changed();continue;}
      if (b.state === 'falling') {
        const before = Math.sin(b.tilt);
        b.tipSpeed += GRAVITY / (BLOCK_SIZE.height*0.65) * Math.sin(Math.max(0.08,b.tilt)) * dt;
        b.tilt = Math.min(Math.PI/2,b.tilt + b.tipSpeed*dt);
        const shift = BLOCK_SIZE.height/2 * (Math.sin(b.tilt)-before);
        b.x += Math.cos(b.rotation*RAD)*shift; b.y += Math.sin(b.rotation*RAD)*shift;
        if (b.tilt === Math.PI/2) { b.state = 'fallen'; b.tipSpeed = 0; this.changed(); }
      }
      }
      if(b.offBoard)continue;
      if(Math.hypot(b.x-pose.x,b.y-pose.y)<150) for(const jaw of jaws) {
        const shape=blockFootprint(b),a=b.rotation*RAD,c=Math.cos(a),s=Math.sin(a);
        const rectangle=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([x,y])=>({x:b.x+x*shape.length/2*c-y*shape.width/2*s,y:b.y+x*shape.length/2*s+y*shape.width/2*c}));
        const hit=jawBlockContact(jaw,rectangle);if(!hit)continue;
        b.x+=hit.nx*(hit.depth+.01);b.y+=hit.ny*(hit.depth+.01);b.slotId=undefined;
        const v=this.pointVelocity(b,pose),closing=Math.max(0,(v.x-b.vx)*hit.nx+(v.y-b.vy)*hit.ny);
        const impulse=closing*(1+this.restitution)/(1/LEANBOT_GEOMETRY.mass+1/b.mass);
        b.vx+=hit.nx*impulse/b.mass;b.vy+=hit.ny*impulse/b.mass;
      }
      for (const box of robotBoxes) {
        const hit = contact(box,blockBox(b));
        if (!hit) continue;
        b.x += hit.nx*(hit.depth+0.01); b.y += hit.ny*(hit.depth+0.01); b.slotId = undefined;
        const rvx = this.velocity.x - omega*(b.y-pose.y), rvy = this.velocity.y + omega*(b.x-pose.x);
        const closing = Math.max(0,(rvx-b.vx)*hit.nx + (rvy-b.vy)*hit.ny);
        // Finite 400 g driven chassis transfers impulse to the 25 g block.
        // Wheel control still prescribes chassis speed; this is not full 3D dynamics.
        const impulse=closing*(1+this.restitution)/(1/LEANBOT_GEOMETRY.mass+1/b.mass);
        b.vx += hit.nx*impulse/b.mass; b.vy += hit.ny*impulse/b.mass;
        // Off-centre contacts apply a yaw impulse around the block's centre.
        const localX=(b.x-box.x)*Math.cos(angle)+(b.y-box.y)*Math.sin(angle);
        const localY=-(b.x-box.x)*Math.sin(angle)+(b.y-box.y)*Math.cos(angle);
        const cx=clamp(localX,-box.length/2,box.length/2),cy=clamp(localY,-box.width/2,box.width/2);
        const rx=box.x+cx*Math.cos(angle)-cy*Math.sin(angle)-b.x;
        const ry=box.y+cx*Math.sin(angle)+cy*Math.cos(angle)-b.y;
        const footprint=blockFootprint(b),inertia=b.mass*(footprint.length**2+footprint.width**2)/12;
        b.spin=clamp(b.spin+(rx*hit.ny-ry*hit.nx)*impulse/inertia/RAD,-720,720);
        // Contact force × centre-of-mass height exceeds the restoring gravity torque.
        if (impulse/b.mass/dt > GRAVITY*(BLOCK_SIZE.length/2)/(BLOCK_SIZE.height*0.65)) this.tip(b,Math.atan2(hit.ny,hit.nx)/RAD);
      }
    }
    // Carried objects use the actual point velocity, including angular motion.
    for(let i=0;i<this.blocks.length;i++)for(let j=i+1;j<this.blocks.length;j++) {
      const a=this.blocks[i],b=this.blocks[j];if(a.offBoard||b.offBoard)continue;
      if((a.held&&a.heldBy&&a.heldBy!==this.actorId)||(b.held&&b.heldBy&&b.heldBy!==this.actorId))continue;
      if(!this.integrateFreeBodies&&!a.held&&!b.held)continue;
      const sa=blockFootprint(a),sb=blockFootprint(b),reach=(sa.length+sa.width+sb.length+sb.width)/2;
      if(Math.abs(a.x-b.x)>reach||Math.abs(a.y-b.y)>reach)continue;
      const hit=contact(blockBox(a),blockBox(b));if(!hit)continue;
      let closing=(b.vx-a.vx)*hit.nx+(b.vy-a.vy)*hit.ny;
      const carried=a.held?a:b.held?b:undefined,free=a.held?b:a;
      if(carried&&closing<0&&free.mass*(-closing)*(1+this.restitution)/dt/1000>this.gripLimit(carried))this.release(pose);
      const ia=a.held?0:1/a.mass,ib=b.held?0:1/b.mass,total=ia+ib;if(!total)continue;
      a.x-=hit.nx*hit.depth*ia/total;a.y-=hit.ny*hit.depth*ia/total;
      b.x+=hit.nx*hit.depth*ib/total;b.y+=hit.ny*hit.depth*ib/total;
      closing=(b.vx-a.vx)*hit.nx+(b.vy-a.vy)*hit.ny;
      if(closing<0) {
        const impulse=-(1+this.restitution)*closing/total;
        a.vx-=impulse*ia*hit.nx;a.vy-=impulse*ia*hit.ny;b.vx+=impulse*ib*hit.nx;b.vy+=impulse*ib*hit.ny;
        if(Math.abs(closing)/dt>GRAVITY*7.5/48.75){this.tip(a,Math.atan2(-hit.ny,-hit.nx)/RAD);this.tip(b,Math.atan2(hit.ny,hit.nx)/RAD);}
      }
    }
    for(const b of this.blocks)if(!b.held&&!b.offBoard&&Math.hypot(b.vx,b.vy)>.1)b.slotId=undefined;
  }

  serialize() { return JSON.stringify({ version: 1, friction: this.friction, spinFriction: this.spinFriction, gripFriction: this.gripFriction, restitution: this.restitution, blocks: this.initial }); }
  load(text: string) {
    const value = JSON.parse(text);
    if (value.version !== 1 || !Array.isArray(value.blocks) || value.blocks.length > 38 || !Number.isFinite(value.friction) || value.friction < 0 || value.friction > 1) throw new Error('Invalid mission layout.');
    const settings = {} as Record<ContactSetting, number>;
    for (const key of Object.keys(CONTACT_SETTINGS) as ContactSetting[]) {
      const spec = CONTACT_SETTINGS[key], input = value[key] === undefined ? spec.default : value[key];
      if (!Number.isFinite(input) || input < spec.min || input > spec.max) throw new Error(`Invalid ${key}.`);
      settings[key] = input;
    }
    const seen = new Set<string>(),seenZones=new Set<string>();
    const next = value.blocks.map((input: MissionBlock) => {
      if (!['pollution','neutralizer'].includes(input.kind)) throw new Error('Invalid block type.');
      const slot = this.slots(input.kind).find(s=>s.id===input.slotId);
      if (!slot || seen.has(slot.id)) throw new Error('Invalid or occupied mission site.');
      seen.add(slot.id);
      const block=this.make(input.kind,input.color,slot);
      if(block.originZone) { if(seenZones.has(block.originZone))throw new Error('V6: chỉ một pollution mỗi thành phố.');seenZones.add(block.originZone); }
      return block;
    });
    this.blocks=next; Object.assign(this, settings); this.commitLayout();
  }
}

export function drawMissionBlocks(ctx: CanvasRenderingContext2D, world: MissionWorld) {
  for (const b of world.blocks) {
    const shape=blockFootprint(b);
    ctx.save(); ctx.translate(b.x,b.y);
    if(b.offBoard){const t=Math.min(1,-(b.elevation??0)/750);ctx.globalAlpha=1-.85*t;ctx.scale(1-.4*t,1-.4*t);}
    ctx.rotate(b.rotation*RAD);
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fillRect(-shape.length/2+3,-shape.width/2+4,shape.length,shape.width);
    const hidden=world.hidePollutionColors&&b.kind==='pollution';
    ctx.fillStyle=hidden?'#9ca8ae':BLOCK_COLORS[b.color]; ctx.strokeStyle=b.held?'#fff':'#26333a'; ctx.lineWidth=b.held?2:0.8;
    ctx.fillRect(-shape.length/2,-shape.width/2,shape.length,shape.width);
    // Keep the visible outline inside the physical footprint, including held blocks.
    ctx.strokeRect(-shape.length/2+ctx.lineWidth/2,-shape.width/2+ctx.lineWidth/2,shape.length-ctx.lineWidth,shape.width-ctx.lineWidth);
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(-shape.length/2,-shape.width/2,shape.length,Math.min(3,shape.width));
    if (hidden||b.color==='mystery') { ctx.fillStyle='#344357';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('?',0,4); }
    // A symbolic white band stays inside the shared top-down footprint.
    if (b.kind==='neutralizer') {
      ctx.fillStyle='#f3efe0';
      if(b.tilt>Math.PI/4)ctx.fillRect(-shape.length/6,-shape.width/2,shape.length/3,shape.width);
      else ctx.fillRect(-shape.length/2,-shape.width/6,shape.length,shape.width/3);
    }
    ctx.restore();
  }
}
