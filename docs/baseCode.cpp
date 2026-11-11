
#include <Leanbot.h>
#include <math.h>
#include <string.h>
#include <LeanbotIoT.h>
#include <Arduino_APDS9960.h>


auto IoTColor = LbIoT.Asset.attribute(F("Color"));

// Hiệu chỉnh thông số
const float DISTANCE_SCALE = 1.0f;
const float LEFT_SCALE = 1.0f;
const float RIGHT_SCALE = 1.0f;
const float TURN_ONE_SCALE = 1.0f;
const float TURN_TWO_SCALE = 1.0f;
enum TurnMode { TWO_WHEELS, LEFT_ONLY, RIGHT_ONLY };
const float TURN_SCALE[3] = {1.05f, 1.05f, 1.05f};

const int MAX_MOTOR_SPEED = 2000;
const int MOVE_START_SPEED = 165;
const int MOVE_FINISH_SPEED = 165;
const float MOVE_SLOW_ZONE_MM = 45.0f;
const float MOVE_BRAKE_LEAD_MM = 3.0f;
const int MOVE_ACCEL_INCREMENT = 22;  
const int HEADING_KP = 9;          

const int TURN_FINISH_SPEED = 120;
const float TURN_SLOW_ZONE = 30.0f;
const float TURN_BRAKE_LEAD_DEG = 1.5f;
const int TURN_ACCEL_INCREMENT = 18;
const unsigned long MOTION_FEEDBACK_MS = 1UL;

const int ROUTE_SPEED = 1800;       
const int LINE_SPEED = 850;         
const int LINE_KP = 220;
const unsigned long LINE_STEP_MS = 10UL;
const unsigned long LINE_LOST_MS = 320UL;
const unsigned long LINE_JUNCTION_TIMEOUT_MS = 14000UL;
const unsigned long LINE_DISTANCE_TIMEOUT_MS = 9000UL;
const float LINE_JUNCTION_LIMIT_MM = 750.0f;
const float LINE_JUNCTION_SKIP_MM = 18.0f;
const float JUNCTION_CENTER_MM = 20.0f;

// Primary Blockly: 69,78,106,70; Secondary standalone commented same values.
// IoT A/B examples use different thresholds: calibrate for YOUR robot & lighting.
const int IR_TH_2L = 69;
const int IR_TH_0L = 78;
const int IR_TH_1R = 106;
const int IR_TH_3R = 70;

const int GRIP_CLOSE_ANGLE = 50;
const int GRIP_MOVE_MS = 750;
const int GRIP_SETTLE_MS = 120;

enum ErrorCode {
  ERR_NONE = 0, ERR_INVALID_MOVE, ERR_MOVE_TIMEOUT, ERR_MOVE_STALL,
  ERR_TURN_TIMEOUT, ERR_TURN_STALL, ERR_LINE_LOST,
  ERR_JUNCTION_TIMEOUT, ERR_COLOR_SENSOR, ERR_COLOR_MISMATCH, ERR_IOT_TIMEOUT, ERR_WIFI_CONFIG
};

ErrorCode missionError = ERR_NONE;
bool junctionPending = false;
int lastLineError = 0;
int lastLineCmdL = 0;
int lastLineCmdR = 0;
unsigned long lastLineSeenTime = 0;
bool colorSensorReady = false;

static int clampMotor(int v) { return constrain(v, -MAX_MOTOR_SPEED, MAX_MOTOR_SPEED); }
static int signInt(int n) { return (n > 0) - (n < 0); }
static float fminLocal(float a, float b) { return a < b ? a : b; }
static float fmaxLocal(float a, float b) { return a > b ? a : b; }

void failMission(ErrorCode code) {
  if (missionError == ERR_NONE) missionError = code;
  LbMotion.stopAndWait();
  LbRGB.fillColor(CRGB::Red);
  LbRGB.show();
  Serial.print(F("MISSION ERROR: "));
  Serial.println((int)code);
}

void resetMotionState() {
  lastLineCmdL = lastLineCmdR = 0;
  lastLineError = 0;
  lastLineSeenTime = millis();
}
int handAngle = 0;
int handFrom = 0;
int handTarget = 0;
unsigned long handStarted = 0;
bool handBusy = false;

void update_hand() {
  if (!handBusy) return;
  const unsigned long elapsed = millis() - handStarted;
  const float ratio = constrain((float)elapsed / GRIP_MOVE_MS, 0.0f, 1.0f);
  const int angle = handFrom + (int)lroundf((handTarget - handFrom) * ratio);
  if (angle != handAngle) {
    LbGripper.moveToLR(angle, angle, 0);
    handAngle = angle;
  }
  if (elapsed >= GRIP_MOVE_MS + GRIP_SETTLE_MS) handBusy = false;
}
void robot_delay(unsigned long duration) {
  const unsigned long started = millis();
  update_hand();
  while (millis() - started < duration) {
    LbDelay(1);
    update_hand();
  }
}
void close_hand_async(int degree) {
  update_hand();
  handFrom = handAngle;
  handTarget = constrain(degree, -30, 120);
  handStarted = millis();
  handBusy = true;
}
void open_hand_async() { close_hand_async(0); }
void wait_hand() { while (handBusy) robot_delay(1); }
void close_hand(int degree) { close_hand_async(degree); wait_hand(); }
void open_hand() { open_hand_async(); wait_hand(); }

void turn_angle(int speed, float angle_deg, TurnMode mode) {
  if (!isfinite(angle_deg) || speed < TURN_FINISH_SPEED || speed > MAX_MOTOR_SPEED ||
      mode < TWO_WHEELS || mode > RIGHT_ONLY) {
    failMission(ERR_INVALID_MOVE); return;
  }
  if (fabsf(angle_deg) < 0.8f) return;

  LbMotion.stopAndWait();
  resetMotionState();
  const float target = fabsf(angle_deg) * TURN_SCALE[(int)mode] *(mode == TWO_WHEELS ? TURN_TWO_SCALE : TURN_ONE_SCALE);
  const int direction = angle_deg > 0.0f ? 1 : -1;
  const long origin = LbMotion.getRotationDeg();
  unsigned long started = millis(), lastAdvance = started, lastRamp = started;
  float bestProgress = 0.0f;
  int currentSpeed = TURN_FINISH_SPEED;
  int previousSpeed = -1;
  const unsigned long timeoutMs = 3500UL + (unsigned long)(target * 90.0f);

  while (true) {
    const float progress = (float)((long)LbMotion.getRotationDeg() - origin) * direction;
    const float remaining = target - progress;
    if (remaining <= TURN_BRAKE_LEAD_DEG) break;

    const unsigned long now = millis();
    if (progress > bestProgress + 0.5f) { bestProgress = progress; lastAdvance = now; }
    if (now - started > timeoutMs) { failMission(ERR_TURN_TIMEOUT); return; }
    if (now - lastAdvance > 1700UL) { failMission(ERR_TURN_STALL); return; }

    const float ratio = constrain((remaining - TURN_BRAKE_LEAD_DEG) / TURN_SLOW_ZONE, 0.0f, 1.0f);
    int allowedSpeed = TURN_FINISH_SPEED + (int)lroundf((speed - TURN_FINISH_SPEED) * sqrtf(ratio));
    if (currentSpeed > allowedSpeed) currentSpeed = allowedSpeed;
    else if (now - lastRamp >= 12UL) {
      currentSpeed = min(currentSpeed + TURN_ACCEL_INCREMENT, allowedSpeed);
      lastRamp = now;
    }
    if (currentSpeed != previousSpeed) {
      const int v = direction * currentSpeed;
      if (mode == TWO_WHEELS) LbMotion.runLR(v, -v);
      else if (mode == LEFT_ONLY) LbMotion.runLR(v, 0);
      else LbMotion.runLR(0, -v);
      previousSpeed = currentSpeed;
    }
    robot_delay(MOTION_FEEDBACK_MS);
  }
  LbMotion.stopAndWait();
}

void turn_one_wheel(int speed, float angle, const char* info) {
  if (info == nullptr) { failMission(ERR_INVALID_MOVE); return; }
  if (strcmp(info, "L") == 0) turn_angle(speed, -angle, LEFT_ONLY);
  else if (strcmp(info, "R") == 0) turn_angle(speed, angle, RIGHT_ONLY);
  else { failMission(ERR_INVALID_MOVE); return; }
}
void turn_two_wheels(int speed, float angle) {
  turn_angle(speed, angle, TWO_WHEELS);
}

void move_tank(int motor_L, int motor_R, float distance_cm) {
  if (!isfinite(distance_cm) || distance_cm < 0.0f ||
      motor_L == 0 || motor_R == 0 || signInt(motor_L) != signInt(motor_R)) {
    failMission(ERR_INVALID_MOVE); return;
  }
  if (distance_cm == 0.0f) return;
  const float targetMm = distance_cm * 10.0f * DISTANCE_SCALE;
  if (!isfinite(targetMm) || targetMm > 12000.0f) { failMission(ERR_INVALID_MOVE); return; }

  motor_L = clampMotor(motor_L);
  motor_R = clampMotor(motor_R);
  const int direction = signInt(motor_L);
  const int targetL = (int)lroundf(fabsf((float)motor_L) * LEFT_SCALE);
  const int targetR = (int)lroundf(fabsf((float)motor_R) * RIGHT_SCALE);
  const int maxMagnitude = max(targetL, targetR);
  if (maxMagnitude < MOVE_FINISH_SPEED) { failMission(ERR_INVALID_MOVE); return; }

  LbMotion.stopAndWait();
  resetMotionState();
  const float originDist = (float)LbMotion.getDistanceMm();
  const long originRot = LbMotion.getRotationDeg();
  unsigned long started = millis(), lastAdvance = started, lastRamp = started;
  float bestProgress = 0.0f;
  int currentMagnitude = min(MOVE_START_SPEED, maxMagnitude);
  int previousL = 32767, previousR = 32767;
  const unsigned long timeoutMs = 3500UL + (unsigned long)(targetMm * 60.0f);

  while (true) {
    const float progressed = ((float)LbMotion.getDistanceMm() - originDist) * direction;
    const float remaining = targetMm - progressed;
    if (remaining <= MOVE_BRAKE_LEAD_MM) break;
    const unsigned long now = millis();
    if (progressed > bestProgress + 1.0f) { bestProgress = progressed; lastAdvance = now; }
    if (now - started > timeoutMs) { failMission(ERR_MOVE_TIMEOUT); return; }
    if (now - lastAdvance > 1800UL) { failMission(ERR_MOVE_STALL); return; }

    const float ratio = constrain((remaining - MOVE_BRAKE_LEAD_MM) / MOVE_SLOW_ZONE_MM, 0.0f, 1.0f);
    const int allowed = min(maxMagnitude,
      MOVE_FINISH_SPEED + (int)lroundf((maxMagnitude - MOVE_FINISH_SPEED) * ratio));
    if (currentMagnitude > allowed) currentMagnitude = allowed;
    else if (now - lastRamp >= 12UL) {
      currentMagnitude = min(currentMagnitude + MOVE_ACCEL_INCREMENT, allowed);
      lastRamp = now;
    }
    const float magRatio = (float)currentMagnitude / (float)maxMagnitude;
    int vL = direction * (int)lroundf(targetL * magRatio);
    int vR = direction * (int)lroundf(targetR * magRatio);
    const int correction = constrain((int)(HEADING_KP *
      ((long)LbMotion.getRotationDeg() - originRot)), -180, 180);
    vL = clampMotor(vL - correction);
    vR = clampMotor(vR + correction);
    if (vL != previousL || vR != previousR) {
      LbMotion.runLR(vL, vR);
      previousL = vL; previousR = vR;
    }
    robot_delay(MOTION_FEEDBACK_MS);
  }
  LbMotion.stopAndWait();
}

String wifiSsid;
String wifiPassword;
String wifiAssetId;

void declare_wifi(const String &ssid, const String &password, const String &assetId = "") {
  wifiSsid = ssid;
  wifiPassword = password;
  wifiAssetId = assetId;
}

void set_wifi() {
  if (wifiSsid.length() == 0) {
    failMission(ERR_WIFI_CONFIG);
    return;
  }
  LbIoT.Wifi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  if (wifiAssetId.length() > 0) LbIoT.Asset.begin(wifiAssetId.c_str());
}

void set_wifi(const String &ssid, const String &password, const String &assetId = "") {
  declare_wifi(ssid, password, assetId);
  set_wifi();
}

void set_line(int leftOuter, int leftInner, int rightInner, int rightOuter) {
  LbIRLine.setThreshold(leftOuter, leftInner, rightInner, rightOuter);
}

int measure_line() { return LbIRLine.read(); }
void print_line() { Serial.println(measure_line()); }

static int lineErrorForMask(int mask) {
  switch (mask) {
    case 0b1000: return -3;
    case 0b1100: return -2;
    case 0b0100: case 0b1110: return -1;
    case 0b0110: case 0b1111: return 0;
    case 0b0010: case 0b0111: return 1;
    case 0b0011: return 2;
    case 0b0001: return 3;
    default: return lastLineError;
  }
}

static bool lineAvailable(int bits) {
  if (bits != 0) { lastLineSeenTime = millis(); return true; }
  if (millis() - lastLineSeenTime < LINE_LOST_MS) return true;
  failMission(ERR_LINE_LOST);
  return false;
}

static void driveLine(int bits) {
  if (bits != 0) lastLineError = lineErrorForMask(bits);
  const int correction = LINE_KP * lastLineError;
  const int desiredL = constrain(LINE_SPEED + correction, 100, 1250);
  const int desiredR = constrain(LINE_SPEED - correction, 100, 1250);
  lastLineCmdL += constrain(desiredL - lastLineCmdL, -110, 110);
  lastLineCmdR += constrain(desiredR - lastLineCmdR, -110, 110);
  LbMotion.runLR(lastLineCmdL, lastLineCmdR);
}

void runFollowLine(int bits) { if (lineAvailable(bits)) driveLine(bits); }
void runFollowLine() { runFollowLine(LbIRLine.read()); }

static void followLineCore(int distanceMm, bool untilJunction) {
  if (distanceMm < 0) { failMission(ERR_INVALID_MOVE); return; }
  resetMotionState();
  junctionPending = false;
  const float origin = (float)LbMotion.getDistanceMm();
  const unsigned long started = millis();
  const unsigned long timeout = untilJunction ? LINE_JUNCTION_TIMEOUT_MS : LINE_DISTANCE_TIMEOUT_MS;
  bool armed = false;
  int clearFrames = 0, crossingFrames = 0;
  while (true) {
    const float advanced = fabsf((float)LbMotion.getDistanceMm() - origin);
    if (!untilJunction && advanced >= distanceMm) break;
    if (millis() - started > timeout || (untilJunction && advanced > LINE_JUNCTION_LIMIT_MM)) {
      failMission(ERR_JUNCTION_TIMEOUT); return;
    }
    const int bits = LbIRLine.read();
    if (!lineAvailable(bits)) return;
    if (untilJunction) {
      if (!armed) {
        clearFrames = (advanced >= LINE_JUNCTION_SKIP_MM && bits != 0b1111 && bits != 0) ? clearFrames + 1 : 0;
        armed = clearFrames >= 3;
      } else {
        crossingFrames = bits == 0b1111 ? crossingFrames + 1 : 0;
        if (crossingFrames >= 3) { junctionPending = true; break; }
      }
    }
    driveLine(bits);
    LbDelay((unsigned int)LINE_STEP_MS);
  }
  LbMotion.stopAndWait();
  resetMotionState();
}

void followLineDistance(int distanceMm) { followLineCore(distanceMm, false); }
void followLineUntilJunction() { followLineCore(0, true); }
void centerDetectedJunction() {
  if (!junctionPending) return;
  junctionPending = false;
  move_tank(450, 450, JUNCTION_CENTER_MM / 10.0f);
}
void followLineMultipleJunctions(int count) {
  for (int i = 0; i < count; ++i) {
    if (i > 0) centerDetectedJunction();
    followLineUntilJunction();
    if (!junctionPending) return;
  }
}
void goToJunction() {
  if (!junctionPending) followLineUntilJunction();
  centerDetectedJunction();
}

enum ObjectColor { OBJECT_UNKNOWN, OBJECT_RED, OBJECT_GREEN, OBJECT_BLUE };

bool readAPDSUnderLight(CRGB light, int &r, int &g, int &b) {
  LbRGB.fillColor(light); LbRGB.show();
  APDS.colorAvailable(); // Enable sampling before the light-settling delay.
  LbDelay(35);
  const unsigned long started = millis();
  while (!APDS.colorAvailable()) {
    if (millis() - started > 850UL) return false;
    LbDelay(5);
  }
  return APDS.readColor(r, g, b);
}

static ObjectColor classifyColor(int red, int green, int blue) {
  if (red > 3 && red - max(green, blue) >= 2) return OBJECT_RED;
  if (green > 3 && green - max(red, blue) >= 2) return OBJECT_GREEN;
  if (blue > 3 && blue - max(red, green) >= 2) return OBJECT_BLUE;
  return OBJECT_UNKNOWN;
}

ObjectColor readObjectColor(bool &valid) {
  valid = false;
  if (!colorSensorReady) { failMission(ERR_COLOR_SENSOR); return OBJECT_UNKNOWN; }
  const CRGB lights[4] = {CRGB::Red, CRGB::Lime, CRGB::Blue, CRGB::Black};
  // Rows: red/green/blue illumination and ambient; columns: sensor R/G/B.
  int samples[4][3];
  const int saved = LbRGB.getBrightness();
  LbRGB.setBrightness(255);
  bool good = true;
  for (int i = 0; i < 4 && good; ++i) good = readAPDSUnderLight(lights[i], samples[i][0], samples[i][1], samples[i][2]);
  LbRGB.setBrightness(saved);
  if (!good) { failMission(ERR_COLOR_SENSOR); return OBJECT_UNKNOWN; }
  const int red = max(0, samples[0][0] - samples[3][0]);
  const int green = max(0, samples[1][1] - samples[3][1]);
  const int blue = max(0, samples[2][2] - samples[3][2]);
#if DEBUG_SERIAL
  Serial.print(F("Color RGB: ")); Serial.print(red); Serial.print(' ');
  Serial.print(green); Serial.print(' '); Serial.println(blue);
#endif
  valid = true;
  const ObjectColor color = classifyColor(red, green, blue);
  const CRGB colors[4] = {CRGB(50, 50, 50), CRGB::Red, CRGB::Green, CRGB::Blue};
  LbRGB.fillColor(colors[(int)color]); LbRGB.show();
  return color;
}

ObjectColor Obj_detectColor() { bool valid; return readObjectColor(valid); }
void requireColor(ObjectColor expected) {
#if BOARD_MODE != BOARD_PRIMARY
  bool valid;
  const ObjectColor color = readObjectColor(valid);
  if (valid && color != expected) failMission(ERR_COLOR_MISMATCH);
#else
  (void)expected;
#endif
}

void send_iot_color(ObjectColor color) {
  switch (color) {
    case OBJECT_RED:   IoTColor.write("Red"); break;
    case OBJECT_GREEN: IoTColor.write("Green"); break;
    case OBJECT_BLUE:  IoTColor.write("Blue"); break;
    default:          IoTColor.write("Unknown"); break;
  }
}

// FIFO cố định, không cấp phát động trên ATmega328P.
const int IOT_QUEUE_CAPACITY = 16;
ObjectColor iotColorQueue[IOT_QUEUE_CAPACITY];
int iotQueueHead = 0;
int iotQueueSize = 0;
ObjectColor lastQueuedIotColor = OBJECT_UNKNOWN;
bool iotQueueOverflow = false; // Cờ báo đầy, giữ tới khi clear_iot_queue().

int iot_queue_count() { return iotQueueSize; }

void clear_iot_queue() {
  iotQueueHead = 0;
  iotQueueSize = 0;
  iotQueueOverflow = false;
}

ObjectColor peek_iot_color() {
  if (iotQueueSize == 0) return OBJECT_UNKNOWN;
  return iotColorQueue[iotQueueHead];
}

ObjectColor pop_iot_color() {
  const ObjectColor color = peek_iot_color();
  if (iotQueueSize > 0) {
    iotQueueHead = (iotQueueHead + 1) % IOT_QUEUE_CAPACITY;
    --iotQueueSize;
  }
  return color;
}

ObjectColor read_iot_color() {
  String signal = IoTColor.read();
  signal.trim();
  signal.toUpperCase();
  if (signal == "WAITING") lastQueuedIotColor = OBJECT_UNKNOWN;
  ObjectColor color = OBJECT_UNKNOWN;
  if (signal == "RED") color = OBJECT_RED;
  else if (signal == "GREEN") color = OBJECT_GREEN;
  else if (signal == "BLUE") color = OBJECT_BLUE;
  if (color != OBJECT_UNKNOWN && color != lastQueuedIotColor) {
    if (iotQueueSize < IOT_QUEUE_CAPACITY) {
      const int tail = (iotQueueHead + iotQueueSize) % IOT_QUEUE_CAPACITY;
      iotColorQueue[tail] = color;
      ++iotQueueSize;
      lastQueuedIotColor = color;
    } else {
      iotQueueOverflow = true;
    }
  }
  return color;
}

void poll_iot_color() { read_iot_color(); }

void reset_iot_color() { IoTColor.write("waiting"); }

bool wait_iot_color(ObjectColor expected, unsigned long timeoutMs = 30000UL) {
  if (expected != OBJECT_RED && expected != OBJECT_GREEN && expected != OBJECT_BLUE) {
    failMission(ERR_COLOR_MISMATCH);
    return false;
  }
  const unsigned long started = millis();
  while (millis() - started < timeoutMs) {
    const ObjectColor received = read_iot_color();
    const unsigned long elapsed = millis() - started;
    if (elapsed >= timeoutMs) break;
    if (received == expected) return true;
    const unsigned long remaining = timeoutMs - elapsed;
    robot_delay(min(250UL, remaining));
  }
  failMission(ERR_IOT_TIMEOUT);
  return false;
}

/*
KHỞI TẠO / WIFI (đặt trong setup, sau Leanbot.begin):
  declare_wifi("TenWifi", "MatKhau", "AssetID");
  set_wifi();                         Kết nối theo cấu hình đã khai báo.
  set_wifi("TenWifi", "MatKhau", "AssetID");  Khai báo và kết nối một lần.

ĐI VÀ QUAY (speed tối đa 2000; giữ nguyên thuật toán điều khiển):
  move_tank(1800, 1800, 10);            Đi tới 10 cm; dùng hai số âm để lùi.
  Rotate(1800, 90);                    Quay góc +90 độ; góc âm đảo chiều.
  turn_two_wheels(1800, -90);          Quay tại chỗ bằng hai bánh.
  turn_one_wheel(1800, 90, "L");       Chỉ chạy bánh L; "R" chọn bánh R.

LINE (thứ tự cảm biến: 2L, 0L, 1R, 3R):
  set_line(69, 78, 106, 70);            Đặt bốn ngưỡng nhận biết nền đen.
  int line = measure_line();           Đọc mặt nạ 4 bit, giá trị 0..15.
  print_line();                       In mặt nạ; cần Serial.begin(115200).
  runFollowLine();                    Chỉnh hướng một lần, gọi trong vòng lặp.
  followLineDistance(100);             Dò line 100 mm rồi dừng.
  followLineUntilJunction();           Dò tới giao lộ đã được xác nhận rồi dừng.
  followLineMultipleJunctions(2);      Đi qua các giao lộ tới giao lộ thứ hai.
  centerDetectedJunction();           Tiến vào tâm giao lộ vừa phát hiện.
  goToJunction();                     Tìm giao lộ nếu chưa có, sau đó tiến vào tâm.
  measure_line không đo giá trị analog; 0 = không thấy đen, 15 = cả bốn thấy đen.

TAY GẮP:
  close_hand(GRIP_CLOSE_ANGLE);         Đóng tay và đợi xong.
  open_hand();                        Mở tay và đợi xong.
  close_hand_async(GRIP_CLOSE_ANGLE);  Bắt đầu đóng tay, tiếp tục lệnh tiếp theo.
  open_hand_async();                  Bắt đầu mở tay, tiếp tục lệnh tiếp theo.
  wait_hand();                        Đợi tay xong trước khi kết thúc nhiệm vụ.
  robot_delay(500);                   Đợi 500 ms và cập nhật tay đang chạy.
  update_hand();                      Cập nhật tay trong vòng lặp tự viết.
  Không xen lệnh LbGripper trực tiếp khi dùng bộ điều khiển tay async.

CẢM BIẾN MÀU:
  ObjectColor color = Obj_detectColor();  Đọc màu khối bằng APDS.
  readObjectColor(valid);             Đọc màu và trả cờ valid qua biến bool.
  requireColor(OBJECT_BLUE);           Kiểm tra màu; báo lỗi nếu không đúng.
  Màu: OBJECT_RED, OBJECT_GREEN, OBJECT_BLUE, OBJECT_UNKNOWN.
  Cảm biến cần APDS.begin thành công; requireColor được bỏ qua trên BOARD_PRIMARY.

TÍN HIỆU MÀU GIỮA CÁC ROBOT IOT:
  Cả hai robot cần WiFi và cùng Asset ID / thuộc tính Color được phép truy cập.
  reset_iot_color();                  Robot gửi xóa tín hiệu cũ trước lượt mới.
  send_iot_color(OBJECT_BLUE);         Robot gửi ghi tín hiệu Blue lên máy chủ.
  ObjectColor color = read_iot_color();  Đọc màu và tự đưa màu mới vào hàng chờ.
  if (!wait_iot_color(OBJECT_BLUE, 30000UL)) return;
                                      Robot nhận đợi tối đa 30 giây, lỗi thì thoát.

HÀNG CHỜ TÍN HIỆU (FIFO, tối đa 16 màu):
  poll_iot_color();                    Đọc mạng một lần, đưa màu mới vào hàng chờ.
  iot_queue_count();                   Số tín hiệu chưa xử lý.
  peek_iot_color();                    Xem tín hiệu đầu, chưa lấy ra.
  ObjectColor next = pop_iot_color();  Lấy tín hiệu cũ nhất; UNKNOWN nếu rỗng.
  clear_iot_queue();                   Xóa hàng chờ và cờ đầy, giữ bộ lọc nhận trùng.
  iotQueueOverflow                    true khi hàng chờ từng bị đầy; không ghi đè.

  Ví dụ vòng điều phối của robot nhận (sau khi kết nối WiFi):
    poll_iot_color();
    if (iot_queue_count() > 0) {
      ObjectColor next = pop_iot_color();
      // Xử lý nhiệm vụ theo next ở đây.
    }
    robot_delay(250);

  Cùng một màu lưu trên server chỉ được xếp hàng một lần. Muốn gửi lại cùng màu,
  robot nhận phải đọc được trạng thái waiting giữa hai lần gửi.
  wait_iot_color cũng đọc và xếp hàng; không tự lấy màu khỏi hàng chờ.
  Chỉ nhận khi gọi poll/read/wait; không có luồng mạng chạy nền trong lúc di chuyển.
  Thuộc tính Color chỉ lưu màu cuối: các màu bị ghi đè giữa hai lần đọc có thể mất.
  Hàng chờ giữ các tín hiệu đã đọc, không đảm bảo giao nhận từng gói qua mạng.
*/

void setup() {
  Leanbot.begin();

}

void loop() {
 
  LbMission.begin(TB1A + TB1B);
  
  LbMission.end();
}



