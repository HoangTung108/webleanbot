import { useState } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import { RULEBOOK_URL, TECHNICAL_RULEBOOK_URL, SCORE_CATEGORIES, normalizeScore, type ScoreCategory, type ScoreResult } from './scoring';

export function ScorePanel({category,result,reason,running,onCategory,onGenerate,onCalculate,configurationLocked=false,actionsLocked=false}:{configurationLocked?:boolean;actionsLocked?:boolean;category:ScoreCategory;result:ScoreResult|null;reason?:string;running:boolean;onCategory(value:ScoreCategory):void;onGenerate():void;onCalculate():void}) {
  const preset=SCORE_CATEGORIES[category];
  const [topFive,setTopFive]=useState('');
  let normalized:ReturnType<typeof normalizeScore>|undefined,normalizationError='';
  if(topFive.trim()&&result) { try { normalized=normalizeScore(result.total,topFive.trim().split(/[,;\s]+/).map(Number)); } catch(e) { normalizationError=(e as Error).message; } }
  return <section className="sim-scoring" aria-label="Điểm nhiệm vụ">
    <div className="sim-section-heading"><div><Trophy size={15}/><strong>Điểm nhiệm vụ</strong></div><span>Gameplay · 2026</span></div>
    <div className="sim-score-body">
      <label className="sim-category">Hạng mục<select aria-label="Hạng mục thi đấu" value={category} disabled={running||configurationLocked} onChange={e=>onCategory(e.target.value as ScoreCategory)}>{Object.entries(SCORE_CATEGORIES).map(([id,value])=><option key={id} value={id}>{value.name}</option>)}</select></label>
      <p className="sim-score-help">{preset.pollution.length} pollution · {preset.neutralizers.length} neutralizers · tối đa {preset.robots} robot</p>
      <div className="sim-score-total"><div><span>RAW SCORE · MÔ PHỎNG</span><output aria-label="Raw Score">{result?.total??'—'}</output></div><small>{result?reason:'Chưa chấm nhiệm vụ'}</small></div>
      <dl className="sim-score-breakdown">
        <div><dt>Containment <small>45 / khối</small></dt><dd>{result?.containment??'—'}</dd></div>
        <div><dt>Containment + neutralization <small>160 / cặp</small></dt><dd>{result?.neutralization??'—'}</dd></div>
        <div><dt>Analysis <small>100 / pollution thường</small></dt><dd>{result?.analysis??'—'}</dd></div>
        <div><dt>Mystery <small>150 / khối · Master</small></dt><dd>{result?.mystery??'—'}</dd></div>
        <div><dt>Return <small>40 / robot</small></dt><dd>{result?.returned??'—'}</dd></div>
      </dl>
      <details className="sim-score-rules"><summary>Normalized Score</summary><label className="sim-score-help">5 Raw Score cao nhất cùng vòng/cấu hình<input aria-label="Top 5 Raw Score" className="sim-top-five" placeholder="535, 530, 390, 140, 125" value={topFive} onChange={e=>setTopFive(e.target.value)}/></label>{normalized?<p>Base Top Score: {normalized.baseTopScore.toFixed(1)}<br/><strong>Normalized: <output aria-label="Normalized Score">{normalized.normalized.toFixed(1)}</output></strong></p>:<p>{normalizationError||'Cần kết quả lượt này và đủ dữ liệu Top 5. Không giới hạn điểm chuẩn hóa ở 1000.'}</p>}</details>
      <div className="sim-score-actions"><button className="sim-button" disabled={running||actionsLocked} onClick={onCalculate}>Chấm hiện trạng</button><button className="sim-button" disabled={running||actionsLocked} onClick={onGenerate}><RotateCcw size={12}/>Tạo nhiệm vụ {preset.name}</button></div>
      <details className="sim-score-rules"><summary>Luật áp dụng & giới hạn mô phỏng</summary><p>Gameplay trang 8: mọi nhiệm vụ có thể làm theo bất kỳ thứ tự nào. Theo hướng dẫn kỹ thuật mục 9: chỉ cần một phần khối tiếp xúc mặt vùng chấm điểm; robot vẫn chạm khối không mất điểm. Khối được nhấc khỏi mặt sa bàn không tính. Containment phải đúng thành phố ban đầu; neutralizer phải cùng màu và chạm cùng vùng có pollution đã containment.</p><p>Analysis: pollution bất kỳ về vùng màu bên trong CRL được 100; Mystery ở Master được 150 thay cho 100. Bảng 10.1 tính 160 là tổng của một cặp, không cộng thêm 45. CRL không gồm line đen.</p><p>Return: robot bắt đầu và kết thúc trong CRL, không bị rơi. Phiên local: Return tối đa 40; phiên thi online chung: tối đa 80 cho 2 robot ở Innovator/Master. Kiểm tra robot nằm trọn trong CRL; tài liệu không định nghĩa riêng trường hợp robot chỉ chạm một phần khi về đích.</p><p>Luyện tập: C++ kết thúc thì chấm lượt. Thi đấu mô phỏng: công bố vị trí → chuẩn bị → khóa code → công bố màu → chạy; C++ kết thúc sớm vẫn chờ hết 120 giây hoặc STOP. Đặt lại trong chuẩn bị giữ cấu hình; không hỗ trợ Reset/Tries giữa lượt thi.</p><p>Bảng thông số Gameplay trang 5 giới hạn Innovator/Master tối đa 2 robot, dù hình ma trận vẽ Master 3 robot. Điểm mô phỏng không thay thế kết quả trọng tài.</p><a href={RULEBOOK_URL} target="_blank" rel="noreferrer">Gameplay · 02/03/2026</a> · <a href={TECHNICAL_RULEBOOK_URL} target="_blank" rel="noreferrer">Hướng dẫn kỹ thuật V6</a></details>
    </div>
  </section>;
}
