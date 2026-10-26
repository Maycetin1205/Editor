# Änderungen

## Unveröffentlicht (Zweig `marktreife`)

Was der Editor und die Maske können, ist unverändert. Geändert ist die Bauweise.

### Für Anwender sichtbar

- Stürzt der Editor ab, zeigt er den Fehler, bietet die Sicherung der Maske und der Bibliothek als Datei an und kann die Maske im Browser zurücksetzen.
- Ein Baustein, der nicht mehr in den gewählten Bereich passt, landet auf der Seite; passt er auch dort nicht, sagt es eine Meldung. Vorher verschwand er.
- Die Suche findet „Müller“ mit „muller“ in jeder Liste, auch im Kanban.
- Kanban: der Kartenavatar zeigt den Anfangsbuchstaben; die Tierarten-Symbole der Kleintierpraxis sind weg. „Wartet seit“ heißt „Seit“.
- Alte Masken: die Knopffarbe „accent“ aus Stufe 27/28 und die Textfarbe „petrol“ aus Stufe 28 werden als „Akzent“ gelesen; vorher zeigte der Inspektor eine leere Auswahl.
- Ziehen auf der Fläche: Escape bricht das Verschieben eines Bausteins ab, der Baustein bleibt, wo er war; vorher hob Escape nur die Auswahl auf und der Baustein wurde trotzdem abgelegt. Beim Größenändern behält Escape die erreichte Größe.
- Ziehen hebt die Auswahl nicht mehr auf.
- Kanban: ein Titel mit „$&“ landet als Text in der Meldung, nicht als Muster.
- Erfassung, Verteilen: bei absteigender Sortierung stehen leere Werte hinten, nicht vorn.

### Für Entwickler

- Keine Importkreise mehr; die Kreis-Prüfung erlaubt null.
- Die Adapter der Datenquellen (Schreiben, Bestellung, Lieferung, Vorlage) folgen einem Muster und kennen eine Quelle nur als `SourceFacts`.
- Aktionsschritte: Ausführen in `runtime/steps`, Modell in `core/data/steps`.
- Der globale Laufzeit-Zustand `maskState` ist aufgelöst; der Host ist `maskHost()`.
- `runtime/events.ts` ist `runtime/actions/` (vier Dateien).
- `EditorStore`: Ansicht (`EditorView`) und Dateien (`EditorFiles`) sind eigene Teile; `useView()` liefert die Ansicht.
- Export als Befehl (`editor/commands/exportMask.ts`).
- SoftEngine: `hostQueue.ts` in Reihe, Fragen, Schreiben, Auftrag; `fields.ts` neben `data.ts`.
- Hebungen in `editor/state/lifts/`.
- Bausteine: Kanban ohne Praxis-Reste, Stil je Teil, Karte und Platz als Module. Tabellenmotor in Modell, Zeichnen und Bedienung geteilt, Klassennamen in `TABLE_PART`. Erfassung ohne Fassade, Tippzeile in `capture/row`, Aufteilung in `capture/split`, Tasten über `keys.ts`.
- Editor-Fläche: ein Zieh-Helfer (`canvas/pointerDrag.ts`) für Verschieben, Rastergröße, Fenstergröße und Spaltenköpfe; `ff-list-bind` durch einen Rückruf ersetzt; große Fenster-Dateien geteilt.
- eslint-Warnungen zu Größe: 63 → 16.
- Zustände im Code auf Englisch (`quiet`, `loading`, `writing`, `saved`, `sent`, `failed`).
- Tests (vitest) an den Nähten: Export-Markup, Escaping, Maskendatei mit Hebung, Aktionsketten, SoftEngine-Datenlesen. `npm test`, in `npm run check` und auf GitHub.
- Rauchprobe im Browser: `npm run smoke` (braucht Playwright).
- GitHub legt `dist/` als Artefakt ab.
- Dokumente: `README.md`, `docs/ARCHITEKTUR.md`, `docs/BAUSTEINE.md`, `docs/SOFTENGINE-SCHNITTSTELLE.md`, `docs/RELEASE.md`, `BAUPLAN.md` (Stand und offene Punkte).

## 0.4.0

Stand vom 22.10.2026, wie übernommen.
