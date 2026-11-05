void setup() { Serial.begin(115200); Serial.println("LEANBOT_RAW_READY_1105"); }
void loop() { Serial.println("LEANBOT_RAW_HEARTBEAT_1105"); if (Serial.available() && Serial.read() == '?') Serial.println("LEANBOT_RAW_ECHO_1105"); delay(500); }
