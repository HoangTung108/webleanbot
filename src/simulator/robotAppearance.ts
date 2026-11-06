/** Photo-inspired top view. Local +X is the gripper/front, units are mm. */
export const LEANBOT_APPEARANCE = {
  length: 210,    // Increased from 128mm to better match real robot ~210mm
  width: 120,     // Increased from 86mm to better match real robot ~120mm
  collisionRadius: 100,  // Increased from 75mm for larger robot
  wheelBase: 100, // Increased from 75mm to match new width
} as const;

export function drawLeanbot(ctx: CanvasRenderingContext2D, leftGrip = 0, rightGrip = 0): void {
  ctx.save();
  ctx.lineJoin = 'round';
  
  // Scale factor to adjust drawing for new robot size (210x120 from 128x86)
  const scale = 1.4; // Approximate scale for width adjustment
  
  // Black rubber tyres, centred on the differential-drive axle.
  for (const side of [-1, 1]) {
    const y = side * 50; // wheelBase/2 = 100/2 = 50
    ctx.fillStyle = '#111916';
    ctx.fillRect(-14, y - 8, 28, 16);
    ctx.strokeStyle = '#344238'; ctx.lineWidth = 2;
    for (let x = -11; x <= 11; x += 5) {
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 1, y + 7); ctx.stroke();
    }
    ctx.fillStyle = '#d3d5c4'; ctx.fillRect(-10, side < 0 ? -45 : 32, 20, 13);
    ctx.fillStyle = '#e2b52d'; ctx.fillRect(-6, side < 0 ? -39 : 32, 12, 6);
  }
  
  // The long red PCB extends behind the wheels
  ctx.fillStyle = '#d71924'; ctx.strokeStyle = '#961520'; ctx.lineWidth = 1.2;
  ctx.fillRect(-92, -32, 130, 64); ctx.strokeRect(-92, -32, 130, 64);
  ctx.fillStyle = '#f52f35'; ctx.fillRect(-89, -30, 122, 1.5);
  
  // Exposed solder pads on the rear of the PCB.
  ctx.fillStyle = '#ead7a0';
  for (let x = -87; x < -10; x += 4) for (const y of [-28, 28]) ctx.fillRect(x, y, 1.5, 1.5);
  
  // Rear blue expansion board and Nano controller, with gold pin headers.
  ctx.fillStyle = '#164d77'; ctx.fillRect(-91, -17, 17, 34);
  ctx.fillStyle = '#e2b126'; ctx.fillRect(-75, -20, 62, 40);
  ctx.fillStyle = '#143d68'; ctx.fillRect(-74, -18, 59, 36);
  ctx.fillStyle = '#0c172a'; ctx.fillRect(-53, -10, 20, 20);
  ctx.strokeStyle = '#b7c7c4'; ctx.lineWidth = 0.8;
  for (let x = -70; x <= -20; x += 4) {
    ctx.beginPath(); ctx.moveTo(x, -17); ctx.lineTo(x, -13); ctx.moveTo(x, 13); ctx.lineTo(x, 17); ctx.stroke();
  }
  ctx.fillStyle = '#b6c0ba'; ctx.fillRect(-26, -7, 10, 14);
  ctx.fillStyle = '#f5e8d1'; ctx.fillRect(-66, -4, 7, 8);
  
  // White plugs, screw holes and silkscreen details on the red main board.
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#f4f0d7'; ctx.fillRect(2, side < 0 ? -28 : 17, 13, 11);
    ctx.strokeStyle = '#f8da38'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-63, side * 31, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(20, side * 31, 6, 0, Math.PI * 2); ctx.stroke();
    
    // Servo casing with an orange/blue wire harness.
    ctx.fillStyle = '#1152aa'; ctx.fillRect(38, side * 35 - 7, 22, 14);
    ctx.fillStyle = '#2f80ce'; ctx.fillRect(41, side * 35 - 6, 11, 12);
    for (const [colour, offset] of [['#f5b92c', 0], ['#f07122', 3], ['#243d98', 6]] as const) {
      ctx.strokeStyle = colour; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(7, side * (24 + offset)); ctx.lineTo(24, side * (39 + offset)); ctx.lineTo(43, side * 35); ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff2e0'; ctx.font = 'bold 6px sans-serif'; ctx.fillText('LEANBOT', -62, 27);
  
  // Two silver ultrasonic transducers on the front sensor bracket.
  ctx.fillStyle = '#a1bdb3'; ctx.fillRect(20, -31, 24, 62);
  for (const y of [-18, 18]) {
    ctx.fillStyle = '#dce6dd'; ctx.fillRect(24, y - 10, 18, 20);
    ctx.fillStyle = '#718b87'; ctx.beginPath(); ctx.arc(39, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#273e3f'; ctx.beginPath(); ctx.arc(41, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8e3dc'; ctx.fillRect(24, y - 8, 3, 16);
  }
  ctx.fillStyle = '#b90f20'; ctx.fillRect(42, -30, 3, 60);
  
  // Beige fork-shaped gripper fingers. Angles from C++ visibly open/close them.
  for (const [side, degrees] of [[-1, leftGrip], [1, rightGrip]]) {
    const close = Math.max(0, Math.min(90, degrees)) / 90;
    ctx.save(); ctx.translate(55, side * 35); ctx.scale(1, side); ctx.rotate(0.2 - close * 0.85);
    ctx.fillStyle = '#dfc293'; ctx.strokeStyle = '#ad946e'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(24, -6); ctx.lineTo(31, 1); ctx.lineTo(28, 7);
    ctx.lineTo(14, 1); ctx.lineTo(20, 15); ctx.lineTo(14, 18); ctx.lineTo(2, 4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9e0dd'; ctx.beginPath(); ctx.arc(1, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
