# LeanbotIoT: tích hợp và phạm vi đã xác minh

Ngày rà soát: 14/11/2026.

## Nguồn và giới hạn truy cập

- [Dashboard kho Pythaverse do người dùng cung cấp](https://git.pythaverse.space/dashboard/repos).
- [Hướng dẫn cài đặt/lập trình Leanbot IoT của Pythaverse](https://support.pythaverse.space/kb/faq.php?id=31).
- [Thư mục tài liệu được trang hỗ trợ dẫn tới](https://git.pythaverse.space/quang.dinh/LeanbotDistributors/tree/master/Leanbot_Testing/Leanbot_IoT).

Kho tài liệu chuyển sang đăng nhập Pythaverse eID khi truy cập trong phiên rà soát. Chưa đọc được `LeanbotIoT.h`, phần triển khai, `library.properties` hoặc ví dụ trong kho đó. Vì vậy đây là phân tích toàn bộ đường tích hợp IoT **hiện có trong dự án**, không phải danh mục đầy đủ của SDK chính thức. Không suy đoán phiên bản, overload, mã thành công, giao thức mạng hoặc cơ chế xác thực của SDK.

## Ba lớp cần phân biệt

| Lớp | Vai trò | Nguồn trong dự án |
| --- | --- | --- |
| LeanbotIoT trên robot | WiFi, chọn Asset, truy cập thuộc tính qua SDK | Các lời gọi trong `docs/baseCode.cpp`; cần đối chiếu SDK gốc |
| Helper baseCode | Lưu cấu hình, gửi/nhận enum màu, timeout, reset nhiệm vụ | `declare_wifi`, `set_wifi`, `send_iot_color`, `read_iot_color` |
| Giả lập và server dự án | Thực thi tập con API, lưu thuộc tính, nối robot mô phỏng | `cppRuntime.ts`, `cppBridge.ts`, `server/onlineCompetition.ts`, `server/robotNetworkServer.ts` |

`IoTColor` là biến do base đặt tên. `Color` là tên thuộc tính. `AssetID` trong ví dụ là chỗ cần thay bằng ID thật, không phải tên mạng WiFi.

## Năm lời gọi SDK được ghi nhận

| Lời gọi | Dữ liệu dùng trong base | Ý nghĩa đã quan sát |
| --- | --- | --- |
| `LbIoT.Wifi.begin(ssid, password)` | `const char*` lấy từ `String.c_str()` | Được gọi trước Asset.begin |
| `LbIoT.Asset.begin(F("AssetID"))` | `const __FlashStringHelper*` | Chọn Asset; base bỏ qua kết quả |
| `LbIoT.Asset.attribute(F("Color"))` | Tên thuộc tính trong flash | Nhận đối tượng bằng `auto`, khai báo toàn cục |
| `IoTColor.write("Blue")` | Base truyền chuỗi `const char*` | Gửi màu đã chuyển sang tên giao thức |
| `String value = IoTColor.read()` | Kết quả được nhận vào `String` | Đọc giá trị rồi phân tích màu |

Việc nhận vào `String` không chứng minh kiểu trả về gốc là `String`. Việc base bỏ qua kết quả không chứng minh một API trả `void`. Tên lớp đối tượng thuộc tính, toàn bộ kiểu dữ liệu read/write, tham số tùy chọn và mã lỗi cần header đúng phiên bản.

## Ví dụ dùng trực tiếp thư viện

Ví dụ này dùng các lời gọi đã có trong base; chưa được biên dịch với SDK phần cứng trong phiên rà soát. Cài Leanbot và LeanbotIoT theo hướng dẫn Pythaverse phù hợp với bo/module đang dùng.

```cpp
#include <Leanbot.h>
#include <LeanbotIoT.h>

auto IoTColor = LbIoT.Asset.attribute(F("Color"));

void setup() {
  Leanbot.begin();
  Serial.begin(115200);
  LbIoT.Wifi.begin("TenWifi", "MatKhau");
  LbIoT.Asset.begin(F("AssetID"));
  // Trên robot gửi, bỏ chú thích để gửi một lần:
  // IoTColor.write("Blue");
}

void loop() {
  String value = IoTColor.read();
  Serial.println(value);
  LbDelay(500);
}
```

Hai robot cần cùng AssetID, cùng tên thuộc tính và quyền truy cập tương ứng. Khoảng 500 ms chỉ là nhịp thăm dò minh họa, không phải tốc độ hay giới hạn được công bố của dịch vụ. Serial ở đây dùng quan sát kết quả.

## Luồng baseCode và nút robot

1. `setup()` gọi `Leanbot.begin()` và `declare_wifi("", "", F("AssetID"))`. Thay SSID, mật khẩu và AssetID trước khi dùng phần cứng.
2. `declare_wifi` sao chép SSID/mật khẩu vào hai `String`, lưu con trỏ AssetID và đặt `iotConfigured = false`. Hàm này chưa kết nối mạng.
3. TB2A gọi `set_wifi()`: kiểm tra SSID không rỗng và AssetID không phải `nullptr`, gọi `Wifi.begin` rồi `Asset.begin`, sau đó bật `iotConfigured`.
4. TB1B chạy lệnh trong nhánh nhiệm vụ của `FullMission`. Bản mẫu để trống nhánh này; cần thêm lệnh gửi/nhận.
5. TB2B yêu cầu reset bài. Reset giữ cấu hình WiFi/Asset, xóa trạng thái màu đã đo ở base; không xóa giá trị trên cloud.

`iotConfigured` không kiểm tra kết quả SDK, nên không chứng minh online hay ghi thành công. Kiểm tra AssetID hiện chỉ kiểm tra con trỏ: `F("")` chưa bị loại bởi base. Không nên mô tả việc kiểm tra hiện tại là xác thực AssetID đầy đủ. Mật khẩu trống được helper cho qua để có thể dùng mạng mở; khả năng kết nối thực tế phụ thuộc SDK/module.

```cpp
// Trong setup() của base, thay dòng declare_wifi có sẵn:
declare_wifi("TenWifi", "MatKhau", F("AssetID"));
// TB2A sẽ kết nối; hoặc gọi set_wifi() ngay sau đây.

// Trong nhánh TB1B của robot gửi, sau khi đã cấu hình:
read_color();
send_iot_color();

// Trong nhánh TB1B của robot nhận:
ObjectColor received = read_iot_color(30000UL);
if (received == BLUE) close_hand(90);
```

## Giao thức màu của dự án

| Enum base | Chuỗi gửi |
| --- | --- |
| `UNKNOWN = 0` | Không gửi |
| `RED = 1` | `Red` |
| `GREEN = 2` | `Green` |
| `BLUE = 3` | `Blue` |
| `YELLOW = 4` | `Yellow` |
| `PURPLE = 5` | `Purple` |

`read_color()` đo cảm biến APDS, không đọc mạng. `send_iot_color()` dùng kết quả đo đã lưu; có thể truyền enum trực tiếp, không đo lại. `read_iot_color(0)` đọc một lần; timeout dương lặp đến khi có màu hợp lệ, hết hạn hoặc reset. Chuỗi nhận được trim và đổi sang chữ hoa trước khi so khớp. Thiếu cấu hình báo `ERR_WIFI_CONFIG` (11); hết hạn nhận trả `UNKNOWN` mà không tự ghi lỗi nhiệm vụ.

Color được dùng như giá trị mới nhất, không có FIFO hoặc xác nhận đã xử lý. Đọc hai lần có thể nhận cùng màu. Hai lần gửi Blue không thể phân biệt chỉ từ chuỗi Blue. Nếu nhiệm vụ cần xử lý đúng từng lượt, cần thiết kế thêm mã lượt và ACK; SDK/giao thức hiện có trong base chưa cung cấp điều đó.

Timeout của helper được kiểm tra trước/sau lời gọi SDK. Một lời gọi SDK chặn có thể vượt quá timeout yêu cầu và trì hoãn xử lý TB2B. Không gọi kết nối mạng trong vòng PID cần thời gian ổn định.

## Hành vi của giả lập

| Môi trường | Hành vi hiện tại |
| --- | --- |
| `CppRuntime` độc lập | Wifi.begin chỉ ghi log; Asset.begin lưu ID; thuộc tính lưu theo cặp AssetID/tên. Read dùng host nếu có, rồi giá trị cục bộ, rồi `waiting`. Start xóa bộ nhớ IoT cục bộ. |
| `CppSimulatorBridge` trong trình duyệt | Thuộc tính Color đọc/ghi qua phòng WebSocket nếu phù hợp AssetID; nếu có AssetID khác thì dùng cầu nối HTTP và cache màu. Các thuộc tính khác không có cầu nối mạng tại đây. |
| Thi online trên server | Host của runtime đọc/ghi kho thuộc tính chung của phiên thi; xem `server/onlineCompetition.ts`. |
| Server mạng dự án | Có `/api/iot/attribute` và các API màu/phòng, đồng bộ Color với phiên thi. Đây là endpoint do dự án định nghĩa. |

Không có bằng chứng SDK LeanbotIoT thật tự gọi `/api/iot/attribute` của dự án. Không coi HTTP/WebSocket này là giao thức chính thức Pythaverse. Bridge có xử lý log Serial dạng màu cho các chương trình khác; base hiện không phát các khung đó để gửi IoT.

Mật khẩu WiFi, trạng thái module, xác thực cloud, quyền Asset, độ trễ/mất mạng và mã lỗi SDK thật chưa được mô phỏng đầy đủ. Log runtime nói dữ liệu cục bộ không mô tả hết trường hợp host đang nối mạng dự án. Đọc HTTP qua bridge là bất đồng bộ và có thể trả cache trước khi yêu cầu hoàn tất.

## Chẩn đoán

| Hiện tượng | Kiểm tra |
| --- | --- |
| `MISSION ERROR: 11` | SSID, AssetID, đã gọi set_wifi/TB2A chưa, có declare_wifi lại khiến cờ cấu hình bị xóa không |
| Bấm Chạy nhưng robot đứng yên | FullMission chờ TB1B; nhánh nhiệm vụ có lệnh chưa |
| Nhận UNKNOWN | Chuỗi thuộc tính có thuộc 5 màu không, timeout/reset, đúng Asset và tên Color không |
| Nhận lại màu cũ | Thuộc tính không có cơ chế tiêu thụ; cần giao thức phân biệt lượt nếu cần |
| Giả lập chạy nhưng robot thật không kết nối | Kiểm tra module, SDK đúng phiên bản, WiFi và quyền Asset; kết quả giả lập không xác nhận các yếu tố này |
| Không biên dịch được Asset.begin | Đối chiếu chữ ký header; base hiện dùng F(...) và con trỏ flash, không truyền c_str() cho AssetID |

## Phần cần đọc tiếp trong kho chính thức

Để hoàn tất phân tích toàn bộ thư viện: cần quyền đọc repo LeanbotIoT hoặc bản xuất gồm `library.properties`, README, tất cả header/implementation và `examples/`. Cần ghi lại commit/tag, dependency, phần cứng hỗ trợ, mọi API công khai, kiểu trả về/mã lỗi, timeout/retry, cơ chế xác thực và giao thức truyền tải. Không suy ra các chi tiết đó từ stub kiểm thử hay từ tên API.

Các kiểm thử liên quan của dự án: `src/simulator/colorIoT.test.ts`, `src/simulator/fullMission.test.ts`, `src/simulator/baseWifi.test.ts`, `server/onlineCompetition.test.ts` và `server/robotColorSignal.test.ts`. Chúng kiểm tra base/cầu nối, không thay thế kiểm thử SDK trên hai bo Leanbot thật.
