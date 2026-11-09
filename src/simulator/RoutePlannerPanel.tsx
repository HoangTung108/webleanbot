import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { generateRouteCode, generateRouteCommands, routePoses, type RouteStep } from './routePlanner';
import type { Pose } from './types';
import type { RobotSimulator } from './robotSimulator';
import type { SimulatorRenderer } from './renderer';

export function RoutePlannerPanel({ simulator, renderer, canvas, locked, onRun, children, toolsHost, previewHost, toolsVisible }: {
  simulator: RobotSimulator | null; renderer: SimulatorRenderer | null; canvas: HTMLCanvasElement | null;
  children?: ReactNode; locked: boolean; onRun(code: string, start: Pose): void;
  toolsHost?: HTMLElement | null; previewHost?: HTMLElement | null; toolsVisible?: boolean;
}) {
  const [start, setStart] = useState<Pose>({ x: 934.6, y: 934.6, heading: 270 });
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [follow, setFollow] = useState(false);
  const [angle, setAngle] = useState(90);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const docked = toolsVisible !== undefined;
  const showTools = docked ? toolsVisible : toolsOpen;
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const drag = useRef<{ index: number; pointer: number } | null>(null);
  useEffect(() => {
    if (!showTools) { setDrawing(false); setEditing(false); drag.current = null; }
  }, [showTools]);
  const point = selected === -1 ? start : selected !== null && steps[selected]?.kind === 'move' ? steps[selected] as Extract<RouteStep, { kind: 'move' }> : null;
  const updatePoint = (patch: { x?: number; y?: number; heading?: number }) => {
    if (locked || selected === null) return;
    if (selected === -1) setStart(p => ({ ...p, ...patch, heading: patch.heading ?? p.heading }));
    else setSteps(s => s.map((p, i) => i === selected && p.kind === 'move' ? { ...p, ...patch } : p));
  };
  const removeStep = (index: number) => {
    setSteps(s => s.filter((_, i) => i !== index));
    setSelected(s => s === index ? null : s !== null && s > index ? s - 1 : s);
  };

  const append = (step: RouteStep) => {
    if (!steps.length && simulator && !drawing) setStart({ ...simulator.getRobotPose() });
    setSteps(s => [...s, step]);
  };
  const generated = useMemo(() => { try { return { code: generateRouteCommands(start, steps), error: '' }; } catch (e) { return { code: '', error: String(e) }; } }, [start, steps]);
  useEffect(() => {
    if (!renderer) return;
    renderer.plannedRoute = steps.length ? routePoses(start, steps) : [];
    renderer.selectedRoutePoint = selected === null ? null : selected + 1;
    renderer.render();
    return () => { renderer.plannedRoute = []; renderer.selectedRoutePoint = null; renderer.render(); };
  }, [renderer, start, steps, selected]);
  useEffect(() => {
    if (!canvas || !renderer || !editing || locked) { drag.current = null; return; }
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const p = renderer.clientToBoard(e.clientX, e.clientY);
      const edge = renderer.clientToBoard(e.clientX + 12, e.clientY);
      const radius = Math.hypot(edge.x - p.x, edge.y - p.y);
      const candidates = [{ ...start, index: -1 }, ...steps.flatMap((s, index) => s.kind === 'move' ? [{ x: s.x, y: s.y, index }] : [])];
      const hit = candidates.filter(c => Math.hypot(c.x - p.x, c.y - p.y) <= radius).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      setSelected(hit?.index ?? null);
      if (hit) { drag.current = { index: hit.index, pointer: e.pointerId }; canvas.setPointerCapture?.(e.pointerId); }
    };
    const move = (e: PointerEvent) => {
      if (!drag.current || drag.current.pointer !== e.pointerId) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const p = renderer.clientToBoard(e.clientX, e.clientY);
      const position = { x: Math.max(0, Math.min(1219.2, p.x)), y: Math.max(0, Math.min(1219.2, p.y)) };
      const index = drag.current.index;
      if (index === -1) setStart(s => ({ ...s, ...position }));
      else setSteps(s => s.map((step, i) => i === index && step.kind === 'move' ? { ...step, ...position } : step));
    };
    const up = (e: PointerEvent) => {
      if (!drag.current) return;
      e.stopImmediatePropagation(); drag.current = null;
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener('pointerdown', down, true); canvas.addEventListener('pointermove', move, true);
    canvas.addEventListener('pointerup', up, true); canvas.addEventListener('pointercancel', up, true);
    return () => {
      canvas.removeEventListener('pointerdown', down, true); canvas.removeEventListener('pointermove', move, true);
      canvas.removeEventListener('pointerup', up, true); canvas.removeEventListener('pointercancel', up, true);
    };
  }, [canvas, renderer, editing, locked, steps, start]);
  useEffect(() => {
    if (!canvas || !renderer || !drawing || locked) return;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const p = renderer.clientToBoard(e.clientX, e.clientY);
      if (p.x < 0 || p.y < 0 || p.x > 1219.2 || p.y > 1219.2) return;
      setSteps(old => {
        const last = routePoses(start, old).at(-1)!;
        return Math.hypot(p.x - last.x, p.y - last.y) < 1 ? old : [...old, { kind: 'move', ...p, follow }];
      });
    };
    canvas.addEventListener('pointerdown', down, true);
    return () => canvas.removeEventListener('pointerdown', down, true);
  }, [canvas, renderer, drawing, locked, start, follow]);
  const controls = <>
    <fieldset hidden={!showTools} className="route-toolbar" disabled={locked} aria-label="Công cụ vẽ lộ trình">
      <button className="sim-button" onClick={() => { setEditing(false); setSelected(null); if (!steps.length && simulator) setStart({ ...simulator.getRobotPose() }); setDrawing(!drawing); }} aria-pressed={drawing}>{drawing ? 'Dừng vẽ' : 'Vẽ đường'}</button>
      <button className="sim-button" aria-pressed={editing} onClick={() => { setDrawing(false); setEditing(!editing); }}>Sửa điểm</button>
      <label className="route-follow"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} /> Dò line</label>
      <span className="route-divider" />
      <label className="route-angle"><input aria-label="Góc xoay lộ trình" title="Góc tương đối: dương quay phải, âm quay trái" type="number" value={angle} onChange={e => setAngle(Number(e.target.value))} />°</label>
      <button className="sim-button" onClick={() => append({ kind: 'turn', angle })} disabled={!Number.isFinite(angle)}>Xoay</button>
      <button className="sim-button" onClick={() => append({ kind: 'grab' })}>Gắp</button>
      <button className="sim-button" onClick={() => append({ kind: 'release' })}>Thả</button>
      <span className="route-divider" />
      <button className="sim-button" disabled={!steps.length} onClick={() => removeStep(steps.length - 1)} title="Xóa bước cuối">Hoàn tác</button>
      <button className="sim-button" disabled={!steps.length} onClick={() => { setSteps([]); setSelected(null); setDrawing(false); if (simulator) setStart({ ...simulator.getRobotPose() }); }}>Xóa</button>
      <button className="sim-button primary" disabled={!steps.length || !!generated.error} onClick={() => { setDrawing(false); onRun(generateRouteCode(start, steps), start); }}>Chạy lộ trình</button>
    </fieldset>
    {editing && <fieldset className="route-toolbar route-point-editor" disabled={locked} aria-label="Hiệu chỉnh điểm">
      <label>Điểm <select aria-label="Điểm cần sửa" value={selected ?? ''} onChange={e => setSelected(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">Chọn trên sa bàn</option><option value={-1}>0 · Xuất phát</option>
        {steps.map((s, i) => s.kind === 'move' ? <option key={i} value={i}>{i + 1}</option> : null)}
      </select></label>
      {point ? <>
        {(['x', 'y'] as const).map(axis => <label key={axis}>{axis.toUpperCase()} <input aria-label={`Tọa độ ${axis.toUpperCase()}`} type="number" min="0" max="1219.2" step="0.1" value={Number(point[axis].toFixed(1))} onChange={e => { if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) updatePoint({ [axis]: Math.max(0, Math.min(1219.2, e.target.valueAsNumber)) }); }} /> mm</label>)}
        <label><input type="checkbox" checked={point.heading !== undefined} disabled={selected === -1} onChange={e => updatePoint({ heading: e.target.checked ? routePoses(start, steps)[selected! + 1].heading : undefined })} /> Quay khi đến điểm</label>
        {point.heading !== undefined && <label>Hướng <input aria-label="Hướng tại điểm" type="number" step="1" value={Number(point.heading.toFixed(1))} onChange={e => { if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) updatePoint({ heading: ((e.target.valueAsNumber % 360) + 360) % 360 }); }} />°</label>}
        <button className="sim-button" disabled={selected === -1} onClick={() => removeStep(selected!)}>Xóa điểm</button>
        <span>0° phải · 90° xuống · 180° trái · 270° lên</span>
      </> : <span>Bấm chọn hoặc kéo điểm trên sa bàn để hiệu chỉnh.</span>}
    </fieldset>}
    <div hidden={!showTools} className="route-hint">{drawing && !locked ? 'Bấm trên sa bàn để nối điểm' : 'Đặt robot rồi chọn Vẽ đường'} · {steps.length} bước · Dò line dùng trên vạch đen</div>
  </>;
  const preview = <section hidden={!docked && !previewOpen} className="route-preview" aria-label="Preview C++ lộ trình">
      <div className="route-preview-heading"><strong>Preview C++</strong><span>Chọn code để copy · Ctrl+A / Ctrl+C</span>
        <details className="route-steps"><summary>{steps.length} bước</summary><ol>{steps.map((s, i) => <li key={i}>{s.kind === 'move' ? (s.follow ? 'Dò line' : 'Đi thẳng') : s.kind === 'turn' ? 'Xoay ' + s.angle + '°' : s.kind === 'grab' ? 'Gắp' : 'Thả'} <button disabled={locked} aria-label={'Xóa bước ' + (i + 1)} onClick={() => removeStep(i)}>×</button></li>)}</ol></details>
      </div>
      <textarea aria-label="Code C++ lộ trình" readOnly spellCheck={false} value={generated.code} placeholder="Các lệnh move_tank, turn_two_wheels, open_hand, close_hand… sẽ hiện ở đây." />
      {generated.error && <output role="alert">{generated.error}</output>}
    </section>;
  return <div className="route-workspace">
    {!docked && <> 
    <div className="route-tab-bar">
      <button className="sim-button" aria-expanded={toolsOpen} onClick={() => { setToolsOpen(!toolsOpen); if (toolsOpen) { setDrawing(false); setEditing(false); } }}>Lộ trình <span>{steps.length} bước</span></button>
      <button className="sim-button" aria-expanded={previewOpen} onClick={() => setPreviewOpen(!previewOpen)}>Preview C++</button>
      <span>Sa bàn tương tác</span>
    </div>
 </>}
    {docked ? toolsHost && createPortal(controls, toolsHost) : controls}
    {children}
    {docked ? previewHost && createPortal(preview, previewHost) : preview}
  </div>;
}
