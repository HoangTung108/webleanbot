# Đọc màu khối bằng chiếu sáng chủ động

## Phân tích đoạn mẫu

Đoạn mẫu không chỉ đọc RGB dưới ánh sáng phòng. Nó lần lượt chiếu LED đỏ, xanh lá và xanh dương, chỉ giữ kênh cùng màu của mỗi lần đo, rồi tắt LED để đo nền:

```
R = R_LEDđỏ − R_nền
G = G_LEDxanhlá − G_nền
B = B_LEDxanhdương − B_nền
```

Đây là ba phản hồi quang học dưới ba nguồn sáng khác nhau, không phải RGB sRGB của ảnh. Phép trừ loại được thành phần nền cộng ổn định, nhưng không loại được ánh sáng thay đổi giữa các lần đo, chuyển động, bóng đổ hoặc bão hòa cảm biến. Không đo lúc robot đang di chuyển khối qua vùng cảm biến.

Ba hàm BasicObj chọn kênh lớn nhất và yêu cầu kênh đó > 3. Chúng loại trường hợp hòa giữa hai kênh lớn nhất, nhưng không yêu cầu chênh lệch đủ lớn: (101,100,99) vẫn bị gọi đỏ dù gần trung tính. Khối vàng có hai thành phần đỏ/xanh lá, khối tím có đỏ/xanh dương, nên chọn một kênh không đủ. Các hàm LegoBrick/JengaBlock trong mẫu luôn trả false; chưa có thuật toán phân loại vật liệu ở đó.

`while (!APDS.colorAvailable())` không có timeout sẽ chặn chương trình khi cảm biến không trả dữ liệu. Mẫu cũng bỏ qua kết quả `APDS.begin()` và `readColor()`, và không phục hồi mẫu màu LED trước khi đo: lần show cuối là Black, chỉ độ sáng được lưu lại.

Trong [Arduino_APDS9960 chính thức](https://github.com/arduino-libraries/Arduino_APDS9960/blob/master/src/Arduino_APDS9960.cpp), colorAvailable bật bộ đo màu, còn readColor đọc thanh ghi và tắt bộ đo. Vì vậy cần lấy mẫu mới sau mỗi lần đổi LED, không chỉ đổi LED rồi đọc ngay giá trị sẵn có. Bản thư viện đang cài có thể khác; cần kiểm tra ATIME nếu đổi thời gian tích phân. [FastLED](https://github.com/FastLED/FastLED/wiki/Pixel-reference) dùng Lime cho xanh lá cường độ 255; code cập nhật dùng CRGB(0,255,0) để tránh nhầm với Green có cường độ thấp hơn.

## Bản cập nhật trong baseCode

`read_color()` vẫn trả enum và vẫn dùng bộ phân loại 5 màu hiện có. Mỗi mẫu giờ đi qua chu kỳ đỏ → xanh lá → xanh dương → tắt, lấy hiệu tương ứng và chặn âm về 0. Không dùng ảnh hay giá trị giả lập để làm mẫu hiệu chuẩn phần cứng.

- Chiếu ở độ sáng 255, khôi phục độ sáng cũ ở cả đường thành công, lỗi và reset.
- Mỗi pha chờ `COLOR_EXPOSURE_MS = 35 ms`, rồi kiểm tra sẵn sàng có hạn `COLOR_READY_TIMEOUT_MS = 850 ms`. Đây là cấu hình bảo thủ kế thừa base, không phải thông số tốc độ tối ưu đã đo trên robot.
- Kiểm tra kết quả đọc và kênh âm; lỗi trả UNKNOWN, không giữ màu đo cũ.
- Đợi bằng robot_delay để tiếp tục phục vụ tay async và TB2B. Các lời gọi I²C/SDK đang chặn vẫn có thể trì hoãn việc kiểm tra timeout/reset.
- Cần 4 phiếu đồng thuận trong tối đa 5 mẫu. Dừng ngay khi đủ 4, hoặc khi số mẫu còn lại không thể đưa bất kỳ màu nào lên 4 phiếu. Không giảm ngưỡng tin cậy xuống 2/3.
- Màu hợp lệ hiển thị LED; UNKNOWN hoặc lỗi cảm biến tắt LED đo để không báo màu cũ. Reset giữ thông báo LED sẵn sàng của base. Không phục hồi mẫu LED tùy ý từng bóng có trước khi đo.

Khi cảm biến sẵn sàng đúng hạn, 4 mẫu đồng thuận cần 16 pha × 35 ms = 560 ms thay vì 20 pha = 700 ms nếu luôn đọc đủ 5 mẫu bốn pha: giảm 20% số lần đo. Hai mẫu UNKNOWN liên tiếp cho phép kết thúc sau 280 ms. Trường hợp 4/5 có một mẫu nhiễu vẫn có thể cần 700 ms. Đây là thời gian chờ danh định, chưa gồm I²C/show/CPU.

Bản base cũ chỉ đọc 5 RGB thụ động (~175 ms chờ), nên bản đo chủ động này **không nhanh hơn bản thụ động**. Đổi lại, phép đo kiểm soát được nguồn chiếu và trừ nền. Chưa kết luận độ chính xác cải thiện bao nhiêu khi chưa đo khối thật.

## Phân loại và hiệu chuẩn

Không có bộ mẫu đầy đủ: dùng gain từng kênh, ngưỡng cường độ và độ bão hòa, sau đó chia miền hue thành đỏ/vàng/xanh lá/xanh dương/tím. Có đủ 5 bộ mẫu tham chiếu: dùng khoảng cách trên RGB chuẩn hóa và kiểm tra khoảng cách tới hai ứng viên tốt nhất. Bộ mẫu mới chỉ có một phần sẽ trả UNKNOWN để tránh phân loại thiếu lớp.

Sau thay đổi cách chiếu, cần thu lại tham chiếu và gain từ **RGB đã trừ nền**. Đặt khối ở đúng vị trí/khoảng cách làm việc; bật COLOR_DEBUG; lấy nhiều lượt cho từng màu dưới các điều kiện ánh sáng dự kiến. Mẫu thụ động cũ không được mặc định dùng lại. Hiện chưa có dữ liệu đo để tự chọn gain hay ngưỡng mới.

Các giới hạn còn lại: nền chớp hoặc thay đổi nhanh, tín hiệu yếu, bề mặt bóng, LED phản xạ trực tiếp vào cảm biến, đáp ứng phổ khác nhau và bão hòa. Kênh âm bị chặn không sửa được nền biến thiên. Muốn phát hiện bão hòa đáng tin cần đối chiếu ATIME/gain và ngưỡng ADC của phiên bản phần cứng; chưa đặt một ngưỡng số tùy ý.

## Giả lập và kiểm chứng

CppRuntime dùng đáp ứng khối lý tưởng nhân màu LED/độ sáng đã show, cộng nền tùy chọn `colorAmbient`. fillColor/setBrightness chưa show không đổi phép đo. Đây là mô hình tuyến tính, không mô phỏng phổ LED, xuyên kênh, nhiễu, tích phân hay bão hòa thật. Start xóa trạng thái chiếu sáng.

Kiểm thử bao gồm 5 màu, nền đỏ mạnh khi đo khối xanh, độ sáng được khôi phục, mẫu trung tính, phiếu bất đồng, cảm biến không sẵn sàng, reset TB2B, và dữ liệu IoT sau đo. Native stub kiểm tra thêm chu kỳ đọc và kết quả lỗi; để xác nhận nạp robot cần compiler Arduino/Leanbot thật và đo trên phần cứng.
