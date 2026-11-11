import { useEffect, useRef, useState } from 'react'
import type { LeanbotSerialClient } from '../lib/serial'

const MAX_LOG = 64 * 1024
export function SerialDebugPanel({ serial, connected, busy }: { serial: LeanbotSerialClient; connected: boolean; busy: boolean }) {
  const [text, setText] = useState('')
  const pending = useRef('')
  const output = useRef<HTMLPreElement>(null)
  const follow = useRef(true)
  useEffect(() => {
    const receive = (chunk: string) => { pending.current = (pending.current + chunk).slice(-MAX_LOG) }
    serial.onText = receive
    const timer = window.setInterval(() => {
      if (!pending.current) return
      const chunk = pending.current
      pending.current = ''
      setText(previous => (previous + chunk).slice(-MAX_LOG))
    }, 100)
    return () => { window.clearInterval(timer); if (serial.onText === receive) serial.onText = () => undefined }
  }, [serial])
  useEffect(() => {
    if (follow.current && output.current) output.current.scrollTop = output.current.scrollHeight
  }, [text])
  return <details className="serial-debug-panel">
    <summary>Serial Debug <span>{busy ? 'Đang biên dịch / nạp' : connected ? 'USB · 115200 baud' : 'Chưa kết nối USB'}</span></summary>
    <div className="serial-debug-actions">
      <label><input type="checkbox" defaultChecked onChange={event => { follow.current = event.target.checked }} /> Tự cuộn</label>
      <button type="button" onClick={() => { pending.current = ''; setText('') }}>Xóa log</button>
      <small>Dùng Serial.begin(115200) và Serial.println(...). Giữ tối đa 64 KB.</small>
    </div>
    <pre ref={output} aria-label="Log debug Serial" tabIndex={0}>{text || 'Chờ dữ liệu từ Leanbot…'}</pre>
  </details>
}
