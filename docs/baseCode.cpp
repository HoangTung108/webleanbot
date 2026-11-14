
#define BASE_USE_COLOR 1

#include <Leanbot.h>
#include <stdint.h>
#include <math.h>
#include <Arduino_APDS9960.h>

struct LbmbState { uint32_t timeMs; int32_t distanceMm; uint8_t lineState; int16_t ir2L, ir0L, ir1R, ir3R; };
struct LbmbCommand { int16_t leftSpeed, rightSpeed; bool isDone; };
struct LbmbFollowCtx {
  int32_t startDist; uint32_t startTime, lastTime, lastValidTime, lastProgressTime; int32_t maxProgress;
  float baseSpeed, baseAccel, prevError, filteredDerivative, integral;
  int16_t outLeft, outRight;
  bool hasValidError, lineLocked, sharpTurn; uint8_t centeredCount, markerCount;
};

inline void lbmbFollowCoreInit(LbmbFollowCtx* ctx, const LbmbState* state);
inline LbmbCommand lbmbFollowCoreStep(LbmbFollowCtx* ctx, const LbmbState* state, float speedPercent, uint8_t mode, float targetVal);
inline LbmbState lbmbReadState();

enum ObjectColor { UNKNOWN, RED, GREEN, BLUE, YELLOW, PURPLE };
ObjectColor lastMeasuredColor = UNKNOWN;
ObjectColor read_color();
int measure_line();
void measure_line_values();

#if BASE_USE_COLOR
const unsigned long COLOR_EXPOSURE_MS = 35UL;
const unsigned long COLOR_READY_TIMEOUT_MS = 850UL;
const int COLOR_MIN_CHANNEL = 4;
const int COLOR_SATURATION_DIVISOR = 5;
const int32_t COLOR_RED_YELLOW_HUE = 25, COLOR_YELLOW_GREEN_HUE = 80, COLOR_GREEN_BLUE_HUE = 170;
const int32_t COLOR_BLUE_PURPLE_HUE = 250, COLOR_PURPLE_RED_HUE = 345;
static ObjectColor classifyColor(int red, int green, int blue);
#endif

const float DISTANCE_SCALE = 1.00625f;
const float LEFT_SCALE = 1.0f, RIGHT_SCALE = 1.0f, TURN_TWO_SCALE = 1.0f;
const int MAX_MOTOR_SPEED = 2000, MOVE_START_SPEED = 165, MOVE_FINISH_SPEED = 165;
const float MOVE_ACCEL = 22000.0f, MOVE_DECEL = 2600.0f;
const float MOVE_MM_PER_STEP = 65.0f * DISTANCE_SCALE / MAX_MOTOR_SPEED;
const float MOVE_HEADING_KP = 25.0f, MOVE_HEADING_KI = 6.0f, MOVE_HEADING_KD = 1.5f;

const int TURN_FINISH_SPEED = 120;
const float TURN_SLOW_ZONE = 35.0f, TURN_BRAKE_LEAD_DEG = 0.5f;
const int TURN_ACCEL_INCREMENT = 72;
const float TURN_PRECISION_SPEED_PER_DEG = 40.0f;
const unsigned long TURN_RAMP_MS = 10UL, MOTION_FEEDBACK_MS = 1UL;

const int LINE_SPEED = 2000, LINE_STEERING_SIGN = 1;
const unsigned long LINE_STEP_MS = 10UL;
const float JUNCTION_CENTER_MM = 20.0f;

const int IR_TH_2L = 69, IR_TH_0L = 145, IR_TH_1R = 130, IR_TH_3R = 60;
const uint16_t LBMB_TICK_MS = 10;
const int16_t LBMB_START_SPEED = 200, LBMB_SEARCH_SPEED_MAX = 650, LBMB_ACQUIRE_SPEED_MAX = 600, LBMB_CURVE_SPEED_MAX = 1000;
const float LBMB_FLL_ACCEL = 6500.0f, LBMB_FLL_DECEL = 6500.0f, LBMB_FLL_JERK = 60000.0f;
const int32_t LBMB_WHEEL_ACCEL = 12000, LBMB_WHEEL_DECEL = 15000;
const float LBMB_FLL_KP = 900.0f, LBMB_FLL_KI = 110.0f, LBMB_FLL_KD = 6.0f;
const float LBMB_FLL_MAX_I = 0.60f, LBMB_FLL_D_ALPHA = 0.22f;
const float LBMB_FLL_MAX_STEER_RATIO = 0.92f, LBMB_FLL_ERROR_SLOWDOWN = 0.48f;
const float LBMB_FLL_D_SLOWDOWN = 0.010f, LBMB_FLL_MIN_FACTOR = 0.42f;

bool junctionPending = false;
float lastLineError = 0.0f;
unsigned long lastLineControlTime = 0;
bool lineControlReady = false;
bool colorSensorReady = false;
bool missionArmed = false;
byte missionButtons = 0;
unsigned long missionButtonChangedAt = 0;

static int clampMotor(int v) { return constrain(v, -MAX_MOTOR_SPEED, MAX_MOTOR_SPEED); }
static int signInt(int n) { return (n > 0) - (n < 0); }
void resetMotionState() { lastLineError = 0; lineControlReady = false; lastLineControlTime = millis(); }
void close_hand(int d) { LbGripper.moveTo(d); }
void open_hand() { LbGripper.moveTo(0); }
void robot_delay(unsigned long d) { LbDelay(d); }

void turn_two_wheels(int speed, float angle_deg) {
  if (!isfinite(angle_deg) || speed < TURN_FINISH_SPEED || speed > MAX_MOTOR_SPEED) { LbMotion.stopAndWait(); return; }
  if (fabsf(angle_deg) < 0.8f) return;
  LbMotion.stopAndWait(); resetMotionState(); speed = min(speed, 2000);
  const float target = fabsf(angle_deg) * TURN_TWO_SCALE;
  const int direction = angle_deg > 0.0f ? 1 : -1;
  const auto origin = LbMotion.getRotationDeg();
  unsigned long started = millis(), lastAdvance = started, lastRamp = started;
  float bestProgress = 0.0f;
  int currentSpeed = TURN_FINISH_SPEED, previousSpeed = -1;
  const unsigned long timeoutMs = 3500UL + (unsigned long)(target * 90.0f);
  while (true) {
    const float progress = (float)(LbMotion.getRotationDeg() - origin) * direction;
    if (progress - TURN_BRAKE_LEAD_DEG >= target) break;
    const unsigned long now = millis();
    if (progress > bestProgress + 0.5f) { bestProgress = progress; lastAdvance = now; }
    if (now - started > timeoutMs || now - lastAdvance > 1700UL) { LbMotion.stopAndWait(); return; }
    const float remaining = target - progress;
    const float ratio = constrain((remaining - TURN_BRAKE_LEAD_DEG) / TURN_SLOW_ZONE, 0.0f, 1.0f);
    const int fastLimit = TURN_FINISH_SPEED + (int)lroundf((speed - TURN_FINISH_SPEED) * sqrtf(ratio));
    const int precisionLimit = TURN_FINISH_SPEED + (int)lroundf(max(0.0f, remaining - TURN_BRAKE_LEAD_DEG) * TURN_PRECISION_SPEED_PER_DEG);
    const int allowedSpeed = min(speed, min(fastLimit, precisionLimit));
    if (currentSpeed > allowedSpeed) currentSpeed = allowedSpeed;
    else if (now - lastRamp >= TURN_RAMP_MS) { currentSpeed = min(currentSpeed + TURN_ACCEL_INCREMENT, allowedSpeed); lastRamp = now; }
    if (currentSpeed != previousSpeed) {
      LbMotion.runLR(direction * currentSpeed, -direction * currentSpeed);
      previousSpeed = currentSpeed;
    }
    robot_delay(MOTION_FEEDBACK_MS);
  }
  LbMotion.stopAndWait();
}

void move_tank(int motor_L, int motor_R, float distance_cm) {
  if (!isfinite(distance_cm) || distance_cm < 0.0f || motor_L == 0 || motor_R == 0 || signInt(motor_L) != signInt(motor_R)) {
    LbMotion.stopAndWait(); return;
  }
  if (distance_cm == 0.0f) return;
  const float targetMm = distance_cm * 10.0f * DISTANCE_SCALE;
  if (!isfinite(targetMm) || targetMm > 12000.0f) { LbMotion.stopAndWait(); return; }
  motor_L = clampMotor(motor_L); motor_R = clampMotor(motor_R);
  const int direction = signInt(motor_L);
  const int targetL = (int)lroundf(fabsf((float)motor_L) * LEFT_SCALE);
  const int targetR = (int)lroundf(fabsf((float)motor_R) * RIGHT_SCALE);
  const int maxMag = max(targetL, targetR);
  if (maxMag < MOVE_FINISH_SPEED) { LbMotion.stopAndWait(); return; }
  LbMotion.stopAndWait(); resetMotionState();
  const auto originDist = LbMotion.getDistanceMm();
  const auto originRot = LbMotion.getRotationDeg();
  unsigned long started = millis(), lastAdvance = started, lastControl = started;
  float bestProgress = 0.0f, currentMag = min(MOVE_START_SPEED, maxMag);
  float integral = 0.0f, previousError = 0.0f, derivative = 0.0f;
  int previousL = 32767, previousR = 32767;
  const unsigned long timeoutMs = 3500UL + (unsigned long)(targetMm * 60.0f);
  while (true) {
    const float progressed = (float)(LbMotion.getDistanceMm() - originDist) * direction;
    const float remaining = targetMm - progressed;
    if (remaining <= 0.0f) break;
    const unsigned long now = millis();
    if (progressed > bestProgress + 1.0f) { bestProgress = progressed; lastAdvance = now; }
    if (now - started > timeoutMs || now - lastAdvance > 1800UL) { LbMotion.stopAndWait(); return; }
    const float dt = min((now - lastControl) * 0.001f, 0.05f);
    lastControl = now;
    const float brakeSpeed = sqrtf((float)MOVE_FINISH_SPEED * MOVE_FINISH_SPEED + 2.0f * MOVE_DECEL * remaining / MOVE_MM_PER_STEP);
    const float allowed = min((float)maxMag, brakeSpeed);
    if (currentMag < allowed) currentMag = min(currentMag + MOVE_ACCEL * dt, allowed);
    else currentMag = max(currentMag - MOVE_DECEL * dt, allowed);
    const float magRatio = (float)currentMag / (float)maxMag;
    const float baseL = targetL * magRatio, baseR = targetR * magRatio;
    const float error = (float)(LbMotion.getRotationDeg() - originRot);
    if (dt > 0.0f) derivative += dt / (0.05f + dt) * ((error - previousError) / dt - derivative);
    previousError = error;
    const float limit = min(300.0f, min(baseL, baseR) * 0.8f);
    const float candidateI = constrain(integral + error * dt, -30.0f, 30.0f);
    const float candidate = MOVE_HEADING_KP * error + MOVE_HEADING_KI * candidateI + MOVE_HEADING_KD * derivative;
    if ((candidate >= -limit && candidate <= limit) || (candidate > limit && error < 0.0f) || (candidate < -limit && error > 0.0f)) integral = candidateI;
    const float correction = constrain(MOVE_HEADING_KP * error + MOVE_HEADING_KI * integral + MOVE_HEADING_KD * derivative, -limit, limit);
    float left = direction * baseL - correction, right = direction * baseR + correction;
    const float peak = max(fabsf(left), fabsf(right));
    if (peak > MAX_MOTOR_SPEED) { left *= MAX_MOTOR_SPEED / peak; right *= MAX_MOTOR_SPEED / peak; }
    const int vL = clampMotor((int)lroundf(left));
    const int vR = clampMotor((int)lroundf(right));
    if (vL != previousL || vR != previousR) { LbMotion.runLR(vL, vR); previousL = vL; previousR = vR; }
    robot_delay(MOTION_FEEDBACK_MS);
  }
  LbMotion.stopAndWait();
}

void set_line(int l2, int l0, int r1, int r3) { LbIRLine.setThreshold(l2, l0, r1, r3); }
int measure_line() { LbIRLine.read(); return (int)LbIRLine.value() & 0x0F; }
void print_line() { Serial.println(measure_line()); }
void measure_line_values() {
  Serial.print(F("IR: ")); Serial.print(LbIRArray.read(ir2L)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir0L)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir1R)); Serial.print(' ');
  Serial.print(LbIRArray.read(ir3R)); Serial.print(F(" m:")); Serial.println(measure_line());
}
void calibrate_line() {
  LbMotion.stopAndWait(); resetMotionState(); junctionPending = false;
  LbIRLine.doManualCalibration(TB1A); resetMotionState();
}

inline int32_t lbmbAbs32(int32_t x) { return x < 0 ? -x : x; }
inline float lbmbAbsF(float x) { return x < 0.0f ? -x : x; }
inline int16_t lbmbMin16(int16_t a, int16_t b) { return a < b ? a : b; }
inline int16_t lbmbClamp16(int32_t v, int16_t mn, int16_t mx) { if (v < mn) return mn; if (v > mx) return mx; return (int16_t)v; }
inline int32_t lbmbMin32(int32_t a, int32_t b) { return a < b ? a : b; }
inline int32_t lbmbMax32(int32_t a, int32_t b) { return a > b ? a : b; }
inline float lbmbClampF(float v, float mn, float mx) { if (v < mn) return mn; if (v > mx) return mx; return v; }
inline float lbmbDtSec(uint32_t n, uint32_t b) { uint32_t d = n - b; if (d < 2) d = 2; if (d > 50) d = 50; return (float)d * 0.001f; }

inline int16_t lbmbTargetSpeedFromPercent(float sp) {
  float m = fabs(sp); if (m > 100.0f) m = 100.0f;
  int32_t s = (int32_t)lroundf(m * 20.0f); if (s < 20) s = 20; if (s > 2000) s = 2000;
  return (int16_t)s;
}
inline int16_t lbmbInitialSpeed(int16_t ts) { return lbmbMin16(ts, LBMB_START_SPEED); }
inline int16_t lbmbWheelSlew(int16_t cur, int16_t tar, uint32_t dt) {
  if (dt < 1) dt = 1; if (dt > 50) dt = 50;
  bool rev = (cur > 0 && tar < 0) || (cur < 0 && tar > 0);
  bool acc = !rev && lbmbAbs32(tar) > lbmbAbs32(cur);
  int32_t r = acc ? LBMB_WHEEL_ACCEL : LBMB_WHEEL_DECEL;
  int32_t del = r * (int32_t)dt / 1000; if (del < 1) del = 1;
  if (tar > cur) return (int16_t)lbmbMin32((int32_t)cur + del, tar);
  if (tar < cur) return (int16_t)lbmbMax32((int32_t)cur - del, tar);
  return cur;
}

inline float lbmbProfileStep(float* s, float* a, float ts, float ma, float md, float mj, float dt) {
  ts = lbmbClampF(ts, 0.0f, 2000.0f);
  float e = ts - *s; if (lbmbAbsF(e) < 0.5f) { *s = ts; *a = 0.0f; return *s; }
  float da = e > 0.0f ? ma : -md;
  float mda = mj * dt;
  float ad = da - *a;
  ad = lbmbClampF(ad, -mda, mda);
  *a += ad;
  float n = *s + (*a * dt);
  if ((e > 0.0f && n >= ts) || (e < 0.0f && n <= ts)) { n = ts; *a = 0.0f; }
  if (n < 0.0f) { n = 0.0f; *a = 0.0f; }
  if (n > 2000.0f) { n = 2000.0f; *a = 0.0f; }
  *s = n; return n;
}

inline int32_t lbmbMoveBrakeMm(int16_t ts) { int32_t m = ts / 40 + 10; if (m < 15) m = 15; if (m > 60) m = 60; return m; }
inline float lbmbBrakeEnvelope(int32_t rem, int32_t bz, int16_t ts) {
  int16_t ms = lbmbInitialSpeed(ts);
  if (rem >= bz || bz <= 0) return ts;
  float f = (float)rem / (float)bz;
  f = lbmbClampF(f, 0.0f, 1.0f); float s = sqrtf(f);
  return (float)ms + ((float)ts - ms) * s;
}
inline bool lbmbIsLineValid(uint8_t st) { return (st & 0x0F) != 0; }
inline int16_t lbmbDiscreteLineError1000(uint8_t st, int16_t pe) {
  switch (st) {
    case 0b1000: return -3000; case 0b1100: return -2000;
    case 0b0100: case 0b1110: return -1000;
    case 0b0110: case 0b1111: return 0;
    case 0b0010: case 0b0111: return 1000;
    case 0b0011: return 2000; case 0b0001: return 3000;
    default: return pe;
  }
}

inline int16_t lbmbLinePosition1000(const LbmbState* st, int16_t fe) {
  uint8_t m = st->lineState & 0x0F;
  if (m == 0) return fe;
  if (m == 0x0F) return 0;
  if (m == 0b1001) return fe;
  int32_t v2 = st->ir2L, v0 = st->ir0L, v1 = st->ir1R, v3 = st->ir3R;
  int32_t fl = lbmbMin32(lbmbMin32(lbmbMin32(v2, v0), v1), v3);
  int32_t w2 = v2 - fl, w0 = v0 - fl, w1 = v1 - fl, w3 = v3 - fl;
  if (w2 < 0 || !(m & 0b1000)) w2 = 0;
  if (w0 < 0 || !(m & 0b0100)) w0 = 0;
  if (w1 < 0 || !(m & 0b0010)) w1 = 0;
  if (w3 < 0 || !(m & 0b0001)) w3 = 0;
  int32_t su = w2 + w0 + w1 + w3;
  if (su < 24) return lbmbDiscreteLineError1000(st->lineState, fe);
  int32_t wd = (-3000L * w2) + (-1000L * w0) + (1000L * w1) + (3000L * w3);
  return lbmbClamp16(wd / su, -3000, 3000);
}
inline bool lbmbCheckMarker(uint8_t st, uint8_t md) {
  if (md == 1) return (st & 0b1100) == 0b1100 && (st & 0b0001) == 0;
  if (md == 2) return (st & 0b0011) == 0b0011 && (st & 0b1000) == 0;
  if (md == 3) return st == 0b1111; return false;
}

inline void lbmbFollowCoreInit(LbmbFollowCtx* ctx, const LbmbState* st) {
  ctx->startDist = st->distanceMm;
  ctx->startTime = st->timeMs;
  ctx->lastTime = st->timeMs;
  ctx->lastValidTime = st->timeMs;
  ctx->lastProgressTime = st->timeMs;
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
}

inline LbmbCommand lbmbFollowCoreStep(LbmbFollowCtx* ctx, const LbmbState* st, float sp, uint8_t md, float tv) {
  LbmbCommand c = {0, 0, true};
  if (isnan(sp) || sp <= 0.0f) return c;
  const int16_t ts = lbmbTargetSpeedFromPercent(sp);
  const uint32_t eo = st->timeMs - ctx->startTime;
  if (eo >= 600000UL) return c;
  int32_t tm = 0; uint32_t tmms = 0;
  if (md == 4) { if (tv <= 0.0f || isnan(tv)) return c; tm = (int32_t)lroundf(tv * 10.0f); }
  else if (md == 5) { if (tv <= 0.0f || isnan(tv)) return c; tmms = (uint32_t)lroundf(tv * 1000.0f); }
  if (md <= 3) {
    if (lbmbCheckMarker(st->lineState, md)) { if (ctx->markerCount < 255) ctx->markerCount++; if (ctx->markerCount >= 3) return c; }
    else ctx->markerCount = 0;
    if (eo >= 60000UL) return c;
  }
  int32_t dp = lbmbAbs32(st->distanceMm - ctx->startDist);
  if (md == 4) {
    if (dp > ctx->maxProgress) { ctx->maxProgress = dp; ctx->lastProgressTime = st->timeMs; }
    if (dp >= tm) return c;
    if (!lbmbIsLineValid(st->lineState)) ctx->lastProgressTime = st->timeMs;
    if (st->timeMs - ctx->lastProgressTime >= 900) return c;
  }
  if (md == 5 && eo >= tmms) return c;
  const bool lv = lbmbIsLineValid(st->lineState);
  if (lv) ctx->lastValidTime = st->timeMs;
  const uint32_t ll = ctx->hasValidError ? 2500 : 3500;
  if (st->timeMs - ctx->lastValidTime >= ll) return c;
  const float dt = lbmbDtSec(st->timeMs, ctx->lastTime);
  uint32_t dtms = st->timeMs - ctx->lastTime;
  if (dtms < 1) dtms = 1; if (dtms > 50) dtms = 50;
  ctx->lastTime = st->timeMs;
  if (!lv) {
    ctx->lineLocked = false;
    ctx->sharpTurn = false;
    ctx->centeredCount = 0;
  }
  if (!lv) {
    const int16_t sr = lbmbMin16(ts, LBMB_SEARCH_SPEED_MAX);
    const bool srr = ctx->hasValidError ? ctx->prevError > 0.0f : eo >= 700U && eo < 2100U;
    const int16_t tl = srr ? sr : -sr;
    ctx->outLeft = lbmbWheelSlew(ctx->outLeft, tl, dtms);
    ctx->outRight = lbmbWheelSlew(ctx->outRight, -tl, dtms);
    c.leftSpeed = ctx->outLeft;
    c.rightSpeed = ctx->outRight;
    c.isDone = false;
    return c;
  }
  const int16_t fb = (int16_t)lroundf(ctx->prevError * 3000.0f);
  const int16_t pos = lbmbLinePosition1000(st, fb);
  float er = (float)pos / 3000.0f;
  er = lbmbClampF(er, -1.0f, 1.0f);
  if (!ctx->hasValidError) {
    ctx->prevError = er;
    ctx->filteredDerivative = 0.0f;
    ctx->integral = 0.0f;
    ctx->hasValidError = true;
  }
  if (lbmbAbsF(er) < 0.30f) { if (ctx->centeredCount < 5) ctx->centeredCount++; if (ctx->centeredCount >= 5) ctx->lineLocked = true; }
  else ctx->centeredCount = 0;
  if (lbmbAbsF(er) >= 0.75f) ctx->sharpTurn = true;
  else if (lbmbAbsF(er) <= 0.45f) ctx->sharpTurn = false;
  float rdr = (er - ctx->prevError) / dt;
  ctx->filteredDerivative += LBMB_FLL_D_ALPHA * (rdr - ctx->filteredDerivative);
  if (lbmbAbsF(er) < 0.05f) ctx->integral *= 0.90f;
  if ((er > 0.0f && ctx->prevError < 0.0f) || (er < 0.0f && ctx->prevError > 0.0f)) ctx->integral *= 0.55f;
  float ci = ctx->integral + er * dt;
  ci = lbmbClampF(ci, -LBMB_FLL_MAX_I, LBMB_FLL_MAX_I);
  const float cv = LBMB_FLL_ERROR_SLOWDOWN * lbmbAbsF(er) + LBMB_FLL_D_SLOWDOWN * lbmbAbsF(ctx->filteredDerivative);
  float sf = 1.0f - cv;
  sf = lbmbClampF(sf, LBMB_FLL_MIN_FACTOR, 1.0f);
  float db = ts * sf;
  const int16_t mb = lbmbInitialSpeed(ts);
  if (db < mb) db = mb;
  if (!ctx->lineLocked && db > LBMB_ACQUIRE_SPEED_MAX) db = LBMB_ACQUIRE_SPEED_MAX;
  if (ctx->sharpTurn && db > LBMB_CURVE_SPEED_MAX) db = LBMB_CURVE_SPEED_MAX;
  if (md == 4) {
    int32_t rem = tm - dp;
    float dl = lbmbBrakeEnvelope(rem, lbmbMoveBrakeMm(ts), ts);
    if (dl < db) db = dl;
  } else if (md == 5) {
    uint32_t rms = tmms - eo;
    uint32_t bms = (uint32_t)ts / 2U;
    if (bms < 200U) bms = 200U; if (bms > 800U) bms = 800U;
    if (rms < bms) {
      float f = (float)rms / (float)bms;
      f = lbmbClampF(f, 0.0f, 1.0f);
      float tl = (float)mb + ((float)ts - mb) * sqrtf(f);
      if (tl < db) db = tl;
    }
  }
  lbmbProfileStep(&ctx->baseSpeed, &ctx->baseAccel, db, LBMB_FLL_ACCEL, LBMB_FLL_DECEL, LBMB_FLL_JERK, dt);
  float cb = lbmbClampF((lbmbAbsF(er) - 0.35f) / 0.40f, 0.0f, 1.0f);
  float sg = ctx->baseSpeed / 650.0f;
  if (sg < 1.0f) sg = 1.0f;
  float stg = 1.0f + cb * (sg - 1.0f);
  float str = stg * (LBMB_FLL_KP * er + LBMB_FLL_KI * ci + LBMB_FLL_KD * ctx->filteredDerivative);
  const float sr = ctx->sharpTurn ? 1.40f : LBMB_FLL_MAX_STEER_RATIO;
  const float sl = ctx->baseSpeed * sr;
  const bool sat = lbmbAbsF(str) > sl;
  if (sat && ((str > 0.0f && er > 0.0f) || (str < 0.0f && er < 0.0f))) {
    ci = ctx->integral;
    str = stg * (LBMB_FLL_KP * er + LBMB_FLL_KI * ci + LBMB_FLL_KD * ctx->filteredDerivative);
  }
  str = lbmbClampF(str, -sl, sl);
  int16_t bs = lbmbClamp16((int32_t)lroundf(ctx->baseSpeed), 0, ts);
  int16_t tl = bs, tr = bs;
  if (ctx->markerCount == 0) {
    int16_t sm = lbmbClamp16((int32_t)lroundf(lbmbAbsF(str)), 0, ctx->sharpTurn ? (int16_t)lroundf(bs * 1.40f) : bs);
    if (str > 0.0f) tr = bs - sm;
    else if (str < 0.0f) tl = bs - sm;
  }
  ctx->outLeft = lbmbWheelSlew(ctx->outLeft, tl, dtms);
  ctx->outRight = lbmbWheelSlew(ctx->outRight, tr, dtms);
  ctx->integral = ci;
  ctx->prevError = er;
  c.leftSpeed = lbmbClamp16(ctx->outLeft, -2000, 2000);
  c.rightSpeed = lbmbClamp16(ctx->outRight, -2000, 2000);
  c.isDone = false;
  return c;
}

LbmbFollowCtx defaultLineContext = {};
bool lineOperationCompleted = false;

inline LbmbState lbmbReadState() {
  LbmbState st;
  st.timeMs = (uint32_t)millis();
  st.distanceMm = (int32_t)lroundf((float)LbMotion.getDistanceMm() / DISTANCE_SCALE);
  st.lineState = (uint8_t)measure_line();
  st.ir2L = (int16_t)LbIRArray.read(ir2L);
  st.ir0L = (int16_t)LbIRArray.read(ir0L);
  st.ir1R = (int16_t)LbIRArray.read(ir1R);
  st.ir3R = (int16_t)LbIRArray.read(ir3R);
  return st;
}

float measure_line_error() {
  const LbmbState st = lbmbReadState();
  if (!lbmbIsLineValid(st.lineState)) return NAN;
  return lbmbLinePosition1000(&st, (int16_t)lroundf(lastLineError * 1000.0f)) / 1000.0f;
}

static void applyMyBlockLineCommand(const LbmbFollowCtx* ctx, const LbmbCommand* cmd) {
  lastLineError = ctx->prevError * 3.0f;
  if (cmd->isDone) { LbMotion.stopAndWait(); return; }
  const int l = LINE_STEERING_SIGN == -1 ? cmd->rightSpeed : cmd->leftSpeed;
  const int r = LINE_STEERING_SIGN == -1 ? cmd->leftSpeed : cmd->rightSpeed;
  LbMotion.runLR(l, r);
}

void runFollowLine(int b = -1) {
  const uint32_t n = (uint32_t)millis();
  if (lineControlReady && n - lastLineControlTime < LBMB_TICK_MS) return;
  LbmbState st = lbmbReadState();
  if (b >= 0) st.lineState = (uint8_t)(b & 0x0F);
  if (!lineControlReady) lbmbFollowCoreInit(&defaultLineContext, &st);
  lastLineControlTime = n; lineControlReady = true;
  LbmbCommand cmd = lbmbFollowCoreStep(&defaultLineContext, &st, LINE_SPEED / 20.0f, 5, 600.0f);
  applyMyBlockLineCommand(&defaultLineContext, &cmd);
}

static void lbmbFollow(float sp, uint8_t md, float tv) {
  lineOperationCompleted = false;
  if (!isfinite(sp) || sp <= 0 || !isfinite(tv) || md < 1 || md > 5 || ((md == 4 || md == 5) && tv < 0) ||
      (md == 4 && tv > 1200) || (md == 5 && tv > 600)) { LbMotion.stopAndWait(); return; }
  LbMotion.stopAndWait(); resetMotionState(); junctionPending = false;
  if ((md == 4 || md == 5) && tv == 0) { lineOperationCompleted = true; return; }
  LbmbFollowCtx ctx;
  LbmbState st = lbmbReadState();
  lbmbFollowCoreInit(&ctx, &st);
  while (true) {
    LbmbCommand cmd = lbmbFollowCoreStep(&ctx, &st, sp, md, tv);
    applyMyBlockLineCommand(&ctx, &cmd);
    if (cmd.isDone) {
      const uint32_t el = st.timeMs - ctx.startTime;
      junctionPending = md <= 3 && ctx.markerCount >= 3 && el < 60000UL;
      lineOperationCompleted = junctionPending ||
        (md == 4 && lbmbAbs32(st.distanceMm - ctx.startDist) >= (int32_t)lroundf(tv * 10.0f)) ||
        (md == 5 && el >= (uint32_t)lroundf(tv * 1000.0f));
      return;
    }
    robot_delay(LBMB_TICK_MS);
    st = lbmbReadState();
  }
}

void followLineCm(float d, float sp = LINE_SPEED / 20.0f) { lbmbFollow(sp, 4, d); }
void followLineDistance(int d, float sp = LINE_SPEED / 20.0f) { followLineCm(d / 10.0f, sp); }
void followLineSeconds(float s, float sp = LINE_SPEED / 20.0f) { lbmbFollow(sp, 5, s); }
void followLineUntilJunction(byte m = 3, float sp = LINE_SPEED / 20.0f) { lbmbFollow(sp, m, 0); }
void centerDetectedJunction() { if (!junctionPending) return; junctionPending = false; move_tank(450, 450, JUNCTION_CENTER_MM / 10.0f); }
void followLineMultipleJunctions(int c) { if (c < 0) { LbMotion.stopAndWait(); return; }
  for (int i = 0; i < c; ++i) { if (i > 0) centerDetectedJunction(); followLineUntilJunction(); if (!junctionPending) return; } }
void goToJunction() { if (!junctionPending) followLineUntilJunction(); centerDetectedJunction(); }

#if BASE_USE_COLOR
static bool readAPDSColor(int &r, int &g, int &b) {
  APDS.colorAvailable(); robot_delay(COLOR_EXPOSURE_MS);
  const unsigned long st = millis();
  while (!APDS.colorAvailable()) { if (millis() - st >= COLOR_READY_TIMEOUT_MS) return false; robot_delay(5); }
  return APDS.readColor(r, g, b) && r >= 0 && g >= 0 && b >= 0;
}

static bool readObjectRGB(int &r, int &g, int &b) {
  int rr, gg, bb, rl, gl, bl;
  LbRGB.fillColor(CRGB(255, 0, 0)); LbRGB.show();
  if (!readAPDSColor(rl, gg, bb)) return false;
  LbRGB.fillColor(CRGB(0, 255, 0)); LbRGB.show();
  if (!readAPDSColor(rr, gl, bb)) return false;
  LbRGB.fillColor(CRGB(0, 0, 255)); LbRGB.show();
  if (!readAPDSColor(rr, gg, bl)) return false;
  LbRGB.fillColor(CRGB(0, 0, 0)); LbRGB.show();
  if (!readAPDSColor(rr, gg, bb)) return false;
  r = max(0, rl - rr);
  g = max(0, gl - gg);
  b = max(0, bl - bb);
  return true;
}

static ObjectColor classifyColor(int r, int g, int b) {
  const int16_t rr = max(0, r), gg = max(0, g), bb = max(0, b);
  const int16_t t = max(rr, max(gg, bb));
  const int16_t s = t - min(rr, min(gg, bb));
  if (t < COLOR_MIN_CHANNEL || (int32_t)s * COLOR_SATURATION_DIVISOR < t) return UNKNOWN;
  int32_t h;
  if (t == rr) { h = 60L * (gg - bb); if (h < 0) h += 360L * s; }
  else if (t == gg) h = 120L * s + 60L * (bb - rr);
  else h = 240L * s + 60L * (rr - gg);
  if (h < COLOR_RED_YELLOW_HUE * s || h >= COLOR_PURPLE_RED_HUE * s) return RED;
  if (h < COLOR_YELLOW_GREEN_HUE * s) return YELLOW;
  if (h < COLOR_GREEN_BLUE_HUE * s) return GREEN;
  if (h < COLOR_BLUE_PURPLE_HUE * s) return BLUE;
  return PURPLE;
}

ObjectColor read_color() {
  lastMeasuredColor = UNKNOWN;
  if (!colorSensorReady) colorSensorReady = APDS.begin();
  if (!colorSensorReady) { LbMotion.stopAndWait(); return UNKNOWN; }
  const int ob = LbRGB.getBrightness();
  LbRGB.setBrightness(255);
  uint8_t v[6] = {0, 0, 0, 0, 0, 0};
  uint8_t bv = 0;
  ObjectColor c = UNKNOWN;
  for (int sp = 0; sp < 5; ++sp) {
    int r = 0, g = 0, b = 0;
    if (!readObjectRGB(r, g, b)) { LbRGB.setBrightness(ob); LbRGB.fillColor(CRGB(0, 0, 0)); LbMotion.stopAndWait(); LbRGB.show(); return UNKNOWN; }
    const ObjectColor ca = classifyColor(r, g, b);
    ++v[(int)ca];
    if (ca != UNKNOWN) { bv = max(bv, v[(int)ca]); if (bv >= 4) c = ca; }
    if (c != UNKNOWN || bv + (4 - sp) < 4) break;
  }
  LbRGB.setBrightness(ob);
  lastMeasuredColor = c;
  const CRGB colors[6] = {CRGB(0, 0, 0), CRGB(255, 0, 0), CRGB(0, 255, 0), CRGB(0, 0, 255), CRGB(255, 255, 0), CRGB(128, 0, 128)};
  LbRGB.fillColor(colors[(int)c]);
  LbRGB.show();
  return c;
}
#else
ObjectColor read_color() { lastMeasuredColor = UNKNOWN; LbMotion.stopAndWait(); return UNKNOWN; }
#endif

void send_iot_color(ObjectColor c, uint8_t n) {}
ObjectColor read_iot_color(unsigned long t, uint8_t n) { return UNKNOWN; }

static void showReadyLED() { LbRGB.fillColor(CRGB::Black); LbRGB.fillColor(CRGB::Green, BITMAP(ledA,ledB)); LbRGB.show(); }
void beep() { for (int i = 0; i < 3; i++) { Leanbot.tone(880, 50); delay(50); } }

static void missionBluePickup(float aa, float ea) {
  move_tank(2000,2000,15); move_tank(-2000,-2000,15);
  turn_two_wheels(2000, aa); move_tank(-2000, -2000, 32.5);
  turn_two_wheels(2000, -90); followLineCm(32.5,2000);
  close_hand(90); move_tank(-2000, -2000, 32.5);
  turn_two_wheels(2000, 90); followLineCm(32.5,2000);
  turn_two_wheels(2000, ea); open_hand();
}

static void missionGreenRoute(float aa) {
  move_tank(2000,2000,15); move_tank(-2000,-2000,15);
  turn_two_wheels(2000, aa); followLineCm(65,2000);
  close_hand(90); move_tank(-2000,-2000,65);
  turn_two_wheels(2000, -aa); open_hand();
  move_tank(2000,2000,15); move_tank(2000,2000,-15);
  turn_two_wheels(2000,90); move_tank(2000,2000,11); read_color();
}

static void missionPurpleRoute(float aa) {
  move_tank(2000,2000,15); move_tank(-2000,-2000,15);
  turn_two_wheels(2000, aa); followLineCm(48.75,2000);
  turn_two_wheels(2000, 21); move_tank(2000, 2000, 20);
  move_tank(-2000, -2000, 20); turn_two_wheels(2000, -21);
  move_tank(-2000, -2000, 48.75); turn_two_wheels(2000, 135);
  open_hand(); move_tank(2000, 2000, 15);
  move_tank(-2000, -2000, 15); turn_two_wheels(2000, 90);
  move_tank(2000, 2000, 11); read_color();
}

void FullMission() {
  const byte b = (LbTouch.read(TB1A) == HIGH ? 1 : 0) | (LbTouch.read(TB1B) == HIGH ? 2 : 0) | (LbTouch.read(TB2A) == HIGH ? 4 : 0);
  const unsigned long n = millis();
  if (b != missionButtons) { missionButtons = b; missionButtonChangedAt = n; }
  if (n - missionButtonChangedAt < 30UL) { robot_delay(5); return; }
  if (!missionArmed) { if (b == 0) missionArmed = true; robot_delay(5); return; }
  if (b == 0) { robot_delay(5); return; }
  missionArmed = false;
  if (b != 1 && b != 2 && b != 4) { robot_delay(5); return; }
  junctionPending = false; lineOperationCompleted = false; lastMeasuredColor = UNKNOWN; resetMotionState();
  if (b == 1) calibrate_line();
  else if (b == 2) {
    LbRGB.fillColor(CRGB::Yellow, BITMAP(ledC,ledD)); LbRGB.show();
    move_tank(2000,2000,40.5); turn_two_wheels(2000, 90);
    followLineUntilJunction(3,2000); followLineCm(16.25,2000);
    turn_two_wheels(2000, -135); move_tank(2000,2000,11);
    ObjectColor col = read_color();
    if(col==RED || col==YELLOW) {
      close_hand(90); move_tank(2000,2000,10); turn_two_wheels(2000,-135);
      move_tank(2000,2000,60); open_hand(); move_tank(-2000,-2000,13);
      turn_two_wheels(2000,-90); followLineUntilJunction(3,2000);
      turn_two_wheels(2000,-90); followLineCm(32.5,2000); turn_two_wheels(2000,45);
      move_tank(2000,2000,11); col=read_color();
    } else if(col==BLUE) {
      missionBluePickup(45,-45); move_tank(2000,2000,15); move_tank(-2000,-2000,15); turn_two_wheels(2000,90);
      move_tank(2000,2000,11); col=read_color();
    } else if(col==GREEN) {
      missionGreenRoute(-135);
    } else if(col==PURPLE) {
      missionPurpleRoute(-135);
    }
    if(col==RED || col==YELLOW) {
      close_hand(90); move_tank(-2000,-2000,11); turn_two_wheels(2000,-45); move_tank(-2000,-2000,40.5);
      turn_two_wheels(2000,-90); open_hand(); move_tank(2000,2000,10); move_tank(2000,2000,-10);
      turn_two_wheels(2000,90); followLineCm(40.5,2000); turn_two_wheels(2000,90); followLineCm(48.25,2000);
      turn_two_wheels(2000,-90); move_tank(2000,2000,16.25); turn_two_wheels(2000,-45); move_tank(2000,2000,4);
      read_color();
    } else if(col==BLUE) {
      missionBluePickup(-45,45); move_tank(2000,2000,15); move_tank(-2000,-2000,15); turn_two_wheels(2000,45);
      followLineCm(48.25,2000); turn_two_wheels(2000,-90); move_tank(2000,2000,16.25);
      turn_two_wheels(2000,-45); move_tank(2000,2000,4); read_color();
    } else if(col==GREEN) {
      missionGreenRoute(135);
    } else if(col==PURPLE) {
      missionPurpleRoute(135);
    }
  } else if(b == 4) {
    LbRGB.fillColor(CRGB::Red, BITMAP(ledC,ledD)); LbRGB.show();
  }
  LbMotion.stopAndWait(); resetMotionState(); junctionPending = false;
  lineOperationCompleted = false; missionButtonChangedAt = millis(); showReadyLED();
}

void setup() {
  Leanbot.begin();
  Serial.begin(115200);
  showReadyLED();
}

void loop() { FullMission(); }
