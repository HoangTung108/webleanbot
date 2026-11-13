export type ApiReference = { group: string; api: string; description: string; parameters: string; returns: string; notes: string; code: string; source: string }

export const apiReference: ApiReference[] = [
  {
    "group": "helpers",
    "api": "moveUntilLine(speed = 600, maxDistanceCm = 100);",
    "description": "Đi thẳng không dò line cho tới khi thấy line đen rồi dừng.",
    "parameters": "speed: 165..2000 (tốc độ tìm thực tế tối đa 350); maxDistanceCm: giới hạn tìm theo cm, mặc định 100.",
    "returns": "void. Hết quãng tìm hoặc lỗi sẽ cập nhật missionError.",
    "notes": "Dùng PID giữ hướng của move_tank và API LbIRLine.read/value theo ngưỡng SDK. Nếu đã đứng trên đen thì dừng, không bỏ qua line cũ. Chờ ổn định 30 ms sau lệnh trước, giới hạn tốc độ tìm ở 350 kể cả khi yêu cầu cao hơn để giảm vượt vạch. Dùng chung lbmbReadState và nhịp 10 ms với PID dò line. Khi nhận đen, đặt LbMotion.runLR(0, 0) ngay thay vì dừng giảm tốc; chỉ trả về sau khi phản hồi quãng đường/góc ổn định 150 ms; quá 1,2 giây chưa ổn định thì báo ERR_MOVE_STALL và chặn chuyển động sau. Không in log tìm line. Có giới hạn thời gian và phát hiện kẹt. Tốc độ cao có thể vượt qua vạch hẹp giữa hai lần đọc; nên bắt đầu ở 600. Hết quãng tìm báo ERR_LINE_LOST.",
    "code": "moveUntilLine(600, 100); // Tìm trong tối đa 100 cm\nif (missionError != ERR_NONE) return;\nfollowLineCm(32.5f); // Bắt đầu dò line sau khi tìm thấy",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "measure_line_values();",
    "description": "In thông số cảm biến line bằng API Leanbot.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Đọc ADC qua LbIRArray.read và mask qua LbIRLine.read. Đây là số đo tức thời, không phải ngưỡng do SDK hiệu chuẩn và không tự lưu qua lần khởi động.",
    "code": "measure_line_values(); // Xem ADC 2L/0L/1R/3R và mask trên Serial",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "reset_mission();",
    "description": "Dừng và đặt lại trạng thái bài chạy; TB2B gọi hàm này.",
    "parameters": "Không có.",
    "returns": "void.",
    "notes": "Giữ cấu hình WiFi/Asset và hiệu chuẩn line. Hủy tác vụ tay, giữ góc tay hiện tại; xóa màu đã đo trong base, không xóa thuộc tính Color trên cloud. Nhả nút rồi bấm TB1B để chạy lại. Lệnh SDK chặn chỉ kiểm tra reset sau khi trả về.",
    "code": "reset_mission(); // Hoặc chạm TB2B trong bài chạy dùng các hàm baseCode",
    "source": "baseCode.cpp"
  },
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
    "description": "Khởi tạo WiFi trước khi chọn Asset và đọc/ghi thuộc tính.",
    "parameters": "SSID và mật khẩu: chuỗi const char*. Với String, base truyền ssid.c_str() và password.c_str().",
    "returns": "Base không sử dụng kết quả. Chưa xác minh kiểu trả về và mã thành công từ header SDK gốc.",
    "notes": "Cần #include <LeanbotIoT.h>. Gọi sau Leanbot.begin() và trước LbIoT.Asset.begin(). Có thể chặn; tránh gọi trong vòng điều khiển bánh. Giả lập không kết nối WiFi thật và không kiểm tra mật khẩu. Cờ iotConfigured của base không xác nhận robot đã online.",
    "code": "// Trong setup(), sau Leanbot.begin():\nLbIoT.Wifi.begin(\"TenWifi\", \"MatKhau\");\nLbIoT.Asset.begin(F(\"AssetID\"));",
    "source": "docs/baseCode.cpp: set_wifi; src/simulator/cppRuntime.ts. Chưa đọc được header LeanbotIoT gốc do kho Pythaverse yêu cầu đăng nhập."
  },
  {
    "group": "iot",
    "api": "LbIoT.Asset.begin(F(\"AssetID\"));",
    "description": "Chọn Asset để truy cập dữ liệu.",
    "parameters": "Base dùng const __FlashStringHelper*: truyền F(\"AssetID\"). Chưa xác minh toàn bộ overload và tham số tùy chọn của SDK.",
    "returns": "Base bỏ qua kết quả; cần header đúng phiên bản để xác nhận kiểu và ý nghĩa mã trả về.",
    "notes": "Dùng AssetID thật có quyền truy cập; hai robot trao đổi màu cần cùng AssetID và tên Color. Không thay F(...) bằng String.c_str() khi dùng chữ ký hiện tại của base. Giả lập dùng AssetID để phân vùng dữ liệu, không xác thực quyền trên cloud Pythaverse.",
    "code": "// Chọn Asset để truy cập dữ liệu.\nLbIoT.Asset.begin(F(\"AssetID\"));",
    "source": "docs/baseCode.cpp: wifiAssetId và set_wifi; chưa đối chiếu header LeanbotIoT gốc."
  },
  {
    "group": "iot",
    "api": "LbIoT.Asset.attribute(F(\"Color\"));",
    "description": "Tạo đối tượng truy cập thuộc tính.",
    "parameters": "Tên thuộc tính dạng F(...).",
    "returns": "Đối tượng thuộc tính; base dùng auto, chưa xác minh tên lớp SDK.",
    "notes": "Khai báo toàn cục giống base; cấu hình WiFi/Asset trước khi read/write. IoTColor là tên biến do chương trình đặt, Color là tên thuộc tính. Lời gọi này không đủ để chứng minh thuộc tính mới được tạo trên cloud.",
    "code": "// Khai báo toàn cục, sau #include <LeanbotIoT.h>:\nauto IoTColor = LbIoT.Asset.attribute(F(\"Color\"));\n// Trong setup(): khởi tạo Leanbot, WiFi và Asset.\n// Trong loop(): dùng IoTColor.read() / IoTColor.write(...).",
    "source": "docs/baseCode.cpp: khai báo IoTColor; src/simulator/cppRuntime.ts: đối tượng thuộc tính giả lập."
  },
  {
    "group": "iot",
    "api": "IoTColor.write(\"Blue\");",
    "description": "Ghi giá trị vào thuộc tính đã chọn.",
    "parameters": "Base truyền const char*: Red, Green, Blue, Yellow hoặc Purple. Đây là giao thức màu của dự án, không phải toàn bộ kiểu dữ liệu SDK hỗ trợ.",
    "returns": "Base không sử dụng kết quả; chưa xác minh mã xác nhận ghi hoặc lỗi mạng của SDK.",
    "notes": "Ghi giá trị hiện tại, không có xác nhận robot kia đã xử lý. UNKNOWN được helper send_iot_color lọc trước khi gọi SDK. Hai lần gửi cùng màu không thể phân biệt chỉ bằng giá trị Color; cần giao thức mã lượt/ACK riêng nếu bài yêu cầu xử lý từng lần gửi.",
    "code": "// Ghi giá trị vào thuộc tính đã chọn.\nIoTColor.write(\"Blue\");",
    "source": "docs/baseCode.cpp: colorSignal và send_iot_color; src/simulator/colorIoT.test.ts."
  },
  {
    "group": "iot",
    "api": "String value = IoTColor.read();",
    "description": "Đọc giá trị hiện tại của thuộc tính.",
    "parameters": "Không có tham số.",
    "returns": "Base nhận kết quả vào String; chưa xác minh kiểu trả về gốc và biểu diễn lỗi của SDK.",
    "notes": "Đọc lại có thể trả cùng màu, không tiêu thụ một sự kiện. Helper read_iot_color(timeoutMs) trim chuỗi, không phân biệt hoa/thường, trả UNKNOWN nếu không có màu hợp lệ hoặc hết hạn. Timeout của helper không ngắt được một lời gọi SDK đang chặn. Giả lập trả waiting khi chưa có dữ liệu; không coi waiting là cam kết của SDK thật.",
    "code": "// Đọc giá trị hiện tại của thuộc tính.\nString value = IoTColor.read();",
    "source": "docs/baseCode.cpp: parseColorSignal và read_iot_color; src/simulator/cppRuntime.ts."
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
    "parameters": "Không có nếu đã gọi declare_wifi đủ SSID/AssetID; hoặc truyền SSID, mật khẩu và AssetID. AssetID bắt buộc để trao đổi màu.",
    "returns": "void.",
    "notes": "Gọi LbIoT.Wifi.begin(SSID, password), rồi LbIoT.Asset.begin(assetId). SSID hoặc AssetID chưa khai báo báo ERR_WIFI_CONFIG. Không kết nối WebSocket. Cờ iotConfigured chỉ ghi nhận đã gọi cấu hình SDK, không xác nhận online.",
    "code": "// Điền cấu hình trong setup sau Leanbot.begin():\ndeclare_wifi(\"TenWifi\", \"MatKhau\", F(\"AssetID_CHUNG\"));\n// TB2A trong FullMission gọi set_wifi();\n// Hoặc kết nối ngay: set_wifi(\"TenWifi\", \"MatKhau\", F(\"AssetID_CHUNG\"));",
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
    "api": "send_iot_color();",
    "description": "Gửi màu chỉ định hoặc màu khối vừa đo.",
    "parameters": "ObjectColor tùy chọn, mặc định là kết quả read_color gần nhất.",
    "returns": "void.",
    "notes": "Chỉ ghi thuộc tính Color qua LeanbotIoT. Cần set_wifi với SSID và AssetID; thiếu cấu hình báo ERR_WIFI_CONFIG. UNKNOWN không gửi. Không đọc cảm biến lần nữa.",
    "code": "read_color(); // Đọc khối một lần\nsend_iot_color(); // Gửi kết quả vừa đọc\n// Hoặc gửi chủ động:\nsend_iot_color(BLUE);",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "read_iot_color(timeoutMs = 0);",
    "description": "Đọc tín hiệu màu từ robot đối tác.",
    "parameters": "timeoutMs: 0 đọc một lần; >0 đợi màu hợp lệ tối đa số mili giây.",
    "returns": "ObjectColor, UNKNOWN khi chưa có màu, hết hạn hoặc TB2B reset.",
    "notes": "Chỉ đọc thuộc tính Color qua LeanbotIoT sau set_wifi với AssetID. Thiếu cấu hình báo ERR_WIFI_CONFIG và trả UNKNOWN. Kênh lưu giá trị cuối, không phải hàng chờ; đọc lại có thể nhận cùng màu.",
    "code": "if (read_iot_color(30000UL) == BLUE) {\n  close_hand(90); // Chờ tối đa 30 giây rồi xử lý màu nhận\n}",
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
    "notes": "Dừng bánh, đợi tay, gọi doManualCalibration. LINE_DEBUG mặc định false để giảm flash; bật true để tự in ADC sau hiệu chuẩn, hoặc gọi measure_line_values() khi cần. Chỉ gọi một lần khi cần; SDK có thể chặn chờ thao tác. Không gọi set_line sau đó.",
    "code": "// Trong setup, sau Leanbot.begin và Serial.begin(115200):\ncalibrate_line(); // Đặt cảm biến theo quy trình SDK, chạm TB1A xác nhận\n// Sau đó mới bắt đầu nhiệm vụ.",
    "source": "baseCode.cpp"
  },
  {
    "group": "helpers",
    "api": "read_color();",
    "description": "Đọc khối và trả trực tiếp màu nhận diện.",
    "parameters": "Không có.",
    "returns": "ObjectColor: RED, GREEN, BLUE, YELLOW, PURPLE hoặc UNKNOWN.",
    "notes": "Tự khởi tạo APDS. Mỗi mẫu gồm LED đỏ/xanh lá/xanh dương/tắt, trừ nền rồi phân loại 5 màu. Cần 4 phiếu trong tối đa 5 mẫu; dừng sớm khi đủ phiếu hoặc không còn khả năng đạt 4. Khôi phục độ sáng LED sau đo; UNKNOWN/lỗi tắt LED đo, TB2B giữ LED sẵn sàng. Lỗi cảm biến báo missionError. COLOR_DEBUG bật log RGB đã trừ nền. Cần giữ khối đứng yên và hiệu chuẩn lại gain/mẫu tham chiếu trên robot thật.",
    "code": "if (read_color() == BLUE) {\n  close_hand(90); // Xử lý khối xanh dương\n}\n// Hoặc chỉ gọi read_color(); để thông báo Serial/LED.",
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
