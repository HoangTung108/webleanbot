import { useState } from 'react'
import { libraryReference as apiReference } from './libraryReference'

const examples = [
  { id: 'leanbot', title: 'Leanbot', code: `#include <Leanbot.h>\n\nvoid setup() {\n  Leanbot.begin(); // Khởi tạo phần cứng\n}\n\nvoid loop() {\n  LbMission.begin(TB1A + TB1B); // Đợi tín hiệu bắt đầu\n  LbMotion.runLR(1000, 1000);  // Hai bánh đi tới\n  LbMotion.waitDistanceMm(100); // Đợi đi 100 mm\n  LbMotion.stopAndWait();      // Dừng bánh\n  LbMission.end();\n}` },
  { id: 'iot', title: 'Leanbot IoT', code: `#include <Leanbot.h>
#include <LeanbotIoT.h>

auto IoTColor = LbIoT.Asset.attribute(F("Color"));

void setup() {
  Leanbot.begin();
  Serial.begin(115200);
  LbIoT.Wifi.begin("TenWifi", "MatKhau");
  LbIoT.Asset.begin(F("AssetID")); // Thay bằng AssetID thật
  // Robot gửi: bỏ chú thích dòng dưới để gửi một lần.
  // IoTColor.write("Blue");
}

void loop() {
  String value = IoTColor.read(); // Robot nhận: đọc giá trị hiện tại
  Serial.println(value);
  LbDelay(500); // Nhịp thăm dò minh họa, không phải giới hạn SDK
}
// Hai robot dùng cùng AssetID và tên thuộc tính Color.
// Kênh IoT lưu màu mới nhất, không phải hàng chờ sự kiện.
// Ví dụ dùng API đã được gọi trong dự án; cần biên dịch với SDK thật.` },
  { id: 'sensors', title: 'Cảm biến & Serial', code: `// Dùng cùng baseCode.cpp, sau Leanbot.begin():
if (read_color() == BLUE) {
  close_hand(90); // Đọc và xử lý khối, không cần get_color/is_color
}
// Chỉ đọc và báo Serial/LED:
read_color();
// APDS tự khởi tạo trong lần đọc đầu tiên.` },
  { id: 'helpers', title: 'Code mở rộng', code: `// Dùng cùng các định nghĩa trong baseCode.cpp.
// Cấu hình line: dùng ngưỡng đã chỉnh, hoặc gọi calibrate_line().
set_line(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R);
int line = measure_line(); // Mặt nạ 0..15

close_hand_async(GRIP_CLOSE_ANGLE); // Bắt đầu gắp
move_tank(1800, 1800, 10); // Đi 10 cm, tay vẫn cập nhật
wait_hand(); // Chờ tay hoàn tất
turn_two_wheels(1800, 90); // Quay 90 độ
followLineCm(20, 50); // Dò 20 cm ở 50% tốc độ
open_hand(); // Mở và chờ xong
robot_delay(250); // Đợi và cập nhật tay

// Khởi tạo cảm biến trong setup(): colorSensorReady = APDS.begin();
// Khởi tạo WiFi/Asset trước khi gửi màu.
read_color(); // Trừ ánh sáng nền, tối đa 5 mẫu, cần 4 phiếu; lưu kết quả
send_iot_color(); // Gửi kết quả vừa đo, không đọc lại` },
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
    <p className="api-note">{active === 'helpers' ? 'Đây là hàm hỗ trợ của baseCode.cpp, cần sao chép cả phần định nghĩa trước khi sử dụng.' : 'API gốc của thư viện. Ví dụ cảm biến có dùng hàm hỗ trợ từ baseCode.cpp; ví dụ Leanbot IoT dùng trực tiếp SDK.'}</p>
    <p className="api-note">Hiển thị toàn bộ API đã được ghi nhận trong dự án của Leanbot, Leanbot IoT và Arduino. Nhóm Arduino gồm Serial, cảm biến APDS, toán và chuỗi. Code mở rộng chỉ liệt kê các hàm chính từ baseCode.cpp.</p>
    <p>{rows.length} API trong nhóm · Mở “Giải thích & code” để xem chi tiết. Ví dụ từng API là đoạn minh họa, cần khai báo biến đầu vào và khởi tạo phần cứng trước.</p>
    {active === 'arduino' && <p className="api-note">Nguồn cảm biến: <a href="https://github.com/arduino-libraries/Arduino_APDS9960/blob/master/src/Arduino_APDS9960.h" target="_blank" rel="noreferrer">Header Arduino_APDS9960 chính thức</a>. Đây là API Arduino_APDS9960, không dùng lẫn với SparkFun hoặc Adafruit.</p>}
    {active === 'iot' && <aside aria-label="Hướng dẫn Leanbot IoT" className="api-note">
      <p>Trình tự: Leanbot.begin → Wifi.begin → Asset.begin → thuộc tính read/write. Cần thư viện LeanbotIoT và phần cứng WiFi tương thích trên robot thật.</p>
      <p>Với baseCode: declare_wifi lưu cấu hình; TB2A gọi set_wifi; TB1B chạy bài. send_iot_color và read_iot_color là hàm mở rộng của dự án, xem nhóm Code mở rộng. iotConfigured chỉ ghi nhận đã gọi cấu hình, không xác nhận online.</p>
      <p>Giả lập không kết nối WiFi/cloud Leanbot thật. Runtime giữ giá trị theo AssetID và tên thuộc tính; cầu nối Color có thể dùng HTTP/WebSocket của dự án. Kết quả giả lập không xác nhận mật khẩu, quyền Asset hoặc trạng thái phần cứng.</p>
      <p>Nguồn: <a href="https://support.pythaverse.space/kb/faq.php?id=31" target="_blank" rel="noreferrer">Hướng dẫn Leanbot IoT của Pythaverse</a> · <a href="https://git.pythaverse.space/dashboard/repos" target="_blank" rel="noreferrer">Kho Pythaverse (cần đăng nhập)</a>. Hiện chỉ có 5 lời gọi SDK được ghi nhận trong dự án; chưa xác minh toàn bộ API, overload, mã lỗi và phiên bản từ header gốc.</p>
    </aside>}
    <div className="api-table-wrap"><table><thead><tr><th>API / ví dụ</th><th>Công dụng</th></tr></thead><tbody>{rows.map(row => <tr key={row.api}><td><code>{row.api}</code></td><td>{row.description}<details className="api-detail"><summary>Giải thích &amp; code</summary><dl><dt>Tham số / đơn vị</dt><dd>{row.parameters}</dd><dt>Kết quả trả về</dt><dd>{row.returns}</dd><dt>Lưu ý</dt><dd>{row.notes}</dd><dt>Đối chiếu</dt><dd>{row.source}</dd></dl><pre tabIndex={0}><code>{row.code}</code></pre><button type="button" aria-label={`Sao chép ví dụ ${row.api}`} onClick={() => void copy(row.code)}>Sao chép ví dụ API</button></details></td></tr>)}</tbody></table>{!rows.length && <p>Không tìm thấy API trong nhóm này.</p>}</div>
    <div className="api-example-heading"><h3>Ví dụ có chú thích</h3><button type="button" onClick={() => void copy()}>Sao chép code</button></div>
    <p role="status">{copyStatus}</p><pre tabIndex={0}><code>{group.code}</code></pre>
    <p className="api-note">Thông số cần hiệu chỉnh theo robot thật. Giả lập chưa hỗ trợ đầy đủ các API phần cứng và IoT.</p>
  </section>
}
