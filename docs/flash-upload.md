# Sai flash tại 0x7800

0x7800 = 30720 byte, là đầu vùng boot dành riêng trên cấu hình Arduino Nano ATmega328P. Arduino AVR core quy định giới hạn ứng dụng 30720 byte cho cả Nano mới (115200 baud) và cũ (57600 baud):
https://github.com/arduino/ArduinoCore-avr/blob/master/boards.txt

Trước đây ứng dụng biên dịch như Uno (32256 byte), uploader cũng suy ra giới hạn lớn hơn khi bắt tay ở 115200 baud. Vì baud không xác định dung lượng vùng boot, cấu hình đó có thể tạo HEX vượt vùng ứng dụng của Nano rồi lỗi xác minh tại 0x7800.

Đã sửa:
- Target chung: `arduino:avr:nano:cpu=atmega328`.
- Compiler local, cloud và cấu hình IDE legacy cùng dùng Nano.
- Kiểm tra địa chỉ cao nhất trong HEX, không chỉ đếm số byte dữ liệu.
- Firmware chứa dữ liệu từ 0x7800 bị từ chối trước khi ghi; trang cuối hợp lệ kết thúc tại 0x77ff.
- Giữ kiểm tra checksum và đọc xác minh toàn bộ các trang đã ghi.
- Bỏ in Hue dạng float trong baseCode để tránh kéo bộ in số thực vào flash nếu không cần; không đổi thuật toán màu.

Hãy biên dịch lại để lấy HEX mới. Nếu vẫn báo chương trình vượt 30720 byte, cần giảm dung lượng chương trình/thư viện trước khi nạp. Không sửa HEX bằng cách xóa phần cuối và không tắt verify. Code trong IDE hoặc firmware cũ đã tạo bằng Uno không tự nhỏ đi chỉ do đổi cấu hình uploader.

Đã kiểm tra bằng bộ test uploader/compiler và compiler Cloud với chương trình trống; chưa nạp thử vào robot thật trong phiên này. Nếu HEX mới nằm dưới giới hạn nhưng vẫn lỗi ở địa chỉ khác, cần kiểm tra riêng kết nối/nguồn và bootloader, không kết luận rằng mọi lỗi verify đều do kích thước.

## Khi chương trình vượt giới hạn vài trăm byte

BaseCode mặc định `COLOR_DEBUG = false`: bỏ tổng hợp/in RGB và tên màu trên Serial trong bản nạp gọn; kết quả trả về, LED và IoT không đổi. Các thông báo hiệu chuẩn/reset đã được rút ngắn. Bật `COLOR_DEBUG = true` để chẩn đoán sẽ tăng lại dung lượng flash.

Đo cục bộ phần đọc màu bằng AVR-GCC 7.3 `-Os`: object trước tối ưu có text 763 byte, sau tối ưu 350 byte (giảm 413 byte), chưa tính phần giảm thông báo ở các hàm khác. Đây là số đo riêng phần mã, không phải dung lượng firmware hoàn chỉnh liên kết với LeanbotCore dựng sẵn; cần biên dịch bằng đúng SDK để xác nhận tổng dưới 30720 byte.
