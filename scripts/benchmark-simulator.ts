import {RobotSimulator} from '../src/simulator/robotSimulator';

// Repeatable CPU benchmark: 10 simulated seconds, 1 ms feedback, 14 blocks.
// Reports computation time, not browser FPS; no machine-dependent pass threshold.
const durations:number[]=[];
let points=0;
for(let run=0;run<3;run++) {
  const robot=new RobotSimulator();robot.reset({x:600,y:900,heading:0});
  robot.mission.randomize(8,6,123);
  Object.assign(robot.mission.blocks[0],{x:675,y:900,rotation:0});
  robot.start();robot.setGripper(90,90);robot.setMotorSpeeds(5,5);
  const start=performance.now();
  for(let i=0;i<10000;i++){robot.advanceSimulatedTime(1);if(i%16===0)robot.getGripper();}
  durations.push(performance.now()-start);points=robot.getSimulationState().history.length;
  if(!robot.mission.heldBlock)throw new Error('Benchmark lost its carried block');
}
console.log(JSON.stringify({scenario:'14 blocks, held object, 10000 × 1 ms',runsMs:durations.map(n=>Math.round(n)),medianMs:Math.round([...durations].sort((a,b)=>a-b)[1]),historyPoints:points},null,2));
