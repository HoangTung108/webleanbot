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
    "returns": "Ví dụ không dùng giá trị trả về; lấy mặt nạ bằng LbIRLine.value() sau khi cập nhật.",
    "notes": "Đọc lại cảm biến trước khi dùng trạng thái được lưu.",
    "code": "LbIRLine.read(); // Cập nhật\nint bits = LbIRLine.value(); // Mặt nạ digital 0..15\nSerial.println(bits);",
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
    "notes": "Gọi sau Leanbot.begin khi robot đứng yên. Quy trình tương tác do SDK quyết định. Không gọi setThreshold/set_line sau đó vì sẽ ghi đè ngưỡng vừa học; không khẳng định ngưỡng được lưu qua mất nguồn.",
    "code": "#include <Leanbot.h>\n\nvoid setup() {\n  Leanbot.begin();\n  Serial.begin(115200);\n  LbMotion.stopAndWait(); // Đứng yên khi hiệu chuẩn\n  LbIRLine.doManualCalibration(TB1A); // Theo các bước SDK, chạm TB1A xác nhận\n  // Không setThreshold ở đây: sẽ ghi đè ngưỡng vừa hiệu chuẩn.\n}\n\nvoid loop() {\n  LbIRLine.read(); // Cập nhật trước khi hiển thị\n  LbIRLine.displayOnRGB(CRGB::Green); // LED báo cảm biến thấy line\n  LbRGB.show();\n  Serial.println(LbIRLine.value()); // Mặt nạ 0..15, không phải RGB\n  LbDelay(200); // Xem lần lượt trên nền đen và nền trắng\n}",
    "source": "Bộ sinh Blockly trong project / các lời gọi SDK hiện có"
  },
  {
    "group": "leanbot",
    "api": "LbIRLine.displayOnRGB(CRGB::Green);",
    "description": "Hiển thị trạng thái line trên LED.",
    "parameters": "Màu hiển thị.",
    "returns": "Ví dụ không sử dụng kết quả trả về; đối chiếu kiểu trả về với SDK đang cài.",
    "notes": "Chỉ dùng trong chế độ xem line; sẽ thay màu LED thông báo khối. Cảm biến IR phân biệt nền đen/trắng, không phân loại năm màu như APDS.",
    "code": "// Trong loop chẩn đoán, sau khi đã khởi tạo Leanbot và ngưỡng line:\nLbIRLine.read(); // Cập nhật cảm biến\nLbIRLine.displayOnRGB(CRGB::Green); // Hiển thị trạng thái line, không đo màu RGB\nLbRGB.show();\nLbDelay(100);",
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
    "notes": "Nếu đích không đổi thì không khởi động lại. Gọi các lệnh di chuyển hoặc robot_delay để tay tiếp tục cập nhật; dùng wait_hand khi cần chờ xong.",
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
    "api": "turn_angle(2000, 90, TWO_WHEELS);",
    "description": "Quay có phản hồi, tăng/giảm tốc và kiểm tra kẹt.",
    "parameters": "Tốc độ, góc độ, TurnMode.",
    "returns": "void.",
    "notes": "Dùng TURN_SCALE và ngưỡng phanh hiện tại. Trần quay MAX_MOTOR_SPEED hiện là 2000; giới hạn tốc độ theo góc còn lại giữ chậm các độ cuối để hạn chế vượt góc.",
    "code": "// Quay có phản hồi, tăng/giảm tốc và kiểm tra kẹt.\nturn_angle(2000, 90, TWO_WHEELS);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "turn_one_wheel(2000, 90, \"L\");",
    "description": "Quay bằng một bánh.",
    "parameters": "Tốc độ, góc độ, \"L\" hoặc \"R\".",
    "returns": "void.",
    "notes": "Giữ quy ước dấu riêng của hàm trong baseCode. Trần quay MAX_MOTOR_SPEED hiện là 2000; giới hạn tốc độ theo góc còn lại giữ chậm các độ cuối để hạn chế vượt góc.",
    "code": "// Quay bằng một bánh.\nturn_one_wheel(2000, 90, \"L\");",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "turn_two_wheels(2000, 90);",
    "description": "Quay bằng hai bánh.",
    "parameters": "Tốc độ, góc độ có dấu.",
    "returns": "void.",
    "notes": "Không gọi từ bên trong vòng điều khiển khác. Trần quay MAX_MOTOR_SPEED hiện là 2000; giới hạn tốc độ theo góc còn lại giữ chậm các độ cuối để hạn chế vượt góc.",
    "code": "// Quay bằng hai bánh.\nturn_two_wheels(2000, 90);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "move_tank(2000, 2000, 10);",
    "description": "Đi theo quãng đường với PID giữ hướng và ACC tăng/giảm tốc.",
    "parameters": "Tốc độ L/R cùng dấu, quãng đường cm không âm.",
    "returns": "void.",
    "notes": "Hai tốc độ âm để lùi. PID giữ hướng bắt đầu, lọc D và hạn chế tích lũy I khi chạm giới hạn. ACC dùng thời gian thực và quãng đường còn lại để tăng/phanh; MOVE_ACCEL=18000, MOVE_DECEL=2600 bước/s². Quy đổi dựa trên phép đo 2000 bước/s = 65 mm/s, cần hiệu chỉnh trên robot thật. Lệnh bánh giới hạn ±2000; vẫn kiểm tra kẹt, quá hạn và cập nhật tay. Leanbot.DCMotor.setPower chỉ điều khiển cổng DC phụ trợ.",
    "code": "// Đi thẳng 10 cm, PID tự sửa hướng và ACC điều chỉnh tốc độ.\nmove_tank(2000, 2000, 10);\n// Lùi 10 cm với cùng cơ chế phản hồi:\nmove_tank(-2000, -2000, 10);",
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
    "parameters": "Không có nếu đã gọi declare_wifi; hoặc truyền SSID, mật khẩu và Asset ID tùy chọn.",
    "returns": "void.",
    "notes": "Có thể chặn; SSID rỗng ghi ERR_WIFI_CONFIG.",
    "code": "// Khai báo và kết nối trong một lệnh:\nset_wifi(\"TenWifi\", \"MatKhau\", F(\"AssetID\"));\n// Hoặc sau khi đã gọi declare_wifi: dùng set_wifi();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "set_line(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R);",
    "description": "Đặt ngưỡng line.",
    "parameters": "2L, 0L, 1R, 3R.",
    "returns": "void.",
    "notes": "Dùng các hằng ngưỡng trong baseCode; cần hiệu chỉnh theo nền và ánh sáng thật. Không gọi sau calibrate_line vì sẽ ghi đè kết quả hiệu chuẩn.",
    "code": "// Đặt ngưỡng theo cấu hình baseCode, thay cho hiệu chuẩn thủ công.\nset_line(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "measure_line();",
    "description": "Đọc mặt nạ line hiện tại.",
    "parameters": "Không có.",
    "returns": "int 0..15.",
    "notes": "Hàm gọi read() để cập nhật rồi lấy value() và giữ bốn bit thấp. Không phải ADC hoặc khoảng cách.",
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
    "description": "Cập nhật một bước bám line bằng lõi PID analog.",
    "parameters": "bits tùy chọn: -1 (mặc định) tự đọc cảm biến, hoặc mặt nạ 0..15.",
    "returns": "void.",
    "notes": "PID analog, chu kỳ 10 ms. Bắt line ở tối đa 600, cần 5 mẫu giữa line mới tăng tốc. Cua gắt có trần 1000 và cho bánh trong lùi nhẹ; hysteresis tránh chuyển chế độ liên tục. Không thấy line từ đầu: quét hai phía tối đa 3,5 giây; mất line đã bám: tìm theo hướng cũ tối đa 2,5 giây. Quá hạn thì dừng/báo lỗi; không bảo đảm tìm được line nằm ngoài vùng quét cảm biến. Tâm analog chỉ dùng các cảm biến được mặt nạ hiệu chuẩn xác nhận đang thấy line. Quyền đánh lái tăng theo tốc độ khi lệch lớn, giữ gain vùng giữa để hạn chế lắc.",
    "code": "// Đặt trong loop, khi robot đang theo line.\nrunFollowLine(); // Cập nhật điều khiển một lần\nrobot_delay(LINE_STEP_MS); // Giữ chu kỳ 10 ms và phục vụ tay async",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "followLineDistance(100);",
    "description": "Dò line theo quãng đường rồi dừng.",
    "parameters": "distanceMm: mm; 100 = 10 cm. speedPercent tùy chọn: tốc độ %, mặc định LINE_SPEED / 20.",
    "returns": "void.",
    "notes": "Chuyển mm sang cm rồi dùng chung bộ thực thi PID. Quãng đường phản hồi được chia DISTANCE_SCALE một lần; lõi dùng mm nguyên. Có giảm tốc cuối đoạn, phát hiện kẹt/mất line.",
    "code": "// Dò 100 mm = 10 cm với tốc độ mặc định.\nfollowLineDistance(100);\n// Hoặc giới hạn ở 50% tốc độ:\nfollowLineDistance(100, 50);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "followLineUntilJunction();",
    "description": "Dò tới giao lộ đã xác nhận.",
    "parameters": "markerMode tùy chọn: 1=trái, 2=phải, 3=chữ T (mặc định). speedPercent tùy chọn: tốc độ %, mặc định LINE_SPEED / 20.",
    "returns": "void.",
    "notes": "Cần 3 mẫu xác nhận marker. Bắt đầu ngay trên marker có thể kết thúc sau 3 mẫu. Thay lbmbFollowMarker(50, 1) bằng followLineUntilJunction(1, 50).",
    "code": "// Tới giao lộ chữ T với tốc độ mặc định.\nfollowLineUntilJunction();\n// Tới marker trái ở tốc độ 50%:\nfollowLineUntilJunction(1, 50);",
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
    "api": "calibrate_color(RED);",
    "description": "Học mẫu khi đang đặt đúng khối.",
    "parameters": "Tên màu thật.",
    "returns": "void.",
    "notes": "Khởi tạo colorSensorReady = APDS.begin() trước. Lấy trung bình 5 mẫu và in lệnh lưu mẫu ra Serial. Khi dùng mẫu hiệu chuẩn cần đủ 5 màu; không gán 5 tên cho cùng khối.",
    "code": "// Học mẫu khi đang đặt đúng khối.\ncalibrate_color(RED);",
    "source": "baseCode.cpp"
  },

  {
    "group": "helpers",
    "api": "send_iot_color(BLUE);",
    "description": "Gửi tên màu lên thuộc tính Color.",
    "parameters": "ObjectColor.",
    "returns": "void.",
    "notes": "Cần cấu hình WiFi và Asset.",
    "code": "// Gửi tên màu lên thuộc tính Color.\nsend_iot_color(BLUE);",
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
    "notes": "Xóa hàng chờ cục bộ và cờ tràn; không đổi giá trị IoT trên mạng. Lần đọc tiếp theo vẫn thêm màu hợp lệ, kể cả giá trị cũ.",
    "code": "// Xóa FIFO và cờ đầy.\nclear_iot_queue();",
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
    "description": "Đọc mạng và thêm mỗi màu hợp lệ vào hàng chờ.",
    "parameters": "Không có.",
    "returns": "ObjectColor.",
    "notes": "Mỗi lần đọc màu hợp lệ đều thêm vào FIFO, kể cả cùng màu liên tiếp. Đọc lại giá trị IoT chưa đổi cũng thêm một mục; khi đầy chỉ bật cờ tràn.",
    "code": "// Mỗi lần đọc hợp lệ thêm một mục, kể cả màu trùng.\nread_iot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "reset_iot_color();",
    "description": "Ghi waiting để mở lượt trao đổi mới.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Không tự xóa FIFO robot nhận. Giá trị waiting không được thêm vào hàng chờ; không bắt buộc giữa hai màu giống nhau.",
    "code": "// Ghi waiting để mở lượt trao đổi mới.\nreset_iot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "wait_iot_color(BLUE, 30000UL);",
    "description": "Đợi màu đích với thời hạn.",
    "parameters": "RED, GREEN, BLUE, YELLOW hoặc PURPLE; timeout tính bằng ms, mặc định 30000.",
    "returns": "bool; false khi lỗi hoặc timeout.",
    "notes": "Đọc mạng qua read_iot_color nên mỗi lần đọc hợp lệ đều thêm hàng chờ, không tự pop. Màu không hợp lệ báo ERR_COLOR_MISMATCH; quá hạn báo ERR_IOT_TIMEOUT. Thời hạn được kiểm tra giữa các lần đọc mạng.",
    "code": "// Đợi màu đích với thời hạn.\nwait_iot_color(BLUE, 30000UL);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "use_wifi_color_mode();",
    "description": "Chuyển giao tiếp màu giữa 2 robot sang dùng trực tiếp module WiFi (LbIoT) thay vì cáp USB.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Sau khi bật, các lệnh send_real_robot_color, read_real_robot_color và wait_real_robot_color sẽ truyền nhận trực tiếp qua module WiFi của robot mà không cần cắm USB.",
    "code": "// Bật chế độ truyền tín hiệu màu qua module WiFi của robot.\nuse_wifi_color_mode();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "connect_robot_room(F(\"ROOM_ID\"));",
    "description": "Kết nối robot vào phòng trao đổi tín hiệu màu qua module WiFi.",
    "parameters": "roomId: Chuỗi flash tên phòng (F(\"ROOM_ID\")) trùng với mã phòng WebSocket.",
    "returns": "void.",
    "notes": "Tự động đặt LbIoT.Asset.begin(roomId) và kích hoạt wifiColorMode để hai robot giao tiếp trực tiếp qua WiFi không cần USB.",
    "code": "// Kết nối WiFi và vào phòng trao đổi tín hiệu màu ABC123.\nset_wifi(\"TenWifi\", \"MatKhau\");\nconnect_robot_room(F(\"ABC123\"));",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "send_real_robot_color(BLUE);",
    "description": "Gửi tín hiệu màu sang robot thứ hai qua module WiFi của robot hoặc Serial/WebSocket Bridge.",
    "parameters": "ObjectColor: RED, GREEN, BLUE, YELLOW, PURPLE.",
    "returns": "void.",
    "notes": "Khi đã kết nối WiFi (set_wifi kèm AssetID hoặc connect_robot_room), robot gửi màu trực tiếp qua module WiFi không cần USB; nếu chưa bật WiFi mode thì gửi qua Serial Bridge.",
    "code": "// Gửi tín hiệu màu sang robot đối tác qua WiFi hoặc Serial bridge.\nsend_real_robot_color(BLUE);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "read_real_robot_color();",
    "description": "Đọc tín hiệu màu nhận từ robot khác qua module WiFi hoặc Serial/WebSocket Bridge.",
    "parameters": "Không có.",
    "returns": "ObjectColor; UNKNOWN nếu chưa có dữ liệu mới.",
    "notes": "Tự động đọc từ kênh WiFi (LbIoT) khi ở chế độ WiFi hoặc từ Serial Bridge, và thêm màu hợp lệ vào hàng chờ iotColorQueue.",
    "code": "// Đọc tín hiệu màu từ robot đối tác.\nObjectColor received = read_real_robot_color();",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "wait_real_robot_color(BLUE, 30000UL);",
    "description": "Đợi nhận đúng màu đích từ robot khác qua module WiFi hoặc Serial/WebSocket Bridge.",
    "parameters": "expected: ObjectColor; timeoutMs: thời gian chờ tính bằng ms, mặc định 30000.",
    "returns": "bool; true nếu nhận đúng màu trước hạn.",
    "notes": "Kiểm tra tín hiệu qua module WiFi (LbIoT) hoặc Serial định kỳ; quá hạn báo lỗi ERR_IOT_TIMEOUT.",
    "code": "// Đợi robot đối tác gửi tín hiệu màu BLUE qua WiFi.\nwait_real_robot_color(BLUE, 30000UL);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "followLineSeconds(2.5f);",
    "description": "Dò line trong khoảng thời gian tính bằng giây rồi dừng.",
    "parameters": "seconds: 0..600 giây. speedPercent tùy chọn: tốc độ %, mặc định LINE_SPEED / 20.",
    "returns": "void.",
    "notes": "Dùng chung bộ thực thi PID, có giảm tốc trước hết giờ. Tay async vẫn cập nhật; mất line sẽ tìm có giới hạn rồi báo lỗi/dừng. Thay lbmbFollowTime(50, 2.5f) bằng followLineSeconds(2.5f, 50).",
    "code": "// Dò tối đa 2,5 giây rồi dừng bánh.\nfollowLineSeconds(2.5f);\n// Giới hạn tốc độ 50%:\nfollowLineSeconds(2.5f, 50);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "followLineCm(100);",
    "description": "Dò line theo cm, cùng đơn vị nhập với move_tank.",
    "parameters": "distanceCm: số thực hữu hạn 0..1200 cm; 100 = 1 mét. speedPercent tùy chọn: tốc độ %, mặc định LINE_SPEED / 20.",
    "returns": "void.",
    "notes": "Dùng chung bộ thực thi PID analog. Có giảm tốc cuối đoạn và xử lý kẹt/mất line. Thay lbmbFollowDistance(50, 32.5f) bằng followLineCm(32.5f, 50).",
    "code": "// Dò 32,5 cm ở tốc độ mặc định.\nfollowLineCm(32.5f);\n// Giới hạn tốc độ 50%:\nfollowLineCm(32.5f, 50);",
    "source": "baseCode.cpp"
  },

  {
    "group": "helpers",
    "api": "measure_line_error();",
    "description": "Đọc tâm line analog.",
    "parameters": "Không có.",
    "returns": "float -3..3; NAN nếu không thấy line.",
    "notes": "Kết quả -3..3, NAN nếu mặt nạ không hợp lệ. Khi độ tương phản IR yếu. Cần đo lại ngưỡng dưới ánh sáng thật. Giá trị IR ở cảm biến ngoài vạch bị loại khỏi trọng số, tránh kéo sai dấu lỗi.",
    "code": "float error = measure_line_error(); // Không làm robot di chuyển\nif (isfinite(error)) Serial.println(error);\nelse Serial.println(\"No line\");",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "calibrate_line();",
    "description": "Hiệu chuẩn line bằng nút TB1A qua API Leanbot.",
    "parameters": "Không có tham số.",
    "returns": "void.",
    "notes": "Dừng bánh, đợi tay, gọi doManualCalibration. Chỉ gọi một lần khi cần; SDK có thể chặn chờ thao tác. Không gọi set_line sau đó.",
    "code": "// Trong setup, sau Leanbot.begin và Serial.begin(115200):\ncalibrate_line(); // Đặt cảm biến theo quy trình SDK, chạm TB1A xác nhận\n// Sau đó mới bắt đầu nhiệm vụ.",
    "source": "baseCode.cpp"
  },

  {
    "group": "helpers",
    "api": "read_color();",
    "description": "Đọc màu khối bằng một lệnh, không cần khai báo biến.",
    "parameters": "Không có.",
    "returns": "bool: false khi lỗi cảm biến; true khi đọc đủ mẫu, kể cả khi kết quả là UNKNOWN.",
    "notes": "Giữ nhận diện 5 mẫu/4 phiếu và mẫu hiệu chuẩn hiện tại. Tự in Serial, chỉ đổi LED khi có màu xác định. Lỗi hoặc chưa chắc chắn xóa màu lưu về UNKNOWN.",
    "code": "read_color(); // Đọc và báo màu, không cần bool valid hay biến color",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "get_color();",
    "description": "Lấy màu của lần đo gần nhất mà không đo lại.",
    "parameters": "Không có.",
    "returns": "ObjectColor; UNKNOWN nếu chưa đo, đo lỗi hoặc chưa chắc chắn.",
    "notes": "Gọi read_color trước khi cần kết quả mới; không tự gửi IoT.",
    "code": "read_color(); // Cập nhật một lần\nif (is_color(BLUE)) send_iot_color(get_color()); // Không khai báo biến",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "is_color(BLUE);",
    "description": "Kiểm tra màu đã đo để rẽ nhánh mà không khai báo biến.",
    "parameters": "ObjectColor mong đợi.",
    "returns": "bool; UNKNOWN luôn trả false.",
    "notes": "Chỉ kiểm tra kết quả đã lưu, không đọc cảm biến lần nữa.",
    "code": "read_color();\nif (is_color(RED)) {\n  close_hand(GRIP_CLOSE_ANGLE); // Xử lý khi nhận diện được đỏ\n}",
    "source": "baseCode.cpp"
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
  }
]
