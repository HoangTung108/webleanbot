import { describe, expect, it } from 'vitest'
import { EMPTY_LEGACY_XML, exportDocument, importDocument, loadDocuments, newDocument, saveDocuments } from './projectFiles'
import { freshestCppSource, synchronizeToCpp } from './projectStore'

describe('file import and export', () => {
  it('preserves custom C++ byte for byte and creates distinct document identities', () => {
    const code = '#include <Leanbot.h>\n// custom\nvoid loop(){ move_tank(2000,2000,35); }\n'
    const first = importDocument('mission.ino', code), second = importDocument('mission.ino', code)
    expect(first.id).not.toBe(second.id)
    expect(first.sourceMode).toBe('cpp')
    expect(exportDocument(first, 'cpp')).toMatchObject({ name: 'mission.ino', text: code })
  })
  it('opens legacy XML and round trips every field through the project format', () => {
    const xml = EMPTY_LEGACY_XML.replace('x="60"', 'x="120"')
    const original = { ...importDocument('mission.xml', xml), cppSource: 'generated C++' }
    expect(exportDocument(original, 'blocks')).toMatchObject({ name: 'mission.bduino', text: xml })
    expect(importDocument('legacy.bduino', xml).legacyXml).toBe(xml)
    const backup = exportDocument(original, 'project')
    const restored = importDocument(backup.name, backup.text)
    expect(restored.id).not.toBe(original.id)
    expect(restored.legacyXml).toBe(xml)
    expect(freshestCppSource(restored)).toBe('generated C++')
    expect(synchronizeToCpp(restored).cppSource).toBe('generated C++')
  })
  it('rejects malformed XML, arbitrary JSON and unsupported files', () => {
    expect(() => importDocument('bad.xml', '<xml><block></xml>')).toThrow()
    expect(() => importDocument('bad.json', '{}')).toThrow()
    expect(() => importDocument('bad.exe', '123')).toThrow()
  })
  it('persists multiple independent files and recovers from invalid browser storage', () => {
    localStorage.clear()
    const documents = [newDocument('one.xml'), newDocument('two.ino', 'cpp')]
    expect(saveDocuments(documents)).toBe(true)
    expect(loadDocuments().map(p => p.name)).toEqual(['one.xml','two.ino'])
    localStorage.setItem('leanbot-studio.files.v1', '{invalid')
    expect(loadDocuments()).toEqual([])
  })
})
