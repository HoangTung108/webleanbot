import type {Pose} from './types';
import {seededRandom,type MissionWorld} from './missionWorld';
import {createScoringMission,robotWithinCRL,SCORE_CATEGORIES,type ScoreCategory,type ScoreResult} from './scoring';
export const COMPETITION_PHASE_LABELS={setup:'Chờ công bố vị trí',preparation:'Chuẩn bị và luyện tập',quarantine:'Cách ly · Code đã khóa',ready:'Sẵn sàng thực thi',running:'Đang thực thi',finished:'Đã chốt điểm',complete:'Hoàn thành 2 vòng'} as const;
export type CompetitionPhase='setup'|'preparation'|'quarantine'|'ready'|'running'|'finished'|'complete';
export interface RoundRecord {round:number;score:ScoreResult;timeMs:number;reason:string;configuration:string;tries:number}
/** Gameplay slides 9–15. One local field/session; no claimed shared-team scoring. */
export class CompetitionFlow {
  phase:CompetitionPhase='setup';round=1;category:ScoreCategory='explorer';
  frozenCode='';layout='';startPose?:Pose;records:RoundRecord[]=[];
  localCodeLocked=false;
  get locked(){return this.localCodeLocked||['quarantine','ready','running'].includes(this.phase);}
  get delayedColors(){return this.category==='innovator'||this.category==='master';}
  announce(world:MissionWorld,category:ScoreCategory,seed:number){
    if(this.phase!=='setup')throw new Error('Chỉ công bố cấu hình ở đầu vòng.');
    this.category=category;
    const sites=(layout:string)=>JSON.parse(layout).blocks.map((b:{kind:string;slotId:string})=>`${b.kind}:${b.slotId}`).sort().join('|');
    for(let attempt=0;attempt<100;attempt++) {
      createScoringMission(world,category,seed+attempt);
      if(!this.records.some(r=>sites(r.configuration)===sites(world.serialize())))break;
      if(attempt===99)throw new Error('Không tạo được cấu hình mới cho vòng này.');
    }
    this.layout=world.serialize();this.frozenCode='';this.startPose=undefined;
    world.hidePollutionColors=this.delayedColors;this.phase='preparation';world.changed();
  }
  quarantine(world:MissionWorld,code:string,pose:Pose){
    if(this.phase!=='preparation')throw new Error('Cần hoàn tất bước chuẩn bị trước khi cách ly.');
    if(!code.trim())throw new Error('Cần có chương trình C++ trước khi khóa code.');
    if(!robotWithinCRL(world.board,pose))throw new Error('Đưa toàn bộ robot về CRL trước khi cách ly.');
    this.frozenCode=code;this.startPose={...pose};this.phase='quarantine';
  }
  reveal(world:MissionWorld,seed:number){
    if(this.phase!=='quarantine')throw new Error('Code phải được khóa trước khi công bố màu.');
    const data=JSON.parse(this.layout);
    if(this.delayedColors){
      const random=seededRandom(seed),colors=[...SCORE_CATEGORIES[this.category].pollution];
      for(let i=colors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}
      let index=0;for(const block of data.blocks)if(block.kind==='pollution')block.color=colors[index++];
    }
    world.load(JSON.stringify(data));world.hidePollutionColors=false;this.layout=world.serialize();
    this.phase='ready';world.changed();
  }
  start(world:MissionWorld){
    if(this.phase!=='ready'||!this.startPose)throw new Error('Cần khóa code và công bố màu trước khi bắt đầu vòng.');
    world.load(this.layout);world.hidePollutionColors=false;this.phase='running';
    return {code:this.frozenCode,pose:{...this.startPose}};
  }
  finish(score:ScoreResult,timeMs:number,reason:string){
    if(this.phase!=='running')return;
    this.records.push({round:this.round,score:{...score},timeMs,reason,configuration:this.layout,tries:1});this.phase='finished';
  }
  next(){
    if(this.phase!=='finished')throw new Error('Vòng hiện tại chưa kết thúc.');
    if(this.round===2){this.phase='complete';return;}
    this.round=2;this.phase='setup';this.frozenCode='';this.startPose=undefined;
  }
}
