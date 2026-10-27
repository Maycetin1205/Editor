# Änderungen

## Unveröffentlicht (Zweig `marktreife`), Version 0.5.0

Vor allem geändert ist die Bauweise. Neu für Anwender sind der Reiter, der mehrzeilige Text im Feld und der neu gebaute Bereich; dazu die Korrekturen unten.

### Für Anwender sichtbar

- Bereich, neu gebaut (Entwurf vom 26.10.): drei Arten statt fünf Formen: Frei, Karte, Karte mit Kopf. Im Kopf rechts wahlweise ein Text, der Wert eines Feldes oder der Zähler der Liste im Bereich („12 Einträge“, Wort einstellbar). Klappbar ist ein Schalter der Karte mit Kopf, mit „Startet eingeklappt“ und „Klappzustand merken“ (im Browser des Bedieners). Ein Bereich mit eigener Quelle zeigt ohne Zeilen einen leeren Zustand mit Satz, Hinweis und einem Knopf, der das Ereignis „Knopf bei leer“ auslöst; „Ausblenden wenn leer“ nimmt ihn samt Platz von der Seite. Kommt seine Quelle nicht, zeigt er eine Fehlerzeile mit „Erneut laden“. Gespeicherte Masken werden beim Öffnen gehoben (Stufe 40): Kasten und Band werden Karte, Kopfzeile und Klappbar werden Karte mit Kopf, Klappbar mit gesetztem Schalter. Masken, die ein Bereich dieses Baus schon mit seinen Einstellungen gespeichert hat, bleiben unverändert; die Meldung „15 Einstellungen ließen sich nicht ganz lesen“ ist damit weg.
- Die Farben der Maske folgen dem Entwurf vom 26.10.: der Grund mit leichtem Blaustich, Tinte und Linien eine Spur kühler. Neu die Tokens `--se-accent-line`, `--se-radius-chip`, `--se-control`, `--se-head`, `--se-alert-edge`, `--se-fold`.
- Neuer Baustein „Reiter“: Seiten in einer Maske unter einer Leiste von Titeln, jede Seite ein Raster wie der Bereich. Ein neuer Reiter hat zwei Seiten; „+“ an der Leiste fügt eine an, ein Doppelklick auf einen Titel benennt die Seite um, Entf auf der gewählten Seite löscht sie. Im Editor zeigt ein Klick auf einen Titel die Seite, ohne dass das gespeichert wird; liegt die Auswahl auf einer Seite (etwa nach Rückgängig), steht diese offen. Einstellungen: Form (Kasten, Frei) und „Letzten Reiter merken“ (im Browser des Bedieners, wie die Sortierung einer Tabelle). Ereignis „Reiter gewechselt“, wenn der Bediener die Seite wechselt. In der Maske ist nur die offene Seite sichtbar; Pfeil links/rechts wechselt auf der Leiste. Bekommt ein Feld auf einer verborgenen Seite den Fokus (ein leeres Pflichtfeld vor einer Aktion), öffnet sich seine Seite vorher.
- Version 0.5.0: neue Bausteine und Eigenschaften (docs/RELEASE.md). Ein Editor 0.4 öffnet Masken dieses Editors nur zum Ansehen.
- Feld: neuer Feldtyp „Mehrzeilig“ für Bemerkungen, Notizen, Lieferhinweise. „Zeilen“ (2 bis 12) bestimmt die Höhe. Enter beginnt eine neue Zeile, Strg+Enter und Tab gehen zum nächsten Feld; „Wert geändert“ löst beim Verlassen aus wie beim einzeiligen Feld.
- Stürzt der Editor ab, zeigt er den Fehler, bietet die Sicherung der Maske und der Bibliothek als Datei an und kann die Maske im Browser zurücksetzen.
- Ein Baustein, der nicht mehr in den gewählten Bereich passt, landet auf der Seite; passt er auch dort nicht, sagt es eine Meldung. Vorher verschwand er.
- Die Suche findet „Müller“ mit „muller“ in jeder Liste, auch im Kanban.
- Kanban: der Kartenavatar zeigt den Anfangsbuchstaben; die Tierarten-Symbole der Kleintierpraxis sind weg. „Wartet seit“ heißt „Seit“.
- Masken unter Stufe 39 öffnen nicht mehr. Sie werden mit „kommt aus einer zu alten Fassung des Editors (Stufe …)“ abgelehnt, als Datei und aus dem Browser-Speicher. Die Hebungen der Stufen 20 bis 38 sind gestrichen. Liegt eine solche Maske im Browser, sagt der Editor das beim Start, lässt sie unverändert liegen und bietet sie zum Herunterladen an.
- Ziehen auf der Fläche: Escape bricht das Verschieben eines Bausteins ab, der Baustein bleibt, wo er war; vorher hob Escape nur die Auswahl auf und der Baustein wurde trotzdem abgelegt. Beim Größenändern (Baustein, Popup-Seite, Nachschlagefenster) setzt Escape die Größe zurück und hinterlässt keinen Rückgängig-Schritt; ebenso, wenn der Zeiger oder das Fenster verloren geht.
- Ziehen hebt die Auswahl nicht mehr auf.
- Ziehen auf der Fläche bei offenem Fenster (Daten, Berechnung, Popover): Escape bricht zuerst das Ziehen ab, das Fenster bleibt offen. Vorher schloss Escape das Fenster und der Baustein wurde beim Loslassen trotzdem abgelegt.
- Popup-Seite und Nachschlagefenster: Ziehen oder Klicken an einem Griff hebt die Auswahl nicht mehr auf. Vorher lief der Klick nach dem Loslassen bis zur Fläche und die Griffe verschwanden.
- Kanban: ein Titel mit „$&“ landet als Text in der Meldung, nicht als Muster.
- Erfassung, Verteilen: bei absteigender Sortierung stehen leere Werte hinten, nicht vorn.
- Datenliste: läuft auf dem Tabellenmotor (eine Spalte, ohne Kopf und Fuß). Sie sieht aus wie vorher, wählt, lädt und hört auf Tasten wie die Tabelle: Pfeil auf/ab gehen durch die Zeilen, Enter wählt, F4 und Doppelklick lösen Aktionen aus. Neu sind darum die Ereignisse „Zeile gewählt“, „Zeile doppelt geklickt“ und „F4 – Aktion an der Zeile“. Gespeicherte Masken öffnen unverändert.
- Kanban: die Meldung einer Spalte bleibt nicht mehr stehen, wenn das Brett während der Meldung aus- und wieder eingehängt wird (etwa beim Schließen und Öffnen eines Popups).
- Kanban: die Meldung einer Spalte („Meldung beim Ankommen“) erscheint erst, wenn das Schreiben bestätigt ist. Vorher erschien sie beim Ablegen, auch wenn die Aktion danach scheiterte und die Karte zurücksprang. Ohne Aktionskette, die schreibt, gibt es keine Meldung.
- Kanban, Spalte nach Uhrzeit: sind alle Zeiten vorbei, steht die Jetzt-Linie vor den Karten ohne Uhrzeit, nicht mehr dahinter.
- Erfassung: nach dem Erfassen einer korrigierten Zeile gilt die Auswahl der Maske für diese Zeile, nicht mehr für die letzte erfasste Zeile.
- Erfassung: wird eine zurückgeholte Zeile in der Tippzeile ganz geleert und mit Enter (oder Tab, Pfeil ab) abgeschlossen, fragt die Erfassung „Löschen / Abbrechen“, wie bei einer gebuchten Zeile. Vorher war die Zeile ohne Frage weg. Abbrechen lässt die Zeile in der Korrektur, Escape in der Tippzeile setzt sie wie bisher zurück.
- Erfassung: Einfügen (Taste Einfg) ohne Fokus in einer Erfassung geht an die erste sichtbare Erfassung, bei offenem Popup an die im Popup. Vorher ging die Taste an die erste Erfassung im Dokument, auch wenn sie in einem geschlossenen Popup stand, und nichts geschah.
- Erfassung: ein Doppelklick auf eine erfasste Zeile, während die Tippzeile auf eine Quelle wartet, wird nachgeholt: sobald die Quelle da ist, wird die Tippzeile erfasst und die Zeile kommt zur Korrektur zurück. Vorher ging der Doppelklick ohne Wort verloren. Tippen in der Tippzeile, Enter oder Escape heben die Bitte auf.

### Für Entwickler

- Keine Importkreise mehr; die Kreis-Prüfung erlaubt null.
- Die Adapter der Datenquellen (Schreiben, Bestellung, Lieferung, Vorlage) folgen einem Muster und kennen eine Quelle nur als `SourceFacts`.
- Aktionsschritte: Ausführen in `runtime/steps`, Modell in `core/data/steps`.
- Der globale Laufzeit-Zustand `maskState` ist aufgelöst; der Host ist `maskHost()`.
- `runtime/events.ts` ist `runtime/actions/` (vier Dateien).
- `EditorStore`: Ansicht (`EditorView`) und Dateien (`EditorFiles`) sind eigene Teile; `useView()` liefert die Ansicht.
- Export als Befehl (`editor/commands/exportMask.ts`).
- SoftEngine: `hostQueue.ts` in Reihe, Fragen, Schreiben, Auftrag; `fields.ts` neben `data.ts`.
- `editor/state/lifts/` ist weg; `maskSchema.ts` liest die laufende Stufe und hebt die Vorstufe (`currentState`, Stufe 39 → 40: `liftTo40`). Die Hebung lässt Knoten aus, die ihr Ziel schon tragen (`kind`), und ist darum wiederholbar; Test in `test/maskFile.test.ts`.
- Bausteine: Kanban ohne Praxis-Reste, Stil je Teil, Karte und Platz als Module. Tabellenmotor in Modell, Zeichnen und Bedienung geteilt, Klassennamen in `TABLE_PART`. Erfassung ohne Fassade, Tippzeile in `capture/row`, Aufteilung in `capture/split`, Tasten über `keys.ts`.
- Editor-Fläche: ein Zieh-Helfer (`canvas/pointerDrag.ts`) für Verschieben, Rastergröße, Fenstergröße und Spaltenköpfe; `ff-list-bind` durch einen Rückruf ersetzt; große Fenster-Dateien geteilt.
- eslint-Warnungen zu Größe: 63 → 16. Die Typen einer Meldung (`NoticeText`, `NoticeLine`) liegen in `editor/state/noticeText.ts`; der Zustand importiert dafür keinen React-Teil mehr.
- Namen: Spaltentyp `kind` statt `holding`; gewählte Zeile der Maske `chosen` (Klasse, `TABLE_PART.chosen`, `chosenIndex`) statt `selected`; Fähigkeit `recordChoice` statt `recordPick`; `HeadHandle` statt `HeadSpot`, `firstFocusable` statt `firstFocusSpot`.
- Zustände im Code auf Englisch (`quiet`, `loading`, `writing`, `saved`, `sent`, `failed`).
- Tests (vitest) an den Nähten: Export-Markup, Escaping, Maskendatei mit Leftover und Abweisung fremder Stufen, Aktionsketten, SoftEngine-Datenlesen. `npm test`, in `npm run check` und auf GitHub.
- Rauchprobe im Browser: `npm run smoke` (braucht Playwright). Sie prüft jeden Baustein der Palette über die Oberfläche: einfügen, Größe, verschieben, jede Eigenschaft über ihr Bedienelement, Wörter auf der Fläche, Stellen und ersten Listeneintrag binden, Aktionsketten an jedem Ereignis; dazu den Export jeder gesetzten Eigenschaft und in der exportierten Maske, mit einem Stellvertreter der Brücke, die gebundenen Werte und den Werkzeugstart jedes Ereignisses. Den Zustand liest sie über `src/editor/smokeAccess.ts`, nur im Entwicklungsbau. Einstellungen, die die Arbeitsweise ändern (etwa „Mehrzeilig“), prüft sie an einem eigenen Exemplar (`VARIANTS` in `tools/smoke.mjs`): Export der Einstellungen, gebundene Werte, Ereignisse und die Tasten in der Maske. Beim Reiter benennt sie eine Seite um, fügt Seiten an, löscht eine mit Entf, prüft nach Rückgängig, dass die Seite mit der Auswahl offen steht, setzt ein gebundenes Feld auf die zweite Seite und prüft in der Maske Wechsel, Pfeiltasten, den Wert des Feldes, das Öffnen beim Fokus und „Letzten Reiter merken“.
- Rauchprobe: sie greift einen Baustein nur noch an einer Stelle, an der er selbst oben liegt, nicht ein Baustein in ihm, und fügt nur noch ein, wenn nichts gewählt ist. In der Maske zählt sie nur die Bausteine auf der Seite (`data-ff-main`). Vorher lag der zweite Bereich der Probe unbemerkt im ersten, weil der erste beim Einfügen noch gewählt war.
- Bausteine mit Kindern: `allowedChildren`, `startChildren` und `fillsParent` in der Deklaration (`core/block/blockType.ts`); Spalten, Einpassen und Wachsen im Raster (`core/block/gridArea.ts`) kennen Seiten, die ihren Träger füllen. Auf der Fläche ändert ein Baustein Wörter seiner Kinder über `CHILD_CHANGE` und legt Kinder über `CHILD_ADD` an; `chosenChild` sagt ihm, in welchem Kind die Auswahl liegt.
- Laufzeit: `runtime/reveal.ts` (`revealSelf`): ein Feld bittet vor dem Fokus die Bausteine um sich, es zu zeigen.
- Laufzeit: `loadFailed` in `runtime/notice.ts`; `fetchingSources.ts` meldet es den Bausteinen einer Quelle, die nicht kam, mit dem Grund in `data-ff-notice-reason`. Der Bereich zeigt es in seinem Körper.
- Listen (Tabelle, Datenliste, Erfassung, Kanban) nennen `rowCount`; der Bereich zählt damit. Ein Feld setzt `data-ff-list-inside` auf die Bausteine um sich, solange seine Vorschlagsliste offen ist; der Bereich schneidet dann nicht an seiner Kante.
- Rauchprobe: eine zweite Quelle ohne Zeilen (`EMPTY_SOURCE`); ein Baustein kann sie in `FUNCTION_SETUP` als seine eigene nehmen und dort Einstellungen vorgeben. Beim Bereich prüft sie den leeren Zustand mit Satz und Knopf, das Ereignis des Knopfes und „Ausblenden wenn leer“. Eine Variante mit eigenen Prüfungen ersetzt die des Grundaufbaus und kann die Ereignisse auslassen (`events: false`).
- Höhenmeldung (`blocks/base/heightReport.ts`): ein nicht gezeichneter Baustein (auf einer verborgenen Seite) meldet keine Höhe. Vorher hätte er sich auf eine Rasterzeile geschrumpft gemeldet.
- Tabellenmotor: ein Wechsel der Zeilenquelle (`rowsFrom`) löscht die gemerkte Sortierung des Bedieners nicht mehr, sondern liest sie gegen die neuen Spalten neu. Heute schaltet kein Baustein nach dem ersten Zeichnen um; der Fehler war still.
- Editor-Fläche, feine Abos: `useEditorSelect` nimmt einen Vergleich (`sameItems`, `sameFields` aus `useStoreSelect.ts`). `Canvas`, `RootArea`, `NodeList` und `CanvasNode` lesen damit nur ihren Teil; ein Baustein zeichnet neu, wenn er selbst, seine Wahl oder der Träger seiner Quellen sich ändert, der gewählte bei jeder Änderung. Gemessen: Ändern einer Eigenschaft zeichnete 12 von 12 Bausteinen der Fläche, jetzt einen; je Änderung 54 statt 101 Komponenten im ganzen Editor (der Rest ist Seitenleiste, Werkzeugleiste, Inspektor).
- Editor-Fläche, Ziehen: der Zieh-Zustand ist ein eigener Speicher (`DndState` mit `useDndSelect`) statt React-Zustand im Canvas; nur der getragene Baustein und der Geist des Zielbereichs zeichnen bei einer Zeigerbewegung neu. Gemessen (12 Bausteine, 40 Bewegungen): je Bewegung zeichneten 51 Komponenten, jetzt 2,5; Skriptzeit rund 220 ms, jetzt 62 ms.
- Editor-Fläche: `commitDrop`, `draggedSize` und `pageDrop` kennen nur noch das Ablegen aus der Palette; die Zweige für einen verschobenen Baustein (`dnd.dragId !== null`) waren tot, weil Verschieben über Zeigerereignisse läuft.
- Tabellenmotor: `RecordList` kennt eine schlichte Darstellung (`ListLook.plain`: kein Kopf, keine Suche, kein Fuß, keine Leerzeilen) und ob ein Klick eine Zeile wählt (`picks`). `ff-datalist` nutzt sie; die Ereignisse einer Zeile stehen einmal in `LIST_EVENTS`.
- Tabellenmotor: eine Zeile hat immer einen Index; die Zweige für eine Zeile ohne Index (`rawIndex === null`) in `tableRows.ts`, `rowActivation.ts`, `rowAsk.ts` und der Erfassung sind entfernt. Sie waren tot.
- GitHub legt `dist/` als Artefakt ab.
- Dokumente: `README.md`, `docs/ARCHITEKTUR.md`, `docs/BAUSTEINE.md`, `docs/SOFTENGINE-SCHNITTSTELLE.md`, `docs/RELEASE.md`, `BAUPLAN.md` (Stand und offene Punkte).

## 0.4.0

Stand vom 22.10.2026, wie übernommen.
