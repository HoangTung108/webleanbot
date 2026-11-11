

#define ROLE_SINGLE       0
#define ROLE_IOT_A        1
#define ROLE_IOT_B        2
#define MISSION_ROLE      ROLE_SINGLE

#define USE_MANUAL_LINE_CALIBRATION 0 // 1: TB1A 3-step black/white setup


#define TEST_MODE 0
// Mission assumes gripper starts empty and open.
#define OPEN_GRIPPER_AT_START 1


#include <Leanbot.h>
#include <math.h>
#include <string.h>
#include <LeanbotIoT.h>
#include <Arduino_APDS9960.h>

//Khai báo wifi kết nối cho IOT

#define WIFI_SSID     F("Tên wifi")
#define WIFI_PASSWORD F("Mật khẩu wifi")
// Replace with YOUR authorized dashboard asset, if needed.
#define IOT_ASSET_ID  F("YOUR_IOT_ASSET_ID")
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
  ERR_JUNCTION_TIMEOUT, ERR_COLOR_SENSOR, ERR_COLOR_MISMATCH, ERR_IOT_TIMEOUT
};

ErrorCode missionError = ERR_NONE;
bool junctionPending = false;
int lastLineError = 0;
int lastLineCmdL = 0;
int lastLineCmdR = 0;
unsigned long lastLineSeenTime = 0;
#if BOARD_MODE != BOARD_PRIMARY
bool colorSensorReady = false;
#endif

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

bool turn_angle(int speed, float angle_deg, TurnMode mode) {
  if (!isfinite(angle_deg) || speed < TURN_FINISH_SPEED || speed > MAX_MOTOR_SPEED ||
      mode < TWO_WHEELS || mode > RIGHT_ONLY) {
    failMission(ERR_INVALID_MOVE); return false;
  }
  if (fabsf(angle_deg) < 0.8f) return true;

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
    if (now - started > timeoutMs) { failMission(ERR_TURN_TIMEOUT); return false; }
    if (now - lastAdvance > 1700UL) { failMission(ERR_TURN_STALL); return false; }

    const float ratio = constrain((remaining - TURN_BRAKE_LEAD_DEG) / TURN_SLOW_ZONE, 0.0f, 1.0f);
    // Braking velocity follows sqrt(remaining distance). The old linear
    // envelope spent too long crawling through the last few degrees.
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
    LbDelay(MOTION_FEEDBACK_MS);
  }
  LbMotion.stopAndWait();
  return true;
}

bool turn_one_wheel(int speed, float angle, const char* info) {
  if (info == nullptr) { failMission(ERR_INVALID_MOVE); return false; }
  if (strcmp(info, "L") == 0) return turn_angle(speed, -angle, LEFT_ONLY);
  else if (strcmp(info, "R") == 0) return turn_angle(speed, angle, RIGHT_ONLY);
  else { failMission(ERR_INVALID_MOVE); return false; }
}
bool turn_two_wheels(int speed, float angle) {
  return turn_angle(speed, angle, TWO_WHEELS);
}

bool move_tank(int motor_L, int motor_R, float distance_cm) {
  if (!isfinite(distance_cm) || distance_cm < 0.0f ||
      motor_L == 0 || motor_R == 0 || signInt(motor_L) != signInt(motor_R)) {
    failMission(ERR_INVALID_MOVE); return false;
  }
  if (distance_cm == 0.0f) return true;
  const float targetMm = distance_cm * 10.0f * DISTANCE_SCALE;
  if (!isfinite(targetMm) || targetMm > 12000.0f) { failMission(ERR_INVALID_MOVE); return false; }

  motor_L = clampMotor(motor_L);
  motor_R = clampMotor(motor_R);
  const int direction = signInt(motor_L);
  const int targetL = (int)lroundf(fabsf((float)motor_L) * LEFT_SCALE);
  const int targetR = (int)lroundf(fabsf((float)motor_R) * RIGHT_SCALE);
  const int maxMagnitude = max(targetL, targetR);
  if (maxMagnitude < MOVE_FINISH_SPEED) { failMission(ERR_INVALID_MOVE); return false; }

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
    if (now - started > timeoutMs) { failMission(ERR_MOVE_TIMEOUT); return false; }
    if (now - lastAdvance > 1800UL) { failMission(ERR_MOVE_STALL); return false; }

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
    LbDelay(MOTION_FEEDBACK_MS);
  }
  LbMotion.stopAndWait();
  return true;
}

void close_hand(int degree) {
  const int angle = constrain(degree, -30, 120);
  LbGripper.moveToLR(angle, angle, GRIP_MOVE_MS);
  LbDelay(GRIP_MOVE_MS + GRIP_SETTLE_MS);
}
void open_hand() {
  LbGripper.moveToLR(0, 0, GRIP_MOVE_MS);
  LbDelay(GRIP_MOVE_MS + GRIP_SETTLE_MS);
}

void set_wifi(string )

bool Forward(int speed, int distanceMm) {
  return move_tank(abs(speed), abs(speed), distanceMm / 10.0f);
}
bool Backward(int speed, int distanceMm) {
  return move_tank(-abs(speed), -abs(speed), distanceMm / 10.0f);
}
bool Rotate(int speed, float angleDeg) {
  return turn_two_wheels(abs(speed), ((speed >= 0) ? 1.0f : -1.0f) * angleDeg);
}


static int lineErrorForMask(int mask) {
  switch (mask) {
    case 0b1000: return -3;
    case 0b1100: return -2;
    case 0b0100: return -1;
    case 0b1110: return -1;
    case 0b0110: return  0;
    case 0b1111: return  0;
    case 0b0010: return  1;
    case 0b0111: return  1;
    case 0b0011: return  2;
    case 0b0001: return  3;
    default: return lastLineError;
  }
}

bool runFollowLine(int bits) {
  if (bits != 0) {
    lastLineSeenTime = millis();
    lastLineError = lineErrorForMask(bits);
  } else if (millis() - lastLineSeenTime >= LINE_LOST_MS) {
    failMission(ERR_LINE_LOST); return false;
  }
  const int correction = LINE_KP * lastLineError;
  const int desiredL = constrain(LINE_SPEED + correction, 100, 1250);
  const int desiredR = constrain(LINE_SPEED - correction, 100, 1250);
  lastLineCmdL += constrain(desiredL - lastLineCmdL, -110, 110);
  lastLineCmdR += constrain(desiredR - lastLineCmdR, -110, 110);
  LbMotion.runLR(lastLineCmdL, lastLineCmdR);
  return true;
}
bool runFollowLine() { return runFollowLine(LbIRLine.read()); }

bool followLineUntilJunction() {
  resetMotionState();
  const unsigned long started = millis();
  const long origin = LbMotion.getDistanceMm();
  bool armed = false;
  int clearFrames = 0, crossingFrames = 0;

  while (true) {
    const unsigned long now = millis();
    const float advanced = fabsf((float)LbMotion.getDistanceMm() - origin);
    if (now - started > LINE_JUNCTION_TIMEOUT_MS || advanced > LINE_JUNCTION_LIMIT_MM) {
      failMission(ERR_JUNCTION_TIMEOUT); break;
    }
    const int bits = LbIRLine.read();
    // Ignore the starting intersection, require a clear segment first.
    if (!armed) {
      if (advanced >= LINE_JUNCTION_SKIP_MM && bits != 0b1111 && bits != 0) {
        if (++clearFrames >= 3) armed = true;
      } else clearFrames = 0;
    } else {
      if (bits == 0b1111) {
        if (++crossingFrames >= 3) {
          LbMotion.stopAndWait();
          junctionPending = true;
          resetMotionState();
          return true;
        }
      } else crossingFrames = 0;
    }
    if (!runFollowLine(bits)) return false;
    LbDelay((unsigned int)LINE_STEP_MS);
  }
  LbMotion.stopAndWait();
  return false;
}

bool centerDetectedJunction() {
  if (!junctionPending) return true;
  junctionPending = false;
  return move_tank(450, 450, JUNCTION_CENTER_MM / 10.0f);
}

bool followLineMultipleJunctions(int junctionCount) {
  if (junctionCount <= 0) return false;
  for (int i = 0; i < junctionCount; ++i) {
    if (i > 0 && !centerDetectedJunction()) return false;
    if (!followLineUntilJunction()) return false;
  }
  return true;
}

bool goToJunction() {
  if (!junctionPending && !followLineUntilJunction()) return false;
  return centerDetectedJunction();
}

bool followLineDistance(int distanceMm) {
  if (distanceMm < 0) return false;
  resetMotionState();
  long origin = LbMotion.getDistanceMm();
  unsigned long started = millis();
  while ((long)LbMotion.getDistanceMm() - origin < distanceMm) {
    if (millis() - started > 9000UL) { failMission(ERR_JUNCTION_TIMEOUT); return false; }
    if (!runFollowLine()) return false;
    LbDelay((unsigned int)LINE_STEP_MS);
  }
  LbMotion.stopAndWait();
  resetMotionState();
  return true;
}


enum ObjectColor { OBJECT_UNKNOWN, OBJECT_RED, OBJECT_GREEN, OBJECT_BLUE };

bool readAPDSUnderLight(CRGB light, int &r, int &g, int &b) {
  LbRGB.fillColor(light); LbRGB.show(); LbDelay(35);
  const unsigned long started = millis();
  while (!APDS.colorAvailable()) {
    if (millis() - started > 850UL) return false;
    LbDelay(5);
  }
  APDS.readColor(r, g, b);
  return true;
}

ObjectColor Obj_detectColor() {
  if (!colorSensorReady) { failMission(ERR_COLOR_SENSOR); return OBJECT_UNKNOWN; }
  int rRed=0, gGreen=0, bBlue=0, r=0,g=0,b=0;
  int ambientR=0, ambientG=0, ambientB=0;
  const int saved = LbRGB.getBrightness();
  LbRGB.setBrightness(255);
  bool good = readAPDSUnderLight(CRGB::Red, rRed, g, b);
  if (good) good = readAPDSUnderLight(CRGB::Lime, r, gGreen, b);
  if (good) good = readAPDSUnderLight(CRGB::Blue, r, g, bBlue);
  if (good) good = readAPDSUnderLight(CRGB::Black, ambientR, ambientG, ambientB);
  LbRGB.setBrightness(saved);
  if (!good) { failMission(ERR_COLOR_SENSOR); return OBJECT_UNKNOWN; }
  const int red = max(0, rRed - ambientR);
  const int green = max(0, gGreen - ambientG);
  const int blue = max(0, bBlue - ambientB);
#if DEBUG_SERIAL
  Serial.print(F("Color RGB: ")); Serial.print(red); Serial.print(' ');
  Serial.print(green); Serial.print(' '); Serial.println(blue);
#endif
  ObjectColor color = OBJECT_UNKNOWN;
  if (red > 3 && red >= green + 2 && red >= blue + 2) color = OBJECT_RED;
  if (green > 3 && green >= red + 2 && green >= blue + 2) color = OBJECT_GREEN;
  if (blue > 3 && blue >= red + 2 && blue >= green + 2) color = OBJECT_BLUE;
  if (color == OBJECT_RED) LbRGB.fillColor(CRGB::Red);
  else if (color == OBJECT_GREEN) LbRGB.fillColor(CRGB::Green);
  else if (color == OBJECT_BLUE) LbRGB.fillColor(CRGB::Blue);
  else LbRGB.fillColor(CRGB(50, 50, 50));
  LbRGB.show();
  return color;
}

bool requireColor(ObjectColor expected) {
  if (Obj_detectColor() != expected) { failMission(ERR_COLOR_MISMATCH); return false; }
  return true;
}

// Primary XML has NO object-color checks in its Fullmision.
bool requireColor(ObjectColor) { return true; }





// ----- SECONDARY / HIGHSCHOOL: optional 2-LeanBot IoT flow -----
#if MISSION_ROLE != ROLE_SINGLE
bool missionIotA() {
  STEP(FromCRLtoE2());
  const ObjectColor color = Obj_detectColor();
  if (color == OBJECT_BLUE) IoTColor.write("Blue");
  else { IoTColor.write("Unknown"); failMission(ERR_COLOR_MISMATCH); return false; }
  // Source Fullmision_LeanbotA route, distinct from standalone.
  STEP(Rotate(500,50)); STEP(Backward(ROUTE_SPEED,25)); STEP(Rotate(-ROUTE_SPEED,83));
  STEP(followLineMultipleJunctions(3)); STEP(goToJunction());
  STEP(Rotate(ROUTE_SPEED,60)); STEP(followLineMultipleJunctions(1)); STEP(goToJunction());
  STEP(Rotate(ROUTE_SPEED,33)); STEP(Forward(ROUTE_SPEED,25));
  STEP(requireColor(OBJECT_GREEN)); STEP(Rotate(500,50));
  return true;
}
bool waitIotBlue() {
  const unsigned long started = millis();
  while (millis() - started < 30000UL) {
    String color = IoTColor.read();
    if (color == "Blue" || color == "BLUE") return true;
    if (color == "Unknown" || color == "Red" || color == "Green") {
      failMission(ERR_COLOR_MISMATCH); return false;
    }
    LbDelay(250);
  }
  failMission(ERR_IOT_TIMEOUT); return false;
}
bool missionIotB() {
  STEP(waitIotBlue());
  // Source Fullmission_LeanbotB route, with bounded wait.
  STEP(Forward(ROUTE_SPEED,65)); STEP(Rotate(-ROUTE_SPEED,61)); STEP(Forward(ROUTE_SPEED,50));
  STEP(PickupNeutralizeS3()); STEP(Backward(ROUTE_SPEED,50)); STEP(Rotate(-ROUTE_SPEED,155));
  STEP(followLineMultipleJunctions(2)); STEP(goToJunction());
  STEP(Rotate(-ROUTE_SPEED,60)); STEP(followLineMultipleJunctions(1)); STEP(goToJunction());
  STEP(Rotate(ROUTE_SPEED,60)); STEP(Forward(ROUTE_SPEED,40)); STEP(DropNeutralizeE2());
  STEP(Backward(ROUTE_SPEED,40)); STEP(Rotate(ROUTE_SPEED,60));
  STEP(followLineMultipleJunctions(1)); STEP(goToJunction());
  STEP(Rotate(-ROUTE_SPEED,60)); STEP(followLineMultipleJunctions(2)); STEP(goToJunction());
  STEP(Rotate(ROUTE_SPEED,60)); STEP(followLineMultipleJunctions(1)); STEP(goToJunction());
  STEP(Rotate(-ROUTE_SPEED,33)); STEP(Forward(ROUTE_SPEED,24));
  STEP(requireColor(OBJECT_RED)); STEP(PickupPollutionF4());
  STEP(Backward(ROUTE_SPEED,24)); STEP(Rotate(ROUTE_SPEED,33));
  STEP(followLineMultipleJunctions(1)); STEP(goToJunction());
  STEP(Rotate(ROUTE_SPEED,60)); STEP(followLineMultipleJunctions(2)); STEP(goToJunction());
  STEP(Rotate(ROUTE_SPEED,30)); STEP(DropPollutionCRL()); return true;
}
#endif

void setup() {
  Leanbot.begin();
#if DEBUG_SERIAL
  Serial.begin(115200);
  Serial.println(F("Synapse City Full Mission"));
#endif
#if USE_MANUAL_LINE_CALIBRATION
  LbIRLine.doManualCalibration(TB1A);
#else
  LbIRLine.setThreshold(IR_TH_2L, IR_TH_0L, IR_TH_1R, IR_TH_3R);
#endif
#if BOARD_MODE != BOARD_PRIMARY
  colorSensorReady = APDS.begin();
#if DEBUG_SERIAL
  Serial.print(F("APDS ready: ")); Serial.println(colorSensorReady ? F("YES") : F("NO"));
#endif
#endif
#if MISSION_ROLE != ROLE_SINGLE
  LbIoT.Wifi.begin(WIFI_SSID, WIFI_PASSWORD);
  LbIoT.Asset.begin(IOT_ASSET_ID);
  if (MISSION_ROLE == ROLE_IOT_A) IoTColor.write("waiting");
#endif
  LbDelay(300);
}

void loop() {
  // Always wait for BOTH touch buttons before executing a mission.
  LbMission.begin(TB1A + TB1B);
  missionError = ERR_NONE;
  junctionPending = false;
  resetMotionState();
  bool finished = false;
#if TEST_MODE == 0 && OPEN_GRIPPER_AT_START && MISSION_ROLE != ROLE_IOT_A
  open_hand();
#endif
#if BOARD_MODE != BOARD_PRIMARY
  // Tests 1..3 must still work even if the APDS module is disconnected.
  if (!colorSensorReady && (TEST_MODE == 0 || TEST_MODE == 4)) {
    failMission(ERR_COLOR_SENSOR);
  } else
#endif
  {
#if TEST_MODE != 0
    finished = runHardwareTest();
#elif MISSION_ROLE == ROLE_IOT_A
    IoTColor.write("waiting");
    finished = missionIotA();
#elif MISSION_ROLE == ROLE_IOT_B
    finished = missionIotB();
#elif BOARD_MODE == BOARD_PRIMARY
    finished = missionPrimaryFull();
#else
    finished = missionSecondaryOrHighSchoolSingle();
#endif
  }
  LbMotion.stopAndWait();
  if (finished && missionError == ERR_NONE) {
    LbRGB.fillColor(CRGB::Green);
    LbRGB.show();
#if DEBUG_SERIAL
    Serial.println(F("MISSION COMPLETE"));
#endif
  } else {
    LbRGB.fillColor(CRGB::Red);
    LbRGB.show();

  }
  LbMission.end();
}



