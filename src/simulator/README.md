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

- Một cạnh ô thành phố, đo giữa tâm giao lộ, dài 350 mm.
- Đã hiệu chỉnh theo số đo: `runLR(2000, 2000)` đi 350 mm trong 5 giây (70 mm/s).
  Tốc độ trung gian được nội suy tuyến tính; khoảng cách hai bánh ước lượng 84 mm, dùng chung cho vật lý và encoder C++.
- Robot vẽ theo ảnh Leanbot: PCB đỏ dài, Nano xanh, hai bánh đen, cảm biến siêu âm đôi và càng màu be.
  Tổng hình khoảng 180 × 100 mm, vùng chặn biên bảo thủ bán kính 100 mm; đây là tỷ lệ
  ước lượng từ ảnh, chưa phải số đo robot thực. Hướng +X luôn là phía càng.
- Mỗi thành phố A–H có 4 vị trí: 1 trên trái, 2 trên phải, 3 dưới trái, 4 dưới phải.
  Ô 1/4 xoay +45°, ô 2/3 xoay −45° để đối xứng.
- S1/S3/S5 nằm ở mép dưới; S2/S4/S6 ở mép phải.
- Góc đường bao tại CRL (dưới phải) là góc vuông; ba góc còn lại giữ bo tròn.
- CRL là khu xuất phát/kết thúc. Vị trí đánh dấu không phải vật cản.
- Khối nhiệm vụ 15 × 25 × 75 mm: kéo thả vào ô, random theo số lượng/seed, gắp–mang–thả, va chạm, ma sát và đổ nằm ngang. Chưa có luật tính điểm.

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

- Mốc cố định: sa bàn 4 ft = 1219,2 mm mỗi chiều; cạnh thành phố 350 mm;
  khối 15 × 25 × 75 mm. Khối đứng hiển thị mặt đáy 15 × 25 mm với phần gợi chiều cao;
  khi đổ, chiều dài chiếm mặt sàn tiến tới 75 mm.
- Ước lượng robot từ ảnh phối cảnh: dài khoảng 180 mm, rộng qua bánh khoảng 100 mm,
  khoảng cách tâm bánh 84 mm. Đây không phải kích thước đo chính thức; ảnh không đủ
  để khẳng định độ chính xác tuyệt đối. Đo trực tiếp để chốt thông số.
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
