import { LEANBOT_GEOMETRY } from './robotGeometry';
export { MissionWorld, drawMissionBlocks } from './missionWorld';
export { mountMissionEditor } from './missionEditor';
export { drawLeanbot, LEANBOT_APPEARANCE } from './robotAppearance';
import { tokenizeCpp, type Token } from '../transpiler/cppParser/tokenizer';

type Node = { k: string; [key: string]: any };
type Value = number | string | boolean | null | Value[];
const TYPES = new Set(['void', 'int', 'float', 'double', 'long', 'short', 'unsigned', 'signed', 'char', 'bool', 'String', 'const', 'static', 'auto']);
const precedence: Record<string, number> = { '=': 1, '+=': 1, '-=': 1, '?': 2, '||': 3, '&&': 4, '==': 5, '!=': 5, '<': 6, '>': 6, '<=': 6, '>=': 6, '+': 7, '-': 7, '*': 8, '/': 8, '%': 8 };

class Parser {
  tokens: Token[]; i = 0; types = new Set(TYPES);
  constructor(source: string) {
    // Numeric suffixes are part of C++ literals, not variable names.
    this.tokens = tokenizeCpp(source).filter(t => !['comment', 'preprocessor'].includes(t.kind));
    this.tokens = this.tokens.filter((t, i, all) => !(t.kind === 'identifier' && /^(f|u|l|ul|ull)$/i.test(t.value) && all[i - 1]?.kind === 'number' && all[i - 1].end === t.start));
    for (const t of this.tokens) if (t.kind === 'number' && !/^0x/i.test(t.value)) t.value = t.value.replace(/[fF]$/, '');
  }
  peek(v?: string): any { return v === undefined ? this.tokens[this.i]?.value : this.tokens[this.i]?.value === v; }
  take(v?: string): string {
    const t = this.tokens[this.i++];
    if (!t || (v !== undefined && t.value !== v)) throw new Error(`Dòng ${t?.line ?? 'cuối'}: cần ${v ?? 'biểu thức'}, gặp ${t?.value ?? 'hết code'}`);
    return t.value;
  }
  eat(v: string) { if (this.peek(v)) { this.i++; return true; } return false; }
  expr(min = 0): Node {
    let n: Node;
    const t = this.tokens[this.i];
    if (!t) throw new Error('Thiếu biểu thức');
    if (this.peek('(') && this.types.has(this.tokens[this.i + 1]?.value)) {
      this.take('('); let type = ''; while (!this.peek(')')) type += this.take() + ' '; this.take(')');
      n = { k: 'cast', type, value: this.expr(9) };
    } else if (this.eat('(')) { n = this.expr(); this.take(')'); }
    else if (['!', '-', '+', '++', '--'].includes(this.peek())) n = { k: 'unary', op: this.take(), value: this.expr(9) };
    else if (t.kind === 'number') { this.i++; n = { k: 'literal', value: Number(t.value) }; }
    else if (t.kind === 'string') { this.i++; n = { k: 'literal', value: t.value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"') }; }
    else if (t.kind === 'identifier') {
      let name = this.take();
      while (this.eat('.') || this.eat('::')) name += '.' + this.take();
      n = { k: 'name', name };
    } else throw new Error(`Dòng ${t.line}: biểu thức chưa hỗ trợ ${t.value}`);
    while (true) {
      if (this.eat('(')) {
        const args: Node[] = []; if (!this.peek(')')) do { args.push(this.expr()); } while (this.eat(','));
        this.take(')'); n = { k: 'call', name: n.name, args }; continue;
      }
      if (this.eat('[')) { const index = this.expr(); this.take(']'); n = { k: 'index', value: n, index }; continue; }
      if (['++', '--'].includes(this.peek())) { n = { k: 'post', op: this.take(), value: n }; continue; }
      const op = this.peek(), level = precedence[op];
      if (level === undefined || level < min) break;
      this.take();
      if (op === '?') { const yes = this.expr(); this.take(':'); n = { k: 'ternary', condition: n, yes, no: this.expr(2) }; }
      else n = { k: 'binary', op, left: n, right: this.expr(level + (['=', '+=', '-='].includes(op) ? 0 : 1)) };
    }
    return n;
  }
  declaration(): Node {
    let type = '';
    while (this.types.has(this.peek())) type += this.take() + ' ';
    while (this.eat('*') || this.eat('&')) { /* parameter pointer/reference */ }
    const name = this.take();
    if (this.eat('(')) {
      const params: string[] = [];
      if (!this.peek(')')) do {
        while (this.types.has(this.peek()) || ['*', '&'].includes(this.peek())) this.take();
        params.push(this.take());
      } while (this.eat(','));
      this.take(')'); return { k: 'function', name, params, body: this.statement() };
    }
    let array = false;
    if (this.eat('[')) { array = true; if (!this.peek(']')) this.expr(); this.take(']'); }
    let value: Node = { k: 'literal', value: 0 };
    if (this.eat('=')) {
      if (array && this.eat('{')) {
        const values: Node[] = []; if (!this.peek('}')) do { values.push(this.expr()); } while (this.eat(','));
        this.take('}'); value = { k: 'array', values };
      } else value = this.expr();
    }
    this.take(';'); return { k: 'declare', name, type, value };
  }
  statement(): Node {
    if (this.eat(';')) return { k: 'block', body: [] };
    if (this.eat('{')) { const body: Node[] = []; while (!this.peek('}')) body.push(this.statement()); this.take('}'); return { k: 'block', body }; }
    if (this.eat('enum')) {
      const type = this.take(); this.types.add(type); this.take('{'); const names: string[] = [];
      do { names.push(this.take()); } while (this.eat(',')); this.take('}'); this.take(';'); return { k: 'enum', names };
    }
    if (this.eat('if')) { this.take('('); const condition = this.expr(); this.take(')'); const yes = this.statement(); return { k: 'if', condition, yes, no: this.eat('else') ? this.statement() : null }; }
    if (this.eat('while')) { this.take('('); const condition = this.expr(); this.take(')'); return { k: 'while', condition, body: this.statement() }; }
    if (this.eat('for')) {
      this.take('('); const init = this.statement(); const condition = this.expr(); this.take(';'); const next = this.expr(); this.take(')');
      return { k: 'for', init, condition, next, body: this.statement() };
    }
    if (this.eat('switch')) {
      this.take('('); const value = this.expr(); this.take(')'); this.take('{'); const cases: Node[] = [];
      while (!this.peek('}')) {
        const isDefault = this.eat('default'); if (!isDefault) this.take('case');
        const label = isDefault ? null : this.expr(); this.take(':'); const body: Node[] = [];
        while (!['case', 'default', '}'].includes(this.peek())) body.push(this.statement());
        cases.push({ k: 'case', label, body });
      }
      this.take('}'); return { k: 'switch', value, cases };
    }
    for (const k of ['break', 'continue', 'return']) if (this.eat(k)) { const value = k === 'return' && !this.peek(';') ? this.expr() : null; this.take(';'); return { k, value }; }
    if (this.types.has(this.peek())) return this.declaration();
    const value = this.expr(); this.take(';'); return { k: 'expression', value };
  }
  parse() { const nodes: Node[] = []; while (this.i < this.tokens.length) nodes.push(this.statement()); return nodes; }
}

export interface RuntimeHost {
  motors(left: number, right: number): void;
  advance(seconds: number): void;
  log?(message: string): void;
  sensors?(): { distance?: number; irLine?: { left: number; center: number; right: number } };
  gripper?(left: number, right: number): void;
}
type Scope = Map<string, Value>;
type Yield = { ms?: number; end?: boolean };
class Flow { constructor(public kind: string, public value: Value = null) {} }

/** Cooperative interpreter for the supported Leanbot C++ subset; no eval or JS execution. */
export class CppRuntime {
  private nodes: Node[]; private functions = new Map<string, Node>(); private scopes: Scope[] = [new Map()];
  private iterator?: Generator<Yield, void, unknown>; private pending = 0;
  running = false; time = 0; distance = 0; rotation = 0; left = 0; right = 0;
  constructor(source: string, private host: RuntimeHost) {
    this.nodes = new Parser(source).parse();
    for (const n of this.nodes) if (n.k === 'function') this.functions.set(n.name, n);
    const builtins = new Set(['Leanbot.begin', 'LbMission.begin', 'LbMission.end', 'LbMotion.runLR', 'LbMotion.runLRrpm', 'LbMotion.stopAndWait', 'LbMotion.setZeroOrigin', 'LbMotion.getDistanceMm', 'LbMotion.getRotationDeg', 'LbMotion.waitDistanceMm', 'LbMotion.waitRotationDeg', 'LbDelay', 'delay', 'millis', 'isfinite', 'fabsf', 'fabs', 'abs', 'lroundf', 'round', 'min', 'max', 'constrain', 'strcmp', 'Serial.begin', 'Serial.println', 'Serial.print', 'LbGripper.open', 'LbGripper.close', 'LbGripper.moveToLR', 'LbGripper.moveTo', 'Leanbot.pingCm', 'Leanbot.pingMm', 'Leanbot.tone', 'LbRGB.show']);
    const validate = (n: any) => {
      if (!n || typeof n !== 'object') return;
      if (n.k === 'call' && !this.functions.has(n.name) && !builtins.has(n.name)) throw new Error(`Hàm chưa hỗ trợ trong giả lập: ${n.name}`);
      for (const v of Object.values(n)) if (Array.isArray(v)) v.forEach(validate); else if (typeof v === 'object') validate(v);
    };
    this.nodes.forEach(validate);
  }
  private get(name: string): Value {
    if (name === 'true') return true; if (name === 'false') return false; if (name === 'nullptr') return null;
    if (/^TB[12][AB]$/.test(name)) return 1;
    for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return this.scopes[i].get(name)!;
    throw new Error(`Biến chưa khai báo: ${name}`);
  }
  private set(name: string, value: Value) {
    for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) { this.scopes[i].set(name, value); return; }
    throw new Error(`Biến chưa khai báo: ${name}`);
  }
  private *expr(n: Node): Generator<Yield, Value, unknown> {
    switch (n.k) {
      case 'literal': return n.value;
      case 'name': return this.get(n.name);
      case 'array': { const a: Value[] = []; for (const x of n.values) a.push(yield* this.expr(x)); return a; }
      case 'index': { const array = yield* this.expr(n.value); const index = Number(yield* this.expr(n.index)); if (!Array.isArray(array) || !(index in array)) throw new Error('Chỉ số mảng không hợp lệ'); return array[index]; }
      case 'cast': { const v = yield* this.expr(n.value); return /\b(int|long|short)\b/.test(n.type) ? Math.trunc(Number(v)) : Number(v); }
      case 'ternary': return yield* this.expr((yield* this.expr(n.condition)) ? n.yes : n.no);
      case 'unary': { const v = yield* this.expr(n.value); if (n.op === '!') return !v; if (n.op === '-') return -Number(v); if (n.op === '+') return Number(v); const result = Number(v) + (n.op === '++' ? 1 : -1); this.set(n.value.name, result); return result; }
      case 'post': { const v = yield* this.expr(n.value); this.set(n.value.name, Number(v) + (n.op === '++' ? 1 : -1)); return v; }
      case 'binary': {
        const a = yield* this.expr(n.left);
        if (n.op === '&&' && !a) return false; if (n.op === '||' && a) return true;
        const b = yield* this.expr(n.right); const x = Number(a), y = Number(b);
        switch (n.op) {
          case '=': this.set(n.left.name, b); return b;
          case '+=': this.set(n.left.name, x + y); return x + y;
          case '-=': this.set(n.left.name, x - y); return x - y;
          case '+': return x + y; case '-': return x - y; case '*': return x * y; case '/': return x / y; case '%': return x % y;
          case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y;
          case '==': return a === b; case '!=': return a !== b; case '&&': return Boolean(b); case '||': return Boolean(b);
        } break;
      }
      case 'call': { const args: Value[] = []; for (const arg of n.args) args.push(yield* this.expr(arg)); return yield* this.call(n.name, args); }
    }
    throw new Error(`Biểu thức chưa hỗ trợ: ${n.k}`);
  }
  private motors(left: number, right: number) {
    // Measured calibration: runLR(2000, 2000) travels 350 mm in 5 s.
    this.left = Math.max(-500, Math.min(500, left)); this.right = Math.max(-500, Math.min(500, right));
    this.host.motors(this.left, this.right);
  }
  private *call(name: string, args: Value[]): Generator<Yield, Value, unknown> {
    const nums = args.map(Number), [a = 0, b = 0, c = 0] = nums;
    const fn = this.functions.get(name);
    if (fn) {
      if (this.scopes.length > 64) throw new Error('Hàm gọi lồng nhau quá sâu');
      this.scopes.push(new Map(fn.params.map((p: string, i: number) => [p, args[i] ?? 0])));
      try { yield* this.statement(fn.body); } catch (e) { if (e instanceof Flow && e.kind === 'return') return e.value; throw e; }
      finally { this.scopes.pop(); } return null;
    }
    switch (name) {
      case 'Leanbot.begin': case 'LbMission.begin': case 'Serial.begin': case 'LbRGB.show': return null;
      case 'LbMission.end': this.motors(0, 0); yield { end: true }; return null;
      case 'LbMotion.runLR': this.motors(a * 70 / 2000, b * 70 / 2000); return null;
      case 'LbMotion.runLRrpm': this.motors(a * 2 * Math.PI * 16.25 / 60, b * 2 * Math.PI * 16.25 / 60); return null;
      case 'LbMotion.stopAndWait': this.motors(0, 0); return null;
      case 'LbMotion.setZeroOrigin': this.distance = 0; this.rotation = 0; return null;
      case 'LbMotion.getDistanceMm': return this.distance;
      case 'LbMotion.getRotationDeg': return this.rotation;
      case 'millis': return Math.floor(this.time);
      case 'LbDelay': case 'delay': if (!Number.isFinite(a) || a < 0) throw new Error('Thời gian chờ không hợp lệ'); yield { ms: a }; return null;
      case 'LbMotion.waitDistanceMm': {
        const speed = Math.abs((this.left + this.right) / 2); if (!speed && a) throw new Error('Không thể chờ quãng đường khi robot đứng yên');
        yield { ms: speed ? Math.abs(a) / speed * 1000 : 0 }; return null;
      }
      case 'LbMotion.waitRotationDeg': {
        const speed = Math.abs((this.left - this.right) / LEANBOT_GEOMETRY.wheelBase * 180 / Math.PI); if (!speed && a) throw new Error('Không thể chờ góc quay khi hai bánh chạy cùng tốc độ');
        yield { ms: speed ? Math.abs(a) / speed * 1000 : 0 }; return null;
      }
      case 'isfinite': return Number.isFinite(a);
      case 'fabsf': case 'fabs': case 'abs': return Math.abs(a);
      case 'lroundf': case 'round': return Math.sign(a) * Math.floor(Math.abs(a) + 0.5);
      case 'min': return Math.min(...nums); case 'max': return Math.max(...nums);
      case 'constrain': return Math.max(b, Math.min(c, a));
      case 'strcmp': return String(args[0]) === String(args[1]) ? 0 : String(args[0]) < String(args[1]) ? -1 : 1;
      case 'Serial.print': case 'Serial.println': this.host.log?.(String(args[0] ?? '')); return null;
      case 'Leanbot.pingMm': return this.host.sensors?.().distance ?? 300;
      case 'Leanbot.pingCm': return (this.host.sensors?.().distance ?? 300) / 10;
      case 'LbGripper.open': this.host.gripper?.(0, 0); return null;
      case 'LbGripper.close': this.host.gripper?.(90, 90); return null;
      case 'LbGripper.moveTo': case 'LbGripper.moveToLR': this.host.gripper?.(a, name.endsWith('LR') ? b : a); if (c > 0) yield { ms: c }; return null;
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
      case 'function': return;
      case 'enum': n.names.forEach((name: string, i: number) => this.scopes[0].set(name, i)); return;
      case 'declare': { let v = yield* this.expr(n.value); if (/\b(int|long|short)\b/.test(n.type) && !Array.isArray(v)) v = Math.trunc(Number(v)); this.scopes.at(-1)!.set(n.name, v); return; }
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
    if (this.functions.has('loop')) while (true) { yield* this.call('loop', []); yield { ms: 1 }; }
  }
  start() { this.scopes = [new Map()]; this.iterator = this.program(); this.running = true; this.time = this.distance = this.rotation = this.pending = 0; this.motors(0, 0); }
  stop() { this.running = false; this.motors(0, 0); }
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
          this.distance += (this.left + this.right) / 2 * dt / 1000;
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
