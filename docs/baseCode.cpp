#include <Leanbot.h>
#include <stdint.h>
#include <math.h>
#include <string.h>
#include <LeanbotIoT.h>
#include <Arduino_APDS9960.h>

// Kiểu dữ liệu và khai báo
struct LbmbState {
  uint32_t timeMs;
  int32_t distanceMm;
  int32_t rotationDeg;
  uint8_t lineState;
  int16_t ir2L;
  int16_t ir0L;
  int16_t ir1R;
  int16_t ir3R;
};

struct LbmbCommand {
  int16_t leftSpeed;
  int16_t rightSpeed;
  bool isDone;
};

struct LbmbFollowCtx {
  int32_t startDist;
  uint32_t startTime;
  uint32_t lastTime;
  uint32_t lastValidTime;
  uint32_t lastProgressTime;
  int32_t maxProgress;

  float baseSpeed;
  float baseAccel;

  float prevError;
  float filteredDerivative;
  float integral;

  int16_t outLeft;
  int16_t outRight;

  bool hasValidError;
  bool lineLocked;
  bool sharpTurn;
  uint8_t centeredCount;
  uint8_t markerCount;
  bool initialized;
};

inline void lbmbFollowCoreInit(LbmbFollowCtx* ctx, const LbmbState* state);
inline LbmbCommand lbmbFollowCoreStep(LbmbFollowCtx* ctx, const LbmbState* state,
  float speedPercent, uint8_t mode, float targetVal);
inline LbmbState lbmbReadState();

enum ObjectColor { UNKNOWN, RED, GREEN, BLUE, YELLOW, PURPLE };
static ObjectColor classifyColor(int red, int green, int blue);
ObjectColor lastMeasuredColor = UNKNOWN;
// Ba API màu: đọc khối, gửi màu, nhận màu. UNKNOWN là chưa xác định/không có tín hiệu.
ObjectColor read_color();
void send_iot_color(ObjectColor color = lastMeasuredColor, uint8_t numberObject = 1);
ObjectColor read_iot_color(unsigned long timeoutMs = 0UL, uint8_t numberObject = 1);
void measure_line_values();
void reset_mission();
static bool check_mission_reset();




// Chờ một chu kỳ tích phân mới sau đổi LED; hiệu chỉnh nếu đổi ATIME của APDS.
const unsigned long COLOR_EXPOSURE_MS = 35UL;
const unsigned long COLOR_READY_TIMEOUT_MS = 850UL;
const int COLOR_MIN_CHANNEL = 4;
const float COLOR_MIN_SATURATION = 0.20f;
const float COLOR_RED_YELLOW_HUE = 25.0f;
const float COLOR_YELLOW_GREEN_HUE = 80.0f;
const float COLOR_GREEN_BLUE_HUE = 170.0f;
const float COLOR_BLUE_PURPLE_HUE = 250.0f;
const float COLOR_PURPLE_RED_HUE = 345.0f;
float colorRedGain = 1.0f;
float colorGreenGain = 1.0f;
float colorBlueGain = 1.0f;

float colorReference[6][3];
bool colorReferenceReady[6] = {false, false, false, false, false, false};
const float COLOR_REFERENCE_MAX_DISTANCE = 0.004f;
const float COLOR_REFERENCE_MARGIN = 0.00005f;


// Hiệu chỉnh thông số
const float DISTANCE_SCALE = 1.00625f;
const float LEFT_SCALE = 1.0f;
const float RIGHT_SCALE = 1.0f;
const float TURN_ONE_SCALE = 1.0f;
const float TURN_TWO_SCALE = 1.0f;
enum TurnMode { TWO_WHEELS, LEFT_ONLY, RIGHT_ONLY };
const float TURN_SCALE[3] = {1.0f, 1.0f, 1.0f};

const int MAX_MOTOR_SPEED = 2000;
const int MOVE_START_SPEED = 165;
const int MOVE_FINISH_SPEED = 165;
const float MOVE_ACCEL = 22000.0f;
const float MOVE_DECEL = 2600.0f;  
const float MOVE_MM_PER_STEP = 65.0f * DISTANCE_SCALE / MAX_MOTOR_SPEED;
const float MOVE_HEADING_KP = 25.0f; //phản ứng theo lệch hướng hiện tại -> lệch thì tăng
const float MOVE_HEADING_KI = 6.0f; // Tích lũy lệch hướng, giảm nếu bị giật
const float MOVE_HEADING_KD = 1.5f; // Điều chỉnh dựa trên tốc độ thay đổi lệch hướng -> lệch nhanh thì tăng, lệch chậm thì giảm.

const int TURN_FINISH_SPEED = 120;
const float TURN_SLOW_ZONE = 35.0f; // Giảm tốc sớm để hạn chế vượt góc.
const float TURN_BRAKE_LEAD_DEG = 0.5f; // Sai số dừng theo phản hồi, không phải bảo đảm góc vật lý.
const int TURN_ACCEL_INCREMENT = 72;
const float TURN_PRECISION_SPEED_PER_DEG = 40.0f; // Giữ tốc độ thấp ở các độ cuối.
const unsigned long TURN_RAMP_MS = 10UL;
const unsigned long MOTION_FEEDBACK_MS = 1UL;

const int LINE_SPEED = 2000; 

const int LINE_STEERING_SIGN = 1;
const unsigned long LINE_STEP_MS = 10UL;
const float JUNCTION_CENTER_MM = 20.0f;

const int IR_TH_2L = 69;
const int IR_TH_0L = 145;
const int IR_TH_1R = 130;
const int IR_TH_3R = 60;

const int GRIP_CLOSE_ANGLE = 50;
const int GRIP_MOVE_MS = 750;
const int GRIP_SETTLE_MS = 120;

const uint16_t LBMB_TICK_MS = 10;
const int16_t LBMB_START_SPEED = 200;
const int16_t LBMB_SEARCH_SPEED_MAX = 650;
const int16_t LBMB_ACQUIRE_SPEED_MAX = 600;
const int16_t LBMB_CURVE_SPEED_MAX = 1000;
// Đạt tốc độ đoạn thẳng sớm hơn; giữ giới hạn cua và phanh cuối đoạn.
const float LBMB_FLL_ACCEL = 6500.0f;
const float LBMB_FLL_DECEL = 6500.0f;
const float LBMB_FLL_JERK = 60000.0f;
const int32_t LBMB_WHEEL_ACCEL = 12000;
const int32_t LBMB_WHEEL_DECEL = 15000;
const float LBMB_FLL_KP = 900.0f;
const float LBMB_FLL_KI = 110.0f;
const float LBMB_FLL_KD = 6.0f;
const float LBMB_FLL_MAX_I = 0.60f;
const float LBMB_FLL_D_ALPHA = 0.22f;
const float LBMB_FLL_MAX_STEER_RATIO = 0.92f;
const float LBMB_FLL_ERROR_SLOWDOWN = 0.48f;
const float LBMB_FLL_D_SLOWDOWN = 0.010f;
const float LBMB_FLL_MIN_FACTOR = 0.42f;

enum ErrorCode {
  ERR_NONE = 0, ERR_INVALID_MOVE, ERR_MOVE_TIMEOUT, ERR_MOVE_STALL,
  ERR_TURN_TIMEOUT, ERR_TURN_STALL, ERR_LINE_LOST,
  ERR_JUNCTION_TIMEOUT, ERR_COLOR_SENSOR, ERR_COLOR_MISMATCH, ERR_IOT_TIMEOUT, ERR_WIFI_CONFIG,
  ERR_IOT_ATTRIBUTE
};

ErrorCode missionError = ERR_NONE;
bool junctionPending = false;
float lastLineError = 0.0f;
unsigned long lastLineControlTime = 0;
bool lineControlReady = false;
bool colorSensorReady = false;
bool missionResetRequested = false;
bool resetTouchActive = false;
unsigned long resetTouchStarted = 0;
bool missionArmed = false;
byte missionButtons = 0;
unsigned long missionButtonChangedAt = 0;

static int clampMotor(int v) { return constrain(v, -MAX_MOTOR_SPEED, MAX_MOTOR_SPEED); }
static int signInt(int n) { return (n > 0) - (n < 0); }

void failMission(ErrorCode code) {
  if (missionResetRequested) return;
  if (missionError == ERR_NONE) missionError = code;
  LbMotion.stopAndWait();
  Serial.print(F("MISSION ERROR: "));
  Serial.println(code);
}

void resetMotionState() {
  lastLineError = 0;
  lineControlReady = false;
  lastLineControlTime = millis();
}
// Tay gắp đồng thời
int handAngle = 0;
int handFrom = 0;
int handTarget = 0;
unsigned long handStarted = 0;
int handDuration = GRIP_MOVE_MS;
bool handBusy = false;

void update_hand() {
  if (!handBusy) return;
  const signed long elapsed = millis() - handStarted;
  const long step = (long)(handTarget - handFrom) * (long)min(elapsed, (unsigned long)handDuration);
  const int angle = handFrom + (int)((step + (step >= 0 ? handDuration / 2 : -handDuration / 2)) / handDuration);
  if (angle != handAngle) {
    LbGripper.moveToLR(angle, angle, 0);
    handAngle = angle;
  }
  if (elapsed >=( handDuration + GRIP_SETTLE_MS)) handBusy = false;
}
void robot_delay(unsigned long duration) {
  const unsigned long started = millis();
  update_hand();
  while (millis() - started < duration) {
    if (check_mission_reset()) { LbDelay(1); return; }
    LbDelay(1);
    update_hand();
  }
}
void close_hand_async(int degree) {
  if (check_mission_reset()) return;
  update_hand();
  const int target = constrain(degree, -30, 120);
  if (target == (handBusy ? handTarget : handAngle)) return;
  handFrom = handAngle;
  handTarget = target;
  // Góc nhỏ dùng thời gian tương ứng; giữ tốc độ của hành trình gắp chuẩn.
  const int span = max(1, GRIP_CLOSE_ANGLE);
  handDuration = constrain((int)(((long)GRIP_MOVE_MS * abs(target - handFrom) + span / 2) / span), 1, GRIP_MOVE_MS);
  handStarted = millis();
  handBusy = true;
}
void open_hand_async() { close_hand_async(0); }
void wait_hand() { while (handBusy) robot_delay(1); }
void close_hand(int degree) { close_hand_async(degree); wait_hand(); }
void open_hand() { open_hand_async(); wait_hand(); }

// Đi và quay có phản hồi
void turn_angle(int speed, float angle_deg, TurnMode mode) {
  if (missionError != ERR_NONE) { LbMotion.stopAndWait(); return; }
  if (check_mission_reset()) return;
  if (!isfinite(angle_deg) || speed < TURN_FINISH_SPEED || speed > MAX_MOTOR_SPEED ||
      mode < TWO_WHEELS || mode > RIGHT_ONLY) {
    failMission(ERR_INVALID_MOVE); return;
  }
  if (fabsf(angle_deg) < 0.8f) return;
  LbMotion.stopAndWait();
  resetMotionState();
  speed = min(speed, 2000);
  const float target = fabsf(angle_deg) * TURN_SCALE[(int)mode] *(mode == TWO_WHEELS ? TURN_TWO_SCALE : TURN_ONE_SCALE);
  const int direction = angle_deg > 0.0f ? 1 : -1;
  const auto origin = LbMotion.getRotationDeg();
  unsigned long started = millis(), lastAdvance = started, lastRamp = started;
  float bestProgress = 0.0f;
  int currentSpeed = TURN_FINISH_SPEED;
  int previousSpeed = -1;
  const unsigned long timeoutMs = 3500UL + (unsigned long)(target * 90.0f);
  while (true) {
    if (check_mission_reset()) return;
    const float progress = (float)(LbMotion.getRotationDeg() - origin) * direction;
    const float remaining = target - progress;
    if (remaining <= TURN_BRAKE_LEAD_DEG) break;
    const unsigned long now = millis();
    if (progress > bestProgress + 0.5f) { bestProgress = progress; lastAdvance = now; }
    if (now - started > timeoutMs) { failMission(ERR_TURN_TIMEOUT); return; }
    if (now - lastAdvance > 1700UL) { failMission(ERR_TURN_STALL); return; }
    const float ratio = constrain((remaining - TURN_BRAKE_LEAD_DEG) / TURN_SLOW_ZONE, 0.0f, 1.0f);
    const int fastLimit = TURN_FINISH_SPEED + (int)lroundf((speed - TURN_FINISH_SPEED) * sqrtf(ratio));
    const int precisionLimit = TURN_FINISH_SPEED + (int)lroundf(
      max(0.0f, remaining - TURN_BRAKE_LEAD_DEG) * TURN_PRECISION_SPEED_PER_DEG);
    const int allowedSpeed = min(speed, min(fastLimit, precisionLimit));
    if (currentSpeed > allowedSpeed) currentSpeed = allowedSpeed;
    else if (now - lastRamp >= TURN_RAMP_MS) {
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

// Chỉ trả quyền cho lệnh kế tiếp sau khi phản hồi bánh đã ổn định.
static bool stopOnDetectedLine() {
  LbMotion.runLR(0, 0);
  long distance = LbMotion.getDistanceMm();
  long rotation = LbMotion.getRotationDeg();
  const unsigned long started = millis();
  unsigned long stableSince = started;
  while (millis() - started < 1200UL) {
    if (check_mission_reset()) return false;
    robot_delay(10);
    if (check_mission_reset()) return false;
    LbMotion.runLR(0, 0);
    const long nextDistance = LbMotion.getDistanceMm();
    const long nextRotation = LbMotion.getRotationDeg();
    if (nextDistance != distance || nextRotation != rotation) {
      distance = nextDistance; rotation = nextRotation;
      stableSince = millis();
    }
    if (millis() - stableSince >= 150UL) {
      resetMotionState();
      return true;
    }
  }
  failMission(ERR_MOVE_STALL);
  return false;
}

static bool moveTankCore(int motor_L, int motor_R, float distance_cm, bool untilLine) {
  if (missionError != ERR_NONE) { LbMotion.stopAndWait(); return false; }
  if (check_mission_reset()) return false;
  if (!isfinite(distance_cm) || distance_cm < 0.0f ||
      motor_L == 0 || motor_R == 0 || signInt(motor_L) != signInt(motor_R)) {
    failMission(ERR_INVALID_MOVE); return false;
  }
  if (distance_cm == 0.0f) return false;
  const float targetMm = distance_cm * 10.0f * DISTANCE_SCALE;
  if (!isfinite(targetMm) || targetMm > 12000.0f) { failMission(ERR_INVALID_MOVE); return false; }
  // Tìm vạch cần dừng ngay: tránh lao qua vạch khi nối lệnh ở tốc độ cao.
  const int speedLimit = untilLine ? 350 : MAX_MOTOR_SPEED;
  motor_L = constrain(motor_L, -speedLimit, speedLimit);
  motor_R = constrain(motor_R, -speedLimit, speedLimit);
  const int direction = signInt(motor_L);
  const int targetL = (int)lroundf(fabsf((float)motor_L) * LEFT_SCALE);
  const int targetR = (int)lroundf(fabsf((float)motor_R) * RIGHT_SCALE);
  const int maxMagnitude = max(targetL, targetR);
  if (maxMagnitude < MOVE_FINISH_SPEED) { failMission(ERR_INVALID_MOVE); return false; }
  LbMotion.stopAndWait();
  if (untilLine) {
    // Đợi cơ cấu ổn định sau đi/quay trước khi lấy mốc riêng cho lượt tìm.
    robot_delay(30);
    if (check_mission_reset()) return false;
  }
  resetMotionState();
  const auto originDist = LbMotion.getDistanceMm();
  const auto originRot = LbMotion.getRotationDeg();
  unsigned long started = millis(), lastAdvance = started, lastControl = started;
  float bestProgress = 0.0f;
  float currentMagnitude = min(MOVE_START_SPEED, maxMagnitude);
  float integral = 0.0f, previousError = 0.0f, derivative = 0.0f;
  int previousL = 32767, previousR = 32767;
  unsigned long lastLineSample = started;
  bool sampledLine = false;
  LbmbState searchState = {};
  const unsigned long timeoutMs = 3500UL + (unsigned long)(targetMm * 60.0f);
  while (true) {
    if (check_mission_reset()) return false;
    const float progressed = (float)(LbMotion.getDistanceMm() - originDist) * direction;
    const float remaining = targetMm - progressed;
    if (untilLine && (!sampledLine || millis() - lastLineSample >= LBMB_TICK_MS || remaining <= 0.0f)) {
      // Chung luồng SDK và chu kỳ lấy mẫu với hàm dò line đang hoạt động.
      searchState = lbmbReadState();
      lastLineSample = millis();
      sampledLine = true;
      if ((searchState.lineState & 0x0F) != 0) {
        return stopOnDetectedLine();
      }
    }
    if (remaining <= 0.0f) break;
    const unsigned long now = millis();
    if (progressed > bestProgress + 1.0f) { bestProgress = progressed; lastAdvance = now; }
    if (now - started > timeoutMs) { failMission(ERR_MOVE_TIMEOUT); return false; }
    if (now - lastAdvance > 1800UL) { failMission(ERR_MOVE_STALL); return false; }
    const float dt = min((now - lastControl) * 0.001f, 0.05f);
    lastControl = now;
    const float brakeSpeed = sqrtf((float)MOVE_FINISH_SPEED * MOVE_FINISH_SPEED +
      2.0f * MOVE_DECEL * (remaining - 0.0f) / MOVE_MM_PER_STEP);
    const float allowed = min((float)maxMagnitude, brakeSpeed);
    if (currentMagnitude < allowed) {
      currentMagnitude = min(currentMagnitude + MOVE_ACCEL * dt, allowed);
    } else {
      currentMagnitude = max(currentMagnitude - MOVE_DECEL * dt, allowed);
    }
    const float magRatio = (float)currentMagnitude / (float)maxMagnitude;
    const float baseL = targetL * magRatio, baseR = targetR * magRatio;

    // PID giữ hướng ban đầu, đúng dấu khi tiến/lùi; không đảo bánh gần đích.
    const float error = (float)(LbMotion.getRotationDeg() - originRot);
    if (dt > 0.0f) {
      derivative += dt / (0.05f + dt) *
        ((error - previousError) / dt - derivative);
    }
    previousError = error;
    const float limit = min(300.0f, min(baseL, baseR) * 0.8f);
    const float candidateI = constrain(integral + error * dt,
      -30.0f, 30.0f);
    const float candidate = MOVE_HEADING_KP * error + MOVE_HEADING_KI * candidateI +
      MOVE_HEADING_KD * derivative;
    // Chỉ tích lũy khi còn khả năng sửa, hoặc khi sai số giúp thoát bão hòa.
    if ((candidate >= -limit && candidate <= limit) ||
        (candidate > limit && error < 0.0f) || (candidate < -limit && error > 0.0f)) {
      integral = candidateI;
    }
    const float correction = constrain(MOVE_HEADING_KP * error + MOVE_HEADING_KI * integral +
      MOVE_HEADING_KD * derivative, -limit, limit);
    float left = direction * baseL - correction;
    float right = direction * baseR + correction;
    // Giữ tỷ lệ lệnh sửa hướng khi một bánh chạm trần 2000.
    const float peak = max(fabsf(left), fabsf(right));
    if (peak > speedLimit) {
      left *= speedLimit / peak;
      right *= speedLimit / peak;
    }
    const int vL = clampMotor((int)lroundf(left));
    const int vR = clampMotor((int)lroundf(right));
    if (vL != previousL || vR != previousR) {
      LbMotion.runLR(vL, vR);
      previousL = vL; previousR = vR;
    }
    robot_delay(MOTION_FEEDBACK_MS);
  }
  LbMotion.stopAndWait();
  if (untilLine) {
    failMission(ERR_LINE_LOST); return false;
  }
  return true;
}

// Đi đủ quãng đường (cm), giữ API cũ.
void move_tank(int motor_L, int motor_R, float distance_cm) {
  moveTankCore(motor_L, motor_R, distance_cm, false);
}

// Đi mù tới khi bất kỳ cảm biến nào thấy đen, rồi dừng bánh.
// speed: 165..2000; maxDistanceCm: quãng đường tìm tối đa, không phải độ rộng line.
void moveUntilLine(int speed = 600, float maxDistanceCm = 100.0f) {
  if (speed < MOVE_FINISH_SPEED || speed > MAX_MOTOR_SPEED ||
      !isfinite(maxDistanceCm) || maxDistanceCm <= 0.0f) {
    failMission(ERR_INVALID_MOVE); return;
  }
  junctionPending = false; // Không mang giao lộ của lệnh dò line trước sang lượt tìm mới.
  moveTankCore(speed, speed, maxDistanceCm, true);
}

// Kết nối WiFi
String wifiSsid;
String wifiPassword;
const __FlashStringHelper *wifiAssetId = nullptr;
// Cờ cấu hình SDK, không phải xác nhận trạng thái online từ phần cứng.
bool iotConfigured = false;

void declare_wifi(const String &ssid, const String &password, const __FlashStringHelper *assetId = nullptr) {
  wifiSsid = ssid;
  wifiPassword = password;
  wifiAssetId = assetId;
  iotConfigured = false;
}

void set_wifi() {
  iotConfigured = false;
  if (wifiSsid.length() == 0 || wifiAssetId == nullptr) {
    failMission(ERR_WIFI_CONFIG); return;
  }
  LbIoT.Wifi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  LbIoT.Asset.begin(wifiAssetId);
  iotConfigured = true;
}

void set_wifi(const String &ssid, const String &password, const __FlashStringHelper *assetId = nullptr) {
  declare_wifi(ssid, password, assetId);
  set_wifi();
}

void set_line(int leftOuter, int leftInner, int rightInner, int rightOuter) {
  LbIRLine.setThreshold(leftOuter, leftInner, rightInner, rightOuter);
}

int measure_line() {
  LbIRLine.read(); 
  return (int)LbIRLine.value() & 0x0F; 
}
void print_line() { Serial.println(measure_line()); }

// ADC tức thời và mask của SDK; đây không phải giá trị ngưỡng sau hiệu chuẩn.
void measure_line_values() {
  Serial.print(F("IR ADC 2L/0L/1R/3R: "));
  Serial.print(LbIRArray.read(ir2L)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir0L)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir1R)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir3R));
  Serial.print(F(" | mask: ")); Serial.println(measure_line());
}

void calibrate_line() {
  if (check_mission_reset()) return;
  LbMotion.stopAndWait();
  wait_hand();
  resetMotionState();
  junctionPending = false;
  LbIRLine.doManualCalibration(TB1A);
  if (check_mission_reset()) return;
  resetMotionState();
}


inline int32_t lbmbAbs32(int32_t x) { return x < 0 ? -x : x; }
inline float lbmbAbsF(float x) { return x < 0.0f ? -x : x; }

inline int16_t lbmbMin16(int16_t a, int16_t b) { return a < b ? a : b; }
inline int16_t lbmbMax16(int16_t a, int16_t b) { return a > b ? a : b; }

inline int16_t lbmbClamp16(int32_t val, int16_t minVal, int16_t maxVal) {
  if (val < minVal) return minVal;
  if (val > maxVal) return maxVal;
  return (int16_t)val;
}

inline int32_t lbmbMin32(int32_t a, int32_t b) { return a < b ? a : b; }
inline int32_t lbmbMax32(int32_t a, int32_t b) { return a > b ? a : b; }

inline float lbmbClampF(float val, float minVal, float maxVal) {
  if (val < minVal) return minVal;
  if (val > maxVal) return maxVal;
  return val;
}

inline float lbmbDtSec(uint32_t now, uint32_t before) {
  uint32_t dtMs = now - before;
  if (dtMs < 2) dtMs = 2;
  if (dtMs > 50) dtMs = 50;
  return (float)dtMs * 0.001f;
}

inline int16_t lbmbTargetSpeedFromPercent(float speedPercent) {
  float mag = fabs(speedPercent);
  if (mag > 100.0f) mag = 100.0f;
  int32_t s = (int32_t)lroundf(mag * 20.0f);
  if (s < 20) s = 20;
  if (s > ((int16_t)2000)) s = ((int16_t)2000);
  return (int16_t)s;
}

inline int16_t lbmbInitialSpeed(int16_t targetSpeed) {
  return lbmbMin16(targetSpeed, LBMB_START_SPEED);
}

inline int16_t lbmbWheelSlew(
  int16_t current,
  int16_t target,
  uint32_t dtMs
) {
  if (dtMs < 1) dtMs = 1;
  if (dtMs > 50) dtMs = 50;

  bool reversing = (current > 0 && target < 0) || (current < 0 && target > 0);
  bool accelerating = !reversing && lbmbAbs32(target) > lbmbAbs32(current);
  int32_t rate = accelerating ? LBMB_WHEEL_ACCEL : LBMB_WHEEL_DECEL;
  int32_t delta = rate * (int32_t)dtMs / 1000;
  if (delta < 1) delta = 1;

  if (target > current) return (int16_t)lbmbMin32((int32_t)current + delta, target);
  if (target < current) return (int16_t)lbmbMax32((int32_t)current - delta, target);
  return current;
}

// Jerk-limited profile used by Move, Turn and FLL base speed.
inline float lbmbProfileStep(
  float* speed,
  float* accel,
  float targetSpeed,
  float maxAccel,
  float maxDecel,
  float maxJerk,
  float dt
) {
  targetSpeed = lbmbClampF(targetSpeed, 0.0f, (float)((int16_t)2000));

  float error = targetSpeed - *speed;
  if (lbmbAbsF(error) < 0.5f) {
    *speed = targetSpeed;
    *accel = 0.0f;
    return *speed;
  }

  float desiredAccel = error > 0.0f ? maxAccel : -maxDecel;

  float maxDeltaAccel = maxJerk * dt;
  float accelDelta = desiredAccel - *accel;
  accelDelta = lbmbClampF(accelDelta, -maxDeltaAccel, maxDeltaAccel);
  *accel += accelDelta;

  float next = *speed + (*accel * dt);

  // Never cross the requested envelope.
  if ((error > 0.0f && next >= targetSpeed) || (error < 0.0f && next <= targetSpeed)) {
    next = targetSpeed;
    *accel = 0.0f;
  }
  if (next < 0.0f) {  next = 0.0f;  *accel = 0.0f; }
  if (next > ((int16_t)2000)) { next = ((int16_t)2000); *accel = 0.0f; }
  *speed = next;
  return next;
}

inline int32_t lbmbMoveBrakeMm(int16_t targetSpeed) {
  // Empirical envelope expressed in Leanbot's own mm odometry.
  int32_t mm = targetSpeed / 40 + 10;
  if (mm < 15) mm = 15;
  if (mm > 60) mm = 60;
  return mm;
}

inline float lbmbBrakeEnvelope(  int32_t remaining,  int32_t brakeZone, int16_t targetSpeed) {
  int16_t minSpeed = lbmbInitialSpeed(targetSpeed);
  if (remaining >= brakeZone || brakeZone <= 0) return targetSpeed;

  float f = (float)remaining / (float)brakeZone;
  f = lbmbClampF(f, 0.0f, 1.0f);

  float shaped = sqrtf(f);
  return (float)minSpeed + ((float)targetSpeed - minSpeed) * shaped;
}

inline bool lbmbIsLineValid(uint8_t state) {
  return (state & 0x0F) != 0;
}

inline int16_t lbmbDiscreteLineError1000(uint8_t state, int16_t prevError1000) {
  switch (state) {
    case 0b1000: return -3000;
    case 0b1100: return -2000;
    case 0b0100:
    case 0b1110: return -1000;
    case 0b0110:
    case 0b1111: return 0;
    case 0b0010:
    case 0b0111: return 1000;
    case 0b0011: return 2000;
    case 0b0001: return 3000;
    default: return prevError1000;
  }
}

inline int16_t lbmbLinePosition1000(const LbmbState* state, int16_t fallbackError1000) {
  uint8_t mask = state->lineState & 0x0F;
  if (mask == 0) return fallbackError1000;
  if (mask == 0x0F) return 0; // Cross a wide black marker straight.
  if (mask == 0b1001) return fallbackError1000; // Ambiguous outer branches.
  int32_t v2 = state->ir2L;
  int32_t v0 = state->ir0L;
  int32_t v1 = state->ir1R;
  int32_t v3 = state->ir3R;

  int32_t floorValue = lbmbMin32(lbmbMin32(lbmbMin32(v2, v0), v1), v3);

  int32_t w2 = v2 - floorValue;
  int32_t w0 = v0 - floorValue;
  int32_t w1 = v1 - floorValue;
  int32_t w3 = v3 - floorValue;

  if (w2 < 0 || !(mask & 0b1000)) w2 = 0;
  if (w0 < 0 || !(mask & 0b0100)) w0 = 0;
  if (w1 < 0 || !(mask & 0b0010)) w1 = 0;
  if (w3 < 0 || !(mask & 0b0001)) w3 = 0;

  int32_t sum = w2 + w0 + w1 + w3;
  if (sum < ((int32_t)24)) {
    return lbmbDiscreteLineError1000(state->lineState, fallbackError1000);
  }

  int32_t weighted =
      (-3000L * w2) +
      (-1000L * w0) +
      ( 1000L * w1) +
      ( 3000L * w3);

  return lbmbClamp16(weighted / sum, -3000, 3000);
}

inline bool lbmbCheckMarker(uint8_t state, uint8_t mode) {
  if (mode == 1) return (state & 0b1100) == 0b1100 && (state & 0b0001) == 0;
  if (mode == 2) return (state & 0b0011) == 0b0011 && (state & 0b1000) == 0;
  if (mode == 3) return state == 0b1111;
  return false;
}

inline void lbmbFollowCoreInit(LbmbFollowCtx* ctx, const LbmbState* state) {
  ctx->startDist = state->distanceMm;
  ctx->startTime = state->timeMs;
  ctx->lastTime = state->timeMs;
  ctx->lastValidTime = state->timeMs;
  ctx->lastProgressTime = state->timeMs;
  ctx->maxProgress = 0;

  ctx->baseSpeed = 0.0f;
  ctx->baseAccel = 0.0f;

  ctx->prevError = 0.0f;
  ctx->filteredDerivative = 0.0f;
  ctx->integral = 0.0f;

  ctx->outLeft = 0;
  ctx->outRight = 0;

  ctx->hasValidError = false;
  ctx->lineLocked = false;
  ctx->sharpTurn = false;
  ctx->centeredCount = 0;
  ctx->markerCount = 0;
  ctx->initialized = true;
}

inline LbmbCommand lbmbFollowCoreStep(
  LbmbFollowCtx* ctx,
  const LbmbState* state,
  float speedPercent,
  uint8_t mode,
  float targetVal
) {
  LbmbCommand cmd = {0, 0, true};

  if (isnan(speedPercent) || speedPercent <= 0.0f) return cmd;

  int16_t targetSpeed = lbmbTargetSpeedFromPercent(speedPercent);
  uint32_t elapsedOverall = state->timeMs - ctx->startTime;

  if (elapsedOverall >= ((uint32_t)600000UL)) return cmd;

  int32_t targetMm = 0;
  uint32_t targetMs = 0;

  if (mode == 4) {
    if (targetVal <= 0.0f || isnan(targetVal)) return cmd;
    targetMm = (int32_t)lroundf(targetVal * 10.0f);
  } else if (mode == 5) {
    if (targetVal <= 0.0f || isnan(targetVal)) return cmd;
    targetMs = (uint32_t)lroundf(targetVal * 1000.0f);
  }

  // Marker stop modes.
  if (mode <= 3) {
    if (lbmbCheckMarker(state->lineState, mode)) {
      if (ctx->markerCount < 255) ctx->markerCount++;
      if (ctx->markerCount >= 3) return cmd;
    } else {
      ctx->markerCount = 0;
    }

    if (elapsedOverall >= ((uint32_t)60000UL)) return cmd;
  }

  // Distance stop mode.
  int32_t distanceProgress = lbmbAbs32(state->distanceMm - ctx->startDist);
  if (mode == 4) {
    if (distanceProgress > ctx->maxProgress) {
      ctx->maxProgress = distanceProgress;
      ctx->lastProgressTime = state->timeMs;
    }

    if (distanceProgress >= targetMm) return cmd;
    // A recovery pivot has no forward distance; do not mistake it for a stall.
    if (!lbmbIsLineValid(state->lineState)) ctx->lastProgressTime = state->timeMs;
    if (state->timeMs - ctx->lastProgressTime >= ((uint32_t)900)) return cmd;
  }

  // Time stop mode.
  if (mode == 5 && elapsedOverall >= targetMs) return cmd;

  bool lineValid = lbmbIsLineValid(state->lineState);
  if (lineValid) {
    ctx->lastValidTime = state->timeMs;
  }

  uint32_t lostLimit = ctx->hasValidError ? ((uint32_t)2500) : ((uint32_t)3500);
  if (state->timeMs - ctx->lastValidTime >= lostLimit) {
    return cmd;
  }

  float dt = lbmbDtSec(state->timeMs, ctx->lastTime);
  uint32_t dtMs = state->timeMs - ctx->lastTime;
  if (dtMs < 1) dtMs = 1;
  if (dtMs > 50) dtMs = 50;
  ctx->lastTime = state->timeMs;

  if (!lineValid) {
    ctx->lineLocked = false;
    ctx->sharpTurn = false;
    ctx->centeredCount = 0;
  }
  // Chưa bắt được line: quét hai phía; mất line: quay về phía thấy lần cuối.
  if (!lineValid) {
    const int16_t search = lbmbMin16(targetSpeed, LBMB_SEARCH_SPEED_MAX);
    const bool searchRight = ctx->hasValidError
      ? ctx->prevError > 0.0f
      : elapsedOverall >= 700U && elapsedOverall < 2100U;
    const int16_t targetLeft = searchRight ? search : -search;
    ctx->outLeft = lbmbWheelSlew(ctx->outLeft, targetLeft, dtMs);
    ctx->outRight = lbmbWheelSlew(ctx->outRight, -targetLeft, dtMs);

    cmd.leftSpeed = ctx->outLeft;
    cmd.rightSpeed = ctx->outRight;
    cmd.isDone = false;
    return cmd;
  }

  int16_t fallback1000 = (int16_t)lroundf(ctx->prevError * 3000.0f);
  int16_t position1000 = lbmbLinePosition1000(state, fallback1000);
  float error = (float)position1000 / 3000.0f;
  error = lbmbClampF(error, -1.0f, 1.0f);

  if (!ctx->hasValidError) {
    ctx->prevError = error;
    ctx->filteredDerivative = 0.0f;
    ctx->integral = 0.0f;
    ctx->hasValidError = true;
  }

  // Require stable center samples before accelerating out of acquisition.
  if (lbmbAbsF(error) < 0.30f) {
    if (ctx->centeredCount < 5) ctx->centeredCount++;
    if (ctx->centeredCount >= 5) ctx->lineLocked = true;
  } else {
    ctx->centeredCount = 0;
  }

  if (lbmbAbsF(error) >= 0.75f) ctx->sharpTurn = true;
  else if (lbmbAbsF(error) <= 0.45f) ctx->sharpTurn = false;
  float rawDerivative = (error - ctx->prevError) / dt;
  ctx->filteredDerivative +=
      LBMB_FLL_D_ALPHA * (rawDerivative - ctx->filteredDerivative);

  // Integral decay near center and after crossing the center line.
  if (lbmbAbsF(error) < 0.05f) {
    ctx->integral *= 0.90f;
  }

  if ((error > 0.0f && ctx->prevError < 0.0f) ||
      (error < 0.0f && ctx->prevError > 0.0f)) {
    ctx->integral *= 0.55f;
  }

  float candidateI = ctx->integral + error * dt;
  candidateI = lbmbClampF(candidateI, -LBMB_FLL_MAX_I, LBMB_FLL_MAX_I);

  // Curvature-aware base speed.
  float curvature =
      LBMB_FLL_ERROR_SLOWDOWN * lbmbAbsF(error) +
      LBMB_FLL_D_SLOWDOWN * lbmbAbsF(ctx->filteredDerivative);

  float speedFactor = 1.0f - curvature;
  speedFactor = lbmbClampF(speedFactor, LBMB_FLL_MIN_FACTOR, 1.0f);

  float desiredBase = targetSpeed * speedFactor;
  int16_t minimumBase = lbmbInitialSpeed(targetSpeed);
  if (desiredBase < minimumBase) desiredBase = minimumBase;
  if (!ctx->lineLocked && desiredBase > LBMB_ACQUIRE_SPEED_MAX) desiredBase = LBMB_ACQUIRE_SPEED_MAX;
  if (ctx->sharpTurn && desiredBase > LBMB_CURVE_SPEED_MAX) desiredBase = LBMB_CURVE_SPEED_MAX;
  if (mode == 4) {
    int32_t remaining = targetMm - distanceProgress;
    float distanceLimit = lbmbBrakeEnvelope(
      remaining,
      lbmbMoveBrakeMm(targetSpeed),
      targetSpeed
    );
    if (distanceLimit < desiredBase) desiredBase = distanceLimit;
  } else if (mode == 5) {
    uint32_t remainingMs = targetMs - elapsedOverall;
    uint32_t brakeMs = (uint32_t)targetSpeed / 2U;
    if (brakeMs < 200U) brakeMs = 200U;
    if (brakeMs > 800U) brakeMs = 800U;

    if (remainingMs < brakeMs) {
      float f = (float)remainingMs / (float)brakeMs;
      f = lbmbClampF(f, 0.0f, 1.0f);
      float timeLimit =
          (float)minimumBase +
          ((float)targetSpeed - minimumBase) * sqrtf(f);
      if (timeLimit < desiredBase) desiredBase = timeLimit;
    }
  }

  lbmbProfileStep(
    &ctx->baseSpeed,
    &ctx->baseAccel,
    desiredBase,
    LBMB_FLL_ACCEL,
    LBMB_FLL_DECEL,
    LBMB_FLL_JERK,
    dt
  );

  // Scale curvature authority with speed, but keep the center/noise gain unchanged.
  float curveBlend = lbmbClampF((lbmbAbsF(error) - 0.35f) / 0.40f, 0.0f, 1.0f);
  float speedGain = ctx->baseSpeed / 650.0f;
  if (speedGain < 1.0f) speedGain = 1.0f;
  float steeringGain = 1.0f + curveBlend * (speedGain - 1.0f);
  float steering = steeringGain * (
      LBMB_FLL_KP * error +
      LBMB_FLL_KI * candidateI +
      LBMB_FLL_KD * ctx->filteredDerivative);

  float steerRatio = ctx->sharpTurn ? 1.40f : LBMB_FLL_MAX_STEER_RATIO;
  float steerLimit = ctx->baseSpeed * steerRatio;
  bool saturated = lbmbAbsF(steering) > steerLimit;

  // Anti-windup: do not integrate farther into saturation.
  if (saturated &&
      ((steering > 0.0f && error > 0.0f) ||
       (steering < 0.0f && error < 0.0f))) {
    candidateI = ctx->integral;
    steering = steeringGain * ( LBMB_FLL_KP * error + LBMB_FLL_KI * candidateI + LBMB_FLL_KD * ctx->filteredDerivative);
  }
  steering = lbmbClampF(steering, -steerLimit, steerLimit);
  int16_t base = lbmbClamp16( (int32_t)lroundf(ctx->baseSpeed), 0, targetSpeed);
  int16_t targetLeft = base;
  int16_t targetRight = base;
  if (ctx->markerCount == 0) {
    int16_t steerMag = lbmbClamp16( (int32_t)lroundf(lbmbAbsF(steering)), 0, ctx->sharpTurn ? (int16_t)lroundf(base * 1.40f) : base);
    if (steering > 0.0f) {
      targetRight = base - steerMag;
    } else if (steering < 0.0f) {
      targetLeft = base - steerMag;
    }
  }

  ctx->outLeft = lbmbWheelSlew(ctx->outLeft, targetLeft, dtMs);
  ctx->outRight = lbmbWheelSlew(ctx->outRight, targetRight, dtMs);

  ctx->integral = candidateI;
  ctx->prevError = error;

  cmd.leftSpeed = lbmbClamp16(ctx->outLeft, -((int16_t)2000), ((int16_t)2000));
  cmd.rightSpeed = lbmbClamp16(ctx->outRight, -((int16_t)2000), ((int16_t)2000));
  cmd.isDone = false;
  return cmd;
}

LbmbFollowCtx defaultLineContext = {};
bool lineOperationCompleted = false;

inline LbmbState lbmbReadState() {
  LbmbState state;
  state.timeMs = (uint32_t)millis();
  state.distanceMm = (int32_t)lroundf((float)LbMotion.getDistanceMm() / DISTANCE_SCALE);
  state.rotationDeg = (int32_t)LbMotion.getRotationDeg();
  state.lineState = (uint8_t)measure_line();
  state.ir2L = (int16_t)LbIRArray.read(ir2L);
  state.ir0L = (int16_t)LbIRArray.read(ir0L);
  state.ir1R = (int16_t)LbIRArray.read(ir1R);
  state.ir3R = (int16_t)LbIRArray.read(ir3R);
  return state;
}

float measure_line_error() {
  const LbmbState state = lbmbReadState();
  if (!lbmbIsLineValid(state.lineState)) return NAN;
  return lbmbLinePosition1000(&state, (int16_t)lroundf(lastLineError * 1000.0f)) / 1000.0f;
}

// Dùng chung phần xuất lệnh và cập nhật sai số; PID nằm nguyên trong core.
static void applyMyBlockLineCommand(const LbmbFollowCtx* ctx, const LbmbCommand* command) {
  lastLineError = ctx->prevError * 3.0f;
  if (command->isDone) { LbMotion.stopAndWait(); return; }
  const int left = LINE_STEERING_SIGN == -1 ? command->rightSpeed : command->leftSpeed;
  const int right = LINE_STEERING_SIGN == -1 ? command->leftSpeed : command->rightSpeed;
  LbMotion.runLR(left, right);
}

// Cập nhật một bước theo đúng lõi MyBlock, dùng khi tự viết loop.
void runFollowLine(int bits = -1) {
  if (missionError != ERR_NONE) { LbMotion.stopAndWait(); return; }
  if (check_mission_reset()) return;
  const uint32_t now = (uint32_t)millis();
  if (lineControlReady && now - lastLineControlTime < LBMB_TICK_MS) return;
  LbmbState state = lbmbReadState();
  if (bits >= 0) state.lineState = (uint8_t)(bits & 0x0F);
  if (!lineControlReady) lbmbFollowCoreInit(&defaultLineContext, &state);
  lastLineControlTime = now; lineControlReady = true;
  LbmbCommand command = lbmbFollowCoreStep(&defaultLineContext, &state, LINE_SPEED / 20.0f, 5, 600.0f);
  applyMyBlockLineCommand(&defaultLineContext, &command);
  if (command.isDone && now - defaultLineContext.lastValidTime >=
      (defaultLineContext.hasValidError ? ((uint32_t)2500) : ((uint32_t)3500))) {
    failMission(ERR_LINE_LOST);
  }
}

static void lbmbFollow(float speedPercent, uint8_t mode, float targetVal) {
  if (missionError != ERR_NONE) { LbMotion.stopAndWait(); return; }
  if (check_mission_reset()) return;
  lineOperationCompleted = false;
  if (!isfinite(speedPercent) || speedPercent <= 0 || !isfinite(targetVal) ||
      mode < 1 || mode > 5 || ((mode == 4 || mode == 5) && targetVal < 0) ||
      (mode == 4 && targetVal > 1200) || (mode == 5 && targetVal > 600)) {
    failMission(ERR_INVALID_MOVE); return;
  }
  LbMotion.stopAndWait(); resetMotionState(); junctionPending = false;
  if ((mode == 4 || mode == 5) && targetVal == 0) { lineOperationCompleted = true; return; }
  LbmbFollowCtx ctx = {};
  while (true) {
    if (check_mission_reset()) return;
    LbmbState state = lbmbReadState();
    if (!ctx.initialized) lbmbFollowCoreInit(&ctx, &state);
    const uint32_t elapsed = state.timeMs - ctx.startTime;
    const bool distanceDone = mode == 4 &&
      lbmbAbs32(state.distanceMm - ctx.startDist) >= (int32_t)lroundf(targetVal * 10.0f);
    const bool timeDone = mode == 5 && elapsed >= (uint32_t)lroundf(targetVal * 1000.0f);
    if (!distanceDone && !timeDone) {
      if (state.timeMs - ctx.lastValidTime >= (ctx.hasValidError ?
          ((uint32_t)2500) : ((uint32_t)3500)) &&
          !lbmbIsLineValid(state.lineState)) { failMission(ERR_LINE_LOST); return; }
      if (mode == 4 && lbmbIsLineValid(state.lineState) &&
          state.timeMs - ctx.lastProgressTime >= ((uint32_t)900) &&
          lbmbAbs32(state.distanceMm - ctx.startDist) <= ctx.maxProgress) {
        failMission(ERR_MOVE_STALL); return;
      }
      if (elapsed >= ((uint32_t)600000UL) || (mode <= 3 && elapsed >= ((uint32_t)60000UL))) {
        failMission(ERR_JUNCTION_TIMEOUT); return;
      }
    }
    LbmbCommand command = lbmbFollowCoreStep(&ctx, &state, speedPercent, mode, targetVal);
    applyMyBlockLineCommand(&ctx, &command);
    if (command.isDone) {
      lineOperationCompleted = true;
      junctionPending = mode <= 3 && ctx.markerCount >= 3;
      return;
    }
    robot_delay(LBMB_TICK_MS); 
  }
}
// API dò line: tốc độ tùy chọn tính theo %, mặc định LINE_SPEED / 20.
void followLineCm(float distanceCm, float speedPercent = LINE_SPEED / 20.0f) {
  lbmbFollow(speedPercent, 4, distanceCm);
}
void followLineDistance(int distanceMm, float speedPercent = LINE_SPEED / 20.0f) {
  followLineCm(distanceMm / 10.0f, speedPercent);
}
void followLineSeconds(float seconds, float speedPercent = LINE_SPEED / 20.0f) {
  lbmbFollow(speedPercent, 5, seconds);
}
void followLineUntilJunction(byte markerMode = 3, float speedPercent = LINE_SPEED / 20.0f) {
  lbmbFollow(speedPercent, markerMode, 0);
}
void centerDetectedJunction() {
  if (!junctionPending) return;
  junctionPending = false;
  move_tank(450, 450, JUNCTION_CENTER_MM / 10.0f);
}
void followLineMultipleJunctions(int count) {
  if (count < 0) { failMission(ERR_INVALID_MOVE); return; }
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

static bool readAPDSColor(int &r, int &g, int &b) {
  if (check_mission_reset()) return false;
  APDS.colorAvailable();
  robot_delay(COLOR_EXPOSURE_MS);
  if (check_mission_reset()) return false;
  const unsigned long started = millis();
  while (!APDS.colorAvailable()) {
    if (check_mission_reset()) return false;
    if (millis() - started >= COLOR_READY_TIMEOUT_MS) return false;
    robot_delay(5);
  }
  return APDS.readColor(r, g, b) && r >= 0 && g >= 0 && b >= 0;
}

// Đo kênh tương ứng dưới từng LED, rồi trừ nền khi tắt LED.
// Robot/khối và ánh sáng môi trường cần ổn định trong cả bốn lần đo.
static bool readObjectRGB(int &r, int &g, int &b) {
  int rr, gg, bb, redLit, greenLit, blueLit;
  LbRGB.fillColor(CRGB(255, 0, 0)); LbRGB.show();
  if (!readAPDSColor(redLit, gg, bb)) return false;
  LbRGB.fillColor(CRGB(0, 255, 0)); LbRGB.show();
  if (!readAPDSColor(rr, greenLit, bb)) return false;
  LbRGB.fillColor(CRGB(0, 0, 255)); LbRGB.show();
  if (!readAPDSColor(rr, gg, blueLit)) return false;
  LbRGB.fillColor(CRGB(0, 0, 0)); LbRGB.show();
  if (!readAPDSColor(rr, gg, bb)) return false;
  // Chặn giá trị âm do nhiễu/nền thay đổi; không để tràn tổng trên AVR int16.
  r = max(0, redLit - rr);
  g = max(0, greenLit - gg);
  b = max(0, blueLit - bb);
  return true;
}

static float colorHue(float red, float green, float blue) {
  const float top = max(red, max(green, blue));
  const float bottom = min(red, min(green, blue));
  const float span = top - bottom;
  if (span <= 0.0f) return -1.0f;
  float hue;
  if (top == red) hue = 60.0f * (green - blue) / span;
  else if (top == green) hue = 120.0f + 60.0f * (blue - red) / span;
  else hue = 240.0f + 60.0f * (red - green) / span;
  if (hue < 0.0f) hue += 360.0f;
  return hue;
}

static ObjectColor classifyColor(int red, int green, int blue) {
  int referenceCount = 0;
  for (int i = RED; i <= PURPLE; ++i) {
    if (colorReferenceReady[i]) ++referenceCount;
  }
  if (referenceCount > 0) {
    if (referenceCount != 5) return UNKNOWN;
    const float total = (float)max(0, red) + max(0, green) + max(0, blue);
    if (total <= 0 || max(red, max(green, blue)) < COLOR_MIN_CHANNEL) return UNKNOWN;
    const float channels[3] = {red / total, green / total, blue / total};
    float best = 10.0f, second = 10.0f;
    ObjectColor result = UNKNOWN;
    for (int i = RED; i <= PURPLE; ++i) {
      float distance = 0.0f;
      for (int j = 0; j < 3; ++j) {
        const float delta = channels[j] - colorReference[i][j];
        distance += delta * delta;
      }
      if (distance < best) { second = best; best = distance; result = (ObjectColor)i; }
      else if (distance < second) second = distance;
    }
    if (best > COLOR_REFERENCE_MAX_DISTANCE || second - best <= COLOR_REFERENCE_MARGIN ||
        second <= best * 1.5f) return UNKNOWN;
    return result;
  }
  const float r = max(0, red) * colorRedGain;
  const float g = max(0, green) * colorGreenGain;
  const float b = max(0, blue) * colorBlueGain;
  const float top = max(r, max(g, b));
  const float bottom = min(r, min(g, b));
  if (top < COLOR_MIN_CHANNEL || (top - bottom) / top < COLOR_MIN_SATURATION)
    return UNKNOWN;
  const float hue = colorHue(r, g, b);
  if (hue < COLOR_RED_YELLOW_HUE || hue >= COLOR_PURPLE_RED_HUE) return RED;
  if (hue < COLOR_YELLOW_GREEN_HUE) return YELLOW;
  if (hue < COLOR_GREEN_BLUE_HUE) return GREEN;
  if (hue < COLOR_BLUE_PURPLE_HUE) return BLUE;
  return PURPLE;
}

// Tối đa 5 mẫu RGB đã trừ nền, cần 4 phiếu; dừng sớm nếu kết quả đã chắc chắn.
ObjectColor read_color() {
  lastMeasuredColor = UNKNOWN; // Không giữ lại màu cũ nếu lần đo này thất bại.
  if (check_mission_reset()) return UNKNOWN;
  if (!colorSensorReady) colorSensorReady = APDS.begin();
  if (!colorSensorReady) { failMission(ERR_COLOR_SENSOR); return UNKNOWN; }
  const int originalBrightness = LbRGB.getBrightness();
  LbRGB.setBrightness(255);
  int votes[6] = {0, 0, 0, 0, 0, 0};
  long totalRed = 0, totalGreen = 0, totalBlue = 0;
  int sampleCount = 0;
  ObjectColor color = UNKNOWN;
  for (int sample = 0; sample < 5; ++sample) {
    int red = 0, green = 0, blue = 0;
    if (!readObjectRGB(red, green, blue)) {
      LbRGB.setBrightness(originalBrightness);
      // Reset có thể vừa đặt LED sẵn sàng; không ghi đè bằng màu đo dở.
      if (!check_mission_reset()) {
        LbRGB.fillColor(CRGB(0, 0, 0));
        failMission(ERR_COLOR_SENSOR);
      }
      LbRGB.show();
      return UNKNOWN;
    }
    ++sampleCount;
    ++votes[(int)classifyColor(red, green, blue)];
    int bestVotes = 0;
    for (int candidate = RED; candidate <= PURPLE; ++candidate) {
      bestVotes = max(bestVotes, votes[candidate]);
      if (votes[candidate] >= 4) color = (ObjectColor)candidate;
    }
    if (color != UNKNOWN || bestVotes + (5 - sampleCount) < 4) break;
  }
  LbRGB.setBrightness(originalBrightness);
  lastMeasuredColor = color;
  {
    const CRGB colors[6] = {CRGB(0, 0, 0), CRGB(255, 0, 0), CRGB(0, 255, 0),
                            CRGB(0, 0, 255), CRGB(255, 255, 0), CRGB(128, 0, 128)};
    LbRGB.fillColor(colors[(int)color]);
    LbRGB.show();
  }
  return color;
}


// Chỉ chuyển đổi giao thức ở nội bộ, không thêm API màu cho người dùng.
static const char* colorSignal(ObjectColor color) {
  switch (color) {
    case RED: return "Red";
    case GREEN: return "Green";
    case BLUE: return "Blue";
    case YELLOW: return "Yellow";
    case PURPLE: return "Purple";
    default: return "Unknown";
  }
}

static ObjectColor parseColorSignal(String signal) {
  signal.trim(); signal.toUpperCase();
  if (signal == "RED") return RED;
  if (signal == "GREEN") return GREEN;
  if (signal == "BLUE") return BLUE;
  if (signal == "YELLOW") return YELLOW;
  if (signal == "PURPLE") return PURPLE;
  return UNKNOWN;
}

static const __FlashStringHelper* colorAttribute(uint8_t numberObject) {
  switch (numberObject) {
    case 1: return F("Color1");
    case 2: return F("Color2");
    case 3: return F("Color3");
    case 4: return F("Color4");
    case 5: return F("Color5");
    case 6: return F("Color6");
    case 7: return F("Color7");
    default: return nullptr;
  }
}

void send_iot_color(ObjectColor color, uint8_t numberObject) {
  if (check_mission_reset()) {
    return;
  }
  if (color < RED || color > PURPLE) {
    return;
  }
  if (!iotConfigured) { failMission(ERR_WIFI_CONFIG); return; }
  const __FlashStringHelper* attributeName = colorAttribute(numberObject);
  if (attributeName == nullptr) { failMission(ERR_IOT_ATTRIBUTE); return; }
  auto IoTColor = LbIoT.Asset.attribute(attributeName);
  IoTColor.write(colorSignal(color));
}

ObjectColor read_iot_color(unsigned long timeoutMs, uint8_t numberObject) {
  if (check_mission_reset()) return UNKNOWN;
  if (!iotConfigured) { failMission(ERR_WIFI_CONFIG); return UNKNOWN; }
  const __FlashStringHelper* attributeName = colorAttribute(numberObject);
  if (attributeName == nullptr) { failMission(ERR_IOT_ATTRIBUTE); return UNKNOWN; }
  auto IoTColor = LbIoT.Asset.attribute(attributeName);
  const unsigned long started = millis();
  while (true) {
    if (check_mission_reset()) return UNKNOWN;
    String signal = IoTColor.read();
    if (check_mission_reset()) return UNKNOWN;
    const unsigned long elapsed = millis() - started;
    if (timeoutMs > 0 && elapsed >= timeoutMs) break;
    const ObjectColor color = parseColorSignal(signal);
    if (color != UNKNOWN) return color;
    if (timeoutMs == 0) return UNKNOWN;
    robot_delay(min(50UL, timeoutMs - elapsed));
    if (millis() - started >= timeoutMs) break;
  }
  return UNKNOWN;
}

static void showReadyLED() {
  LbRGB.fillColor(CRGB::Black);
  LbRGB.fillColor(CRGB::Green, BITMAP(ledA,ledB));
  LbRGB.show();
}

void reset_mission() {
  missionResetRequested = true;
  LbMotion.stopAndWait();
  handBusy = false; handFrom = handTarget = handAngle;
  missionError = ERR_NONE; junctionPending = false; lineOperationCompleted = false;
  lastMeasuredColor = UNKNOWN; resetMotionState();
  missionArmed = false; missionButtons = 8; missionButtonChangedAt = millis();
  showReadyLED();
  Serial.println(F("MISSION RESET: TB1B"));
}

static bool check_mission_reset() {
  if (LbTouch.read(TB2B) == HIGH) {
    if (!resetTouchActive) { resetTouchActive = true; resetTouchStarted = millis(); }
    if (!missionResetRequested && millis() - resetTouchStarted >= 30UL) reset_mission();
  } else resetTouchActive = false;
  return missionResetRequested;
}

void beep() {
  for (int count = 0; count < 3; count++) {
    Leanbot.tone(440 * 2, 50);
    delay(50);
  }
}

void FullMission() {
  const byte buttons = (LbTouch.read(TB1A) == HIGH ? 1 : 0) | (LbTouch.read(TB1B) == HIGH ? 2 : 0) | (LbTouch.read(TB2A) == HIGH ? 4 : 0) | (LbTouch.read(TB2B) == HIGH ? 8 : 0);
  const unsigned long now = millis();
  if (buttons != missionButtons) {
    missionButtons = buttons;
    missionButtonChangedAt = now;
  }
  if (now - missionButtonChangedAt < 30UL) { robot_delay(5); return; }
  if (!missionArmed) {
    if (buttons == 0) missionArmed = true;
    robot_delay(5);
    return;
  }
  if (buttons == 0) { robot_delay(5); return; }
  missionArmed = false;
  if (buttons == 8) { reset_mission(); return; }
  if (buttons != 1 && buttons != 2 && buttons != 4) { robot_delay(5); return; }

  missionResetRequested = false;
  missionError = ERR_NONE;
  junctionPending = false;
  lineOperationCompleted = false;
  lastMeasuredColor = UNKNOWN;
  resetMotionState();
  if (buttons == 1) // Nút TB1A: hiệu chuẩn line 
  {
    calibrate_line();
  } 
  else if (buttons == 2) // Nút TB1B: chạy nhiệm vụ chính
  {
    LbRGB.fillColor(CRGB::Yellow, BITMAP(ledC,ledD));
    LbRGB.show();
    // Chạy bài: đặt các lệnh nhiệm vụ tại đây.
    // Ví dụ: followLineCm(100, 100); // Tốc độ dò line tính bằng %.
    // Gửi các mẫu màu vào Color1-Color5 của Asset đã cấu hình trong setup().
    send_iot_color(BLUE,1);
    send_iot_color(RED,2);
    send_iot_color(YELLOW,3);
    send_iot_color(PURPLE,4);
    send_iot_color(GREEN,5);
    // Robot nhận dùng read_iot_color(...) trong chương trình riêng.
  } 
  else if (buttons == 4) // Nút TB2A: kết nối Internet
  {
    LbRGB.fillColor(CRGB::Red, BITMAP(ledC,ledD));
    LbRGB.show();
    // Kết nối Internet: gọi set_wifi() sau khi đã declare_wifi().
    set_wifi();
  }

  LbMotion.stopAndWait();
  wait_hand();
  resetMotionState();
  junctionPending = false;
  lineOperationCompleted = false;
  missionButtonChangedAt = millis();
  showReadyLED();
}

void setup() {
  Leanbot.begin();
  Serial.begin(115200); // Log chẩn đoán.
  // Điền WiFi và cùng Asset ID trên cả hai robot; TB2A thực hiện kết nối.
  // SSID trống: báo ERR_WIFI_CONFIG, không thử kết nối nhầm mạng.
  // declare_wifi("", "", F("AssetID"));
  set_wifi("", "", F("7k6cEX9rOCpYcJ2ZlBTDXo"));
  showReadyLED();
//   set_line(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R); // Ngưỡng dự phòng.
}

void loop() 
{
  FullMission();
}
