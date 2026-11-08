import {describe,expect,it} from 'vitest';
import {RobotSimulator} from './robotSimulator';
import {fitGripperToBlock} from './robotGeometry';

describe('performance changes preserve simulation results',()=>{
  it('samples the display trace without skipping 1 ms physics or changing distance',()=>{
    const robot=new RobotSimulator();robot.reset({x:200,y:600,heading:0});robot.start();robot.setMotorSpeeds(65,65);
    for(let i=0;i<10000;i++)robot.advanceSimulatedTime(1);
    const state=robot.getSimulationState();
    expect(state.currentTime).toBe(10000);
    expect(state.robotState.pose.x).toBeCloseTo(850,5);
    expect(state.history.length).toBeLessThanOrEqual(501);
    expect(state.history.at(-1)!.timestamp).toBeGreaterThan(9979);
  });
  it('bounds display history during extended sessions',()=>{
    const robot=new RobotSimulator();robot.start();
    for(let i=0;i<6200;i++)robot.advanceSimulatedTime(20);
    expect(robot.getSimulationState().history).toHaveLength(6001);
    expect(robot.getSimulationState().currentTime).toBe(124000);
  });
  it('updates contact results when position, dimensions or commanded angles change',()=>{
    const shape={length:15,width:25,rotation:0,x:75,y:0};
    const contact=fitGripperToBlock(90,90,25,shape);
    contact.left=0; // Callers cannot corrupt the cached result.
    expect(fitGripperToBlock(90,90,25,shape).left).toBeGreaterThan(0);
    expect(fitGripperToBlock(90,90,25,{...shape,y:150})).toEqual({left:90,right:90});
    expect(fitGripperToBlock(0,0,25,shape)).toEqual({left:0,right:0});
    expect(fitGripperToBlock(90,90,50,{...shape,width:50}).left).toBeLessThan(fitGripperToBlock(90,90,25,shape).left);
  });
});
