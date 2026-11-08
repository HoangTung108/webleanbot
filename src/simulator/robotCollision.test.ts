import {describe,expect,it} from 'vitest';
import {robotContact,separateRobots,ROBOT_ENVELOPE} from './robotCollision';
import {RobotSimulator} from './robotSimulator';
const a={x:600,y:600,heading:0};
describe('shared online robot dimensions and collisions',()=>{
  it('uses the measured 180 x 120 mm footprint around the drive axle',()=>{
    expect(ROBOT_ENVELOPE).toEqual({x:-92,y:-60,length:180,width:120});
    expect(robotContact(a,{...a,x:780})).toBeNull();
    expect(robotContact(a,{...a,y:720})).toBeNull();
    expect(robotContact(a,{...a,x:779})?.depth).toBeCloseTo(1);
  });
  it.each([0,30,90,180,270])('resolves rotated robots symmetrically at %s degrees',heading=>{
    const left={...a,heading},right={...a,x:640,y:610,heading:heading+45};
    const result=separateRobots(left,right)!;
    expect(result).not.toBeNull();expect(robotContact(result.a,result.b)).toBeNull();
    expect(result.a.x+result.b.x).toBeCloseTo(left.x+right.x);
    expect(result.a.y+result.b.y).toBeCloseTo(left.y+right.y);
    expect(left).toEqual({...a,heading});
  });
  it('blocks penetration into a remote robot during 10x-sized updates',()=>{
    const robot=new RobotSimulator();robot.reset({...a,x:500});
    const peer={pose:{...a,x:760}};robot.setRemoteRobots([peer]);robot.start();robot.setMotorSpeeds(65,65);
    for(let i=0;i<6;i++)robot.advanceSimulatedTime(500);
    expect(robotContact(robot.getRobotPose(),peer.pose)).toBeNull();
    expect(robot.getRobotPose().x).toBeCloseTo(580,1);
    expect(robot.getRobotPose().y).toBe(600);
  });
  it('clears obstacles when peers disconnect or fall',()=>{
    const robot=new RobotSimulator();robot.reset({...a,x:500});robot.setRemoteRobots([{pose:{...a,x:700},supported:false}]);
    robot.start();robot.setMotorSpeeds(65,65);robot.advanceSimulatedTime(1000);
    expect(robot.getRobotPose().x).toBeCloseTo(565);
    robot.setRemoteRobots([]);robot.advanceSimulatedTime(1000);expect(robot.getRobotPose().x).toBeCloseTo(630);
  });
  it('detects another robot with the distance sensor using its rotated hitbox',()=>{
    const robot=new RobotSimulator();robot.reset({...a,x:500});
    robot.setRemoteRobots([{pose:{...a,x:760}}]);expect(robot.getSensorReadings().distance).toBeCloseTo(128);
    robot.setRemoteRobots([{pose:{...a,x:760,heading:90}}]);expect(robot.getSensorReadings().distance).toBeCloseTo(160);
    robot.setRemoteRobots([]);expect(robot.getSensorReadings().distance).toBe(300);
  });
  it('accepts a server correction while running without stopping motors or losing a held block',()=>{
    const robot=new RobotSimulator();robot.reset(a);const site=robot.mission.slots('pollution')[0];
    const block=robot.mission.place('pollution','green',site.x,site.y);Object.assign(block,{x:675,y:600,rotation:0});
    robot.start();robot.setGripper(90,90);robot.setMotorSpeeds(65,65);robot.applyNetworkPose({...a,x:590});
    expect(block.held).toBe(true);expect(block.x).toBe(665);
    expect(robot.getSimulationState().isRunning).toBe(true);expect(robot.getSimulationState().robotState.velocityLeft).toBe(65);
    robot.applyNetworkPose({...a,x:NaN});expect(robot.getRobotPose().x).toBe(590);
  });
});
