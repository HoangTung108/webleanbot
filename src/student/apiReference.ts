export type ApiReference = { group: string; api: string; description: string; parameters: string; returns: string; notes: string; code: string; source: string }

export const apiReference: ApiReference[] = [
  {
    "group": "leanbot",
    "api": "Leanbot.begin();",
    "description": "Khởi tạo phần cứng robot.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Gọi đầu setup trước các lệnh phần cứng.",
    "code": "// Khởi tạo phần cứng robot.\nLeanbot.begin();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "Leanbot.DCMotor.setPower(128);",
    "description": "Đặt công suất cổng động cơ DC phụ trợ.",
    "parameters": "Giá trị công suất; bộ sinh Blockly đổi phần trăm sang thang -255..255.",
    "returns": "Ví dụ không sử dụng kết quả; đối chiếu SDK đang cài.",
    "notes": "Không điều khiển hai bánh L/R; cần phần cứng động cơ phụ phù hợp.",
    "code": "// Cổng DC phụ trợ, không phải tốc độ hai bánh robot.\nLeanbot.DCMotor.setPower(128); // Khoảng 50% công suất\nLeanbot.DCMotor.setPower(0); // Dừng động cơ phụ",
    "source": "Bộ sinh Blockly: leanbot.js, Leanbot.DCMotor.setPower"
  },
  {
    "group": "leanbot",
    "api": "LbMission.begin(TB1A + TB1B);",
    "description": "Đợi tín hiệu bắt đầu nhiệm vụ.",
    "parameters": "Tổ hợp nút chạm; 0 để bắt đầu ngay.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Có thể chặn chương trình trong khi chờ nút.",
    "code": "// Đợi tín hiệu bắt đầu nhiệm vụ.\nLbMission.begin(TB1A + TB1B);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMission.beginDigitalTwin(F(\"MissionID\"));",
    "description": "Bắt đầu nhiệm vụ Digital Twin theo mã.",
    "parameters": "ID nhiệm vụ dạng chuỗi flash F(...).",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Có trong bộ sinh Blockly; cần cấu hình dịch vụ tương ứng.",
    "code": "// Bắt đầu nhiệm vụ Digital Twin theo mã.\nLbMission.beginDigitalTwin(F(\"MissionID\"));",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMission.end();",
    "description": "Kết thúc nhiệm vụ.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Đợi tay async hoàn tất trước khi kết thúc.",
    "code": "// Kết thúc nhiệm vụ.\nLbMission.end();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMission.elapsedMillis();",
    "description": "Đọc thời gian nhiệm vụ.",
    "parameters": "Không có tham số.",
    "returns": "Thời gian tính bằng ms.",
    "notes": "Chia 1000.0 để đổi sang giây.",
    "code": "// Đọc thời gian nhiệm vụ.\nunsigned long elapsed = LbMission.elapsedMillis();\nSerial.println(elapsed); // ms",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.runLR(1000, 1000);",
    "description": "Đặt tốc độ độc lập cho bánh trái và phải.",
    "parameters": "L, R: tốc độ động cơ; script dùng -2000..2000.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Dấu âm đảo chiều; không phải mm/s. Không tự dừng theo quãng đường.",
    "code": "// Đặt tốc độ độc lập cho bánh trái và phải.\nLbMotion.runLR(1000, 1000);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.runLRrpm(30, 30);",
    "description": "Đặt tốc độ bánh theo vòng mỗi phút.",
    "parameters": "L, R: rpm.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không nhầm rpm với đơn vị tốc độ runLR.",
    "code": "// Đặt tốc độ bánh theo vòng mỗi phút.\nLbMotion.runLRrpm(30, 30);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.stopAndWait();",
    "description": "Dừng động cơ và đợi hoàn tất dừng.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Kiểm tra thư viện đúng phiên bản trên bo đang dùng.",
    "code": "// Dừng động cơ và đợi hoàn tất dừng.\nLbMotion.stopAndWait();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.getDistanceMm();",
    "description": "Đọc quãng đường phản hồi từ mốc đo.",
    "parameters": "Không có tham số.",
    "returns": "Quãng đường, mm.",
    "notes": "Không coi phản hồi encoder là phép đo vị trí tuyệt đối.",
    "code": "// Đọc quãng đường phản hồi từ mốc đo.\nfloat mm = LbMotion.getDistanceMm();\nSerial.println(mm);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.getRotationDeg();",
    "description": "Đọc góc quay tích lũy theo mốc đo.",
    "parameters": "Không có tham số.",
    "returns": "Góc, độ.",
    "notes": "Không tự giới hạn về 0..360 trong thuật toán baseCode.",
    "code": "// Đọc góc quay tích lũy theo mốc đo.\nfloat deg = LbMotion.getRotationDeg();\nSerial.println(deg);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.setZeroOrigin();",
    "description": "Đặt lại mốc đo chuyển động.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không gọi giữa một thao tác baseCode đang theo dõi origin.",
    "code": "// Đặt lại mốc đo chuyển động.\nLbMotion.setZeroOrigin();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.waitDistanceMm(100);",
    "description": "Chờ chuyển động theo quãng đường.",
    "parameters": "Khoảng cách: mm.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Khởi động bánh trước khi chờ; kiểm tra quy ước mốc/dấu của SDK.",
    "code": "// Chờ chuyển động theo quãng đường.\nLbMotion.waitDistanceMm(100);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbMotion.waitRotationDeg(90);",
    "description": "Chờ chuyển động theo góc quay.",
    "parameters": "Góc: độ.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Khởi động bánh trước khi chờ; không thay thế điều khiển turn_angle.",
    "code": "// Chờ chuyển động theo góc quay.\nLbMotion.waitRotationDeg(90);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbGripper.open();",
    "description": "Mở tay gắp bằng API gốc.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không dùng xen với bộ điều khiển handAngle của tay async trong baseCode.",
    "code": "// Mở tay gắp bằng API gốc.\nLbGripper.open();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbGripper.close();",
    "description": "Đóng tay gắp bằng API gốc.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không dùng xen với bộ điều khiển handAngle của tay async trong baseCode.",
    "code": "// Đóng tay gắp bằng API gốc.\nLbGripper.close();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbGripper.moveTo(50);",
    "description": "Đặt cùng góc cho hai càng.",
    "parameters": "Góc, độ.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không dùng xen với bộ điều khiển handAngle của tay async trong baseCode.",
    "code": "// Đặt cùng góc cho hai càng.\nLbGripper.moveTo(50);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbGripper.moveToLR(50, 50, 750);",
    "description": "Đặt riêng góc hai càng và thời gian chuyển động.",
    "parameters": "Góc trái, góc phải: độ; thời gian: ms.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không dùng xen với bộ điều khiển handAngle của tay async trong baseCode.",
    "code": "// Đặt riêng góc hai càng và thời gian chuyển động.\nLbGripper.moveToLR(50, 50, 750);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRLine.setThreshold(69, 78, 106, 70);",
    "description": "Đặt ngưỡng phân biệt nền đen cho bốn cảm biến.",
    "parameters": "Thứ tự 2L, 0L, 1R, 3R; cần đo theo ánh sáng thật.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Kiểm tra thư viện đúng phiên bản trên bo đang dùng.",
    "code": "// Đặt ngưỡng phân biệt nền đen cho bốn cảm biến.\nLbIRLine.setThreshold(69, 78, 106, 70);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRLine.read();",
    "description": "Đọc và cập nhật trạng thái bốn cảm biến line.",
    "parameters": "Không có tham số.",
    "returns": "Mặt nạ bốn bit 0..15 trong cách dùng của project.",
    "notes": "Đọc lại cảm biến trước khi dùng trạng thái được lưu.",
    "code": "// Đọc và cập nhật trạng thái bốn cảm biến line.\nLbIRLine.read();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRLine.value();",
    "description": "Lấy mặt nạ line đã được lưu.",
    "parameters": "Không có tham số.",
    "returns": "Giá trị digital đã lưu, không phải bốn giá trị analog.",
    "notes": "Đọc lại cảm biến trước khi dùng trạng thái được lưu.",
    "code": "// Lấy mặt nạ line đã được lưu.\nLbIRLine.value();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRLine.isBlackDetected();",
    "description": "Kiểm tra trạng thái nhận biết nền đen.",
    "parameters": "Không có tham số.",
    "returns": "Dùng như điều kiện đúng/sai trong Blockly.",
    "notes": "Đọc lại cảm biến trước khi dùng trạng thái được lưu.",
    "code": "// Kiểm tra trạng thái nhận biết nền đen.\nLbIRLine.isBlackDetected();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRArray.read(irX);",
    "description": "Đọc cảm biến hồng ngoại được chọn.",
    "parameters": "irX: hằng chỉ số cảm biến do SDK cung cấp.",
    "returns": "Giá trị cảm biến; thang đo tùy SDK.",
    "notes": "Không tự coi là khoảng cách cm.",
    "code": "// Đọc cảm biến hồng ngoại được chọn.\nLbIRArray.read(irX);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRLine.doManualCalibration(TB1A);",
    "description": "Hiệu chuẩn line bằng thao tác nút chạm.",
    "parameters": "Nút dùng để xác nhận các bước hiệu chuẩn.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Làm theo quy trình nền đen/trắng của thư viện; có thể chặn.",
    "code": "// Hiệu chuẩn line bằng thao tác nút chạm.\nLbIRLine.doManualCalibration(TB1A);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRLine.displayOnRGB(CRGB::Green);",
    "description": "Hiển thị trạng thái line trên LED.",
    "parameters": "Màu hiển thị.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không dùng cùng yêu cầu LED chỉ báo màu vật đã đo.",
    "code": "// Hiển thị trạng thái line trên LED.\nLbIRLine.displayOnRGB(CRGB::Green);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbTouch.read(TB1A);",
    "description": "Đọc nút cảm ứng.",
    "parameters": "TB1A/TB1B hoặc nút được SDK hỗ trợ.",
    "returns": "Trạng thái HIGH/LOW.",
    "notes": "Đợi bằng vòng lặp có thể chặn nhiệm vụ.",
    "code": "// Đọc nút cảm ứng.\nif (LbTouch.read(TB1A) == HIGH) {\n  Serial.println(\"Pressed\"); // Đã chạm\n}",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "Leanbot.pingCm();",
    "description": "Đọc cảm biến khoảng cách siêu âm.",
    "parameters": "Không có tham số.",
    "returns": "Khoảng cách tính bằng cm.",
    "notes": "Xử lý trường hợp ngoài tầm theo SDK; không phải cảm biến màu.",
    "code": "// Đọc cảm biến khoảng cách siêu âm.\nfloat cm = Leanbot.pingCm();\nSerial.println(cm);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "Leanbot.tone(1000, 200);",
    "description": "Phát âm báo.",
    "parameters": "Tần số Hz, thời gian ms; Blockly cũng dùng tone(freq).",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Kiểm tra thư viện đúng phiên bản trên bo đang dùng.",
    "code": "// Phát âm báo.\nLeanbot.tone(1000, 200);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "Leanbot.noTone();",
    "description": "Dừng phát âm báo.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Kiểm tra thư viện đúng phiên bản trên bo đang dùng.",
    "code": "// Dừng phát âm báo.\nLeanbot.noTone();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbRGB.fillColor(CRGB(255, 0, 0));",
    "description": "Ghi màu vào bộ đệm LED.",
    "parameters": "R/G/B: 0..255.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Gọi show để hiển thị.",
    "code": "// Ghi màu vào bộ đệm LED.\nLbRGB.fillColor(CRGB(255, 0, 0));",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbRGB.fillColor(CRGB::Green, BITMAP(ledA, ledB));",
    "description": "Tô màu các LED được chọn.",
    "parameters": "Màu và mặt nạ LED.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Hằng ledA/ledB/BITMAP do SDK cung cấp; gọi show sau đó.",
    "code": "// Tô màu các LED được chọn.\nLbRGB.fillColor(CRGB::Green, BITMAP(ledA, ledB));",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbRGB[ledA] = CRGB::Blue;",
    "description": "Đặt màu riêng cho một LED.",
    "parameters": "Chỉ số LED hợp lệ và màu CRGB.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Chỉ cập nhật bộ đệm, sau đó gọi show.",
    "code": "// Đặt màu riêng cho một LED.\nLbRGB[ledA] = CRGB::Blue;",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbRGB.clear();",
    "description": "Xóa màu trong bộ đệm LED.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Gọi show để áp dụng ra LED thật.",
    "code": "// Xóa màu trong bộ đệm LED.\nLbRGB.clear();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbRGB.show();",
    "description": "Hiển thị bộ đệm màu ra LED.",
    "parameters": "Không có tham số.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "LED chiếu vào vật có thể ảnh hưởng phép đo màu.",
    "code": "// Hiển thị bộ đệm màu ra LED.\nLbRGB.show();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbRGB.getBrightness();",
    "description": "Đọc độ sáng LED.",
    "parameters": "Không có tham số.",
    "returns": "Mức sáng 0..255 trong cách dùng của project.",
    "notes": "Kiểm tra thư viện đúng phiên bản trên bo đang dùng.",
    "code": "// Đọc độ sáng LED.\nLbRGB.getBrightness();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbRGB.setBrightness(64);",
    "description": "Đặt độ sáng LED.",
    "parameters": "Mức sáng 0..255.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Không dùng để hiệu chuẩn màu cảm biến.",
    "code": "// Đặt độ sáng LED.\nLbRGB.setBrightness(64);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbDelay(100);",
    "description": "Đợi theo thời gian Leanbot.",
    "parameters": "Thời gian ms.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Tay async của baseCode cần robot_delay để tiếp tục được cập nhật.",
    "code": "// Đợi theo thời gian Leanbot.\nLbDelay(100);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "iot",
    "api": "LbIoT.Wifi.begin(ssid, password);",
    "description": "Thiết lập kết nối WiFi.",
    "parameters": "SSID và mật khẩu const char* theo script.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Chỉ gọi ngoài vòng điều khiển động cơ; không in mật khẩu.",
    "code": "// Thiết lập kết nối WiFi.\nLbIoT.Wifi.begin(ssid, password);",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "iot",
    "api": "LbIoT.Asset.begin(F(\"AssetID\"));",
    "description": "Chọn Asset để truy cập dữ liệu.",
    "parameters": "Asset ID dạng const __FlashStringHelper*; Stream* tùy chọn trong header compiler.",
    "returns": "int8_t theo header đã xuất hiện trong log compiler.",
    "notes": "Không suy đoán mã thành công khi chưa có header đầy đủ; không truyền c_str().",
    "code": "// Chọn Asset để truy cập dữ liệu.\nLbIoT.Asset.begin(F(\"AssetID\"));",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "iot",
    "api": "LbIoT.Asset.attribute(F(\"Color\"));",
    "description": "Tạo đối tượng truy cập thuộc tính.",
    "parameters": "Tên thuộc tính dạng F(...).",
    "returns": "Đối tượng thuộc tính; dùng auto để nhận.",
    "notes": "Ví dụ khai báo toàn cục auto IoTColor = LbIoT.Asset.attribute(F(\"Color\"));",
    "code": "// Tạo đối tượng truy cập thuộc tính.\nLbIoT.Asset.attribute(F(\"Color\"));",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "iot",
    "api": "IoTColor.write(\"Blue\");",
    "description": "Ghi giá trị vào thuộc tính đã chọn.",
    "parameters": "Chuỗi giá trị, ví dụ Blue/Red/Green/Yellow/Purple.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Hai robot phải có quyền truy cập cùng Asset và tên thuộc tính.",
    "code": "// Ghi giá trị vào thuộc tính đã chọn.\nIoTColor.write(\"Blue\");",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "iot",
    "api": "String value = IoTColor.read();",
    "description": "Đọc giá trị hiện tại của thuộc tính.",
    "parameters": "Không có tham số.",
    "returns": "Giá trị gán cho String theo script.",
    "notes": "Không tự phân biệt dữ liệu mới/cũ; FIFO cục bộ không khôi phục bản tin bị ghi đè.",
    "code": "// Đọc giá trị hiện tại của thuộc tính.\nString value = IoTColor.read();",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "sensors",
    "api": "APDS.begin();",
    "description": "Khởi tạo cảm biến.",
    "parameters": "Không có.",
    "returns": "bool.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Khởi tạo cảm biến.\ncolorSensorReady = APDS.begin();",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.end();",
    "description": "Dừng cảm biến.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Dừng cảm biến.\nAPDS.end();",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.colorAvailable();",
    "description": "Kiểm tra mẫu màu.",
    "parameters": "Không có.",
    "returns": "int trạng thái.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Kiểm tra mẫu màu.\nAPDS.colorAvailable();",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.readColor(r, g, b);",
    "description": "Đọc RGB.",
    "parameters": "Ba biến int tham chiếu.",
    "returns": "bool.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Đọc RGB.\nAPDS.readColor(r, g, b);",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.readColor(r, g, b, c);",
    "description": "Đọc RGB và clear.",
    "parameters": "Bốn biến int tham chiếu.",
    "returns": "bool.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Đọc RGB và clear.\nAPDS.readColor(r, g, b, c);",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.proximityAvailable();",
    "description": "Kiểm tra mẫu gần.",
    "parameters": "Không có.",
    "returns": "int trạng thái.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Kiểm tra mẫu gần.\nAPDS.proximityAvailable();",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.readProximity();",
    "description": "Đọc độ gần.",
    "parameters": "Không có.",
    "returns": "int.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Đọc độ gần.\nAPDS.readProximity();",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.gestureAvailable();",
    "description": "Kiểm tra cử chỉ.",
    "parameters": "Không có.",
    "returns": "int trạng thái.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Kiểm tra cử chỉ.\nAPDS.gestureAvailable();",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.readGesture();",
    "description": "Đọc cử chỉ.",
    "parameters": "Không có.",
    "returns": "int mã GESTURE_*.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Đọc cử chỉ.\nAPDS.readGesture();",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.setGestureSensitivity(80);",
    "description": "Đặt nhạy cử chỉ.",
    "parameters": "uint8_t sensitivity.",
    "returns": "void.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Đặt nhạy cử chỉ.\nAPDS.setGestureSensitivity(80);",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.setInterruptPin(pin);",
    "description": "Chọn chân ngắt.",
    "parameters": "int pin.",
    "returns": "void.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Chọn chân ngắt.\nAPDS.setInterruptPin(pin);",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "sensors",
    "api": "APDS.setLEDBoost(0);",
    "description": "Đặt boost LED IR.",
    "parameters": "uint8_t boost.",
    "returns": "bool.",
    "notes": "Arduino_APDS9960; kiểm tra phiên bản.",
    "code": "// Đặt boost LED IR.\nAPDS.setLEDBoost(0);",
    "source": "Arduino_APDS9960.h (Arduino)"
  },
  {
    "group": "arduino",
    "api": "Serial.begin(115200);",
    "description": "Khởi tạo cổng Serial.",
    "parameters": "Baud rate bit/s.",
    "returns": "Không dùng kết quả.",
    "notes": "Trùng 115200 với Web Serial Debug.",
    "code": "// Khởi tạo cổng Serial.\nSerial.begin(115200);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "Serial.print(value);",
    "description": "In dữ liệu không xuống dòng.",
    "parameters": "Số, chuỗi hoặc giá trị hỗ trợ.",
    "returns": "Số byte đã ghi.",
    "notes": "Dùng println để kết thúc dòng.",
    "code": "// In dữ liệu không xuống dòng.\nSerial.print(value);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "Serial.println(value);",
    "description": "In dữ liệu rồi xuống dòng.",
    "parameters": "Giá trị cần in.",
    "returns": "Số byte đã ghi.",
    "notes": "Không in quá dày trong vòng phản hồi 1 ms.",
    "code": "// In dữ liệu rồi xuống dòng.\nSerial.println(value);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "Serial.available();",
    "description": "Kiểm tra dữ liệu nhận.",
    "parameters": "Không có.",
    "returns": "Số byte đang chờ đọc.",
    "notes": "Không phải trạng thái kết nối mạng.",
    "code": "// Kiểm tra dữ liệu nhận.\nSerial.available();",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "Serial.read();",
    "description": "Lấy một byte từ bộ đệm nhận.",
    "parameters": "Không có.",
    "returns": "int; -1 nếu không có dữ liệu.",
    "notes": "Kiểm tra available trước khi đọc.",
    "code": "// Lấy một byte từ bộ đệm nhận.\nSerial.read();",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "Serial.write(65);",
    "description": "Gửi byte thô qua Serial.",
    "parameters": "Byte hoặc bộ đệm.",
    "returns": "Số byte ghi.",
    "notes": "Không phải chuỗi biểu diễn số như print.",
    "code": "// Gửi byte thô qua Serial.\nSerial.write(65);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "Serial.flush();",
    "description": "Đợi gửi xong dữ liệu Serial.",
    "parameters": "Không có.",
    "returns": "Không dùng kết quả.",
    "notes": "Không xóa dữ liệu đang chờ nhận.",
    "code": "// Đợi gửi xong dữ liệu Serial.\nSerial.flush();",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "millis();",
    "description": "Đọc thời gian từ lúc khởi động.",
    "parameters": "Không có.",
    "returns": "unsigned long, ms.",
    "notes": "So sánh bằng phép trừ unsigned để xử lý tràn.",
    "code": "// Đọc thời gian từ lúc khởi động.\nunsigned long start = millis();\n// Sau đó: millis() - start là thời gian đã trôi qua.",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "delay(100);",
    "description": "Đợi theo thời gian Arduino.",
    "parameters": "ms.",
    "returns": "Không dùng kết quả.",
    "notes": "Không phục vụ tay async của script.",
    "code": "// Đợi theo thời gian Arduino.\ndelay(100);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "constrain(x, 0, 100);",
    "description": "Giới hạn giá trị trong một khoảng.",
    "parameters": "Giá trị, cận dưới, cận trên.",
    "returns": "Giá trị đã giới hạn.",
    "notes": "Tránh biểu thức có tác dụng phụ trong macro.",
    "code": "// Giới hạn giá trị trong một khoảng.\nconstrain(x, 0, 100);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "min(a, b);",
    "description": "Lấy giá trị nhỏ hơn.",
    "parameters": "Hai giá trị so sánh.",
    "returns": "Giá trị nhỏ hơn.",
    "notes": "Tránh ++ hoặc gọi hàm có tác dụng phụ trong macro.",
    "code": "// Lấy giá trị nhỏ hơn.\nmin(a, b);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "max(a, b);",
    "description": "Lấy giá trị lớn hơn.",
    "parameters": "Hai giá trị so sánh.",
    "returns": "Giá trị lớn hơn.",
    "notes": "Tránh ++ hoặc gọi hàm có tác dụng phụ trong macro.",
    "code": "// Lấy giá trị lớn hơn.\nmax(a, b);",
    "source": "Arduino language reference"
  },
  {
    "group": "arduino",
    "api": "F(\"text\");",
    "description": "Đặt chuỗi hằng trong flash trên AVR.",
    "parameters": "Chuỗi literal.",
    "returns": "Con trỏ chuỗi flash.",
    "notes": "Không ép con trỏ String/c_str sang kiểu flash.",
    "code": "// Đặt chuỗi hằng trong flash trên AVR.\nF(\"text\");",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "isfinite(value);",
    "description": "Kiểm tra số hữu hạn.",
    "parameters": "Giá trị số thực.",
    "returns": "Đúng nếu không phải NaN/vô cực.",
    "notes": "Kiểm tra đầu vào trước khi tính chuyển động.",
    "code": "// Kiểm tra số hữu hạn.\nisfinite(value);",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "fabsf(value);",
    "description": "Lấy trị tuyệt đối float.",
    "parameters": "float.",
    "returns": "float không âm.",
    "notes": "Không thay đổi chiều động cơ.",
    "code": "// Lấy trị tuyệt đối float.\nfabsf(value);",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "sqrtf(value);",
    "description": "Tính căn bậc hai.",
    "parameters": "float không âm.",
    "returns": "float.",
    "notes": "Đầu vào âm không cho kết quả hữu hạn hợp lệ.",
    "code": "// Tính căn bậc hai.\nsqrtf(value);",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "lroundf(value);",
    "description": "Làm tròn float sang long.",
    "parameters": "Giá trị float.",
    "returns": "long.",
    "notes": "Chỉ ép int sau khi đã kiểm tra phạm vi.",
    "code": "// Làm tròn float sang long.\nlroundf(value);",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "strcmp(text, \"L\");",
    "description": "So sánh chuỗi C.",
    "parameters": "Hai con trỏ chuỗi kết thúc bằng null.",
    "returns": "0 nếu bằng nhau, âm/dương theo thứ tự.",
    "notes": "Không truyền nullptr.",
    "code": "// So sánh chuỗi C.\nstrcmp(text, \"L\");",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "signal.trim();",
    "description": "Bỏ khoảng trắng đầu/cuối String.",
    "parameters": "Không có.",
    "returns": "Sửa String tại chỗ.",
    "notes": "Không phải hàm string.h; thuộc Arduino String.",
    "code": "// Bỏ khoảng trắng đầu/cuối String.\nsignal.trim();",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "signal.toUpperCase();",
    "description": "Đổi String thành chữ hoa.",
    "parameters": "Không có.",
    "returns": "Sửa String tại chỗ.",
    "notes": "Dùng chuẩn hóa màu IoT.",
    "code": "// Đổi String thành chữ hoa.\nsignal.toUpperCase();",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "wifiSsid.c_str();",
    "description": "Lấy con trỏ chuỗi C từ String.",
    "parameters": "Không có.",
    "returns": "const char*.",
    "notes": "Con trỏ có thể mất hiệu lực khi String đổi; không phải chuỗi flash.",
    "code": "// Lấy con trỏ chuỗi C từ String.\nwifiSsid.c_str();",
    "source": "Arduino language reference"
  },
  {
    "group": "cpp",
    "api": "wifiSsid.length();",
    "description": "Lấy độ dài String.",
    "parameters": "Không có.",
    "returns": "Số ký tự/byte theo String.",
    "notes": "Dùng kiểm tra SSID rỗng.",
    "code": "// Lấy độ dài String.\nwifiSsid.length();",
    "source": "Arduino language reference"
  },
  {
    "group": "helpers",
    "api": "failMission(ERR_MOVE_STALL);",
    "description": "Ghi lỗi đầu tiên và dừng bánh.",
    "parameters": "ErrorCode.",
    "returns": "void.",
    "notes": "Không khóa lệnh sau; cần return nếu muốn dừng nhiệm vụ.",
    "code": "// Ghi lỗi đầu tiên và dừng bánh.\nfailMission(ERR_MOVE_STALL);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "resetMotionState();",
    "description": "Xóa trạng thái điều khiển line.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Không reset origin encoder.",
    "code": "// Xóa trạng thái điều khiển line.\nresetMotionState();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "update_hand();",
    "description": "Cập nhật góc tay theo thời gian.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Gọi thường xuyên nếu tự viết vòng lặp.",
    "code": "// Cập nhật góc tay theo thời gian.\nupdate_hand();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "robot_delay(100);",
    "description": "Đợi trong khi phục vụ tay async.",
    "parameters": "ms.",
    "returns": "void.",
    "notes": "Không tự đọc mạng IoT.",
    "code": "// Đợi trong khi phục vụ tay async.\nrobot_delay(100);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "close_hand_async(50);",
    "description": "Bắt đầu đóng tay không đợi.",
    "parameters": "Góc kẹp, độ; giới hạn -30..120.",
    "returns": "void.",
    "notes": "Giả định góc tay đang đồng bộ với handAngle.",
    "code": "// Bắt đầu đóng tay không đợi.\nclose_hand_async(50);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "open_hand_async();",
    "description": "Bắt đầu mở tay không đợi.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Đích là 0 độ.",
    "code": "// Bắt đầu mở tay không đợi.\nopen_hand_async();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "wait_hand();",
    "description": "Đợi tác vụ tay hoàn tất.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Gọi trước khi kết thúc nhiệm vụ.",
    "code": "// Đợi tác vụ tay hoàn tất.\nwait_hand();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "close_hand(50);",
    "description": "Đóng tay và đợi hoàn tất.",
    "parameters": "Góc kẹp, độ.",
    "returns": "void.",
    "notes": "Dùng GRIP_CLOSE_ANGLE theo khối thật.",
    "code": "// Đóng tay và đợi hoàn tất.\nclose_hand(50);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "open_hand();",
    "description": "Mở tay và đợi hoàn tất.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Chờ cả chuyển động và ổn định.",
    "code": "// Mở tay và đợi hoàn tất.\nopen_hand();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "turn_angle(1800, 90, TWO_WHEELS);",
    "description": "Quay có phản hồi, tăng/giảm tốc và kiểm tra kẹt.",
    "parameters": "Tốc độ, góc độ, TurnMode.",
    "returns": "void.",
    "notes": "Dùng TURN_SCALE và ngưỡng phanh hiện tại.",
    "code": "// Quay có phản hồi, tăng/giảm tốc và kiểm tra kẹt.\nturn_angle(1800, 90, TWO_WHEELS);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "turn_one_wheel(1800, 90, \"L\");",
    "description": "Quay bằng một bánh.",
    "parameters": "Tốc độ, góc độ, \"L\" hoặc \"R\".",
    "returns": "void.",
    "notes": "Giữ quy ước dấu riêng của hàm trong baseCode.",
    "code": "// Quay bằng một bánh.\nturn_one_wheel(1800, 90, \"L\");",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "turn_two_wheels(1800, 90);",
    "description": "Quay bằng hai bánh.",
    "parameters": "Tốc độ, góc độ có dấu.",
    "returns": "void.",
    "notes": "Không gọi từ bên trong vòng điều khiển khác.",
    "code": "// Quay bằng hai bánh.\nturn_two_wheels(1800, 90);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "move_tank(1800, 1800, 10);",
    "description": "Đi có phản hồi quãng đường và bù hướng.",
    "parameters": "Tốc độ L/R cùng dấu, quãng đường cm không âm.",
    "returns": "void.",
    "notes": "Hai tốc độ âm để lùi; giới hạn quãng đường 1200 cm.",
    "code": "// Đi có phản hồi quãng đường và bù hướng.\nmove_tank(1800, 1800, 10);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "declare_wifi(\"SSID\", \"password\", F(\"AssetID\"));",
    "description": "Lưu cấu hình WiFi/Asset.",
    "parameters": "SSID, mật khẩu String, Asset flash tùy chọn.",
    "returns": "void.",
    "notes": "Chưa kết nối mạng; không in mật khẩu.",
    "code": "// Lưu cấu hình WiFi/Asset.\ndeclare_wifi(\"SSID\", \"password\", F(\"AssetID\"));",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "set_wifi();",
    "description": "Kết nối theo cấu hình đã khai báo.",
    "parameters": "Không có; có overload nhận SSID, mật khẩu, Asset.",
    "returns": "void.",
    "notes": "Có thể chặn; SSID rỗng ghi ERR_WIFI_CONFIG.",
    "code": "// Kết nối theo cấu hình đã khai báo.\nset_wifi();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "set_line(69, 78, 106, 70);",
    "description": "Đặt ngưỡng line.",
    "parameters": "2L, 0L, 1R, 3R.",
    "returns": "void.",
    "notes": "Hiệu chuẩn theo nền và ánh sáng thật.",
    "code": "// Đặt ngưỡng line.\nset_line(69, 78, 106, 70);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "measure_line();",
    "description": "Đọc mặt nạ line hiện tại.",
    "parameters": "Không có.",
    "returns": "int 0..15.",
    "notes": "Không phải ADC hoặc khoảng cách.",
    "code": "// Đọc mặt nạ line hiện tại.\nmeasure_line();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "print_line();",
    "description": "In mặt nạ line ra Serial.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Serial phải được khởi tạo.",
    "code": "// In mặt nạ line ra Serial.\nprint_line();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "runFollowLine();",
    "description": "Cập nhật điều khiển line một lần.",
    "parameters": "Không có hoặc int mặt nạ.",
    "returns": "void.",
    "notes": "Gọi lặp lại; không tự đi cả đoạn.",
    "code": "// Cập nhật điều khiển line một lần.\nrunFollowLine();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "followLineDistance(100);",
    "description": "Dò line theo quãng đường rồi dừng.",
    "parameters": "Khoảng cách mm.",
    "returns": "void.",
    "notes": "Có timeout và kiểm tra mất line.",
    "code": "// Dò line theo quãng đường rồi dừng.\nfollowLineDistance(100);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "followLineUntilJunction();",
    "description": "Dò tới giao lộ đã xác nhận.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Bỏ qua giao lộ lúc mới xuất phát theo cấu hình.",
    "code": "// Dò tới giao lộ đã xác nhận.\nfollowLineUntilJunction();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "centerDetectedJunction();",
    "description": "Tiến vào tâm giao lộ vừa phát hiện.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Chỉ thực hiện nếu junctionPending.",
    "code": "// Tiến vào tâm giao lộ vừa phát hiện.\ncenterDetectedJunction();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "followLineMultipleJunctions(2);",
    "description": "Dò tới giao lộ thứ n.",
    "parameters": "Số giao lộ.",
    "returns": "void.",
    "notes": "Căn tâm giữa các giao lộ; giao lộ cuối còn chờ căn tâm.",
    "code": "// Dò tới giao lộ thứ n.\nfollowLineMultipleJunctions(2);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "goToJunction();",
    "description": "Tìm giao lộ nếu cần rồi căn tâm.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Dùng junctionPending tránh tìm lại giao lộ đã có.",
    "code": "// Tìm giao lộ nếu cần rồi căn tâm.\ngoToJunction();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "set_color_white(100, 120, 80);",
    "description": "Cân bằng trắng cho phân loại Hue.",
    "parameters": "RGB thực tế của mẫu trắng.",
    "returns": "void.",
    "notes": "Ví dụ số minh họa; không dùng màu khối để cân bằng trắng.",
    "code": "// Cân bằng trắng cho phân loại Hue.\nset_color_white(100, 120, 80);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "readAPDSColor(r, g, b);",
    "description": "Đọc một mẫu RGB có thời hạn.",
    "parameters": "Ba biến int tham chiếu.",
    "returns": "bool thành công.",
    "notes": "Không tự phân loại hoặc đổi LED.",
    "code": "// Đọc một mẫu RGB có thời hạn.\nreadAPDSColor(r, g, b);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "set_color_reference(OBJECT_RED, 100, 15, 10);",
    "description": "Lưu mẫu màu đã gán nhãn.",
    "parameters": "Màu và RGB thô thực tế.",
    "returns": "void.",
    "notes": "Mẫu trong RAM; cần lưu câu lệnh vào setup để dùng sau reset.",
    "code": "// Lưu mẫu màu đã gán nhãn.\nset_color_reference(OBJECT_RED, 100, 15, 10);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "calibrate_color(OBJECT_RED);",
    "description": "Học mẫu khi đang đặt đúng khối.",
    "parameters": "Tên màu thật.",
    "returns": "void.",
    "notes": "Cần học riêng đủ 5 màu; không gán 5 tên cho cùng khối.",
    "code": "// Học mẫu khi đang đặt đúng khối.\ncalibrate_color(OBJECT_RED);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "readObjectColor(valid);",
    "description": "Đọc 5 mẫu, phân loại khi có ít nhất 4 phiếu.",
    "parameters": "bool valid đã khai báo, truyền tham chiếu.",
    "returns": "ObjectColor; valid báo đọc đủ mẫu.",
    "notes": "valid=true vẫn có thể UNKNOWN; chỉ xử lý khi màu xác định.",
    "code": "// Đọc 5 mẫu, phân loại khi có ít nhất 4 phiếu.\nreadObjectColor(valid);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "Obj_detectColor();",
    "description": "Đọc màu qua hàm rút gọn.",
    "parameters": "Không có.",
    "returns": "ObjectColor.",
    "notes": "Không cung cấp riêng cờ lỗi cảm biến.",
    "code": "// Đọc màu qua hàm rút gọn.\nObj_detectColor();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "requireColor(OBJECT_BLUE);",
    "description": "Đo và kiểm tra màu đích.",
    "parameters": "Màu mong đợi.",
    "returns": "void.",
    "notes": "Ghi lỗi khi đọc được nhưng không đúng màu.",
    "code": "// Đo và kiểm tra màu đích.\nrequireColor(OBJECT_BLUE);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "send_iot_color(OBJECT_BLUE);",
    "description": "Gửi tên màu lên thuộc tính Color.",
    "parameters": "ObjectColor.",
    "returns": "void.",
    "notes": "Cần cấu hình WiFi và Asset.",
    "code": "// Gửi tên màu lên thuộc tính Color.\nsend_iot_color(OBJECT_BLUE);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "iot_queue_count();",
    "description": "Đọc số tín hiệu đang chờ.",
    "parameters": "Không có.",
    "returns": "int 0..16.",
    "notes": "Chỉ là hàng đợi cục bộ.",
    "code": "// Đọc số tín hiệu đang chờ.\niot_queue_count();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "clear_iot_queue();",
    "description": "Xóa FIFO và cờ đầy.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Giữ màu cuối để tránh xếp lại giá trị cũ.",
    "code": "// Xóa FIFO và cờ đầy.\nclear_iot_queue();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "peek_iot_color();",
    "description": "Xem tín hiệu cũ nhất.",
    "parameters": "Không có.",
    "returns": "ObjectColor; UNKNOWN nếu rỗng.",
    "notes": "Không lấy khỏi hàng đợi.",
    "code": "// Xem tín hiệu cũ nhất.\npeek_iot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "pop_iot_color();",
    "description": "Lấy tín hiệu cũ nhất ra khỏi FIFO.",
    "parameters": "Không có.",
    "returns": "ObjectColor; UNKNOWN nếu rỗng.",
    "notes": "Thứ tự nhận trước, xử lý trước.",
    "code": "// Lấy tín hiệu cũ nhất ra khỏi FIFO.\npop_iot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "read_iot_color();",
    "description": "Đọc mạng và xếp màu mới vào FIFO.",
    "parameters": "Không có.",
    "returns": "ObjectColor.",
    "notes": "Cùng màu bị lọc trùng tới khi thấy WAITING hoặc màu khác.",
    "code": "// Đọc mạng và xếp màu mới vào FIFO.\nread_iot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "poll_iot_color();",
    "description": "Phục vụ việc nhận IoT một lần.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Gọi định kỳ ngoài vòng điều khiển động cơ.",
    "code": "// Phục vụ việc nhận IoT một lần.\npoll_iot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "reset_iot_color();",
    "description": "Ghi waiting để mở lượt trao đổi mới.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Không tự xóa FIFO robot nhận; cần robot nhận đọc được waiting.",
    "code": "// Ghi waiting để mở lượt trao đổi mới.\nreset_iot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "wait_iot_color(OBJECT_BLUE, 30000UL);",
    "description": "Đợi màu đích với thời hạn.",
    "parameters": "Màu, timeout ms; mặc định 30000.",
    "returns": "bool; false khi lỗi hoặc timeout.",
    "notes": "Có xếp hàng nhưng không tự pop; thời hạn kiểm tra giữa các lần đọc mạng.",
    "code": "// Đợi màu đích với thời hạn.\nwait_iot_color(OBJECT_BLUE, 30000UL);",
    "source": "baseCode.cpp"
  }
]
