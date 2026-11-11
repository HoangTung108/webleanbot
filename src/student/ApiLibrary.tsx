import { useState } from 'react'
import { libraryReference as apiReference } from './libraryReference'

const examples = [
  { id: 'leanbot', title: 'Leanbot', code: `#include <Leanbot.h>\n\nvoid setup() {\n  Leanbot.begin(); // Khởi tạo phần cứng\n}\n\nvoid loop() {\n  LbMission.begin(TB1A + TB1B); // Đợi tín hiệu bắt đầu\n  LbMotion.runLR(1000, 1000);  // Hai bánh đi tới\n  LbMotion.waitDistanceMm(100); // Đợi đi 100 mm\n  LbMotion.stopAndWait();      // Dừng bánh\n  LbMission.end();\n}` },
  { id: 'iot', title: 'Leanbot IoT', code: `// Dùng cùng Asset ID / thuộc tính Color trên hai robot.\n// Trong setup(), sau Leanbot.begin():\nset_wifi("TenWifi", "MatKhau", F("AssetID"));\n\n// Robot gửi: gọi trước lượt trao đổi mới.\nreset_iot_color(); // Robot nhận phải đọc được waiting\nsend_iot_color(BLUE); // Gửi màu sau khi đã đo\n\n// Robot nhận: gọi định kỳ khi bánh đã dừng.\nread_iot_color(); // Đọc mạng, xếp tín hiệu mới vào FIFO\nif (iot_queue_count() > 0) {\n  ObjectColor next = pop_iot_color(); // Lấy tín hiệu cũ nhất\n  // Xử lý nhiệm vụ theo next ở đây.\n}\n// Kênh chỉ lưu giá trị cuối; không đảm bảo nhận mọi lần gửi.` },
  { id: 'sensors', title: 'Cảm biến & Serial', code: `// Dùng với docs/baseCode.cpp. Trong setup():\nSerial.begin(115200); // Trùng baud Serial Debug trên web\ncolorSensorReady = APDS.begin(); // Phải thành công trước khi đo\n\n// Khi đã đặt khối trước cảm biến:\nread_color(); // Tự đọc nhiều mẫu, báo Serial/LED\nif (is_color(BLUE)) {\n  Serial.println("Blue block"); // Không cần khai báo biến\n}\n// Hiệu chuẩn: đặt khối đỏ rồi gọi calibrate_color(RED).\n// Làm riêng cho đủ 5 màu; lưu các dòng mẫu in trên Serial.` },
  { id: 'helpers', title: 'Hàm baseCode', code: `// Các hàm hỗ trợ này cần có định nghĩa từ baseCode.cpp.\nset_line(69, 78, 106, 70); // Ngưỡng 2L, 0L, 1R, 3R\nint line = measure_line(); // Mặt nạ 0..15, không phải analog\n\nclose_hand_async(GRIP_CLOSE_ANGLE); // Bắt đầu gắp\nmove_tank(1800, 1800, 10); // Đi 10 cm, tay vẫn cập nhật\nwait_hand(); // Chờ tay hoàn tất\nturn_two_wheels(1800, 90); // Quay 90 độ\nopen_hand(); // Mở và chờ xong\nrobot_delay(250); // Đợi và phục vụ tay async` },
  { id: 'arduino', title: 'Arduino & Serial', code: `Serial.begin(115200); // Trong setup, trùng baud web

// Trong loop, tránh in quá dày:
Serial.println(millis()); // Thời gian từ lúc khởi động, ms
if (Serial.available() > 0) {
  int command = Serial.read(); // -1 nếu không còn dữ liệu
  Serial.println(command);
}
robot_delay(250); // Hàm baseCode: đợi và phục vụ tay async` },
  { id: 'cpp', title: 'Toán & chuỗi', code: `float value = -12.5f;
if (isfinite(value)) { // Loại NaN và vô cực
  long magnitude = lroundf(fabsf(value)); // Trị tuyệt đối rồi làm tròn
  Serial.println(magnitude);
}
const char *side = "L";
if (strcmp(side, "L") == 0) { // strcmp trả 0 khi hai chuỗi bằng nhau
  Serial.println("Left");
}` },
]
const groups = [
  { ...examples.find(group => group.id === 'leanbot')!, title: 'Leanbot' },
  { ...examples.find(group => group.id === 'iot')!, title: 'Leanbot IoT' },
  {
    id: 'arduino', title: 'Arduino',
    code: ['arduino', 'sensors', 'cpp']
      .map(id => examples.find(group => group.id === id)!.code).join('\n\n'),
  },
  { ...examples.find(group => group.id === 'helpers')!, title: 'Code mở rộng' },
]

export function ApiLibrary() {
  const [active, setActive] = useState('leanbot')
  const [query, setQuery] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const group = groups.find(item => item.id === active)!
  const rows = apiReference.filter(row => row.group === active).filter(row => [row.api, row.description, row.parameters, row.returns, row.notes].join(' ').toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi').trim()))
  async function copy(code = group.code) {
    try { await navigator.clipboard.writeText(code); setCopyStatus('Đã sao chép') }
    catch { setCopyStatus('Không sao chép được. Chọn code và sao chép thủ công.') }
  }
  return <section className="api-library" aria-label="Thư viện API">
    <header><h2>Thư viện API</h2><p>{apiReference.length} mục tra cứu: tham số, đơn vị, kết quả và ví dụ sử dụng.</p></header>
    <nav aria-label="Nhóm thư viện">{groups.map(item => <button type="button" key={item.id} aria-pressed={active === item.id} onClick={() => { setActive(item.id); setCopyStatus(''); setQuery('') }}>{item.title}</button>)}</nav>
    <label className="api-search">Tìm API trong nhóm<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ví dụ: runLR, màu, Serial…" /></label>
    <p className="api-note">{active === 'helpers' ? 'Đây là hàm hỗ trợ của baseCode.cpp, cần sao chép cả phần định nghĩa trước khi sử dụng.' : 'API gốc của thư viện. Ví dụ IoT và cảm biến bên dưới có dùng hàm hỗ trợ từ baseCode.cpp.'}</p>
    <p className="api-note">Hiển thị toàn bộ API đã được ghi nhận trong dự án của Leanbot, Leanbot IoT và Arduino. Nhóm Arduino gồm Serial, cảm biến APDS, toán và chuỗi. Code mở rộng chỉ liệt kê các hàm chính từ baseCode.cpp.</p>
    <p>{rows.length} API trong nhóm · Mở “Giải thích & code” để xem chi tiết. Ví dụ từng API là đoạn minh họa, cần khai báo biến đầu vào và khởi tạo phần cứng trước.</p>
    {active === 'arduino' && <p className="api-note">Nguồn cảm biến: <a href="https://github.com/arduino-libraries/Arduino_APDS9960/blob/master/src/Arduino_APDS9960.h" target="_blank" rel="noreferrer">Header Arduino_APDS9960 chính thức</a>. Đây là API Arduino_APDS9960, không dùng lẫn với SparkFun hoặc Adafruit.</p>}
    <div className="api-table-wrap"><table><thead><tr><th>API / ví dụ</th><th>Công dụng</th></tr></thead><tbody>{rows.map(row => <tr key={row.api}><td><code>{row.api}</code></td><td>{row.description}<details className="api-detail"><summary>Giải thích &amp; code</summary><dl><dt>Tham số / đơn vị</dt><dd>{row.parameters}</dd><dt>Kết quả trả về</dt><dd>{row.returns}</dd><dt>Lưu ý</dt><dd>{row.notes}</dd><dt>Đối chiếu</dt><dd>{row.source}</dd></dl><pre tabIndex={0}><code>{row.code}</code></pre><button type="button" aria-label={`Sao chép ví dụ ${row.api}`} onClick={() => void copy(row.code)}>Sao chép ví dụ API</button></details></td></tr>)}</tbody></table>{!rows.length && <p>Không tìm thấy API trong nhóm này.</p>}</div>
    <div className="api-example-heading"><h3>Ví dụ có chú thích</h3><button type="button" onClick={() => void copy()}>Sao chép code</button></div>
    <p role="status">{copyStatus}</p><pre tabIndex={0}><code>{group.code}</code></pre>
    <p className="api-note">Thông số cần hiệu chỉnh theo robot thật. Giả lập chưa hỗ trợ đầy đủ các API phần cứng và IoT.</p>
  </section>
}
