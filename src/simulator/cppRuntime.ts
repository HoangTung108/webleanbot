import {preprocessBaseFeatures} from './baseFeatures';
import {MOTION_CALIBRATION} from './motionCalibration';
import { LEANBOT_GEOMETRY } from './robotGeometry';
export {readVirtualLine,readVirtualColor} from './virtualSensors';
export { MissionWorld, drawMissionBlocks } from './missionWorld';
export { mountMissionEditor } from './missionEditor';
export { drawLeanbot, LEANBOT_APPEARANCE } from './robotAppearance';
import { tokenizeCpp, type Token } from '../transpiler/cppParser/tokenizer';

type Node = { k: string; [key: string]: any };
type Value = number | string | boolean | null | Value[] | { [key: string]: any };
type Reference = { alias?: boolean; read(): Value; write(value: Value): void };
const isRef = (v: any): v is Reference => v != null && typeof v.read === 'function';
const copyValue = (v: Value): Value => Array.isArray(v) ? v.map(copyValue) : v && typeof v === 'object' && !isRef(v) ? Object.fromEntries(Object.entries(v).map(([k,x]) => [k,copyValue(x)])) : v;
const TYPES = new Set(['void','int','float','double','long','short','unsigned','signed','char','bool','String','const','static','inline','auto','byte','uint8_t','uint16_t','uint32_t','int8_t','int16_t','int32_t','CRGB','__FlashStringHelper']);
const SDK_CALLS = new Set(Object.entries({
  Leanbot:['begin','pingCm','pingMm','tone'],
  LbMission:['begin','end'],
  LbMotion:['runLR','runLRrpm','stopAndWait','setZeroOrigin','getDistanceMm','getRotationDeg','waitDistanceMm','waitRotationDeg'],
  LbIRLine:['setThreshold','read','value','isBlackDetected','doManualCalibration','displayOnRGB'],
  LbIRArray:['read'],
  LbTouch:['read'],
  LbRGB:['fillColor','show','getBrightness','setBrightness'],
  LbGripper:['open','close','moveTo','moveToLR'],
  APDS:['begin','colorAvailable','readColor'],
  Serial:['begin','print','println','available','read','readStringUntil'],
  'LbIoT.Wifi':['begin'],
  'LbIoT.Asset':['begin','attribute'],
}).flatMap(([object,methods])=>methods.map(method=>`${object}.${method}`)));
const INSTANCE_CALLS = new Set(['length','c_str','trim','toUpperCase','indexOf','substring','read','write']);
const assignments = new Set(['=','+=','-=','*=','/=','%=','&=','|=']);
const precedence: Record<string,number> = {'=':1,'+=':1,'-=':1,'*=':1,'/=':1,'%=':1,'&=':1,'|=':1,'?':2,'||':3,'&&':4,'|':5,'^':6,'&':7,'==':8,'!=':8,'<':9,'>':9,'<=':9,'>=':9,'<<':10,'>>':10,'+':11,'-':11,'*':12,'/':12,'%':12};

class Parser {
  tokens: Token[]; i=0; types=new Set(TYPES); structs = new Map<string,Node[]>();
  constructor(source:string) {
    this.tokens=tokenizeCpp(preprocessBaseFeatures(source)).filter(t=>!['comment','preprocessor'].includes(t.kind));
    this.tokens=this.tokens.filter((t,i,all)=>!(t.kind==='identifier' && /^(f|u|l|ul|ull)$/i.test(t.value) && all[i-1]?.kind==='number' && all[i-1].end===t.start));
    for(const t of this.tokens) if(t.kind==='number' && !/^0[xb]/i.test(t.value)) t.value=t.value.replace(/[fF]$/,'');
  }
  peek(v?:string):any { return v===undefined?this.tokens[this.i]?.value:this.tokens[this.i]?.value===v; }
  take(v?:string):string { const t=this.tokens[this.i++]; if(!t || v!==undefined&&t.value!==v) throw new Error(`Dòng ${t?.line??'cuối'}: cần ${v??'biểu thức'}, gặp ${t?.value??'hết code'}`);return t.value; }
  eat(v:string) {if(this.peek(v)){this.i++;return true;}return false;}
  expr(min=0):Node {
    let n:Node;const t=this.tokens[this.i];if(!t)throw new Error('Thiếu biểu thức');
    if(this.peek('(')&&this.types.has(this.tokens[this.i+1]?.value)) {this.take();let type='';while(!this.peek(')'))type+=this.take()+' ';this.take();n={k:'cast',type,value:this.expr(13)};}
    else if(this.eat('(')){n=this.expr();this.take(')');}
    else if(this.eat('{')){const values:Node[]=[];if(!this.peek('}')) do{values.push(this.expr());}while(this.eat(',')&&!this.peek('}'));this.take('}');n={k:'array',values};}
    else if(['!','~','-','+','++','--','*','&'].includes(this.peek()))n={k:'unary',op:this.take(),value:this.expr(13)};
    else if(t.kind==='number'){this.i++;n={k:'literal',value:Number(t.value)};}
    else if(t.kind==='string'){this.i++;n={k:'literal',value:t.value.slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"')};}
    else if(t.kind==='identifier')n={k:'name',name:this.take()};
    else throw new Error(`Dòng ${t.line}: biểu thức chưa hỗ trợ ${t.value}`);
    while(true){
      if(this.eat('.')||this.eat('::')||this.eat('->')){n={k:'member',value:n,name:this.take()};continue;}
      if(this.eat('(')){const args:Node[]=[];if(!this.peek(')'))do{args.push(this.expr());}while(this.eat(','));this.take(')');n={k:'call',callee:n,args};continue;}
      if(this.eat('[')){const index=this.expr();this.take(']');n={k:'index',value:n,index};continue;}
      if(['++','--'].includes(this.peek())){n={k:'post',op:this.take(),value:n};continue;}
      const op=this.peek(),level=precedence[op];if(level===undefined||level<min)break;this.take();
      if(op==='?'){const yes=this.expr();this.take(':');n={k:'ternary',condition:n,yes,no:this.expr(2)};}
      else n={k:'binary',op,left:n,right:this.expr(level+(assignments.has(op)?0:1))};
    }return n;
  }
  type():string {let type='';while(this.types.has(this.peek()))type+=this.take()+' ';while(['*','&'].includes(this.peek()))type+=this.take();return type;}
  declaration():Node {
    const type=this.type(),name=this.take();
    if(this.eat('(')){
      const params:Node[]=[];
      if(!this.peek(')'))do{const type=this.type();if(type.trim()==='void'&&this.peek(')'))break;const name=this.take();const value=this.eat('=')?this.expr():null;params.push({k:'param',type,name,value});}while(this.eat(','));
      this.take(')');if(this.eat(';'))return{k:'prototype',name,params};return{k:'function',name,params,body:this.statement()};
    }
    const declarations:Node[]=[];let next=name;
    do{const dimensions:Node[]=[];while(this.eat('[')){dimensions.push(this.peek(']')?{k:'literal',value:0}:this.expr());this.take(']');}
      const value=this.eat('=')?this.expr():null;declarations.push({k:'declare',name:next,type,value,dimensions});
      if(!this.eat(','))break;next=this.take();
    }while(true);
    this.take(';');return{k:'declarations',body:declarations};
  }
  statement():Node {
    if(this.eat(';'))return{k:'empty'};
    if(this.eat('{')){const body:Node[]=[];while(!this.peek('}'))body.push(this.statement());this.take('}');return{k:'block',body};}
    if(this.eat('struct')){const name=this.take();this.types.add(name);this.take('{');const fields:Node[]=[];while(!this.peek('}'))fields.push(...this.declaration().body);this.take('}');this.take(';');this.structs.set(name,fields);return{k:'empty'};}
    if(this.eat('enum')){const type=this.take();this.types.add(type);this.take('{');const entries:Node[]=[];do{const name=this.take();entries.push({k:'entry',name,value:this.eat('=')?this.expr():null});}while(this.eat(',')&&!this.peek('}'));this.take('}');this.take(';');return{k:'enum',entries};}
    if(this.eat('if')){this.take('(');const condition=this.expr();this.take(')');const yes=this.statement();return{k:'if',condition,yes,no:this.eat('else')?this.statement():null};}
    if(this.eat('while')){this.take('(');const condition=this.expr();this.take(')');return{k:'while',condition,body:this.statement()};}
    if(this.eat('for')){this.take('(');const init=this.statement();const condition=this.expr();this.take(';');const next=this.expr();this.take(')');return{k:'for',init,condition,next,body:this.statement()};}
    if(this.eat('switch')){this.take('(');const value=this.expr();this.take(')');this.take('{');const cases:Node[]=[];while(!this.peek('}')){const def=this.eat('default');if(!def)this.take('case');const label=def?null:this.expr();this.take(':');const body:Node[]=[];while(!['case','default','}'].includes(this.peek()))body.push(this.statement());cases.push({k:'case',label,body});}this.take('}');return{k:'switch',value,cases};}
    for(const k of ['break','continue','return'])if(this.eat(k)){const value=k==='return'&&!this.peek(';')?this.expr():null;this.take(';');return{k,value};}
    if(this.types.has(this.peek()))return this.declaration();const value=this.expr();this.take(';');return{k:'expression',value};
  }
  parse(){const nodes:Node[]=[];while(this.i<this.tokens.length)nodes.push(this.statement());return nodes;}
}
const callName = (n:Node):string => n.k==='name'?n.name:n.k==='member'?`${callName(n.value)}.${n.name}`:'';

export interface RuntimeHost {
  touch?(buttons: number): boolean;
  lineMask?(): number;
  rawLine?(): readonly number[]; // 2L, 0L, 1R, 3R
  // Ideal object response under full RGB illumination; null means sensor unavailable.
  color?(): readonly [number,number,number] | null;
  colorAmbient?(): readonly [number,number,number];
  led?(rgb:readonly number[],brightness:number):void;
  iotRead?(attribute:string,assetId:string):string|undefined;
  iotWrite?(attribute:string,value:string,assetId:string):void;
  motors(left: number, right: number): void;
  advance(seconds: number): void;
  log?(message: string): void;
  sensors?(): { distance?: number; irLine?: { left: number; center: number; right: number } };
  gripper?(left: number, right: number, durationMs?: number): void;
}
type Scope = Map<string, Value>;
type Yield = { ms?: number; end?: boolean };
class Flow { constructor(public kind: string, public value: Value = null) {} }

/** Cooperative interpreter for the supported Leanbot C++ subset; no eval or JS execution. */
export class CppRuntime {
  private nodes: Node[]; private functions = new Map<string, Node[]>(); private scopes: Scope[] = [new Map()];
  private iterator?: Generator<Yield, void, unknown>; private pending = 0;
  private missionStarted=false;
  private cachedLineMask=0;
  running = false; time = 0; distance = 0; rotation = 0; left = 0; right = 0;
  constructor(source: string, private host: RuntimeHost, private readonly distanceScale: number = MOTION_CALIBRATION.physicalMmPerEncoderMm) {
    if(!Number.isFinite(distanceScale)||distanceScale<=0)throw new Error('Hệ số hiệu chuẩn quãng đường phải là số dương hữu hạn.');
    const parser = new Parser(source); this.nodes=parser.parse(); this.structs=parser.structs;
    for(const n of this.nodes) if(n.k==='function')this.functions.set(n.name,[...(this.functions.get(n.name)??[]),n]);
    for(const n of this.nodes) if(n.k==='prototype') for(const fn of this.functions.get(n.name)??[]) if(fn.params.length===n.params.length) fn.params.forEach((p:Node,i:number)=>p.value??=n.params[i].value);
    const builtins=new Set(['F','CRGB','BITMAP','millis','delay','LbDelay','isfinite','isnan','fabsf','fabs','abs','lroundf','round','sqrtf','sqrt','min','max','constrain','strcmp']);
    const validate=(n:any):void=>{
      if(!n||typeof n!=='object')return;
      if(n.k==='call'){
        const name=callName(n.callee);
        const instance=n.callee.k==='member'&&!/^(Leanbot|Lb[A-Z]\w*|APDS|Serial|CRGB)(\.|$)/.test(name)&&INSTANCE_CALLS.has(n.callee.name);
        if(!this.functions.has(name)&&!builtins.has(name)&&!SDK_CALLS.has(name)&&!instance)throw new Error(`Hàm chưa hỗ trợ trong giả lập: ${name}`);
      }
      for(const v of Object.values(n))if(Array.isArray(v))v.forEach(validate);else if(typeof v==='object')validate(v);
    };
    this.nodes.forEach(validate);
  }
  private structs = new Map<string,Node[]>();
  private thresholds=[69,78,106,70];
  private brightness=255;
  private rgb:number[]=[0,0,0];
  private shownRgb:number[]=[0,0,0];
  private shownBrightness=255;
  private assetId='';
  private serial='';
  private touchMask=0;
  private touchFrom=0;
  private touchUntil=0;
  /** A physical-button pulse in simulation time, including startup/release debounce. */
  pressTouch(button:number):boolean {
    if(!this.running||![1,2,3,4,8].includes(button)||this.time<this.touchUntil)return false;
    this.touchMask=button;
    this.touchFrom=Math.max(this.time,this.touchUntil+40,50);
    this.touchUntil=this.touchFrom+100;
    return true;
  }
  private iot = new Map<string,string>();
  private *location(n:Node):Generator<Yield,Reference,unknown> {
    if(n.k==='name'){
      const scope=[...this.scopes].reverse().find(s=>s.has(n.name));if(!scope)throw new Error(`Biến chưa khai báo: ${n.name}`);
      const value=scope.get(n.name);if(isRef(value)&&value.alias)return value;
      return {read:()=>scope.get(n.name)!,write:v=>scope.set(n.name,copyValue(v))};
    }
    if(n.k==='unary'&&n.op==='*'){const ref=yield* this.expr(n.value);if(isRef(ref))return ref;}
    if(n.k==='member'||n.k==='index'){
      let obj=yield* this.expr(n.value);if(isRef(obj))obj=obj.read();
      const key=n.k==='member'?n.name:Number(yield* this.expr(n.index));
      if(obj&&typeof obj==='object')return {read:()=> (obj as any)[key],write:v=>{(obj as any)[key]=copyValue(v);}};
    }throw new Error('Biểu thức không thể gán');
  }

  private get(name: string): Value {
    if (name === 'true') return true; if (name === 'false') return false; if (name === 'nullptr') return null;
    if (/^TB[12][AB]$/.test(name)) return 1 << ['TB1A','TB1B','TB2A','TB2B'].indexOf(name);
    if (name === 'HIGH') return 1; if (name === 'LOW') return 0;
    if (/^led[OABCDEF]$/.test(name)) return 'OABCDEF'.indexOf(name[3]);
    if(name==='NAN')return NaN;
    if(/^ir[0123][LR]$/.test(name))return Number(name[2]);
    for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return isRef(this.scopes[i].get(name)) && (this.scopes[i].get(name) as Reference).alias ? (this.scopes[i].get(name) as Reference).read() : this.scopes[i].get(name)!;
    throw new Error(`Biến chưa khai báo: ${name}`);
  }
  private set(name: string, value: Value) {
    for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) { const old=this.scopes[i].get(name);if(isRef(old)&&old.alias)old.write(value);else this.scopes[i].set(name,copyValue(value)); return; }
    throw new Error(`Biến chưa khai báo: ${name}`);
  }
  private *expr(n: Node): Generator<Yield, Value, unknown> {
    switch (n.k) {
      case 'literal': return n.value;
      case 'name': return this.get(n.name);
      case 'member': {
        if(callName(n).startsWith('CRGB.'))return ({Red:[255,0,0],Green:[0,128,0],Lime:[0,255,0],Blue:[0,0,255],Yellow:[255,255,0],Purple:[128,0,128],Black:[0,0,0],White:[255,255,255]} as Record<string,Value>)[n.name]??[0,0,0];
        return (yield* this.location(n)).read();
      }
      case 'array': { const a: Value[] = []; for (const x of n.values) a.push(yield* this.expr(x)); return a; }
      case 'index': { const array = yield* this.expr(n.value); const index = Number(yield* this.expr(n.index)); if (!Array.isArray(array) || !(index in array)) throw new Error('Chỉ số mảng không hợp lệ'); return array[index]; }
      case 'cast': { const v = yield* this.expr(n.value); return /\b(int|long|short|u?int\d+_t|byte)\b/.test(n.type) ? Math.trunc(Number(v)) : Number(v); }
      case 'ternary': return yield* this.expr((yield* this.expr(n.condition)) ? n.yes : n.no);
      case 'unary': { if(n.op==='&')return yield* this.location(n.value); const v = yield* this.expr(n.value); if(n.op==='*'){if(!isRef(v))throw new Error('Con trỏ không hợp lệ');return v.read();} if(n.op==='~')return ~Number(v);if (n.op === '!') return !v; if (n.op === '-') return -Number(v); if (n.op === '+') return Number(v); const result = Number(v) + (n.op === '++' ? 1 : -1); (yield* this.location(n.value)).write(result); return result; }
      case 'post': { const v = yield* this.expr(n.value); (yield* this.location(n.value)).write(Number(v) + (n.op === '++' ? 1 : -1)); return v; }
      case 'binary': {
        const loc=assignments.has(n.op)?yield* this.location(n.left):null;
        const a = n.op==='='?0:yield* this.expr(n.left);
        if (n.op === '&&' && !a) return false; if (n.op === '||' && a) return true;
        const b = yield* this.expr(n.right); const x = Number(a), y = Number(b);
        switch (n.op) {
          case '=': loc!.write(b); return b;
          case '+=': loc!.write(x + y); return x + y;
          case '-=': loc!.write(x - y); return x - y;
          case '*=':loc!.write(x*y);return x*y;case '/=':loc!.write(x/y);return x/y;case '&=':loc!.write(x&y);return x&y;case '|=':loc!.write(x|y);return x|y;case '%=':loc!.write(x%y);return x%y;
          case '&':return x&y;case '|':return x|y;case '^':return x^y;case '<<':return x<<y;case '>>':return x>>y;
          case '+': return x + y; case '-': return x - y; case '*': return x * y; case '/': return x / y; case '%': return x % y;
          case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y;
          case '==': return a === b; case '!=': return a !== b; case '&&': return Boolean(b); case '||': return Boolean(b);
        } break;
      }
      case 'call': {
        const name=callName(n.callee);const fn=this.findFunction(name,n.args.length);
        const args:Value[]=[];
        for(let i=0;i<n.args.length;i++)args.push((fn?.params[i]?.type.includes('&')&&!fn?.params[i]?.type.includes('const'))||name==='APDS.readColor'?yield* this.location(n.args[i]):yield* this.expr(n.args[i]));
        if(n.callee.k==='member'&&!/^(Leanbot|Lb|APDS|Serial|CRGB)/.test(name)){
          const obj=yield* this.expr(n.callee.value);const method=n.callee.name;
          if(typeof obj==='string'){
            if(method==='length')return obj.length;if(method==='c_str')return obj;
            if(method==='indexOf')return obj.indexOf(String(args[0]??''));
            if(method==='substring')return obj.substring(Number(args[0]??0),args.length>1?Number(args[1]):undefined);
            if(method==='trim'||method==='toUpperCase'){(yield* this.location(n.callee.value)).write(method==='trim'?obj.trim():obj.toUpperCase());return null;}
          }
          if(obj&&typeof obj==='object'&&'attribute' in obj){const attr=String(obj.attribute),key=JSON.stringify([this.assetId,attr]);if(method==='read')return this.host.iotRead?.(attr,this.assetId)??this.iot.get(key)??'waiting';if(method==='write'){this.iot.set(key,String(args[0]));this.host.iotWrite?.(attr,String(args[0]),this.assetId);return null;}}
        }
        return yield* this.call(name,args);
      }
    }
    throw new Error(`Biểu thức chưa hỗ trợ: ${n.k}`);
  }
  private motors(left: number, right: number) {
    // Measured calibration: runLR(2000, 2000) travels 325 mm in 5 s.
    this.left = Math.max(-65, Math.min(65, left)); this.right = Math.max(-65, Math.min(65, right));
    this.host.motors(this.left, this.right);
  }
  private findFunction(name:string,count:number){return this.functions.get(name)?.find(fn=>count<=fn.params.length&&fn.params.slice(count).every((p:Node)=>p.value!==null));}
  private *call(name: string, args: Value[]): Generator<Yield, Value, unknown> {
    const nums = args.map(Number), [a = 0, b = 0, c = 0] = nums;
    const fn = this.findFunction(name,args.length);
    if (fn) {
      if (this.scopes.length > 64) throw new Error('Hàm gọi lồng nhau quá sâu');
      const scope:Scope=new Map();
      for(let i=0;i<fn.params.length;i++){const p=fn.params[i];scope.set(p.name,i<args.length?(p.type.includes('&')&&!p.type.includes('const')?{...(args[i] as Reference),alias:true}:p.type.includes('*')?args[i]:copyValue(args[i])):yield* this.expr(p.value));}
      this.scopes.push(scope);
      try { yield* this.statement(fn.body); } catch (e) { if (e instanceof Flow && e.kind === 'return') return e.value; throw e; }
      finally { this.scopes.pop(); } return null;
    }
    switch (name) {
      case 'LbIRLine.setThreshold': this.thresholds=nums;return null;
      case 'LbIRLine.read': const raw=this.host.rawLine?.();this.cachedLineMask=raw?raw.reduce((mask,v,i)=>mask|(v>=this.thresholds[i]?1<<(3-i):0),0):(this.host.lineMask?.()??0)&15; return this.cachedLineMask;
      case 'F':return args[0];
      case 'CRGB':return nums;
      case 'BITMAP':return nums.reduce((mask, index) => mask | (1 << index), 0);
      case 'LbTouch.read':return this.host.touch?.(a)||(this.time>=this.touchFrom&&this.time<this.touchUntil&&!!(this.touchMask&a)) ? 1 : 0;
      case 'LbIoT.Asset.attribute':return {attribute:String(args[0])};
      case 'LbIoT.Asset.begin':this.assetId=String(args[0]);return null;
      case 'LbIoT.Wifi.begin':this.host.log?.('IoT giả lập: dùng thuộc tính cục bộ, không kết nối máy chủ thật.');return null;
      case 'APDS.begin':return !!this.host.color;
      case 'APDS.colorAvailable':return !!this.host.color?.();
      case 'APDS.readColor':{
        const sample=this.host.color?.();if(!sample)return false;
        const ambient=this.host.colorAmbient?.()??[0,0,0];
        const measured=sample.map((value,i)=>value<0?value:Math.round(ambient[i]+value*(this.shownRgb[i]??0)/255*this.shownBrightness/255));
        args.forEach((v,i)=>{if(isRef(v))v.write(measured[i]);});return true;
      }
      case 'LbIRArray.read':{const index=[2,0,1,3].indexOf(a);return this.host.rawLine?.()[index]??((this.host.lineMask?.()??0)&(1<<(3-index))?4095:0);}
      case 'LbIRLine.isBlackDetected':return this.cachedLineMask!==0;
      case 'LbIRLine.doManualCalibration':this.host.log?.('Line giả lập dùng cảm biến lý tưởng theo hình học sa bàn; hiệu chuẩn nút chạm cần robot thật.');return null;
      case 'LbIRLine.displayOnRGB':this.rgb=[3,2,1,0].flatMap(bit=>this.cachedLineMask&(1<<bit)?args[0] as number[]:[0,0,0]);return null;
      case 'LbRGB.getBrightness':return this.brightness;
      case 'LbRGB.setBrightness':this.brightness=a;return null;
      case 'LbRGB.fillColor':this.rgb=[...(args[0] as number[])];return null;
      case 'LbRGB.show':this.shownRgb=[...this.rgb];this.shownBrightness=this.brightness;this.host.led?.(this.rgb,this.brightness);return null;
      case 'LbIRLine.value': return this.cachedLineMask;
      case 'Leanbot.begin': case 'Serial.begin': return null;
      case 'Serial.available': return 0;
      case 'Serial.read': return -1;
      case 'Serial.readStringUntil': return '';
      case 'LbMission.begin':
        // Run supplies one start signal. The hardware waits for touch buttons
        // again at the next mission; never auto-start another route here.
        if(this.missionStarted){this.motors(0,0);yield {end:true};return null;}
        this.missionStarted=true;return null;
      case 'LbMission.end': this.motors(0, 0); yield { end: true }; return null;
      case 'LbMotion.runLR': this.motors(Math.max(-2000,Math.min(2000,a)) * 65 / 2000, Math.max(-2000,Math.min(2000,b)) * 65 / 2000); return null;
      case 'LbMotion.runLRrpm': this.motors(a * 2 * Math.PI * 16.25 / 60, b * 2 * Math.PI * 16.25 / 60); return null;
      case 'LbMotion.stopAndWait': this.motors(0, 0); return null;
      case 'LbMotion.setZeroOrigin': this.distance = 0; this.rotation = 0; return null;
      case 'LbMotion.getDistanceMm': return this.distance;
      case 'LbMotion.getRotationDeg': return this.rotation;
      case 'millis': return Math.floor(this.time);
      case 'LbDelay': case 'delay': if (!Number.isFinite(a) || a < 0) throw new Error('Thời gian chờ không hợp lệ'); yield { ms: a }; return null;
      case 'LbMotion.waitDistanceMm': {
        const speed = Math.abs((this.left + this.right) / 2); if (!speed && a) throw new Error('Không thể chờ quãng đường khi robot đứng yên');
        yield { ms: speed ? Math.abs(a) * this.distanceScale / speed * 1000 : 0 }; return null;
      }
      case 'LbMotion.waitRotationDeg': {
        const speed = Math.abs((this.left - this.right) / LEANBOT_GEOMETRY.wheelBase * 180 / Math.PI); if (!speed && a) throw new Error('Không thể chờ góc quay khi hai bánh chạy cùng tốc độ');
        yield { ms: speed ? Math.abs(a) / speed * 1000 : 0 }; return null;
      }
      case 'isnan':return Number.isNaN(a);
      case 'isfinite': return Number.isFinite(a);
      case 'sqrtf': case 'sqrt': return Math.sqrt(a);
      case 'fabsf': case 'fabs': case 'abs': return Math.abs(a);
      case 'lroundf': case 'round': return Math.sign(a) * Math.floor(Math.abs(a) + 0.5);
      case 'min': return Math.min(...nums); case 'max': return Math.max(...nums);
      case 'constrain': return Math.max(b, Math.min(c, a));
      case 'strcmp': return String(args[0]) === String(args[1]) ? 0 : String(args[0]) < String(args[1]) ? -1 : 1;
      case 'Serial.print':case 'Serial.println':this.serial+=String(args[0]??'');if(name==='Serial.println'){this.host.log?.(this.serial);this.serial='';}return null;
      case 'Leanbot.pingMm': return this.host.sensors?.().distance ?? 300;
      case 'Leanbot.pingCm': return (this.host.sensors?.().distance ?? 300) / 10;
      case 'LbGripper.open': this.host.gripper?.(0, 0); return null;
      case 'LbGripper.close': this.host.gripper?.(90, 90); return null;
      case 'LbGripper.moveTo': case 'LbGripper.moveToLR': {
        const lr=name.endsWith('LR'),duration=lr?c:b;
        if(!Number.isFinite(duration)||duration<0)throw new Error('Thời gian đóng/mở tay gắp không hợp lệ');
        this.host.gripper?.(a,lr?b:a,duration);
        if(duration>0)yield {ms:duration};return null;
      }
      case 'Leanbot.tone': yield { ms: b }; return null;
    }
    throw new Error(`Hàm chưa hỗ trợ: ${name}`);
  }
  private *statement(n: Node): Generator<Yield, void, unknown> {
    yield {}; // Every statement yields, so runaway loops remain interruptible.
    switch (n.k) {
      case 'block':
        this.scopes.push(new Map());
        try { for (const s of n.body) yield* this.statement(s); } finally { this.scopes.pop(); }
        return;
      case 'function': case 'prototype': case 'empty': return;
      case 'declarations':for(const item of n.body)yield* this.statement(item);return;
      case 'enum': {let value=0;for(const entry of n.entries){if(entry.value)value=Number(yield* this.expr(entry.value));this.scopes[0].set(entry.name,value++);}return;}
      case 'declare': {
        const structType=[...this.structs.keys()].find(t=>n.type.split(/\s+/).includes(t));
        let v:Value=n.value?yield* this.expr(n.value):structType?Object.fromEntries(this.structs.get(structType)!.map(f=>[f.name,0])):0;
        if(structType&&Array.isArray(v)){const initial=v;v=Object.fromEntries(this.structs.get(structType)!.map((f,i)=>[f.name,initial[i]??0]));}
        const sizes:number[]=[];for(const dim of n.dimensions)sizes.push(Number(yield* this.expr(dim)));
        const slots=sizes.reduce((total,size,i)=>total*(size||(i===0&&Array.isArray(v)?v.length:0)),1);
        if(sizes.some(size=>!Number.isSafeInteger(size)||size<0)||slots>65536)throw new Error('Mảng vượt giới hạn 65536 phần tử của giả lập');
        const fill=(depth:number,initial:Value):Value=>depth>=sizes.length?initial??0:Array.from({length:sizes[depth]|| (Array.isArray(initial)?initial.length:0)},(_,i)=>fill(depth+1,Array.isArray(initial)?initial[i]:0));
        if(sizes.length)v=fill(0,v);
        if(/\b(int|long|short|u?int\d+_t|byte)\b/.test(n.type)&&!Array.isArray(v))v=Math.trunc(Number(v));
        this.scopes.at(-1)!.set(n.name,copyValue(v));return;
      }
      case 'expression': yield* this.expr(n.value); return;
      case 'if': { const branch = (yield* this.expr(n.condition)) ? n.yes : n.no; if (branch) yield* this.statement(branch); return; }
      case 'for': case 'while': {
        if (n.init) yield* this.statement(n.init);
        while (yield* this.expr(n.condition)) {
          try { yield* this.statement(n.body); } catch (e) { if (!(e instanceof Flow)) throw e; if (e.kind === 'break') break; if (e.kind !== 'continue') throw e; }
          if (n.next) yield* this.expr(n.next);
        } return;
      }
      case 'switch': {
        const v = yield* this.expr(n.value); let active = false;
        try { for (const item of n.cases) { if (item.label === null || (yield* this.expr(item.label)) === v) active = true; if (active) for (const s of item.body) yield* this.statement(s); } }
        catch (e) { if (!(e instanceof Flow) || e.kind !== 'break') throw e; } return;
      }
      case 'return': throw new Flow('return', n.value ? yield* this.expr(n.value) : null);
      case 'break': case 'continue': throw new Flow(n.k);
    }
    throw new Error(`Câu lệnh chưa hỗ trợ: ${n.k}`);
  }
  private *program(): Generator<Yield, void, unknown> {
    for (const n of this.nodes) if (n.k !== 'function') yield* this.statement(n);
    if (this.functions.has('setup')) yield* this.call('setup', []);
    if (this.functions.has('loop')) while (true) {
      const missionWasStarted=this.missionStarted;
      yield* this.call('loop', []);
      if(!missionWasStarted&&this.missionStarted){this.motors(0,0);return;}
      yield { ms: 1 };
    }
  }
  start() { this.touchMask=this.touchFrom=this.touchUntil=0;this.missionStarted=false;this.cachedLineMask=0;this.thresholds=[69,78,106,70];this.serial='';this.iot.clear();this.brightness=this.shownBrightness=255;this.rgb=[0,0,0];this.shownRgb=[0,0,0];this.assetId='';this.host.led?.(this.rgb,this.brightness);this.scopes = [new Map()]; this.iterator = this.program(); this.running = true; this.time = this.distance = this.rotation = this.pending = 0; this.motors(0, 0); }
  stop() { this.touchMask=this.touchFrom=this.touchUntil=0;this.running = false; this.motors(0, 0); }
  tick(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return;
    if (milliseconds === 0) { this.tickSlice(0); return; }
    let remaining = milliseconds;
    while (remaining > 0 && this.running) {
      const slice = Math.min(100, remaining);
      this.tickSlice(slice);
      remaining -= slice;
    }
  }

  private tickSlice(milliseconds: number) {
    if (!this.running || !this.iterator) return;
    let remaining = Math.max(0, Math.min(100, milliseconds)); let budget = 20000;
    try {
      while (this.running && budget-- > 0) {
        if (this.pending > 0) {
          if (remaining <= 0) break;
          const dt = Math.min(this.pending, remaining, 5);
          this.host.advance(dt / 1000); this.time += dt;
          // Physical wheel speeds stay unchanged; distance feedback has its own calibration.
          this.distance += (this.left + this.right) / 2 * dt / 1000 / this.distanceScale;
          this.rotation += (this.left - this.right) / LEANBOT_GEOMETRY.wheelBase * 180 / Math.PI * dt / 1000;
          this.pending -= dt; remaining -= dt;
        } else {
          const next = this.iterator.next();
          if (next.done || next.value.end) { this.stop(); break; }
          this.pending = next.value.ms ?? 0;
        }
      }
      if (budget <= 0) throw new Error('Vòng lặp không có lệnh chờ; thêm LbDelay(1) để giả lập tiếp tục.');
    } catch (error) { this.stop(); throw error; }
  }
}
