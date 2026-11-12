import {expect,it} from 'vitest';
import base from '../../docs/baseCode.cpp?raw';
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';

function setup(source=base){
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
 expect(bridge.getLogs().some(log=>log.includes('Line calibration:'))).toBe(true);
 expect(bridge.pressTouch(4)).toBe(true);advance(250);
 expect(bridge.getLogs()).toContain('MISSION ERROR: 11');bridge.stopExecution();
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
 expect(bridge.getLogs()).toEqual([]);expect(bridge.pressTouch(3)).toBe(false);bridge.stopExecution();
});
it('TB2B stops movement and blocks later moves until another TB1B press',()=>{
 const source=base.replace('// Chạy bài: đặt các lệnh nhiệm vụ tại đây.','Serial.println("RUN");move_tank(1000,1000,100);turn_two_wheels(1000,90);move_tank(1000,1000,100);');
 const {robot,bridge,advance}=setup(source);advance(100);bridge.pressTouch(2);advance(500);
 expect(robot.getRobotPose().x).toBeGreaterThan(500);
 bridge.pressTouch(8);advance(300);const stopped={...robot.getRobotPose()};advance(500);
 expect(robot.getRobotPose()).toEqual(stopped);
 expect(bridge.getLogs().filter(log=>log.startsWith('MISSION RESET:'))).toHaveLength(1);
 bridge.pressTouch(2);advance(500);
 expect(bridge.getLogs().filter(log=>log==='RUN')).toHaveLength(2);
 expect(robot.getRobotPose().x).toBeGreaterThan(stopped.x);bridge.stopExecution();
});
