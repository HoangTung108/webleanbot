# Tệp trong giao diện Student IDE

Thanh bên quản lý các bài độc lập trên trình duyệt. Có thể tạo bài Blockly với
bộ khối Leanbot/My Blocks của IDE cũ, tạo C++, đổi tên trên thanh tiêu đề, chuyển
bài, đóng và khôi phục bài vừa đóng.

- Mở một hoặc nhiều `.ino`, `.cpp`, `.h`, `.hpp`, `.txt`, `.bduino`, `.xml`,
  `.blockly` hoặc project `.leanbot.json` từ máy.
- Tải C++ `.ino`, Blockly cũ `.bduino` / `.xml`, hoặc project đầy đủ `.leanbot.json`.
- Mỗi tệp giữ riêng code, XML hoặc workspace Blocks mới và được lưu trong
  `leanbot-studio.files.v1`; tệp đang mở vẫn dùng cơ chế lưu project v2.
- Mở C++ giữ nguyên mã nguồn, không thay bằng code sinh lại từ IR.
- Blockly cũ sử dụng chính bộ khối và generator ở `public/leanbot-ide/LB-blockly`,
  hiển thị trong khung giao diện mới với các nút undo/redo/zoom bên ngoài.
- Những project Blocks mới đã lưu trước đây vẫn mở bằng editor tương ứng.
- Khi chuyển từ C++ đã sửa riêng về Blockly cũ, bản C++ được giữ thành một tệp
  riêng trước khi mở lại XML; không tự suy diễn khối cũ từ C++ tùy chỉnh.
- Khi Blockly chưa tải xong, chặn xuất/chạy C++ để tránh dùng code chưa cập nhật;
  vẫn có thể tải XML và bản project.

Các tệp trên trình duyệt là những chương trình riêng, chưa phải hệ thống build
nhiều tệp: tệp header được giữ/mở/lưu, nhưng việc tạo nhiều tab không tự ghép các
`.ino`/`.h` vào cùng một lượt biên dịch. Compile/upload hiện dùng tệp đang mở.
