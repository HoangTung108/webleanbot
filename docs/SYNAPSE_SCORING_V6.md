# Đối chiếu chấm điểm Synapse City V6

Nguồn: **AIROC 2026: SYNAPSE CITY — Official Rulebook & Technical Guidelines**, cập nhật 17 September 2026, từ link người dùng:
https://drive.google.com/file/d/1KBwprFcB4-8hPliPkTJlqjujqLcO3FP_/view

## Quy tắc đã triển khai

| Mục | Quy tắc | Mô phỏng |
| --- | --- | --- |
| 3 | Explorer 4+2, Creator 5+3, Innovator 6+3, Master 7+3 | Preset tương ứng; Master gồm 1 Mystery |
| 7 | Chỉ một pollution mỗi thành phố | Áp dụng random, kéo thả và kiểm tra import |
| 9, 9.1 | Một phần khối tiếp xúc containment của thành phố xuất phát | SAT giữa footprint khối và hình vuông xoay; giữ `originZone` khi di chuyển |
| 9.2 | Pollution đã containment; neutralizer cùng màu chạm cùng vùng | Ghép một-một; vẫn tính nếu robot còn chạm khối |
| 9.3 | Một phần pollution chạm CRL hợp lệ | Mọi màu pollution thường 100; Mystery Master 150 |
| 6.1.3.2 | CRL không gồm line đen | Dùng hình màu 300 mm vuông trong map hiện tại; cần chỉnh geometry nếu thay sa bàn |
| 10.1 | 45/block, containment+neutralization 160/pair, analysis 100/block, Mystery 150, return 40/bot | Cặp 160 thay cho 45; không đếm một khối hai lần |
| 10.2 | Raw / Base Top Score × 1000; Base = trung bình Top 5 cùng vòng/cấu hình | Nhập đúng 5 Raw Score, không cap tại 1000; ví dụ tài liệu 535/344×1000 = 1555,2 |
| 5.5.4, 8 | STOP và giới hạn 2 phút | Nút Dừng chốt điểm; runtime tự dừng ở 120000 ms, đồng bộ mức tua |
| 11.4 | Chấm vị trí cuối sau khi mô hình nghỉ | Sau dừng cho các khối đã thả tiếp tục vật lý tối đa 5 giây |

## Điểm cần phân biệt với trọng tài thật

- §3 ghi Master tối đa **2 robot**, nhưng hình §10.1 vẽ 3 robot: code chọn giới hạn chữ 2.
- §9.3 nói pollution nói chung, không giới hạn đỏ/vàng; hình vẽ đỏ/vàng là minh họa. Code áp dụng phần chữ.
- Cặp 160 được hiểu là tổng điểm **Containment + Neutralization** theo tiêu đề ma trận; tài liệu không có ví dụ cộng điểm cặp độc lập.
- Return yêu cầu bắt đầu và kết thúc trong CRL; §5.5.4 yêu cầu bắt đầu nằm trọn. Code cũng kiểm tra nằm trọn khi về đích vì tài liệu không định nghĩa mức tiếp xúc riêng cho robot.
- Robot chạm/giữ khối vẫn được điểm nếu khối chạm mặt vùng. Khối bị nhấc khỏi sàn (`elevation > 0`) không tính. Mô hình tay gắp hiện không nâng khối theo trục Z.
- Có một vị trí cố định theo §9.1 nhưng tài liệu không nêu tọa độ cụ thể. Hàm tạo preset nhận `fixedSiteId` nếu BTC cung cấp; giao diện chỉ sinh bố trí luyện tập.
- Bảng màu preset theo minh họa; PTV Randomiser và giai đoạn giấu/lộ màu chưa được tích hợp.
- Sau 5 giây coasting, nếu cấu hình vật lý không có ma sát khiến khối vẫn trượt, kết quả không thể thay thế xác nhận vị trí nghỉ của trọng tài.

## Phạm vi chưa triển khai

Đây là chấm điểm mô phỏng một robot, không thay thế trọng tài. Chưa có xác nhận chữ ký,
2 vòng/xếp hạng/tiebreak theo §10.3, hoặc Reset/Restart/Tries giữ timer chạy theo §11.
Nút Đặt lại tạo lượt luyện tập mới, không giả vờ là Reset thi đấu. Không tự giả định phạt điểm
khi robot rơi vì tài liệu không công bố mức phạt đó.
