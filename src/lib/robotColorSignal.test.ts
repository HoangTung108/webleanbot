import { describe, expect, it } from 'vitest'
import {
  normalizeRobotColor,
  isValidRobotColor,
  parseSerialColorSignal,
  formatSerialColorCommand,
  COLOR_HEX_MAP,
  COLOR_TO_OBJECT_CODE,
  OBJECT_COLOR_MAP,
} from './robotColorSignal'

describe('robotColorSignal', () => {
  it('normalizes colors from various string and number formats', () => {
    expect(normalizeRobotColor('red')).toBe('RED')
    expect(normalizeRobotColor('RED')).toBe('RED')
    expect(normalizeRobotColor('  Green  ')).toBe('GREEN')
    expect(normalizeRobotColor('blue')).toBe('BLUE')
    expect(normalizeRobotColor('Yellow')).toBe('YELLOW')
    expect(normalizeRobotColor('PURPLE')).toBe('PURPLE')
    expect(normalizeRobotColor('waiting')).toBe('WAITING')
    expect(normalizeRobotColor('WAIT')).toBe('WAITING')
    expect(normalizeRobotColor('unknown')).toBe('UNKNOWN')

    // Numeric ObjectColor enum values
    expect(normalizeRobotColor(1)).toBe('RED')
    expect(normalizeRobotColor(2)).toBe('GREEN')
    expect(normalizeRobotColor(3)).toBe('BLUE')
    expect(normalizeRobotColor(4)).toBe('YELLOW')
    expect(normalizeRobotColor(5)).toBe('PURPLE')
    expect(normalizeRobotColor(0)).toBe('UNKNOWN')

    // Invalid inputs
    expect(normalizeRobotColor('black')).toBeNull()
    expect(normalizeRobotColor(99)).toBeNull()
    expect(normalizeRobotColor(null)).toBeNull()
    expect(normalizeRobotColor(undefined)).toBeNull()
    expect(normalizeRobotColor({})).toBeNull()
  })

  it('checks validity correctly with isValidRobotColor', () => {
    expect(isValidRobotColor('RED')).toBe(true)
    expect(isValidRobotColor('blue')).toBe(true)
    expect(isValidRobotColor('invalid')).toBe(false)
  })

  it('parses serial lines from real robot', () => {
    expect(parseSerialColorSignal('COLOR:RED')).toBe('RED')
    expect(parseSerialColorSignal('COLOR: blue')).toBe('BLUE')
    expect(parseSerialColorSignal('[COLOR]: GREEN')).toBe('GREEN')
    expect(parseSerialColorSignal('[COLOR] YELLOW')).toBe('YELLOW')
    expect(parseSerialColorSignal('IOT:Color=Purple')).toBe('PURPLE')
    expect(parseSerialColorSignal('IOT_COLOR: RED')).toBe('RED')
    expect(parseSerialColorSignal('Some debug log')).toBeNull()
    expect(parseSerialColorSignal('COLOR: CYAN')).toBeNull()
  })

  it('formats serial color command for real robot', () => {
    expect(formatSerialColorCommand('RED')).toBe('COLOR:RED\n')
    expect(formatSerialColorCommand('BLUE')).toBe('COLOR:BLUE\n')
  })

  it('has consistent maps for hex and object codes', () => {
    expect(COLOR_HEX_MAP.RED).toBe('#ef4444')
    expect(COLOR_TO_OBJECT_CODE.GREEN).toBe(2)
    expect(OBJECT_COLOR_MAP[3]).toBe('BLUE')
  })
})

