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
- Luyện tập chốt điểm khi STOP hoặc C++ kết thúc; thi đấu chốt khi STOP hoặc hết 120 giây. Sau STOP khối thả
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

Tiếp xúc gắp dùng góc chạm tìm trên toàn hành trình, độc lập với góc lệnh hiện tại.
Dung sai 0,5° giúp hai càng vừa chạm vẫn giữ khối, không yêu cầu càng xuyên qua khối;
một càng chưa chạm hoặc bị vật khác chặn vẫn không tạo được một cặp gắp.
Chuyển động servo có thời gian bắt đầu từ góc thực tế bị giới hạn bởi khối,
nhờ đó mở càng không phải chờ góc lệnh 90° quay về tới điểm tiếp xúc.

Lực quán tính khi giữ khối dùng đáp ứng motor/tiếp xúc ước lượng 20 ms và bộ lọc
mũ theo thời gian, thay vì chia thay đổi vận tốc cho bước cập nhật của C++.
Điều này tránh lực giật giả làm tuột khối chỉ vì chương trình dùng `LbDelay(1)`.
Vận tốc khối khi thả vẫn lấy từ chuyển động thật tại điểm giữ. Padding tiếp xúc
hình học còn 0,1 mm mỗi mặt để hai càng khép sát khối hơn.

## Hiệu năng giả lập

- Loại cặp vật thể xa bằng giới hạn bảo thủ trước khi kiểm tra SAT; chỉ tạo box
  với các thuộc tính hình học cần thiết. Tái sử dụng hình thân/bánh trong mỗi bước.
- Cache tối đa 512 kết quả tiếp xúc càng và các polygon quét cố định. Tọa độ,
  kích thước, hướng và góc lệnh đều tham gia khóa cache.
- Sa bàn SVG được raster hóa theo mật độ điểm ảnh màn hình, dùng lại cho từng
  khung hình và tạo lại khi đổi kích thước. Không giảm độ phân giải sa bàn.
- React cập nhật số liệu tối đa 10 Hz; canvas vẫn dùng requestAnimationFrame.
  Không vẽ lại từ bộ đếm mạng khi không có thay đổi hoặc vòng vẽ đang chạy.
- Lịch sử đường đi lấy mẫu 50 Hz, tối đa 6001 điểm. Chỉ dữ liệu hiển thị được lấy
  mẫu: C++/encoder, cảm biến và vật lý vẫn cập nhật theo bước mô phỏng gốc.
- Bảng quản lý khối cập nhật khóa điều khiển khi trạng thái chạy thay đổi, không
  ghi lại toàn bộ DOM mỗi khung hình.

Chạy `npm run benchmark:simulator`: ba lượt, mỗi lượt 10 giây mô phỏng với bước
1 ms, 14 khối và robot đang mang khối. Thời gian CPU được báo riêng, không phải FPS.
Kiểm tra Edge headless trên máy phát triển với 14 khối, tua 10×, DPR 2 trong 5 giây:
median khung hình 16,7 ms, P95 17,3 ms; P95 vẽ canvas 0,7 ms. Kết quả phụ thuộc máy,
trình duyệt, mã C++ và cảnh đang chạy; không phải cam kết FPS cho mọi thiết bị.

### Tua và bước vật lý

Bridge tích lũy thời gian đã nhân hệ số tua và xử lý theo quantum 5 ms cố định,
độc lập FPS. Các khoảng chờ 1 ms trong C++ vẫn đọc cảm biến/encoder ở từng bước.
Phần lẻ và phần chưa xử lý được giữ cho khung hình kế tiếp; không bỏ thời gian.
Giao diện dành tối đa khoảng 8 ms mỗi khung cho xử lý C++/vật lý (kiểm tra giữa các
quantum). Nếu máy không đủ nhanh cho mức tua đã chọn, mô phỏng bắt kịp dần thay vì
nhảy qua các bước hoặc chặn giao diện để xử lý hết một lần.

`RobotSimulator.advanceSimulatedTime` cũng chia cập nhật dài thành bước tối đa 5 ms,
bao gồm chuyển động tay, rơi và cảm biến. Bước vừa mất điểm tựa không dịch robot
thêm lần thứ hai. Đổi hệ số tua chốt thời gian cũ trước khi áp dụng hệ số mới;
đổi trạng thái hiển thị tab đặt lại đồng hồ hiển thị để tránh tua bù toàn bộ thời
gian tab bị ẩn. Bắt đầu và tiếp tục dùng mốc thời gian ngay tại thao tác người dùng.

`playback.test.ts` kiểm tra thời gian hoãn, ngân sách xử lý, pause/đổi tốc độ,
đồng hồ không hợp lệ và so sánh nguyên trạng vật lý giữa các FPS/hệ số tua.

Khi đổi mức tua trong lúc đang chạy, cả Demo và SimulatorPanel đều gọi
`bridge.setPlaybackSpeed(multiplier, performance.now())`. Bridge chốt khoảng
thời gian trước thao tác ở hệ số cũ rồi đổi hệ số cho khoảng sau; không khởi động
lại C++, không đặt lại encoder và không thay đổi tốc độ tương đối hai bánh.
`customPlayback.test.ts` chạy toàn bộ code mẫu có `turn_angle` ở 1×, 10× và chuyển
sang 10× trong pha quay (200/1800/7600 ms), so sánh góc, quãng đường, thời gian và
vị trí cuối. Mặt sàn lớn trong test chỉ để tách kiểm tra điều khiển khỏi việc rơi;
sa bàn thật trong ứng dụng vẫn giữ kích thước đã hiệu chỉnh.

## Tỷ lệ và va chạm khi chạy online

`MultiRobotRenderer` dùng lại `SimulatorRenderer`, cùng sa bàn 1219,2 mm, chiều Y
hướng xuống, scale theo viewport và DPR. Cả hai robot dùng `drawLeanbot` với kích
thước 180 × 120 × 70 mm; khung online lấy theo cùng envelope, không dùng hình tròn
bán kính 100 mm hoặc scale cố định 0,5 px/mm. Góc hai càng được gửi cùng trạng thái.

`robotCollision.ts` dùng envelope chữ nhật 180 × 120 mm xoay theo hướng robot.
Đây là hitbox bảo thủ, chưa mô phỏng riêng từng răng càng. Client chặn xuyên ở mỗi
bước vật lý; server giải chồng lấn theo hai robot cùng khối lượng và gửi vị trí hiệu
chỉnh kèm snapshot peer cho cả hai bên. Hiệu chỉnh không reset C++/encoder và mang
khối đang giữ theo robot. Cảm biến khoảng cách cũng đọc hitbox robot còn lại.
Robot đã rơi và peer đã ngắt kết nối không còn là vật cản.

Đồng bộ qua mạng vẫn ở 20 Hz; độ trễ có thể tạo hiệu chỉnh vị trí nhỏ. Đây là mô
phỏng 2,5D kinematic, chưa phải giải lực/biến dạng cứng đầy đủ hoặc mô phỏng từng
bộ phận tay gắp khi hai robot va nhau.

Cần triển khai lại cả frontend GitHub Pages và backend Render, sau đó tải lại cả
hai máy. Backend cũ không phát thông điệp `pose-correction`, nên không thể hiệu
chỉnh va chạm hai phía chỉ bằng việc cập nhật giao diện.

## Gameplay và hai vòng thi mô phỏng

Xem [bản phân tích và phạm vi](../../docs/GAMEPLAY_ANALYSIS.md) từ tài liệu Gameplay
02/03/2026 người dùng cung cấp. Giao diện React có thêm chế độ **Thi đấu mô phỏng ·
2 vòng** bên cạnh luyện tập tự do: công bố vị trí, chuẩn bị, khóa code/cách ly,
công bố màu rồi thực thi. Innovator/Master che màu pollution trước cách ly.
C++ kết thúc sớm không tự chấm trong chế độ thi đấu; đồng hồ/vật lý tiếp tục tới
120 giây hoặc STOP. Cấu hình và giai đoạn được giữ khi về IDE, còn sau khi khóa
code thì không thể sửa code qua điều hướng. Kết quả hai vòng có Top 5 riêng.

CRL được chấm trên toàn phần xanh bên trong line đen; số site 2 ở dưới trái và
site 3 ở trên phải được đồng bộ giữa SVG và tọa độ. Runtime IDE HTML vẫn là chế
độ luyện tập, chưa có bộ điều phối thi đấu hai vòng. Online chưa gộp khối/đồng hồ/
điểm của cả đội trong luyện tập tự do; chế độ thi đấu online bên dưới dùng server chung. Mỗi vòng hiện hỗ trợ một lần thực thi, không giả lập đầy đủ
Reset/Restart/Tries của một giải đấu có trọng tài.


### Phiên thi online dùng chung

Tạo/vào cùng phòng, chủ phòng chọn **Thi đấu mô phỏng · 2 vòng**. Với hai robot chọn Innovator hoặc Master. Chủ phòng công bố vị trí; mỗi người có thể sửa và chạy thử C++ của mình, đặt robot trong CRL rồi khóa code. Sau khi cả đội đã khóa, chủ phòng công bố màu và bắt đầu lượt. Cả phòng dùng chung tốc độ tua; bất kỳ thành viên nào cũng có thể STOP.

Server thực thi từng chương trình riêng trên cùng `MissionWorld`, giải quyết va chạm robot, quyền giữ khối và chấm điểm đội. C++ chỉ gửi tới server khi chạy thử/khóa code, không có trong snapshot gửi cho đồng đội. Đồng hồ chính thức vẫn chạy khi C++ kết thúc sớm. Giao diện không tự chạy một bản vật lý thứ hai trong phiên này. Mất kết nối trong lượt thi kết thúc lượt cả đội; robot mất kết nối không được Return.

Cần triển khai **cả backend Render và frontend GitHub Pages** từ cùng phiên bản (`npm run build`, backend `npm start`). Backend cũ không hỗ trợ giao thức phiên thi sẽ được báo rõ trên giao diện. Phiên lưu trong RAM; server restart sẽ mất phòng. Mỗi vòng hiện có một lần chạy, chưa hỗ trợ Reset/Tries giữa lượt.


### Vòng phản hồi `baseCode`

`turn_angle` và `move_tank` dùng `MOTION_FEEDBACK_MS = 1UL`. Bước cũ 0,1 ms khiến bộ thông dịch thực thi khoảng 10.000 vòng điều khiển/giây, trong khi `millis()` và các mốc ramp/stall chỉ thay đổi mỗi millisecond. Đổi bước phản hồi không thay đổi tốc độ bánh, tỷ lệ 325 mm / 5 s hoặc hệ số `TURN_SCALE`. Đây là tối ưu chu kỳ điều khiển, không phải tăng tốc vật lý giả tạo.

Lộ trình sinh mới tự lấy hằng số từ `docs/baseCode.cpp`. Code đã lưu trước đó cần đổi hai lệnh `LbDelay(0.1f)` / `LbDelay(0.1)` trong vòng quay/di chuyển thành `LbDelay(1)` hoặc tạo lại code lộ trình. Runtime vẫn giữ nguyên ý nghĩa của các khoảng chờ 0,1 ms nếu chương trình có sử dụng.

Server cập nhật vật lý mỗi 20 ms theo đồng hồ mô phỏng, tiếp tục chia bước tích phân 1 ms; snapshot vẫn gửi mỗi 50 ms. Tua không đổi encoder/góc quay hoặc bỏ thời gian còn chờ.


### Đồng bộ với base code hiện tại

Lộ trình sinh mới dùng nguyên phần thư viện trước `setup()` trong `docs/baseCode.cpp`; chỉ tạo `setup()` và nhiệm vụ riêng. Không còn cắt theo chú thích cũ hoặc sửa công thức C++ để vượt giới hạn bộ thông dịch. Runtime hỗ trợ struct, con trỏ/tham chiếu, overload theo số tham số, tham số mặc định, enum, toán tử bit và mảng nhiều chiều cần cho base hiện tại. Đây vẫn là tập con C++, không phải trình biên dịch Arduino đầy đủ.

- Chạy nguyên profile tăng tốc/phanh và giới hạn tốc độ của `move_tank` / `turn_angle`, kể cả giới hạn tốc độ ở các độ cuối. Không áp dụng lại các thời gian quay của profile cũ.
- Dò line chạy trực tiếp PID MyBlock với bốn kênh 2L, 0L, 1R, 3R ở vị trí trước trục 50 mm, lệch ngang −24/−6/+6/+24 mm. React, IDE HTML và server thi dùng chung hình học cảm biến. `set_line` tác động ngưỡng, `read` cập nhật mask, `value` trả mask đã lưu. Bước điều khiển, tìm lại line, cua, giao lộ, timeout và stall lấy từ C++.
- `followLineDistance(100)` là 100 mm; `followLineCm(100)` là 100 cm; `followLineSeconds(2.5)` là 2,5 giây thời gian giả lập. Tua 10× chỉ đổi tốc độ trình chiếu.
- Tay gắp đồng thời được cập nhật bởi chính `robot_delay` / `update_hand`; lệnh SDK có duration nội suy góc trong khoảng chờ ở cả React và IDE HTML.
- APDS dùng RGB tổng hợp của khối đứng trong vùng tay gắp (bán kính mô hình 35 mm), nhân màu/độ sáng LED đã `show()` và cộng nền `colorAmbient` (mặc định 0). Ngoài vùng không có phản hồi khối, khối chưa công bố có phản hồi trung tính. Base đo đỏ/xanh lá/xanh dương/tắt rồi trừ nền, cần 4 phiếu trong tối đa 5 mẫu, dừng sớm khi đã quyết định được kết quả. LED hiển thị màu nhận được; UNKNOWN tắt LED đo. Đây là mô hình tuyến tính lý tưởng, không xác nhận độ chính xác phần cứng. Xem [thuật toán và hiệu chuẩn](../../docs/object-color-algorithm.md).
- `Color` và các thuộc tính IoT được lưu trong giả lập. Hai robot trong cùng phiên thi chia sẻ thuộc tính có cùng Asset ID; khác Asset ID hoặc khác phiên được tách riêng. Reset sa bàn xóa các thuộc tính. Không kết nối Wi-Fi/máy chủ IoT thật.
- Hiệu chuẩn line bằng nút chạm chỉ in thông báo trong giả lập: cảm biến hiện là mô hình lý tưởng đen/trắng 4095/0, chưa có nhiễu và đường cong ADC đo thực tế.

### Hiệu chuẩn quãng đường hiện tại

Phép đo mới: lệnh 325 mm trước đây dừng ở khoảng 322 mm encoder (phanh sớm 3 mm), đi thực tế 320 mm. Base hiện bỏ phanh sớm và dùng `DISTANCE_SCALE = 322/320 = 1.00625`. Vì vậy mô hình phản hồi dùng hệ số **mm thực / mm encoder = 320/322**, thay hệ số cũ 1,06. Nhân hai hệ số này cho kết quả 1, tránh bù quãng đường hai lần. Kiểm thử trực tiếp base: lệnh 32,5 cm đi khoảng 325 mm; các đoạn có phần lẻ không tích lũy mất 3 mm mỗi lần dừng.

Tốc độ vật lý giữ 65 mm/s ở lệnh 2000 theo số đo đã có: `runLR(2000,2000)` trong 5 giây đi 325 mm. Không suy ra tốc độ mới từ thời gian mục tiêu người dùng mong muốn. Trượt bánh, quán tính dừng, điện áp pin và đáp ứng mô-tơ chưa được hiệu chỉnh từ số đo; góc phản hồi hiện dùng wheelbase 100 mm ước lượng. Vì vậy đồng bộ thuật toán không có nghĩa là đã khớp tuyệt đối robot thật.

Nút Chạy cấp một tín hiệu nhiệm vụ; `LbMission.begin` không tự lặp lại lượt. Luyện tập không tự dừng ở 120 giây; chỉ lượt thi chính thức có thời hạn đó. Kiểm thử bao gồm toàn bộ base, đi 32,5 cm, quay, dò line mm/cm, cua sa bàn Synapse hai chiều, tay đồng thời, đọc màu và FIFO IoT; bài native C++ kiểm tra thêm lõi MyBlock.

### Kết quả từng thao tác trong base code

Base code và code sinh từ lộ trình không dùng cờ `missionOK`. Các thao tác di chuyển/quay/dò line dùng `void`, không dùng giá trị trả về để điều khiển lộ trình; kiểm tra đầu vào, timeout, stall và log `missionError` vẫn hoạt động. Một thao tác lỗi không tự khóa các lệnh tiếp theo trong `plannedRoute()`. Các hàm dò line dùng trạng thái giao lộ và kiểm tra mất line để kết thúc riêng thao tác đó; trạng thái lỗi chỉ dùng cho chẩn đoán và hiển thị kết quả cuối.


### Khai báo và kết nối Wi-Fi trên Leanbot

Các hàm thao tác trong base code dùng `void`. Hàm tính toán (`clampMotor`, `lineErrorForMask`...), đọc màu và chờ nhận dữ liệu IoT vẫn trả về dữ liệu/trạng thái cần thiết.

Cấu hình được sao chép vào các `String` riêng, sau đó gọi API `LbIoT.Wifi.begin` rồi `LbIoT.Asset.begin`; phải khai báo SSID và AssetID:

```cpp
declare_wifi("TEN_WIFI", "MAT_KHAU", F("ASSET_ID"));
set_wifi();
// Hoặc gộp cả hai bước:
set_wifi("TEN_WIFI", "MAT_KHAU", F("ASSET_ID"));
```

Base hiện tại gọi `declare_wifi("", "", F("AssetID"))` trong `setup()`. Điền SSID, mật khẩu và Asset ID thật tại dòng này trên cả hai robot. Nhấn TB2A để gọi `set_wifi()` theo thứ tự `LbIoT.Wifi.begin` → `LbIoT.Asset.begin` → cho phép gửi/nhận Color. Muốn kết nối ngay lúc khởi động, gọi `set_wifi()` sau phần khai báo. SSID trống hoặc thiếu AssetID báo lỗi, không thử kết nối; mật khẩu trống vẫn dùng được cho mạng mở.

Không còn `connect_robot_room` hay lựa chọn mode giao tiếp. Khi cần đổi AssetID, gọi lại `set_wifi("SSID", "password", F("NEW_ASSET"))`. Khai báo lại WiFi sẽ xóa cờ cấu hình IoT cũ. `iotConfigured` chỉ ghi nhận đã gọi hai API SDK, không chứng minh robot đã online.

Hai robot dùng cùng Asset ID và thuộc tính `Color` để trao đổi qua dịch vụ LeanbotIoT. Base không gửi khung `COLOR:` qua Serial, không đọc Serial để nhận màu và không kết nối WebSocket. Serial chỉ dùng cho log.

Kiểm thử native C++ kiểm tra lưu cấu hình, thứ tự WiFi/Asset và cấu hình thiếu; giả lập kiểm tra thuộc tính Color. Chưa kiểm chứng kết nối Internet với hai bo Leanbot thật.


### Dò line và kiểm tra màu trong base code

Các hàm line vẫn giữ nguyên. Luồng màu chỉ còn ba API: `read_color()` trả trực tiếp enum; `send_iot_color()` gửi màu vừa đo (hoặc truyền RED/GREEN/BLUE/YELLOW/PURPLE); `read_iot_color(timeoutMs=0)` đọc một lần hoặc chờ màu hợp lệ. UNKNOWN không được gửi; hết hạn nhận trả UNKNOWN. Chỉ WiFi/Asset qua LeanbotIoT dùng ba API này; Serial dành cho log, không có giao tiếp màu qua WebSocket, không có hàng chờ cục bộ hay các tên hàm màu tương thích cũ. Hiệu chuẩn cảm biến được giữ ở helper nội bộ; không dùng RGB giả lập làm mẫu cho robot thật.

### API dò line tinh gọn

Giữ nguyên lõi PID MyBlock và cấu hình điều khiển. Các lớp gọi `lbmbFollowDistance`, `lbmbFollowTime`, `lbmbFollowMarker` đã được gộp vào API `followLine…`; `lbmbFollow` là bộ thực thi nội bộ. Lệnh gọi cũ không có tốc độ vẫn dùng `LINE_SPEED / 20` phần trăm:

```cpp
followLineDistance(100);          // 100 mm = 10 cm
followLineCm(32.5f, 50);           // 32,5 cm, tốc độ 50%
followLineSeconds(2.5f, 50);       // 2,5 giây, tốc độ 50%
followLineUntilJunction(1, 50);    // Marker trái; 2=phải, 3=T
runFollowLine();                  // Một bước PID, tự đọc IR
runFollowLine(0b0110);            // Một bước với mask đã đọc
```

`followLineDistance` chỉ đổi đơn vị sang cm; không chứa thuật toán riêng. Nhóm căn tâm/đi qua nhiều giao lộ vẫn dùng trạng thái `junctionPending`. Sai số chẩn đoán chỉ lưu ở `lastLineError`; đã bỏ bản sao `filteredLineError` và các biến thời gian/lệnh bánh không được đọc.

### Chạy nguyên base với FullMission

Nút **Chạy / Start** nạp và khởi động sketch; `loop()` của base chờ nút chạm trong `FullMission()`. Sau đó chọn **TB1A · Line** để hiệu chuẩn, **TB1B · Bài** để chạy nhánh nhiệm vụ, hoặc **TB2A · WiFi** để gọi cấu hình WiFi/Asset. Nhánh TB1B trong mẫu đang là chỗ trống: thêm các lệnh nhiệm vụ ở chú thích tương ứng trong base. Không tự sửa sketch hoặc bỏ qua bước nhả nút/chống dội.

Các nút giả lập tạo xung 100 ms theo đồng hồ mô phỏng, có khoảng nhả ban đầu để base nhận nút ngay sau Start. Pause dừng cả đồng hồ và nút; Stop/Restart xóa nút đang chờ. Chạy online gửi nút tới đúng chương trình của người bấm. Logs hiển thị Serial và `MISSION ERROR`; runtime vẫn là bộ thông dịch C++ giới hạn, không thay cho biên dịch Arduino để nạp mạch.
