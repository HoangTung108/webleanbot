# Synapse City: nguồn random và tỷ lệ

Đối chiếu ngày 2026-11-12:
- Trang: https://www.airoc.space/labs/SynapseCity/synapse-city-randomizer/
- Ứng dụng: https://www.airoc.space/labs/SynapseCity/synapse-city-randomizer/_original.html
- Thuật toán và tọa độ: https://www.airoc.space/labs/SynapseCity/synapse-city-randomizer/script.js

## Kích thước: phân biệt bản vẽ và tấm thật

| Đại lượng | Mã nguồn trang | Mô phỏng hiện tại |
| --- | --- | --- |
| Cạnh khung | 1200 đơn vị vẽ | 1219,2 mm = 4 feet |
| Bước ô thành phố | 333,3333 đơn vị vẽ | 325 mm theo số đo người dùng |
| Line đen | 16,6667 đơn vị vẽ | Khoảng 15,6842 mm trong hình đang hiệu chuẩn |
| Dải trắng | 50 đơn vị vẽ | Theo hình nền hiện tại |
| Tỷ lệ hiển thị | 600 px / 1200 đơn vị = 0,5 | Phóng/thu canvas, tính toán bằng mm |

Trang không khai báo đơn vị vật lý cho các hằng vẽ. Nếu ép toàn bộ khung 1200 thành 1219,2 mm thì tỷ lệ là 1,016 mm/đơn vị, bước ô sẽ là 338,6667 mm và line 16,9333 mm. Các số này khác số đo ô 325 mm của người dùng, nên không tự thay hình học đang hiệu chuẩn bằng chúng. Lưu các hằng nguồn và sự khác biệt trong metadata.randomizerReference để truy vết. Kích thước khối thật 15 × 25 × 75 mm vẫn lấy từ cấu hình mô hình trước đó; ObjW=24,5 và ObjH=14,5 của trang là hình vẽ ô đặt, không phải số đo khối thật.

## Quy tắc đã áp dụng cho các hạng mục

- Explorer: đỏ, vàng, xanh lá, xanh dương (4 khối).
- Creator: thêm tím (5 khối).
- Innovator: thêm vàng thứ hai (6 khối).
- Master: thêm Mystery (7 khối).
- Xáo A–H không lặp: mỗi thành phố có tối đa một khối.
- Xáo bộ chỉ số [1,2,3,4,1,2,3,4], ghép với A–H rồi lấy đủ số khối. Một số ô con xuất hiện tối đa hai lần.
- Lấy lại cấu hình nếu không đủ: ít nhất một thành phố trong từng nhóm ABC, BDG, CFH, ABD, ACF, GEH, DGHF; ít nhất hai trong ABCDF.
- Xáo vị trí đã chọn rồi gán theo thứ tự màu ở trên. Dùng seed của ứng dụng để tái lập; không hứa trùng kết quả ngẫu nhiên Math.random trên trang gốc.
- Innovator/Master: Random 1 công bố vị trí, ẩn màu; Random 2 giữ nguyên tập vị trí, chỉ xáo gán màu sau khi khóa code. Luồng CompetitionFlow hiện có đã thực hiện bước này.
- Vị trí cố định do người tổ chức truyền vào là mở rộng riêng của ứng dụng; vẫn phải đạt các ràng buộc phân bố.
- Trang chỉ vẽ các vị trí storage S1–S6, không random màu neutralizer trong các hàm generateMap/generateRandomPollutions. Giữ cơ chế neutralizer hiện có, không quy nó thành quy tắc xác nhận từ trang.
- Nút random bố trí tự do trong trình biên tập vẫn là công cụ thử nghiệm; các hạng mục chấm điểm/thi đấu dùng quy tắc mới.
