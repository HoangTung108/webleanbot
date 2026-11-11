import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {SYNAPSE_CITY} from '../src/simulator/boardConfigs';
import {CompetitionFlow} from '../src/simulator/competitionFlow';
import {MissionWorld} from '../src/simulator/missionWorld';
import {RobotSimulator} from '../src/simulator/robotSimulator';
import {CppRuntime} from '../src/simulator/cppRuntime';
import {calculateScore,robotWithinCRL,ROUND_LIMIT_MS,SCORE_CATEGORIES} from '../src/simulator/scoring';
import {isFinitePose,separateRobots,robotContact} from '../src/simulator/robotCollision';
import type {OnlineCommand,OnlineCompetitionState} from '../src/simulator/onlineCompetition';
import type {Pose} from '../src/simulator/types';
interface Player {id:string;robot:RobotSimulator;view:MissionWorld;runtime?:CppRuntime;code?:string;locked:boolean;startPose?:Pose;connected:boolean}
export class OnlineCompetition {
 readonly sessionId=randomUUID();readonly world=new MissionWorld(SYNAPSE_CITY);readonly flow=new CompetitionFlow();
 readonly players=new Map<string,Player>();revision=0;frame=0;elapsedMs=0;rate=1;notice='';
 private iotAttributes=new Map<string,string>();
 private pending=0;private lastWall?:number;
 constructor(public ownerId:string,ids:string[]){for(const id of ids)this.addPlayer(id);this.resetField();}
 get canJoin(){return ['setup','preparation'].includes(this.flow.phase)&&![...this.players.values()].some(p=>p.locked);}
 addPlayer(id:string){
  if(this.players.has(id))return;
  if(!this.canJoin||this.players.size>=2)throw new Error('Phiên thi đã khóa danh sách robot.');
  const robot=new RobotSimulator();robot.missionStepEnabled=false;robot.peerCollisionEnabled=false;
  this.players.set(id,{id,robot,view:robot.mission,locked:false,connected:true});this.resetField();this.revision++;
 }
 removePlayer(id:string){
  const p=this.players.get(id);if(!p)return;p.connected=false;p.runtime?.stop();p.view.setGripper(0,0,p.robot.getRobotPose());
  if(this.flow.phase==='running')this.finish('Mất kết nối robot · STOP cả đội');
  this.players.delete(id);if(this.ownerId===id)this.ownerId=this.players.keys().next().value??'';
  if(['preparation','quarantine','ready'].includes(this.flow.phase)){this.flow.phase='preparation';this.players.forEach(p=>{p.locked=false;p.code=undefined;});this.notice='Thay đổi thành viên: cần khóa code lại.';this.resetField();}
  this.revision++;
 }
 private spawn(index:number):Pose {return {...SYNAPSE_CITY.initialPose!,x:SYNAPSE_CITY.initialPose!.x+(this.players.size===2?(index===0?-62:62):0)};}
 private resetField(){
  this.iotAttributes.clear();this.world.reset();let index=0;
  for(const p of this.players.values()){
   p.runtime?.stop();p.runtime=undefined;p.robot.reset(p.startPose??this.spawn(index));index++;
   const view=new MissionWorld(SYNAPSE_CITY,p.id);view.blocks=this.world.blocks;view.hidePollutionColors=this.world.hidePollutionColors;view.integrateFreeBodies=p===this.players.values().next().value;
   p.view=view;p.robot.mission=view;p.robot.missionStepEnabled=false;p.robot.peerCollisionEnabled=false;p.robot.start();
  }
  this.pending=0;this.lastWall=undefined;
 }
 private runtime(p:Player,code:string){
  return new CppRuntime(code,{motors:(l,r)=>p.robot.setMotorSpeeds(l,r),advance:dt=>p.robot.advanceSimulatedTime(dt*1000),gripper:(l,r,d)=>p.robot.setGripper(l,r,d),lineMask:()=>p.robot.getLineMask(),rawLine:()=>p.robot.getRawLineReadings(),color:()=>p.robot.getColorReading(),led:(rgb,b)=>p.robot.setLedColors(rgb,b),iotRead:(attr,asset)=>this.iotAttributes.get(JSON.stringify([asset,attr]))??'waiting',iotWrite:(attr,value,asset)=>{this.iotAttributes.set(JSON.stringify([asset,attr]),value);},sensors:()=>p.robot.getSensorReadings()});
 }
 command(id:string,cmd:OnlineCommand){
  const p=this.players.get(id);if(!p)throw new Error('Robot không thuộc phiên thi.');
  if(cmd.sessionId!==this.sessionId||cmd.round!==this.flow.round)throw new Error('Phiên/vòng đã thay đổi. Hãy chờ đồng bộ.');
  if(!['lock-code','practice-run','place-robot','stop'].includes(cmd.action)&&id!==this.ownerId)throw new Error('Chỉ chủ phòng điều khiển giai đoạn và tốc độ chung.');
  const category=cmd.category;
  if(cmd.action==='category'){
   if(this.flow.phase!=='setup'||this.flow.round!==1)throw new Error('Hạng mục đã khóa.');
   if(!category||!(category in SCORE_CATEGORIES))throw new Error('Hạng mục không hợp lệ.');this.flow.category=category;
  }else if(cmd.action==='announce'){
   if(this.players.size>SCORE_CATEGORIES[this.flow.category].robots)throw new Error('Số robot vượt giới hạn hạng mục. Chọn Innovator/Master cho hai robot.');
   this.players.forEach(p=>{p.locked=false;p.code=undefined;p.startPose=undefined;});
   this.flow.announce(this.world,this.flow.category,Math.floor(Math.random()*4294967296));this.resetField();this.elapsedMs=0;
  }else if(cmd.action==='practice-run'||cmd.action==='lock-code'){
   if(this.flow.phase!=='preparation'||p.locked)throw new Error('Code đã khóa hoặc chưa đến bước chuẩn bị.');
   if([...this.players.values()].some(p=>p.runtime?.running)&&cmd.action==='lock-code')throw new Error('Dừng lượt tập của cả đội trước khi cách ly.');
   if(typeof cmd.code!=='string'||!cmd.code.trim()||Buffer.byteLength(cmd.code)>256000)throw new Error('Code C++ trống hoặc vượt 256 KB.');
   const runtime=this.runtime(p,cmd.code); // Validate before accepting a frozen program.
   if(cmd.action==='practice-run'){p.runtime=runtime;p.robot.start();runtime.start();}
   else {
    if(!robotWithinCRL(SYNAPSE_CITY,p.robot.getRobotPose()))throw new Error('Toàn bộ robot phải ở CRL trước khi khóa code.');
    if([...this.players.values()].some(other=>other!==p&&robotContact(p.robot.getRobotPose(),other.robot.getRobotPose())))throw new Error('Hai robot đang chồng nhau.');
    p.code=cmd.code;p.locked=true;p.startPose=p.robot.getRobotPose();
    if([...this.players.values()].every(p=>p.locked)) {this.flow.phase='quarantine';this.resetField();}
   }
  }else if(cmd.action==='place-robot'){
   if(this.flow.phase!=='preparation'||p.locked||p.runtime?.running)throw new Error('Không thể đặt robot lúc này.');
   if(!isFinitePose(cmd.pose)||!robotWithinCRL(SYNAPSE_CITY,cmd.pose))throw new Error('Đặt toàn bộ robot trong CRL.');
   if([...this.players.values()].some(other=>other!==p&&robotContact(cmd.pose!,other.robot.getRobotPose())))throw new Error('Vị trí đặt chồng lên robot khác.');
   p.robot.applyNetworkPose(cmd.pose);
  }else if(cmd.action==='practice-reset'){
   if(this.flow.phase!=='preparation')throw new Error('Chỉ đặt lại lượt tập trước khi cách ly.');this.resetField();
  }else if(cmd.action==='reveal'){this.flow.reveal(this.world,Math.floor(Math.random()*4294967296));this.resetField();}
  else if(cmd.action==='start'){
   if(this.flow.phase!=='ready'||![...this.players.values()].every(p=>p.locked&&p.code))throw new Error('Chưa đủ robot khóa code và công bố màu.');
   this.resetField();this.elapsedMs=0;this.flow.phase='running';for(const actor of this.players.values()){actor.runtime=this.runtime(actor,actor.code!);actor.runtime.start();}
  }else if(cmd.action==='stop'){
   if(this.flow.phase==='running')this.finish('STOP · kết thúc lượt cả đội');
   else if(this.flow.phase==='preparation'){for(const actor of this.players.values()){actor.runtime?.stop();actor.robot.setMotorSpeeds(0,0);}}
   else throw new Error('Không có lượt đang chạy.');
  }else if(cmd.action==='speed'){
   if(![1,2,5,10].includes(cmd.speed??0))throw new Error('Mức tua không hợp lệ.');this.rate=cmd.speed!;
  }else if(cmd.action==='next'){this.flow.next();if(this.flow.phase==='setup')this.elapsedMs=0;this.players.forEach(p=>{p.locked=false;p.code=undefined;p.startPose=undefined;});}
  else if(cmd.action==='new'){
   if(this.flow.phase!=='complete')throw new Error('Hai vòng chưa kết thúc.');throw new Error('Tắt phiên thi rồi bật lại để tạo cuộc thi mới.');
  }else throw new Error('Lệnh phiên thi không hợp lệ.');
  this.revision++;
 }
 advanceWall(now:number,maxWorkMs=8){
  const delta=this.lastWall===undefined?0:Math.max(0,now-this.lastWall);this.lastWall=now;
  const active=this.flow.phase==='running'||(this.flow.phase==='preparation'&&([...this.players.values()].some(p=>p.runtime?.running)||this.world.hasMotion));
  if(!active){this.pending=0;return;}
  const remaining=this.flow.phase==='running'?ROUND_LIMIT_MS-this.elapsedMs:Infinity;
  this.pending=Math.min(this.pending+delta*this.rate,remaining);
  const deadline=Number.isFinite(maxWorkMs)?performance.now()+maxWorkMs:Infinity;
  while(this.pending>=1&&performance.now()<deadline){
   this.step();this.pending--;if(this.flow.phase==='running'){this.elapsedMs++;if(this.elapsedMs>=ROUND_LIMIT_MS){this.finish('Hết 120 giây · STOP cả đội');break;}}
   else if(this.flow.phase!=='preparation')break;
  }
  this.frame++;
 }
 private step(){
  const actors=[...this.players.values()];
  for(const p of actors){
   p.robot.setRemoteRobots(actors.filter(q=>q!==p&&q.robot.getFallState().status==='supported').map(q=>({pose:q.robot.getRobotPose()})));
   const before=p.robot.getSimulationState().currentTime;
   if(p.runtime?.running){try{p.runtime.tick(1);}catch(e){this.notice=`Robot ${p.id}: ${(e as Error).message}`;p.runtime.stop();}}
   const used=p.robot.getSimulationState().currentTime-before;
   if(used<1&&p.robot.getFallState().status!=='fallen')p.robot.advanceSimulatedTime(1-used);
   if(p.robot.getFallState().status!=='supported')p.runtime?.stop();
  }
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){
   const a=actors[i],b=actors[j];if(a.robot.getFallState().status!=='supported'||b.robot.getFallState().status!=='supported')continue;
   const pair=separateRobots(a.robot.getRobotPose(),b.robot.getRobotPose());if(pair){a.robot.applyNetworkPose(pair.a);b.robot.applyNetworkPose(pair.b);}
  }
  for(const p of actors){const s=p.robot.getSimulationState();p.view.step(.001,s.robotState.pose,s.robotState.velocityLeft,s.robotState.velocityRight);}
 }
 private finish(reason:string){
  if(this.flow.phase!=='running')return;
  for(const p of this.players.values()){p.runtime?.stop();p.robot.setMotorSpeeds(0,0);}
  for(let n=0;n<1000&&this.world.hasMotion;n++)for(const p of this.players.values())p.view.step(.005,p.robot.getRobotPose());
  const score=calculateScore(SYNAPSE_CITY,this.world.blocks,this.flow.category,[...this.players.values()].map(p=>({pose:p.robot.getRobotPose(),startPose:p.startPose,fallen:!p.connected||p.robot.getFallState().status!=='supported'})));
  this.flow.finish(score,this.elapsedMs,reason);this.pending=0;this.revision++;
 }
 snapshot():OnlineCompetitionState{
  const hidden=this.flow.delayedColors&&['preparation','quarantine'].includes(this.flow.phase);
  const layout=JSON.parse(this.flow.layout||this.world.serialize());if(hidden)for(const b of layout.blocks)if(b.kind==='pollution')b.color='mystery';
  return {sessionId:this.sessionId,revision:this.revision,frame:this.frame,ownerId:this.ownerId,round:this.flow.round,category:this.flow.category,phase:this.flow.phase,elapsedMs:this.elapsedMs,rate:this.rate,layout:JSON.stringify(layout),hiddenColors:hidden,notice:this.notice,
   blocks:this.world.blocks.map(b=>({...b,color:hidden&&b.kind==='pollution'?'mystery':b.color})),
   players:[...this.players.values()].map(p=>{const s=p.robot.getSimulationState();return{simulationTimeMs:s.currentTime,id:p.id,pose:p.robot.getRobotPose(),motorLeft:s.robotState.velocityLeft,motorRight:s.robotState.velocityRight,gripper:p.robot.getGripper(),rgb:p.robot.getLedColors(),fall:p.robot.getFallState(),supported:p.robot.getFallState().status==='supported',locked:p.locked,programRunning:p.runtime?.running??false,connected:p.connected};}),records:this.flow.records.map(r=>({...r,score:{...r.score}}))};
 }
 dispose(){for(const p of this.players.values())p.runtime?.stop();}
}
