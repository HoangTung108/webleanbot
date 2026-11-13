import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import base from '../../docs/baseCode.cpp?raw';
import App from '../App';
import {SimulatorPanel} from '../components/SimulatorPanel';
const source = vi.hoisted(() => ({ current: '' }));
vi.mock('../student/StudentIDE',()=>({StudentIDE:({onSourceChange}:{onSourceChange(source:string):void})=>{
 React.useEffect(()=>onSourceChange(source.current),[onSourceChange]);return <span>Base code</span>;
}}));
beforeEach(()=>{source.current=base;});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
function setupFrames(){
 let now=0,id=0;const frames=new Map<number,FrameRequestCallback>();
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({},{get:()=>()=>{}}) as CanvasRenderingContext2D);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++id,callback);return id;});
 vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
 return (ms=300)=>{for(let i=0;i<ms/20;i++)act(()=>{now+=20;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));});};
}
it('loads current base, exposes its buttons and shows its Serial diagnostics',()=>{
 const advance=setupFrames();
 render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Simulator'}));
 expect(screen.getByRole('button',{name:'TB1A · Line'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Chạy'}));
 fireEvent.click(screen.getByRole('button',{name:'TB1A · Line'}));advance();
 fireEvent.click(screen.getByRole('button',{name:/^Logs/}));
 expect(screen.getByRole('log')).toHaveTextContent('Line giả lập dùng cảm biến lý tưởng');
 fireEvent.click(screen.getByRole('button',{name:'TB2A · WiFi'}));advance();
 expect(screen.getByRole('log')).toHaveTextContent('MISSION ERROR: 11');
 fireEvent.click(screen.getByRole('button',{name:'Dừng'}));expect(screen.getByRole('button',{name:'TB1A + TB1B · Bài'})).toBeDisabled();
});

it('runs a base mission from TB1B, resets a blocking move and starts a fresh run',()=>{
 const advance=setupFrames();
 source.current=base.replace('// Chạy bài: đặt các lệnh nhiệm vụ tại đây.',
   'Serial.println("MISSION STARTED");move_tank(1000,1000,100);Serial.println("MISSION FINISHED");');
 render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Simulator'}));
 fireEvent.click(screen.getByRole('button',{name:'Chạy'}));
 fireEvent.click(screen.getByRole('button',{name:'TB1A + TB1B · Bài'}));advance(500);
 fireEvent.click(screen.getByRole('button',{name:/^Logs/}));
 expect(screen.getByRole('log')).toHaveTextContent('MISSION STARTED');
 expect(screen.getByRole('log')).not.toHaveTextContent('MISSION FINISHED');
 fireEvent.click(screen.getByRole('button',{name:'Tạm dừng'}));
 expect(screen.getByRole('button',{name:'TB2B · Reset'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Tiếp tục'}));
 fireEvent.click(screen.getByRole('button',{name:'TB2B · Reset'}));advance();
 expect(screen.getByRole('log')).toHaveTextContent('MISSION RESET:');
 fireEvent.click(screen.getByRole('button',{name:'TB1A + TB1B · Bài'}));advance(500);
 expect(screen.getByRole('log').textContent?.match(/MISSION STARTED/g)).toHaveLength(2);
});

it('dispatches base touch buttons from the standalone simulator panel',()=>{
 const advance=setupFrames();
 const status=vi.fn();
 render(<SimulatorPanel isVisible cppCode={base.replace('// Chạy bài: đặt các lệnh nhiệm vụ tại đây.',
   'move_tank(1000,1000,2);LbMission.end();')} onStatusChange={status}/>);
 expect(screen.getByRole('button',{name:'TB1A + TB1B · Bài'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:/Start/}));
 fireEvent.click(screen.getByRole('button',{name:'TB1A + TB1B · Bài'}));advance(2000);
 expect(screen.getByRole('button',{name:'TB1A + TB1B · Bài'})).toBeDisabled();
 expect(screen.getByRole('button',{name:/Start/})).toBeEnabled();
 expect(status.mock.calls.map(([message])=>message)).toEqual(['Simulation started']);
});
