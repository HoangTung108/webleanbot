# Ba hàm màu của baseCode

Cấu hình WiFi và AssetID như trước (`set_wifi(...)` hoặc TB2A). Cả hai robot dùng cùng AssetID và thuộc tính Color. Khi chưa chọn kênh WiFi/Asset, các hàm gửi/nhận dùng giao thức `COLOR:` qua Serial/WebSocket Bridge.

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
| `read_color()` | Trả RED/GREEN/BLUE/YELLOW/PURPLE hoặc UNKNOWN; tự khởi tạo APDS, lấy 5 mẫu và yêu cầu 4 phiếu. Lỗi cập nhật missionError, trả UNKNOWN. |
| `send_iot_color(color)` | Không truyền tham số: gửi màu vừa đo. UNKNOWN và enum không hợp lệ không gửi. Không đọc cảm biến lại. |
| `read_iot_color(timeoutMs)` | Mặc định 0: đọc một lần. Số lớn hơn 0: chờ màu hợp lệ đến hạn; hết hạn/reset trả UNKNOWN. |

Không còn get_color/is_color/requireColor, các alias send/read/wait_robot_color và send/read/wait_real_robot_color, hay các hàm FIFO/reset/wait màu. Thay `wait_iot_color(BLUE, 30000)` bằng `read_iot_color(30000) == BLUE`.

Kênh Asset Color chỉ chứa giá trị mới nhất, không phải hàng chờ. Hai lần đọc có thể trả cùng màu, không phân biệt được hai lần gửi cùng màu nếu không có giao thức mã lượt riêng. Thời hạn nhận được kiểm tra trước/sau lời gọi SDK; lời gọi SDK chặn có thể kéo dài thời gian thực tế.

Ngưỡng, gain và mẫu hiệu chuẩn màu được giữ trong phần cấu hình/helper nội bộ của baseCode; logic nhận diện và LED không đổi. Không dùng mẫu RGB của giả lập để hiệu chuẩn khối thật.
