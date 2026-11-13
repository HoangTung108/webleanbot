# Ba hàm màu của baseCode

Xem [phân tích LeanbotIoT](leanbot-iot.md) để phân biệt SDK, helper baseCode và cầu nối giả lập, cùng ví dụ dùng trực tiếp thư viện và phạm vi đã xác minh.

Cấu hình WiFi và AssetID như trước (`set_wifi(...)` hoặc TB2A). Cả hai robot dùng cùng AssetID và thuộc tính Color. Base gửi/nhận qua LeanbotIoT: `Wifi.begin` → `Asset.begin` → thuộc tính `Color`; không phát khung màu qua Serial và không gọi WebSocket. Cầu nối giả lập của dự án có thể dùng HTTP/WebSocket riêng, không chứng minh kết nối cloud Leanbot thật. SSID trống hoặc con trỏ AssetID chưa khai báo báo ERR_WIFI_CONFIG; base chưa kiểm tra nội dung ID rỗng khi truyền `F("")`.

```cpp
// Robot gửi: một lần đo, một lần gửi; không cần biến màu.
read_color();
send_iot_color();

// Hoặc gửi trực tiếp một màu:
send_iot_color(BLUE);

// Robot nhận: chờ màu hợp lệ tối đa 30 giây.
if (read_iot_color(30000UL) == BLUE) {
  close_hand(90);
}

// Nếu chỉ cần đọc khối và ra quyết định:
if (read_color() == RED) {
  open_hand();
}
```

| Hàm | Kết quả |
| --- | --- |
| `read_color()` | Trả RED/GREEN/BLUE/YELLOW/PURPLE hoặc UNKNOWN; tự khởi tạo APDS, lấy tối đa 5 mẫu đã trừ nền và yêu cầu 4 phiếu. Dừng sớm khi quyết định được kết quả. Lỗi cảm biến cập nhật missionError; reset trả UNKNOWN không báo lỗi cảm biến. |
| `send_iot_color(color)` | Không truyền tham số: gửi màu vừa đo. UNKNOWN và enum không hợp lệ không gửi. Không đọc cảm biến lại. |
| `read_iot_color(timeoutMs)` | Mặc định 0: đọc một lần. Số lớn hơn 0: chờ màu hợp lệ đến hạn; hết hạn/reset trả UNKNOWN. |

Không còn get_color/is_color/requireColor, các alias send/read/wait_robot_color và send/read/wait_real_robot_color, hay các hàm FIFO/reset/wait màu. Thay `wait_iot_color(BLUE, 30000)` bằng `read_iot_color(30000) == BLUE`.

Kênh Asset Color chỉ chứa giá trị mới nhất, không phải hàng chờ. Hai lần đọc có thể trả cùng màu, không phân biệt được hai lần gửi cùng màu nếu không có giao thức mã lượt riêng. Thời hạn nhận được kiểm tra trước/sau lời gọi SDK; lời gọi SDK chặn có thể kéo dài thời gian thực tế.

Ngưỡng, gain và dữ liệu mẫu màu được giữ trong phần cấu hình của baseCode; đã bỏ các helper hiệu chuẩn không được gọi; logic nhận diện và LED không đổi. Không dùng mẫu RGB của giả lập để hiệu chuẩn khối thật.

Để tiết kiệm flash, log RGB mặc định tắt (`COLOR_DEBUG = false`). Đổi thành true khi cần chẩn đoán; tên màu trả về và LED vẫn hoạt động khi tắt log.

Chi tiết phép đo, giới hạn và hiệu chuẩn: [thuật toán đọc màu khối](object-color-algorithm.md).
