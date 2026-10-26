# Bauplan: Stand und offene Punkte

Stand 26.10.2026, Zweig `marktreife`. Die Architektur steht in `docs/ARCHITEKTUR.md`, die Bausteine und Einstellungen in `docs/BAUSTEINE.md`.

## Erledigt

| Punkt | Ergebnis |
|---|---|
| Importkreise (27 Dateien im Datenkern, 10 im Baum, 9 im Editor, 6 im Zustand, 4, 3, 3, 2) | null Kreise; `npm run cycles` erlaubt null |
| Sammelstelle `dataSources.ts` | Adapter kennen eine Quelle als `SourceFacts`; die vier Adapter-Familien sind nach einem Muster gebaut |
| Bauzeit und Laufzeit in den Aktionsschritten | Ausführen in `runtime/steps`, Lesen und Export in `core/data/steps` |
| Globaler Sammelbehälter `maskState` | aufgelöst; der Host ist eine Funktion (`runtime/host.ts`) |
| `runtime/events.ts` (418 Zeilen) | vier Teile in `runtime/actions` |
| `EditorStore` (585 Zeilen, acht Aufgaben) | Ansicht und Dateien eigene Teile, 380 Zeilen |
| Export in der Werkzeugleiste | `editor/commands/exportMask.ts` |
| Zwei Suchen mit verschiedenem Ergebnis | eine Suche, Umlaute überall gefaltet |
| Kleintierpraxis im Kanban | raus (Tierarten, Wortlaut); „Belegt/Frei“ bleibt als allgemeine Belegung |
| `kanbanStyle.ts` (484), `Kanban.ts` (419) | Stil je Teil, Karte und Platz als Module |
| `hostQueue.ts` (669) | Reihe, Fragen (`getJob.ts`), Schreiben (`putJob.ts`), Auftrag (`job.ts`) |
| `data.ts` (338) | Felder in `fields.ts` |
| `maskSchema.ts` (433) | Hebungen in `lifts/` |
| Deutsche Zustände im Code (`'ruhig'`, `'lädt'`) | englische Bezeichner, deutsche Wörter nur für den Nutzer |
| Tagebuch-Kommentare mit Datum | raus, bis auf drei in Dateien, die gerade umgebaut werden |
| Erfundene Namen `Deed`, `kept` | `Finished`, `persistence` |
| Absturzanzeige ohne Fehler und Ausweg | Fehlertext, Sicherung herunterladen, Maske im Browser zurücksetzen |
| Palette ließ Bausteine ohne Wort verschwinden, wenn der Bereich voll war | die Seite nimmt sie, sonst eine Meldung |

## In Arbeit

- Tabellenmotor: `tableStyle.ts` (473), `recordList.ts` (385), `tableBody.ts` (350), `parts/column.ts` (323) nach Aufgaben teilen; DOM-Klassennamen als Konstanten.
- Erfassung: die Fassade `ledger.ts` (54 Durchreich-Methoden) weg, `captureRow.ts` (555) in seine fünf Aufgaben, Zahlformat über `core/data/number.ts`, eine Tastenhilfe statt fünf.
- Editor-Fläche: ein Zieh-Ablauf mit Escape und Aufräumen statt vier; `SplitWindow.tsx` (378), `ColumnControls.tsx` (363), `Places.tsx` (357), `Grid.tsx` (350) teilen; React spricht nicht mehr über ein DOM-Ereignis (`ff-list-bind`) mit React.
- Lange React-Komponenten (MasksTab, RelationsTab, BarControl, ColumnBar, SourceList, RelationBody, Popover, List) unter 80 Zeilen je Funktion.

## Offen

1. **Namen**: `Piece` (Schritt-Teile im Editor), `holding` (Spalten), `Spot` mit mehreren Bedeutungen, `selected`/`chosen`/`picked` für die Auswahl. Ein Begriff je Ding, Aliasse für alles, was in Dateien steht.
2. **Feine Abos im Editor**: `useEditor()` zeichnet jeden Abonnenten bei jeder Änderung neu. Ein `useEditorSelect(selector)` auf `useSyncExternalStore`, zuerst für die Fläche.
3. **Größenbremse scharf schalten**: `max-lines` 300 und `max-lines-per-function` 80 von Warnung auf Fehler, sobald die laufenden Umbauten drin sind. Für React-Komponenten ist 80 Zeilen zu knapp; Vorschlag 120 für `.tsx`.
4. **Erfassung und Kanban**: beide bleiben (Belegpositionen sind Kern, das Brett ist allgemein brauchbar). Beide brauchen nach dem Umbau eine zweite Lesung auf Verständlichkeit.
5. **Hebungen alter Masken**: Stufe 20 bis 38 sind nur gegen synthetische Dokumente geprüft; es gibt keine echte alte Maske im Projekt. Eine echte Maske jeder noch im Umlauf befindlichen Stufe gehört als Beispiel ins Projekt, oder die Hebungen unter 39 werden gestrichen, wenn es solche Masken nicht mehr gibt.
6. **SoftEngine-Anschluss**: gegen eine Installation geprüft (laut Betreiber); die offenen Fragen in `docs/SOFTENGINE-SCHNITTSTELLE.md` bleiben dokumentiert.
7. **Bekannte Kleinigkeiten** (aus dem Kanban-Umbau, nicht behoben): die Meldung einer Karte bleibt nach Aus- und Einhängen stehen (`Kanban.ts`, `disconnectedCallback`); die Ankunftsmeldung erscheint, bevor das Schreiben bestätigt ist (`board.ts`); die Jetzt-Linie der Uhr steht hinter Karten ohne Uhrzeit, wenn alle Zeiten vorbei sind (`clock.ts`).

## Danach

Bausteine und Einstellungen nach `docs/BAUSTEINE.md`, dann das Design.
