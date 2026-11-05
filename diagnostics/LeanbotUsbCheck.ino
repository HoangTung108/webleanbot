#include <Leanbot.h>

// USB diagnostic: no mission, no motion commands, no gripper movement.
void setup() {
  Leanbot.begin();
  LbMotion.stopAndWait();
  Serial.begin(115200);
  Serial.println(F("LEANBOT_USB_CHECK_READY"));
}

void loop() {
  LbMotion.stopAndWait();
  static unsigned long previous = 0;
  const unsigned long now = millis();
  if (now - previous >= 1000UL) {
    previous = now;
    Serial.print(F("LEANBOT_USB_CHECK_OK uptime_ms="));
    Serial.println(now);
  }
  while (Serial.available() > 0) {
    if (Serial.read() == '?') Serial.println(F("LEANBOT_USB_ECHO_OK"));
  }
  LbDelay(10);
}
