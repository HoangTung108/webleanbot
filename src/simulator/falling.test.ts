import { describe, expect, it } from 'vitest';
import { RobotSimulator } from './robotSimulator';
import { CppSimulatorBridge } from './cppBridge';
import { SYNAPSE_CITY } from './boardConfigs';

describe('unsupported mat edges', () => {
  it('permits overhang and then drifts and falls off instead of clamping', () => {
    const robot=new RobotSimulator();
    robot.reset({x:SYNAPSE_CITY.width-5,y:600,heading:0});robot.start();robot.setMotorSpeeds(70,70);
    robot.advanceSimulatedTime(100);
    expect(robot.getRobotPose().x).toBeGreaterThan(SYNAPSE_CITY.width);
    expect(robot.getFallState().status).toBe('supported'); // COM still supported.
    robot.advanceSimulatedTime(300);
    expect(robot.getFallState().status).toBe('falling');
    const x=robot.getRobotPose().x;
    robot.advanceSimulatedTime(400);
    expect(robot.getFallState().status).toBe('fallen');
    expect(robot.getRobotPose().x).toBeGreaterThan(x);
    expect(robot.getFallState().drop).toBe(750);
    expect(robot.getSimulationState().isRunning).toBe(false);
    robot.start();expect(robot.getSimulationState().isRunning).toBe(false);
    robot.reset();expect(robot.getFallState().status).toBe('supported');
    robot.start();expect(robot.getSimulationState().isRunning).toBe(true);
  });
  it.each([1,10])('stops C++ and reports the fall even if the program ends at the edge (%sx)', speed => {
    const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot);
    robot.reset({x:SYNAPSE_CITY.width+25,y:600,heading:0});robot.setSpeedMultiplier(speed);
    bridge.loadCode('void loop(){ LbDelay(1); LbMission.end(); }');robot.start();bridge.startExecution();
    expect(()=>{for(let t=0;t<=1000 && bridge.isExecuting();t+=10)bridge.executeStep(t)}).toThrow('Robot đã rơi khỏi sa bàn');
    expect(robot.getFallState().status).toBe('fallen');expect(bridge.isExecuting()).toBe(false);
    expect(robot.getSimulationState().robotState.velocityLeft).toBe(0);
  });
  it('drops a held block when support is lost', () => {
    const robot=new RobotSimulator(),site=robot.mission.slots('pollution')[0];
    const block=robot.mission.place('pollution','red',site.x,site.y);
    robot.reset({x:site.x-75,y:site.y,heading:0});robot.setGripper(90,90);
    expect(robot.mission.heldBlock).toBeTruthy();
    robot.setPose({x:SYNAPSE_CITY.width+30,y:600,heading:0});robot.start();robot.advanceSimulatedTime(5);
    expect(robot.getFallState().status).toBe('falling');
    expect(robot.mission.blocks.find(b=>b.id===block.id)?.held).toBe(false);
  });
});
