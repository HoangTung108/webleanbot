// Comparison baseline: previous proportional heading control and stepped ramp.
const int MOVE_ACCEL_INCREMENT = 125;
const int HEADING_KP = 9;
const unsigned long MOTION_RAMP_MS = 8UL;
const float MOVE_SLOW_ZONE_MM = 30.0f;
const float MOVE_BRAKE_LEAD_MM = 0.0f;
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

