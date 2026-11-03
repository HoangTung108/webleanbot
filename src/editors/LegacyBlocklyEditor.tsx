import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { BlocklyCommands } from './BlocklyEditor'

interface Workspace { undo(redo: boolean): void; zoomCenter(amount: number): void; scrollCenter(): void; addChangeListener(fn: (event: { isUiEvent?: boolean }) => void): void; removeChangeListener(fn: (event: { isUiEvent?: boolean }) => void): void }
interface LegacyWindow extends Window {
  Blockly_getBlockContent?(): string;
  Blockly_getGeneratedCode?(): string;
  Blockly_setBlockContent?(xml: string): boolean;
  Code?: { workspace: Workspace };
  Blockly?: { svgResize(workspace: Workspace): void };
}
const theme = `
body { font-family: Inter, system-ui, sans-serif; background: #fff; }
#functionsIcons, #optionsTop, #content_code, #separator, #content_serial, #barre_h { display: none !important; }
.table_wrapper, #globalTable, #wrapper_up, #content_area { width: 100% !important; height: 100% !important; margin: 0 !important; }
#content_area { position: absolute !important; inset: 0 !important; }
#content_blocks { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; }
.blocklyToolboxDiv { background: #f8fafc !important; border-right: 1px solid #dce3ec; }
.blocklyTreeRow { border-radius: 6px; min-height: 34px; }
.blocklyTreeLabel { font-family: system-ui, sans-serif !important; }
.customIcon::before, .fa::before, .fas::before, .far::before, .fab::before { font-family: ui-monospace, monospace !important; font-weight: 700; content: "[*]" !important; font-size: 12px; }
.fa-robot::before { content: "[LB]" !important; }
.fa-code::before { content: "{}" !important; }
.fa-cog::before, .fa-cogs::before { content: "[=]" !important; }
.fa-folder::before, .fa-folder-open::before { content: "[/]" !important; }
.fa-puzzle-piece::before, .fa-cubes::before, .fa-cube::before { content: "[#]" !important; }
.fa-microchip::before { content: "[IC]" !important; }
.fa-project-diagram::before { content: "[?]" !important; }
.fa-retweet::before { content: "[@]" !important; }
.fa-calculator::before { content: "[+]" !important; }
.fa-quote-left::before { content: "Aa" !important; }
.fa-list::before { content: "[=]" !important; }
.fa-palette::before { content: "RGB" !important; }
.fa-question::before { content: "[?]" !important; }
.fa-whmcs::before { content: "fn" !important; }
.fa-bolt::before { content: "[V]" !important; }
.fa-thermometer-half::before { content: "[T]" !important; }
.fa-redo::before { content: "->" !important; }
.fa-undo::before { content: "<-" !important; }
.blocklyMainBackground { stroke: none !important; fill: #fff !important; }
`
export const LegacyBlocklyEditor = forwardRef<BlocklyCommands, { xml: string; onChange(xml: string, cpp: string): void; onError(message: string): void }>(function LegacyBlocklyEditor({ xml, onChange, onError }, ref) {
  const frame = useRef<HTMLIFrameElement>(null)
  const callbacks = useRef({ onChange, onError }); callbacks.current = { onChange, onError }
  const ready = useRef(false)
  const initial = useRef(xml)
  const [status, setStatus] = useState('Đang mở Blockly…')
  const getWindow = () => frame.current?.contentWindow as LegacyWindow | null
  useImperativeHandle(ref, () => ({
    getLegacySnapshot: () => {
      const win = getWindow()
      return ready.current && win?.Blockly_getBlockContent && win.Blockly_getGeneratedCode ? { xml: win.Blockly_getBlockContent(), cpp: win.Blockly_getGeneratedCode() } : undefined
    },
    undo: () => getWindow()?.Code?.workspace.undo(false), redo: () => getWindow()?.Code?.workspace.undo(true),
    zoomIn: () => getWindow()?.Code?.workspace.zoomCenter(1), zoomOut: () => getWindow()?.Code?.workspace.zoomCenter(-1), center: () => getWindow()?.Code?.workspace.scrollCenter(),
  }), [])
  useEffect(() => {
    let disposed = false, attempts = 0, timer = 0, detach = () => {}
    const connect = () => {
      if (disposed) return
      const win = getWindow()
      if (!win?.Blockly_setBlockContent || !win.Code?.workspace) {
        if (++attempts > 150) { setStatus('Không tải được Blockly. Kiểm tra kết nối và tải lại trang.'); return }
        timer = window.setTimeout(connect, 100); return
      }
      try {
        const style = win.document.createElement('style'); style.textContent = theme; win.document.head.append(style)
        if (!win.Blockly_setBlockContent(initial.current)) throw new Error('Không mở được nội dung Blockly.')
        const workspace = win.Code.workspace
        const emit = () => {
          try { callbacks.current.onChange(win.Blockly_getBlockContent!(), win.Blockly_getGeneratedCode!()) }
          catch (e) { callbacks.current.onError(e instanceof Error ? e.message : String(e)) }
        }
        let debounce = 0
        const listener = (event: { isUiEvent?: boolean }) => {
          if (event.isUiEvent) return
          window.clearTimeout(debounce); debounce = window.setTimeout(emit, 80)
        }
        workspace.addChangeListener(listener)
        const resize = () => win.Blockly?.svgResize(workspace)
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
        if (frame.current) observer?.observe(frame.current)
        resize(); ready.current = true; setStatus(''); emit()
        detach = () => { window.clearTimeout(debounce); workspace.removeChangeListener(listener); observer?.disconnect() }
      } catch (e) { const message = e instanceof Error ? e.message : String(e); setStatus(message); callbacks.current.onError(message) }
    }
    // APIs appear after the iframe has initialized its toolbox and generators.
    timer = window.setTimeout(connect, 100)
    return () => { ready.current = false; disposed = true; window.clearTimeout(timer); detach() }
  }, [])
  return <div className="legacy-blockly-host">
    {status && <div className="editor-loading" role="status">{status}</div>}
    <iframe ref={frame} title="Blockly Leanbot" src={`${import.meta.env.BASE_URL}leanbot-ide/LB-blockly/index.html?lang=en&studio=1`} />
  </div>
})
