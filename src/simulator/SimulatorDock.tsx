import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MessageCircle, X } from 'lucide-react';

export interface DockPanel { id: string; label: string; icon: ReactNode; content: ReactNode }
export function SimulatorDock({ panels, children, logEvent, onPanelChange }: {
  panels: DockPanel[]; children: ReactNode; logEvent?: object; onPanelChange?(id: string | null): void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(0);
  const lastLog = useRef<object>();
  const toggle = (id: string | null) => {
    const next = active === id ? null : id;
    setActive(next); onPanelChange?.(next);
    if (next === 'logs') setUnread(0);
  };
  useEffect(() => {
    if (logEvent && logEvent !== lastLog.current) {
      lastLog.current = logEvent;
      if (active !== 'logs') { setUnread(n => n + 1); setPulse(n => n + 1); }
    }
  }, [logEvent, active]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setActive(null); onPanelChange?.(null); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onPanelChange]);
  return <div className={`sim-dock-layout ${active ? 'has-panel' : ''}`}>
    <main className="sim-dock-board">{children}</main>
    <aside className="sim-dock-content" aria-hidden={!active} aria-label="Bảng tính năng">
      <header className="sim-section-heading"><strong>{panels.find(p => p.id === active)?.label}</strong><button className="sim-button icon-only" aria-label="Đóng bảng tính năng" onClick={() => toggle(null)}><X size={16} /></button></header>
      {panels.map(panel => <section id={`sim-panel-${panel.id}`} key={panel.id} hidden={active !== panel.id} aria-label={panel.label} className="sim-dock-pane">{panel.content}</section>)}
    </aside>
    <nav className="sim-dock-rail" aria-label="Các tính năng giả lập">
      {panels.map(panel => <button key={panel.id} className={`sim-dock-tab ${panel.id === 'logs' ? 'sim-chat-bubble' : ''}`} aria-expanded={active === panel.id} aria-controls={`sim-panel-${panel.id}`} onClick={() => toggle(panel.id)} title={panel.label}>
        <span key={panel.id === 'logs' ? pulse : panel.id} className={panel.id === 'logs' && unread ? 'sim-notification-pulse' : ''}>{panel.id === 'logs' ? <MessageCircle size={21} /> : panel.icon}</span>
        <span>{panel.label}</span>
        {panel.id === 'logs' && unread > 0 && <b className="sim-unread" aria-label={`${unread} log mới`}>{unread > 99 ? '99+' : unread}</b>}
      </button>)}
    </nav>
    <span className="sim-sr-only" role="status">{unread > 0 ? `${unread} thông báo nhật ký chưa đọc` : ''}</span>
  </div>;
}
