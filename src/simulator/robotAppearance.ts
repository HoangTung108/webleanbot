/** Photo-inspired top view. Local +X is the gripper/front, units are mm. */
export const LEANBOT_APPEARANCE = {
  length: 128,
  width: 86,
  collisionRadius: 75,
  wheelBase: 75,
} as const;

export function drawLeanbot(ctx: CanvasRenderingContext2D, leftGrip = 0, rightGrip = 0): void {
  ctx.save();
  ctx.lineJoin = 'round';
  // Black rubber tyres, centred on the differential-drive axle.
  for (const side of [-1, 1]) {
    const y = side * 37.5;
    ctx.fillStyle = '#111916';
    ctx.fillRect(-10, y - 5.5, 20, 11);
    ctx.strokeStyle = '#344238'; ctx.lineWidth = 1.4;
    for (let x = -8; x <= 8; x += 4) {
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 1, y + 5); ctx.stroke();
    }
    ctx.fillStyle = '#d3d5c4'; ctx.fillRect(-7, side < 0 ? -32 : 23, 14, 9);
    ctx.fillStyle = '#e2b52d'; ctx.fillRect(-4, side < 0 ? -27 : 23, 8, 4);
  }
  // The long red PCB extends behind the wheels, like the reference Leanbot.
  ctx.fillStyle = '#d71924'; ctx.strokeStyle = '#961520'; ctx.lineWidth = 0.8;
  ctx.fillRect(-66, -23, 92, 46); ctx.strokeRect(-66, -23, 92, 46);
  ctx.fillStyle = '#f52f35'; ctx.fillRect(-64, -21, 87, 1);
  // Exposed solder pads on the rear of the PCB.
  ctx.fillStyle = '#ead7a0';
  for (let x = -62; x < -3; x += 3) for (const y of [-20, 20]) ctx.fillRect(x, y, 1, 1);
  // Rear blue expansion board and Nano controller, with gold pin headers.
  ctx.fillStyle = '#164d77'; ctx.fillRect(-65, -12, 12, 24);
  ctx.fillStyle = '#e2b126'; ctx.fillRect(-54, -14, 44, 28);
  ctx.fillStyle = '#143d68'; ctx.fillRect(-53, -13, 42, 26);
  ctx.fillStyle = '#0c172a'; ctx.fillRect(-38, -7, 14, 14);
  ctx.strokeStyle = '#b7c7c4'; ctx.lineWidth = 0.6;
  for (let x = -49; x <= -15; x += 3) {
    ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(x, -9); ctx.moveTo(x, 9); ctx.lineTo(x, 12); ctx.stroke();
  }
  ctx.fillStyle = '#b6c0ba'; ctx.fillRect(-19, -5, 7, 10);
  ctx.fillStyle = '#f5e8d1'; ctx.fillRect(-47, -3, 5, 6);
  // White plugs, screw holes and silkscreen details on the red main board.
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#f4f0d7'; ctx.fillRect(1, side < 0 ? -20 : 12, 9, 8);
    ctx.strokeStyle = '#f8da38'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-45, side * 22, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(14, side * 22, 4, 0, Math.PI * 2); ctx.stroke();
    // Servo casing with an orange/blue wire harness.
    ctx.fillStyle = '#1152aa'; ctx.fillRect(27, side * 25 - 5, 16, 10);
    ctx.fillStyle = '#2f80ce'; ctx.fillRect(29, side * 25 - 4, 8, 8);
    for (const [colour, offset] of [['#f5b92c', 0], ['#f07122', 2], ['#243d98', 4]] as const) {
      ctx.strokeStyle = colour; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(5, side * (17 + offset)); ctx.lineTo(17, side * (28 + offset)); ctx.lineTo(31, side * 25); ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff2e0'; ctx.font = 'bold 4px sans-serif'; ctx.fillText('LEANBOT', -44, 19);
  // Two silver ultrasonic transducers on the front sensor bracket.
  ctx.fillStyle = '#a1bdb3'; ctx.fillRect(14, -22, 17, 44);
  for (const y of [-13, 13]) {
    ctx.fillStyle = '#dce6dd'; ctx.fillRect(17, y - 7, 13, 14);
    ctx.fillStyle = '#718b87'; ctx.beginPath(); ctx.arc(28, y, 6.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#273e3f'; ctx.beginPath(); ctx.arc(29, y, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8e3dc'; ctx.fillRect(17, y - 6, 2, 12);
  }
  ctx.fillStyle = '#b90f20'; ctx.fillRect(30, -21, 2, 42);
  // Beige fork-shaped gripper fingers. Angles from C++ visibly open/close them.
  for (const [side, degrees] of [[-1, leftGrip], [1, rightGrip]]) {
    const close = Math.max(0, Math.min(90, degrees)) / 90;
    ctx.save(); ctx.translate(39, side * 25); ctx.scale(1, side); ctx.rotate(0.2 - close * 0.85);
    ctx.fillStyle = '#dfc293'; ctx.strokeStyle = '#ad946e'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -4); ctx.lineTo(17, -4); ctx.lineTo(22, 1); ctx.lineTo(20, 5);
    ctx.lineTo(10, 1); ctx.lineTo(14, 11); ctx.lineTo(10, 13); ctx.lineTo(1, 3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9e0dd'; ctx.beginPath(); ctx.arc(1, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
