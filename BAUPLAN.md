# Bauplan: Stand und offene Punkte

Stand 27.10.2026, Zweig `marktreife` mit den Schritten vom 27.10. darauf. Die Architektur steht in `docs/ARCHITEKTUR.md`, die Bausteine und Einstellungen in `docs/BAUSTEINE.md`.

## Erledigt

| Punkt | Ergebnis |
|---|---|
| Importkreise (27 Dateien im Datenkern, 10 im Baum, 9 im Editor, 6 im Zustand, 4, 3, 3, 2) | null Kreise; `npm run cycles` erlaubt null |
| Sammelstelle `dataSources.ts` | Adapter kennen eine Quelle als `SourceFacts`; die vier Adapter-Familien sind nach einem Muster gebaut |
| Bauzeit und Laufzeit in den Aktionsschritten | Ausführen in `runtime/steps`, Lesen und Export in `core/data/steps` |
| Globaler Sammelbehälter `maskState` | aufgelöst; der Host ist eine Funktion (`runtime/host.ts`) |
| `runtime/events.ts` (418 Zeilen) | vier Teile in `runtime/actions` |
| `EditorStore` (585 Zeilen, acht Aufgaben) | Ansicht, Dateien und Verlauf eigene Teile (`editor.view`, `editor.files`, `editor.history`), 346 Zeilen |
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
| Namen: `Piece`, `holding`, `Spot` in fremden Bedeutungen, `selected` für die gewählte Zeile der Maske | Zusammenfassung/Reiter, `kind`, `HeadHandle`/`firstFocusable`, `chosen`/`recordChoice`; Wörter in `docs/ARCHITEKTUR.md`. Nichts davon stand in Dateien, Aliasse waren nicht nötig |
| Beim Ziehen zeichnete die ganze Fläche bei jeder Zeigerbewegung (gemessen: 51 Komponenten je Bewegung, darunter alle 12 Bausteine) | Zieh-Zustand als eigener Speicher (`DndState`, `useDndSelect`), Baustein und Platz getrennt (`CanvasNode`, `CanvasBlock`); 2,5 Komponenten je Bewegung, Skriptzeit 62 statt rund 220 ms auf 40 Bewegungen |
| Feine Abos für die Fläche (`useEditorSelect` mit Vergleich) | Ändern einer Eigenschaft zeichnete alle Bausteine der Fläche neu (12 von 12), jetzt nur den geänderten; je Änderung 54 statt 101 Komponenten |
| Feine Abos für Seitenleiste, Werkzeugleiste und Fenster | Bausteinliste, Seitenreiter, Maskenname und Speichern hören je ihren Ausschnitt (als `memo`); Schritt-, Berechnungs- und Verteilen-Fenster hören geschlossen nur die Ansicht; Rahmen, Seitenleiste und Inspektor lesen aus der Ansicht nur ihre Werte. Gemessen wie React DevTools mit sechs Bausteinen: Eigenschaft ändern 99 → 58, Baustein wählen 116 → 85, Verschieben 102 → 61, nur Ansicht (Umrisse) 141 → 35 Komponenten |
| `editor/state` importierte React-Teile und den Export (zuletzt 4 Stellen) | was Maske und Export beide brauchen in `core/data/usedByMask.ts`, Tastenkürzel nach `shell/`; die Importregel ist ein Fehler |
| Größenbremse als Warnung (zuletzt 8 Stellen) | Fehler: Dateien 300, Funktionen 80, React-Komponenten 120 Zeilen; null Warnungen. Geteilt nach Aufgaben: Verlauf, Berechnungsfenster, Leiste eines Listeneintrags, Zoom, Beobachter der SoftEngine-Reihe |
| Erfassung und Kanban: zweite Lesung | jede Datei sagt, wofür sie da ist, Warum-Sätze an kniffligen Stellen (`WorkingRow`, Spalten, Ausgang, Verteilen); der Platz einer Karte heißt `cell` wie `BoardCell` |
| Escape beim Größenändern behielt die erreichte Größe | `GestureBracket.cancel()` rollt über `History.abandon()` auf den Stand beim Öffnen zurück, ohne Rückgängig-Schritt, Wiederholen bleibt; gilt für Baustein, Popup-Seite und Nachschlagefenster |
| Hebungen alter Masken (Stufe 20 bis 38, nur gegen synthetische Dokumente geprüft) | gestrichen; eine Maske unter 39 wird mit „zu alte Fassung“ abgelehnt |
| Verdacht auf Fehler (12 Fälle aus dem Umbau) | je ein Commit: Kanban (Meldung nach Aushängen, Ankunftsmeldung erst nach bestätigtem Schreiben, Jetzt-Linie vor Karten ohne Uhrzeit); Tabelle (Sortierung bleibt beim Wechsel der Zeilenquelle, tote `rawIndex === null`-Zweige raus); Erfassung (Auswahl folgt der korrigierten Zeile, geleerte Korrektur fragt vor dem Löschen, Einfügen nur an eine sichtbare Erfassung, Doppelklick beim Laden wird nachgeholt); Fläche (Fenstergriff hebt die Auswahl nicht auf, tote `dragId`-Zweige raus, Escape beim Ziehen geht vor offenen Fenstern) |

## Offen

1. **Namen**: erledigt, siehe oben.
2. **Feine Abos im Editor**: erledigt, siehe oben. Der Inspektor zeichnet weiter bei jeder Änderung der Maske: er zeigt Quellen in Reichweite und Geber anderer Bausteine, die von der ganzen Maske abhängen; ein enger Ausschnitt zeigte dort veraltete Werte.
3. **Größenbremse**: erledigt, siehe oben.
4. **Erfassung und Kanban**: beide bleiben (Belegpositionen sind Kern, das Brett ist allgemein brauchbar); zweite Lesung erledigt, siehe oben.
5. **Hebungen alter Masken**: erledigt, siehe oben.
6. **SoftEngine-Anschluss**: gegen eine Installation geprüft (laut Betreiber); die offenen Fragen in `docs/SOFTENGINE-SCHNITTSTELLE.md` bleiben dokumentiert.
7. **Verdacht auf Fehler**: erledigt, siehe oben.
8. **Escape beim Größenändern**: erledigt, siehe oben.
9. **Beim Ziehen zeichnete die ganze Fläche**: erledigt, siehe oben.

## Danach

Bausteine und Einstellungen nach `docs/BAUSTEINE.md`, dann das Design.
