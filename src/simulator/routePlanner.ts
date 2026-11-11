import baseCode from '../../docs/baseCode.cpp?raw';
import type { Pose } from './types';

export type RouteStep = { kind: 'move'; x: number; y: number; follow: boolean; heading?: number } | { kind: 'turn'; angle: number } | { kind: 'grab' | 'release' };
export const normalizeTurn = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;
export function routePoses(start: Pose, steps: RouteStep[]): Pose[] {
  const poses = [{ ...start }];
  for (const step of steps) {
    const previous = poses[poses.length - 1];
    poses.push(step.kind === 'move' ? { x: step.x, y: step.y, heading: step.heading ?? (Math.hypot(step.y - previous.y, step.x - previous.x) < 0.001 ? previous.heading : Math.atan2(step.y - previous.y, step.x - previous.x) * 180 / Math.PI) } :
      { ...previous, heading: previous.heading + (step.kind === 'turn' ? step.angle : 0) });
  }
  return poses;
}

// Keep the motion and line-following implementations from the user's base file.
// Exclude hardware WiFi helpers and unrelated mission/color routines.
export function generateRouteCode(start: Pose, steps: RouteStep[]): string {
  if (![start.x, start.y, start.heading].every(Number.isFinite)) throw new Error('Vị trí xuất phát không hợp lệ');
  const motionStart = baseCode.indexOf('const float DISTANCE_SCALE');
  const motionEnd = baseCode.indexOf('// BEGIN WIFI HELPERS', motionStart);
  const lineStart = baseCode.indexOf('void Forward(', motionEnd);
  const lineEnd = baseCode.indexOf('enum ObjectColor');
  if (motionStart < 0 || motionEnd < motionStart || lineStart < 0 || lineEnd < lineStart) throw new Error('Cấu trúc baseCode.cpp đã thay đổi');
  const helpers = (baseCode.slice(motionStart, motionEnd) + baseCode.slice(lineStart, lineEnd))
    .replace(/ERR_NONE = 0/, 'ERR_NONE')
    .replaceAll('unsigned long started = millis(), lastAdvance = started, lastRamp = started;', 'unsigned long started = millis(); unsigned long lastAdvance = started; unsigned long lastRamp = started;')
    .replace('int previousL = 32767, previousR = 32767;', 'int previousL = 32767; int previousR = 32767;')
    .replace('int clearFrames = 0, crossingFrames = 0;', 'int clearFrames = 0; int crossingFrames = 0;')
    .replaceAll('runFollowLine()', 'runFollowLineCurrent()')
    .replace('  LbRGB.fillColor(CRGB::Red);', '')
    .replace('F("MISSION ERROR: ")', '"MISSION ERROR: "')
    .replace(/#if BOARD_MODE != BOARD_PRIMARY[\s\S]*?#endif/, '');
  const commands = generateRouteCommands(start, steps);
  return `// Sinh từ lộ trình. Đặt robot tại x=${start.x.toFixed(1)}, y=${start.y.toFixed(1)} mm, góc ${start.heading.toFixed(1)} độ.
#include <Leanbot.h>
#include <math.h>
#include <string.h>
${helpers}
void plannedRoute() {
${commands.split('\n').filter(Boolean).map(line => `  ${line}`).join('\n')}
}
void setup() {
  Leanbot.begin();
  LbIRLine.setThreshold(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R);
}
void loop() {
  LbMission.begin(TB1A + TB1B);
  missionError = ERR_NONE;
  junctionPending = false;
  resetMotionState();
  open_hand();
  plannedRoute();
  LbMotion.stopAndWait();
  LbMission.end();
}
`;
}

export function generateRouteCommands(start: Pose, steps: RouteStep[]): string {
  const poses = routePoses(start, steps);
  const lines: string[] = [];
  steps.forEach((step, i) => {
    if (step.kind === 'move') {
      const a = poses[i], b = poses[i + 1];
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (!Number.isFinite(distance) || distance > 12000) throw new Error('Khoảng cách không hợp lệ');
      const travelHeading = distance < 0.001 ? a.heading : Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const turn = normalizeTurn(travelHeading - a.heading);
      if (Math.abs(turn) >= 0.8) lines.push(`  turn_two_wheels(2000, ${turn.toFixed(2)});`);
      lines.push(step.follow ? `  followLineDistance(${Math.round(distance)});` : `  move_tank(2000, 2000, ${(distance / 10).toFixed(3)});`);
      if (step.heading !== undefined) {
        if (!Number.isFinite(step.heading)) throw new Error('Góc tại điểm không hợp lệ');
        const arrivalTurn = normalizeTurn(step.heading - travelHeading);
        if (Math.abs(arrivalTurn) >= 0.8) lines.push(`  turn_two_wheels(2000, ${arrivalTurn.toFixed(2)});`);
      }
    } else if (step.kind === 'turn') {
      if (!Number.isFinite(step.angle)) throw new Error('Góc không hợp lệ');
      lines.push(`  turn_two_wheels(2000, ${step.angle.toFixed(2)});`);
    } else lines.push(step.kind === 'grab' ? '  close_hand(90);' : '  open_hand();');

  });
  return lines.map(line => line.trim()).join('\n');
}
