
#include <Leanbot.h>
#include <math.h>
#include <string.h>
#include <LeanbotIoT.h>
#include <Arduino_APDS9960.h>


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

void failMission(ErrorCode code) {
  if (missionError == ERR_NONE) missionError = code;
  LbMotion.stopAndWait();
  Serial.print(F("MISSION ERROR: "));
  Serial.println(code);
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
  Serial.begin(115200);
  colorSensorReady = APDS.begin();
  LbDelay(300);
}

void loop() {
  // bool valid = false;
  // ObjectColor color = readObjectColor(valid);
  // Serial.print(color);
  // LbMission.begin(TB1A + TB1B);
  // bool valid = false;
  // ObjectColor color = readObjectColor(valid);
  // // if (valid) send_iot_color(color);
  // LbMission.end();
}



