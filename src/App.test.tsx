import React from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./student/StudentIDE', () => ({
  StudentIDE: ({ onSourceChange }: { onSourceChange(source: string): void }) => {
    const [code, setCode] = React.useState('void loop(){ LbDelay(10); LbMission.end(); }');
    React.useEffect(() => onSourceChange(code), [code, onSourceChange]);
    return <textarea aria-label="Editor C++" value={code} onChange={e => setCode(e.target.value)} />;
  },
}));
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => {} }) as CanvasRenderingContext2D);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('IDE to simulator source connection', () => {
  it('shows current unsaved custom code and retains edits when returning to the IDE', () => {
    render(<App />);
    const source = 'void loop(){ LbMotion.runLR(-400,-400); LbDelay(1000); LbMission.end(); }';
    fireEvent.change(screen.getByLabelText('Editor C++'), { target: { value: source } });
    fireEvent.click(screen.getByRole('button', { name: /Simulator ->/ }));
    expect(screen.getByText(source, { selector: 'pre' })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Synapse City · 4 ft × 4 ft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '[>] Start' }));
    expect((screen.getByRole('button', { name: '[>] Start' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '<- IDE' }));
    expect((screen.getByLabelText('Editor C++') as HTMLTextAreaElement).value).toBe(source);
  });
});
