import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('button', { name: 'Simulator' }));
    fireEvent.click(screen.getByText('Chương trình C++'));
    expect(screen.getByText(source, { selector: 'pre' })).toBeTruthy();
    expect(screen.queryByRole('combobox', {name:/sa bàn/i})).toBeNull();
    expect(screen.getByText('Synapse City · 4 ft × 4 ft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    expect((screen.getByRole('button', { name: 'Chạy' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'IDE' }));
    expect((screen.getByLabelText('Editor C++') as HTMLTextAreaElement).value).toBe(source);
  });
  it('shows missing-code errors in the log and allows clearing them', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Editor C++'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simulator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    expect(screen.getByRole('log').textContent).toContain('Chưa có code C++');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa nhật ký' }));
    expect(screen.getByRole('log').textContent).toContain('Chưa có hoạt động');
  });

  it('creates category missions and records V6 raw score on completion, clearing it on reset', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Editor C++'), {target:{value:'void loop(){ LbMission.end(); }'}});
    fireEvent.click(screen.getByRole('button',{name:'Simulator'}));
    fireEvent.change(screen.getByLabelText('Hạng mục thi đấu'),{target:{value:'master'}});
    fireEvent.click(screen.getByRole('button',{name:'Tạo nhiệm vụ Master'}));
    expect(screen.getByText('7 pollution · 3 neutralizers')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Chạy'}));
    const callback=vi.mocked(requestAnimationFrame).mock.calls.at(-1)![0];
    act(()=>callback(0));
    expect(screen.getByLabelText('Raw Score').textContent).toBe('40');
    expect(screen.getByText('C++ đã kết thúc',{exact:true})).toBeTruthy();
    fireEvent.click(screen.getByText('Normalized Score',{exact:true}));
    fireEvent.change(screen.getByLabelText('Top 5 Raw Score'),{target:{value:'535, 530, 390, 140, 125'}});
    expect(screen.getByLabelText('Normalized Score').textContent).toBe('116.3');
    fireEvent.click(screen.getByRole('button',{name:'Đặt lại mô phỏng'}));
    expect(screen.getByLabelText('Raw Score').textContent).toBe('—');
  });

  it('treats the Stop button as STOP and records the final score', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Editor C++'),{target:{value:'void loop(){ LbDelay(1000000); }'}});
    fireEvent.click(screen.getByRole('button',{name:'Simulator'}));
    fireEvent.click(screen.getByRole('button',{name:'Chạy'}));
    fireEvent.click(screen.getByRole('button',{name:'Dừng'}));
    expect(screen.getByLabelText('Raw Score').textContent).toBe('40');
    expect(screen.getByText('STOP · kết thúc lượt',{exact:true})).toBeTruthy();
  });

});

it('preserves the announced field across IDE navigation, freezes code, and waits for STOP after program end',()=>{
 render(<App/>);
 fireEvent.change(screen.getByLabelText('Editor C++'),{target:{value:'void loop(){LbMission.end();}'}});
 fireEvent.click(screen.getByRole('button',{name:'Simulator'}));
 fireEvent.change(screen.getByLabelText('Chế độ giả lập'),{target:{value:'competition'}});
 fireEvent.change(screen.getByLabelText('Hạng mục thi đấu'),{target:{value:'innovator'}});
 fireEvent.click(screen.getByRole('button',{name:'Công bố vị trí · Vòng 1'}));
 expect(screen.getByText(/Màu pollution được giấu/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'IDE'}));
 fireEvent.click(screen.getByRole('button',{name:'Simulator'}));
 expect(screen.getByRole('button',{name:'Khóa code · Cách ly'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Khóa code · Cách ly'}));
 expect((screen.getByRole('button',{name:'IDE'}) as HTMLButtonElement).disabled).toBe(true);
 // Simulate an external editor update; execution must use the frozen source.
 fireEvent.change(screen.getByLabelText('Editor C++'),{target:{value:'void loop(){unknown();}'}});
 fireEvent.click(screen.getByRole('button',{name:'Công bố màu'}));
 fireEvent.click(screen.getByRole('button',{name:'Chạy'}));
 const callback=vi.mocked(requestAnimationFrame).mock.calls.at(-1)![0];act(()=>callback(0));
 expect(screen.getByLabelText('Raw Score').textContent).toBe('—');
 expect((screen.getByRole('button',{name:'Tạm dừng'}) as HTMLButtonElement).disabled).toBe(true);
 expect(screen.getByText('Chờ chốt lượt')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Dừng'}));
 expect(screen.getByText(/Vòng 1: 40 điểm/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Chuẩn bị vòng 2'}));
 expect(screen.getByRole('button',{name:'Công bố vị trí · Vòng 2'})).toBeTruthy();
 expect(screen.getByText(/Vòng 1: 40 điểm/)).toBeTruthy();
});
