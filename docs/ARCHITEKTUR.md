# Architektur des Aufbau-Editors

Stand 26.10.2026, nach dem Umbau des Gerüsts. Für Entwickler, die den Code übernehmen.

## In einem Satz

Ein Modell beschreibt eine Maske (Bausteinbaum, Eigenschaften, Datenquellen, Aktionsketten). Der Editor bearbeitet dieses Modell in React. Der Export schreibt es als eine HTML-Datei. In SoftEngine laufen dieselben Bausteine (Lit-Elemente) mit einer Laufzeit, die SoftEngine nur über eine Steckdose kennt.

## Schichten

```
core ──────────── Modell. Kein DOM, kein React, kein Lit.
  block            Bausteinbaum, Eigenschaften, Katalog, Raster, Seiten
  data             Datenquellen, Relationen, Aktionsschritte, Berechnung
blocks ────────── Die Bausteine als Lit-Elemente. Laufen im Editor und in der Maske.
runtime ───────── Was in der Maske läuft: Aktionen, Auswahl, Datenbezug, Meldungen.
softengine ────── Der Anschluss an SoftEngine. Einziger Ort mit den Host-Funktionen.
export ────────── Schreibt HTML und SEvariablen aus dem Modell.
editor ────────── Der Editor in React.
design ────────── Gestaltungswerte (Tokens) für Editor und Maske.
```

Wer wen benutzen darf, steht in `eslint.config.js` und wird bei jedem Push geprüft:

| Schicht | darf importieren |
|---|---|
| `core` | nur `core` |
| `blocks` | `core`, `runtime`, andere `blocks` |
| `runtime` | `core`; SoftEngine nur über `runtime/softEngineHost.ts` |
| `softengine` | `core` |
| `export` | `core`, `design` |
| `editor` | alles außer `softengine` |

Importkreise sind verboten (`npm run cycles`, erlaubt: 0).

## Die Steckdose zu SoftEngine

`runtime/maskHost.ts` ist die Schnittstelle `MaskHost` mit 14 Funktionen (Daten da?, Zeilen einer Quelle, Feld lesen, Relation ausführen, Werkzeug starten, ...). `runtime/host.ts` hält den aktuellen Host: im Editor der stumme `previewHost`, in der exportierten Maske `softEngineHost`, den `runtime/softEngineStart.ts` als erstes Stück der Laufzeit einsetzt. Alles unter `src/softengine` ist die Füllung dieser Steckdose. Kein Baustein und keine Laufzeitdatei kennt SoftEngine direkt.

## Das Modell (`src/core`)

- **Baum**: `core/block/tree.ts`. Ein Knoten hat `type`, `values`, `childIds`, optional `chains` (Aktionsketten je Ereignis).
- **Katalog**: `core/block/registry.ts`. Jeder Baustein meldet seine Deklaration an (`defineBlock` in `blocks/base/BlockElement.ts`): Eigenschaften mit Typ, Standard, Beschriftung, Attributname; Fähigkeiten (`capabilities`) wie `source`, `bindable`, `events`, `list`, `capture`.
- **Eigenschaften**: `core/block/property.ts`. Ein Eigenschaftstyp weiß, wie er einen gespeicherten Wert prüft (`read`), ins Attribut schreibt (`toAttribute`) und zurückliest (`fromAttribute`). Dadurch gibt es genau eine Beschreibung je Eigenschaft, für Editor, Export und Maske.
- **Datenquellen**: `core/data/dataSources.ts` (Typ `DataSource`, Prüfen, Feldlisten). Eine Quelle hat eine Vorlage (`presets`), eine Bestellung (`orders`: wie SoftEngine die Daten liefert), eine Lieferung (`deliveries`: wie die Maske sie bekommt) und einen Schreibweg (`writes`). Jede dieser vier Familien folgt demselben Muster: eine Schnittstelle in einer Blattdatei (`*Adapter.ts`), ein Adapter je Art, eine Sammelliste, die die Vereinigung bildet. Die Adapter kennen eine Quelle nur als `SourceFacts` (`sourceFacts.ts`).
- **Aktionsschritte**: `core/data/steps`. Fünf Arten (RELATION, POPUP_OPEN, POPUP_CLOSE, CONFIRM, START_TOOL). Der Kern kennt Lesen aus der Datei, Schreiben in den Export und Zurücklesen aus dem Export (`chains.ts`, `chainsRead.ts`). Das Ausführen steht in `runtime/steps`.

## Die Laufzeit (`src/runtime`)

- `actions/`: eine Aktionskette läuft in `runEvent` (Sperre je Baustein und Ereignis, Pflichtfelder) → `runSections` (Abschnitte je Zeile einer Liste) → `runSteps` (Schritte mit Protokoll der Ergebnisse) → `steps/runners.ts` (ein Runner je Schrittart).
- Zustand liegt bei dem Modul, das ihn benutzt: `selection.ts`, `chosenDay.ts`, `searchText.ts`, `fetchingSources.ts`, `jobs.ts`. Es gibt keinen globalen Sammelbehälter.
- `notice.ts`: was ein Baustein über seine letzte Aktion zeigt (`quiet`, `loading`, `writing`, `saved`, `sent`, `failed`), als Attribut `data-ff-notice`.

## Die Bausteine (`src/blocks`)

Ein Baustein ist eine Klasse `extends BlockElement` mit `static type`, `static tag`, einer `properties.ts` und `defineBlock(...)`. `blocks/register.ts` nennt die Reihenfolge; `tools/buildRuntime.mjs` bündelt daraus die Laufzeit für den Export. Vererbung ist eine Ebene; gemeinsame Fähigkeiten sind Steckteile (`blocks/parts`, `blocks/lookup`, `blocks/list`), keine Elternklassen.

Ein neuer Baustein braucht: Ordner unter `src/blocks`, `properties.ts`, die Klasse, einen Eintrag in `register.ts`, ein Symbol in `editor/blockIcons.ts`. Nichts sonst. Der Editor zeigt die Eigenschaften aus der Deklaration, der Export schreibt die Attribute aus der Deklaration.

Bausteine mit Kindern sagen es in der Deklaration: `takesChildren`; `gridArea` macht den Baustein zum Raster für seine Kinder (Bereich, Reiterseite); `allowedParent` und `allowedChildren` beschränken, was wohin darf; `startChildren` gibt einem neuen Baustein Kinder mit (zwei Seiten für einen neuen Reiter). Ein Kind mit `fillsParent` nimmt keinen Platz im Raster des Elternteils, sondern füllt dessen Körper und hat dessen Spalten (die Seiten des Reiters). Wörter, die einem Kind gehören, aber auf dem Elternteil stehen (Titel der Seiten), ändert der Baustein auf der Fläche über `CHILD_CHANGE`, ein neues Kind legt er über `CHILD_ADD` an, eines nimmt er über `CHILD_REMOVE` weg. Liegt die Auswahl des Editors in einem Kind, erfährt der Baustein es über `chosenChild`; der Reiter zeigt dann diese Seite.

Fertig ist er erst, wenn `npm run smoke` ihn besteht: in der Palette einfügbar, auf der Fläche verschiebbar und in der Größe änderbar, jede Eigenschaft über die Oberfläche einstellbar, Felder an seine Stellen bindbar, Ereignisse mit Aktionsketten belegbar, im Export richtig geschrieben und in der exportierten Maske tätig. Die Probe liest die Deklaration und prüft daraus, was der Baustein verspricht; sie braucht Zutaten nur für Neues: ein neues Ereignis braucht seine Auslösung in `tools/smoke/triggers.mjs`, ein Baustein, der zum Zeigen von Zeilen mehr braucht als Quelle, Stellen und ersten Eintrag oder der eigene Arbeit auf der Fläche und eigene Prüfungen in der Maske hat (Seiten des Reiters), einen Eintrag in `FUNCTION_SETUP` (`tools/smoke.mjs`); eine Einstellung, die die Arbeitsweise ändert (mehrzeiliges Feld, „Letzten Reiter merken“), einen Eintrag in `VARIANTS`. Eine Eigenschaft ohne Weg in der Oberfläche lässt die Probe scheitern. Den Zustand des Editors liest sie über `src/editor/smokeAccess.ts`, das nur der Entwicklungsbau anbietet; handeln tut sie nur über die Oberfläche.

## Der Export (`src/export`)

`exportMask.ts` baut aus dem Baum das Markup (`nodeToHtml`), aus den Quellen `window.FF_DATA_SOURCES`, aus den Relationen `window.FF_RELATIONS`, aus `runtime.json` die Laufzeit der benutzten Bausteine (`runtime.ts`) und aus den Bestellungen das SEvariablen-Blatt (`sevariablen.ts`). `serializer.ts` sorgt dafür, dass kein Nutzertext aus Attribut, Skript oder Stil ausbrechen kann. `validator.ts` prüft die fertige Datei, bevor sie geschrieben wird.

## Der Editor (`src/editor`)

- `state/EditorStore.ts`: Baum, Auswahl, Seiten, Verlauf (Rückgängig), Bibliotheken. Jede Änderung geht durch `apply` und meldet sich an alle Horcher.
- `state/editorStore/viewState.ts` (`EditorView`): was neben der Maske offen ist (Fenster, Spalten, Meldungen). Meldet sich selbst; `useView()` liefert es.
- `state/editorStore/files.ts` (`EditorFiles`): Maske und Bibliothek auf der Platte, der Masken-Ordner, das Wiederfinden nach einem Neustart.
- `state/editorStore/persistence.ts`: Speichern im Browser und auf die Platte, entprellt.
- `state/maskFile.ts`, `libraryFile.ts`: Dateiformate mit dem Leftover (was dieser Editor nicht lesen kann, bleibt in der Datei). Masken liest der Editor nur in der Stufe `CURRENT_SCHEMA_VERSION` (`maskSchema.ts`); die Bibliothek hebt alte Stände (`librarySchema.ts`).
- `commands/`: Abläufe, die mehr als den Zustand brauchen (Export).
- Die Oberfläche: `shell` (Rahmen, Werkzeugleiste), `sidebar` (Palette, Masken), `canvas` (Fläche, Ziehen, Fenster), `inspector` (Eigenschaften), `data` (Datenfenster), `actions` (Aktionsketten), `widgets` (Bedienelemente).

React-Teile sprechen mit dem Zustand über `useEditor()` (Modell) und `useView()` (Ansicht). Beide sind `useSyncExternalStore` auf einer Versionsnummer.

## Wörter

Ein Wort je Ding, damit niemand raten muss:

| Wort | heißt | nicht zu verwechseln mit |
|---|---|---|
| **Spot** (`BindableSpot`, `ValueSpot`, `SpotClick`) | eine Stelle in einem Baustein, an der ein Feldwert landet | der Platz auf dem Kanban-Brett (`BoardCell`), die Ankerstelle eines Nachschlagefelds (`InputAnchor`), der Griff über einem Spaltenkopf im Editor (`HeadHandle`) |
| **selected** (`selectedId`, `selectedNode`) | der Baustein, der im Editor markiert ist | |
| **chosen** (`chosenRow`, `chosenDay`, `chooseSelection`, `TABLE_PART.chosen`, `recordChoice`) | die Zeile oder der Tag, den der Nutzer in der laufenden Maske gewählt hat | |
| **pick** (`CapturedPick`, `picks`) | ein Betrag, den die Erfassung aus einem Satz nimmt (Verteilen) | die Eigenschaft `pick` der Datenliste (steht so in Dateien) |
| **kind** (`kindOf`, `kindChoice`) | der Typ einer Spalte oder Zeile: Text, Zahl, Betrag | **held**: eine Zelle der Erfassung, die die Zeile zurückhält |
| **source** / Quelle | eine Datenquelle (`DataSource`) | `origin`: der Baustein, von dem eine Aktion ausgeht |
| **binding** | `Quelle::Feldcode`, an einer Stelle gespeichert | |
| **chain** / Kette | die Schritte zu einem Ereignis eines Bausteins | |
| **leftover** | was dieser Editor in einer Datei nicht lesen kann und unverändert zurückschreibt | |
| **host** | die Steckdose zur Umgebung der Maske (`MaskHost`) | |

## Regeln, die der Code durchsetzt

- Typen streng (`strict`, keine unbenutzten Lokalen, `noImplicitOverride`).
- Keine eigenen Farben, Radien, Schriftgrößen in Bausteinen, Laufzeit, Export und Editor: alles aus den Tokens in `src/design` (eslint-Regel).
- Dateien über 300 Zeilen und Funktionen über 80 Zeilen sind Warnungen in eslint. Sie sollen auf null.
- Toter Code: `knip`.
- `npm run check` läuft alles; GitHub ebenso.

## Was noch offen ist

Siehe `BAUPLAN.md`.
