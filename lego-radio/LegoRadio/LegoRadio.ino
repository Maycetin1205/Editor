// ===================== Lego-Radio =====================
// Bibliothek: DFRobotDFPlayerMini (mit Display zusätzlich: LiquidCrystal I2C)
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <Preferences.h>
#include <DFRobotDFPlayerMini.h>

// ---------- Einstellungen ----------
#define USE_LCD 0                      // 0 = ohne Display, 1 = Display angeschlossen
#define LCD_I2C 1                      // 1 = Display mit I2C-Adapter (4 Pins), 0 = Display mit 16 Pins
const uint8_t LCD_ADDR = 0x27;         // bleibt das Display leer: 0x3F probieren
const char* AP_PASSWORD = "legoradio"; // WLAN-Passwort im Einstellmodus (mind. 8 Zeichen)
const bool LEDS_INVERTED = true;         // true = Streifen direkt am Pin (leuchtet bei LOW), false = mit Transistor
const char* VERSION = "1.2";           // steht auf der Einstellseite
// Alles andere stellst du auf der Einstellseite im WLAN ein.

const int PIN_PREV = 25, PIN_NEXT = 26, PIN_SIREN = 27;
const int PIN_BUSY = 4, PIN_RED = 32, PIN_BLUE = 33, PIN_AUDIO = 34;

#if USE_LCD
#if LCD_I2C
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
#else
#include <LiquidCrystal.h>
LiquidCrystal lcd(13, 14, 18, 19, 21, 22);   // RS, E, D4, D5, D6, D7
#endif
#endif

HardwareSerial dfSerial(2);
DFRobotDFPlayerMini player;
Preferences prefs;
WebServer server(80);

// ---------- gespeicherte Werte ----------
String childName, titles;      // titles: ein Titel pro Zeile
String sirenList;              // Nummern der Sirenen-Lieder im Ordner mp3, z. B. "12,13"
int songCount, volMax, volume, track;
int repeatMode;                // 0 = alle der Reihe nach, 1 = dasselbe Lied, 2 = anhalten, 3 = Zufall
int startVol;                  // 0 = letzte Lautstärke merken, sonst fester Startwert
int blinkMode;                 // 0 = Doppelblitz, 1 = ruhiger Wechsel
int musicMin;                  // Empfindlichkeit Musiklicht, kleiner = empfindlicher
bool autoplay, musicLightsOn;
int sirenTracks[10], sirenN = 0;

enum Mode { IDLE, MUSIC, SIREN };
Mode mode = IDLE;
bool setupMode = false, musicWasOn = false;
int sirenCount = 1, sirenNo = 0;
unsigned long lastCmd = 0, volShownUntil = 0, titleSince = 0, dirtySince = 0;
bool dirty = false;
String nameLcd, titleLcd, shown[2];

// ---------- Display ----------
// macht aus ä ö ü ß die Zeichen, die das Display kennt
String lcdText(const String &s) {
  String o;
  for (size_t i = 0; i < s.length(); i++) {
    uint8_t c = s[i];
    if (c == 0xC3 && i + 1 < s.length()) {
      uint8_t d = s[++i];
      if (d == 0xA4 || d == 0x84) o += (char)0xE1;        // ä Ä
      else if (d == 0xB6 || d == 0x96) o += (char)0xEF;   // ö Ö
      else if (d == 0xBC || d == 0x9C) o += (char)0xF5;   // ü Ü
      else if (d == 0x9F) o += (char)0xE2;                // ß
      else o += '?';
    } else if (c >= 0x20 && c < 0x80) o += (char)c;
  }
  return o;
}

String center(const String &s) {
  String o;
  for (int i = 0; i < (16 - (int)s.length()) / 2; i++) o += ' ';
  return o + s;
}

void putLine(int row, String s) {
  while (s.length() < 16) s += ' ';
  s = s.substring(0, 16);
  if (s == shown[row]) return;
  shown[row] = s;
#if USE_LCD
  lcd.setCursor(0, row);
  lcd.print(s);
#endif
}

String titleOf(int n) {
  int start = 0;
  for (int i = 1; i < n; i++) {
    int nl = titles.indexOf('\n', start);
    if (nl < 0) return "";
    start = nl + 1;
  }
  int end = titles.indexOf('\n', start);
  if (end < 0) end = titles.length();
  String t = titles.substring(start, end);
  t.trim();
  return t;
}

void refreshDisplay() {
  unsigned long t = millis();
  if (mode == SIREN) {
    String st = sirenN > 0 ? lcdText(titleOf(sirenTracks[sirenNo - 1])) : String("");
    putLine(0, center("SIRENE"));
    putLine(1, center(st.length() ? st : String("Tatue Tata!")));
    return;
  }
  putLine(0, center(nameLcd));
  if (t < volShownUntil) { putLine(1, lcdText("Lautstärke ") + String(volume)); return; }
  if (mode == IDLE) { putLine(1, lcdText(" Knopf drücken")); return; }
  if (titleLcd.length() <= 16) { putLine(1, center(titleLcd)); return; }
  String run = titleLcd + "   ";                 // langer Titel läuft durch
  int n = run.length(), off = 0;
  if (t - titleSince > 1500) off = ((t - titleSince - 1500) / 350) % n;
  String s;
  for (int i = 0; i < 16; i++) s += run[(off + i) % n];
  putLine(1, s);
}

// ---------- Ton und Licht ----------
void leds(bool red, bool blue) {
  digitalWrite(PIN_RED, (red != LEDS_INVERTED) ? HIGH : LOW);
  digitalWrite(PIN_BLUE, (blue != LEDS_INVERTED) ? HIGH : LOW);
}

void markDirty() { dirty = true; dirtySince = millis(); }

// ---------- Liedauswahl ----------
void parseSirens() {
  sirenN = 0;
  int start = 0;
  while (start < (int)sirenList.length() && sirenN < 10) {
    int c = sirenList.indexOf(',', start);
    if (c < 0) c = sirenList.length();
    int n = sirenList.substring(start, c).toInt();
    if (n > 0) sirenTracks[sirenN++] = n;
    start = c + 1;
  }
}

bool isSiren(int n) {
  for (int i = 0; i < sirenN; i++) if (sirenTracks[i] == n) return true;
  return false;
}

// nächstes (dir = 1) oder vorheriges (dir = -1) Lied, Sirenen werden übersprungen
void stepTrack(int dir) {
  for (int i = 0; i < songCount; i++) {
    track = (track - 1 + dir + songCount) % songCount + 1;
    if (!isSiren(track)) return;
  }
}

void randomTrack() {
  for (int i = 0; i < 30; i++) {
    int n = random(1, songCount + 1);
    if (n != track && !isSiren(n)) { track = n; return; }
  }
  stepTrack(1);
}

void playTrack() {
  leds(false, false);
  player.playMp3Folder(track);                   // spielt /mp3/0001.mp3 usw.
  mode = MUSIC;
  lastCmd = millis();
  titleLcd = lcdText(titleOf(track));
  if (titleLcd.length() == 0) titleLcd = "Lied " + String(track);
  titleSince = millis();
  markDirty();
}

void startSiren() {
  musicWasOn = (mode == MUSIC);
  if (sirenN > 0) {                              // Sirenen-Lieder aus dem Ordner mp3
    sirenNo = sirenNo % sirenN + 1;
    player.playMp3Folder(sirenTracks[sirenNo - 1]);
  } else {                                       // sonst /01/001.mp3 usw.
    sirenNo = sirenNo % sirenCount + 1;
    player.playFolder(1, sirenNo);
  }
  mode = SIREN;
  lastCmd = millis();
}

void endSiren() {
  leds(false, false);
  if (musicWasOn) { playTrack(); return; }
  player.stop();
  mode = IDLE;
}

void changeVolume(int d) {
  volume = constrain(volume + d, 0, volMax);
  player.volume(volume);
  volShownUntil = millis() + 1500;
  markDirty();
}

void musicLights() {
  static float avg = 0;
  static unsigned long redUntil = 0;
  int lo = 4095, hi = 0;
  for (int i = 0; i < 120; i++) {
    int v = analogRead(PIN_AUDIO);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  int level = hi - lo;
  avg = avg * 0.95 + level * 0.05;
  unsigned long t = millis();
  if (level > avg * 1.5 && level > musicMin) redUntil = t + 70;   // Schlag
  leds(t < redUntil, level > avg * 1.1 && level > musicMin);
}

// ---------- Taster ----------
struct Button { int pin; bool down; bool held; unsigned long since; unsigned long lastRepeat; };
Button bPrev  = { PIN_PREV,  false, false, 0, 0 };
Button bNext  = { PIN_NEXT,  false, false, 0, 0 };
Button bSiren = { PIN_SIREN, false, false, 0, 0 };

// 0 = nichts, 1 = kurz gedrückt, 2 = wird gehalten (wiederholt sich)
int readButton(Button &b) {
  bool now = digitalRead(b.pin) == LOW;
  unsigned long t = millis();
  int ev = 0;
  if (now && !b.down) { b.down = true; b.held = false; b.since = t; }
  else if (now && b.down) {
    if (!b.held && t - b.since > 600) { b.held = true; b.lastRepeat = t; ev = 2; }
    else if (b.held && t - b.lastRepeat > 250) { b.lastRepeat = t; ev = 2; }
  } else if (!now && b.down) {
    b.down = false;
    if (!b.held && t - b.since > 30) ev = 1;
  }
  return ev;
}

// ---------- Einstellseite im WLAN ----------
String opt(int v, int cur, const char *label) {
  return String("<option value=") + String(v) + (v == cur ? " selected>" : ">") + label + "</option>";
}

String esc(String s) {
  s.replace("&", "&amp;"); s.replace("<", "&lt;"); s.replace(">", "&gt;"); s.replace("\"", "&quot;");
  return s;
}

void handleRoot() {
  String h = F("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
               "<title>Lego-Radio</title><style>body{font-family:sans-serif;max-width:480px;margin:auto;padding:16px}"
               "input,textarea,button{width:100%;font-size:16px;margin:4px 0 14px;padding:8px;box-sizing:border-box}"
               "textarea{height:220px}input[type=checkbox]{width:auto;margin-right:8px}label{display:block;margin:4px 0 14px}"
               "</style><h2>Lego-Radio</h2><form method=post action=/save>"
               "Name (steht im WLAN-Namen und im Display)<input name=name maxlength=16 value=\"");
  h += esc(childName);
  h += F("\">Anzahl Lieder im Ordner mp3<input name=count type=number min=1 max=999 value=");
  h += String(songCount);
  h += F(">Höchste Lautstärke (1 bis 30)<input name=volmax type=number min=1 max=30 value=");
  h += String(volMax);
  h += F(">Lautstärke beim Einschalten (0 = die letzte merken)<input name=startvol type=number min=0 max=30 value=");
  h += String(startVol);
  h += F(">Wiederholen<select name=repeat style='width:100%;font-size:16px;margin:4px 0 14px;padding:8px'>");
  h += opt(0, repeatMode, "Alle Lieder der Reihe nach, endlos");
  h += opt(1, repeatMode, "Immer dasselbe Lied");
  h += opt(2, repeatMode, "Nach jedem Lied anhalten");
  h += opt(3, repeatMode, "Zufällige Reihenfolge");
  h += F("</select><label><input type=checkbox name=autoplay");
  h += autoplay ? " checked" : "";
  h += F(">Beim Einschalten sofort losspielen</label>"
         "Sirenen-Lieder: Nummern im Ordner mp3, mit Komma getrennt. Leer = Ordner 01<input name=sirens maxlength=60 value=\"");
  h += esc(sirenList);
  h += F("\">Blinken bei Sirene<select name=blink style='width:100%;font-size:16px;margin:4px 0 14px;padding:8px'>");
  h += opt(0, blinkMode, "Doppelblitz im Wechsel");
  h += opt(1, blinkMode, "Ruhiger Wechsel");
  h += F("</select><label><input type=checkbox name=mlights");
  h += musicLightsOn ? " checked" : "";
  h += F(">Leuchtleisten blinken zur Musik</label>"
         "Empfindlichkeit Musiklicht (kleiner = empfindlicher)<input name=mmin type=number min=10 max=2000 value=");
  h += String(musicMin);
  h += F(">Titel, einer pro Zeile. Zeile 1 gehört zu 0001.mp3<textarea name=titles maxlength=3500>");
  h += esc(titles);
  h += F("</textarea><button>Speichern</button></form>"
         "<h3>Neue Software</h3><form method=post action=/update enctype=multipart/form-data>"
         "<input type=file name=f accept=.bin><button>Hochladen</button></form>"
         "<form method=post action=/restart><button>Fertig, Radio neu starten</button></form><p>Version ");
  h += VERSION;
  server.send(200, "text/html", h);
}

void handleSave() {
  childName = server.arg("name");
  songCount = constrain(server.arg("count").toInt(), 1, 999);
  volMax = constrain(server.arg("volmax").toInt(), 1, 30);
  titles = server.arg("titles");
  titles.replace("\r", "");
  startVol = constrain(server.arg("startvol").toInt(), 0, 30);
  repeatMode = constrain(server.arg("repeat").toInt(), 0, 3);
  blinkMode = constrain(server.arg("blink").toInt(), 0, 1);
  musicMin = constrain(server.arg("mmin").toInt(), 10, 2000);
  autoplay = server.hasArg("autoplay");
  musicLightsOn = server.hasArg("mlights");
  sirenList = server.arg("sirens");
  parseSirens();
  prefs.putInt("startvol", startVol);
  prefs.putInt("repeat", repeatMode);
  prefs.putInt("blink", blinkMode);
  prefs.putInt("mmin", musicMin);
  prefs.putBool("autoplay", autoplay);
  prefs.putBool("mlights", musicLightsOn);
  prefs.putString("sirens", sirenList);
  if (volume > volMax) volume = volMax;
  if (track > songCount) track = 1;
  prefs.putString("name", childName);
  prefs.putString("titles", titles);
  prefs.putInt("count", songCount);
  prefs.putInt("volmax", volMax);
  prefs.putInt("vol", volume);
  prefs.putInt("track", track);
  server.sendHeader("Location", "/");
  server.send(303, "text/plain", "");
}

void handleUpdateDone() {
  server.send(200, "text/html", Update.hasError() ? "<meta charset=utf-8>Fehler beim Update. <a href=/>Zurück</a>"
                                                  : "<meta charset=utf-8>Update fertig. Das Radio startet neu.");
  delay(800);
  if (!Update.hasError()) ESP.restart();
}

void handleUpdateData() {
  HTTPUpload &up = server.upload();
  if (up.status == UPLOAD_FILE_START) Update.begin(UPDATE_SIZE_UNKNOWN);
  else if (up.status == UPLOAD_FILE_WRITE) Update.write(up.buf, up.currentSize);
  else if (up.status == UPLOAD_FILE_END) Update.end(true);
}

void handleRestart() {
  server.send(200, "text/html", "<meta charset=utf-8>Das Radio startet neu.");
  delay(800);
  ESP.restart();
}

void startSetupMode() {
  String ssid = "Radio-";
  for (size_t i = 0; i < childName.length() && ssid.length() < 16; i++) if (isalnum((uint8_t)childName[i])) ssid += childName[i];
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid.c_str(), AP_PASSWORD);
  server.on("/", HTTP_GET, handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/update", HTTP_POST, handleUpdateDone, handleUpdateData);
  server.on("/restart", HTTP_POST, handleRestart);
  server.begin();
  leds(true, true);                          // beide Leuchtleisten an = Einstellmodus
  putLine(0, ssid);
  putLine(1, WiFi.softAPIP().toString());
}

// ---------- Start ----------
void setup() {
  pinMode(PIN_PREV, INPUT_PULLUP);
  pinMode(PIN_NEXT, INPUT_PULLUP);
  pinMode(PIN_SIREN, INPUT_PULLUP);
  pinMode(PIN_BUSY, INPUT);
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  leds(false, false);

  prefs.begin("radio", false);
  childName = prefs.getString("name", "Radio");
  titles    = prefs.getString("titles", "");
  songCount = prefs.getInt("count", 10);
  volMax    = prefs.getInt("volmax", 20);
  volume    = constrain(prefs.getInt("vol", 12), 0, volMax);
  track     = constrain(prefs.getInt("track", 1), 1, songCount);
  nameLcd   = lcdText(childName);
  startVol  = prefs.getInt("startvol", 0);
  repeatMode = prefs.getInt("repeat", 0);
  blinkMode = prefs.getInt("blink", 0);
  musicMin  = prefs.getInt("mmin", 60);
  autoplay  = prefs.getBool("autoplay", true);
  musicLightsOn = prefs.getBool("mlights", true);
  sirenList = prefs.getString("sirens", "");
  parseSirens();
  if (startVol > 0) volume = min(startVol, volMax);
  if (isSiren(track)) stepTrack(1);
  randomSeed(micros());

#if USE_LCD
#if LCD_I2C
  lcd.init();
  lcd.backlight();
#else
  lcd.begin(16, 2);
#endif
#endif

  delay(50);
  if (digitalRead(PIN_SIREN) == LOW) {       // Sirenenknopf beim Einschalten gehalten
    setupMode = true;
    startSetupMode();
    return;
  }
  WiFi.mode(WIFI_OFF);                       // im Normalbetrieb kein WLAN, spart Batterie

  putLine(0, center(nameLcd));
  putLine(1, center("startet..."));
  dfSerial.begin(9600, SERIAL_8N1, 16, 17);  // RX = 16, TX = 17
  delay(1500);                               // der DFPlayer braucht kurz
  if (!player.begin(dfSerial)) {
    putLine(1, "SD-Karte fehlt?");
    delay(2000);
  }
  player.volume(volume);
  int n = player.readFileCountsInFolder(1);
  if (n > 0) sirenCount = n;
  if (autoplay) playTrack();
  dirty = false;
}

void loop() {
  if (setupMode) { server.handleClient(); delay(2); return; }

  int e = readButton(bNext);
  if (e == 1) { if (repeatMode == 3) randomTrack(); else stepTrack(1); playTrack(); }
  if (e == 2) changeVolume(+1);

  e = readButton(bPrev);
  if (e == 1) { stepTrack(-1); playTrack(); }
  if (e == 2) changeVolume(-1);

  if (readButton(bSiren) == 1) {
    if (mode == SIREN) endSiren(); else startSiren();
  }

  // BUSY ist HIGH, wenn nichts mehr läuft
  if (mode != IDLE && millis() - lastCmd > 1500 && digitalRead(PIN_BUSY) == HIGH) {
    if (mode == SIREN) endSiren();
    else if (repeatMode == 2) { mode = IDLE; leds(false, false); }   // nach dem Lied anhalten
    else {
      if (repeatMode == 0) stepTrack(1);
      else if (repeatMode == 3) randomTrack();
      playTrack();                               // bei 1 läuft dasselbe Lied nochmal
    }
  }

  if (mode == SIREN) {
    unsigned long t = millis();
    if (blinkMode == 0) {                      // Doppelblitz im Wechsel
      unsigned long p = t % 600;
      bool flash = (p / 75) % 2 == 0;
      leds(p < 300 && flash, p >= 300 && flash);
    } else {                                   // ruhiger Wechsel
      leds(t % 1000 < 500, t % 1000 >= 500);
    }
  } else if (mode == MUSIC && musicLightsOn) {
    musicLights();
  }

  // Lautstärke und Lied merken, 3 Sekunden nach der letzten Änderung
  if (dirty && millis() - dirtySince > 3000) {
    prefs.putInt("vol", volume);
    prefs.putInt("track", track);
    dirty = false;
  }

  refreshDisplay();
  delay(5);
}
