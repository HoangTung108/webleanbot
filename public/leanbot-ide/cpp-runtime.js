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
    mountMissionEditor: () => mountMissionEditor,
    readVirtualColor: () => readVirtualColor,
    readVirtualLine: () => readVirtualLine
  });

  // src/simulator/motionCalibration.ts
  var MOTION_CALIBRATION = Object.freeze({
    physicalMmPerEncoderMm: 320 / 322
  });

  // src/simulator/robotGeometry.ts
  var LEANBOT_GEOMETRY = {
    length: 180,
    width: 120,
    height: 70,
    mass: 0.4,
    collisionRadius: 110,
    // conservative editing/wall hit radius, not the body width
    wheelBase: 100,
    // estimated axle track: 120 mm overall minus 20 mm tyre width
    graspOffset: 75,
    body: { x: -27, y: 0, length: 130, width: 70 },
    wheel: { length: 32.5, width: 20 },
    gripper: { pivotX: 53, pivotY: 35, openAngle: 0, closedAngle: -0.98 }
  };
  var FINGER = [[0, 3], [26, 3], [35, 0], [35, -4], [29, -8], [23, -3], [17, -3], [23, -11], [19, -14], [10, -11], [1, -3]];
  function gripperJaw(side, degrees) {
    const g = LEANBOT_GEOMETRY.gripper;
    const t = Math.max(0, Math.min(90, degrees)) / 90, a = g.openAngle + (g.closedAngle - g.openAngle) * t;
    return FINGER.map(([x, y]) => ({ x: g.pivotX + x * Math.cos(a) - y * Math.sin(a), y: side * (g.pivotY + x * Math.sin(a) + y * Math.cos(a)) }));
  }
  var jawSamples = {
    "-1": Array.from({ length: 181 }, (_, i) => gripperJaw(-1, i / 2)),
    "1": Array.from({ length: 181 }, (_, i) => gripperJaw(1, i / 2))
  };
  var contactCache = /* @__PURE__ */ new Map();
  function polygonsIntersect(a, b) {
    const inside = (p, poly) => {
      let result = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const u = poly[i], v = poly[j];
        if (u.y > p.y !== v.y > p.y && p.x < (v.x - u.x) * (p.y - u.y) / (v.y - u.y) + u.x) result = !result;
      }
      return result;
    };
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const onSegment = (p, q, r) => Math.abs(cross(p, q, r)) < 1e-8 && r.x >= Math.min(p.x, q.x) - 1e-8 && r.x <= Math.max(p.x, q.x) + 1e-8 && r.y >= Math.min(p.y, q.y) - 1e-8 && r.y <= Math.max(p.y, q.y) + 1e-8;
    if (a.some((p) => inside(p, b)) || b.some((p) => inside(p, a))) return true;
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
      const p = a[i], q = a[(i + 1) % a.length], r = b[j], t = b[(j + 1) % b.length];
      if (onSegment(p, q, r) || onSegment(p, q, t) || onSegment(r, t, p) || onSegment(r, t, q)) return true;
      if (cross(p, q, r) * cross(p, q, t) < -1e-9 && cross(r, t, p) * cross(r, t, q) < -1e-9) return true;
    }
    return false;
  }
  function fitGripperToBlock(left, right, width, shape) {
    const l = Math.max(0, Math.min(90, left)), r = Math.max(0, Math.min(90, right));
    if (!Number.isFinite(width) || width <= 0 || l === 0 && r === 0) return { left: l, right: r };
    const target = shape ?? { length: 15, width, rotation: 0 };
    const key = [l, r, target.length, target.width, target.rotation, target.x ?? LEANBOT_GEOMETRY.graspOffset, target.y ?? 0].map((n) => Math.round(n * 1e6) / 1e6).join(",");
    const cached = contactCache.get(key);
    if (cached) return { ...cached };
    const a = target.rotation * Math.PI / 180;
    const rectangle = [[-1, -1], [-1, 1], [1, 1], [1, -1]].map(([x, y]) => ({ x: (target.x ?? LEANBOT_GEOMETRY.graspOffset) + x * (target.length + 0.2) / 2 * Math.cos(a) - y * (target.width + 0.2) / 2 * Math.sin(a), y: (target.y ?? 0) + x * (target.length + 0.2) / 2 * Math.sin(a) + y * (target.width + 0.2) / 2 * Math.cos(a) }));
    const safe = (t, side) => !polygonsIntersect(gripperJaw(side, t), rectangle);
    const firstContact = (max, side) => {
      if (!safe(0, side)) return 0;
      let lo = 0, hi = max, found = false;
      for (let step = 1; step <= 180; step++) {
        const t = max * step / 180;
        if (max === 90 ? polygonsIntersect(jawSamples[side][step], rectangle) : !safe(t, side)) {
          lo = max * (step - 1) / 180;
          hi = t;
          found = true;
          break;
        }
      }
      if (!found) return max;
      for (let i = 0; i < 28; i++) {
        const t = (lo + hi) / 2;
        if (safe(t, side)) lo = t;
        else hi = t;
      }
      return lo;
    };
    const result = { left: firstContact(l, -1), right: firstContact(r, 1) };
    if (contactCache.size >= 512) contactCache.clear();
    contactCache.set(key, result);
    return { ...result };
  }
  function jawBlockContact(jaw, rectangle) {
    if (!polygonsIntersect(jaw, rectangle)) return null;
    let best = { depth: Infinity, nx: 0, ny: 0 };
    for (let i = 0; i < 2; i++) {
      const p = rectangle[i], q = rectangle[i + 1], length = Math.hypot(q.x - p.x, q.y - p.y);
      for (const sign of [-1, 1]) {
        const nx = sign * (q.x - p.x) / length, ny = sign * (q.y - p.y) / length;
        let lo = 0, hi = Math.max(...jaw.map((p2) => p2.x * nx + p2.y * ny)) - Math.min(...rectangle.map((p2) => p2.x * nx + p2.y * ny)) + 1e-3;
        for (let j = 0; j < 18; j++) {
          const distance = (lo + hi) / 2;
          if (polygonsIntersect(jaw, rectangle.map((p2) => ({ x: p2.x + nx * distance, y: p2.y + ny * distance })))) lo = distance;
          else hi = distance;
        }
        if (hi < best.depth) best = { depth: hi, nx, ny };
      }
    }
    return best;
  }

  // src/simulator/virtualSensors.ts
  var LINE_SENSOR_LATERAL_MM = [-24, -6, 6, 24];
  var LINE_SENSOR_FORWARD_MM = 50;
  function readVirtualLine(board, pose) {
    const angle = pose.heading * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    return LINE_SENSOR_LATERAL_MM.map((y) => {
      const x = pose.x + LINE_SENSOR_FORWARD_MM * cos - y * sin, sy = pose.y + LINE_SENSOR_FORWARD_MM * sin + y * cos;
      for (const line of board.lines) for (let i = 1; i < line.points.length; i++) {
        const a = line.points[i - 1], b = line.points[i], dx = b.x - a.x, dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (sy - a.y) * dy) / (dx * dx + dy * dy || 1)));
        if (Math.hypot(x - a.x - t * dx, sy - a.y - t * dy) <= line.width / 2) return 4095;
      }
      return 0;
    });
  }
  function readVirtualColor(blocks, pose, hidePollutionColors = false) {
    const angle = pose.heading * Math.PI / 180;
    const x = pose.x + LEANBOT_GEOMETRY.graspOffset * Math.cos(angle), y = pose.y + LEANBOT_GEOMETRY.graspOffset * Math.sin(angle);
    let nearest, distance = 35;
    for (const block of blocks) {
      if (block.offBoard || block.state !== "standing") continue;
      const d = Math.hypot(block.x - x, block.y - y);
      if (d < distance) {
        nearest = block;
        distance = d;
      }
    }
    const samples = { red: [200, 20, 10], yellow: [200, 180, 10], green: [20, 200, 20], blue: [20, 30, 200], purple: [140, 20, 180] };
    return nearest ? samples[hidePollutionColors && nearest.kind === "pollution" ? "mystery" : nearest.color] ?? [60, 60, 60] : [0, 0, 0];
  }

  // src/simulator/missionWorld.ts
  var BLOCK_COLORS = { green: "#83a73e", blue: "#278fa9", purple: "#795272", red: "#bd3d2f", yellow: "#d8b721", mystery: "#cbd0d5" };
  var BLOCK_SIZE = { length: 15, width: 25, height: 75 };
  var NEUTRALIZER_COLORS = ["green", "blue", "purple"];
  var RAD = Math.PI / 180;
  var GRAVITY = 9810;
  var CONTACT_SETTINGS = {
    friction: { label: "Ma s\xE1t tr\u01B0\u1EE3t", min: 0, max: 1, step: 0.01, default: 0.35, help: "Kh\u1ED1i v\u1EADt \u2013 sa b\xE0n. T\u0103ng \u0111\u1EC3 kh\u1ED1i tr\u01B0\u1EE3t ch\u1EADm v\xE0 d\u1EEBng s\u1EDBm h\u01A1n." },
    spinFriction: { label: "H\u1EC7 s\u1ED1 c\u1EA3n xoay", min: 0, max: 3, step: 0.05, default: 1, help: "Nh\xE2n v\u1EDBi ma s\xE1t tr\u01B0\u1EE3t. T\u0103ng \u0111\u1EC3 kh\u1ED1i ng\u1EEBng xoay nhanh h\u01A1n." },
    gripFriction: { label: "H\u1EC7 s\u1ED1 b\xE1m tay g\u1EAFp", min: 0, max: 2, step: 0.05, default: 1, help: "Nh\xE2n v\u1EDBi l\u1EF1c gi\u1EEF tay g\u1EAFp. Gi\u1EA3m \u0111\u1EC3 v\u1EADt d\u1EC5 tu\u1ED9t khi t\u0103ng t\u1ED1c ho\u1EB7c va ch\u1EA1m." },
    restitution: { label: "\u0110\u1ED9 n\u1EA3y va ch\u1EA1m", min: 0, max: 1, step: 0.01, default: 0.1, help: "0: kh\xF4ng n\u1EA3y; 1: va ch\u1EA1m \u0111\xE0n h\u1ED3i l\xFD t\u01B0\u1EDFng." }
  };
  var STANDING_FOOTPRINT = { length: BLOCK_SIZE.length, width: BLOCK_SIZE.width };
  var FALLEN_FOOTPRINT = { length: BLOCK_SIZE.height, width: BLOCK_SIZE.width };
  var ROBOT_SHAPES = [LEANBOT_GEOMETRY.body, ...[-1, 1].map((side) => ({ x: 0, y: side * LEANBOT_GEOMETRY.wheelBase / 2, ...LEANBOT_GEOMETRY.wheel }))];
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
    if (block.tilt === 0) return STANDING_FOOTPRINT;
    if (block.tilt === Math.PI / 2) return FALLEN_FOOTPRINT;
    return { length: BLOCK_SIZE.length * Math.cos(block.tilt) + BLOCK_SIZE.height * Math.sin(block.tilt), width: BLOCK_SIZE.width };
  }
  function blockBox(block) {
    const shape = blockFootprint(block);
    return { x: block.x, y: block.y, rotation: block.rotation, length: shape.length, width: shape.width };
  }
  function contact(a, b) {
    const reach = (a.length + a.width + b.length + b.width) / 2;
    if (Math.abs(a.x - b.x) > reach || Math.abs(a.y - b.y) > reach) return null;
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
    constructor(board, actorId = "local") {
      this.board = board;
      this.actorId = actorId;
    }
    blocks = [];
    hidePollutionColors = false;
    integrateFreeBodies = true;
    friction = 0.35;
    spinFriction = 1;
    gripFriction = 1;
    restitution = 0.1;
    setContactSetting(key, value) {
      const spec = CONTACT_SETTINGS[key];
      if (!Number.isFinite(value) || value < spec.min || value > spec.max) throw new Error(`${spec.label}: ${spec.min}\u2013${spec.max}`);
      this[key] = value;
      this.changed();
    }
    resetContactSettings() {
      for (const key of Object.keys(CONTACT_SETTINGS)) this[key] = CONTACT_SETTINGS[key].default;
      this.changed();
    }
    initial = [];
    listeners = /* @__PURE__ */ new Set();
    serial = 0;
    heldAnchor = { x: LEANBOT_GEOMETRY.graspOffset, y: 0, rotation: 0 };
    gripper = { left: 0, right: 0 };
    velocity = { x: 0, y: 0, omega: 0 };
    lastPose;
    regripBlocked = /* @__PURE__ */ new Set();
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
      return this.blocks.find((b) => b.held && (!b.heldBy || b.heldBy === this.actorId));
    }
    get hasMotion() {
      return this.blocks.some((b) => !b.held && (Math.hypot(b.vx, b.vy) > 0.01 || Math.abs(b.spin) > 0.01 || b.state === "falling" || !!b.offBoard && (b.elevation ?? 0) > -750));
    }
    slots(kind) {
      return kind === "pollution" ? (this.board.cityZones ?? []).flatMap((z) => z.sites) : this.board.storageSites ?? [];
    }
    make(kind, color, slot) {
      if (!Object.hasOwn(BLOCK_COLORS, color) || kind === "neutralizer" && !NEUTRALIZER_COLORS.includes(color)) throw new Error("Invalid color for this block type.");
      return { id: `block-${++this.serial}`, kind, color, originZone: kind === "pollution" ? this.board.cityZones?.find((z) => z.sites.some((s) => s.id === slot.id))?.id : void 0, elevation: 0, x: slot.x, y: slot.y, rotation: slot.rotation, slotId: slot.id, vx: 0, vy: 0, spin: 0, tilt: 0, tipSpeed: 0, state: "standing", held: false, mass: 0.025 };
    }
    available(kind, except) {
      return this.slots(kind).filter((s) => {
        const zone = this.board.cityZones?.find((z) => z.sites.some((site) => site.id === s.id))?.id;
        return ![...this.blocks, ...this.initial].some((b) => b.id !== except && (b.slotId === s.id || kind === "pollution" && b.kind === "pollution" && b.originZone === zone));
      });
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
      if (!Number.isInteger(pollution) || !Number.isInteger(neutralizers) || pollution < 0 || pollution > (this.board.cityZones?.length ?? 0) || neutralizers < 0 || neutralizers > this.slots("neutralizer").length) throw new Error("Choose 0\u20138 pollution blocks (one per city) and 0\u20136 neutralizers.");
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
        const colors = kind === "pollution" ? Object.keys(BLOCK_COLORS).filter((color) => color !== "mystery") : NEUTRALIZER_COLORS;
        const seenZones = /* @__PURE__ */ new Set();
        const slots = shuffle(this.slots(kind)).filter((slot) => {
          if (kind !== "pollution") return true;
          const zone = this.board.cityZones?.find((z) => z.sites.some((s) => s.id === slot.id))?.id;
          if (!zone || seenZones.has(zone)) return false;
          seenZones.add(zone);
          return true;
        });
        for (const slot of slots.slice(0, count)) blocks.push(this.make(kind, colors[Math.floor(random() * colors.length)], slot));
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
      this.regripBlocked.clear();
      this.velocity = { x: 0, y: 0, omega: 0 };
      this.changed();
    }
    hit(x, y) {
      return [...this.blocks].reverse().find((b) => {
        const a = -b.rotation * RAD, dx = x - b.x, dy = y - b.y, shape = blockFootprint(b);
        return !b.offBoard && Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) <= shape.length / 2 && Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) <= shape.width / 2;
      });
    }
    syncPose(pose) {
      this.syncHeld(pose);
      this.lastPose = { ...pose };
    }
    distance(pose, maxDistance = 300) {
      const angle = pose.heading * RAD, sx = pose.x + 40 * Math.cos(angle), sy = pose.y + 40 * Math.sin(angle);
      let nearest = maxDistance;
      for (const block of this.blocks) {
        if (block.held || block.offBoard || BLOCK_SIZE.height * Math.cos(block.tilt) + BLOCK_SIZE.length * Math.sin(block.tilt) < 35) continue;
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
    local(block, pose) {
      const a = pose.heading * RAD, dx = block.x - pose.x, dy = block.y - pose.y;
      return { x: dx * Math.cos(a) + dy * Math.sin(a), y: -dx * Math.sin(a) + dy * Math.cos(a), rotation: block.rotation - pose.heading };
    }
    fingerContact(block, pose, left = this.gripper.left, right = this.gripper.right) {
      const shape = blockFootprint(block), local = this.local(block, pose);
      return fitGripperToBlock(left, right, shape.width, { ...shape, ...local });
    }
    /** Visible servo angles include obstructions, even when no block is held. */
    getGripperAngles(pose) {
      let left = this.gripper.left, right = this.gripper.right;
      for (const block of this.blocks) {
        if (block.offBoard || (block.elevation ?? 0) > 0 || Math.hypot(block.x - pose.x, block.y - pose.y) > 150) continue;
        const actual = this.fingerContact(block, pose);
        left = Math.min(left, actual.left);
        right = Math.min(right, actual.right);
      }
      return { left, right };
    }
    syncHeld(pose) {
      const b = this.heldBlock;
      if (!b) return;
      const a = pose.heading * RAD;
      b.x = pose.x + this.heldAnchor.x * Math.cos(a) - this.heldAnchor.y * Math.sin(a);
      b.y = pose.y + this.heldAnchor.x * Math.sin(a) + this.heldAnchor.y * Math.cos(a);
      b.rotation = pose.heading + this.heldAnchor.rotation;
    }
    pointVelocity(block, pose) {
      return { x: this.velocity.x - this.velocity.omega * (block.y - pose.y), y: this.velocity.y + this.velocity.omega * (block.x - pose.x) };
    }
    release(pose, inhibitRegrip = true) {
      const block = this.heldBlock;
      if (!block) return;
      this.syncHeld(pose);
      if (inhibitRegrip) this.regripBlocked.add(block.id);
      const v = this.pointVelocity(block, pose);
      block.held = false;
      block.heldBy = void 0;
      block.vx = v.x;
      block.vy = v.y;
      block.spin = this.velocity.omega / RAD;
      const speed = Math.hypot(v.x, v.y), a = Math.atan2(v.y, v.x) - block.rotation * RAD;
      const base = (Math.abs(Math.cos(a)) * BLOCK_SIZE.length + Math.abs(Math.sin(a)) * BLOCK_SIZE.width) / 2, h = BLOCK_SIZE.height / 2;
      if (this.friction * h > base && speed * speed > 2 * GRAVITY * (Math.hypot(h, base) - h)) this.tip(block, Math.atan2(v.y, v.x) / RAD);
      this.changed();
    }
    setGripper(left, right, pose, motorLeft = 0, motorRight = 0) {
      if (![left, right, pose.x, pose.y, pose.heading, motorLeft, motorRight].every(Number.isFinite)) throw new Error("Th\xF4ng s\u1ED1 tay g\u1EAFp kh\xF4ng h\u1EE3p l\u1EC7");
      const angle = pose.heading * RAD, speed = (motorLeft + motorRight) / 2;
      this.velocity = { x: speed * Math.cos(angle), y: speed * Math.sin(angle), omega: (motorLeft - motorRight) / LEANBOT_GEOMETRY.wheelBase };
      this.syncHeld(pose);
      const opening = left < this.gripper.left - 1e-6 || right < this.gripper.right - 1e-6;
      if (opening) this.regripBlocked.clear();
      this.gripper = { left: clamp(left, 0, 90), right: clamp(right, 0, 90) };
      const stops = this.getGripperAngles(pose);
      const touchesBoth = (b) => {
        const c = this.fingerContact(b, pose, 90, 90), tolerance = 0.5;
        return c.left > 1e-4 && c.right > 1e-4 && c.left < 90 - 1e-4 && c.right < 90 - 1e-4 && c.left <= this.gripper.left + tolerance && c.right <= this.gripper.right + tolerance && c.left <= stops.left + tolerance && c.right <= stops.right + tolerance;
      };
      if (this.heldBlock) {
        if (!touchesBoth(this.heldBlock)) this.release(pose, !opening);
        return;
      }
      const point = this.graspPoint(pose);
      const candidates = this.blocks.filter((b) => {
        if (b.held || b.offBoard || this.regripBlocked.has(b.id) || b.state === "falling" || (b.elevation ?? 0) > 0) return false;
        const local = this.local(b, pose), height = BLOCK_SIZE.height * Math.cos(b.tilt) + BLOCK_SIZE.length * Math.sin(b.tilt), low = height < 30;
        if (height < 12 || local.x < 40 || local.x > 110 || Math.abs(local.y) > 5) return false;
        if (low && (Math.hypot(b.x - point.x, b.y - point.y) > 6 || Math.abs(local.y) > 4)) return false;
        if (low && (Math.abs(Math.cos(local.rotation * RAD)) < 0.96 || Math.hypot(b.vx, b.vy) > 5 || Math.abs(b.spin) > 5 || Math.max(Math.abs(motorLeft), Math.abs(motorRight)) > 10)) return false;
        const body = LEANBOT_GEOMETRY.body, a = pose.heading * RAD;
        const hit = contact({ ...body, x: pose.x + body.x * Math.cos(a), y: pose.y + body.x * Math.sin(a), rotation: pose.heading }, blockBox(b));
        if (hit && hit.depth > 1) return false;
        return touchesBoth(b);
      }).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y));
      const block = candidates[0];
      if (!block) return;
      this.heldAnchor = this.local(block, pose);
      block.held = true;
      block.heldBy = this.actorId;
      block.slotId = void 0;
      const v = this.pointVelocity(block, pose);
      block.vx = v.x;
      block.vy = v.y;
      block.spin = this.velocity.omega / RAD;
      this.lastPose = { ...pose };
      this.changed();
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
      if (!Number.isFinite(seconds) || seconds <= 0 || ![pose.x, pose.y, pose.heading, left, right].every(Number.isFinite)) return;
      const start = this.lastPose ?? pose, dh = ((pose.heading - start.heading + 180) % 360 + 360) % 360 - 180;
      const moved = Math.hypot(pose.x - start.x, pose.y - start.y) > 1e-8 || Math.abs(dh) > 1e-8;
      const a = pose.heading * RAD, speed = (left + right) / 2;
      const velocity = moved ? { x: (pose.x - start.x) / seconds, y: (pose.y - start.y) / seconds, omega: dh * RAD / seconds } : { x: speed * Math.cos(a), y: speed * Math.sin(a), omega: (left - right) / LEANBOT_GEOMETRY.wheelBase };
      let elapsed = 0;
      while (elapsed < seconds - 1e-9) {
        const dt = Math.min(5e-3, seconds - elapsed);
        elapsed += dt;
        const t = elapsed / seconds;
        this.substep(dt, { x: start.x + (pose.x - start.x) * t, y: start.y + (pose.y - start.y) * t, heading: start.heading + dh * t }, velocity);
      }
      this.lastPose = { ...pose };
    }
    gripLimit(block) {
      const height = BLOCK_SIZE.height * Math.cos(block.tilt) + BLOCK_SIZE.length * Math.sin(block.tilt);
      return 1.5 * this.gripFriction * clamp((height - 12) / 30, 0.1, 1);
    }
    substep(dt, pose, velocity) {
      const angle = pose.heading * RAD, omega = velocity.omega;
      this.velocity = velocity;
      if (!this.heldBlock && this.gripper.left > 10 && this.gripper.right > 10) {
        const v = velocity.x * Math.cos(angle) + velocity.y * Math.sin(angle);
        this.setGripper(this.gripper.left, this.gripper.right, pose, v + omega * LEANBOT_GEOMETRY.wheelBase / 2, v - omega * LEANBOT_GEOMETRY.wheelBase / 2);
        this.velocity = velocity;
      }
      const held = this.heldBlock;
      if (held) {
        this.syncHeld(pose);
        const v = this.pointVelocity(held, pose);
        held.vx = v.x;
        held.vy = v.y;
        held.spin = omega / RAD;
      }
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const robotBoxes = ROBOT_SHAPES.map((shape) => ({ ...shape, x: pose.x + shape.x * cos - shape.y * sin, y: pose.y + shape.x * sin + shape.y * cos, rotation: pose.heading }));
      const grip = this.getGripperAngles(pose);
      const jaws = [-1, 1].map((side) => gripperJaw(side, side === -1 ? grip.left : grip.right).map((p) => ({ x: pose.x + p.x * cos - p.y * sin, y: pose.y + p.x * sin + p.y * cos })));
      for (const b of this.blocks) {
        if (b.held) continue;
        if (this.integrateFreeBodies) {
          if (!b.offBoard && (b.x < 0 || b.y < 0 || b.x > this.board.width || b.y > this.board.height)) {
            b.offBoard = true;
            b.elevation = 0;
            b.verticalVelocity = 0;
            b.slotId = void 0;
            this.changed();
          }
          if (b.offBoard) {
            if ((b.elevation ?? 0) > -750) {
              b.x += b.vx * dt;
              b.y += b.vy * dt;
              b.rotation += b.spin * dt;
              b.elevation = Math.max(-750, (b.elevation ?? 0) - (b.verticalVelocity ?? 0) * dt - 0.5 * GRAVITY * dt * dt);
              b.verticalVelocity = (b.verticalVelocity ?? 0) + GRAVITY * dt;
              if (b.elevation <= -750) {
                b.vx = b.vy = b.spin = b.verticalVelocity = b.tipSpeed = 0;
                b.state = "fallen";
                b.tilt = Math.PI / 2;
                this.changed();
              }
            }
            continue;
          }
          const speed = Math.hypot(b.vx, b.vy), next = Math.max(0, speed - this.friction * GRAVITY * dt);
          if (speed > 0) {
            b.vx *= next / speed;
            b.vy *= next / speed;
          }
          b.spin *= Math.max(0, 1 - this.friction * this.spinFriction * 30 * dt);
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rotation += b.spin * dt;
          if (b.x < 0 || b.y < 0 || b.x > this.board.width || b.y > this.board.height) {
            b.offBoard = true;
            b.elevation = 0;
            b.verticalVelocity = 0;
            b.slotId = void 0;
            this.changed();
            continue;
          }
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
        }
        if (b.offBoard) continue;
        if (Math.hypot(b.x - pose.x, b.y - pose.y) < 150) for (const jaw of jaws) {
          const shape = blockFootprint(b), a = b.rotation * RAD, c = Math.cos(a), s = Math.sin(a);
          const rectangle = [[-1, -1], [-1, 1], [1, 1], [1, -1]].map(([x, y]) => ({ x: b.x + x * shape.length / 2 * c - y * shape.width / 2 * s, y: b.y + x * shape.length / 2 * s + y * shape.width / 2 * c }));
          const hit = jawBlockContact(jaw, rectangle);
          if (!hit) continue;
          b.x += hit.nx * (hit.depth + 0.01);
          b.y += hit.ny * (hit.depth + 0.01);
          b.slotId = void 0;
          const v = this.pointVelocity(b, pose), closing = Math.max(0, (v.x - b.vx) * hit.nx + (v.y - b.vy) * hit.ny);
          const impulse = closing * (1 + this.restitution) / (1 / LEANBOT_GEOMETRY.mass + 1 / b.mass);
          b.vx += hit.nx * impulse / b.mass;
          b.vy += hit.ny * impulse / b.mass;
        }
        for (const box of robotBoxes) {
          const hit = contact(box, blockBox(b));
          if (!hit) continue;
          b.x += hit.nx * (hit.depth + 0.01);
          b.y += hit.ny * (hit.depth + 0.01);
          b.slotId = void 0;
          const rvx = this.velocity.x - omega * (b.y - pose.y), rvy = this.velocity.y + omega * (b.x - pose.x);
          const closing = Math.max(0, (rvx - b.vx) * hit.nx + (rvy - b.vy) * hit.ny);
          const impulse = closing * (1 + this.restitution) / (1 / LEANBOT_GEOMETRY.mass + 1 / b.mass);
          b.vx += hit.nx * impulse / b.mass;
          b.vy += hit.ny * impulse / b.mass;
          const localX = (b.x - box.x) * Math.cos(angle) + (b.y - box.y) * Math.sin(angle);
          const localY = -(b.x - box.x) * Math.sin(angle) + (b.y - box.y) * Math.cos(angle);
          const cx = clamp(localX, -box.length / 2, box.length / 2), cy = clamp(localY, -box.width / 2, box.width / 2);
          const rx = box.x + cx * Math.cos(angle) - cy * Math.sin(angle) - b.x;
          const ry = box.y + cx * Math.sin(angle) + cy * Math.cos(angle) - b.y;
          const footprint = blockFootprint(b), inertia = b.mass * (footprint.length ** 2 + footprint.width ** 2) / 12;
          b.spin = clamp(b.spin + (rx * hit.ny - ry * hit.nx) * impulse / inertia / RAD, -720, 720);
          if (impulse / b.mass / dt > GRAVITY * (BLOCK_SIZE.length / 2) / (BLOCK_SIZE.height * 0.65)) this.tip(b, Math.atan2(hit.ny, hit.nx) / RAD);
        }
      }
      for (let i = 0; i < this.blocks.length; i++) for (let j = i + 1; j < this.blocks.length; j++) {
        const a = this.blocks[i], b = this.blocks[j];
        if (a.offBoard || b.offBoard) continue;
        if (a.held && a.heldBy && a.heldBy !== this.actorId || b.held && b.heldBy && b.heldBy !== this.actorId) continue;
        if (!this.integrateFreeBodies && !a.held && !b.held) continue;
        const sa = blockFootprint(a), sb = blockFootprint(b), reach = (sa.length + sa.width + sb.length + sb.width) / 2;
        if (Math.abs(a.x - b.x) > reach || Math.abs(a.y - b.y) > reach) continue;
        const hit = contact(blockBox(a), blockBox(b));
        if (!hit) continue;
        let closing = (b.vx - a.vx) * hit.nx + (b.vy - a.vy) * hit.ny;
        const carried = a.held ? a : b.held ? b : void 0, free = a.held ? b : a;
        if (carried && closing < 0 && free.mass * -closing * (1 + this.restitution) / dt / 1e3 > this.gripLimit(carried)) this.release(pose);
        const ia = a.held ? 0 : 1 / a.mass, ib = b.held ? 0 : 1 / b.mass, total = ia + ib;
        if (!total) continue;
        a.x -= hit.nx * hit.depth * ia / total;
        a.y -= hit.ny * hit.depth * ia / total;
        b.x += hit.nx * hit.depth * ib / total;
        b.y += hit.ny * hit.depth * ib / total;
        closing = (b.vx - a.vx) * hit.nx + (b.vy - a.vy) * hit.ny;
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
      for (const b of this.blocks) if (!b.held && !b.offBoard && Math.hypot(b.vx, b.vy) > 0.1) b.slotId = void 0;
    }
    serialize() {
      return JSON.stringify({ version: 1, friction: this.friction, spinFriction: this.spinFriction, gripFriction: this.gripFriction, restitution: this.restitution, blocks: this.initial });
    }
    load(text) {
      const value = JSON.parse(text);
      if (value.version !== 1 || !Array.isArray(value.blocks) || value.blocks.length > 38 || !Number.isFinite(value.friction) || value.friction < 0 || value.friction > 1) throw new Error("Invalid mission layout.");
      const settings = {};
      for (const key of Object.keys(CONTACT_SETTINGS)) {
        const spec = CONTACT_SETTINGS[key], input = value[key] === void 0 ? spec.default : value[key];
        if (!Number.isFinite(input) || input < spec.min || input > spec.max) throw new Error(`Invalid ${key}.`);
        settings[key] = input;
      }
      const seen = /* @__PURE__ */ new Set(), seenZones = /* @__PURE__ */ new Set();
      const next = value.blocks.map((input) => {
        if (!["pollution", "neutralizer"].includes(input.kind)) throw new Error("Invalid block type.");
        const slot = this.slots(input.kind).find((s) => s.id === input.slotId);
        if (!slot || seen.has(slot.id)) throw new Error("Invalid or occupied mission site.");
        seen.add(slot.id);
        const block = this.make(input.kind, input.color, slot);
        if (block.originZone) {
          if (seenZones.has(block.originZone)) throw new Error("V6: ch\u1EC9 m\u1ED9t pollution m\u1ED7i th\xE0nh ph\u1ED1.");
          seenZones.add(block.originZone);
        }
        return block;
      });
      this.blocks = next;
      Object.assign(this, settings);
      this.commitLayout();
    }
  };
  function drawMissionBlocks(ctx, world) {
    for (const b of world.blocks) {
      const shape = blockFootprint(b);
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.offBoard) {
        const t = Math.min(1, -(b.elevation ?? 0) / 750);
        ctx.globalAlpha = 1 - 0.85 * t;
        ctx.scale(1 - 0.4 * t, 1 - 0.4 * t);
      }
      ctx.rotate(b.rotation * RAD);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.fillRect(-shape.length / 2 + 3, -shape.width / 2 + 4, shape.length, shape.width);
      const hidden = world.hidePollutionColors && b.kind === "pollution";
      ctx.fillStyle = hidden ? "#9ca8ae" : BLOCK_COLORS[b.color];
      ctx.strokeStyle = b.held ? "#fff" : "#26333a";
      ctx.lineWidth = b.held ? 2 : 0.8;
      ctx.fillRect(-shape.length / 2, -shape.width / 2, shape.length, shape.width);
      ctx.strokeRect(-shape.length / 2 + ctx.lineWidth / 2, -shape.width / 2 + ctx.lineWidth / 2, shape.length - ctx.lineWidth, shape.width - ctx.lineWidth);
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(-shape.length / 2, -shape.width / 2, shape.length, Math.min(3, shape.width));
      if (hidden || b.color === "mystery") {
        ctx.fillStyle = "#344357";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", 0, 4);
      }
      if (b.kind === "neutralizer") {
        ctx.fillStyle = "#f3efe0";
        if (b.tilt > Math.PI / 4) ctx.fillRect(-shape.length / 6, -shape.width / 2, shape.length / 3, shape.width);
        else ctx.fillRect(-shape.length / 2, -shape.width / 6, shape.length, shape.width / 3);
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
    <small>15 \xD7 25 \xD7 75 mm. Pollution: one per city, sites 1\u20134. Neutralizers: Storage S1\u2013S6.</small>
    <div class="mission-counts"><label>Pollution <input data-count="pollution" aria-label="Pollution count" type="number" min="0" max="8" value="8"></label><label>Neutralizers <input data-count="neutralizer" aria-label="Neutralizer count" type="number" min="0" max="6" value="3"></label><label>Seed <input data-seed aria-label="Mission seed" type="number" step="1" placeholder="random"></label></div>
    <div class="mission-tools"><button type="button" data-action="random">Randomize layout</button><button type="button" data-action="clear">Clear blocks</button></div>
    <details class="mission-contact" open><summary>Hi\u1EC7u ch\u1EC9nh ma s\xE1t & va ch\u1EA1m</summary>
    ${Object.keys(CONTACT_SETTINGS).map((key) => {
      const spec = CONTACT_SETTINGS[key];
      return `<div class="mission-contact-control"><label>${spec.label}<input data-contact="${key}" aria-label="${spec.label}" type="number" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${world[key]}"></label>
        <input data-contact="${key}" ${key === "friction" ? "data-friction" : ""} aria-label="${key === "friction" ? "Block friction" : spec.label + " thanh tr\u01B0\u1EE3t"}" type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${world[key]}">
        <small>${spec.help}</small></div>`;
    }).join("")}
    <output data-friction-value hidden>${world.friction.toFixed(2)}</output>
    <button type="button" data-action="reset-contact">Kh\xF4i ph\u1EE5c ma s\xE1t m\u1EB7c \u0111\u1ECBnh</button>
    <small>Th\xF4ng s\u1ED1 \u01B0\u1EDBc l\u01B0\u1EE3ng cho kh\u1ED1i v\u1EADt v\xE0 tay g\u1EAFp; kh\xF4ng thay \u0111\u1ED5i \u0111\u1ED9 b\xE1m b\xE1nh xe.</small></details>
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
    let lastLocked;
    const controls = () => {
      const locked = options.locked();
      lastLocked = locked;
      host.querySelectorAll("[data-contact]").forEach((el) => {
        el.value = String(world[el.dataset.contact]);
      });
      host.querySelectorAll("button,input").forEach((el) => {
        if (el.disabled !== locked) el.disabled = locked;
      });
      query("[data-summary]").textContent = `${world.blocks.filter((b) => b.kind === "pollution").length} pollution \xB7 ${world.blocks.filter((b) => b.kind === "neutralizer").length} neutralizers${world.heldBlock ? ` \xB7 Carrying ${world.hidePollutionColors && world.heldBlock.kind === "pollution" ? "unknown" : world.heldBlock.color} ${world.heldBlock.kind}` : ""}`;
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
        case "reset-contact":
          guarded(() => world.resetContactSettings());
          break;
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
      if (target.dataset.contact) {
        const key = target.dataset.contact;
        if (target.value === "" || !target.validity.valid) {
          message("Nh\u1EADp gi\xE1 tr\u1ECB trong kho\u1EA3ng cho ph\xE9p.");
          return;
        }
        guarded(() => world.setContactSetting(key, Number(target.value)));
        query("[data-friction-value]").textContent = world.friction.toFixed(2);
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
      if (!options.locked()) options.render();
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
      if (options.locked() !== lastLocked) controls();
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
  function drawLeanbot(ctx, leftGrip = 0, rightGrip = 0, rgb) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillStyle = "rgba(17,24,30,.18)";
    ctx.fillRect(-90, -34, 134, 70);
    ctx.fillStyle = "#8b1525";
    ctx.fillRect(-92, -35, 132, 70);
    ctx.fillStyle = "#bc2030";
    ctx.fillRect(-92, -35, 132, 4);
    ctx.fillRect(-92, 31, 132, 4);
    ctx.fillStyle = "#202b30";
    ctx.fillRect(-87, -29, 118, 58);
    for (const side of [-1, 1]) {
      const y = side * LEANBOT_GEOMETRY.wheelBase / 2;
      ctx.fillStyle = "#d2d8cd";
      ctx.fillRect(-14, side < 0 ? -43 : 31, 28, 12);
      ctx.strokeStyle = "#8b9891";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-14, side < 0 ? -43 : 31, 28, 12);
      ctx.fillStyle = "#162322";
      ctx.fillRect(-16.25, y - 10, 32.5, 20);
      ctx.fillStyle = "#283733";
      ctx.fillRect(-15, y - 8, 30, 2);
      ctx.fillRect(-15, y + 6, 30, 2);
      ctx.strokeStyle = "#45524a";
      ctx.lineWidth = 1.8;
      for (let x = -13; x <= 13; x += 4.5) {
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x + 2, y - 3);
        ctx.moveTo(x, y + 3);
        ctx.lineTo(x + 2, y + 9);
        ctx.stroke();
      }
      ctx.fillStyle = "#b6c0b2";
      ctx.fillRect(-8, y - 4, 16, 8);
      ctx.fillStyle = "#7d8d83";
      ctx.fillRect(-3, y - 3, 6, 6);
    }
    ctx.fillStyle = "#e02738";
    ctx.fillRect(-92, -31, 130, 62);
    ctx.strokeStyle = "#aa1d2c";
    ctx.lineWidth = 1;
    ctx.strokeRect(-92, -31, 130, 62);
    ctx.fillStyle = "#f46b65";
    ctx.fillRect(-90, -30, 126, 1);
    ctx.strokeStyle = "#f1a0a0";
    ctx.lineWidth = 0.35;
    for (let i = 0; i < 9; i++) {
      const y = -23 + i * 5.7;
      ctx.beginPath();
      ctx.moveTo(-81, y);
      ctx.lineTo(-9, y);
      ctx.lineTo(5, y * 0.7);
      ctx.stroke();
    }
    for (const x of [-75, 23]) for (const y of [-27, 27]) {
      ctx.fillStyle = "#e1ba4a";
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8d2030";
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e0d6ba";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - 1, y);
      ctx.lineTo(x + 1, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#20232b";
    ctx.fillRect(-76, -14, 61, 28);
    ctx.fillStyle = "#174d6b";
    ctx.fillRect(-73, -10, 55, 20);
    for (let x = -70; x < -20; x += 3.2) for (const y of [-11, 10]) {
      ctx.fillStyle = "#d5b66e";
      ctx.fillRect(x, y, 1.1, 2);
    }
    ctx.fillStyle = "#14242d";
    ctx.fillRect(-55, -7, 14, 14);
    ctx.strokeStyle = "#8ca6aa";
    ctx.lineWidth = 0.6;
    for (let v = -5; v <= 5; v += 2) {
      ctx.beginPath();
      ctx.moveTo(-57, v);
      ctx.lineTo(-55, v);
      ctx.moveTo(-41, v);
      ctx.lineTo(-39, v);
      ctx.stroke();
    }
    ctx.fillStyle = "#c6cdd0";
    ctx.fillRect(-26, -6, 10, 12);
    ctx.fillStyle = "#647983";
    ctx.fillRect(-22, -4, 6, 8);
    ctx.fillStyle = "#c0bfa3";
    ctx.fillRect(-67, -3, 5, 6);
    ctx.fillStyle = "#87b6ae";
    for (let x = -68; x < -28; x += 8) ctx.fillRect(x, 6, 3, 1);
    ctx.fillStyle = "#f3efe4";
    ctx.font = "bold 4.2px sans-serif";
    ctx.fillText("NANO", -65, -5);
    ctx.fillStyle = "#d82636";
    ctx.fillRect(-89, -37, 58, 74);
    ctx.strokeStyle = "#7f1524";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-89, -37, 58, 74);
    ctx.fillStyle = "#172222";
    ctx.fillRect(-79, -23, 37, 46);
    ctx.strokeStyle = "#849e9b";
    ctx.strokeRect(-79, -23, 37, 46);
    ctx.fillStyle = "#243936";
    ctx.fillRect(-76, -18, 31, 36);
    for (const y of [-31, 31]) {
      ctx.fillStyle = "#142225";
      ctx.fillRect(-76, y - 3, 30, 6);
      ctx.fillStyle = "#c4bd96";
      for (let x = -73; x < -48; x += 4) ctx.fillRect(x, y - 1, 1.5, 2);
    }
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#eee8d5";
      ctx.fillRect(-4, side < 0 ? -25 : 16, 13, 9);
      ctx.fillStyle = "#968e7b";
      for (let x = -2; x < 7; x += 3) ctx.fillRect(x, side < 0 ? -24 : 17, 1, 6);
      for (const [colour, offset] of [["#e9b22d", 0], ["#d64b2e", 2.4], ["#35466a", 4.8]]) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(1, side * 21);
        ctx.bezierCurveTo(-8, side * (39 + offset), 19, side * (47 + offset), 33, side * 34);
        ctx.stroke();
      }
      ctx.fillStyle = "#b91d2d";
      ctx.fillRect(34, side * LEANBOT_GEOMETRY.gripper.pivotY - 11, 28, 22);
      ctx.fillStyle = "#164790";
      ctx.fillRect(37, side * LEANBOT_GEOMETRY.gripper.pivotY - 9, 22, 18);
      ctx.fillStyle = "#2d77b4";
      ctx.fillRect(39, side * LEANBOT_GEOMETRY.gripper.pivotY - 8, 13, 16);
      ctx.strokeStyle = "#8cb4d6";
      ctx.lineWidth = 0.7;
      ctx.strokeRect(37, side * LEANBOT_GEOMETRY.gripper.pivotY - 9, 22, 18);
      ctx.fillStyle = "#a7c7db";
      ctx.fillRect(40, side * LEANBOT_GEOMETRY.gripper.pivotY - 6, 3, 12);
      ctx.fillStyle = "#df629b";
      ctx.fillRect(54, side * LEANBOT_GEOMETRY.gripper.pivotY - 10, 3, 4);
      ctx.fillStyle = "#ece9d6";
      ctx.beginPath();
      ctx.arc(LEANBOT_GEOMETRY.gripper.pivotX, side * LEANBOT_GEOMETRY.gripper.pivotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#397f6e";
    ctx.fillRect(19, -27, 25, 54);
    ctx.strokeStyle = "#bdd0be";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(19, -27, 25, 54);
    for (const y of [-15, 15]) {
      ctx.fillStyle = "#7c9794";
      ctx.fillRect(25, y - 9, 19, 18);
      ctx.fillStyle = "#cedbd6";
      ctx.fillRect(27, y - 8, 15, 16);
      ctx.fillStyle = "#f0f2e9";
      ctx.fillRect(28, y - 7, 4, 14);
      ctx.fillStyle = "#263d40";
      ctx.beginPath();
      ctx.ellipse(43, y, 3, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d5e2d9";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = "#f4e9c8";
    ctx.fillRect(22, -4, 9, 8);
    for (const [side, degrees] of [[-1, leftGrip], [1, rightGrip]]) {
      const jaw = gripperJaw(side, degrees);
      ctx.fillStyle = "#eee0c3";
      ctx.strokeStyle = "#b9a886";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(jaw[0].x, jaw[0].y);
      for (const p of jaw.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#dce1dc";
      ctx.beginPath();
      ctx.arc(LEANBOT_GEOMETRY.gripper.pivotX, side * LEANBOT_GEOMETRY.gripper.pivotY, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#657d86";
      ctx.beginPath();
      ctx.arc(LEANBOT_GEOMETRY.gripper.pivotX, side * LEANBOT_GEOMETRY.gripper.pivotY, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (rgb) for (let i = 0; i < 4; i++) {
      const start = rgb.length === 12 ? i * 3 : 0;
      ctx.fillStyle = `rgb(${rgb.slice(start, start + 3).join(",")})`;
      ctx.fillRect(-13, -24 + i * 15, 5, 5);
    }
    ctx.fillStyle = "#f9e6d6";
    ctx.font = "bold 5px sans-serif";
    ctx.fillText("LEANBOT", -59, 24);
    ctx.restore();
  }

  // src/transpiler/cppParser/tokenizer.ts
  var twoChar = /* @__PURE__ */ new Set(["<=", ">=", "==", "!=", "&&", "||", "+=", "-=", "++", "--", "::", "->", "<<", ">>", "*=", "/=", "%=", "&=", "|="]);
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
  var isRef = (v) => v != null && typeof v.read === "function";
  var copyValue = (v) => Array.isArray(v) ? v.map(copyValue) : v && typeof v === "object" && !isRef(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copyValue(x)])) : v;
  var TYPES = /* @__PURE__ */ new Set(["void", "int", "float", "double", "long", "short", "unsigned", "signed", "char", "bool", "String", "const", "static", "inline", "auto", "byte", "uint8_t", "uint16_t", "uint32_t", "int8_t", "int16_t", "int32_t", "CRGB", "__FlashStringHelper"]);
  var SDK_CALLS = new Set(Object.entries({
    Leanbot: ["begin", "pingCm", "pingMm", "tone"],
    LbMission: ["begin", "end"],
    LbMotion: ["runLR", "runLRrpm", "stopAndWait", "setZeroOrigin", "getDistanceMm", "getRotationDeg", "waitDistanceMm", "waitRotationDeg"],
    LbIRLine: ["setThreshold", "read", "value", "isBlackDetected", "doManualCalibration", "displayOnRGB"],
    LbIRArray: ["read"],
    LbTouch: ["read"],
    LbRGB: ["fillColor", "show", "getBrightness", "setBrightness"],
    LbGripper: ["open", "close", "moveTo", "moveToLR"],
    APDS: ["begin", "colorAvailable", "readColor"],
    Serial: ["begin", "print", "println"],
    "LbIoT.Wifi": ["begin"],
    "LbIoT.Asset": ["begin", "attribute"]
  }).flatMap(([object, methods]) => methods.map((method) => `${object}.${method}`)));
  var INSTANCE_CALLS = /* @__PURE__ */ new Set(["length", "c_str", "trim", "toUpperCase", "read", "write"]);
  var assignments = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "%=", "&=", "|="]);
  var precedence = { "=": 1, "+=": 1, "-=": 1, "*=": 1, "/=": 1, "%=": 1, "&=": 1, "|=": 1, "?": 2, "||": 3, "&&": 4, "|": 5, "^": 6, "&": 7, "==": 8, "!=": 8, "<": 9, ">": 9, "<=": 9, ">=": 9, "<<": 10, ">>": 10, "+": 11, "-": 11, "*": 12, "/": 12, "%": 12 };
  var Parser = class {
    tokens;
    i = 0;
    types = new Set(TYPES);
    structs = /* @__PURE__ */ new Map();
    constructor(source) {
      this.tokens = tokenizeCpp(source).filter((t) => !["comment", "preprocessor"].includes(t.kind));
      this.tokens = this.tokens.filter((t, i, all) => !(t.kind === "identifier" && /^(f|u|l|ul|ull)$/i.test(t.value) && all[i - 1]?.kind === "number" && all[i - 1].end === t.start));
      for (const t of this.tokens) if (t.kind === "number" && !/^0[xb]/i.test(t.value)) t.value = t.value.replace(/[fF]$/, "");
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
        this.take();
        let type = "";
        while (!this.peek(")")) type += this.take() + " ";
        this.take();
        n = { k: "cast", type, value: this.expr(13) };
      } else if (this.eat("(")) {
        n = this.expr();
        this.take(")");
      } else if (this.eat("{")) {
        const values = [];
        if (!this.peek("}")) do {
          values.push(this.expr());
        } while (this.eat(",") && !this.peek("}"));
        this.take("}");
        n = { k: "array", values };
      } else if (["!", "~", "-", "+", "++", "--", "*", "&"].includes(this.peek())) n = { k: "unary", op: this.take(), value: this.expr(13) };
      else if (t.kind === "number") {
        this.i++;
        n = { k: "literal", value: Number(t.value) };
      } else if (t.kind === "string") {
        this.i++;
        n = { k: "literal", value: t.value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"') };
      } else if (t.kind === "identifier") n = { k: "name", name: this.take() };
      else throw new Error(`D\xF2ng ${t.line}: bi\u1EC3u th\u1EE9c ch\u01B0a h\u1ED7 tr\u1EE3 ${t.value}`);
      while (true) {
        if (this.eat(".") || this.eat("::") || this.eat("->")) {
          n = { k: "member", value: n, name: this.take() };
          continue;
        }
        if (this.eat("(")) {
          const args = [];
          if (!this.peek(")")) do {
            args.push(this.expr());
          } while (this.eat(","));
          this.take(")");
          n = { k: "call", callee: n, args };
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
        } else n = { k: "binary", op, left: n, right: this.expr(level + (assignments.has(op) ? 0 : 1)) };
      }
      return n;
    }
    type() {
      let type = "";
      while (this.types.has(this.peek())) type += this.take() + " ";
      while (["*", "&"].includes(this.peek())) type += this.take();
      return type;
    }
    declaration() {
      const type = this.type(), name = this.take();
      if (this.eat("(")) {
        const params = [];
        if (!this.peek(")")) do {
          const type2 = this.type();
          if (type2.trim() === "void" && this.peek(")")) break;
          const name2 = this.take();
          const value = this.eat("=") ? this.expr() : null;
          params.push({ k: "param", type: type2, name: name2, value });
        } while (this.eat(","));
        this.take(")");
        if (this.eat(";")) return { k: "prototype", name, params };
        return { k: "function", name, params, body: this.statement() };
      }
      const declarations = [];
      let next = name;
      do {
        const dimensions = [];
        while (this.eat("[")) {
          dimensions.push(this.peek("]") ? { k: "literal", value: 0 } : this.expr());
          this.take("]");
        }
        const value = this.eat("=") ? this.expr() : null;
        declarations.push({ k: "declare", name: next, type, value, dimensions });
        if (!this.eat(",")) break;
        next = this.take();
      } while (true);
      this.take(";");
      return { k: "declarations", body: declarations };
    }
    statement() {
      if (this.eat(";")) return { k: "empty" };
      if (this.eat("{")) {
        const body = [];
        while (!this.peek("}")) body.push(this.statement());
        this.take("}");
        return { k: "block", body };
      }
      if (this.eat("struct")) {
        const name = this.take();
        this.types.add(name);
        this.take("{");
        const fields = [];
        while (!this.peek("}")) fields.push(...this.declaration().body);
        this.take("}");
        this.take(";");
        this.structs.set(name, fields);
        return { k: "empty" };
      }
      if (this.eat("enum")) {
        const type = this.take();
        this.types.add(type);
        this.take("{");
        const entries = [];
        do {
          const name = this.take();
          entries.push({ k: "entry", name, value: this.eat("=") ? this.expr() : null });
        } while (this.eat(",") && !this.peek("}"));
        this.take("}");
        this.take(";");
        return { k: "enum", entries };
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
          const def = this.eat("default");
          if (!def) this.take("case");
          const label = def ? null : this.expr();
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
  var callName = (n) => n.k === "name" ? n.name : n.k === "member" ? `${callName(n.value)}.${n.name}` : "";
  var Flow = class {
    constructor(kind, value = null) {
      this.kind = kind;
      this.value = value;
    }
  };
  var CppRuntime = class {
    constructor(source, host, distanceScale = MOTION_CALIBRATION.physicalMmPerEncoderMm) {
      this.host = host;
      this.distanceScale = distanceScale;
      if (!Number.isFinite(distanceScale) || distanceScale <= 0) throw new Error("H\u1EC7 s\u1ED1 hi\u1EC7u chu\u1EA9n qu\xE3ng \u0111\u01B0\u1EDDng ph\u1EA3i l\xE0 s\u1ED1 d\u01B0\u01A1ng h\u1EEFu h\u1EA1n.");
      const parser = new Parser(source);
      this.nodes = parser.parse();
      this.structs = parser.structs;
      for (const n of this.nodes) if (n.k === "function") this.functions.set(n.name, [...this.functions.get(n.name) ?? [], n]);
      for (const n of this.nodes) if (n.k === "prototype") {
        for (const fn of this.functions.get(n.name) ?? []) if (fn.params.length === n.params.length) fn.params.forEach((p, i) => p.value ??= n.params[i].value);
      }
      const builtins = /* @__PURE__ */ new Set(["F", "CRGB", "BITMAP", "millis", "delay", "LbDelay", "isfinite", "isnan", "fabsf", "fabs", "abs", "lroundf", "round", "sqrtf", "sqrt", "min", "max", "constrain", "strcmp"]);
      const validate = (n) => {
        if (!n || typeof n !== "object") return;
        if (n.k === "call") {
          const name = callName(n.callee);
          const instance = n.callee.k === "member" && !/^(Leanbot|Lb[A-Z]\w*|APDS|Serial|CRGB)(\.|$)/.test(name) && INSTANCE_CALLS.has(n.callee.name);
          if (!this.functions.has(name) && !builtins.has(name) && !SDK_CALLS.has(name) && !instance) throw new Error(`H\xE0m ch\u01B0a h\u1ED7 tr\u1EE3 trong gi\u1EA3 l\u1EADp: ${name}`);
        }
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
    missionStarted = false;
    cachedLineMask = 0;
    running = false;
    time = 0;
    distance = 0;
    rotation = 0;
    left = 0;
    right = 0;
    structs = /* @__PURE__ */ new Map();
    thresholds = [69, 78, 106, 70];
    brightness = 255;
    rgb = [0, 0, 0];
    assetId = "";
    serial = "";
    iot = /* @__PURE__ */ new Map();
    *location(n) {
      if (n.k === "name") {
        const scope = [...this.scopes].reverse().find((s) => s.has(n.name));
        if (!scope) throw new Error(`Bi\u1EBFn ch\u01B0a khai b\xE1o: ${n.name}`);
        const value = scope.get(n.name);
        if (isRef(value) && value.alias) return value;
        return { read: () => scope.get(n.name), write: (v) => scope.set(n.name, copyValue(v)) };
      }
      if (n.k === "unary" && n.op === "*") {
        const ref = yield* this.expr(n.value);
        if (isRef(ref)) return ref;
      }
      if (n.k === "member" || n.k === "index") {
        let obj = yield* this.expr(n.value);
        if (isRef(obj)) obj = obj.read();
        const key = n.k === "member" ? n.name : Number(yield* this.expr(n.index));
        if (obj && typeof obj === "object") return { read: () => obj[key], write: (v) => {
          obj[key] = copyValue(v);
        } };
      }
      throw new Error("Bi\u1EC3u th\u1EE9c kh\xF4ng th\u1EC3 g\xE1n");
    }
    get(name) {
      if (name === "true") return true;
      if (name === "false") return false;
      if (name === "nullptr") return null;
      if (/^TB[12][AB]$/.test(name)) return 1 << ["TB1A", "TB1B", "TB2A", "TB2B"].indexOf(name);
      if (name === "HIGH") return 1;
      if (name === "LOW") return 0;
      if (/^led[OABCDEF]$/.test(name)) return "OABCDEF".indexOf(name[3]);
      if (name === "NAN") return NaN;
      if (/^ir[0123][LR]$/.test(name)) return Number(name[2]);
      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return isRef(this.scopes[i].get(name)) && this.scopes[i].get(name).alias ? this.scopes[i].get(name).read() : this.scopes[i].get(name);
      throw new Error(`Bi\u1EBFn ch\u01B0a khai b\xE1o: ${name}`);
    }
    set(name, value) {
      for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) {
        const old = this.scopes[i].get(name);
        if (isRef(old) && old.alias) old.write(value);
        else this.scopes[i].set(name, copyValue(value));
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
        case "member": {
          if (callName(n).startsWith("CRGB.")) return { Red: [255, 0, 0], Green: [0, 128, 0], Lime: [0, 255, 0], Blue: [0, 0, 255], Yellow: [255, 255, 0], Purple: [128, 0, 128], Black: [0, 0, 0], White: [255, 255, 255] }[n.name] ?? [0, 0, 0];
          return (yield* this.location(n)).read();
        }
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
          return /\b(int|long|short|u?int\d+_t|byte)\b/.test(n.type) ? Math.trunc(Number(v)) : Number(v);
        }
        case "ternary":
          return yield* this.expr((yield* this.expr(n.condition)) ? n.yes : n.no);
        case "unary": {
          if (n.op === "&") return yield* this.location(n.value);
          const v = yield* this.expr(n.value);
          if (n.op === "*") {
            if (!isRef(v)) throw new Error("Con tr\u1ECF kh\xF4ng h\u1EE3p l\u1EC7");
            return v.read();
          }
          if (n.op === "~") return ~Number(v);
          if (n.op === "!") return !v;
          if (n.op === "-") return -Number(v);
          if (n.op === "+") return Number(v);
          const result = Number(v) + (n.op === "++" ? 1 : -1);
          (yield* this.location(n.value)).write(result);
          return result;
        }
        case "post": {
          const v = yield* this.expr(n.value);
          (yield* this.location(n.value)).write(Number(v) + (n.op === "++" ? 1 : -1));
          return v;
        }
        case "binary": {
          const loc = assignments.has(n.op) ? yield* this.location(n.left) : null;
          const a = n.op === "=" ? 0 : yield* this.expr(n.left);
          if (n.op === "&&" && !a) return false;
          if (n.op === "||" && a) return true;
          const b = yield* this.expr(n.right);
          const x = Number(a), y = Number(b);
          switch (n.op) {
            case "=":
              loc.write(b);
              return b;
            case "+=":
              loc.write(x + y);
              return x + y;
            case "-=":
              loc.write(x - y);
              return x - y;
            case "*=":
              loc.write(x * y);
              return x * y;
            case "/=":
              loc.write(x / y);
              return x / y;
            case "&=":
              loc.write(x & y);
              return x & y;
            case "|=":
              loc.write(x | y);
              return x | y;
            case "%=":
              loc.write(x % y);
              return x % y;
            case "&":
              return x & y;
            case "|":
              return x | y;
            case "^":
              return x ^ y;
            case "<<":
              return x << y;
            case ">>":
              return x >> y;
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
          const name = callName(n.callee);
          const fn = this.findFunction(name, n.args.length);
          const args = [];
          for (let i = 0; i < n.args.length; i++) args.push(fn?.params[i]?.type.includes("&") || name === "APDS.readColor" ? yield* this.location(n.args[i]) : yield* this.expr(n.args[i]));
          if (n.callee.k === "member" && !/^(Leanbot|Lb|APDS|Serial|CRGB)/.test(name)) {
            const obj = yield* this.expr(n.callee.value);
            const method = n.callee.name;
            if (typeof obj === "string") {
              if (method === "length") return obj.length;
              if (method === "c_str") return obj;
              if (method === "trim" || method === "toUpperCase") {
                (yield* this.location(n.callee.value)).write(method === "trim" ? obj.trim() : obj.toUpperCase());
                return null;
              }
            }
            if (obj && typeof obj === "object" && "attribute" in obj) {
              const attr = String(obj.attribute), key = JSON.stringify([this.assetId, attr]);
              if (method === "read") return this.host.iotRead?.(attr, this.assetId) ?? this.iot.get(key) ?? "waiting";
              if (method === "write") {
                this.iot.set(key, String(args[0]));
                this.host.iotWrite?.(attr, String(args[0]), this.assetId);
                return null;
              }
            }
          }
          return yield* this.call(name, args);
        }
      }
      throw new Error(`Bi\u1EC3u th\u1EE9c ch\u01B0a h\u1ED7 tr\u1EE3: ${n.k}`);
    }
    motors(left, right) {
      this.left = Math.max(-65, Math.min(65, left));
      this.right = Math.max(-65, Math.min(65, right));
      this.host.motors(this.left, this.right);
    }
    findFunction(name, count) {
      return this.functions.get(name)?.find((fn) => count <= fn.params.length && fn.params.slice(count).every((p) => p.value !== null));
    }
    *call(name, args) {
      const nums = args.map(Number), [a = 0, b = 0, c = 0] = nums;
      const fn = this.findFunction(name, args.length);
      if (fn) {
        if (this.scopes.length > 64) throw new Error("H\xE0m g\u1ECDi l\u1ED3ng nhau qu\xE1 s\xE2u");
        const scope = /* @__PURE__ */ new Map();
        for (let i = 0; i < fn.params.length; i++) {
          const p = fn.params[i];
          scope.set(p.name, i < args.length ? p.type.includes("&") ? { ...args[i], alias: true } : p.type.includes("*") ? args[i] : copyValue(args[i]) : yield* this.expr(p.value));
        }
        this.scopes.push(scope);
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
        case "LbIRLine.setThreshold":
          this.thresholds = nums;
          return null;
        case "LbIRLine.read":
          const raw = this.host.rawLine?.();
          this.cachedLineMask = raw ? raw.reduce((mask, v, i) => mask | (v >= this.thresholds[i] ? 1 << 3 - i : 0), 0) : (this.host.lineMask?.() ?? 0) & 15;
          return this.cachedLineMask;
        case "F":
          return args[0];
        case "CRGB":
          return nums;
        case "BITMAP":
          return nums.reduce((mask, index) => mask | 1 << index, 0);
        case "LbTouch.read":
          return this.host.touch?.(a) ? 1 : 0;
        case "LbIoT.Asset.attribute":
          return { attribute: String(args[0]) };
        case "LbIoT.Asset.begin":
          this.assetId = String(args[0]);
          return null;
        case "LbIoT.Wifi.begin":
          this.host.log?.("IoT gi\u1EA3 l\u1EADp: d\xF9ng thu\u1ED9c t\xEDnh c\u1EE5c b\u1ED9, kh\xF4ng k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 th\u1EADt.");
          return null;
        case "APDS.begin":
          return !!this.host.color;
        case "APDS.colorAvailable":
          return !!this.host.color?.();
        case "APDS.readColor": {
          const sample = this.host.color?.();
          if (!sample) return false;
          args.forEach((v, i) => {
            if (isRef(v)) v.write(sample[i]);
          });
          return true;
        }
        case "LbIRArray.read": {
          const index = [2, 0, 1, 3].indexOf(a);
          return this.host.rawLine?.()[index] ?? ((this.host.lineMask?.() ?? 0) & 1 << 3 - index ? 4095 : 0);
        }
        case "LbIRLine.isBlackDetected":
          return this.cachedLineMask !== 0;
        case "LbIRLine.doManualCalibration":
          this.host.log?.("Line gi\u1EA3 l\u1EADp d\xF9ng c\u1EA3m bi\u1EBFn l\xFD t\u01B0\u1EDFng theo h\xECnh h\u1ECDc sa b\xE0n; hi\u1EC7u chu\u1EA9n n\xFAt ch\u1EA1m c\u1EA7n robot th\u1EADt.");
          return null;
        case "LbIRLine.displayOnRGB":
          this.rgb = [3, 2, 1, 0].flatMap((bit) => this.cachedLineMask & 1 << bit ? args[0] : [0, 0, 0]);
          return null;
        case "LbRGB.getBrightness":
          return this.brightness;
        case "LbRGB.setBrightness":
          this.brightness = a;
          return null;
        case "LbRGB.fillColor":
          this.rgb = [...args[0]];
          return null;
        case "LbRGB.show":
          this.host.led?.(this.rgb, this.brightness);
          return null;
        case "LbIRLine.value":
          return this.cachedLineMask;
        case "Leanbot.begin":
        case "Serial.begin":
          return null;
        case "LbMission.begin":
          if (this.missionStarted) {
            this.motors(0, 0);
            yield { end: true };
            return null;
          }
          this.missionStarted = true;
          return null;
        case "LbMission.end":
          this.motors(0, 0);
          yield { end: true };
          return null;
        case "LbMotion.runLR":
          this.motors(Math.max(-2e3, Math.min(2e3, a)) * 65 / 2e3, Math.max(-2e3, Math.min(2e3, b)) * 65 / 2e3);
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
          yield { ms: speed ? Math.abs(a) * this.distanceScale / speed * 1e3 : 0 };
          return null;
        }
        case "LbMotion.waitRotationDeg": {
          const speed = Math.abs((this.left - this.right) / LEANBOT_GEOMETRY.wheelBase * 180 / Math.PI);
          if (!speed && a) throw new Error("Kh\xF4ng th\u1EC3 ch\u1EDD g\xF3c quay khi hai b\xE1nh ch\u1EA1y c\xF9ng t\u1ED1c \u0111\u1ED9");
          yield { ms: speed ? Math.abs(a) / speed * 1e3 : 0 };
          return null;
        }
        case "isnan":
          return Number.isNaN(a);
        case "isfinite":
          return Number.isFinite(a);
        case "sqrtf":
        case "sqrt":
          return Math.sqrt(a);
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
          this.serial += String(args[0] ?? "");
          if (name === "Serial.println") {
            this.host.log?.(this.serial);
            this.serial = "";
          }
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
        case "LbGripper.moveToLR": {
          const lr = name.endsWith("LR"), duration = lr ? c : b;
          if (!Number.isFinite(duration) || duration < 0) throw new Error("Th\u1EDDi gian \u0111\xF3ng/m\u1EDF tay g\u1EAFp kh\xF4ng h\u1EE3p l\u1EC7");
          this.host.gripper?.(a, lr ? b : a, duration);
          if (duration > 0) yield { ms: duration };
          return null;
        }
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
        case "prototype":
        case "empty":
          return;
        case "declarations":
          for (const item of n.body) yield* this.statement(item);
          return;
        case "enum": {
          let value = 0;
          for (const entry of n.entries) {
            if (entry.value) value = Number(yield* this.expr(entry.value));
            this.scopes[0].set(entry.name, value++);
          }
          return;
        }
        case "declare": {
          const structType = [...this.structs.keys()].find((t) => n.type.split(/\s+/).includes(t));
          let v = n.value ? yield* this.expr(n.value) : structType ? Object.fromEntries(this.structs.get(structType).map((f) => [f.name, 0])) : 0;
          if (structType && Array.isArray(v)) {
            const initial = v;
            v = Object.fromEntries(this.structs.get(structType).map((f, i) => [f.name, initial[i] ?? 0]));
          }
          const sizes = [];
          for (const dim of n.dimensions) sizes.push(Number(yield* this.expr(dim)));
          const slots = sizes.reduce((total, size, i) => total * (size || (i === 0 && Array.isArray(v) ? v.length : 0)), 1);
          if (sizes.some((size) => !Number.isSafeInteger(size) || size < 0) || slots > 65536) throw new Error("M\u1EA3ng v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n 65536 ph\u1EA7n t\u1EED c\u1EE7a gi\u1EA3 l\u1EADp");
          const fill = (depth, initial) => depth >= sizes.length ? initial ?? 0 : Array.from({ length: sizes[depth] || (Array.isArray(initial) ? initial.length : 0) }, (_, i) => fill(depth + 1, Array.isArray(initial) ? initial[i] : 0));
          if (sizes.length) v = fill(0, v);
          if (/\b(int|long|short|u?int\d+_t|byte)\b/.test(n.type) && !Array.isArray(v)) v = Math.trunc(Number(v));
          this.scopes.at(-1).set(n.name, copyValue(v));
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
        const missionWasStarted = this.missionStarted;
        yield* this.call("loop", []);
        if (!missionWasStarted && this.missionStarted) {
          this.motors(0, 0);
          return;
        }
        yield { ms: 1 };
      }
    }
    start() {
      this.missionStarted = false;
      this.cachedLineMask = 0;
      this.thresholds = [69, 78, 106, 70];
      this.serial = "";
      this.iot.clear();
      this.brightness = 255;
      this.rgb = [0, 0, 0];
      this.assetId = "";
      this.host.led?.(this.rgb, this.brightness);
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
            this.distance += (this.left + this.right) / 2 * dt / 1e3 / this.distanceScale;
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
