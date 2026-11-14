import {expect,it} from 'vitest';
import rawBase from '../../docs/baseCode.cpp?raw';
import {configureBaseFeatures} from './baseFeatures';
const base=configureBaseFeatures(rawBase,[]);
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';

function setup(source=base.replace('const bool LINE_DEBUG = false;', 'const bool LINE_DEBUG = true;')){
 const robot=new RobotSimulator();robot.setBoard({name:'Test',width:2000,height:2000,lines:[],walls:[],obstacles:[],initialPose:{x:500,y:500,heading:0}});
 const bridge=new CppSimulatorBridge(robot);
 expect(bridge.loadCode(source)).toEqual({success:true});robot.start();bridge.startExecution(0);
 let time=0;
 return{robot,bridge,advance(ms:number){const end=time+ms;for(;time<=end;time+=5)bridge.executeStep(time);}};
}
it('loads the entire unmodified base and dispatches its calibration and WiFi buttons',()=>{
 const {bridge,advance}=setup();advance(100);
 expect(bridge.isProgramRunning()).toBe(true);expect(bridge.getLogs()).toEqual([]);
 expect(bridge.pressTouch(1)).toBe(true);advance(250);
 expect(bridge.getLogs().some(log=>log.includes('hiệu chuẩn nút chạm'))).toBe(true);
 expect(bridge.pressTouch(4)).toBe(true);advance(250);
 expect(bridge.getLogs()).toContain('MISSION ERROR: 13');bridge.stopExecution();
});
it('runs the user mission once, including a click immediately after Start',()=>{
 const source=base.replace('// Chạy bài: đặt các lệnh nhiệm vụ tại đây.','Serial.println("RUN");move_tank(1000,1000,2);');
 const {robot,bridge,advance}=setup(source);
 expect(bridge.pressTouch(2)).toBe(true);expect(bridge.pressTouch(2)).toBe(false);
 advance(1700);expect(bridge.getLogs().filter(log=>log==='RUN')).toHaveLength(1);
 expect(robot.getRobotPose().x).toBeCloseTo(520,0);
 advance(300);expect(bridge.getLogs().filter(log=>log==='RUN')).toHaveLength(1);
 expect(bridge.pressTouch(2)).toBe(true);advance(1700);
 expect(bridge.getLogs().filter(log=>log==='RUN')).toHaveLength(2);
 expect(robot.getRobotPose().x).toBeCloseTo(540,0);bridge.stopExecution();
});
it('does not retain a pending touch across pause, stop or restart',()=>{
 const {robot,bridge,advance}=setup();robot.pause();expect(bridge.pressTouch(2)).toBe(false);robot.resume();
 bridge.pressTouch(1);bridge.stopExecution();bridge.startExecution(0);advance(200);
 expect(bridge.getLogs()).toEqual([]);expect(bridge.pressTouch(5)).toBe(false);bridge.stopExecution();
});
it('TB2B has no effect on a running base mission',()=>{
 const source=base.replace('// Chạy bài: đặt các lệnh nhiệm vụ tại đây.','Serial.println("RUN");move_tank(1000,1000,100);');
 const {robot,bridge,advance}=setup(source);advance(100);bridge.pressTouch(2);advance(500);
 const before=robot.getRobotPose().x;
 bridge.pressTouch(8);advance(500);
 expect(robot.getRobotPose().x).toBeGreaterThan(before);
 expect(bridge.getLogs().some(log=>log.startsWith('MISSION RESET:'))).toBe(false);
 expect(bridge.getLogs().filter(log=>log==='RUN')).toHaveLength(1);
 bridge.stopExecution();
});
