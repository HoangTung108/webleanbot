import { expect, it } from 'vitest'
import baseCode from '../../docs/baseCode.cpp?raw'
import { apiReference } from './apiReference'
it('documents selected helpers that exist in baseCode', () => {
  const functions = [...baseCode.matchAll(/^(?:void|bool|int|float|ObjectColor) (\w+)\([^;\n]*\)\s*\{/gm)].map(match => match[1]).filter(name => !['setup', 'loop'].includes(name))
  const documented = new Set(apiReference.filter(row => row.group === 'helpers').map(row => row.api.split('(')[0]))
  for (const name of documented) expect(functions, name).toContain(name)
  for (const name of ['read_color', 'send_iot_color', 'read_iot_color']) {
    expect(documented.has(name), name).toBe(true)
  }
})
it('has complete explanatory fields, unique entries and annotated examples', () => {
  expect(new Set(apiReference.map(row => row.group + row.api)).size).toBe(apiReference.length)
  for (const row of apiReference) {
    for (const key of ['description', 'parameters', 'returns', 'notes', 'source', 'code'] as const) expect(row[key].trim(), row.api + ': ' + key).not.toBe('')
    expect(row.code).toContain('//')
  }
})
