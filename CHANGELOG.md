# Änderungen

## Unveröffentlicht (Zweig `marktreife`)

Was der Editor und die Maske können, ist unverändert. Geändert ist die Bauweise.

### Für Anwender sichtbar

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
- `editor/state/lifts/` ist weg; `maskSchema.ts` liest nur die laufende Stufe (`currentState`).
- Bausteine: Kanban ohne Praxis-Reste, Stil je Teil, Karte und Platz als Module. Tabellenmotor in Modell, Zeichnen und Bedienung geteilt, Klassennamen in `TABLE_PART`. Erfassung ohne Fassade, Tippzeile in `capture/row`, Aufteilung in `capture/split`, Tasten über `keys.ts`.
- Editor-Fläche: ein Zieh-Helfer (`canvas/pointerDrag.ts`) für Verschieben, Rastergröße, Fenstergröße und Spaltenköpfe; `ff-list-bind` durch einen Rückruf ersetzt; große Fenster-Dateien geteilt.
- eslint-Warnungen zu Größe: 63 → 16. Die Typen einer Meldung (`NoticeText`, `NoticeLine`) liegen in `editor/state/noticeText.ts`; der Zustand importiert dafür keinen React-Teil mehr.
- Zustände im Code auf Englisch (`quiet`, `loading`, `writing`, `saved`, `sent`, `failed`).
- Tests (vitest) an den Nähten: Export-Markup, Escaping, Maskendatei mit Leftover und Abweisung fremder Stufen, Aktionsketten, SoftEngine-Datenlesen. `npm test`, in `npm run check` und auf GitHub.
- Rauchprobe im Browser: `npm run smoke` (braucht Playwright).
- Tabellenmotor: ein Wechsel der Zeilenquelle (`rowsFrom`) löscht die gemerkte Sortierung des Bedieners nicht mehr, sondern liest sie gegen die neuen Spalten neu. Heute schaltet kein Baustein nach dem ersten Zeichnen um; der Fehler war still.
- Editor-Fläche: `commitDrop`, `draggedSize` und `pageDrop` kennen nur noch das Ablegen aus der Palette; die Zweige für einen verschobenen Baustein (`dnd.dragId !== null`) waren tot, weil Verschieben über Zeigerereignisse läuft.
- Tabellenmotor: `RecordList` kennt eine schlichte Darstellung (`ListLook.plain`: kein Kopf, keine Suche, kein Fuß, keine Leerzeilen) und ob ein Klick eine Zeile wählt (`picks`). `ff-datalist` nutzt sie; die Ereignisse einer Zeile stehen einmal in `LIST_EVENTS`.
- Tabellenmotor: eine Zeile hat immer einen Index; die Zweige für eine Zeile ohne Index (`rawIndex === null`) in `tableRows.ts`, `rowActivation.ts`, `rowAsk.ts` und der Erfassung sind entfernt. Sie waren tot.
- GitHub legt `dist/` als Artefakt ab.
- Dokumente: `README.md`, `docs/ARCHITEKTUR.md`, `docs/BAUSTEINE.md`, `docs/SOFTENGINE-SCHNITTSTELLE.md`, `docs/RELEASE.md`, `BAUPLAN.md` (Stand und offene Punkte).

## 0.4.0

Stand vom 22.10.2026, wie übernommen.
