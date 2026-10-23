# Weitermachen am Aufbau-Editor

Übergabe aus der Sitzung „Editor-Fahrplan“, 22.10.2026, gegen 11:50 Uhr.

## Nachtrag 22.10., 14:20 Uhr
- **Kanban-Dateien übernommen** (mit Zustimmung des Nutzers, eine Kanban-Sitzung lief nicht mehr). Die Absprache „Kanban-Dateien tabu“ unten gilt nicht mehr. Sicherung davor: `Testfinaledior-Sicherung\2026-10-22-vor-Kanban-Fertigbau`.
- **Im Editor neu (Kanban):**
  - je Spalte: Unterzeile, „Wenn leer“, Ecke der Karte (Zeit, Wartezeit, Betrag, Text), Fuß der Karte (Platz, Notiz, Text), „Platz wählen“, „Belegt oder frei“, Meldung beim Ankommen (`{Titel}`, `{Platz}`, `{Spalte}`)
  - für den ganzen Baustein: neue Felder „Wartet seit“, „Betrag“, „Notiz“, der Schalter „Übersicht oben“ und „Anderer Wert: Ausblenden“
  - neuer Feldtyp „Suche“ (`runtime/searchText.ts`), neue Werte „Bisheriger Wert“ (FROM_VALUE) und „Aktuelle Uhrzeit“ (NOW_TIME)
  - Typprüfung, eslint und build:runtime sind grün. Nur im Editor angesehen, nicht in SoftEngine.
- **Kleintierpraxis-Kanban:** Der Nutzer wollte seine eigene HTML-Datei lauffähig haben, nicht im Editor nachgebaut. Fertig unter `C:\Users\mu.aycetin\Desktop\Kleintierpraxis-Kanban-SoftEngine` (Quelle und Bau-Skript in `_quelle`). Die SoftEngine-Werte stehen oben im Skript unter `CONFIG`; Relation 174/640 und die Werte VART, IDBID und DATUMBEDIENER sind geraten. Der Nutzer testet selbst in der Testinstallation, ohne nachgebautes SoftEngine.

## Neuester Stand: 22.10., 12:30 Uhr (Abschluss, Tokens fast leer)
- **Der Code ist in Ordnung, nichts liegt halbfertig.** Um 12:30 Uhr waren Typprüfung, `eslint src` und `npm run build:runtime` grün (13 Bausteine, 313 KB, runtime.json war schon aktuell). Zuletzt geändert wurden um 12:10–12:12 Uhr `blocks/image/Picture.ts`, `address.ts`, `export/pictureRelations.ts`, `exportMask.ts`, `sevariablen.ts`, `core/data/jobs.ts` und `softengine/relations/hostQueue.ts`. Alle Prüfungen danach waren grün.
- **Bild-Baustein:** Das Problem mit `Picture.ts` und `picture.ts` ist gelöst. Es gibt nur noch `Picture.ts`.
- **Abgebrochen, nicht zu Ende geprüft:** Eine Zeile der Werteliste in einer exportierten Maske anklicken und prüfen, welche Nachricht an SoftEngine geht (START_TOOL). Die Sitzung „Editor-Fahrplan“ lief dabei aus. Im Editor sind die Aktionen je Zeile geprüft, beim Klick in der exportierten Maske noch nicht. Als Nächstes Punkt 5 der Prüfliste unten in der Testinstallation machen, mit `ff-debug` an (Punkt 8).
- **Kanban-Sitzung:** Ihre Nachricht mit den Dateien war am Ende nicht mehr lesbar, weil weder sie noch „Editor-Fahrplan“ noch lief. Gültig bleibt die Absprache unten. Kanban gehören `src/blocks/kanban/*`, `blocks/formfield/properties.ts`, `blocks/formfield/FormField.ts`, `editor/bar/ColumnBar.tsx` und das neue `src/runtime/searchText.ts`. Freigegeben sind ihr außerdem `core/data/actions.ts`, `editor/origin/origins.ts` und `runtime/events.ts`. Diese Dateien fasst niemand sonst an, bis Kanban fertig ist.
  - Stand 12:30 Uhr: Kanban hat noch nichts geändert. Der Ordner `blocks/kanban` ist vom 21.10., `searchText.ts` gibt es noch nicht, und NOW_TIME/FROM_VALUE fehlen noch in actions.ts und origins.ts. Nur `runtime/events.ts` setzt NOW_TIME schon.
- **Server auf Port 5300** läuft (von einer anderen Sitzung gestartet). Zeigt er eine leere Seite, einmal neu starten.
- **Weiter offen:** das Schild „Nur zum Ansehen“ in der Kopfleiste, die Export-Warnung bei beiseitegelegten Teilen, die Prüfliste in der Testinstallation und danach die „Nächsten Schritte“ unten.

## Ziel und Regeln
- **Design-Regel des Nutzers (22.10.):** Das Aussehen von SoftEngine wird NICHT 1:1 übernommen. Wir nehmen unseren eigenen, schöneren Stil. Aus den Original-Vorlagen übernehmen wir nur, was sie können: Funktionen, Daten, Befehle. Ihr Aussehen nicht. Der frühere Schritt „SoftEngine-Farbschema übernehmen“ entfällt deshalb.
- **Keine Hover-Texte** an den Bausteinen der Bausteinliste. Am 22.10. auf Wunsch des Nutzers entfernt.
- **Ziel:** Der Editor soll das SoftEngine-Frontend ersetzen (die Original-Vorlagen unter `E:\DATA\VSES-Muhammed\ErpFlowV8\Ressourcen\Standard\HTMLTemplates`, nur lesen). Er soll in Design und Architektur so gut sein, dass das Team damit künftig Masken für Kunden baut. Groß denken.
- **Der Nutzer programmiert nicht.** Antworten auf Deutsch, einfach, ohne Fachwörter. Er entscheidet, er liest keinen Code.
- **Kein Git, keine Test-Suiten** (Entscheidung des Nutzers). Vor großen Umbauten eine Ordnerkopie anlegen. Prüfen mit `npx tsc -p tsconfig.app.json --noEmit` und mit Blick in den Editor.
- **Sicherung vor dem Umbau:** `E:\DATA\VSES-Muhammed\Testfinaledior-Sicherung\2026-10-22-vor-Umbau`.
- **Editor starten:** über `.claude/launch.json` („aufbau-editor“, `npm run dev`). Der Port 5300 ist fest, weil gespeicherte Masken an dieser Adresse hängen.
- **Testinstallation:** Der Nutzer hat eine SoftEngine-Testinstallation mit Testdaten, ohne echte Kundendaten. Exportierte Masken laufen dort schon.
- **Wissen zu SoftEngine:** `C:\Users\mu.aycetin\Desktop\Softengine\softengine-lexikon`, mit `START-HIER.md` anfangen. Was dort „belegt“ heißt, ist nicht live getestet.

## Erledigt (22.10.)
- **Zoom im Editor:** Zoomleiste unter der Fläche, Strg+Mausrad, Strg+Plus/Minus/0. Der gewählte Baustein bleibt im Blick. Die Kopfleiste überlappt nicht mehr. Die Knöpfe der Bausteinliste haben jetzt Namen für Screenreader. Im Browser geprüft.
- **Ehrliches Speichern in exportierten Masken.** Gebaut in `src/softengine`, `src/runtime`, `src/core/data/steps` und `blocks/formfield/valueBinding.ts`:
  - Lehnt SoftEngine ab, erscheint ein roter Hinweis, und das Feld springt auf den alten Wert zurück.
  - Ohne Bestätigung von SoftEngine heißt es „gesendet“ statt „gespeichert“.
  - Schnelle Eingaben gehen nicht mehr verloren.
  - Antwortet SoftEngine nicht, steht „SoftEngine: antwortet nicht“ da, und die Maske macht danach weiter.
  - ERPAPICALL-Listen fragen neu nach, wenn sich die Parameter geändert haben.
  - Fehlersuche: `localStorage 'ff-debug' = '1'` oder `#ff-debug` in der Adresse, im Browser `ffAuftraege()`.
  - Gegen ein nachgebautes SoftEngine geprüft (10 Fälle), in der echten Testinstallation noch nicht.

## Stand 22.10., 12:25 Uhr: alle fünf Trupps fertig
- **Bild-Baustein** (`src/blocks/image`: `Picture.ts`, `address.ts`, `pictureStyle.ts`, `properties.ts`). Woher das Bild kommt:
  - eine feste Datei; ein reiner Dateiname wird im Bildordner von SoftEngine gesucht (`seimgpfad`)
  - ein Feld, dessen Wert unverändert als Bild dient
  - „Bild holen“: Artikelbild (1911), Medienbild (1912) oder eine andere Relation
- **Text mit Feldern:** `Angelegt von {Feld} am {Feld als Datum}`. Neue Einstellungen „Wenn leer“ und „Werte ersetzen“ (`A=Auftrag; R=Rechnung`). Ein Text kann jetzt auch eine Aktion bei Klick haben.
- **Gesamtprüfung:** `npm run build:runtime` (13 Bausteine, 312 KB), Typprüfung und `eslint src` sind grün.
- **Im Browser geprüft** auf einem frischen Server (Port 5301, Eintrag „aufbau-editor-pruefung“ in launch.json):
  - Bild-Platzhalter
  - Bereich „Klappbar“ mit „Startet eingeklappt“
  - Aktionen je Zeile der Werteliste
  - Zoom bei 100 %
  - keine Fehler in der Konsole
- **Achtung, Server auf Port 5300:** Eine andere Sitzung hat ihn um 11:43 gestartet, und er zeigte danach eine leere Seite (`backUpWith is not a function`). Das ist ein veralteter Zwischenstand, nachdem die Trupps gleichzeitig viele Dateien geändert hatten; der Code ist richtig. Lösung: diesen Server einmal beenden und neu starten. Die Bild-Sitzung hat ihn inzwischen neu gestartet, und der Editor läuft dort wieder (geprüft). Vites Dateiüberwachung verpasst bei vielen gleichzeitigen Änderungen manchmal eine Datei. Zeigt der Editor wieder eine leere Seite, hilft ein Neustart des Servers.
- **In SoftEngine noch nicht getestet:** alles von heute. Die Prüfliste für die Testinstallation steht unten.

## Prüfliste für die SoftEngine-Testinstallation
Vorher die Maske im Editor neu exportieren.
1. **Speichern:** Ein Feld ändern, das nach SoftEngine schreibt. Erwartet: ein grauer Haken („gesendet“) oder ein normaler Haken, nie ein roter Balken.
2. **Schnelle Eingaben:** Schnell nacheinander in zwei Felder tippen, den Beleg neu öffnen. Erwartet: beide Werte sind da.
3. **Abgelehnter Wert:** Einen Wert eingeben, den SoftEngine ablehnt. Erwartet: ein roter Balken mit dem Text von SoftEngine, und das Feld springt zurück.
4. **Klappbarer Bereich:** Einen Bereich der Form „Klappbar“ mit Bausteinen darunter auf- und zuklappen. Erwartet: Was darunter liegt, rückt nach.
5. **Klick je Zeile:** Eine Zeile der Werteliste mit START_TOOL 423 anklicken. Erwartet: Das Werkzeug startet.
6. **Bilder:** ein Logo als Dateiname, ART_2035_80 direkt, „Artikelbild (1911)“ mit der Artikelnummer und „Medienbild (1912)“, zum Beispiel in Rahmen10000 mit ADR_1765_10.
7. **Kopfzeile:** Ein Text „Angelegt von … am …“ zeigt die richtigen Werte.
8. **Fehlersuche:** In den Entwicklerwerkzeugen `localStorage.setItem('ff-debug','1')` eingeben, neu laden, Punkt 1 wiederholen und die Konsolenausgabe an Claude geben. Daran sieht man, was SoftEngine auf PUT_RELATION antwortet.

## Nachtrag 22.10., etwa 12:10 Uhr
- **Fertig: Masken öffnen ohne Datenverlust.**
  - Was der Editor nicht lesen kann, legt er beiseite und schreibt es beim Speichern unverändert zurück. Dafür gibt es den neuen Abschnitt `leftover` in der Maskendatei.
  - Jede Maskendatei trägt jetzt `editorVersion`.
  - Ist eine Datei neuer als der Editor oder enthält sie Unlesbares, öffnet er sie nur zum Ansehen. Der Knopf „Trotzdem bearbeiten“ hebt das auf.
  - Vor dem ersten Überschreiben landet eine Sicherung im Maskenordner unter `.sicherung/`.
  - **Offen:** In der Kopfleiste fehlt ein Schild „Nur zum Ansehen“, und der Export warnt nicht vor beiseitegelegten Teilen. Gehört in `editor/shell/Toolbar.tsx`; `editor.maskLocked` und `editor.leftover` stehen dafür bereit.
- **Fertig: Einklappen und Klick je Zeile.**
  - Bereich: neue Form „Klappbar“ mit der Option „Startet eingeklappt“. Im Editor bleibt der Bereich immer offen.
  - Werteliste: Jede Zeile kann eigene Aktionen haben, höchstens 40 je Werteliste.
- **Fertig: NOW_TIME** (HH:MM) in `runtime/events.ts`, die Hilfsfunktion `nowTimeAsText` steht in `core/data/relations.ts`. Die Kanban-Sitzung hat die Freigabe für actions.ts, origins.ts und events.ts bekommen und trägt NOW_TIME und FROM_VALUE dort selbst ein.
- **Typprüfung** (`npx tsc -p tsconfig.app.json --noEmit`) war um 12:05 Uhr grün.
- **Testmaske für den Bild-Baustein:** `E:\DATA\VSES-Muhammed\V7\APP\VORLAGEN_INDIV\Belegerfassung\LAYOUTRAHMEN\10000`. Sie ist mit dem Editor gebaut, also nur im Editor ändern und neu exportieren, nicht in der Datei.
  - Die Quelle „Adressstamm“ (ADRESSE.GET) braucht zusätzlich das Feld ADR_1765_10, die Medien-Nummer. Das Bild kommt dann über GET_RELATION 1912 mit den Parametern ADR_1765_10 und "J".
  - Ob es die Tabelle ADR ist, hat der Nutzer nicht bestätigt; ADR ist nur sehr wahrscheinlich.
- **Noch offen beim Abbruch:** nur der Bild-Trupp (Punkt 3 unten). Inzwischen erledigt: Es gibt nur noch `Picture.ts`, die Prüfungen sind grün (12:30 Uhr).

## Lief noch beim Abbruch, zuerst prüfen
Punkte 1 und 2 sind laut Nachtrag fertig, offen ist nur noch Punkt 3. Prüfe, was fertig ist, bring den Rest zu Ende, dann `npm run build:runtime`, dann Typprüfung, dann im Editor ansehen.
1. **Masken öffnen ohne Datenverlust** (`src/editor/state/*`, `core/block/property.ts`, `core/data/dataSources.ts`, neu u. a. `leftover.ts`, `readMask.ts`, `editorVersion.ts`):
   - Unbekannte Bausteine, Eigenschaften und Datenquellen bleiben beim Öffnen und Speichern erhalten.
   - Vor dem ersten Überschreiben einer Datei wird eine Sicherung angelegt.
   - Die Editor-Version steht in der Maskendatei. Ist die Datei neuer als der Editor, öffnet er sie nur zum Lesen und sagt das.
2. **Einklappbare Bereiche und Klick je Zeile** (`src/blocks/area/*`, darunter `fold.ts`, und `src/blocks/valuelist/*`, darunter `lines.ts`):
   - Bereich: neue Eigenschaften „Einklappbar“ und „Startet eingeklappt“.
   - Werteliste: Jede Zeile kann eigene Aktionen haben, zum Beispiel ein Werkzeug starten.
3. **Bild-Baustein und Text aus Feldern** (neu `src/blocks/image`, dazu `src/blocks/text/*`, `core/block/fieldPattern.ts`, `propertyNames.ts`):
   - Das Bild kommt aus drei Quellen:
     - ein festes Bild
     - ein Feld, das den Bildpfad enthält, wie `<!--SOFTENGINE-VAR!ART_2035_80-->`
     - ein Feld, das eine Nummer enthält, die über GET_RELATION in ein Bild umgesetzt wird: 1911 für Artikelbilder (Parameter z. B. ART_1_25, "J"), 1912 für Medienbilder (Parameter z. B. ADR_1765_10, "J")
   - Belegstellen: InventurZaehllisten/index.basis.source.html Zeile 94, DSGVO_Datenauskunft_Privatadresse.html Zeile 57, MIS_V3/LANDINGPAGES/VTR/HTML/01/index.basis.SEvariablen.json Zeile 92.
   - Eine eingebaute Variable „ARTIKELBILD“ gibt es nicht.
   - Text: Er kann Feldwerte enthalten, etwa „Angelegt von {Feld} am {Feld}“. Leere Werte werden durch einen Ersatztext wie „-/-“ ersetzt.

## Zusage an die Kanban-Sitzung („Kanban-Editor mit vollständigen Funktionen“, gleicher Ordner)
- Die Kanban-Sitzung arbeitet in `src/blocks/kanban/*`, im Feldtyp „Suche“ (`blocks/formfield/properties.ts`, `FormField.ts`, neu `src/runtime/searchText.ts`) und in `editor/bar/ColumnBar.tsx`.
- Sie wartet auf ein Ja für `src/core/data/actions.ts`, `src/editor/origin/origins.ts` und `src/runtime/events.ts`.
- Sobald Trupp 2 fertig ist:
  1. In `runtime/events.ts` neben NOW_DATE auch **NOW_TIME** setzen (HH:MM, de-DE).
  2. Der Kanban-Sitzung schreiben, dass die drei Dateien frei sind.
- Die Sitzung „Bild aus Maske in HTML anzeigen“ hat nur recherchiert und baut keinen eigenen Bild-Baustein.

## Nächste Schritte
1. **Diagramm-Baustein:** Säule, Linie, Torte und Tacho, mit einem Feld für die Kategorie und Feldern für die Werte. 67 Vorlagen brauchen ihn, vor allem MIS_V3, PAN und KASSE.
2. **Baum-Baustein** (Elternschlüssel, auf- und zuklappen) und **Funktionstasten** für die ganze Maske und für Popups (F3, F9, F12, Esc).
3. **Eigener Stil statt SoftEngine-Farbschema:** Die Masken sollen schöner aussehen als die Originale, mit unseren Design-Tokens in `src/design/mask.css`. Vorschlag aus der Kanban-Sitzung: eine wählbare Akzentfarbe je Maske.
4. **Anzeige je nach Bedingung:** „Sichtbar wenn“ an jedem Baustein, Statusfarben, Ersatztext bei leeren Werten.
5. Alles im Editor durchprobieren und dem Nutzer eine kurze Klick-Prüfliste für die Testinstallation geben.
6. **Später:**
   - Datenquellen gemeinsam ablegen statt im Browser-Speicher jedes PCs.
   - Editor- und Laufzeitversion in jedem Export, Export wieder einlesen können, Sicherung vor dem Überschreiben beim Export.
   - Protokoll an selib angleichen (GET_RELATION mit ALIAS/ALS_ARRAY, START_TOOL mit BW_PFAD) und live testen.
   - Belegpositionen laden mit weniger Anfragen: heute sind es mindestens 100 GETs.
   - Weniger Neuzeichnen im Editor.
7. Ersatz-Kandidaten in dieser Reihenfolge: Belegerfassung Rahmen00001, Liefersystem SCLSA3, Kanban, danach MIS_V3.
