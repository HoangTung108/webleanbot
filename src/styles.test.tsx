import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const stylesheet = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

describe('ASCII icon styles', () => {
  it('styles ASCII icons without resizing the Blockly SVG canvas', () => {
    expect(stylesheet).toMatch(/\.ascii-icon\s*\{[^}]*font-family:\s*ui-monospace/s)
    expect(stylesheet).not.toMatch(/(^|})\s*svg\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;/s)
  })
})
