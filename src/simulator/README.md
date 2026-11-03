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
  Tốc độ trung gian được nội suy tuyến tính; khoảng cách hai bánh vẫn ước lượng 75 mm.
- Robot vẽ theo ảnh Leanbot: PCB đỏ dài, Nano xanh, hai bánh đen, cảm biến siêu âm đôi và càng màu be.
  Tổng hình khoảng 128 × 86 mm, vùng chặn biên bán kính 75 mm; đây là tỷ lệ
  ước lượng từ ảnh, chưa phải số đo robot thực. Hướng +X luôn là phía càng.
- Mỗi thành phố A–H có 4 vị trí: 1 trên trái, 2 trên phải, 3 dưới trái, 4 dưới phải.
  Ô 1/4 xoay +45°, ô 2/3 xoay −45° để đối xứng.
- S1/S3/S5 nằm ở mép dưới; S2/S4/S6 ở mép phải.
- Góc đường bao tại CRL (dưới phải) là góc vuông; ba góc còn lại giữ bo tròn.
- CRL là khu xuất phát/kết thúc. Vị trí đánh dấu không phải vật cản.
- Mô hình khối theo sơ đồ: 15 × 25 × 75 mm. Chưa đặt khối ngẫu nhiên/tính điểm.

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
