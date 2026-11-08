# Render: máy chủ nhiều robot

Render Web Service của repo này chạy WebSocket backend. Giao diện React được
triển khai riêng qua GitHub Pages; đây không phải dịch vụ phục vụ thư mục `dist`.

Trong Render → Settings → Build & Deploy:

- Build Command: `npm ci --include=dev && npm run build:network`
- Start Command: `npm start`
- Health Check Path: `/health`
- Runtime: Node

`render.yaml` khai báo cùng cấu hình. Thay đổi file Blueprint không tự ghi đè
thiết lập của một dịch vụ đã tạo thủ công trong dashboard.

Nếu đang dùng Build Command `npm install && npm run build` như log hiện tại,
lệnh này cũng tạo `build-server/robotNetworkServer.js`. Script `start` gọi
`start:network`, nên cả `npm start` và `yarn start` đều khởi động đúng server.
Server lắng nghe `0.0.0.0` và cổng `PORT` do Render cấp; không đặt cổng cố định.

Sau khi đẩy thay đổi lên GitHub, triển khai lại commit mới. Kiểm tra
`https://<ten-dich-vu>.onrender.com/health` trả JSON với `ok: true`, rồi đặt biến
`VITE_WEBSOCKET_URL` của bản build giao diện thành
`wss://<ten-dich-vu>.onrender.com/ws` và build lại giao diện.

Lỗi `Command "start" not found` xảy ra sau khi build đã thành công: thiếu script
khởi động, không phải cảnh báo kích thước bundle Vite. Thông báo `npm audit` là
vấn đề riêng, không phải nguyên nhân tiến trình thoát trong log này.
