import {describe,expect,it} from 'vitest';
import {SYNAPSE_CITY} from './boardConfigs';
import {CppSimulatorBridge} from './cppBridge';
import {RobotSimulator} from './robotSimulator';

describe('measured approach and timed C++ pickup',()=>{
  const sites=[...SYNAPSE_CITY.storageSites!.map(s=>({...s,kind:'neutralizer' as const,heading:Number(s.id.slice(1))%2?90:0})),...SYNAPSE_CITY.cityZones!.map(z=>({...z.sites[0],kind:'pollution' as const,heading:z.sites[0].rotation}))];
  for(const site of sites) it(`approaches, closes and carries ${site.id}`,()=>{
    const robot=new RobotSimulator(),bridge=new CppSimulatorBridge(robot),a=site.heading*Math.PI/180;
    robot.reset({x:site.x-140*Math.cos(a),y:site.y-140*Math.sin(a),heading:site.heading});
    const b=robot.mission.place(site.kind,'green',site.x,site.y);
    expect(bridge.loadCode(`void loop(){
      LbMotion.runLR(2000,2000); LbDelay(1000); LbMotion.stopAndWait();
      LbGripper.moveToLR(90,90,100); LbDelay(100);
      LbMotion.runLR(-2000,-2000); LbDelay(500); LbMotion.stopAndWait(); LbMission.end();
    }`).success).toBe(true);
    robot.start();bridge.startExecution();
    for(let t=0;t<=2500&&bridge.isExecuting();t+=16)bridge.executeStep(t);
    expect(bridge.isExecuting()).toBe(false);
    expect(b.held).toBe(true);
    expect(b.x).toBeCloseTo(site.x-32.5*Math.cos(a),5);
    expect(b.y).toBeCloseTo(site.y-32.5*Math.sin(a),5);
    robot.setGripper(0,0,100);robot.advanceSimulatedTime(100);
    expect(b.held).toBe(false);
  });
});
