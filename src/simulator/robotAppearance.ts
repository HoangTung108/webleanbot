/** Video-referenced plan view. All geometry is in real millimetres. */
import { gripperJaw, LEANBOT_GEOMETRY } from './robotGeometry';
export const LEANBOT_APPEARANCE = LEANBOT_GEOMETRY;

export function drawLeanbot(ctx: CanvasRenderingContext2D, leftGrip = 0, rightGrip = 0): void {
  ctx.save(); ctx.lineJoin='round';ctx.lineCap='round';
  // Lower red chassis and dark gap below the raised circuit board.
  ctx.fillStyle='rgba(17,24,30,.18)';ctx.fillRect(-90,-34,134,70);
  ctx.fillStyle='#8b1525';ctx.fillRect(-92,-35,132,70);
  ctx.fillStyle='#bc2030';ctx.fillRect(-92,-35,132,4);ctx.fillRect(-92,31,132,4);
  ctx.fillStyle='#202b30';ctx.fillRect(-87,-29,118,58);
  // Differential-drive tyres, motor gearboxes, and pale hubs.
  for(const side of [-1,1] as const) {
    const y=side*LEANBOT_GEOMETRY.wheelBase/2;
    ctx.fillStyle='#d2d8cd';ctx.fillRect(-14,side<0?-43:31,28,12);
    ctx.strokeStyle='#8b9891';ctx.lineWidth=.8;ctx.strokeRect(-14,side<0?-43:31,28,12);
    ctx.fillStyle='#162322';ctx.fillRect(-16.25,y-10,32.5,20);
    ctx.fillStyle='#283733';ctx.fillRect(-15,y-8,30,2);ctx.fillRect(-15,y+6,30,2);
    ctx.strokeStyle='#45524a';ctx.lineWidth=1.8;
    for(let x=-13;x<=13;x+=4.5){ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+2,y-3);ctx.moveTo(x,y+3);ctx.lineTo(x+2,y+9);ctx.stroke();}
    ctx.fillStyle='#b6c0b2';ctx.fillRect(-8,y-4,16,8);
    ctx.fillStyle='#7d8d83';ctx.fillRect(-3,y-3,6,6);
  }
  // Upper red PCB: longer rear deck, front sensor deck and four brass standoffs.
  ctx.fillStyle='#e02738';ctx.fillRect(-92,-31,130,62);
  ctx.strokeStyle='#aa1d2c';ctx.lineWidth=1;ctx.strokeRect(-92,-31,130,62);
  ctx.fillStyle='#f46b65';ctx.fillRect(-90,-30,126,1);
  ctx.strokeStyle='#f1a0a0';ctx.lineWidth=.35;
  for(let i=0;i<9;i++){const y=-23+i*5.7;ctx.beginPath();ctx.moveTo(-81,y);ctx.lineTo(-9,y);ctx.lineTo(5,y*.7);ctx.stroke();}
  for(const x of [-75,23])for(const y of [-27,27]) {
    ctx.fillStyle='#e1ba4a';ctx.beginPath();ctx.arc(x,y,4.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8d2030';ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e0d6ba';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-1,y);ctx.lineTo(x+1,y);ctx.stroke();
  }
  // Raised Nano module: black sockets, blue board, pins, chip and USB connector.
  ctx.fillStyle='#20232b';ctx.fillRect(-76,-14,61,28);
  ctx.fillStyle='#174d6b';ctx.fillRect(-73,-10,55,20);
  for(let x=-70;x<-20;x+=3.2)for(const y of [-11,10]){ctx.fillStyle='#d5b66e';ctx.fillRect(x,y,1.1,2);}
  ctx.fillStyle='#14242d';ctx.fillRect(-55,-7,14,14);
  ctx.strokeStyle='#8ca6aa';ctx.lineWidth=.6;
  for(let v=-5;v<=5;v+=2){ctx.beginPath();ctx.moveTo(-57,v);ctx.lineTo(-55,v);ctx.moveTo(-41,v);ctx.lineTo(-39,v);ctx.stroke();}
  ctx.fillStyle='#c6cdd0';ctx.fillRect(-26,-6,10,12);
  ctx.fillStyle='#647983';ctx.fillRect(-22,-4,6,8);
  ctx.fillStyle='#c0bfa3';ctx.fillRect(-67,-3,5,6);
  ctx.fillStyle='#87b6ae';for(let x=-68;x<-28;x+=8)ctx.fillRect(x,6,3,1);
  ctx.fillStyle='#f3efe4';ctx.font='bold 4.2px sans-serif';ctx.fillText('NANO',-65,-5);
  // White plugs and the looms running to each drive motor / front servo.
  for(const side of [-1,1] as const) {
    ctx.fillStyle='#eee8d5';ctx.fillRect(-4,side<0?-25:16,13,9);
    ctx.fillStyle='#968e7b';for(let x=-2;x<7;x+=3)ctx.fillRect(x,side<0?-24:17,1,6);
    for(const [colour,offset] of [['#e9b22d',0],['#d64b2e',2.4],['#35466a',4.8]] as const){
      ctx.strokeStyle=colour;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(1,side*21);ctx.bezierCurveTo(-8,side*(39+offset),19,side*(47+offset),33,side*34);ctx.stroke();
    }
    // Front red bracket and transparent-blue SG90-style servo case.
    ctx.fillStyle='#b91d2d';ctx.fillRect(34,side*35-11,28,22);
    ctx.fillStyle='#164790';ctx.fillRect(37,side*35-9,22,18);
    ctx.fillStyle='#2d77b4';ctx.fillRect(39,side*35-8,13,16);
    ctx.strokeStyle='#8cb4d6';ctx.lineWidth=.7;ctx.strokeRect(37,side*35-9,22,18);
    ctx.fillStyle='#a7c7db';ctx.fillRect(40,side*35-6,3,12);
    ctx.fillStyle='#df629b';ctx.fillRect(54,side*35-10,3,4);
    ctx.fillStyle='#ece9d6';ctx.beginPath();ctx.arc(53,side*35,4,0,Math.PI*2);ctx.fill();
  }
  // Green sonar PCB with two horizontal silver barrels facing the gripper.
  ctx.fillStyle='#397f6e';ctx.fillRect(19,-27,25,54);
  ctx.strokeStyle='#bdd0be';ctx.lineWidth=.8;ctx.strokeRect(19,-27,25,54);
  for(const y of [-15,15]) {
    ctx.fillStyle='#7c9794';ctx.fillRect(25,y-9,19,18);
    ctx.fillStyle='#cedbd6';ctx.fillRect(27,y-8,15,16);
    ctx.fillStyle='#f0f2e9';ctx.fillRect(28,y-7,4,14);
    ctx.fillStyle='#263d40';ctx.beginPath();ctx.ellipse(43,y,3,8,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d5e2d9';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.fillStyle='#f4e9c8';ctx.fillRect(22,-4,9,8);
  // Pale fork jaws: each servo rotates its own mirrored polygon.
  for(const [side,degrees] of [[-1,leftGrip],[1,rightGrip]] as const) {
    const jaw=gripperJaw(side,degrees);
    ctx.fillStyle='#eee0c3';ctx.strokeStyle='#b9a886';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(jaw[0].x,jaw[0].y);for(const p of jaw.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#dce1dc';ctx.beginPath();ctx.arc(53,side*35,2.4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#657d86';ctx.beginPath();ctx.arc(53,side*35,1,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#f9e6d6';ctx.font='bold 5px sans-serif';ctx.fillText('LEANBOT',-59,24);
  ctx.restore();
}
