import { useState } from 'react'
import baseCode from '../../docs/baseCode.cpp?raw'

const groups = [
  { id: 'leanbot', title: 'Leanbot', marker: 'LEANBOT — #include', next: 'LEANBOT IOT — #include', code: `#include <Leanbot.h>\n\nvoid setup() {\n  Leanbot.begin(); // Khởi tạo phần cứng\n}\n\nvoid loop() {\n  LbMission.begin(TB1A + TB1B); // Đợi tín hiệu bắt đầu\n  LbMotion.runLR(1000, 1000);  // Hai bánh đi tới\n  LbMotion.waitDistanceMm(100); // Đợi đi 100 mm\n  LbMotion.stopAndWait();      // Dừng bánh\n  LbMission.end();\n}` },
  { id: 'iot', title: 'Leanbot IoT', marker: 'LEANBOT IOT — #include', next: 'CẢM BIẾN VÀ DEBUG —', code: `// Dùng cùng Asset ID / thuộc tính Color trên hai robot.\n// Trong setup(), sau Leanbot.begin():\nset_wifi("TenWifi", "MatKhau", F("AssetID"));\n\n// Robot gửi: gọi trước lượt trao đổi mới.\nreset_iot_color(); // Robot nhận phải đọc được waiting\nsend_iot_color(OBJECT_BLUE); // Gửi màu sau khi đã đo\n\n// Robot nhận: gọi định kỳ khi bánh đã dừng.\npoll_iot_color(); // Đọc mạng, xếp tín hiệu mới vào FIFO\nif (iot_queue_count() > 0) {\n  ObjectColor next = pop_iot_color(); // Lấy tín hiệu cũ nhất\n  // Xử lý nhiệm vụ theo next ở đây.\n}\n// Kênh chỉ lưu giá trị cuối; không đảm bảo nhận mọi lần gửi.` },
  { id: 'sensors', title: 'Cảm biến & Serial', marker: 'CẢM BIẾN VÀ DEBUG —', next: 'APDS thuộc Arduino_APDS9960', code: `// Dùng với docs/baseCode.cpp. Trong setup():\nSerial.begin(115200); // Trùng baud Serial Debug trên web\ncolorSensorReady = APDS.begin(); // Phải thành công trước khi đo\n\n// Khi đã đặt khối trước cảm biến:\nbool valid = false;\nObjectColor color = readObjectColor(valid); // Đọc nhiều mẫu\nif (valid && color != OBJECT_UNKNOWN) {\n  Serial.println((int)color); // Chỉ dùng màu xác định được\n}\n// Hiệu chuẩn: đặt khối đỏ rồi gọi calibrate_color(OBJECT_RED).\n// Làm riêng cho đủ 5 màu; lưu các dòng mẫu in trên Serial.` },
  { id: 'helpers', title: 'Hàm baseCode', marker: '', next: '', code: `// Các hàm hỗ trợ này cần có định nghĩa từ baseCode.cpp.\nset_line(69, 78, 106, 70); // Ngưỡng 2L, 0L, 1R, 3R\nint line = measure_line(); // Mặt nạ 0..15, không phải analog\n\nclose_hand_async(GRIP_CLOSE_ANGLE); // Bắt đầu gắp\nmove_tank(1800, 1800, 10); // Đi 10 cm, tay vẫn cập nhật\nwait_hand(); // Chờ tay hoàn tất\nturn_two_wheels(1800, 90); // Quay 90 độ\nopen_hand(); // Mở và chờ xong\nrobot_delay(250); // Đợi và phục vụ tay async` },
]
function rowsFor(group: typeof groups[number]) {
  if (!group.marker) return [
    ['move_tank(L, R, cm)', 'Đi theo cm, có tăng/giảm tốc và bù hướng.'],
    ['turn_two_wheels(speed, angle)', 'Quay hai bánh theo góc, độ.'],
    ['set_line(a, b, c, d)', 'Đặt ngưỡng line theo thứ tự 2L, 0L, 1R, 3R.'],
    ['close_hand_async(angle) / wait_hand()', 'Gắp đồng thời khi đi/quay, sau đó chờ hoàn tất.'],
    ['calibrate_color(color)', 'Học riêng từng khối, cần đủ 5 màu.'],
    ['poll_iot_color() / pop_iot_color()', 'Nhận và lấy tín hiệu FIFO, tối đa 16 màu.'],
  ]
  const start = baseCode.indexOf(group.marker)
  const end = baseCode.indexOf(group.next, start)
  if (start < 0 || end < start) return []
  return baseCode.slice(start, end).split('\n').filter(line => line.startsWith('|')).slice(2).map(line => line.split('|').slice(1, 3).map(cell => cell.trim()))
}
export function ApiLibrary() {
  const [active, setActive] = useState('leanbot')
  const [query, setQuery] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const group = groups.find(item => item.id === active)!
  const rows = rowsFor(group).filter(row => row.join(' ').toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi').trim()))
  async function copy() {
    try { await navigator.clipboard.writeText(group.code); setCopyStatus('Đã sao chép') }
    catch { setCopyStatus('Không sao chép được. Chọn code và sao chép thủ công.') }
  }
  return <section className="api-library" aria-label="Thư viện API">
    <header><h2>Thư viện API</h2><p>Tra cứu Leanbot, IoT và ví dụ C++ có chú thích.</p></header>
    <nav aria-label="Nhóm thư viện">{groups.map(item => <button type="button" key={item.id} aria-pressed={active === item.id} onClick={() => { setActive(item.id); setCopyStatus(''); setQuery('') }}>{item.title}</button>)}</nav>
    <label className="api-search">Tìm API trong nhóm<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ví dụ: runLR, màu, Serial…" /></label>
    <p className="api-note">{active === 'helpers' ? 'Đây là hàm hỗ trợ của baseCode.cpp, cần sao chép cả phần định nghĩa trước khi sử dụng.' : 'API gốc của thư viện. Ví dụ IoT và cảm biến bên dưới có dùng hàm hỗ trợ từ baseCode.cpp.'}</p>
    <div className="api-table-wrap"><table><thead><tr><th>API / ví dụ</th><th>Công dụng</th></tr></thead><tbody>{rows.map(([api, description]) => <tr key={api}><td><code>{api}</code></td><td>{description}</td></tr>)}</tbody></table>{!rows.length && <p>Không tìm thấy API trong nhóm này.</p>}</div>
    <div className="api-example-heading"><h3>Ví dụ có chú thích</h3><button type="button" onClick={() => void copy()}>Sao chép code</button></div>
    <p role="status">{copyStatus}</p><pre tabIndex={0}><code>{group.code}</code></pre>
    <p className="api-note">Thông số cần hiệu chỉnh theo robot thật. Giả lập chưa hỗ trợ đầy đủ các API phần cứng và IoT.</p>
  </section>
}
