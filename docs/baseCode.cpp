
#include <Leanbot.h>
#include <stdint.h>
#include <math.h>
#include <string.h>
#include <LeanbotIoT.h>
#include <Arduino_APDS9960.h>


// BEGIN MYBLOCKS LINE TYPES
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
  uint8_t markerCount;
  bool initialized;
};
// Khai báo trước để Arduino nhận đúng các kiểu struct.
inline void lbmbFollowCoreInit(LbmbFollowCtx* ctx, const LbmbState* state);
inline LbmbCommand lbmbFollowCoreStep(LbmbFollowCtx* ctx, const LbmbState* state,
  float speedPercent, uint8_t mode, float targetVal);
inline LbmbState lbmbReadState();
// END MYBLOCKS LINE TYPES

enum ObjectColor { OBJECT_UNKNOWN, OBJECT_RED, OBJECT_GREEN, OBJECT_BLUE, OBJECT_YELLOW, OBJECT_PURPLE };
static ObjectColor classifyColor(int red, int green, int blue);
ObjectColor readObjectColor(bool &valid);
ObjectColor Obj_detectColor();
void requireColor(ObjectColor expected);
void send_iot_color(ObjectColor color);
void set_color_reference(ObjectColor color, int red, int green, int blue);
void calibrate_color(ObjectColor color);
ObjectColor peek_iot_color();
ObjectColor pop_iot_color();
ObjectColor read_iot_color();
bool wait_iot_color(ObjectColor expected, unsigned long timeoutMs = 30000UL);

auto IoTColor = LbIoT.Asset.attribute(F("Color"));

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
const float MOVE_SLOW_ZONE_MM = 30.0f;
const float MOVE_BRAKE_LEAD_MM = 0.0f; // Giảm tốc trước đích, chỉ kết thúc khi đủ quãng đường.
const int MOVE_ACCEL_INCREMENT = 100;  
const int HEADING_KP = 9;          

const int TURN_FINISH_SPEED = 120;
const float TURN_SLOW_ZONE = 35.0f; // Giảm tốc sớm để hạn chế vượt góc.
const float TURN_BRAKE_LEAD_DEG = 0.5f; // Sai số dừng theo phản hồi, không phải bảo đảm góc vật lý.
const int TURN_ACCEL_INCREMENT = 54;
const int TURN_MAX_SPEED = 2000;
const float TURN_PRECISION_SPEED_PER_DEG = 40.0f; // Giữ tốc độ thấp ở các độ cuối.
const unsigned long TURN_RAMP_MS = 10UL;
const unsigned long MOTION_FEEDBACK_MS = 1UL;
const unsigned long MOTION_RAMP_MS = 8UL; // Tăng tốc theo bước thời gian, không phụ thuộc FPS.

const int ROUTE_SPEED = 2000;       
const int LINE_SPEED = 2000; // Mặc định 100% tốc độ MyBlock; lõi tự giảm theo độ lệch.         

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

enum ErrorCode {
  ERR_NONE = 0, ERR_INVALID_MOVE, ERR_MOVE_TIMEOUT, ERR_MOVE_STALL,
  ERR_TURN_TIMEOUT, ERR_TURN_STALL, ERR_LINE_LOST,
  ERR_JUNCTION_TIMEOUT, ERR_COLOR_SENSOR, ERR_COLOR_MISMATCH, ERR_IOT_TIMEOUT, ERR_WIFI_CONFIG
};

ErrorCode missionError = ERR_NONE;
bool junctionPending = false;
float lastLineError = 0.0f;
float filteredLineError = 0.0f;
int lastLineCmdL = 0;
int lastLineCmdR = 0;
unsigned long lastLineSeenTime = 0;
unsigned long lastLineControlTime = 0;
bool lineControlReady = false;
bool colorSensorReady = false;

static int clampMotor(int v) { return constrain(v, -MAX_MOTOR_SPEED, MAX_MOTOR_SPEED); }
static int signInt(int n) { return (n > 0) - (n < 0); }

void failMission(ErrorCode code) {
  if (missionError == ERR_NONE) missionError = code;
  LbMotion.stopAndWait();
  Serial.print(F("MISSION ERROR: "));
  Serial.println(code);
}

void resetMotionState() {
  lastLineCmdL = lastLineCmdR = 0;
  lastLineError = 0;
  filteredLineError = 0.0f;
  lineControlReady = false;
  lastLineControlTime = millis();
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
  const int target = constrain(degree, -30, 120);
  // Không khởi động lại tác vụ hoặc thời gian ổn định khi lặp cùng lệnh.
  if (handBusy && target == handTarget) return;
  if (!handBusy && target == handAngle) return;
  handFrom = handAngle;
  handTarget = target;
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
  speed = min(speed, TURN_MAX_SPEED);
  const float target = fabsf(angle_deg) * TURN_SCALE[(int)mode] *(mode == TWO_WHEELS ? TURN_TWO_SCALE : TURN_ONE_SCALE);
  const int direction = angle_deg > 0.0f ? 1 : -1;
  const float origin = (float)LbMotion.getRotationDeg();
  unsigned long started = millis(), lastAdvance = started, lastRamp = started;
  float bestProgress = 0.0f;
  int currentSpeed = TURN_FINISH_SPEED;
  int previousSpeed = -1;
  const unsigned long timeoutMs = 3500UL + (unsigned long)(target * 90.0f);

  while (true) {
    const float progress = ((float)LbMotion.getRotationDeg() - origin) * direction;
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
  const float originRot = (float)LbMotion.getRotationDeg();
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
      MOVE_FINISH_SPEED + (int)lroundf((maxMagnitude - MOVE_FINISH_SPEED) * sqrtf(ratio)));
    if (currentMagnitude > allowed) currentMagnitude = allowed;
    else if (now - lastRamp >= MOTION_RAMP_MS) {
      currentMagnitude = min(currentMagnitude + MOVE_ACCEL_INCREMENT, allowed);
      lastRamp = now;
    }
    const float magRatio = (float)currentMagnitude / (float)maxMagnitude;
    int vL = direction * (int)lroundf(targetL * magRatio);
    int vR = direction * (int)lroundf(targetR * magRatio);
    const int correction = constrain((int)(HEADING_KP *
      ((float)LbMotion.getRotationDeg() - originRot)), -180, 180);
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
const __FlashStringHelper *wifiAssetId = nullptr;

void declare_wifi(const String &ssid, const String &password, const __FlashStringHelper *assetId = nullptr) {
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
  if (wifiAssetId != nullptr) LbIoT.Asset.begin(wifiAssetId);
}

void set_wifi(const String &ssid, const String &password, const __FlashStringHelper *assetId = nullptr) {
  declare_wifi(ssid, password, assetId);
  set_wifi();
}

void set_line(int leftOuter, int leftInner, int rightInner, int rightOuter) {
  LbIRLine.setThreshold(leftOuter, leftInner, rightInner, rightOuter);
}

int measure_line() {
  LbIRLine.read(); // Cập nhật cảm biến trước.
  return (int)LbIRLine.value() & 0x0F; // Lấy mặt nạ digital đã lưu.
}
void print_line() { Serial.println(measure_line()); }

// Hiệu chuẩn đen/trắng bằng TB1A; SDK điều khiển các bước xác nhận.
// Chỉ gọi khi muốn hiệu chuẩn, không gọi trong vòng dò line đang chạy.
void calibrate_line() {
  LbMotion.stopAndWait();
  wait_hand();
  resetMotionState();
  junctionPending = false;
  Serial.println(F("Line calibration: use TB1A and follow SDK black/white steps."));
  LbIRLine.doManualCalibration(TB1A);
  resetMotionState();
  Serial.println(F("Line calibration returned. Check sensors on black and white."));
}

// Hiển thị cảm biến nào thấy line bằng LED xanh; không đo màu RGB của vật.
// Chế độ chẩn đoán chủ động này sẽ thay màu LED thông báo khối trước đó.
void display_line() {
  LbIRLine.read();
  LbIRLine.displayOnRGB(CRGB::Green);
  LbRGB.show();
}

// Gọi khi robot đứng yên; không in liên tục trong vòng điều khiển 10 ms.
// Đây là giá trị cảm biến thực, không phải mặt nạ digital.
void measure_line_values() {
  Serial.print(F("IR 2L/0L/1R/3R: "));
  Serial.print(LbIRArray.read(ir2L)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir0L)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir1R)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir3R));
  Serial.print(F(" mask: ")); Serial.print(measure_line());
  Serial.print(F(" last error: ")); Serial.print(filteredLineError);
  Serial.print(F(" steering sign: ")); Serial.println(LINE_STEERING_SIGN);
}

// BEGIN MYBLOCKS LINE CORE
const uint16_t LBMB_TICK_MS = 10;
const int16_t LBMB_SPEED_MAX = 2000;
const int16_t LBMB_START_SPEED = 200;
const int16_t LBMB_SEARCH_SPEED_MAX = 420;
const uint32_t LBMB_PROGRESS_TIMEOUT_MS = 900;
const uint32_t LBMB_LOST_LINE_TIMEOUT_MS = 800;
const uint32_t LBMB_MARKER_TIMEOUT_MS = 60000UL;
const uint32_t LBMB_MAX_OPERATION_MS = 600000UL;
const float LBMB_FLL_ACCEL = 3600.0f;
const float LBMB_FLL_DECEL = 6500.0f;
const float LBMB_FLL_JERK = 30000.0f;
const int32_t LBMB_WHEEL_ACCEL = 9000;
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
const int32_t LBMB_LINE_SIGNAL_MIN = 24;

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
  int32_t s = (int32_t)round(mag * 20.0f);
  if (s < 20) s = 20;
  if (s > LBMB_SPEED_MAX) s = LBMB_SPEED_MAX;
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

  if (target > current) {
    int32_t next = (int32_t)current + delta;
    return (int16_t)(next > target ? target : next);
  }

  if (target < current) {
    int32_t next = (int32_t)current - delta;
    return (int16_t)(next < target ? target : next);
  }

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
  targetSpeed = lbmbClampF(targetSpeed, 0.0f, (float)LBMB_SPEED_MAX);

  float error = targetSpeed - *speed;
  if (lbmbAbsF(error) < 0.5f) {
    *speed = targetSpeed;
    *accel = 0.0f;
    return *speed;
  }

  float desiredAccel;
  if (error > 0.0f) {
    desiredAccel = maxAccel;
  } else {
    desiredAccel = -maxDecel;
  }

  float maxDeltaAccel = maxJerk * dt;
  float accelDelta = desiredAccel - *accel;
  accelDelta = lbmbClampF(accelDelta, -maxDeltaAccel, maxDeltaAccel);
  *accel += accelDelta;

  float next = *speed + (*accel * dt);

  // Never cross the requested envelope.
  if ((error > 0.0f && next >= targetSpeed) ||
      (error < 0.0f && next <= targetSpeed)) {
    next = targetSpeed;
    *accel = 0.0f;
  }

  if (next < 0.0f) {
    next = 0.0f;
    *accel = 0.0f;
  }

  if (next > LBMB_SPEED_MAX) {
    next = LBMB_SPEED_MAX;
    *accel = 0.0f;
  }

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

inline float lbmbBrakeEnvelope(
  int32_t remaining,
  int32_t brakeZone,
  int16_t targetSpeed
) {
  int16_t minSpeed = lbmbInitialSpeed(targetSpeed);
  if (remaining >= brakeZone || brakeZone <= 0) return targetSpeed;

  float f = (float)remaining / (float)brakeZone;
  f = lbmbClampF(f, 0.0f, 1.0f);

  // sqrt keeps speed higher during the first part of braking, while still
  // approaching the minimum near the target.
  float shaped = sqrtf(f);
  return (float)minSpeed + ((float)targetSpeed - minSpeed) * shaped;
}

// -----------------------------------------------------------------------------
// Leanbot line sensing
// -----------------------------------------------------------------------------

inline bool lbmbIsLineValid(uint8_t state) {
  return state == 0b1000 || state == 0b1100 || state == 0b0100 || state == 0b1110 ||
         state == 0b0110 || state == 0b1111 || state == 0b0010 || state == 0b0111 ||
         state == 0b0011 || state == 0b0001;
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
  int32_t v2 = state->ir2L;
  int32_t v0 = state->ir0L;
  int32_t v1 = state->ir1R;
  int32_t v3 = state->ir3R;

  int32_t floorValue = v2;
  if (v0 < floorValue) floorValue = v0;
  if (v1 < floorValue) floorValue = v1;
  if (v3 < floorValue) floorValue = v3;

  int32_t w2 = v2 - floorValue;
  int32_t w0 = v0 - floorValue;
  int32_t w1 = v1 - floorValue;
  int32_t w3 = v3 - floorValue;

  if (w2 < 0) w2 = 0;
  if (w0 < 0) w0 = 0;
  if (w1 < 0) w1 = 0;
  if (w3 < 0) w3 = 0;

  int32_t sum = w2 + w0 + w1 + w3;

  // Fall back to Leanbot's calibrated digital line state when analog contrast is
  // too weak or all four sensors see a very similar surface.
  if (sum < LBMB_LINE_SIGNAL_MIN) {
    return lbmbDiscreteLineError1000(state->lineState, fallbackError1000);
  }

  int32_t weighted =
      (-3000L * w2) +
      (-1000L * w0) +
      ( 1000L * w1) +
      ( 3000L * w3);

  int32_t pos = weighted / sum;
  if (pos < -3000) pos = -3000;
  if (pos > 3000) pos = 3000;
  return (int16_t)pos;
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

  if (elapsedOverall >= LBMB_MAX_OPERATION_MS) return cmd;

  int32_t targetMm = 0;
  uint32_t targetMs = 0;

  if (mode == 4) {
    if (targetVal <= 0.0f || isnan(targetVal)) return cmd;
    targetMm = (int32_t)round(targetVal * 10.0f);
  } else if (mode == 5) {
    if (targetVal <= 0.0f || isnan(targetVal)) return cmd;
    targetMs = (uint32_t)round(targetVal * 1000.0f);
  }

  // Marker stop modes.
  if (mode <= 3) {
    if (lbmbCheckMarker(state->lineState, mode)) {
      if (ctx->markerCount < 255) ctx->markerCount++;
      if (ctx->markerCount >= 3) return cmd;
    } else {
      ctx->markerCount = 0;
    }

    if (elapsedOverall >= LBMB_MARKER_TIMEOUT_MS) return cmd;
  }

  // Distance stop mode.
  int32_t distanceProgress = lbmbAbs32(state->distanceMm - ctx->startDist);
  if (mode == 4) {
    if (distanceProgress > ctx->maxProgress) {
      ctx->maxProgress = distanceProgress;
      ctx->lastProgressTime = state->timeMs;
    }

    if (distanceProgress >= targetMm) return cmd;
    if (state->timeMs - ctx->lastProgressTime >= LBMB_PROGRESS_TIMEOUT_MS) return cmd;
  }

  // Time stop mode.
  if (mode == 5 && elapsedOverall >= targetMs) return cmd;

  bool lineValid = lbmbIsLineValid(state->lineState);
  if (lineValid) {
    ctx->lastValidTime = state->timeMs;
  }

  if (state->timeMs - ctx->lastValidTime >= LBMB_LOST_LINE_TIMEOUT_MS) {
    return cmd;
  }

  float dt = lbmbDtSec(state->timeMs, ctx->lastTime);
  uint32_t dtMs = state->timeMs - ctx->lastTime;
  if (dtMs < 1) dtMs = 1;
  if (dtMs > 50) dtMs = 50;
  ctx->lastTime = state->timeMs;

  // Before the first valid line sample, crawl forward briefly instead of applying
  // an arbitrary PID direction.
  if (!lineValid && !ctx->hasValidError) {
    int16_t crawl = lbmbMin16(targetSpeed, 300);
    ctx->outLeft = lbmbWheelSlew(ctx->outLeft, crawl, dtMs);
    ctx->outRight = lbmbWheelSlew(ctx->outRight, crawl, dtMs);

    cmd.leftSpeed = ctx->outLeft;
    cmd.rightSpeed = ctx->outRight;
    cmd.isDone = false;
    return cmd;
  }

  // Lost line after having a valid error: pivot toward the last known side.
  if (!lineValid || state->lineState == 0b0000) {
    int16_t search = lbmbMin16(
      targetSpeed,
      LBMB_SEARCH_SPEED_MAX
    );

    int16_t targetLeft;
    int16_t targetRight;

    if (ctx->prevError > 0.0f) {
      // Last line was on the right -> rotate right.
      targetLeft = search;
      targetRight = -search;
    } else {
      targetLeft = -search;
      targetRight = search;
    }

    ctx->outLeft = lbmbWheelSlew(ctx->outLeft, targetLeft, dtMs);
    ctx->outRight = lbmbWheelSlew(ctx->outRight, targetRight, dtMs);

    cmd.leftSpeed = ctx->outLeft;
    cmd.rightSpeed = ctx->outRight;
    cmd.isDone = false;
    return cmd;
  }

  int16_t fallback1000 = (int16_t)round(ctx->prevError * 3000.0f);
  int16_t position1000 = lbmbLinePosition1000(state, fallback1000);
  float error = (float)position1000 / 3000.0f;
  error = lbmbClampF(error, -1.0f, 1.0f);

  if (!ctx->hasValidError) {
    ctx->prevError = error;
    ctx->filteredDerivative = 0.0f;
    ctx->integral = 0.0f;
    ctx->hasValidError = true;
  }

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

  // Distance/time braking imposes another ceiling.
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

  float steering =
      LBMB_FLL_KP * error +
      LBMB_FLL_KI * candidateI +
      LBMB_FLL_KD * ctx->filteredDerivative;

  float steerLimit = ctx->baseSpeed * LBMB_FLL_MAX_STEER_RATIO;
  bool saturated = lbmbAbsF(steering) > steerLimit;

  // Anti-windup: do not integrate farther into saturation.
  if (saturated &&
      ((steering > 0.0f && error > 0.0f) ||
       (steering < 0.0f && error < 0.0f))) {
    candidateI = ctx->integral;
    steering =
        LBMB_FLL_KP * error +
        LBMB_FLL_KI * candidateI +
        LBMB_FLL_KD * ctx->filteredDerivative;
  }

  steering = lbmbClampF(steering, -steerLimit, steerLimit);

  int16_t base = lbmbClamp16(
    (int32_t)round(ctx->baseSpeed),
    0,
    targetSpeed
  );

  int16_t targetLeft = base;
  int16_t targetRight = base;

  // Marker debounce samples should cross the marker straight rather than allowing
  // the wide black region to provoke steering.
  if (ctx->markerCount == 0) {
    int16_t steerMag = lbmbClamp16(
      (int32_t)round(lbmbAbsF(steering)),
      0,
      base
    );

    if (steering > 0.0f) {
      // Line is right -> right turn -> slow right wheel.
      targetRight = base - steerMag;
    } else if (steering < 0.0f) {
      // Line is left -> left turn -> slow left wheel.
      targetLeft = base - steerMag;
    }
  }

  ctx->outLeft = lbmbWheelSlew(ctx->outLeft, targetLeft, dtMs);
  ctx->outRight = lbmbWheelSlew(ctx->outRight, targetRight, dtMs);

  ctx->integral = candidateI;
  ctx->prevError = error;

  cmd.leftSpeed = lbmbClamp16(ctx->outLeft, -LBMB_SPEED_MAX, LBMB_SPEED_MAX);
  cmd.rightSpeed = lbmbClamp16(ctx->outRight, -LBMB_SPEED_MAX, LBMB_SPEED_MAX);
  cmd.isDone = false;
  return cmd;
}
// END MYBLOCKS LINE CORE

// BEGIN MYBLOCKS LINE ADAPTER
LbmbFollowCtx defaultLineContext = {};
bool lineOperationCompleted = false;

inline LbmbState lbmbReadState() {
  LbmbState state;
  state.timeMs = (uint32_t)millis();
  // Một lần hiệu chuẩn chung cho đi mù và line, trước khi lõi xử lý mm.
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

static void applyMyBlockLineCommand(const LbmbCommand* command) {
  const int left = LINE_STEERING_SIGN == -1 ? command->rightSpeed : command->leftSpeed;
  const int right = LINE_STEERING_SIGN == -1 ? command->leftSpeed : command->rightSpeed;
  lastLineCmdL = left; lastLineCmdR = right;
  LbMotion.runLR(left, right);
}

// Cập nhật một bước theo đúng lõi MyBlock, dùng khi tự viết loop.
void runFollowLine(int bits) {
  const uint32_t now = (uint32_t)millis();
  if (lineControlReady && now - lastLineControlTime < LBMB_TICK_MS) return;
  LbmbState state = lbmbReadState();
  if (bits >= 0) state.lineState = (uint8_t)(bits & 0x0F);
  if (!lineControlReady) lbmbFollowCoreInit(&defaultLineContext, &state);
  lastLineControlTime = now; lineControlReady = true;
  LbmbCommand command = lbmbFollowCoreStep(&defaultLineContext, &state,
    LINE_SPEED / 20.0f, 5, 600.0f);
  lastLineError = defaultLineContext.prevError * 3.0f;
  filteredLineError = lastLineError;
  if (command.isDone) {
    LbMotion.stopAndWait();
    lastLineCmdL = lastLineCmdR = 0;
    if (now - defaultLineContext.lastValidTime >= LBMB_LOST_LINE_TIMEOUT_MS)
      failMission(ERR_LINE_LOST);
    return; // Không tự khởi động lại sau khi mất line; resetMotionState để bắt đầu lượt mới.
  }
  applyMyBlockLineCommand(&command);
}
void runFollowLine() { runFollowLine(-1); }

// API tương ứng Blockly MyBlock: tốc độ theo %, không phải đơn vị runLR.
void lbmbFollow(float speedPercent, uint8_t mode, float targetVal) {
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
    LbmbState state = lbmbReadState();
    if (!ctx.initialized) lbmbFollowCoreInit(&ctx, &state);
    const uint32_t elapsed = state.timeMs - ctx.startTime;
    // Không coi mất line / kẹt / quá hạn là hoàn thành nhiệm vụ.
    const bool distanceDone = mode == 4 &&
      lbmbAbs32(state.distanceMm - ctx.startDist) >= (int32_t)lroundf(targetVal * 10.0f);
    const bool timeDone = mode == 5 && elapsed >= (uint32_t)lroundf(targetVal * 1000.0f);
    if (!distanceDone && !timeDone) {
      if (state.timeMs - ctx.lastValidTime >= LBMB_LOST_LINE_TIMEOUT_MS &&
          !lbmbIsLineValid(state.lineState)) { failMission(ERR_LINE_LOST); return; }
      if (mode == 4 && state.timeMs - ctx.lastProgressTime >= LBMB_PROGRESS_TIMEOUT_MS &&
          lbmbAbs32(state.distanceMm - ctx.startDist) <= ctx.maxProgress) {
        failMission(ERR_MOVE_STALL); return;
      }
      if (elapsed >= LBMB_MAX_OPERATION_MS || (mode <= 3 && elapsed >= LBMB_MARKER_TIMEOUT_MS)) {
        failMission(ERR_JUNCTION_TIMEOUT); return;
      }
    }
    LbmbCommand command = lbmbFollowCoreStep(&ctx, &state, speedPercent, mode, targetVal);
    lastLineError = ctx.prevError * 3.0f;
    filteredLineError = lastLineError;
    if (command.isDone) {
      LbMotion.stopAndWait(); lastLineCmdL = lastLineCmdR = 0;
      lineOperationCompleted = true;
      junctionPending = mode <= 3 && ctx.markerCount >= 3;
      return;
    }
    applyMyBlockLineCommand(&command);
    robot_delay(LBMB_TICK_MS); // Thay delay của MyBlock để tay async vẫn được cập nhật.
  }
}
void lbmbFollowMarker(float speedPercent, byte markerMode) { lbmbFollow(speedPercent, markerMode, 0); }
void lbmbFollowDistance(float speedPercent, float distanceCm) { lbmbFollow(speedPercent, 4, distanceCm); }
void lbmbFollowTime(float speedPercent, float timeSec) { lbmbFollow(speedPercent, 5, timeSec); }

// Tương thích các lệnh học sinh đang dùng. mm / cm / giây được ghi rõ.
void followLineDistance(int distanceMm) { lbmbFollowDistance(LINE_SPEED / 20.0f, distanceMm / 10.0f); }
void followLineCm(float distanceCm) { lbmbFollowDistance(LINE_SPEED / 20.0f, distanceCm); }
void followLineSeconds(float seconds) { lbmbFollowTime(LINE_SPEED / 20.0f, seconds); }
void followLineUntilJunction() { lbmbFollowMarker(LINE_SPEED / 20.0f, 3); }
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
// END MYBLOCKS LINE ADAPTER

const int COLOR_SAMPLE_COUNT = 5;
const int COLOR_REQUIRED_VOTES = 4;
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

void set_color_white(int red, int green, int blue) {
  if (min(red, min(green, blue)) < COLOR_MIN_CHANNEL) return;
  const float average = ((float)red + green + blue) / 3.0f;
  colorRedGain = average / red;
  colorGreenGain = average / green;
  colorBlueGain = average / blue;
}

bool readAPDSColor(int &r, int &g, int &b) {
  APDS.colorAvailable();
  robot_delay(35);
  const unsigned long started = millis();
  while (!APDS.colorAvailable()) {
    if (millis() - started > 850UL) return false;
    robot_delay(5);
  }
  return APDS.readColor(r, g, b);
}

float colorReference[6][3];
bool colorReferenceReady[6] = {false, false, false, false, false, false};
const float COLOR_REFERENCE_MAX_DISTANCE = 0.004f;
const float COLOR_REFERENCE_MARGIN = 0.00005f;

void set_color_reference(ObjectColor color, int red, int green, int blue) {
  if (color < OBJECT_RED || color > OBJECT_PURPLE || red < 0 || green < 0 || blue < 0) return;
  const float total = (float)red + green + blue;
  if (max(red, max(green, blue)) < COLOR_MIN_CHANNEL || total <= 0) return;
  colorReference[(int)color][0] = red / total;
  colorReference[(int)color][1] = green / total;
  colorReference[(int)color][2] = blue / total;
  colorReferenceReady[(int)color] = true;
}

void calibrate_color(ObjectColor color) {
  if (color < OBJECT_RED || color > OBJECT_PURPLE) return;
  if (!colorSensorReady) { failMission(ERR_COLOR_SENSOR); return; }
  long sums[3] = {0, 0, 0};
  for (int i = 0; i < COLOR_SAMPLE_COUNT; ++i) {
    int r = 0, g = 0, b = 0;
    if (!readAPDSColor(r, g, b) || r < 0 || g < 0 || b < 0) {
      failMission(ERR_COLOR_SENSOR); return;
    }
    sums[0] += r; sums[1] += g; sums[2] += b;
  }
  const int r = sums[0] / COLOR_SAMPLE_COUNT;
  const int g = sums[1] / COLOR_SAMPLE_COUNT;
  const int b = sums[2] / COLOR_SAMPLE_COUNT;
  if (max(r, max(g, b)) < COLOR_MIN_CHANNEL) {
    Serial.println(F("Calibration failed: too dark")); return;
  }
  set_color_reference(color, r, g, b);
  Serial.print(F("set_color_reference((ObjectColor)")); Serial.print((int)color);
  Serial.print(F(", ")); Serial.print(r); Serial.print(F(", ")); Serial.print(g);
  Serial.print(F(", ")); Serial.print(b); Serial.println(F(");"));
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
  for (int i = OBJECT_RED; i <= OBJECT_PURPLE; ++i) {
    if (colorReferenceReady[i]) ++referenceCount;
  }
  if (referenceCount > 0) {
    if (referenceCount != 5) return OBJECT_UNKNOWN;
    const float total = (float)max(0, red) + max(0, green) + max(0, blue);
    if (total <= 0 || max(red, max(green, blue)) < COLOR_MIN_CHANNEL) return OBJECT_UNKNOWN;
    const float channels[3] = {red / total, green / total, blue / total};
    float best = 10.0f, second = 10.0f;
    ObjectColor result = OBJECT_UNKNOWN;
    for (int i = OBJECT_RED; i <= OBJECT_PURPLE; ++i) {
      float distance = 0.0f;
      for (int j = 0; j < 3; ++j) {
        const float delta = channels[j] - colorReference[i][j];
        distance += delta * delta;
      }
      if (distance < best) { second = best; best = distance; result = (ObjectColor)i; }
      else if (distance < second) second = distance;
    }
    if (best > COLOR_REFERENCE_MAX_DISTANCE || second - best <= COLOR_REFERENCE_MARGIN ||
        second <= best * 1.5f) return OBJECT_UNKNOWN;
    return result;
  }
  const float r = max(0, red) * colorRedGain;
  const float g = max(0, green) * colorGreenGain;
  const float b = max(0, blue) * colorBlueGain;
  const float top = max(r, max(g, b));
  const float bottom = min(r, min(g, b));
  if (top < COLOR_MIN_CHANNEL || (top - bottom) / top < COLOR_MIN_SATURATION)
    return OBJECT_UNKNOWN;
  const float hue = colorHue(r, g, b);
  if (hue < COLOR_RED_YELLOW_HUE || hue >= COLOR_PURPLE_RED_HUE) return OBJECT_RED;
  if (hue < COLOR_YELLOW_GREEN_HUE) return OBJECT_YELLOW;
  if (hue < COLOR_GREEN_BLUE_HUE) return OBJECT_GREEN;
  if (hue < COLOR_BLUE_PURPLE_HUE) return OBJECT_BLUE;
  return OBJECT_PURPLE;
}

ObjectColor readObjectColor(bool &valid) {
  valid = false;
  if (!colorSensorReady) { failMission(ERR_COLOR_SENSOR); return OBJECT_UNKNOWN; }
  int votes[6] = {0, 0, 0, 0, 0, 0};
  long totalRed = 0, totalGreen = 0, totalBlue = 0;
  for (int sample = 0; sample < COLOR_SAMPLE_COUNT; ++sample) {
    int red = 0, green = 0, blue = 0;
    if (!readAPDSColor(red, green, blue) || red < 0 || green < 0 || blue < 0) {
      failMission(ERR_COLOR_SENSOR);
      return OBJECT_UNKNOWN;
    }
    ++votes[(int)classifyColor(red, green, blue)];
    totalRed += red; totalGreen += green; totalBlue += blue;
  }
  ObjectColor color = OBJECT_UNKNOWN;
  for (int candidate = OBJECT_RED; candidate <= OBJECT_PURPLE; ++candidate) {
    if (votes[candidate] >= COLOR_REQUIRED_VOTES) color = (ObjectColor)candidate;
  }
  const int red = totalRed / COLOR_SAMPLE_COUNT;
  const int green = totalGreen / COLOR_SAMPLE_COUNT;
  const int blue = totalBlue / COLOR_SAMPLE_COUNT;
  Serial.print(F("Color RGB: ")); Serial.print(red); Serial.print(' ');
  Serial.print(green); Serial.print(' '); Serial.print(blue);
  Serial.print(F(" Hue: ")); Serial.print(colorHue(red * colorRedGain, green * colorGreenGain, blue * colorBlueGain));
  Serial.print(F(" -> "));
  switch (color) {
    case OBJECT_RED: Serial.println(F("RED")); break;
    case OBJECT_GREEN: Serial.println(F("GREEN")); break;
    case OBJECT_BLUE: Serial.println(F("BLUE")); break;
    case OBJECT_YELLOW: Serial.println(F("YELLOW")); break;
    case OBJECT_PURPLE: Serial.println(F("PURPLE")); break;
    default: Serial.println(F("UNKNOWN / unstable")); break;
  }
  valid = true; 
  if (color != OBJECT_UNKNOWN) {
    const CRGB colors[6] = {CRGB(0, 0, 0), CRGB(255, 0, 0), CRGB(0, 255, 0),
                            CRGB(0, 0, 255), CRGB(255, 255, 0), CRGB(128, 0, 128)};
    LbRGB.fillColor(colors[(int)color]);
    LbRGB.show();
  }
  return color;
}

ObjectColor Obj_detectColor() { bool valid; return readObjectColor(valid); }
void requireColor(ObjectColor expected) {
  bool valid;
  const ObjectColor color = readObjectColor(valid);
  if (valid && color != expected) failMission(ERR_COLOR_MISMATCH);

}

void send_iot_color(ObjectColor color) {
  switch (color) {
    case OBJECT_RED:   IoTColor.write("Red"); break;
    case OBJECT_GREEN: IoTColor.write("Green"); break;
    case OBJECT_BLUE:  IoTColor.write("Blue"); break;
    case OBJECT_YELLOW: IoTColor.write("Yellow"); break;
    case OBJECT_PURPLE: IoTColor.write("Purple"); break;
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
  else if (signal == "YELLOW") color = OBJECT_YELLOW;
  else if (signal == "PURPLE") color = OBJECT_PURPLE;
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

bool wait_iot_color(ObjectColor expected, unsigned long timeoutMs) {
  if (expected != OBJECT_RED && expected != OBJECT_GREEN && expected != OBJECT_BLUE &&
      expected != OBJECT_YELLOW && expected != OBJECT_PURPLE) {
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


void setup() {
  Leanbot.begin();
  set_line(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R); // Ngưỡng dự phòng.
  Serial.begin(115200);
  // calibrate_line(); // Bỏ chú thích để hiệu chuẩn bằng TB1A sau khi khởi động.
  // Không gọi set_line() sau calibrate_line(), tránh ghi đè ngưỡng vừa học.
  colorSensorReady = APDS.begin();
  LbDelay(300);
}

void loop() {
  LbMission.begin(TB1A + TB1B);
  followLineCm(32.5);
  LbMission.end();
}



