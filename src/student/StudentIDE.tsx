import { Cloud, Save, Sparkles, FilePlus2, FolderOpen, Download, FileCode2, Blocks, Trash2 } from '../components/ui/asciiIcons'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlocklyCommands } from '../editors/BlocklyEditor'
import { LegacyBlocklyEditor } from '../editors/LegacyBlocklyEditor'
import { downloadDocument, importDocument, loadDocuments, newDocument, saveDocuments } from '../project/projectFiles'
import { BlocklyEditor } from '../editors/BlocklyEditor'
import type { EditorCommands } from '../editors/CppEditor'
import { CppEditor } from '../editors/CppEditor'
import { LeanbotSerialClient } from '../lib/serial'
import { compileLeanbot } from '../leanbot/compile/compilerClient'
import { uploadHex, type UploadPhase } from '../leanbot/upload/stk500'
import { bindProjectPersistence, loadProject, saveProject } from '../project/projectPersistence'
import { acceptBlocksCandidate, createBlocksCandidate, resolveConflict, synchronizeToCpp, updateBlocks, updateCpp, type ConversionCandidate, type LeanbotProject, type SourceMode } from '../project/projectStore'
import { Toast } from '../components/ui/toast'
import { ConflictDialog } from './ConflictDialog'
import { ConversionDialog } from './ConversionDialog'
import { Toolbar } from './Toolbar'

function initialProject() {
  return loadProject() ?? loadDocuments()[0] ?? newDocument('Bài 01.xml')
}

export function StudentIDE({ onSourceChange }: { onSourceChange?: (source: string) => void }) {
  const [project, setProject] = useState<LeanbotProject>(initialProject)
  const [files, setFiles] = useState<LeanbotProject[]>(loadDocuments)
  const [closedFile, setClosedFile] = useState<LeanbotProject | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [candidate, setCandidate] = useState<ConversionCandidate | null>(null)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ message: string; tone: 'info' | 'success' | 'error' } | null>(null)
  const projectRef = useRef(project)
  const cppRef = useRef<EditorCommands>(null)
  const blocksRef = useRef<BlocklyCommands>(null)
  const serial = useMemo(() => new LeanbotSerialClient(), [])
  const persistenceRef = useRef<ReturnType<typeof bindProjectPersistence> | null>(null)
  const runAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    projectRef.current = project; persistenceRef.current?.schedule()
    setFiles(current => current.some(p => p.id === project.id) ? current.map(p => p.id === project.id ? project : p) : [...current, project])
  }, [project])
  useEffect(() => {
    if (files.length && !saveDocuments(files)) setNotice({ message: 'Bộ nhớ trình duyệt đã đầy. Hãy tải project về máy để giữ bài.', tone: 'error' })
  }, [files])
  useEffect(() => {
    persistenceRef.current = bindProjectPersistence(() => snapshot(), () => setNotice({ message: 'Không thể lưu project trên trình duyệt. Chương trình vẫn được giữ trong phiên này.', tone: 'error' }))
    serial.onDisconnect = () => setConnected(false)
    return () => { persistenceRef.current?.flush(); persistenceRef.current?.dispose(); void serial.disconnect() }
  }, [serial])

  useEffect(() => {
    onSourceChange?.(project.sourceMode === 'blocks' && project.legacyXml !== undefined && !project.legacyCodeReady ? '' : (project.sourceMode === 'blocks' ? synchronizeToCpp(project) : project).cppSource);
  }, [project, onSourceChange]);

  function snapshot() {
    const current = projectRef.current
    const blocks = current.sourceMode === 'blocks' && current.legacyXml !== undefined ? blocksRef.current?.getLegacySnapshot?.() : undefined
    return blocks ? { ...current, legacyXml: blocks.xml, cppSource: blocks.cpp, updatedAt: Date.now() } : current
  }

  function activate(next: LeanbotProject) {
    const current = snapshot()
    setFiles(items => items.map(p => p.id === current.id ? current : p))
    projectRef.current = next; setProject(next); setCandidate(null); setConflictOpen(false)
  }

  function createFile(mode: 'cpp' | 'blocks') {
    const base = mode === 'cpp' ? 'main' : 'Bài mới', extension = mode === 'cpp' ? 'ino' : 'xml'
    let index = 1, name = `${base}.${extension}`
    while (files.some(file => file.name === name)) name = `${base} ${++index}.${extension}`
    activate(newDocument(name, mode))
  }

  function saveAs(format: 'cpp' | 'blocks' | 'project' | 'xml') {
    try {
      if (format === 'cpp' && project.sourceMode === 'blocks' && project.legacyXml !== undefined && !blocksRef.current?.getLegacySnapshot?.()) throw new Error('Blockly chưa sẵn sàng tạo C++. Bạn vẫn có thể tải XML hoặc project.')
      const current = snapshot(); setProject(current); saveProject(current)
      downloadDocument(current, format)
      setNotice({ message: 'Đã tải tệp về máy.', tone: 'success' })
    } catch (error) { setNotice({ message: error instanceof Error ? error.message : String(error), tone: 'error' }) }
  }

  async function openFiles(selected: FileList | null) {
    if (!selected) return
    const opened: LeanbotProject[] = []
    for (const file of Array.from(selected)) {
      try { opened.push(importDocument(file.name, await file.text())) }
      catch (error) { setNotice({ message: `${file.name}: ${error instanceof Error ? error.message : String(error)}`, tone: 'error' }) }
    }
    if (opened.length) {
      const current = snapshot()
      setFiles(items => [...items.map(p => p.id === current.id ? current : p), ...opened])
      projectRef.current = opened.at(-1)!; setProject(opened.at(-1)!)
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  function removeFile(id: string) {
    setClosedFile(id === project.id ? snapshot() : files.find(file => file.id === id) ?? null)
    const remaining = files.filter(p => p.id !== id)
    if (id === project.id) {
      const next = remaining[0] ?? newDocument('Bài mới.xml')
      projectRef.current = next; setProject(next)
      setFiles(remaining.length ? remaining : [next])
    } else setFiles(remaining)
  }

  function changeMode(mode: SourceMode) {
    if (mode === project.sourceMode) return
    if (mode === 'cpp' && project.sourceMode === 'blocks' && project.legacyXml !== undefined && !blocksRef.current?.getLegacySnapshot?.()) { setNotice({ message: 'Đợi Blockly tải xong để tạo code C++ chính xác.', tone: 'info' }); return }
    if (project.syncState === 'conflict') { setConflictOpen(true); return }
    if (mode === 'cpp') { setProject(synchronizeToCpp(snapshot())); return }
    if (project.legacyXml !== undefined) {
      if (project.syncState === 'cpp-newer') {
        const backup = { ...newDocument(`${project.name} - C++.ino`, 'cpp'), cppSource: project.cppSource, syncState: 'cpp-newer' as const }
        setFiles(items => [...items, backup])
        setProject({ ...project, sourceMode: 'blocks', legacyCodeReady: false, syncState: 'synced' })
        setNotice({ message: `Đã giữ C++ đã sửa trong tệp “${backup.name}”. Đang mở lại các khối cũ.`, tone: 'info' }); return
      }
      setProject({ ...project, sourceMode: 'blocks' }); return
    }
    const next = createBlocksCandidate(project)
    if (next.result.status === 'unsupported') { setCandidate(next); return }
    setProject(acceptBlocksCandidate(project, next))
  }

  async function connect() {
    if (connected) { await serial.disconnect(); setConnected(false); return }
    try { await serial.connect(); setConnected(true); setNotice({ message: 'Leanbot đã kết nối qua USB.', tone: 'success' }) }
    catch (error) { setNotice({ message: error instanceof Error ? error.message : String(error), tone: 'error' }) }
  }

  async function run() {
    if (project.sourceMode === 'blocks' && project.legacyXml !== undefined && !blocksRef.current?.getLegacySnapshot?.()) { setNotice({ message: 'Blockly đang tải; vui lòng chờ trước khi chạy.', tone: 'info' }); return }
    const controller = new AbortController()
    runAbortRef.current?.abort()
    runAbortRef.current = controller
    setBusy(true)
    const current = snapshot()
    const sourceProject = current.sourceMode === 'blocks' ? synchronizeToCpp(current) : current
    if (project.sourceMode === 'blocks') setProject({ ...sourceProject, sourceMode: 'blocks' })
    setNotice({ message: 'Đang biên dịch chương trình mới nhất…', tone: 'info' })
    try {
      const result = await compileLeanbot(sourceProject.cppSource, { signal: controller.signal })
      if (!result.success || !result.hex) { setNotice({ message: result.errors?.[0] ? `Dòng ${result.errors[0].line}: ${result.errors[0].message}` : result.stdout, tone: 'error' }); return }
      if (!connected) { setNotice({ message: 'Biên dịch thành công. Hãy kết nối Leanbot để nạp chương trình.', tone: 'info' }); return }
      const phaseLabel: Record<UploadPhase, string> = { idle: 'Sẵn sàng.', resetting: 'Đang khởi động bootloader…', syncing: 'Đang đồng bộ Leanbot…', uploading: 'Đang ghi firmware…', verifying: 'Đang xác minh firmware…', done: 'Nạp chương trình thành công.' }
      const transport = await serial.createUploadTransport()
      await uploadHex(transport, result.hex, { signal: controller.signal, onProgress: (phase, progress) => setNotice({ message: `${phaseLabel[phase]}${['uploading', 'verifying'].includes(phase) ? ` ${Math.round(progress * 100)}%` : ''}`, tone: phase === 'done' ? 'success' : 'info' }) })
    }
    catch (error) { setNotice({ message: error instanceof Error ? error.message : String(error), tone: 'error' }) }
    finally { if (runAbortRef.current === controller) runAbortRef.current = null; setBusy(false) }
  }

  function stop() {
    runAbortRef.current?.abort()
    runAbortRef.current = null
    setBusy(false)
    setNotice({ message: 'Đã hủy tiến trình biên dịch hoặc nạp chương trình.', tone: 'info' })
  }

  const activeCommands = project.sourceMode === 'blocks' ? blocksRef.current : cppRef.current

  return <main className="student-shell">
    <header className="student-header">
      <div className="brand-lockup"><img className="brand-logo" src={`${import.meta.env.BASE_URL}leanbot-ide/img/logo-lb-title.png`} alt="Leanbot" /><div><strong>Leanbot Studio</strong><small>Student IDE</small></div></div>
      <div className="project-name"><span>Tệp</span><input aria-label="Tên tệp" value={project.name} onChange={e => setProject(current => ({ ...current, name: e.target.value, updatedAt: Date.now() }))} /></div>
      <div className="save-state"><Save />Tự động lưu<small>{new Date(project.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small></div>
    </header>
    <Toolbar mode={project.sourceMode} syncState={project.syncState} connected={connected} busy={busy} onMode={changeMode} onUndo={() => activeCommands?.undo()} onRedo={() => activeCommands?.redo()} onZoomIn={() => blocksRef.current?.zoomIn()} onZoomOut={() => blocksRef.current?.zoomOut()} onCenter={() => blocksRef.current?.center()} onConnect={() => void connect()} onRun={() => void run()} onStop={stop} />
    <div className="workspace-layout">
      <aside className="file-sidebar" aria-label="Quản lý tệp">
        <div className="file-sidebar-title"><strong>TỆP CỦA BẠN</strong><button title="Mở tệp từ máy" aria-label="Mở tệp từ máy" onClick={() => fileInput.current?.click()}><FolderOpen /></button></div>
        <div className="file-actions">
          <button onClick={() => createFile('blocks')}><FilePlus2 />Blockly+</button>
          <button onClick={() => createFile('cpp')}><FileCode2 />C++</button>
        </div>
        <input ref={fileInput} type="file" hidden multiple accept=".ino,.cpp,.h,.hpp,.c,.txt,.xml,.bduino,.blockly,.json,.leanbot" onChange={e => void openFiles(e.target.files)} />
        <div className="file-list">
          {files.map(file => <div className={`file-row ${file.id === project.id ? 'active' : ''}`} key={file.id}>
            <button className="file-select" aria-current={file.id === project.id ? 'page' : undefined} onClick={() => activate(file)} title={file.name}>{file.legacyXml !== undefined ? <Blocks /> : <FileCode2 />}<span>{file.name || 'Chưa đặt tên'}</span></button>
            <button className="file-delete" aria-label={`Đóng tệp ${file.name}`} title="Đóng tệp (tải về trước nếu cần)" onClick={() => removeFile(file.id)}><Trash2 /></button>
          </div>)}
        </div>
        {closedFile && <button onClick={() => {
          setFiles(items => [...items.filter(file => file.id !== closedFile.id), closedFile]); activate(closedFile); setClosedFile(null)
        }}>Khôi phục tệp vừa đóng</button>}
        <div className="file-downloads">
          <strong>LƯU VỀ MÁY</strong>
          <button onClick={() => saveAs('cpp')}><Download />Code C++ (.ino)</button>
          {project.legacyXml !== undefined && <button onClick={() => saveAs('blocks')}><Download />Blockly(.bduino)</button>}
          {project.legacyXml !== undefined && <button onClick={() => saveAs('xml')}><Download />XML Blockly (.xml)</button>}
          <button onClick={() => saveAs('project')}><Download />Project đầy đủ</button>
          <small>Tự động lưu từng tệp trên trình duyệt. Đổi tên ở thanh trên.</small>
        </div>
      </aside>
      <section className="editor-stage" aria-label="Không gian lập trình">
        {project.sourceMode === 'blocks'
          ? project.legacyXml !== undefined
            ? <LegacyBlocklyEditor key={project.id} ref={blocksRef} xml={project.legacyXml} onChange={(xml, cpp) => setProject(current => ({ ...current, legacyXml: xml, cppSource: cpp, legacyCodeReady: true, syncState: 'synced', updatedAt: Date.now() }))} onError={message => setNotice({ message, tone: 'error' })} />
            : <BlocklyEditor key={`${project.id}-${project.baselineBlocksHash}`} ref={blocksRef} state={project.blockWorkspace} onChange={(state) => setProject((current) => updateBlocks(current, state))} />
          : <CppEditor key={project.id} ref={cppRef} value={project.cppSource} diagnostics={project.diagnostics} onChange={(source) => setProject((current) => updateCpp(current, source))} onSave={() => saveAs('cpp')} />}
      </section>
    </div>
    <footer className="student-footer"><span><Cloud />Lưu trên trình duyệt</span><span className="footer-help">Blockly Leanbot · C++ · Tệp trên máy</span></footer>
    <ConversionDialog candidate={candidate} onCancel={() => setCandidate(null)} onStay={() => { setCandidate(null); setProject((current) => ({ ...current, sourceMode: 'cpp', syncState: 'unsupported-cpp', diagnostics: candidate?.result.diagnostics ?? [] })) }} onPartial={() => { if (candidate) setProject(acceptBlocksCandidate(project, candidate, true)); setCandidate(null) }} />
    <ConflictDialog open={conflictOpen} cpp={project.cppSource} onCancel={() => setConflictOpen(false)} onChoose={(side) => { setProject(resolveConflict(project, side)); setConflictOpen(false) }} />
    {notice && <Toast {...notice} onClose={() => setNotice(null)} />}
  </main>
}
