import {describe,expect,it,vi} from 'vitest';
import {RobotSimulator} from './robotSimulator';
import {CppSimulatorBridge} from './cppBridge';
import {SYNAPSE_CITY} from './boardConfigs';

function setup(code='void loop(){LbDelay(1000);LbMission.end();}'){
  const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot);
  robot.reset({x:600,y:900,heading:0});expect(bridge.loadCode(code).success).toBe(true);
  robot.start();bridge.startExecution();bridge.executeStep(0);return {robot,bridge};
}
describe('bounded playback with deterministic physics',()=>{
  it('retains work deferred by a frame budget and completes without losing time',()=>{
    const {robot,bridge}=setup();let clock=0;
    const spy=vi.spyOn(performance,'now').mockImplementation(()=>clock++);
    try {
      bridge.executeStep(1000,3);
      expect(robot.getSimulationState().currentTime).toBe(10);
      expect(bridge.isExecuting()).toBe(true);
    }finally{spy.mockRestore();}
    bridge.executeStep(1000);
    expect(robot.getSimulationState().currentTime).toBe(1000);
    expect(bridge.isExecuting()).toBe(false);
  });
  it('carries sub-step time between display frames and ignores invalid clocks',()=>{
    const {robot,bridge}=setup();
    for(let t=1;t<=4;t++)bridge.executeStep(t);
    expect(robot.getSimulationState().currentTime).toBe(0);
    bridge.executeStep(NaN);bridge.executeStep(2);bridge.executeStep(5);
    expect(robot.getSimulationState().currentTime).toBe(5);
  });
  it('keeps already queued time at its original rate when speed changes',()=>{
    const {robot,bridge}=setup('void loop(){LbDelay(5000);LbMission.end();}');
    bridge.executeStep(100,0); // Queue 100 ms at 1x without processing it yet.
    robot.setSpeedMultiplier(10);bridge.executeStep(110);
    expect(robot.getSimulationState().currentTime).toBe(200);
    robot.pause();bridge.executeStep(5000);robot.resume();bridge.resetClock(5000);
    bridge.executeStep(5010);
    expect(robot.getSimulationState().currentTime).toBe(300);
  });
  it('produces the same fall with a large update as with individual physics steps',()=>{
    function fall(steps:number[]){
      const robot=new RobotSimulator();robot.reset({x:SYNAPSE_CITY.width-10,y:600,heading:0});
      robot.start();robot.setMotorSpeeds(65,65);for(const dt of steps)robot.advanceSimulatedTime(dt);
      return {pose:robot.getRobotPose(),fall:robot.getFallState(),time:robot.getSimulationState().currentTime};
    }
    expect(fall([1000])).toEqual(fall(Array(200).fill(5)));
  });
  it('keeps grasp, turning, release and block physics identical across FPS and playback rates',()=>{
    function run(frame:number,multiplier:number){
      const {robot,bridge}=setup(`void loop(){
        LbGripper.moveToLR(90,90,100);LbMotion.runLR(-2000,-2000);LbDelay(500);LbMotion.stopAndWait();
        LbMotion.runLR(2000,-2000);LbMotion.waitRotationDeg(80);LbMotion.stopAndWait();
        LbGripper.moveToLR(0,0,100);LbDelay(700);LbMission.end();
      }`);
      const site=robot.mission.slots('pollution')[0],b=robot.mission.place('pollution','green',site.x,site.y);
      Object.assign(b,{x:675,y:900,rotation:0});robot.setSpeedMultiplier(multiplier);
      for(let t=frame;t<10000&&bridge.isExecuting();t+=frame)bridge.executeStep(t);
      expect(bridge.isExecuting()).toBe(false);
      return {pose:robot.getRobotPose(),x:b.x,y:b.y,rotation:b.rotation,tilt:b.tilt,held:b.held,state:b.state,time:robot.getSimulationState().currentTime};
    }
    const reference=run(5,1);
    for(const [frame,multiplier] of [[16.6666667,1],[37.3,2],[33.3333333,5],[125.3,10]])expect(run(frame,multiplier)).toEqual(reference);
  });
});

describe('speed changes inside a turn',()=>{
  it('preserves the current turn and applies 10x only after the click timestamp',()=>{
    const {robot,bridge}=setup('void loop(){LbMotion.runLR(2000,-2000);LbMotion.waitRotationDeg(90);LbMotion.stopAndWait();LbMotion.runLR(2000,2000);LbDelay(100);LbMission.end();}');
    bridge.executeStep(200);const before=robot.getRobotPose();
    bridge.setPlaybackSpeed(10,235,Infinity);
    expect(robot.getSimulationState().currentTime).toBe(235);
    expect(robot.getRobotPose().heading).toBeGreaterThan(before.heading);
    expect(robot.getSimulationState().robotState.velocityLeft).toBe(65);
    expect(robot.getSimulationState().robotState.velocityRight).toBe(-65);
    bridge.executeStep(400);
    expect(bridge.isExecuting()).toBe(false);
    expect(robot.getRobotPose().heading).toBeCloseTo(90,5);
    expect(robot.getRobotPose().x).toBeCloseTo(600,5);
    expect(robot.getRobotPose().y).toBeCloseTo(906.5,5);
  });
});
