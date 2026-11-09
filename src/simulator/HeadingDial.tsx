import { useEffect, useRef, useState, type PointerEvent } from 'react';

export function HeadingDial({ value, disabled, onChange, label = 'Hướng robot', inline = false }: { value: number; disabled: boolean; onChange(value: number): void; label?: string; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dragging = useRef<number | null>(null);
  const normalize = (n: number) => ((n % 360) + 360) % 360;
  useEffect(() => { if (disabled) { setOpen(false); dragging.current = null; } }, [disabled]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: globalThis.PointerEvent) => { if (!root.current?.contains(e.target as Node)) { setOpen(false); dragging.current = null; } };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); dragging.current = null; trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const point = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
    if (Math.hypot(x, y) < 8) return;
    onChange(normalize(Math.round(Math.atan2(y, x) * 180 / Math.PI)));
  };
  return <div className={`sim-heading-dial${inline ? ' heading-dial-inline' : ''}`} ref={root}>
    <button ref={trigger} className="sim-button" disabled={disabled} aria-label={label === 'Hướng robot' ? 'Chỉnh hướng robot' : `Chỉnh ${label.toLowerCase()}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
      {label} <strong>{Math.round(normalize(value))}°</strong><span aria-hidden="true" style={{ display: 'inline-block', transform: `rotate(${value}deg)` }}>➜</span>
    </button>
    {open && <div className="heading-dial-popover" role="dialog" aria-label={`Chọn ${label.toLowerCase()}`}>
      <div className="heading-dial-face" role="slider" tabIndex={0} aria-label="Góc robot" aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(normalize(value))} aria-valuetext={`${Math.round(normalize(value))} độ`}
        onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); dragging.current = e.pointerId; e.currentTarget.setPointerCapture?.(e.pointerId); point(e); }}
        onPointerMove={e => { if (dragging.current === e.pointerId) point(e); }}
        onPointerUp={e => { if (dragging.current !== e.pointerId) return; point(e); dragging.current = null; if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
        onPointerCancel={() => { dragging.current = null; }}
        onKeyDown={e => {
          const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 15 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -15 : null;
          if (delta !== null) { e.preventDefault(); onChange(normalize(value + delta)); }
          if (e.key === 'Home') { e.preventDefault(); onChange(0); }
        }}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="79" fill="#f0f7f3" stroke="#c2d6ca" />
          {Array.from({ length: 24 }, (_, i) => <line key={i} x1="100" y1="24" x2="100" y2={i % 6 === 0 ? 36 : 30} stroke="#8ca89b" transform={`rotate(${i * 15} 100 100)`} />)}
          <text x="100" y="15">270°</text><text x="184" y="104">0°</text><text x="100" y="194">90°</text><text x="16" y="104">180°</text>
          <g transform={`rotate(${value} 100 100)`}><line x1="100" y1="100" x2="161" y2="100" stroke="#18664f" strokeWidth="3" /><path d="M166 100 L155 94 L155 106 Z" fill="#18664f" /></g>
          <circle cx="100" cy="100" r="6" fill="#18664f" />
        </svg>
      </div>
      <p>Bấm hoặc kéo kim để quay robot</p>
      <label className="heading-dial-number">Góc robot
        <input aria-label="Nhập góc robot" type="number" step="any" value={Number(normalize(value).toFixed(2))} onChange={e => {
          if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) onChange(normalize(e.target.valueAsNumber));
        }} />°
      </label>
      <div className="heading-presets">{[0, 90, 180, 270].map(a => <button className="sim-button" key={a} onClick={() => onChange(a)}>{a}°</button>)}</div>
      <button className="sim-button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Xong</button>
    </div>}
  </div>;
}
