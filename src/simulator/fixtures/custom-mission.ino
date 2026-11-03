#include <Leanbot.h>
#include <math.h>
#include <string.h>
const float DISTANCE_SCALE = 1.0f;
const float LEFT_SCALE = 1.0f;
const float RIGHT_SCALE = 1.2f;
const float TURN_ONE_SCALE = 1.0f;
const float TURN_TWO_SCALE = 1.0f;
enum TurnMode { TWO_WHEELS, LEFT_ONLY, RIGHT_ONLY };
const float TURN_SCALE[3] = {1.05f, 1.05f, 1.05f};
const int TURN_FINISH_SPEED = 100;
const float TURN_SLOW_ZONE = 30.0f;
void turn_angle(int speed, float angle_deg, TurnMode mode) {
  LbMotion.stopAndWait();
  if (!isfinite(angle_deg) || speed < TURN_FINISH_SPEED || speed > 2000 || mode < TWO_WHEELS || mode > RIGHT_ONLY) return;
  const float target = fabsf(angle_deg) * TURN_SCALE[(int)mode];
  if (!isfinite(target) || target < 1.0f) return;
  const float origin = (float)LbMotion.getRotationDeg();
  const int direction = angle_deg > 0 ? 1 : -1;
  int currentSpeed = TURN_FINISH_SPEED;
  int previousSpeed = -1;
  unsigned long rampTime = millis();
  unsigned long progressTime = millis();
  float lastProgress = 0;
  while (true) {
    float rotated = fabsf((float)LbMotion.getRotationDeg() - origin);
    float remaining = target - rotated;
    if (remaining <= 0) break;
    unsigned long now = millis();
    if (rotated > lastProgress) {
      lastProgress = rotated;
      progressTime = now;
    } else if (now - progressTime >= 3000UL) { break; }
    float ratio = constrain((remaining - 5.0f) / TURN_SLOW_ZONE, 0.0f, 1.0f);
    int allowedSpeed = TURN_FINISH_SPEED + (int)lroundf((speed - TURN_FINISH_SPEED) * ratio);
    if (currentSpeed > allowedSpeed) { currentSpeed = allowedSpeed; }
    else if (now - rampTime >= 10UL) {
      currentSpeed = min(currentSpeed + 20, allowedSpeed);
      rampTime = now;
    }
    if (currentSpeed != previousSpeed) {
      int v = direction * currentSpeed;
      switch (mode) {
        case TWO_WHEELS: LbMotion.runLR(v, -v); break;
        case LEFT_ONLY: LbMotion.runLR(v, 0); break;
        case RIGHT_ONLY: LbMotion.runLR(0, -v); break;
      }
      previousSpeed = currentSpeed;
    }
    LbDelay(1);
  }
  LbMotion.stopAndWait();
}
void turn_one_wheel(int speed, float angle, const char* info) {
  if (info == nullptr) return;
  if (strcmp(info, "L") == 0) { turn_angle(speed, -angle, LEFT_ONLY); }
  else if (strcmp(info, "R") == 0) { turn_angle(speed, angle, RIGHT_ONLY); }
}
void turn_two_wheels(int speed, float angle) { turn_angle(speed, angle, TWO_WHEELS); }
void move_tank(int motor_L, int motor_R, float distance_cm) {
  LbMotion.stopAndWait();
  if (!isfinite(distance_cm) || distance_cm < 0) return;
  if (distance_cm == 0) return;
  if (motor_L > 2000) motor_L = 2000;
  if (motor_R > 2000) motor_R = 2000;
  const float target_mm = distance_cm * 10.0f;
  const float origin_mm = (float)LbMotion.getDistanceMm();
  const int speed = (motor_L + motor_R) / 2;
  int previousSpeed = -1;
  while (true) {
    const float travelled_mm = fabsf((float)LbMotion.getDistanceMm() - origin_mm);
    const float remaining_mm = target_mm - travelled_mm;
    if (remaining_mm <= 0) break;
    float scale = remaining_mm / 20.0f;
    scale = constrain(scale, 0.15f, 1.0f);
    const int currentSpeed = (int)lroundf(speed * scale);
    if (currentSpeed != previousSpeed) {
      LbMotion.runLR(currentSpeed, currentSpeed);
      previousSpeed = currentSpeed;
    }
    LbDelay(1);
  }
  LbMotion.stopAndWait();
}
void close_hand(int degree) {
  for (int count = 0; count < 10; count++) { LbGripper.moveToLR(degree, degree, 100); }
}
void open_hand() {
  for (int count = 0; count < 10; count++) { LbGripper.moveToLR(0, 0, 100); }
}
void setup() { Leanbot.begin(); }
void loop() {
  LbMission.begin(TB1A + TB1B);
  turn_two_wheels(2000, 22);
  move_tank(2000, 2000, 20);
  close_hand(90);
  turn_two_wheels(2000, 133);
  move_tank(2000, 2000, 58);
  open_hand();
  move_tank(-2000, -2000, 12);
  turn_two_wheels(2000, -32);
  move_tank(2000, 2000, 30);
  close_hand(90);
  LbMission.end();
}
