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
    MissionWorld: () => MissionWorld,
    drawLeanbot: () => drawLeanbot,
    drawMissionBlocks: () => drawMissionBlocks,
    mountMissionEditor: () => mountMissionEditor
  });

  // src/simulator/robotGeometry.ts
  var LEANBOT_GEOMETRY = {
    length: 180,
    width: 100,
    collisionRadius: 100,
    wheelBase: 84,
    graspOffset: 75,
    body: { x: -27, y: 0, length: 130, width: 64 },
    wheel: { length: 28, width: 16 }
  };

  // src/simulator/missionWorld.ts
  var BLOCK_COLORS = { green: "#83a73e", blue: "#278fa9", purple: "#795272", red: "#bd3d2f", yellow: "#d8b721" };
  var BLOCK_SIZE = { length: 15, width: 25, height: 75 };
  var NEUTRALIZER_COLORS = ["green", "blue", "purple"];
  var RAD = Math.PI / 180;
  var GRAVITY = 9810;
  var copy = (blocks) => blocks.map((b) => ({ ...b }));
  var clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state += 1831565813;
      let x = state;
      x = Math.imul(x ^ x >>> 15, x | 1);
      x ^= x + Math.imul(x ^ x >>> 7, x | 61);
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }
  function blockFootprint(block) {
    return { length: BLOCK_SIZE.length * Math.cos(block.tilt) + BLOCK_SIZE.height * Math.sin(block.tilt), width: BLOCK_SIZE.width };
  }
  function contact(a, b) {
    const aa = a.rotation * RAD, ba = b.rotation * RAD;
    const axes = [[Math.cos(aa), Math.sin(aa)], [-Math.sin(aa), Math.cos(aa)], [Math.cos(ba), Math.sin(ba)], [-Math.sin(ba), Math.cos(ba)]];
    let depth = Infinity, nx = 0, ny = 0;
    for (const [x, y] of axes) {
      const radius = (box, angle) => Math.abs(x * Math.cos(angle) + y * Math.sin(angle)) * box.length / 2 + Math.abs(-x * Math.sin(angle) + y * Math.cos(angle)) * box.width / 2;
      const distance = (b.x - a.x) * x + (b.y - a.y) * y;
      const overlap = radius(a, aa) + radius(b, ba) - Math.abs(distance);
      if (overlap <= 0) return null;
      if (overlap < depth) {
        depth = overlap;
        nx = x * (distance >= 0 ? 1 : -1);
        ny = y * (distance >= 0 ? 1 : -1);
      }
    }
    return { depth, nx, ny };
  }
  var MissionWorld = class {
    constructor(board) {
      this.board = board;
    }
    blocks = [];
    friction = 0.35;
    restitution = 0.1;
    initial = [];
    listeners = /* @__PURE__ */ new Set();
    serial = 0;
    heldOffset = 0;
    gripper = { left: 0, right: 0 };
    velocity = { x: 0, y: 0, omega: 0 };
    lastPose;
    subscribe(fn) {
      this.listeners.add(fn);
      return () => {
        this.listeners.delete(fn);
      };
    }
    changed() {
      this.listeners.forEach((fn) => fn());
    }
    get heldBlock() {
      return this.blocks.find((b) => b.held);
    }
    get hasMotion() {
      return this.blocks.some((b) => !b.held && (Math.hypot(b.vx, b.vy) > 0.01 || Math.abs(b.spin) > 0.01 || b.state === "falling"));
    }
    slots(kind) {
      return kind === "pollution" ? (this.board.cityZones ?? []).flatMap((z) => z.sites) : this.board.storageSites ?? [];
    }
    make(kind, color, slot) {
      if (!Object.hasOwn(BLOCK_COLORS, color) || kind === "neutralizer" && !NEUTRALIZER_COLORS.includes(color)) throw new Error("Invalid color for this block type.");
      return { id: `block-${++this.serial}`, kind, color, x: slot.x, y: slot.y, rotation: slot.rotation, slotId: slot.id, vx: 0, vy: 0, spin: 0, tilt: 0, tipSpeed: 0, state: "standing", held: false, mass: 0.025 };
    }
    available(kind, except) {
      return this.slots(kind).filter((s) => ![...this.blocks, ...this.initial].some((b) => b.id !== except && b.slotId === s.id));
    }
    place(kind, color, x, y, id) {
      const slots = this.available(kind, id).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
      const slot = slots[0];
      if (!slot || Math.hypot(slot.x - x, slot.y - y) > 65) throw new Error(kind === "neutralizer" ? "Drop on an empty Storage slot S1\u2013S6." : "Drop on an empty numbered city site.");
      const old = id ? this.blocks.find((b) => b.id === id) : void 0;
      if (id && !old) throw new Error("Block no longer exists.");
      const next = this.make(kind, color, slot);
      if (old) Object.assign(old, next, { id });
      else this.blocks.push(next);
      const placed = old ?? next;
      const index = this.initial.findIndex((b) => b.id === placed.id);
      if (index < 0) this.initial.push({ ...placed });
      else this.initial[index] = { ...placed };
      this.changed();
      return placed;
    }
    remove(id) {
      this.blocks = this.blocks.filter((b) => b.id !== id);
      this.initial = this.initial.filter((b) => b.id !== id);
      this.changed();
    }
    clear() {
      this.blocks = [];
      this.commitLayout();
    }
    randomize(pollution, neutralizers, seed = Date.now()) {
      if (!Number.isInteger(pollution) || !Number.isInteger(neutralizers) || pollution < 0 || pollution > this.slots("pollution").length || neutralizers < 0 || neutralizers > this.slots("neutralizer").length) throw new Error("Choose 0\u201332 pollution blocks and 0\u20136 neutralizers.");
      if (!Number.isFinite(seed)) throw new Error("Seed must be a finite number.");
      const random = seededRandom(seed);
      const shuffle = (slots) => {
        const result = [...slots];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      };
      const blocks = [];
      for (const [kind, count] of [["pollution", pollution], ["neutralizer", neutralizers]]) {
        const colors = kind === "pollution" ? Object.keys(BLOCK_COLORS) : NEUTRALIZER_COLORS;
        for (const slot of shuffle(this.slots(kind)).slice(0, count)) blocks.push(this.make(kind, colors[Math.floor(random() * colors.length)], slot));
      }
      this.blocks = blocks;
      this.commitLayout();
    }
    commitLayout() {
      this.initial = copy(this.blocks);
      this.changed();
    }
    reset() {
      this.blocks = copy(this.initial);
      this.gripper = { left: 0, right: 0 };
      this.lastPose = void 0;
      this.velocity = { x: 0, y: 0, omega: 0 };
      this.changed();
    }
    hit(x, y) {
      return [...this.blocks].reverse().find((b) => {
        const a = -b.rotation * RAD, dx = x - b.x, dy = y - b.y, shape = blockFootprint(b);
        return Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) <= Math.max(12, shape.length / 2) && Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) <= Math.max(12, shape.width / 2);
      });
    }
    syncPose(pose) {
      const block = this.heldBlock;
      if (block) {
        const point = this.graspPoint(pose);
        block.x = point.x;
        block.y = point.y;
        block.rotation = pose.heading + this.heldOffset;
      }
    }
    distance(pose, maxDistance = 300) {
      const angle = pose.heading * RAD, sx = pose.x + 40 * Math.cos(angle), sy = pose.y + 40 * Math.sin(angle);
      let nearest = maxDistance;
      for (const block of this.blocks) {
        if (block.held || BLOCK_SIZE.height * Math.cos(block.tilt) + BLOCK_SIZE.length * Math.sin(block.tilt) < 35) continue;
        const a = -block.rotation * RAD, dx = sx - block.x, dy = sy - block.y, shape = blockFootprint(block);
        const origin = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
        const direction = [Math.cos(angle + a), Math.sin(angle + a)];
        let near = 0, far = maxDistance;
        for (let i = 0; i < 2; i++) {
          const half = (i === 0 ? shape.length : shape.width) / 2;
          if (Math.abs(direction[i]) < 1e-8) {
            if (Math.abs(origin[i]) > half) {
              far = -1;
              break;
            }
          } else {
            const t1 = (-half - origin[i]) / direction[i], t2 = (half - origin[i]) / direction[i];
            near = Math.max(near, Math.min(t1, t2));
            far = Math.min(far, Math.max(t1, t2));
          }
        }
        if (far >= near) nearest = Math.min(nearest, near);
      }
      return nearest;
    }
    graspPoint(pose) {
      const a = pose.heading * RAD;
      return { x: pose.x + LEANBOT_GEOMETRY.graspOffset * Math.cos(a), y: pose.y + LEANBOT_GEOMETRY.graspOffset * Math.sin(a) };
    }
    setGripper(left, right, pose, motorLeft = 0, motorRight = 0) {
      const angle = pose.heading * RAD, speed = (motorLeft + motorRight) / 2;
      this.velocity = { x: speed * Math.cos(angle), y: speed * Math.sin(angle), omega: (motorLeft - motorRight) / LEANBOT_GEOMETRY.wheelBase };
      const wasClosed = this.gripper.left >= 55 && this.gripper.right >= 55;
      this.gripper = { left, right };
      const closed = left >= 55 && right >= 55;
      if (this.heldBlock && !closed) {
        const block = this.heldBlock, point = this.graspPoint(pose);
        block.held = false;
        block.vx = this.velocity.x - this.velocity.omega * (point.y - pose.y);
        block.vy = this.velocity.y + this.velocity.omega * (point.x - pose.x);
        if (Math.hypot(block.vx, block.vy) > 20) this.tip(block, Math.atan2(block.vy, block.vx) / RAD);
        this.changed();
      } else if (closed && !wasClosed && !this.heldBlock) {
        const point = this.graspPoint(pose), a = pose.heading * RAD;
        const candidates = this.blocks.filter((b) => {
          const dx = b.x - pose.x, dy = b.y - pose.y;
          if (b.held || b.state === "falling") return false;
          const height = BLOCK_SIZE.height * Math.cos(b.tilt) + BLOCK_SIZE.length * Math.sin(b.tilt);
          const low = height < 30;
          if (height < 12) return false;
          if (low && (Math.abs(Math.cos((b.rotation - pose.heading) * RAD)) < 0.96 || Math.hypot(b.vx, b.vy) > 5 || Math.abs(b.spin) > 5 || Math.max(Math.abs(motorLeft), Math.abs(motorRight)) > 10)) return false;
          return dx * Math.cos(a) + dy * Math.sin(a) >= LEANBOT_GEOMETRY.graspOffset - (low ? 6 : 16) && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) <= (low ? 4 : 17) && Math.hypot(b.x - point.x, b.y - point.y) <= (low ? 6 : 23);
        }).sort((a2, b) => Math.hypot(a2.x - point.x, a2.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y));
        if (candidates[0]) {
          const block = candidates[0];
          block.held = true;
          block.slotId = void 0;
          block.vx = block.vy = block.spin = 0;
          this.heldOffset = block.rotation - pose.heading;
          block.x = point.x;
          block.y = point.y;
          this.changed();
        }
      }
    }
    tip(block, rotation) {
      if (block.state !== "standing" || block.held) return;
      block.state = "falling";
      block.rotation = rotation;
      block.tipSpeed = 1.8;
      block.slotId = void 0;
      this.changed();
    }
    step(seconds, pose, left = 0, right = 0) {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      let remaining = seconds;
      while (remaining > 1e-9) {
        const dt = Math.min(5e-3, remaining);
        this.substep(dt, pose, left, right);
        remaining -= dt;
      }
      this.lastPose = { ...pose };
    }
    substep(dt, pose, left, right) {
      const angle = pose.heading * RAD, speed = (left + right) / 2, omega = (left - right) / LEANBOT_GEOMETRY.wheelBase;
      this.velocity = { x: speed * Math.cos(angle), y: speed * Math.sin(angle), omega };
      const held = this.heldBlock;
      if (held) {
        const p = this.graspPoint(pose);
        held.x = p.x;
        held.y = p.y;
        held.rotation = pose.heading + this.heldOffset;
      }
      for (const b of this.blocks) {
        if (b.held) continue;
        const speed2 = Math.hypot(b.vx, b.vy), next = Math.max(0, speed2 - this.friction * GRAVITY * dt);
        if (speed2 > 0) {
          b.vx *= next / speed2;
          b.vy *= next / speed2;
        }
        b.spin *= Math.max(0, 1 - this.friction * 30 * dt);
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rotation += b.spin * dt;
        if (b.state === "falling") {
          const before = Math.sin(b.tilt);
          b.tipSpeed += GRAVITY / (BLOCK_SIZE.height * 0.65) * Math.sin(Math.max(0.08, b.tilt)) * dt;
          b.tilt = Math.min(Math.PI / 2, b.tilt + b.tipSpeed * dt);
          const shift = BLOCK_SIZE.height / 2 * (Math.sin(b.tilt) - before);
          b.x += Math.cos(b.rotation * RAD) * shift;
          b.y += Math.sin(b.rotation * RAD) * shift;
          if (b.tilt === Math.PI / 2) {
            b.state = "fallen";
            b.tipSpeed = 0;
            this.changed();
          }
        }
        const robotShapes = [LEANBOT_GEOMETRY.body, ...[-1, 1].map((side) => ({ x: 0, y: side * LEANBOT_GEOMETRY.wheelBase / 2, ...LEANBOT_GEOMETRY.wheel }))];
        for (const shape of robotShapes) {
          const box = { ...shape, x: pose.x + shape.x * Math.cos(angle) - shape.y * Math.sin(angle), y: pose.y + shape.x * Math.sin(angle) + shape.y * Math.cos(angle), rotation: pose.heading };
          const hit = contact(box, { ...b, ...blockFootprint(b) });
          if (!hit) continue;
          b.x += hit.nx * (hit.depth + 0.01);
          b.y += hit.ny * (hit.depth + 0.01);
          b.slotId = void 0;
          const rvx = this.velocity.x - omega * (b.y - pose.y), rvy = this.velocity.y + omega * (b.x - pose.x);
          const closing = Math.max(0, (rvx - b.vx) * hit.nx + (rvy - b.vy) * hit.ny);
          b.vx += hit.nx * closing * (1 + this.restitution);
          b.vy += hit.ny * closing * (1 + this.restitution);
          const localX = (b.x - box.x) * Math.cos(angle) + (b.y - box.y) * Math.sin(angle);
          const localY = -(b.x - box.x) * Math.sin(angle) + (b.y - box.y) * Math.cos(angle);
          const cx = clamp(localX, -box.length / 2, box.length / 2), cy = clamp(localY, -box.width / 2, box.width / 2);
          const rx = box.x + cx * Math.cos(angle) - cy * Math.sin(angle) - b.x;
          const ry = box.y + cx * Math.sin(angle) + cy * Math.cos(angle) - b.y;
          const footprint = blockFootprint(b), inertia = b.mass * (footprint.length ** 2 + footprint.width ** 2) / 12;
          b.spin = clamp(b.spin + (rx * hit.ny - ry * hit.nx) * b.mass * closing * (1 + this.restitution) / inertia / RAD, -720, 720);
          if (closing / dt > GRAVITY * (BLOCK_SIZE.length / 2) / (BLOCK_SIZE.height * 0.65)) this.tip(b, Math.atan2(hit.ny, hit.nx) / RAD);
        }
      }
      for (let i = 0; i < this.blocks.length; i++) for (let j = i + 1; j < this.blocks.length; j++) {
        const a = this.blocks[i], b = this.blocks[j], hit = contact({ ...a, ...blockFootprint(a) }, { ...b, ...blockFootprint(b) });
        if (!hit) continue;
        const ia = a.held ? 0 : 1 / a.mass, ib = b.held ? 0 : 1 / b.mass, total = ia + ib;
        if (!total) continue;
        a.x -= hit.nx * hit.depth * ia / total;
        a.y -= hit.ny * hit.depth * ia / total;
        b.x += hit.nx * hit.depth * ib / total;
        b.y += hit.ny * hit.depth * ib / total;
        const avx = a.held ? this.velocity.x : a.vx, avy = a.held ? this.velocity.y : a.vy;
        const bvx = b.held ? this.velocity.x : b.vx, bvy = b.held ? this.velocity.y : b.vy;
        const closing = (bvx - avx) * hit.nx + (bvy - avy) * hit.ny;
        if (closing < 0) {
          const impulse = -(1 + this.restitution) * closing / total;
          a.vx -= impulse * ia * hit.nx;
          a.vy -= impulse * ia * hit.ny;
          b.vx += impulse * ib * hit.nx;
          b.vy += impulse * ib * hit.ny;
          if (Math.abs(closing) / dt > GRAVITY * 7.5 / 48.75) {
            this.tip(a, Math.atan2(-hit.ny, -hit.nx) / RAD);
            this.tip(b, Math.atan2(hit.ny, hit.nx) / RAD);
          }
        }
      }
      for (const b of this.blocks) {
        if (b.held) continue;
        const shape = blockFootprint(b), a = b.rotation * RAD;
        const rx = Math.abs(Math.cos(a)) * shape.length / 2 + Math.abs(Math.sin(a)) * shape.width / 2;
        const ry = Math.abs(Math.sin(a)) * shape.length / 2 + Math.abs(Math.cos(a)) * shape.width / 2;
        if (b.x < rx || b.x > this.board.width - rx) b.vx *= -this.restitution;
        if (b.y < ry || b.y > this.board.height - ry) b.vy *= -this.restitution;
        b.x = clamp(b.x, rx, this.board.width - rx);
        b.y = clamp(b.y, ry, this.board.height - ry);
        if (Math.hypot(b.vx, b.vy) > 0.1) b.slotId = void 0;
      }
    }
    serialize() {
      return JSON.stringify({ version: 1, friction: this.friction, blocks: this.initial });
    }
    load(text) {
      const value = JSON.parse(text);
      if (value.version !== 1 || !Array.isArray(value.blocks) || value.blocks.length > 38 || !Number.isFinite(value.friction) || value.friction < 0 || value.friction > 1) throw new Error("Invalid mission layout.");
      const seen = /* @__PURE__ */ new Set();
      const next = value.blocks.map((input) => {
        if (!["pollution", "neutralizer"].includes(input.kind)) throw new Error("Invalid block type.");
        const slot = this.slots(input.kind).find((s) => s.id === input.slotId);
        if (!slot || seen.has(slot.id)) throw new Error("Invalid or occupied mission site.");
        seen.add(slot.id);
        return this.make(input.kind, input.color, slot);
      });
      this.blocks = next;
      this.friction = value.friction;
      this.commitLayout();
    }
  };
  function drawMissionBlocks(ctx, world) {
    for (const b of world.blocks) {
      const shape = blockFootprint(b), h = BLOCK_SIZE.height * Math.cos(b.tilt) * 0.18;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation * RAD);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.fillRect(-shape.length / 2 + 3, -shape.width / 2 + 4, shape.length, shape.width);
      ctx.fillStyle = BLOCK_COLORS[b.color];
      ctx.strokeStyle = b.held ? "#fff" : "#26333a";
      ctx.lineWidth = b.held ? 2 : 0.8;
      ctx.fillRect(-shape.length / 2, -shape.width / 2 - h, shape.length, shape.width + h);
      ctx.strokeRect(-shape.length / 2, -shape.width / 2 - h, shape.length, shape.width + h);
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(-shape.length / 2, -shape.width / 2 - h, shape.length, Math.min(5, shape.width));
      if (b.kind === "neutralizer") {
        ctx.fillStyle = "#f3efe0";
        if (b.tilt > Math.PI / 4) ctx.fillRect(-7.5, -shape.width / 2, 15, shape.width);
        else ctx.fillRect(-shape.length / 2, -4 - h / 2, shape.length, 8);
      }
      ctx.restore();
    }
  }

  // src/simulator/missionEditor.ts
  var MIME = "application/x-leanbot-mission-block";
  function mountMissionEditor(host, world, options) {
    host.classList.add("mission-editor");
    host.innerHTML = `<h3>Mission blocks</h3>
    <div class="mission-tools"><button type="button" data-tool="robot" aria-pressed="true">Robot</button><button type="button" data-tool="erase" aria-pressed="false">Erase block</button></div>
    <p>Drag a color to a site, or select it and click the mat. Drag placed blocks to move them.</p>
    <strong>Pollution \u2014 solid color</strong><div class="mission-palette" data-palette="pollution"></div>
    <strong>Neutralizer \u2014 white stripe</strong><div class="mission-palette" data-palette="neutralizer"></div>
    <small>15 \xD7 25 \xD7 75 mm. Pollution: city sites 1\u20134. Neutralizers: Storage S1\u2013S6.</small>
    <div class="mission-counts"><label>Pollution <input data-count="pollution" aria-label="Pollution count" type="number" min="0" max="32" value="8"></label><label>Neutralizers <input data-count="neutralizer" aria-label="Neutralizer count" type="number" min="0" max="6" value="3"></label><label>Seed <input data-seed aria-label="Mission seed" type="number" step="1" placeholder="random"></label></div>
    <div class="mission-tools"><button type="button" data-action="random">Randomize layout</button><button type="button" data-action="clear">Clear blocks</button></div>
    <label>Friction <input data-friction aria-label="Block friction" type="range" min="0" max="1" step="0.05" value="${world.friction}"><output data-friction-value>${world.friction.toFixed(2)}</output></label>
    <div class="mission-tools"><button type="button" data-action="save">Download mission</button><button type="button" data-action="open">Open mission</button></div>
    <input data-file type="file" accept=".json" hidden>
    <small>2.5D physics approximation. Block mass: 25 g (estimated). Reset restores this layout.</small>
    <div data-summary></div><div data-message role="status" aria-live="polite"></div>`;
    let tool = "robot";
    let drag;
    let frame = 0, lastTime = performance.now(), disposed = false;
    const canvas = options.canvas;
    const query = (selector) => host.querySelector(selector);
    const message = (text) => {
      query("[data-message]").textContent = text;
    };
    const guarded = (fn) => {
      if (options.locked()) return;
      try {
        fn();
        message("");
        options.render();
      } catch (e) {
        message(e instanceof Error ? e.message : String(e));
      }
    };
    const controls = () => {
      host.querySelectorAll("button,input").forEach((el) => {
        el.disabled = options.locked();
      });
      query("[data-summary]").textContent = `${world.blocks.filter((b) => b.kind === "pollution").length} pollution \xB7 ${world.blocks.filter((b) => b.kind === "neutralizer").length} neutralizers${world.heldBlock ? ` \xB7 Carrying ${world.heldBlock.color} ${world.heldBlock.kind}` : ""}`;
      host.querySelectorAll("[data-tool],[data-block-kind]").forEach((button) => {
        const selected = typeof tool === "string" ? button.dataset.tool === tool : button.dataset.blockKind === tool.kind && button.dataset.color === tool.color;
        button.setAttribute("aria-pressed", String(selected));
      });
    };
    for (const kind of ["pollution", "neutralizer"]) {
      const colors = kind === "pollution" ? Object.keys(BLOCK_COLORS) : NEUTRALIZER_COLORS;
      for (const color of colors) {
        const button = document.createElement("button");
        button.type = "button";
        button.draggable = true;
        button.dataset.blockKind = kind;
        button.dataset.color = color;
        button.setAttribute("aria-label", `${color} ${kind}`);
        const swatch = document.createElement("span");
        swatch.className = `mission-swatch ${kind}`;
        swatch.style.backgroundColor = BLOCK_COLORS[color];
        swatch.setAttribute("aria-hidden", "true");
        button.append(swatch, document.createTextNode(color));
        query(`[data-palette="${kind}"]`).append(button);
      }
    }
    const click = (event) => {
      const button = event.target.closest("button");
      if (!button || options.locked()) return;
      if (button.dataset.tool) tool = button.dataset.tool;
      if (button.dataset.blockKind) tool = { kind: button.dataset.blockKind, color: button.dataset.color };
      switch (button.dataset.action) {
        case "random":
          guarded(() => world.randomize(Number(query('[data-count="pollution"]').value), Number(query('[data-count="neutralizer"]').value), query("[data-seed]").value.trim() ? Number(query("[data-seed]").value) : Math.floor(Math.random() * 4294967296)));
          break;
        case "clear":
          guarded(() => world.clear());
          break;
        case "open":
          query("[data-file]").click();
          break;
        case "save": {
          const url = URL.createObjectURL(new Blob([world.serialize()], { type: "application/json" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = "synapse-mission.json";
          document.body.append(a);
          a.click();
          a.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
          break;
        }
      }
      controls();
    };
    const input = (event) => {
      if (options.locked()) return;
      const target = event.target;
      if (target.hasAttribute("data-friction")) {
        world.friction = Number(target.value);
        query("[data-friction-value]").textContent = world.friction.toFixed(2);
        world.changed();
      }
    };
    const fileChange = async (event) => {
      const target = event.target;
      if (!target.hasAttribute("data-file")) return;
      const file = target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        guarded(() => world.load(text));
        query("[data-friction]").value = String(world.friction);
        query("[data-friction-value]").textContent = world.friction.toFixed(2);
      } catch (e) {
        message(e instanceof Error ? e.message : String(e));
      }
      target.value = "";
    };
    const dragStart = (event) => {
      const button = event.target.closest("[data-block-kind]");
      if (!button || options.locked()) {
        event.preventDefault();
        return;
      }
      event.dataTransfer?.setData(MIME, JSON.stringify({ kind: button.dataset.blockKind, color: button.dataset.color }));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
    };
    const over = (event) => {
      if (!options.locked() && event.dataTransfer?.types.includes(MIME)) event.preventDefault();
    };
    const drop = (event) => {
      if (options.locked()) return;
      const data = event.dataTransfer?.getData(MIME);
      if (!data) return;
      event.preventDefault();
      const point = options.toBoard(event.clientX, event.clientY);
      guarded(() => {
        const block = JSON.parse(data);
        if (!["pollution", "neutralizer"].includes(block.kind)) throw new Error("Invalid block type.");
        world.place(block.kind, block.color, point.x, point.y);
      });
    };
    const down = (event) => {
      if (options.locked() || event.button !== 0) return;
      const point = options.toBoard(event.clientX, event.clientY), block = world.hit(point.x, point.y);
      if (typeof tool === "string" && tool === "robot" && !block) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (tool === "erase") {
        if (block) guarded(() => world.remove(block.id));
        return;
      }
      if (block) {
        drag = { id: block.id, x: block.x, y: block.y };
        canvas.setPointerCapture?.(event.pointerId);
      } else if (typeof tool !== "string") {
        const selected = tool;
        guarded(() => world.place(selected.kind, selected.color, point.x, point.y));
      }
    };
    const move = (event) => {
      if (!drag || options.locked()) return;
      event.stopImmediatePropagation();
      const point = options.toBoard(event.clientX, event.clientY), block = world.blocks.find((b) => b.id === drag.id);
      if (block) {
        block.x = point.x;
        block.y = point.y;
        options.render();
      }
    };
    const up = (event) => {
      if (!drag) return;
      event.stopImmediatePropagation();
      const original = drag;
      drag = void 0;
      const block = world.blocks.find((b) => b.id === original.id);
      if (!block) return;
      const point = options.toBoard(event.clientX, event.clientY);
      try {
        if (options.locked()) throw new Error("Placement is locked while running.");
        world.place(block.kind, block.color, point.x, point.y, block.id);
        message("");
      } catch (e) {
        block.x = original.x;
        block.y = original.y;
        message(e instanceof Error ? e.message : String(e));
      }
      options.render();
    };
    const cancel = () => {
      if (drag) {
        const b = world.blocks.find((b2) => b2.id === drag.id);
        if (b) {
          b.x = drag.x;
          b.y = drag.y;
        }
        drag = void 0;
        options.render();
      }
    };
    host.addEventListener("click", click);
    host.addEventListener("input", input);
    host.addEventListener("change", fileChange);
    host.addEventListener("dragstart", dragStart);
    canvas.addEventListener("dragover", over);
    canvas.addEventListener("drop", drop);
    canvas.addEventListener("pointerdown", down, true);
    canvas.addEventListener("pointermove", move, true);
    canvas.addEventListener("pointerup", up, true);
    canvas.addEventListener("pointercancel", cancel, true);
    const storageKey = "leanbot.synapse.mission.v1";
    let saved = "";
    const persist = () => {
      const text = world.serialize();
      if (text === saved) return;
      try {
        localStorage.setItem(storageKey, text);
        saved = text;
      } catch {
        message("Mission autosave unavailable. Use Download mission.");
      }
    };
    const unsubscribe = world.subscribe(() => {
      controls();
      options.render();
      persist();
    });
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && !world.blocks.length) {
        world.load(stored);
        saved = world.serialize();
      }
      query("[data-friction]").value = String(world.friction);
      query("[data-friction-value]").textContent = world.friction.toFixed(2);
    } catch {
      message("Saved mission could not be loaded. Use Open mission or create a new layout.");
    }
    const animate = (now) => {
      if (disposed) return;
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1e3));
      lastTime = now;
      controls();
      if (!options.locked() && world.hasMotion) {
        world.step(dt, options.pose());
        options.render();
      }
      frame = requestAnimationFrame(animate);
    };
    controls();
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancel();
      unsubscribe();
      host.removeEventListener("click", click);
      host.removeEventListener("input", input);
      host.removeEventListener("change", fileChange);
      host.removeEventListener("dragstart", dragStart);
      canvas.removeEventListener("dragover", over);
      canvas.removeEventListener("drop", drop);
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("pointermove", move, true);
      canvas.removeEventListener("pointerup", up, true);
      canvas.removeEventListener("pointercancel", cancel, true);
      host.replaceChildren();
    };
  }

  // src/simulator/robotAppearance.ts
  var LEANBOT_APPEARANCE = LEANBOT_GEOMETRY;
  function drawLeanbot(ctx, leftGrip = 0, rightGrip = 0) {
    ctx.save();
    ctx.lineJoin = "round";
    for (const side of [-1, 1]) {
      const y = side * LEANBOT_GEOMETRY.wheelBase / 2;
      ctx.fillStyle = "#111916";
      ctx.fillRect(-14, y - 8, 28, 16);
      ctx.strokeStyle = "#344238";
      ctx.lineWidth = 2;
      for (let x = -11; x <= 11; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x + 1, y + 7);
        ctx.stroke();
      }
      ctx.fillStyle = "#d3d5c4";
      ctx.fillRect(-10, y - 6.5, 20, 13);
      ctx.fillStyle = "#e2b52d";
      ctx.fillRect(-6, y - 3, 12, 6);
    }
    ctx.fillStyle = "#d71924";
    ctx.strokeStyle = "#961520";
    ctx.lineWidth = 1.2;
    ctx.fillRect(-92, -32, 130, 64);
    ctx.strokeRect(-92, -32, 130, 64);
    ctx.fillStyle = "#f52f35";
    ctx.fillRect(-89, -30, 122, 1.5);
    ctx.fillStyle = "#ead7a0";
    for (let x = -87; x < -10; x += 4) for (const y of [-28, 28]) ctx.fillRect(x, y, 1.5, 1.5);
    ctx.fillStyle = "#164d77";
    ctx.fillRect(-91, -17, 17, 34);
    ctx.fillStyle = "#e2b126";
    ctx.fillRect(-75, -20, 62, 40);
    ctx.fillStyle = "#143d68";
    ctx.fillRect(-74, -18, 59, 36);
    ctx.fillStyle = "#0c172a";
    ctx.fillRect(-53, -10, 20, 20);
    ctx.strokeStyle = "#b7c7c4";
    ctx.lineWidth = 0.8;
    for (let x = -70; x <= -20; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, -17);
      ctx.lineTo(x, -13);
      ctx.moveTo(x, 13);
      ctx.lineTo(x, 17);
      ctx.stroke();
    }
    ctx.fillStyle = "#b6c0ba";
    ctx.fillRect(-26, -7, 10, 14);
    ctx.fillStyle = "#f5e8d1";
    ctx.fillRect(-66, -4, 7, 8);
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#f4f0d7";
      ctx.fillRect(2, side < 0 ? -28 : 17, 13, 11);
      ctx.strokeStyle = "#f8da38";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-63, side * 31, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(20, side * 31, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#1152aa";
      ctx.fillRect(38, side * 35 - 7, 22, 14);
      ctx.fillStyle = "#2f80ce";
      ctx.fillRect(41, side * 35 - 6, 11, 12);
      for (const [colour, offset] of [["#f5b92c", 0], ["#f07122", 3], ["#243d98", 6]]) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(7, side * (24 + offset));
        ctx.lineTo(24, side * (39 + offset));
        ctx.lineTo(43, side * 35);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#fff2e0";
    ctx.font = "bold 6px sans-serif";
    ctx.fillText("LEANBOT", -62, 27);
    ctx.fillStyle = "#a1bdb3";
    ctx.fillRect(20, -31, 24, 62);
    for (const y of [-18, 18]) {
      ctx.fillStyle = "#dce6dd";
      ctx.fillRect(24, y - 10, 18, 20);
      ctx.fillStyle = "#718b87";
      ctx.beginPath();
      ctx.arc(39, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#273e3f";
      ctx.beginPath();
      ctx.arc(41, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d8e3dc";
      ctx.fillRect(24, y - 8, 3, 16);
    }
    ctx.fillStyle = "#b90f20";
    ctx.fillRect(42, -30, 3, 60);
    for (const [side, degrees] of [[-1, leftGrip], [1, rightGrip]]) {
      const close = Math.max(0, Math.min(90, degrees)) / 90;
      ctx.save();
      ctx.translate(55, side * 35);
      ctx.scale(1, side);
      ctx.rotate(0.2 - close * 0.85);
      ctx.fillStyle = "#dfc293";
      ctx.strokeStyle = "#ad946e";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(24, -6);
      ctx.lineTo(31, 1);
      ctx.lineTo(28, 7);
      ctx.lineTo(14, 1);
      ctx.lineTo(20, 15);
      ctx.lineTo(14, 18);
      ctx.lineTo(2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#d9e0dd";
      ctx.beginPath();
      ctx.arc(1, 0, 3, 0, Math.PI * 2);
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
          const speed = Math.abs((this.left - this.right) / LEANBOT_GEOMETRY.wheelBase * 180 / Math.PI);
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
            this.rotation += (this.left - this.right) / LEANBOT_GEOMETRY.wheelBase * 180 / Math.PI * dt / 1e3;
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
