# Giả lập Leanbot — Synapse City

Giả lập chỉ sử dụng **code C++ hiện tại trong IDE** và map **Synapse City**.
Không có code ví dụ, map Maze, Delivery, Line Following hay Obstacle Avoidance.
Nếu chưa có code, Start yêu cầu mở hoặc viết C++ thay vì chạy chương trình mẫu.

## Sử dụng

1. Mở/viết C++ trong IDE, hoặc dùng C++ được sinh từ bài Blockly đang mở.
2. Mở Simulator. Map cố định là Synapse City, 4 ft × 4 ft (1219.2 mm mỗi cạnh).
3. Bấm vào sa bàn hoặc kéo robot để đặt vị trí; nhập góc trước khi Start.
4. Start thực thi code, Pause/Resume giữ thời gian giả lập, Stop kết thúc chương trình.
5. Reset đưa robot về CRL, hướng 270°.

Các bài/tệp đã lưu của người dùng được giữ nguyên; việc loại bỏ ví dụ không xóa
nội dung editor hay dữ liệu trình duyệt.

## Tỷ lệ và ô thi đấu

- Một cạnh ô thành phố, đo giữa tâm giao lộ, dài 325 mm.
- Đã hiệu chỉnh theo số đo: `runLR(2000, 2000)` đi 325 mm trong 5 giây (65 mm/s).
  Tốc độ trung gian được nội suy tuyến tính; khoảng cách hai bánh ước lượng 100 mm, dùng chung cho vật lý và encoder C++.
- Robot vẽ theo ảnh Leanbot: PCB đỏ dài, Nano xanh, hai bánh đen, cảm biến siêu âm đôi và càng màu be.
  Tổng hình khoảng 180 × 120 mm, bán kính chọn/chặn tường bảo thủ 110 mm; đây là tỷ lệ
  ước lượng từ ảnh, chưa phải số đo robot thực. Hướng +X luôn là phía càng.
- Mỗi thành phố A–H có 4 vị trí: 1 trên trái, 2 trên phải, 3 dưới trái, 4 dưới phải.
  Ô 1/4 xoay +45°, ô 2/3 xoay −45° để đối xứng.
- S1/S3/S5 nằm ở mép dưới; S2/S4/S6 ở mép phải.
- Góc đường bao tại CRL (dưới phải) là góc vuông; ba góc còn lại giữ bo tròn.
- CRL là khu xuất phát/kết thúc. Vị trí đánh dấu không phải vật cản.
- Khối nhiệm vụ 15 × 25 × 75 mm: kéo thả vào ô, random theo số lượng/seed, gắp–mang–thả, va chạm, ma sát và đổ nằm ngang. Chấm điểm mô phỏng theo Rulebook V6.

`public/simulator/synapse-city.svg` là bản dựng lại theo ảnh được cung cấp,
không phải artwork in gốc. Tọa độ đường dò và hình dùng cùng đơn vị mm.

## Cấu trúc

- `boardConfigs.ts`: cấu hình Synapse City, đường line, 32 ô số và 6 ô lưu trữ.
- `robotSimulator.ts`: vị trí, chuyển động, cảm biến và trạng thái càng.
- `renderer.ts`: vẽ sa bàn/robot, chuyển tọa độ và thao tác đặt robot.
- `cppRuntime.ts`: bộ thông dịch tập con C++ dùng chung, không dùng eval.
- `cppBridge.ts`: nối bộ thông dịch với động cơ vật lý và đồng hồ giả lập.
- `demo.tsx`: giao diện giả lập React; nhận prop `cppCode` từ IDE.
- `../components/SimulatorPanel.tsx`: panel giả lập, cũng chỉ dùng Synapse City.
- `public/leanbot-ide/simulator-ui.js`: giao diện giả lập của IDE HTML cũ.

Bộ thông dịch hỗ trợ đoạn mission tùy chỉnh trong `fixtures/custom-mission.ino`:
hàm, biến, enum, mảng số, cast, if/else, for/while, switch, return/break,
math/string helpers, millis, encoder, chờ khoảng cách/góc, gripper.
Hàm chưa hỗ trợ báo lỗi, không âm thầm thay bằng code mẫu. `LbMission.end()`
kết thúc mission; nút Start thay thao tác chạm để bắt đầu nhiệm vụ.

## Kiểm tra và build

```sh
npx vitest run src/simulator src/App.test.tsx
npm run build
```

Sau khi sửa `cppRuntime.ts`, `npm run build:simulator` tạo lại runtime dùng chung
cho IDE HTML. `npm run build` thực hiện bước này tự động.

`robotAppearance.ts` dùng chung hình robot cho React và IDE HTML; góc càng được cập nhật trực tiếp từ lệnh C++.

Chiều quay: `runLR(v, -v)` với v dương quay phải (góc tăng trong hệ trục màn hình); `runLR(-v, v)` quay trái. Encoder góc dùng cùng dấu với hình robot.

## Custom mission layout

Mission blocks cung cấp palette Pollution (5 màu) và Neutralizer (3 màu, sọc trắng).
Kéo màu vào ô số/Storage, hoặc chọn màu rồi bấm; kéo khối đã đặt để di chuyển.
Robot bật lại thao tác đặt robot; Erase block xóa khối. Các ô bị chiếm không nhận
thêm khối. Chọn số lượng và seed để random, Download/Open mission để lưu/mở JSON.
Reset phục hồi bố trí xuất phát; vị trí sau khi chạy không tự ghi đè bố trí gốc.

Vật lý khối là mô hình 2.5D định tính với khối lượng 25 g ước lượng, ma sát 0.35
(có thể chỉnh), trọng lực và va chạm oriented rectangles. Robot vẫn dùng chuyển
động kinematic đã hiệu chỉnh. Xem [mô tả cơ chế](../../docs/MISSION_BLOCKS.md).

## Hiệu chỉnh từ ảnh ngày 06/11/2026

- Mốc cố định: sa bàn 4 ft = 1219,2 mm mỗi chiều; cạnh thành phố 325 mm;
  khối 15 × 25 × 75 mm. Khối đứng hiển thị mặt đáy 15 × 25 mm khớp hitbox;
  khi đổ, chiều dài chiếm mặt sàn tiến tới 75 mm.
- Ước lượng robot từ ảnh phối cảnh: 180 × 120 × 70 mm, khối lượng 400 g do người dùng cung cấp sau khi đối chiếu video;
  khoảng cách tâm bánh 100 mm là ước lượng nội bộ theo bề rộng lốp 20 mm. Kích thước tổng thể dùng làm chuẩn; khoảng cách tâm bánh và khớp càng vẫn cần đo trực tiếp để chốt.
- `robotGeometry.ts` là nguồn chung cho kích thước robot, điểm gắp cách trục 75 mm,
  khung va chạm, khoảng cách hai bánh của hình vẽ, vật lý và encoder C++.
- Tua 1×/2×/5×/10× nhân **thời gian đưa vào C++**. Các bước vật lý, cảm biến,
  encoder, `millis()` và `LbDelay()` dùng cùng thời gian mô phỏng. Không nhân thêm
  tốc độ lần nữa trong `advanceSimulatedTime()`. Thay tốc độ không sửa mã nguồn,
  không reset chương trình hoặc làm thay đổi đích quãng đường/góc.

## Khối thấp và mép sa bàn

- Khối đứng có vùng gắp rộng. Khối nằm (cao khoảng 15 mm) chỉ tiếp xúc mép dưới càng:
  yêu cầu tâm khối cách điểm gắp không quá 6 mm, lệch ngang không quá 4 mm, trục dài
  gần song song hướng tiếp cận; robot gần đứng yên và khối đã ổn định. Không gắp khối
  đang lật. Các ngưỡng này là mô hình tiếp xúc ước lượng, không phải đo lực càng thực.
- Không chặn tọa độ robot bằng biên hình chữ nhật sa bàn. Khi trọng tâm ước lượng
  (sau trục bánh 20 mm) mất đỡ, robot thả khối, ngừng thực thi C++, giữ quán tính ngang
  và rơi với gia tốc 9810 mm/s². Chiều cao bàn giả định 750 mm; chưa mô phỏng đầy đủ
  quay lật 3D hay lực va đập xuống sàn. Trạng thái rơi dùng cùng đồng hồ mô phỏng ở mọi mức tua.
- Sau khi rơi, dùng Đặt lại hoặc kéo robot về vị trí được đỡ trước khi chạy lại.

## Chấm điểm theo Rulebook V6 (17/09/2026)

Nguồn: https://drive.google.com/file/d/1KBwprFcB4-8hPliPkTJlqjujqLcO3FP_/view
Xem đối chiếu chi tiết tại `docs/SYNAPSE_SCORING_V6.md`.

- V6 §9: chỉ cần khối tiếp xúc một phần mặt vùng hợp lệ; còn chạm robot không mất điểm.
  Simulator giữ khối đang gắp ở mặt sàn trừ khi `elevation > 0`.
- Containment đúng thành phố xuất phát: 45/khối. Cặp cùng màu có cả pollution và
  neutralizer chạm cùng containment được tổng 160 theo ma trận §10.1, không cộng thêm 45.
- §9.3 cho phép pollution bất kỳ đưa về CRL: 100/khối thường; Mystery Master 150 thay
  cho 100. CRL là ô nền màu 300 × 300 mm tại (959,6;959,6), không gồm line đen.
- Return 40/robot bắt đầu và kết thúc trong CRL, không bị rơi. Bản này theo dõi 1 robot.
- Một pollution mỗi thành phố, tối đa 8. Metadata `originZone` luôn giữ nguyên khi robot
  di chuyển khối; thay vị trí bố trí trước lượt chạy sẽ cập nhật thành phố xuất phát.
- Chốt điểm khi gọi STOP, C++ kết thúc, hoặc hết 120 giây mô phỏng. Sau STOP khối thả
  được chạy vật lý thêm tối đa 5 giây để về vị trí nghỉ trước khi ghi kết quả.
- Normalized Score = Raw / trung bình Top 5 cùng vòng/cấu hình × 1000; không giới hạn 1000.
- Đặt lại là mở lượt tập mới; chưa có Reset/Tries giữ nguyên đồng hồ trong cùng lượt thi,
  xếp hạng hai vòng, chữ ký trọng tài hay cơ chế giấu/lộ màu theo các giai đoạn thi.

## Robot theo video Leanbot look

Tham chiếu: https://youtu.be/p64iZY-Bba4 (28 giây, các góc trước/ngang/sau/trên).
Dựng bằng canvas theo khung đỏ hai tầng, Nano phía sau, motor/bánh cao su hai bên,
sonar phía trước, cặp servo xanh và càng màu kem có rãnh. Không dùng ảnh bitmap cho robot.

Thông số người dùng xác nhận: L × W × H = 180 × 120 × 70 mm, khối lượng 0,400 kg.
Tâm hai bánh 100 mm là suy ra từ bề rộng tổng 120 mm và lốp ước lượng 20 mm;
không tuyên bố đây là số đo chính thức. Điểm gắp vẫn cách trục bánh 75 mm.

Cùng polygon càng được dùng để vẽ và tìm tiếp xúc với toàn bộ hình chữ nhật
của khối tại vị trí thực. Hai càng phải chạm cùng một khối; góc đóng thực tế
phụ thuộc vị trí và hướng khối, không dùng một ngưỡng góc cố định. Điều kiện khó gắp khối nằm vẫn áp dụng. Khối lượng robot tham gia xung lực
đẩy khối; vận tốc bánh vẫn do bộ điều khiển đặt để giữ hiệu chuẩn 32,5 cm / 5 giây.
Độ cao là metadata của mô hình nhìn từ trên; chưa phải mesh/mô phỏng 3D đầy đủ.

### Hiệu chỉnh càng gắp

Hai miệng càng được phản chiếu vào phía trong. `fitGripperToBlock` tìm tiếp xúc đầu tiên
trên toàn hành trình càng, tránh xuyên khối nằm chéo; hình vẽ dừng ở mặt khối trong
khi lệnh servo vẫn giữ góc đích. Mở càng giải phóng khối tại vị trí đang giữ.

`moveToLR(left,right,ms)` và `moveTo(degree,ms)` chuyển động theo thời gian mô phỏng,
đồng bộ pause/tua. C++ vẫn chờ đúng thời gian lệnh. Các lệnh open/close không có tham
số thời gian giữ hành vi tức thời hiện có. Đây là mô hình càng quay trong mặt phẳng
sa bàn; video không cung cấp số đo cơ khí chính xác cho trục quay và khe càng.

Càng phải có tiếp xúc ở cả hai bên mới giữ khối; khối ngoài tầm hoặc mặt quá hẹp sẽ không tự dính vào robot. Vùng bắt khối đứng được thu còn 12 mm quanh điểm gắp và lệch ngang tối đa 8 mm; khối nằm vẫn yêu cầu căn sát hơn.

### Vật lý giữ và thả khối

Điểm giữ lưu độ lệch và góc tương đối tại lúc tiếp xúc, không kéo khối về tâm càng.
Khi thả, khối nhận vận tốc tịnh tiến và vận tốc tiếp tuyến do robot quay, cùng vận tốc
xoay. Tích phân chia bước tối đa 5 ms để tránh bỏ qua va chạm khi tua nhanh.
Khối chỉ đổ khi đủ năng lượng và mô men; thả chậm không tự động làm khối đổ.

Lực giữ ước lượng tối đa 1,5 N, giảm tới 0,15 N cho khối nằm thấp. Gia tốc hoặc
va chạm vượt lực giữ làm khối tuột; phải mở càng trước khi gắp lại khối vừa tuột.
Đây là tham số mô hình cần hiệu chuẩn thực nghiệm, không phải thông số servo đã đo.
Khối rời mép sa bàn rơi xuống sàn giả định thấp hơn 750 mm, không bị ép trở vào biên
và không được tính điểm. Mô hình vẫn là vật lý 2,5D, chưa mô phỏng biến dạng càng.

Khối trung hòa và pollution dùng cùng kích thước 15 × 25 × 75 mm. Hình nhìn từ trên
vẽ đúng footprint dùng cho va chạm, không cộng chiều cao vào bề rộng hiển thị.
Dải trắng của khối trung hòa là ký hiệu nằm trong footprint. Hành trình càng đóng
được hiệu chỉnh để chạm được mặt hẹp 15 mm cả khi lệch ngang 2 mm tại Storage.

## Số đo cập nhật ngày 07/11/2026

Cạnh line một thành phố là 325 mm; `runLR(2000,2000)` chạy 325 mm trong 5 giây.
Lệnh motor giới hạn ±2000 tương ứng ±65 mm/s. Sa bàn vẫn 1219,2 × 1219,2 mm;
layout in được thu quanh tâm với hệ số 325/350, đồng bộ SVG, line sensor, CRL,
các site và Storage. Kích thước robot và khối không bị thu theo layout.
Ba ảnh IMG_5457–5459 cho thấy bo mở rộng có OLED ở đuôi, hai servo trước và
khối được kẹp giữa hai càng. Các ảnh có phối cảnh nên không dùng để suy ra số đo
cơ khí chính xác mới. Khối đứng được nhận theo tiếp xúc hai càng thực, thay vì loại
khối chỉ vì tâm nằm ngoài bán kính 12 mm quanh điểm gắp danh nghĩa.
