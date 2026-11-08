# Đối chiếu Gameplay Synapse City và luồng giả lập

Nguồn chính của thay đổi này: [Gameplay người dùng cung cấp](https://drive.google.com/file/d/1fJczHjPiiQfXwryGKQHC2LIvRvlHgr5E/view), 15 trang, đề ngày 02/03/2026.
Đây là bản tổng quan dạng slide, được phát hành trước [hướng dẫn kỹ thuật V6](https://drive.google.com/file/d/1KBwprFcB4-8hPliPkTJlqjujqLcO3FP_/view) ngày 17/09/2026 đã dùng trước đó.
Simulator áp dụng luồng của file người dùng vừa chỉ định; chi tiết chấm tiếp xúc mặt đất và công thức Top 5 tiếp tục tham chiếu tài liệu kỹ thuật.

## Các điểm chính và thay đổi

| Nguồn | Quy định/quan sát | Xử lý trong ứng dụng |
|---|---|---|
| Trang 5 | Explorer/Creator tối đa 1 robot; Innovator/Master tối đa 2 | Giữ giới hạn 1/1/2/2. Hình ma trận trang 11 vẽ Master 3 robot mâu thuẫn với bảng thông số; không lấy số hình vẽ làm giới hạn. |
| Trang 6–7 | Sa bàn 4 ft; 8 thành phố; bốn vị trí đánh số; neutralizer tại Storage | Giữ kích thước khối 15×25×75 mm. Số 2 ở dưới trái, số 3 ở trên phải được sửa trong tọa độ và SVG. Cạnh đường 325 mm vẫn theo số đo người dùng. |
| Trang 8–9 | Các nhiệm vụ không bị ép theo thứ tự; tính vị trí khối lúc chốt | Không tạo chuỗi bắt buộc containment → neutralization → analysis. Mỗi khối chỉ được chấm một lần theo vị trí cuối, đúng thành phố ban đầu khi containment. |
| Trang 8, 11 | Containment, cặp cùng màu, analysis, mystery và return | Giữ 45/khối, 160/cặp (thay 45 của pollution đó), 100/khối thường, 150/Mystery của Master, 40/robot đủ điều kiện. Mọi màu pollution thường có thể về CRL. |
| Trang 9–10, 12–14 | Vị trí được công bố trước chuẩn bị; màu Innovator/Master chỉ công bố sau cách ly | Thêm hai giai đoạn công bố. Màu pollution được che trên canvas trong chuẩn bị; lần công bố sau chỉ phân phối màu, không đổi vị trí. Neutralizer giữ ở Storage. |
| Trang 12 | Code không được sửa sau cách ly | Chụp code sau kiểm tra cú pháp; khóa điều hướng về IDE đến khi lượt kết thúc. Dù nguồn ngoài thay đổi, lượt thi vẫn chạy bản đã khóa. |
| Trang 9, 12 | Hai vòng, mỗi vòng tối đa hai phút, cấu hình khác nhau | Lưu kết quả từng vòng; tạo bố trí khác ở vòng sau, kể cả nếu seed đầu vào lặp lại. Chuẩn bị không tiêu thụ thời gian thực thi. |
| Trang 12 | Chấm khi lượt kết thúc | Trong chế độ thi đấu, C++ hết sớm chỉ dừng motor; đồng hồ/vật lý tiếp tục đến 120 giây mô phỏng. STOP là thao tác chốt sớm theo hướng dẫn kỹ thuật. |
| Trang 15 | Ưu tiên normalized tốt nhất, độ ổn định, số tries và thời gian | Có kết quả hai vòng và đầu vào Top 5 riêng từng cấu hình; hiển thị normalized tốt nhất và chênh lệch. Không cộng raw hai vòng để tự xếp hạng. |

## Luồng sử dụng

1. Chọn **Thi đấu mô phỏng · 2 vòng** và hạng mục.
2. **Công bố vị trí**. Explorer/Creator biết màu ngay; Innovator/Master thấy pollution chưa rõ màu.
3. Chuẩn bị code, có thể quay về IDE và chạy thử. Khi quay lại, cấu hình và giai đoạn vẫn được giữ. Các khối trong lượt tập không làm thay đổi cấu hình gốc. Reset đã được sửa để không dùng chung/mutate đối tượng tọa độ xuất phát.
4. Đưa robot về CRL rồi **Khóa code · Cách ly**. Cần toàn bộ footprint robot nằm trong CRL.
5. **Công bố màu** ở Innovator/Master; Explorer/Creator xác nhận cách ly. Không thể thay code và cấu hình nữa.
6. **Chạy** bắt đầu đồng hồ thực thi. Các mức tua thay đổi tốc độ thời gian mô phỏng; không sửa giới hạn 120 giây.
7. Hết thời gian hoặc STOP: dừng robot, chờ khối ổn định và lưu kết quả. C++ kết thúc đơn thuần không kết thúc lượt thi.
8. Chuẩn bị vòng 2 với bố trí mới, rồi tổng kết. Kết quả vòng 1 không bị ghi đè.

Chế độ **Luyện tập tự do** vẫn cho phép sửa sa bàn, pause và chạy C++ độc lập.

## Phạm vi và giới hạn cần hiểu đúng

- Đây là buổi thi mô phỏng local, không thay trọng tài hoặc xác nhận điểm chính thức. Chưa quản lý đầy đủ Reset/Restart/Tries giữa một đồng hồ chung; mỗi vòng có một lần thực thi, có thể STOP. Không dùng nút đặt lại để làm mới đồng hồ trong lượt thi.
- Phiên thi online chạy C++ và mô phỏng trên server: dùng chung khối, đồng hồ, giai đoạn, tốc độ và điểm đội. Hai robot khóa code riêng; không gửi source cho máy khác. Return tối đa 80 cho Innovator/Master. Khi một robot mất kết nối trong lượt thi, server STOP cả đội và chốt một kết quả. Phòng lưu trong RAM; khởi động lại server làm mất phiên.
- Slide không nêu công thức normalized hoặc chi tiết Reset. Công thức raw / trung bình Top 5 × 1000 đến từ tài liệu kỹ thuật đã cung cấp; phải nhập đúng Top 5 từng cấu hình/vòng.
- Bản này không có bảng màu cố định chính thức từ BTC hoặc mô hình cảm biến màu hoàn chỉnh. Pool màu mặc định là preset luyện tập trong ma trận. Che màu là hành vi giao diện, không phải hệ thống chống gian lận.
- Quy định ngôn ngữ lập trình, phần cứng và độ tuổi là điều kiện giải đấu. Runtime mô phỏng dùng C++ (kể cả C++ sinh từ Blockly), chưa xác thực nguồn gốc ngôn ngữ theo hạng mục.
- Hitbox/chuyển động vẫn là mô hình 2,5D đã hiệu chỉnh từ ảnh và số đo thực tế; không tuyên bố mô phỏng cơ khí 3D đầy đủ.
