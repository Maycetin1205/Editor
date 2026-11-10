// ESP32-S3 als USB-Seriell-Brücke
// Werkzeuge > "USB CDC On Boot": Enabled
uint8_t buf[512];

void setup() {
  Serial.begin(115200);
  Serial1.begin(115200, SERIAL_8N1, 18, 17);   // RX = 18, TX = 17
}

void loop() {
  int n = Serial.available();
  if (n > 0) {
    n = Serial.readBytes(buf, n > 512 ? 512 : n);
    Serial1.write(buf, n);
  }
  n = Serial1.available();
  if (n > 0) {
    n = Serial1.readBytes(buf, n > 512 ? 512 : n);
    Serial.write(buf, n);
  }
}
