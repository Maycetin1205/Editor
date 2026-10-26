# Bauplan: Aufräumen auf Profi-Niveau

Stand 23.10.2026. Grundlage: Messung mit Werkzeugen (Abhängigkeiten, Kopien, toter Code, Funktionslängen) und drei Lese-Trupps (Datenwelt, Bausteine, Editor). Was die Maske kann, bleibt gleich. Nur die Bauweise ändert sich.

## Das Zielbild

Fünf Schichten. Jede darf nur Schichten unter sich benutzen, nie umgekehrt und nie im Kreis.

| Schicht | Was drin ist | Darf benutzen |
|---|---|---|
| `core/kernel` | kleinste Grundteile: Feldcodes (`12_8`), Satzschlüssel, Prüfen fremder Daten, ein Register-Helfer | nichts |
| `core/model` | was eine Maske ist: Bausteinbaum, Einstellungen, Datenquellen, Parameter, Aktionsketten. Nur Typen, Lesen, Prüfen. Kein DOM, keine Laufzeit, kein Editor | kernel |
| `core/wire` | das Format zwischen Export und laufender Maske | model |
| `export`, `runtime`, `editor` | schreiben, ausführen, bearbeiten | wire, model, kernel |
| `blocks` | die Bausteine (Lit), zusammengesteckt aus gemeinsamen Steckteilen | runtime, model, kernel |

- SoftEngine wird beim Start der Maske über die Schnittstelle `MaskHost` eingesetzt und ist sonst nirgends fest eingetragen. Die Logik des Anschlusses (`src/softengine`) bleibt unangetastet.
- Vererbung bleibt eine flache Ebene (`BlockElement`). Gemeinsame Fähigkeiten werden Steckteile, keine Elternklassen.
- Die Regeln werden automatisch geprüft: Importregeln je Ordner in eslint und eine Kreis-Prüfung in `npm run check` und auf GitHub.

## Was nicht kaputtgehen darf

- Das Maskenformat mit seinen 39 Versionsstufen (`editor/state/maskSchema.ts`). Alte Masken müssen sich weiter öffnen lassen.
- Das Format der Datenquellen-Bibliothek (`librarySchema`).
- Alles, was in exportierten Masken steht: Tag-Namen wie `ff-datalist`, Attribute `data-ff-*`, `FF_DATA_SOURCES`, das SEVariablen-Blatt (es schreibt immer `ERPAPICALL: []`).
- Der SoftEngine-Anschluss.

## Gefundene Probleme

### Grundlage (core)
1. **Bauzeit- und Laufzeit-Code in denselben Teilen.** Die Adapter für Datenlieferung und Aktionsschritte enthalten Editor-, Export- und Laufzeitcode zusammen (`core/data/deliveries/deliveryAdapter.ts`, `core/data/steps/stepAdapter.ts`). Dadurch steckt Editor-Code in jeder exportierten Maske (nachgeprüft: `withBlockIds`, `giverFields` in `runtime.json`).
2. **Sammelstelle `core/data/dataSources.ts`**: Typ, Export, Editor-Auswahl, Einlesen und Namen in einer Datei. 266 Dateien hängen daran, 37 von 52 direkten Nutzern brauchen nur den Typ.
3. **Kreise**: 27 Dateien (Datenquellen), 10 (Aktionsschritte und Baum), 9 (`editor/actions`), 6 (`editor/state`), 4 (`writes`), 3 (Laufzeit: `maskState` ↔ `softEngineHost` ↔ `jobs`).
4. **Zwei Wörterbücher für dasselbe**: `Parameter` und `ValueOrigin` (`core/data/valueOrigin.ts`). Eine neue Parameterquelle muss an fünf Stellen nachgetragen werden.
5. **Doppelte Wahrheit**: Die Art einer Datenquelle wird gespeichert und zusätzlich zurückgerechnet (`choiceOf`). Positionen werden an zwei Stellen unterschiedlich erkannt.
6. **Kaputter Schritt verwirft die ganze Aktionskette ohne Meldung** (`core/data/steps/chains.ts`).

### Laufzeit
7. **Aktionsablauf `runtime/events.ts`**: eine Funktion mit 8 Eingaben und 10 Merkern. Die Regel „keine Bestätigung bleibt kleben" steht doppelt.
8. **Globaler Sammelbehälter `runtime/maskState.ts`** für den gesamten Laufzeit-Zustand, 27 Nutzer.

### Bausteine
9. **Dieselbe Aufgabe mehrfach verschieden gelöst**:
   - Zeilen laden (5 Arten)
   - Auswahl (4)
   - Klick startet Aktionskette (3 fast gleich in Knopf, Text, Bild)
   - Enter/Leertaste (5)
   - Listen bearbeiten im Editor (3)
   - Pfeiltasten-Bewegung (3)
   - Vorschläge filtern (2)
   - Zahlformat (mehrfach)
10. **Zwei Suchen mit verschiedenem Ergebnis**: In der Tabelle findet „muller" auch „Müller", im Kanban nicht (`blocks/parts/cellSearch.ts` gegenüber `runtime/searchText.ts`, nachgeprüft).
11. **Erfassung (`blocks/capture`)**: 3.386 Zeilen. Eine Fassade mit 50 Durchreich-Methoden, `captureRow.ts` mit fünf Aufgaben.
12. **Stiller Vertrag über CSS-Klassen** zwischen Tabellenmotor und Erfassung (`.row`, `.body`, `.head` …). Wer eine umbenennt, bekommt keinen Fehler, nur eine kaputte Maske.
13. **Fachwissen im allgemeinen Teil**: Tierarten (`blocks/parts/animal.ts`), „Belegt/Frei", „Wartet seit" stammen aus der Kleintierpraxis.

### Editor
14. **`EditorStore` macht acht Dinge**: Baum, Auswahl, Seiten, Verlauf, Bibliotheken, Ansicht, Dateien, Benachrichtigung. Etwa 20 Methoden reichen nur durch.
15. **Zu grobe Abos**: Jede Änderung zeichnet alles neu. Beim Ziehen eines Bausteins wird bei jeder Mausbewegung die ganze Fläche neu gezeichnet. `useView` meldet sich bei jedem Zeichnen neu an (nachgeprüft).
16. **Geschäftslogik in Oberflächenteilen**: Export (101 Zeilen in `Toolbar.tsx`), Speichern, Abgleich der Dateien.
17. **Bei jeder Benachrichtigung wird gespeichert**, auch wenn nur die Auswahl wechselt.
18. **Vier selbstgebaute Zieh-Abläufe.** Nur einer kennt Escape, keiner räumt auf.
19. **React spricht mit React über ein DOM-Ereignis** (`'ff-list-bind'`, nachgeprüft).

### Überall
20. **Unklare und mehrdeutige Namen**:
    - Ausgedacht: `Deed`, `kept`, `Places`, `Piece`, `Helpers`, `holding`.
    - Mehrdeutig: `Spot` mit 4 Bedeutungen, `frame` mit 4, Auswahl mal `selected`, mal `chosen`, mal `picked`.
    - Deutsche Zustände im Code: `'ruhig'`, `'schreibt'`, `'gesendet'`.
21. **Kommentare**:
    - Reste: Leerzeilen mitten in Typen, wo früher Kommentare standen.
    - Tagebuch-Kommentare mit Datum.
    - An kniffligen Stellen fehlt das „Warum".

## Große Dateien

329 von 393 Dateien haben unter 200 Zeilen. Zu groß sind etwa 25 Dateien: 8 mit über 400 Zeilen, 17 mit 300 bis 400. Sie sind groß, weil sie mehrere Aufgaben gesammelt haben, nicht weil eine Aufgabe so viel Code braucht. Geteilt wird deshalb nach Aufgaben, nicht nach Zeilenzahl.

| Datei | Zeilen | Wird zu | Phase |
|---|---|---|---|
| `editor/state/EditorStore.ts` | 577 | Dokument, Verlauf, Ansicht, Speichern | 4 |
| `blocks/capture/ledger/captureRow.ts` (+ `ledger.ts`, `Capture.ts`) | 557 (+334, +328) | Tippzeile, verknüpfte Sätze, Berechnung, Vorschläge, Aufteilen; Fassade fällt weg | 3 |
| `blocks/kanban/kanbanStyle.ts`, `blocks/list/tableStyle.ts` | 484, 473 | Style je Teil (Kopf, Spalte, Karte, Zeile, Fuß) | 3 |
| `editor/state/maskSchema.ts` | 433 | je Gruppe von Versionsstufen eine Datei | 4 |
| `blocks/kanban/Kanban.ts` | 420 | Laden, Auswahl, Suche wandern in Steckteile | 3 |
| `runtime/events.ts` | 418 | Sperre, Abschnitte, Schritte, Ergebnis | 2 |
| `blocks/list/recordList.ts`, `tableBody.ts` | 385, 350 | Tabellenmotor: Daten, Sortieren/Filtern, Zeichnen | 3 |
| `editor/canvas/SplitWindow.tsx`, `ColumnControls.tsx` | 378, 363 | Fenster und Spaltensteuerung in kleine Teile | 4 |
| `editor/actions/Places.tsx` | 357 | Parameterliste, Zeile, Vorschau | 2 |
| `softengine/relations/hostQueue.ts` | 669 | bleibt (SoftEngine-Anschluss) | – |

Nicht von Hand geschrieben und deshalb in Ordnung: `src/export/generated/runtime.json` (323 KB, wird bei jedem Start gebaut, nicht auf GitHub) und `package-lock.json` (154 KB, Paketliste von npm).

Größenbremse: eslint `max-lines` (300) und `max-lines-per-function` (80) laufen ab Phase 1 als Warnung in der Prüfung mit und werden nach dem Umbau zum Fehler. So wächst keine Datei unbemerkt wieder zu, auch nicht durch eine KI.

## Reihenfolge

Jeder Schritt ist ein eigener Stand auf GitHub. Danach laufen Typprüfung, eslint, Formatierung, knip, die Kreis-Prüfung und der Build.

**Phase 1: Ordnung ohne Verhaltensänderung** (nacheinander, geringes Risiko)
- Doppeltes einsammeln: `data-ff-actions`, Feldcode-Lesen, Enter/Leertaste, Listen bearbeiten, Zahlformat, eine gemeinsame Suche (behebt den Müller-Fehler, die einzige gewollte Verhaltensänderung).
- Kreise lösen: Typen in Blatt-Dateien, SoftEngine beim Start einsetzen statt in `maskState` fest eintragen.
- Importregeln je Ordner, eine Kreis-Prüfung und die Größenbremse einschalten.
- Kommentare: Tagebuch und Leerzeilen-Reste raus, kurze Warum-Sätze an den kniffligen SoftEngine-Stellen.

**Phase 2: Grundlage** (nacheinander, weil alles darauf steht)
- `dataSources.ts` nach Nutzern teilen.
- Bauzeit und Laufzeit trennen: Export-Code nach `src/export`, Ausführung nach `src/runtime`. Die exportierte Maske wird kleiner, das ist messbar.
- `Parameter` und `ValueOrigin` vereinen.
- Den Aktionsablauf in vier kleine Teile zerlegen.
- `maskState` in kleine Zustände je Thema aufteilen.

**Phase 3: Bausteine** (Trupps gleichzeitig, jeder in eigener Kopie)
- Steckteile, eins nach dem anderen: `ActionChains`, `SourceRows`, `RowPick`, `cardSpots`, `pressable`, `listEditing`.
- Erfassung zerlegen (Fassade weg, `captureRow` in fünf Teile, Ordner `split/`).
- Den CSS-Vertrag Tabellenmotor/Erfassung durch feste Namen am Motor ersetzen.

**Phase 4: Editor**
- `EditorStore` aufteilen in Dokument, Verlauf, Ansicht, Speichern, mit einem einzigen Weg für Änderungen.
- Feine Abos mit Selektoren: Nur das neu zeichnen, was sich geändert hat.
- Export, Speichern und Öffnen als eigene Befehle statt in Oberflächenteilen.
- Arbeitsfläche neu gliedern: Fläche, Bausteine, Ziehen, Feldbindung, Fenster. Ein gemeinsamer Zieh-Ablauf mit Escape.

**Phase 5: Namen**
- Ein Begriff pro Schritt.
- Was in gespeicherten oder exportierten Masken steht, bleibt als Alias gültig.

**Danach:** neue Bausteine.
