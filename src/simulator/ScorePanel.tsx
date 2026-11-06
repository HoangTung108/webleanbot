import { Trophy, RotateCcw } from 'lucide-react';
import { SCORE_CATEGORIES, type ScoreCategory, type ScoreResult } from './scoring';

export function ScorePanel({category,result,reason,running,onCategory,onGenerate,onCalculate}:{category:ScoreCategory;result:ScoreResult|null;reason?:string;running:boolean;onCategory(value:ScoreCategory):void;onGenerate():void;onCalculate():void}) {
  const preset=SCORE_CATEGORIES[category];
  return <section className="sim-scoring" aria-label="Điểm nhiệm vụ">
    <div className="sim-section-heading"><div><Trophy size={15}/><strong>Điểm nhiệm vụ</strong></div><span>Chờ luật chi tiết</span></div>
    <div className="sim-score-body">
      <label className="sim-category">Hạng mục<select aria-label="Hạng mục thi đấu" value={category} disabled={running} onChange={e=>onCategory(e.target.value as ScoreCategory)}>{Object.entries(SCORE_CATEGORIES).map(([id,value])=><option key={id} value={id}>{value.name}</option>)}</select></label>
      <p className="sim-score-help">{preset.pollution.length} pollution · {preset.neutralizers.length} neutralizers · {preset.robots} robot theo ảnh</p>
      <div className="sim-score-total"><div><span>ĐIỂM TẠM TÍNH</span><output aria-label="Tổng điểm tạm tính">{result?.total??'—'}</output></div><small>{result?reason:'Chưa chấm nhiệm vụ'}</small></div>
      <dl className="sim-score-breakdown">
        <div><dt>Containment <small>45 / khối</small></dt><dd>{result?.containment??'—'}</dd></div>
        <div><dt>Containment + neutralization <small>160 / cặp</small></dt><dd>{result?.neutralization??'—'}</dd></div>
        <div><dt>Analysis <small>100 / khối</small></dt><dd>{result?.analysis??'—'}</dd></div>
        <div><dt>Mystery <small>150 / khối · Master</small></dt><dd>{result?.mystery??'—'}</dd></div>
        <div><dt>Return <small>40 / robot</small></dt><dd>{result?.returned??'—'}</dd></div>
      </dl>
      <div className="sim-score-actions"><button className="sim-button" disabled={running} onClick={onCalculate}>Chấm hiện trạng</button><button className="sim-button" disabled={running} onClick={onGenerate}><RotateCcw size={12}/>Tạo nhiệm vụ {preset.name}</button></div>
      <details className="sim-score-rules"><summary>Quy ước tạm thời</summary><p>Ảnh chỉ có mức điểm. Hiện ghép 1 pollution và 1 neutralizer cùng màu trong cùng containment, tính tổng 160, không cộng thêm 45. Đỏ/vàng về CRL được 100; Mystery về CRL được 150 ở Master.</p><p>Toàn bộ đáy khối phải nằm trong vùng; không tính khối đang gắp hoặc đang chuyển động. Robot phải nằm trọn trong CRL, không bị rơi. Simulator này theo dõi 1 robot: Return tối đa 40 điểm.</p><p>Tự chấm khi C++ kết thúc; không xem thao tác Dừng là hoàn thành. Các điều kiện này cần đối chiếu luật bạn sẽ bổ sung.</p></details>
    </div>
  </section>;
}
