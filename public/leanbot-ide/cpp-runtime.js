var LeanbotCpp = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/simulator/cppRuntime.ts
  var cppRuntime_exports = {};
  __export(cppRuntime_exports, {
    CppRuntime: () => CppRuntime,
    LEANBOT_APPEARANCE: () => LEANBOT_APPEARANCE,
    drawLeanbot: () => drawLeanbot
  });

  // src/simulator/robotAppearance.ts
  var LEANBOT_APPEARANCE = {
    length: 128,
    width: 86,
    collisionRadius: 75,
    wheelBase: 75
  };
  function drawLeanbot(ctx, leftGrip = 0, rightGrip = 0) {
    ctx.save();
    ctx.lineJoin = "round";
    for (const side of [-1, 1]) {
      const y = side * 37.5;
      ctx.fillStyle = "#111916";
      ctx.fillRect(-10, y - 5.5, 20, 11);
      ctx.strokeStyle = "#344238";
      ctx.lineWidth = 1.4;
      for (let x = -8; x <= 8; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 1, y + 5);
        ctx.stroke();
      }
      ctx.fillStyle = "#d3d5c4";
      ctx.fillRect(-7, side < 0 ? -32 : 23, 14, 9);
      ctx.fillStyle = "#e2b52d";
      ctx.fillRect(-4, side < 0 ? -27 : 23, 8, 4);
    }
    ctx.fillStyle = "#d71924";
    ctx.strokeStyle = "#961520";
    ctx.lineWidth = 0.8;
    ctx.fillRect(-66, -23, 92, 46);
    ctx.strokeRect(-66, -23, 92, 46);
    ctx.fillStyle = "#f52f35";
    ctx.fillRect(-64, -21, 87, 1);
    ctx.fillStyle = "#ead7a0";
    for (let x = -62; x < -3; x += 3) for (const y of [-20, 20]) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = "#164d77";
    ctx.fillRect(-65, -12, 12, 24);
    ctx.fillStyle = "#e2b126";
    ctx.fillRect(-54, -14, 44, 28);
    ctx.fillStyle = "#143d68";
    ctx.fillRect(-53, -13, 42, 26);
    ctx.fillStyle = "#0c172a";
    ctx.fillRect(-38, -7, 14, 14);
    ctx.strokeStyle = "#b7c7c4";
    ctx.lineWidth = 0.6;
    for (let x = -49; x <= -15; x += 3) {
      ctx.beginPath();
      ctx.moveTo(x, -12);
      ctx.lineTo(x, -9);
      ctx.moveTo(x, 9);
      ctx.lineTo(x, 12);
      ctx.stroke();
    }
    ctx.fillStyle = "#b6c0ba";
    ctx.fillRect(-19, -5, 7, 10);
    ctx.fillStyle = "#f5e8d1";
    ctx.fillRect(-47, -3, 5, 6);
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#f4f0d7";
      ctx.fillRect(1, side < 0 ? -20 : 12, 9, 8);
      ctx.strokeStyle = "#f8da38";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-45, side * 22, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(14, side * 22, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#1152aa";
      ctx.fillRect(27, side * 25 - 5, 16, 10);
      ctx.fillStyle = "#2f80ce";
      ctx.fillRect(29, side * 25 - 4, 8, 8);
      for (const [colour, offset] of [["#f5b92c", 0], ["#f07122", 2], ["#243d98", 4]]) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(5, side * (17 + offset));
        ctx.lineTo(17, side * (28 + offset));
        ctx.lineTo(31, side * 25);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#fff2e0";
    ctx.font = "bold 4px sans-serif";
    ctx.fillText("LEANBOT", -44, 19);
    ctx.fillStyle = "#a1bdb3";
    ctx.fillRect(14, -22, 17, 44);
    for (const y of [-13, 13]) {
      ctx.fillStyle = "#dce6dd";
      ctx.fillRect(17, y - 7, 13, 14);
      ctx.fillStyle = "#718b87";
      ctx.beginPath();
      ctx.arc(28, y, 6.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#273e3f";
      ctx.beginPath();
      ctx.arc(29, y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d8e3dc";
      ctx.fillRect(17, y - 6, 2, 12);
    }
    ctx.fillStyle = "#b90f20";
    ctx.fillRect(30, -21, 2, 42);
    for (const [side, degrees] of [[-1, leftGrip], [1, rightGrip]]) {
      const close = Math.max(0, Math.min(90, degrees)) / 90;
      ctx.save();
      ctx.translate(39, side * 25);
      ctx.scale(1, side);
      ctx.rotate(0.2 - close * 0.85);
      ctx.fillStyle = "#dfc293";
      ctx.strokeStyle = "#ad946e";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(17, -4);
      ctx.lineTo(22, 1);
      ctx.lineTo(20, 5);
      ctx.lineTo(10, 1);
      ctx.lineTo(14, 11);
      ctx.lineTo(10, 13);
      ctx.lineTo(1, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#d9e0dd";
      ctx.beginPath();
      ctx.arc(1, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // src/transpiler/cppParser/tokenizer.ts
  var twoChar = /* @__PURE__ */ new Set(["<=", ">=", "==", "!=", "&&", "||", "+=", "-=", "++", "--", "::", "->"]);
  function tokenizeCpp(source) {
    const tokens = [];
    let index = 0;
    let line = 1;
    const push = (kind, start, end, startLine) => tokens.push({ kind, value: source.slice(start, end), start, end, line: startLine, lineEnd: line });
    while (index < source.length) {
      const char = source[index];
      if (/\s/.test(char)) {
        if (char === "\n") line += 1;
        index += 1;
        continue;
      }
      const start = index;
      const startLine = line;
      if (char === "#" && (index === 0 || source[index - 1] === "\n")) {
        while (index < source.length && source[index] !== "\n") index += 1;
        push("preprocessor", start, index, startLine);
        continue;
      }
      if (char === "/" && source[index + 1] === "/") {
        index += 2;
        while (index < source.length && source[index] !== "\n") index += 1;
        push("comment", start, index, startLine);
        continue;
      }
      if (char === "/" && source[index + 1] === "*") {
        index += 2;
        while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
          if (source[index] === "\n") line += 1;
          index += 1;
        }
        if (index < source.length) index += 2;
        push("comment", start, index, startLine);
        continue;
      }
      if (char === '"' || char === "'") {
        const quote = char;
        index += 1;
        while (index < source.length) {
          if (source[index] === "\\") {
            index += 2;
            continue;
          }
          if (source[index] === quote) {
            index += 1;
            break;
          }
          if (source[index] === "\n") line += 1;
          index += 1;
        }
        push("string", start, index, startLine);
        continue;
      }
      if (/[A-Za-z_]/.test(char)) {
        index += 1;
        while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) index += 1;
        push("identifier", start, index, startLine);
        continue;
      }
      if (/[0-9]/.test(char)) {
        index += 1;
        while (index < source.length && /[0-9A-Fa-fxX.]/.test(source[index])) index += 1;
        push("number", start, index, startLine);
        continue;
      }
      const pair = source.slice(index, index + 2);
      index += twoChar.has(pair) ? 2 : 1;
      push("symbol", start, index, startLine);
    }
    return tokens;
  }

  // src/simulator/cppRuntime.ts
  var TYPES = /* @__PURE__ */ new Set(["void", "int", "float", "double", "long", "short", "unsigned", "signed", "char", "bool", "String", "const", "static", "auto"]);
  var precedence = { "=": 1, "+=": 1, "-=": 1, "?": 2, "||": 3, "&&": 4, "==": 5, "!=": 5, "<": 6, ">": 6, "<=": 6, ">=": 6, "+": 7, "-": 7, "*": 8, "/": 8, "%": 8 };
  var Parser = class {
    tokens;
    i = 0;
    types = new Set(TYPES);
    constructor(source) {
      this.tokens = tokenizeCpp(source).filter((t) => !["comment", "preprocessor"].includes(t.kind));
      this.tokens = this.tokens.filter((t, i, all) => !(t.kind === "identifier" && /^(f|u|l|ul|ull)$/i.test(t.value) && all[i - 1]?.kind === "number" && all[i - 1].end === t.start));
      for (const t of this.tokens) if (t.kind === "number" && !/^0x/i.test(t.value)) t.value = t.value.replace(/[fF]$/, "");
    }
    peek(v) {
      return v === void 0 ? this.tokens[this.i]?.value : this.tokens[this.i]?.value === v;
    }
    take(v) {
      const t = this.tokens[this.i++];
      if (!t || v !== void 0 && t.value !== v) throw new Error(`D\xF2ng ${t?.line ?? "cu\u1ED1i"}: c\u1EA7n ${v ?? "bi\u1EC3u th\u1EE9c"}, g\u1EB7p ${t?.value ?? "h\u1EBFt code"}`);
      return t.value;
    }
    eat(v) {
      if (this.peek(v)) {
        this.i++;
        return true;
      }
      return false;
    }
    expr(min = 0) {
      let n;
      const t = this.tokens[this.i];
      if (!t) throw new Error("Thi\u1EBFu bi\u1EC3u th\u1EE9c");
      if (this.peek("(") && this.types.has(this.tokens[this.i + 1]?.value)) {
        this.take("(");
        let type = "";
        while (!this.peek(")")) type += this.take() + " ";
        this.take(")");
        n = { k: "cast", type, value: this.expr(9) };
      } else if (this.eat("(")) {
        n = this.expr();
        this.take(")");
      } else if (["!", "-", "+", "++", "--"].includes(this.peek())) n = { k: "unary", op: this.take(), value: this.expr(9) };
      else if (t.kind === "number") {
        this.i++;
        n = { k: "literal", value: Number(t.value) };
      } else if (t.kind === "string") {
        this.i++;
        n = { k: "literal", value: t.value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"') };
      } else if (t.kind === "identifier") {
        let name = this.take();
        while (this.eat(".") || this.eat("::")) name += "." + this.take();
        n = { k: "name", name };
      } else throw new Error(`D\xF2ng ${t.line}: bi\u1EC3u th\u1EE9c ch\u01B0a h\u1ED7 tr\u1EE3 ${t.value}`);
      while (true) {
        if (this.eat("(")) {
          const args = [];
          if (!this.peek(")")) do {
            args.push(this.expr());
          } while (this.eat(","));
          this.take(")");
          n = { k: "call", name: n.name, args };
          continue;
        }
        if (this.eat("[")) {
          const index = this.expr();
          this.take("]");
          n = { k: "index", value: n, index };
          continue;
        }
        if (["++", "--"].includes(this.peek())) {
          n = { k: "post", op: this.take(), value: n };
          continue;
        }
        const op = this.peek(), level = precedence[op];
        if (level === void 0 || level < min) break;
        this.take();
        if (op === "?") {
          const yes = this.expr();
          this.take(":");
          n = { k: "ternary", condition: n, yes, no: this.expr(2) };
        } else n = { k: "binary", op, left: n, right: this.expr(level + (["=", "+=", "-="].includes(op) ? 0 : 1)) };
      }
      return n;
    }
    declaration() {
      let type = "";
      while (this.types.has(this.peek())) type += this.take() + " ";
      while (this.eat("*") || this.eat("&")) {
      }
      const name = this.take();
      if (this.eat("(")) {
        const params = [];
        if (!this.peek(")")) do {
          while (this.types.has(this.peek()) || ["*", "&"].includes(this.peek())) this.take();
          params.push(this.take());
        } while (this.eat(","));
        this.take(")");
        return { k: "function", name, params, body: this.statement() };
      }
      let array = false;
      if (this.eat("[")) {
        array = true;
        if (!this.peek("]")) this.expr();
        this.take("]");
      }
      let value = { k: "literal", value: 0 };
      if (this.eat("=")) {
        if (array && this.eat("{")) {
          const values = [];
          if (!this.peek("}")) do {
            values.push(this.expr());
          } while (this.eat(","));
          this.take("}");
          value = { k: "array", values };
        } else value = this.expr();
      }
      this.take(";");
      return { k: "declare", name, type, value };
    }
    statement() {
      if (this.eat(";")) return { k: "block", body: [] };
      if (this.eat("{")) {
        const body = [];
        while (!this.peek("}")) body.push(this.statement());
        this.take("}");
        return { k: "block", body };
      }
      if (this.eat("enum")) {
        const type = this.take();
        this.types.add(type);
        this.take("{");
        const names = [];
        do {
          names.push(this.take());
        } while (this.eat(","));
        this.take("}");
        this.take(";");
        return { k: "enum", names };
      }
      if (this.eat("if")) {
        this.take("(");
        const condition = this.expr();
        this.take(")");
        const yes = this.statement();
        return { k: "if", condition, yes, no: this.eat("else") ? this.statement() : null };
      }
      if (this.eat("while")) {
        this.take("(");
        const condition = this.expr();
        this.take(")");
        return { k: "while", condition, body: this.statement() };
      }
      if (this.eat("for")) {
        this.take("(");
        const init = this.statement();
        const condition = this.expr();
        this.take(";");
        const next = this.expr();
        this.take(")");
        return { k: "for", init, condition, next, body: this.statement() };
      }
      if (this.eat("switch")) {
        this.take("(");
        const value2 = this.expr();
        this.take(")");
        this.take("{");
        const cases = [];
        while (!this.peek("}")) {
          const isDefault = this.eat("default");
          if (!isDefault) this.take("case");
          const label = isDefault ? null : this.expr();
          this.take(":");
          const body = [];
          while (!["case", "default", "}"].includes(this.peek())) body.push(this.statement());
          cases.push({ k: "case", label, body });
        }
        this.take("}");
        return { k: "switch", value: value2, cases };
      }
      for (const k of ["break", "continue", "return"]) if (this.eat(k)) {
        const value2 = k === "return" && !this.peek(";") ? this.expr() : null;
        this.take(";");
        return { k, value: value2 };
      }
      if (this.types.has(this.peek())) return this.declaration();
      const value = this.expr();
      this.take(";");
      return { k: "expression", value };
    }
    parse() {
      const nodes = [];
      while (this.i < this.tokens.length) nodes.push(this.statement());
      return nodes;
    }
  };
  var Flow = class {
    constructor(kind, value = null) {
      this.kind = kind;
      this.value = value;
    }
  };
  var CppRuntime = class {
    constructor(source, host) {
      this.host = host;
      this.nodes = new Parser(source).parse();
      for (const n of this.nodes) if (n.k === "function") this.functions.set(n.name, n);
      const builtins = /* @__PURE__ */ new Set(["Leanbot.begin", "LbMission.begin", "LbMission.end", "LbMotion.runLR", "LbMotion.runLRrpm", "LbMotion.stopAndWait", "LbMotion.setZeroOrigin", "LbMotion.getDistanceMm", "LbMotion.getRotationDeg", "LbMotion.waitDistanceMm", "LbMotion.waitRotationDeg", "LbDelay", "delay", "millis", "isfinite", "fabsf", "fabs", "abs", "lroundf", "round", "min", "max", "constrain", "strcmp", "Serial.begin", "Serial.println", "Serial.print", "LbGripper.open", "LbGripper.close", "LbGripper.moveToLR", "LbGripper.moveTo", "Leanbot.pingCm", "Leanbot.pingMm", "Leanbot.tone", "LbRGB.show"]);
      const validate = (n) => {
        if (!n || typeof n !== "object") return;
        if (n.k === "call" && !this.functions.has(n.name) && !builtins.has(n.name)) throw new Error(`H\xE0m ch\u01B0a h\u1ED7 tr\u1EE3 trong gi\u1EA3 l\u1EADp: ${n.name}`);
        for (const v of Object.values(n)) if (Array.isArray(v)) v.forEach(validate);
        else if (typeof v === "object") validate(v);
      };
      this.nodes.forEach(validate);
    }
    nodes;
    functions = /* @__PURE__ */ new Map();
    scopes = [/* @__PURE__ */ new Map()];
    iterator;
    pending = 0;
    running = false;
    time = 0;
    distance = 0;
    rotation = 0;
    left = 0;
    right = 0;
    get(name) {
      if (name === "true") return true;
      if (name === "false") return false;
      if (name === "nullptr") return null;
      if (/^TB[12][AB]$/.test(name)) return 1;
      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return this.scopes[i].get(name);
      throw new Error(`Bi\u1EBFn ch\u01B0a khai b\xE1o: ${name}`);
    }
    set(name, value) {
      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) {
        this.scopes[i].set(name, value);
        return;
      }
      throw new Error(`Bi\u1EBFn ch\u01B0a khai b\xE1o: ${name}`);
    }
    *expr(n) {
      switch (n.k) {
        case "literal":
          return n.value;
        case "name":
          return this.get(n.name);
        case "array": {
          const a = [];
          for (const x of n.values) a.push(yield* this.expr(x));
          return a;
        }
        case "index": {
          const array = yield* this.expr(n.value);
          const index = Number(yield* this.expr(n.index));
          if (!Array.isArray(array) || !(index in array)) throw new Error("Ch\u1EC9 s\u1ED1 m\u1EA3ng kh\xF4ng h\u1EE3p l\u1EC7");
          return array[index];
        }
        case "cast": {
          const v = yield* this.expr(n.value);
          return /\b(int|long|short)\b/.test(n.type) ? Math.trunc(Number(v)) : Number(v);
        }
        case "ternary":
          return yield* this.expr((yield* this.expr(n.condition)) ? n.yes : n.no);
        case "unary": {
          const v = yield* this.expr(n.value);
          if (n.op === "!") return !v;
          if (n.op === "-") return -Number(v);
          if (n.op === "+") return Number(v);
          const result = Number(v) + (n.op === "++" ? 1 : -1);
          this.set(n.value.name, result);
          return result;
        }
        case "post": {
          const v = yield* this.expr(n.value);
          this.set(n.value.name, Number(v) + (n.op === "++" ? 1 : -1));
          return v;
        }
        case "binary": {
          const a = yield* this.expr(n.left);
          if (n.op === "&&" && !a) return false;
          if (n.op === "||" && a) return true;
          const b = yield* this.expr(n.right);
          const x = Number(a), y = Number(b);
          switch (n.op) {
            case "=":
              this.set(n.left.name, b);
              return b;
            case "+=":
              this.set(n.left.name, x + y);
              return x + y;
            case "-=":
              this.set(n.left.name, x - y);
              return x - y;
            case "+":
              return x + y;
            case "-":
              return x - y;
            case "*":
              return x * y;
            case "/":
              return x / y;
            case "%":
              return x % y;
            case "<":
              return x < y;
            case ">":
              return x > y;
            case "<=":
              return x <= y;
            case ">=":
              return x >= y;
            case "==":
              return a === b;
            case "!=":
              return a !== b;
            case "&&":
              return Boolean(b);
            case "||":
              return Boolean(b);
          }
          break;
        }
        case "call": {
          const args = [];
          for (const arg of n.args) args.push(yield* this.expr(arg));
          return yield* this.call(n.name, args);
        }
      }
      throw new Error(`Bi\u1EC3u th\u1EE9c ch\u01B0a h\u1ED7 tr\u1EE3: ${n.k}`);
    }
    motors(left, right) {
      this.left = Math.max(-500, Math.min(500, left));
      this.right = Math.max(-500, Math.min(500, right));
      this.host.motors(this.left, this.right);
    }
    *call(name, args) {
      const nums = args.map(Number), [a = 0, b = 0, c = 0] = nums;
      const fn = this.functions.get(name);
      if (fn) {
        if (this.scopes.length > 64) throw new Error("H\xE0m g\u1ECDi l\u1ED3ng nhau qu\xE1 s\xE2u");
        this.scopes.push(new Map(fn.params.map((p, i) => [p, args[i] ?? 0])));
        try {
          yield* this.statement(fn.body);
        } catch (e) {
          if (e instanceof Flow && e.kind === "return") return e.value;
          throw e;
        } finally {
          this.scopes.pop();
        }
        return null;
      }
      switch (name) {
        case "Leanbot.begin":
        case "LbMission.begin":
        case "Serial.begin":
        case "LbRGB.show":
          return null;
        case "LbMission.end":
          this.motors(0, 0);
          yield { end: true };
          return null;
        case "LbMotion.runLR":
          this.motors(a * 70 / 2e3, b * 70 / 2e3);
          return null;
        case "LbMotion.runLRrpm":
          this.motors(a * 2 * Math.PI * 16.25 / 60, b * 2 * Math.PI * 16.25 / 60);
          return null;
        case "LbMotion.stopAndWait":
          this.motors(0, 0);
          return null;
        case "LbMotion.setZeroOrigin":
          this.distance = 0;
          this.rotation = 0;
          return null;
        case "LbMotion.getDistanceMm":
          return this.distance;
        case "LbMotion.getRotationDeg":
          return this.rotation;
        case "millis":
          return Math.floor(this.time);
        case "LbDelay":
        case "delay":
          if (!Number.isFinite(a) || a < 0) throw new Error("Th\u1EDDi gian ch\u1EDD kh\xF4ng h\u1EE3p l\u1EC7");
          yield { ms: a };
          return null;
        case "LbMotion.waitDistanceMm": {
          const speed = Math.abs((this.left + this.right) / 2);
          if (!speed && a) throw new Error("Kh\xF4ng th\u1EC3 ch\u1EDD qu\xE3ng \u0111\u01B0\u1EDDng khi robot \u0111\u1EE9ng y\xEAn");
          yield { ms: speed ? Math.abs(a) / speed * 1e3 : 0 };
          return null;
        }
        case "LbMotion.waitRotationDeg": {
          const speed = Math.abs((this.left - this.right) / 75 * 180 / Math.PI);
          if (!speed && a) throw new Error("Kh\xF4ng th\u1EC3 ch\u1EDD g\xF3c quay khi hai b\xE1nh ch\u1EA1y c\xF9ng t\u1ED1c \u0111\u1ED9");
          yield { ms: speed ? Math.abs(a) / speed * 1e3 : 0 };
          return null;
        }
        case "isfinite":
          return Number.isFinite(a);
        case "fabsf":
        case "fabs":
        case "abs":
          return Math.abs(a);
        case "lroundf":
        case "round":
          return Math.sign(a) * Math.floor(Math.abs(a) + 0.5);
        case "min":
          return Math.min(...nums);
        case "max":
          return Math.max(...nums);
        case "constrain":
          return Math.max(b, Math.min(c, a));
        case "strcmp":
          return String(args[0]) === String(args[1]) ? 0 : String(args[0]) < String(args[1]) ? -1 : 1;
        case "Serial.print":
        case "Serial.println":
          this.host.log?.(String(args[0] ?? ""));
          return null;
        case "Leanbot.pingMm":
          return this.host.sensors?.().distance ?? 300;
        case "Leanbot.pingCm":
          return (this.host.sensors?.().distance ?? 300) / 10;
        case "LbGripper.open":
          this.host.gripper?.(0, 0);
          return null;
        case "LbGripper.close":
          this.host.gripper?.(90, 90);
          return null;
        case "LbGripper.moveTo":
        case "LbGripper.moveToLR":
          this.host.gripper?.(a, name.endsWith("LR") ? b : a);
          if (c > 0) yield { ms: c };
          return null;
        case "Leanbot.tone":
          yield { ms: b };
          return null;
      }
      throw new Error(`H\xE0m ch\u01B0a h\u1ED7 tr\u1EE3: ${name}`);
    }
    *statement(n) {
      yield {};
      switch (n.k) {
        case "block":
          this.scopes.push(/* @__PURE__ */ new Map());
          try {
            for (const s of n.body) yield* this.statement(s);
          } finally {
            this.scopes.pop();
          }
          return;
        case "function":
          return;
        case "enum":
          n.names.forEach((name, i) => this.scopes[0].set(name, i));
          return;
        case "declare": {
          let v = yield* this.expr(n.value);
          if (/\b(int|long|short)\b/.test(n.type) && !Array.isArray(v)) v = Math.trunc(Number(v));
          this.scopes.at(-1).set(n.name, v);
          return;
        }
        case "expression":
          yield* this.expr(n.value);
          return;
        case "if": {
          const branch = (yield* this.expr(n.condition)) ? n.yes : n.no;
          if (branch) yield* this.statement(branch);
          return;
        }
        case "for":
        case "while": {
          if (n.init) yield* this.statement(n.init);
          while (yield* this.expr(n.condition)) {
            try {
              yield* this.statement(n.body);
            } catch (e) {
              if (!(e instanceof Flow)) throw e;
              if (e.kind === "break") break;
              if (e.kind !== "continue") throw e;
            }
            if (n.next) yield* this.expr(n.next);
          }
          return;
        }
        case "switch": {
          const v = yield* this.expr(n.value);
          let active = false;
          try {
            for (const item of n.cases) {
              if (item.label === null || (yield* this.expr(item.label)) === v) active = true;
              if (active) for (const s of item.body) yield* this.statement(s);
            }
          } catch (e) {
            if (!(e instanceof Flow) || e.kind !== "break") throw e;
          }
          return;
        }
        case "return":
          throw new Flow("return", n.value ? yield* this.expr(n.value) : null);
        case "break":
        case "continue":
          throw new Flow(n.k);
      }
      throw new Error(`C\xE2u l\u1EC7nh ch\u01B0a h\u1ED7 tr\u1EE3: ${n.k}`);
    }
    *program() {
      for (const n of this.nodes) if (n.k !== "function") yield* this.statement(n);
      if (this.functions.has("setup")) yield* this.call("setup", []);
      if (this.functions.has("loop")) while (true) {
        yield* this.call("loop", []);
        yield { ms: 1 };
      }
    }
    start() {
      this.scopes = [/* @__PURE__ */ new Map()];
      this.iterator = this.program();
      this.running = true;
      this.time = this.distance = this.rotation = this.pending = 0;
      this.motors(0, 0);
    }
    stop() {
      this.running = false;
      this.motors(0, 0);
    }
    tick(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) return;
      if (milliseconds === 0) {
        this.tickSlice(0);
        return;
      }
      let remaining = milliseconds;
      while (remaining > 0 && this.running) {
        const slice = Math.min(100, remaining);
        this.tickSlice(slice);
        remaining -= slice;
      }
    }
    tickSlice(milliseconds) {
      if (!this.running || !this.iterator) return;
      let remaining = Math.max(0, Math.min(100, milliseconds));
      let budget = 2e4;
      try {
        while (this.running && budget-- > 0) {
          if (this.pending > 0) {
            if (remaining <= 0) break;
            const dt = Math.min(this.pending, remaining, 5);
            this.host.advance(dt / 1e3);
            this.time += dt;
            this.distance += (this.left + this.right) / 2 * dt / 1e3;
            this.rotation += (this.left - this.right) / 75 * 180 / Math.PI * dt / 1e3;
            this.pending -= dt;
            remaining -= dt;
          } else {
            const next = this.iterator.next();
            if (next.done || next.value.end) {
              this.stop();
              break;
            }
            this.pending = next.value.ms ?? 0;
          }
        }
        if (budget <= 0) throw new Error("V\xF2ng l\u1EB7p kh\xF4ng c\xF3 l\u1EC7nh ch\u1EDD; th\xEAm LbDelay(1) \u0111\u1EC3 gi\u1EA3 l\u1EADp ti\u1EBFp t\u1EE5c.");
      } catch (error) {
        this.stop();
        throw error;
      }
    }
  };
  return __toCommonJS(cppRuntime_exports);
})();
