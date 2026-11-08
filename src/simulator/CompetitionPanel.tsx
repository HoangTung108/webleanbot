import type {OnlineCompetitionState} from './onlineCompetition';
import {useState} from 'react';
import {CompetitionFlow,COMPETITION_PHASE_LABELS} from './competitionFlow';
import {normalizeScore} from './scoring';
export type CompetitionAction='announce'|'quarantine'|'reveal'|'next'|'new';
export function CompetitionPanel({flow,enabled,running,onMode,onAction,online,clientId,isHost=true}:{online?:OnlineCompetitionState|null;clientId?:string;isHost?:boolean;flow:CompetitionFlow;enabled:boolean;running:boolean;onMode(enabled:boolean):void;onAction(action:CompetitionAction):void}){
 const [topFive,setTopFive]=useState(['','']);
 const normalized=flow.records.map((r,i)=>{try{return normalizeScore(r.score.total,topFive[i].trim().split(/[,;\s]+/).map(Number)).normalized;}catch{return undefined;}});
 return <section className="sim-scoring" aria-label="Luồng thi đấu">
  <div className="sim-section-heading"><strong>Luồng nhiệm vụ</strong><span>Gameplay · 02/03/2026</span></div>
  <div className="sim-score-body">
   <label className="sim-category">Chế độ<select aria-label="Chế độ giả lập" value={enabled?'competition':'practice'} disabled={running||flow.locked||(!!online&&!isHost)} onChange={e=>onMode(e.target.value==='competition')}><option value="practice">Luyện tập tự do</option><option value="competition">Thi đấu mô phỏng · 2 vòng</option></select></label>
   {enabled&&<>
    <p><strong>Vòng {flow.round} / 2</strong> · {COMPETITION_PHASE_LABELS[flow.phase]}</p>
    {online&&<p className="sim-score-help">Phiên chung · {isHost?'Chủ phòng':'Thành viên'} · {online.players.map((p,i)=>`Robot ${i+1}${p.id===clientId?' (bạn)':''}: ${p.locked?'đã khóa code':'chưa khóa code'}`).join(' · ')}<br/>Đồng hồ, khối và điểm đội do máy chủ tính. Chủ phòng điều khiển giai đoạn; mỗi người khóa code của mình.</p>}
    <ol className="sim-flow-steps"><li>Công bố vị trí{!flow.delayedColors?' và màu':''}</li><li>Chuẩn bị</li><li>Cách ly · Khóa code</li><li>{flow.delayedColors?'Công bố màu · ':''}Chạy tối đa 2 phút</li></ol>
    {flow.phase==='preparation'&&<p className="sim-score-help">{flow.delayedColors?'Màu pollution được giấu đến sau cách ly.':'Vị trí và màu đã được công bố.'} Có thể về IDE chỉnh code và chạy thử. Cấu hình sa bàn đã được cố định.</p>}
    {flow.phase==='ready'&&<p className="sim-score-help">Code đã khóa. Bấm Chạy để bắt đầu đồng hồ lượt thi; C++ kết thúc sớm không tự chốt điểm.</p>}
    {flow.phase==='running'&&<p className="sim-score-help">Không chỉnh code/sa bàn hoặc tạm dừng lượt. STOP chốt điểm sớm; nếu không, lượt tự kết thúc sau 120 giây mô phỏng.</p>}
    <div className="sim-score-actions">
      {flow.phase==='setup'&&<button className="sim-button" disabled={running||(!!online&&!isHost)} onClick={()=>onAction('announce')}>Công bố vị trí · Vòng {flow.round}</button>}
      {flow.phase==='preparation'&&<button className="sim-button" disabled={running||flow.localCodeLocked} onClick={()=>onAction('quarantine')}>Khóa code · Cách ly</button>}
      {flow.phase==='quarantine'&&<button className="sim-button" disabled={!!online&&!isHost} onClick={()=>onAction('reveal')}>{flow.delayedColors?'Công bố màu':'Xác nhận cách ly'}</button>}
      {flow.phase==='finished'&&<button className="sim-button" disabled={!!online&&!isHost} onClick={()=>onAction('next')}>{flow.round===1?'Chuẩn bị vòng 2':'Tổng kết 2 vòng'}</button>}
      {flow.phase==='complete'&&<button className="sim-button" disabled={!!online&&!isHost} onClick={()=>{setTopFive(['','']);onAction('new');}}>Cuộc thi mới</button>}
    </div>
    {flow.records.map((r,i)=><div className="sim-round-record" key={r.round}><strong>Vòng {r.round}: {r.score.total} điểm · {(r.timeMs/1000).toFixed(2)} s</strong><p>{r.reason}</p><label className="sim-score-help">Top 5 cùng cấu hình vòng {r.round}<input className="sim-top-five" aria-label={`Top 5 vòng ${r.round}`} value={topFive[i]} onChange={e=>setTopFive(prev=>prev.map((s,j)=>i===j?e.target.value:s))}/></label><p>Normalized: {normalized[i]?.toFixed(1)??'Chưa đủ dữ liệu Top 5'}</p></div>)}
    {flow.records.length===2&&<p className="sim-score-help">{normalized.every(n=>n!==undefined)?`Best normalized: ${Math.max(...normalized as number[]).toFixed(1)} · Chênh lệch: ${Math.abs(normalized[0]!-normalized[1]!).toFixed(1)}`:'Nhập Top 5 từng vòng để so sánh điểm chuẩn hóa.'}<br/>Ưu tiên: normalized cao nhất → chênh lệch thấp nhất → ít tries → thời gian nhanh nhất.</p>}
    <p className="sim-score-help">{online?'Điểm cuối vòng được tính từ khối chung và toàn bộ robot trong phòng.':'Phiên local chấm robot và khối trên máy này.'} Mỗi vòng hỗ trợ một lần chạy; chưa mô phỏng Reset/Tries trong cùng lượt.</p>
   </>}
  </div>
 </section>;
}
