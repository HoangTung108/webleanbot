import type { CSSProperties } from 'react'

type IconProps = { size?: number | string; className?: string; style?: CSSProperties; fill?: string }
function icon(symbol: string) {
  return function AsciiIcon({ size, className = '', style }: IconProps) {
    return <span className={`ascii-icon ${className}`} aria-hidden="true" style={{ ...(size ? { fontSize: typeof size === 'number' ? Math.max(10, size - 2) : size } : {}), ...style }}>{symbol}</span>
  }
}
export const Blocks = icon('[#]')
export const Braces = icon('{}')
export const Code2 = icon('</>')
export const FileCode2 = icon('{.}')
export const FilePlus2 = icon('[+]')
export const FolderOpen = icon('[/]')
export const Download = icon('[v]')
export const Trash2 = icon('[x]')
export const Save = icon('[S]')
export const Cloud = icon('[~]')
export const Sparkles = icon('*')
export const Bot = icon('[o_o]')
export const Cable = icon('[=]')
export const CircleStop = icon('[]')
export const LocateFixed = icon('[.]')
export const Play = icon('>')
export const Redo2 = icon('->')
export const Undo2 = icon('<-')
export const ZoomIn = icon('[+]')
export const ZoomOut = icon('[-]')
export const Circle = icon('o')
export const CircleAlert = icon('[!]')
export const CircleCheck = icon('[OK]')
export const X = icon('x')
export const Bug = icon('[!]')
export const TerminalSquare = icon('>_')
export const Activity = icon('~')
export const Gauge = icon('[m]')
export const Hand = icon('[T]')
export const Radar = icon('((.))')
export const RotateCw = icon('[R]')
export const Box = icon('[ ]')
export const ChevronDown = icon('v')
export const Settings2 = icon('[=]')
export const GripVertical = icon('::')
export const Plus = icon('+')
