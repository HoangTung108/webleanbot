# Triển khai máy chủ nhiều robot

Địa chỉ Render trong ví dụ không tự tạo ra backend. Nếu nhận HTTP 404 cùng header `x-render-routing: no-server`, cần tạo dịch vụ hoặc dùng URL thực tế của dịch vụ đang chạy.

1. Đưa thay đổi, gồm `render.yaml`, lên repository GitHub của bạn.
2. Trong Render Dashboard chọn **New → Blueprint**, kết nối repository và tạo dịch vụ từ `render.yaml` ở thư mục gốc. Cấu hình này build backend Node riêng, chạy `npm run start:network` và dùng `/health` để kiểm tra sức khỏe.
3. Khi dịch vụ Live, mở `https://<tên-thực-tế>.onrender.com/health`. Kết quả phải là `{"ok":true,"service":"leanbot-robot-network"}`. Dùng URL Render thực tế; tên ví dụ có thể không phải hostname được cấp.
4. Trong GitHub repository: **Settings → Secrets and variables → Actions → Variables**, tạo repository variable `VITE_WEBSOCKET_URL` bằng `wss://<tên-thực-tế>.onrender.com`.
5. Chạy lại workflow **Deploy to GitHub Pages** hoặc push thay đổi mới. Đây là biến lúc build: chỉ refresh trang không thay đổi URL đã nằm trong bundle.
6. Mở lại trang, tạo phòng và kiểm tra hai client cùng phòng.

Nếu build frontend thủ công, truyền `VITE_WEBSOCKET_URL` khi chạy `npm run build`, hoặc đặt giá trị thực tế trong `.env.production.local` trên máy build. Không cần truyền port 8080 vào URL WSS công khai.

Chạy local: `npm run dev` khởi động frontend, compiler và network server; Vite chuyển tiếp `/ws` tới backend cổng 8080.

Tài liệu Render: https://render.com/docs/blueprint-spec và https://render.com/docs/websocket
