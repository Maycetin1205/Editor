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
| `maskSchema.ts` (433) | Hebungen in `lifts/`, danach gestrichen (siehe unten) |
| Deutsche Zustände im Code (`'ruhig'`, `'lädt'`) | englische Bezeichner, deutsche Wörter nur für den Nutzer |
| Tagebuch-Kommentare mit Datum | raus, bis auf drei in Dateien, die gerade umgebaut werden |
| Erfundene Namen `Deed`, `kept` | `Finished`, `persistence` |
| Absturzanzeige ohne Fehler und Ausweg | Fehlertext, Sicherung herunterladen, Maske im Browser zurücksetzen |
| Palette ließ Bausteine ohne Wort verschwinden, wenn der Bereich voll war | die Seite nimmt sie, sonst eine Meldung |
| Tabellenmotor: `tableStyle.ts` (473), `recordList.ts` (385), `tableBody.ts` (350), `parts/column.ts` (323) | Stil je Teil unter `list/style`, Modell ohne DOM, Zeichnen je Teil, Bedienung je Modul; DOM-Klassennamen in `TABLE_PART`, Erfassung und Nachschlagen nutzen sie; 17 Abläufe vorher/nachher gleich |
| Erfassung: Fassade `ledger.ts` (54 Durchreich-Methoden), `captureRow.ts` (555) | Fassade weg, Tippzeile in zehn Teile unter `capture/row`, Aufteilung unter `capture/split`, Tasten über `keys.ts`; größte Datei 265 Zeilen |
| Lange React-Komponenten (acht Dateien) | keine Funktion über 80 Zeilen, Teile mit eigenen Props und Hooks |
| Zwei Kopien von „Schließen bei Druck daneben“ | `widgets/closeBeside.ts` |
| Vier selbstgebaute Zieh-Abläufe auf der Fläche, nur einer kannte Escape, keiner räumte beim Unmount auf | ein Helfer `canvas/pointerDrag.ts` (Schwelle, Zeigererfassung, Escape, pointercancel, blur, Unmount); Verschieben, Rastergröße, Fenstergröße und Spaltenköpfe laufen darüber; Ablegen aus der Palette bleibt HTML5 |
| React sprach über das DOM-Ereignis `ff-list-bind` mit React | ein Rückruf `onPick` |
| `SplitWindow.tsx` (378), `ColumnControls.tsx` (363), `Places.tsx` (357), `Grid.tsx` (350), `SourceSettings.tsx` (316) | je in Rahmen, Liste, Zeile, Einstellungen geteilt; größte Datei 246 Zeilen |
| Hörer und Stilobjekte, die bei jedem Zeichnen neu entstanden | behoben in ColumnPlus, BlockHost, Canvas, useView |
| Escape beim Größenändern behielt die erreichte Größe | `GestureBracket.cancel()` rollt über `History.abandon()` auf den Stand beim Öffnen zurück, ohne Rückgängig-Schritt, Wiederholen bleibt; gilt für Baustein, Popup-Seite und Nachschlagefenster |
| Hebungen alter Masken (Stufe 20 bis 38, nur gegen synthetische Dokumente geprüft) | gestrichen; eine Maske unter 39 wird mit „zu alte Fassung“ abgelehnt |
| Verdacht auf Fehler (12 Fälle aus dem Umbau) | je ein Commit: Kanban (Meldung nach Aushängen, Ankunftsmeldung erst nach bestätigtem Schreiben, Jetzt-Linie vor Karten ohne Uhrzeit); Tabelle (Sortierung bleibt beim Wechsel der Zeilenquelle, tote `rawIndex === null`-Zweige raus); Erfassung (Auswahl folgt der korrigierten Zeile, geleerte Korrektur fragt vor dem Löschen, Einfügen nur an eine sichtbare Erfassung, Doppelklick beim Laden wird nachgeholt); Fläche (Fenstergriff hebt die Auswahl nicht auf, tote `dragId`-Zweige raus, Escape beim Ziehen geht vor offenen Fenstern) |

## Offen

1. **Namen**: `Piece` (Schritt-Teile im Editor), `holding` (Spalten), `Spot` mit mehreren Bedeutungen, `selected`/`chosen`/`picked` für die Auswahl. Ein Begriff je Ding, Aliasse für alles, was in Dateien steht.
2. **Feine Abos im Editor**: `useEditor()` zeichnet jeden Abonnenten bei jeder Änderung neu. Ein `useEditorSelect(selector)` auf `useSyncExternalStore`, zuerst für die Fläche.
3. **Größenbremse scharf schalten**: `max-lines` 300 und `max-lines-per-function` 80 von Warnung auf Fehler, sobald die laufenden Umbauten drin sind. Für React-Komponenten ist 80 Zeilen zu knapp; Vorschlag 120 für `.tsx`.
4. **Erfassung und Kanban**: beide bleiben (Belegpositionen sind Kern, das Brett ist allgemein brauchbar). Beide brauchen nach dem Umbau eine zweite Lesung auf Verständlichkeit.
5. **Hebungen alter Masken**: erledigt, siehe oben.
6. **SoftEngine-Anschluss**: gegen eine Installation geprüft (laut Betreiber); die offenen Fragen in `docs/SOFTENGINE-SCHNITTSTELLE.md` bleiben dokumentiert.
7. **Verdacht auf Fehler**: erledigt, siehe oben.
8. **Escape beim Größenändern**: erledigt, siehe oben.
9. **Beim Ziehen eines Bausteins zeichnet die ganze Fläche** bei jeder Zeigerbewegung neu, weil der Zieh-Zustand im Canvas-Kontext liegt. Erst messen, dann mit Selektoren (`useEditorSelect`) und gemerkten Knoten beheben.

## Danach

Bausteine und Einstellungen nach `docs/BAUSTEINE.md`, dann das Design.
