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
| Tabellenmotor: `tableStyle.ts` (473), `recordList.ts` (385), `tableBody.ts` (350), `parts/column.ts` (323) | Stil je Teil unter `list/style`, Modell ohne DOM, Zeichnen je Teil, Bedienung je Modul; DOM-Klassennamen in `TABLE_PART`, Erfassung und Nachschlagen nutzen sie; 17 Abläufe vorher/nachher gleich |
| Erfassung: Fassade `ledger.ts` (54 Durchreich-Methoden), `captureRow.ts` (555) | Fassade weg, Tippzeile in zehn Teile unter `capture/row`, Aufteilung unter `capture/split`, Tasten über `keys.ts`; größte Datei 265 Zeilen |
| Lange React-Komponenten (acht Dateien) | keine Funktion über 80 Zeilen, Teile mit eigenen Props und Hooks |
| Zwei Kopien von „Schließen bei Druck daneben“ | `widgets/closeBeside.ts` |

## In Arbeit

- Editor-Fläche: ein Zieh-Ablauf mit Escape und Aufräumen statt vier; `SplitWindow.tsx` (378), `ColumnControls.tsx` (363), `Places.tsx` (357), `Grid.tsx` (350) teilen; React spricht nicht mehr über ein DOM-Ereignis (`ff-list-bind`) mit React.

## Offen

1. **Namen**: `Piece` (Schritt-Teile im Editor), `holding` (Spalten), `Spot` mit mehreren Bedeutungen, `selected`/`chosen`/`picked` für die Auswahl. Ein Begriff je Ding, Aliasse für alles, was in Dateien steht.
2. **Feine Abos im Editor**: `useEditor()` zeichnet jeden Abonnenten bei jeder Änderung neu. Ein `useEditorSelect(selector)` auf `useSyncExternalStore`, zuerst für die Fläche.
3. **Größenbremse scharf schalten**: `max-lines` 300 und `max-lines-per-function` 80 von Warnung auf Fehler, sobald die laufenden Umbauten drin sind. Für React-Komponenten ist 80 Zeilen zu knapp; Vorschlag 120 für `.tsx`.
4. **Erfassung und Kanban**: beide bleiben (Belegpositionen sind Kern, das Brett ist allgemein brauchbar). Beide brauchen nach dem Umbau eine zweite Lesung auf Verständlichkeit.
5. **Hebungen alter Masken**: Stufe 20 bis 38 sind nur gegen synthetische Dokumente geprüft; es gibt keine echte alte Maske im Projekt. Eine echte Maske jeder noch im Umlauf befindlichen Stufe gehört als Beispiel ins Projekt, oder die Hebungen unter 39 werden gestrichen, wenn es solche Masken nicht mehr gibt.
6. **SoftEngine-Anschluss**: gegen eine Installation geprüft (laut Betreiber); die offenen Fragen in `docs/SOFTENGINE-SCHNITTSTELLE.md` bleiben dokumentiert.
7. **Verdacht auf Fehler**, beim Umbau gefunden und bewusst nicht ohne Rücksprache behoben, weil sie Verhalten ändern:
   - Kanban: die Meldung einer Karte bleibt nach Aus- und Einhängen stehen (`Kanban.ts`, `disconnectedCallback`); die Ankunftsmeldung erscheint, bevor das Schreiben bestätigt ist (`board.ts`); die Jetzt-Linie der Uhr steht hinter Karten ohne Uhrzeit, wenn alle Zeiten vorbei sind (`clock.ts`).
   - Tabelle: `viewChoices.ts` `reset()` löscht beim Wechsel der Zeilenquelle die gemerkte Sortierung des Bedieners; in `tableRows.ts` sind die Zweige für `rawIndex === null` womöglich tot (die Erfassung ist der einzige Lieferant, prüfen).
   - Erfassung: nach dem Erfassen einer korrigierten Zeile folgt die Auswahl der letzten statt der korrigierten Zeile (`Capture.ts`, `followTyping`); leere Tippzeile plus Enter während einer Korrektur löscht die Zeile ohne Rückfrage (`ledger/capturing.ts`); Einfügen ohne Fokus nimmt die erste Erfassung im Dokument, auch in einem geschlossenen Popup (`Capture.ts`); Doppelklick auf eine erfasste Zeile tut nichts, solange eine Quelle lädt, ohne Rückmeldung (`ledger/capturing.ts`).
   - Behoben: Platzhalter `$&` in Kanban-Meldungen; leere Werte bei absteigender Sortierung der Aufteilung.

## Danach

Bausteine und Einstellungen nach `docs/BAUSTEINE.md`, dann das Design.
