import { cppToIr } from '../transpiler'
import { createProject, freshestCppSource, updateCpp, type LeanbotProject } from './projectStore'

export const EMPTY_LEGACY_XML = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="Leanbot.whenStarted" x="60" y="40"></block></xml>'
const LIBRARY_KEY = 'leanbot-studio.files.v1'
export function newDocument(name = 'Chương trình mới', mode: 'blocks' | 'cpp' = 'blocks'): LeanbotProject {
  const project = createProject(cppToIr('#include <Leanbot.h>\nvoid setup(){ Leanbot.begin(); }\nvoid loop(){}').program, name)
  return mode === 'blocks' ? { ...project, legacyXml: EMPTY_LEGACY_XML, legacyCodeReady: false } : { ...project, sourceMode: 'cpp' }
}
export function validateProject(value: unknown): LeanbotProject {
  if (!value || typeof value !== 'object') throw new Error('Tệp project không hợp lệ.')
  const p = value as LeanbotProject
  if (typeof p.cppSource !== 'string' || !p.blockWorkspace || typeof p.blockWorkspace !== 'object' || !p.ir || !['includes', 'globals', 'setup', 'loop', 'functions'].every(key => Array.isArray((p.ir as unknown as Record<string, unknown>)[key])) || !['cpp', 'blocks'].includes(p.sourceMode)) throw new Error('Tệp không chứa project Leanbot hợp lệ.')
  if (p.legacyXml !== undefined) validateXml(p.legacyXml)
  return { ...p, id: crypto.randomUUID(), name: typeof p.name === 'string' ? p.name : 'Project đã mở', updatedAt: Date.now() }
}
export function validateXml(xml: string) {
  const root = new DOMParser().parseFromString(xml, 'application/xml')
  if (root.querySelector('parsererror') || root.documentElement.localName !== 'xml' || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML Blockly không hợp lệ.')
  return xml
}
export function importDocument(name: string, text: string): LeanbotProject {
  if (/\.(xml|blockly|bduino)$/i.test(name) || text.trimStart().startsWith('<')) return { ...newDocument(name), legacyXml: validateXml(text) }
  if (/\.(json|leanbot)$/i.test(name)) {
    const parsed = JSON.parse(text)
    return validateProject(parsed.project ?? parsed)
  }
  if (!/\.(ino|cpp|h|hpp|c|txt)$/i.test(name)) throw new Error('Hỗ trợ .ino, .cpp, .xml, .bduino, .blockly và .leanbot.json.')
  // Preserve the original source verbatim, including custom C++ unsupported by Blocks.
  return { ...updateCpp(newDocument(name, 'cpp'), text), sourceMode: 'cpp' }
}
export function exportDocument(project: LeanbotProject, format: 'cpp' | 'blocks' | 'project' | 'xml') {
  const name = project.name.replace(/\.(leanbot\.json|ino|cpp|xml|blockly|bduino|json)$/i, '').replace(/[\\/:*?"<>|]/g, '_') || 'Leanbot'
  if (format === 'cpp') return { name: `${name}.ino`, text: freshestCppSource(project), type: 'text/plain;charset=utf-8' }
  if (format === 'blocks' || format === 'xml') {
    if (project.legacyXml === undefined) throw new Error('Bài này dùng Blocks mới. Hãy lưu project để giữ đầy đủ khối.')
    return { name: `${name}.${format === 'blocks' ? 'bduino' : 'xml'}`, text: project.legacyXml, type: 'application/xml;charset=utf-8' }
  }
  return { name: `${name}.leanbot.json`, text: JSON.stringify({ format: 'leanbot-studio', version: 1, project }, null, 2), type: 'application/json;charset=utf-8' }
}
export function downloadDocument(project: LeanbotProject, format: 'cpp' | 'blocks' | 'project' | 'xml') {
  const file = exportDocument(project, format)
  const url = URL.createObjectURL(new Blob([file.text], { type: file.type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name
  document.body.append(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function loadDocuments(storage: Storage = localStorage): LeanbotProject[] {
  try {
    const list = JSON.parse(storage.getItem(LIBRARY_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter(p => p && typeof p.id === 'string' && typeof p.cppSource === 'string' && p.blockWorkspace && p.ir && ['cpp','blocks'].includes(p.sourceMode)) : []
  } catch { return [] }
}
export function saveDocuments(files: LeanbotProject[], storage: Storage = localStorage): boolean {
  try { storage.setItem(LIBRARY_KEY, JSON.stringify(files)); return true } catch { return false }
}
