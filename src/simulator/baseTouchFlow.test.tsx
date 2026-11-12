import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import base from '../../docs/baseCode.cpp?raw';
import App from '../App';
vi.mock('../student/StudentIDE',()=>({StudentIDE:({onSourceChange}:{onSourceChange(source:string):void})=>{
 React.useEffect(()=>onSourceChange(base),[onSourceChange]);return <span>Base code</span>;
}}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('loads current base, exposes its buttons and shows its Serial diagnostics',()=>{
 let now=0,id=0;const frames=new Map<number,FrameRequestCallback>();
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({},{get:()=>()=>{}}) as CanvasRenderingContext2D);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++id,callback);return id;});
 vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
 const advance=()=>{for(let i=0;i<15;i++)act(()=>{now+=20;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));});};
 render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Simulator'}));
 expect(screen.getByRole('button',{name:'TB1A · Line'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Chạy'}));
 fireEvent.click(screen.getByRole('button',{name:'TB1A · Line'}));advance();
 fireEvent.click(screen.getByRole('button',{name:/^Logs/}));
 expect(screen.getByRole('log')).toHaveTextContent('Line calibration:');
 fireEvent.click(screen.getByRole('button',{name:'TB2A · WiFi'}));advance();
 expect(screen.getByRole('log')).toHaveTextContent('MISSION ERROR: 11');
 fireEvent.click(screen.getByRole('button',{name:'Dừng'}));expect(screen.getByRole('button',{name:'TB1B · Bài'})).toBeDisabled();
});
