/**
 * Robot Color Signal Protocol
 * Used for exchanging color signals between real robots over WebSocket and Serial.
 */

export const ROBOT_COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE', 'UNKNOWN', 'WAITING'] as const;
export type RobotColor = (typeof ROBOT_COLORS)[number];

export const OBJECT_COLOR_MAP: Record<number, RobotColor> = {
  0: 'UNKNOWN',
  1: 'RED',
  2: 'GREEN',
  3: 'BLUE',
  4: 'YELLOW',
  5: 'PURPLE',
};

export const COLOR_TO_OBJECT_CODE: Record<RobotColor, number> = {
  UNKNOWN: 0,
  RED: 1,
  GREEN: 2,
  BLUE: 3,
  YELLOW: 4,
  PURPLE: 5,
  WAITING: 0,
};

export const COLOR_HEX_MAP: Record<RobotColor, string> = {
  RED: '#ef4444',
  GREEN: '#22c55e',
  BLUE: '#3b82f6',
  YELLOW: '#eab308',
  PURPLE: '#a855f7',
  UNKNOWN: '#9ca3af',
  WAITING: '#6b7280',
};

export interface ColorSignalMessage {
  type: 'color-signal';
  color: RobotColor;
  peerId?: string;
  senderRobotId?: string;
  timestamp: number;
}

export interface ColorExchangeEntry {
  id: string;
  direction: 'in' | 'out';
  source: 'serial' | 'websocket' | 'manual';
  color: RobotColor;
  timestamp: number;
  peerId?: string;
  senderRobotId?: string;
}

/**
 * Normalizes input to a valid RobotColor or null if invalid.
 */
export function normalizeRobotColor(value: unknown): RobotColor | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return OBJECT_COLOR_MAP[value] ?? null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toUpperCase();
    if (trimmed === 'WAIT' || trimmed === 'WAITING') return 'WAITING';
    if (trimmed === 'RED' || trimmed === '1') return 'RED';
    if (trimmed === 'GREEN' || trimmed === '2') return 'GREEN';
    if (trimmed === 'BLUE' || trimmed === '3') return 'BLUE';
    if (trimmed === 'YELLOW' || trimmed === '4') return 'YELLOW';
    if (trimmed === 'PURPLE' || trimmed === '5') return 'PURPLE';
    if (trimmed === 'UNKNOWN' || trimmed === '0') return 'UNKNOWN';
  }
  return null;
}

export function isValidRobotColor(value: unknown): value is RobotColor {
  return normalizeRobotColor(value) !== null;
}

/**
 * Parses a line from Serial to extract color signal.
 * Matches:
 *   COLOR:RED
 *   [COLOR]: RED
 *   [COLOR] RED
 *   IOT:Color=Red
 *   IOT_COLOR:RED
 */
export function parseSerialColorSignal(line: string): RobotColor | null {
  if (typeof line !== 'string') return null;
  const match = line.match(/(?:\[COLOR\]|COLOR|IOT:Color|IOT_COLOR)\s*[:=\s]\s*([A-Za-z0-9_]+)/i);
  if (match) {
    return normalizeRobotColor(match[1]);
  }
  return null;
}

/**
 * Formats a color signal into standard Serial string to send to real robot.
 */
export function formatSerialColorCommand(color: RobotColor): string {
  return `COLOR:${color}\n`;
}

