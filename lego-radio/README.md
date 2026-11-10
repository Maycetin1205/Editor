# Lego-Radio

Kleines Radio aus Lego mit ESP32, DFPlayer Mini, drei Tastern und zwei LED-Streifen (rot, blau).
Ohne Display, ohne Step-up-Wandler, Strom aus 3 × AA.

- `LegoRadio/LegoRadio.ino` – Code für das Radio (ESP32 Dev Module)
- `S3Bruecke/S3Bruecke.ino` – macht einen ESP32-S3 zur USB-Seriell-Brücke, um einen ESP32 ohne USB-Buchse zu bespielen
- `plan.html` – 3D-Modell, Bauanleitung und Verkabelung (im Browser öffnen, braucht Internet für das 3D-Modell)

Der Code hat nur eine Syntaxprüfung gegen Stub-Header bestanden. Er wurde noch nicht mit dem echten
ESP32-Core kompiliert und nicht auf Hardware getestet.

## Pin-Belegung

Plus = Batteriefach rot, GND = Batteriefach schwarz.

| Modul | Pin | Geht an | Bauteil dazwischen |
|---|---|---|---|
| ESP32 | `5V` (VIN) | Plus | |
| ESP32 | `GND` | GND | |
| DFPlayer | 1 `VCC` | Plus | |
| DFPlayer | 7 `GND` | GND | |
| DFPlayer | 2 `RX` | ESP32 `GPIO17` | 1 kΩ |
| DFPlayer | 3 `TX` | ESP32 `GPIO16` | |
| DFPlayer | 16 `BUSY` | ESP32 `GPIO4` | |
| DFPlayer | 6 `SPK_1`, 8 `SPK_2` | Lautsprecher | |
| DFPlayer | 5 `DAC_L` | ESP32 `GPIO34` | Keramikkondensator 100 nF |
| DFPlayer | 1 und 7 | | Elko 470–1000 µF, Plus an Pin 1 |
| Taster Zurück | | ESP32 `GPIO25` und GND | |
| Taster Weiter | | ESP32 `GPIO26` und GND | |
| Taster Sirene | | ESP32 `GPIO27` und GND | |
| LED rot | `+` | Plus | |
| LED rot | `−` | Kollektor NPN, Emitter an GND | Basis über 330 Ω an `GPIO32` |
| LED blau | `+` | Plus | |
| LED blau | `−` | Kollektor NPN, Emitter an GND | Basis über 330 Ω an `GPIO33` |
| Musiklicht | `GPIO34` | ESP32 `3V3` | 100 kΩ |
| Musiklicht | `GPIO34` | ESP32 `GND` | 100 kΩ |

## SD-Karte

```
mp3/0001.mp3   erstes Lied
mp3/0002.mp3   zweites Lied, usw.
```

Sirenen sind normale Lieder im Ordner `mp3`. Ihre Nummern trägt man auf der Einstellseite ein.

## Aufspielen

Arduino-IDE oder `arduino-cli`, Board `esp32:esp32:esp32` (ESP32 Dev Module), Bibliothek `DFRobotDFPlayerMini`.

ESP32 ohne USB-Buchse, über einen ESP32-S3 als Brücke:

1. `S3Bruecke.ino` auf den S3 laden (USB CDC On Boot: Enabled).
2. S3 `GPIO17` → ESP32 `RX` (GPIO3), S3 `GPIO18` → ESP32 `TX` (GPIO1), `GND` ↔ `GND`, S3 `5V` → ESP32 `5V`.
3. Port = der S3, Upload-Geschwindigkeit 115200.
4. Am ESP32 `BOOT` halten, `EN` kurz drücken, `BOOT` loslassen, dann hochladen. Danach `EN` drücken.

Danach gehen Updates per WLAN.

## Einstellen und Updates per WLAN

Sirenenknopf halten und einschalten. Beide LED-Streifen leuchten dauerhaft. WLAN `Radio-Radio`,
Passwort `legoradio`, im Browser `192.168.4.1`. Dort: Anzahl Lieder, Lautstärke, Wiederholen,
Sirenen-Lieder, Blinkmuster, Musiklicht und Upload einer neuen `.ino.bin`.
