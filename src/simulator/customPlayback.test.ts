import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {CppSimulatorBridge} from './cppBridge';
import {RobotSimulator} from './robotSimulator';
const source=readFileSync(new URL('./fixtures/custom-mission.ino',import.meta.url),'utf8');
function run(multiplier:number,switchAt?:number){
 const robot=new RobotSimulator();robot.setBoard({name:'Large test surface',width:5000,height:5000,walls:[],obstacles:[],lines:[],initialPose:{x:2500,y:2500,heading:270}});
 const bridge=new CppSimulatorBridge(robot);
 const instrumented=source.replace('  LbMission.end();','  Serial.println(LbMotion.getDistanceMm());Serial.println(LbMotion.getRotationDeg());Serial.println(millis());LbMission.end();');
 expect(bridge.loadCode(instrumented).success).toBe(true);robot.setSpeedMultiplier(switchAt===undefined?multiplier:1);robot.start();bridge.startExecution();
 let switched=false;
 for(let wall=0;wall<120000&&bridge.isExecuting();wall+=16.6666667){
  bridge.executeStep(wall,8);
  if(!switched&&switchAt!==undefined&&wall>=switchAt){bridge.setPlaybackSpeed(multiplier,wall+0.37,8);switched=true;}
 }
 const [distance,rotation,time]=bridge.getLogs().map(Number);
 expect(bridge.isExecuting()).toBe(false);
 expect(rotation).toBeCloseTo((22+133-32)*1.05,1);
 return {pose:robot.getRobotPose(),distance,rotation,time,running:bridge.isExecuting()};
}
describe('supplied custom mission at fast playback',()=>{
 it('completes the old turn controller identically at 1x and 10x',()=>{expect(run(10)).toEqual(run(1));},15000);
 it.each([200,1800,7600])('preserves the old turn controller when switching to 10x at %s ms',at=>{expect(run(10,at)).toEqual(run(1));},15000);
});
