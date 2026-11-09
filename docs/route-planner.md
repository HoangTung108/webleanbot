# Vẽ lộ trình robot

Trong Simulator, bấm nút **Lộ trình** trên thanh tab bên phải để mở công cụ vẽ và preview code trong cùng một bảng. Code nằm ngay dưới các công cụ và tự cập nhật khi chỉnh đường đi. Đóng hoặc chuyển khỏi tab Lộ trình sẽ tắt chế độ vẽ/sửa điểm, nhưng giữ lộ trình đã tạo.

Sa bàn chiếm vùng trung tâm. Các nút Lộ trình, Preview code, Nhiệm vụ, Thi đấu và Hiển thị mở bảng bên cạnh; bấm lại hoặc Escape để đóng. Bảng mở chiếm vùng riêng, không phủ lên sa bàn. Trạng thái robot cập nhật trong box nhỏ ở góc trên trái vùng sa bàn. Trên màn hình nhỏ, bảng tính năng nằm phía dưới sa bàn. Nhật ký thu thành bóng chat, có số log chưa đọc và hiệu ứng báo log mới; mở Nhật ký để xem và xóa dấu chưa đọc.

1. Đặt robot và góc xuất phát bằng các điều khiển hiện có.
2. Bấm **Vẽ đường**, rồi bấm từng điểm trên sa bàn. Các điểm nối bằng đường xanh; robot tự xoay về hướng đoạn tiếp theo.
3. Bật **Dò line** nếu đoạn đó nằm trên vạch đen. Chế độ mặc định di chuyển thẳng theo khoảng cách.
4. Chèn **Xoay**, **Gắp**, **Thả** theo thứ tự mong muốn. Góc xoay tương đối: dương quay phải, âm quay trái. Mở danh sách bước trong preview để xóa từng bước hoặc dùng **Hoàn tác**.
5. **Chạy lộ trình** đặt lại robot về điểm xuất phát đã lưu và thực thi lộ trình. Ô **Preview C++** dưới sa bàn chỉ hiển thị các lời gọi hàm, không kèm bộ khung. Bấm vào ô, chọn code bằng chuột hoặc Ctrl+A rồi Ctrl+C để copy vào IDE.

Chọn **Sửa điểm** để bấm chọn/kéo các điểm đã vẽ. Có thể chọn điểm trong danh sách, nhập X/Y (mm), hoặc bấm **Xóa điểm**. Điểm 0 là xuất phát, chỉnh được vị trí và hướng nhưng không xóa được. Xóa điểm chỉ xóa đoạn đến điểm đó; các sự kiện gắp/thả đã chèn vẫn giữ thứ tự.

Bật **Quay khi đến điểm**, rồi nhập hướng tuyệt đối: 0° sang phải, 90° xuống, 180° sang trái, 270° lên. Robot đi đến điểm rồi quay về hướng này trước khi thực hiện bước tiếp theo. Tắt tùy chọn để giữ hướng của đoạn đi đến điểm. Điểm đang chọn có màu cam và mũi tên hướng; preview tính lại cả góc quay và khoảng cách khi kéo điểm. Nút **Xoay** trên thanh công cụ vẫn thêm một bước xoay tương đối ở cuối lộ trình.

Code preview tự cập nhật khi sửa lộ trình, sử dụng các hàm di chuyển, dò line và tay gắp từ `docs/baseCode.cpp`. Khi chạy giả lập, hệ thống bổ sung nội bộ phần hàm hỗ trợ và bộ khung thực thi. Bộ sinh bỏ phần WiFi chưa hoàn chỉnh và các nhiệm vụ/color không liên quan; tách khai báo nhiều biến và đổi tên overload không tham số để tương thích bộ thông dịch. Thông báo lỗi giữ qua Serial, không đặt màu LED đỏ.

Lộ trình hiện giữ trong phiên mở Simulator. Đường xanh là đường dự kiến; sai số dừng, hệ số hiệu chỉnh góc và va chạm vẫn áp dụng khi chạy. Dò line đọc bốn vị trí cảm biến trên hình học sa bàn, chưa mô phỏng hiệu chuẩn độ phản xạ thực tế. Chức năng sửa/chạy lộ trình bị khóa khi đang chạy hoặc trong chế độ thi đấu.
