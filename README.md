# Aufbau-Editor

Ein Editor im Browser, der Masken für SoftEngine baut. Eine Maske wird als HTML-Datei plus SEvariablen-Blatt exportiert und ersetzt in SoftEngine die eingebaute Oberfläche einer Karteikarte.

## Starten, prüfen, bauen

```sh
npm ci
npm run dev      # Editor auf http://localhost:5300; der Port ist fest, Masken im Browser-Speicher hängen daran
npm run check    # Typen, eslint, Prettier, Importkreise, toter Code (knip), Tests
npm run build    # statische Seite in dist/, kein Server-Teil
```

Node.js 22 oder 24. Ordner und Dateien braucht Chrome oder Edge, andere Browser laden die Maske herunter. Vor dev, build und test entsteht `src/export/generated/runtime.json` (nicht im Repository): die Bausteine, die eine exportierte Maske mitnimmt. Dieselbe Prüfung läuft auf GitHub bei jedem Push.

## Wie es gebaut ist

Zwei Programme mit einem gemeinsamen Kern: der Editor, der die Maske baut, und die Maske selbst, die beim Kunden in SoftEngine läuft.

| Ordner | Inhalt |
|---|---|
| `src/core` | Regelwerk: Bausteinbaum, Eigenschaften, Fähigkeiten, Datenquellen, Relationen, Schritte. Kein DOM, kein React, kein Lit |
| `src/blocks` | Die 13 Bausteine als Lit-Elemente, alle auf `BlockElement`. Laufen im Editor und in der exportierten Maske |
| `src/runtime` | Was in der Maske läuft: Daten holen, Auswahl, Ereignisse, Schritte. Kennt SoftEngine nur als `MaskHost` |
| `src/softengine` | Der Anschluss an SoftEngine: der einzige Ort, der SEDATA, GET/PUT_RELATION und die Warteschlange kennt |
| `src/export` | Schreibt aus dem Baum `index.basis.source.html` und `index.basis.SEvariablen.json`, nur mit den benutzten Bausteinen |
| `src/editor` | Der Editor in React: Leinwand, Inspektor, Datenfenster, Schritt-, Rechen-, Verteil- und Nachschlagefenster. `editor/state` hält Zustand, Verlauf und Dateien |
| `src/design` | Farben, Schrift und Abstände für Editor und Maske |
| `tools` | `buildRuntime.mjs` bündelt die Bausteine für den Export, `cycles.mjs` findet Importkreise |
| `test` | vitest mit happy-dom |

Im Editor antwortet der Maske eine Attrappe, die nichts liefert. Eine exportierte Maske setzt beim Start SoftEngine als Host ein (`runtime/softEngineStart.ts`).

## Dateien

Eine Maske ist eine JSON-Datei (`kind: "aufbau-editor-maske"`) mit einer Stufe (`schemaVersion`, jetzt 41). Masken ab Stufe 39 hebt der Editor beim Öffnen (`editor/state/maskSchema.ts`), ältere lehnt er ab. Was er in einer Datei nicht lesen kann, bleibt als Rest erhalten und steht nach dem Speichern wieder darin. Datenquellen und Relationen liegen in einer eigenen Bibliotheksdatei (`kind: "aufbau-editor-bibliothek"`).

## Wörter im Code

| Wort | Bedeutet |
|---|---|
| block, property, capability | Baustein. Eine Einstellung, im Inspektor sichtbar, im HTML ein Attribut. Was ein Baustein kann: source, list, events, followsSelection, recordChoice, bindable, compute, capture, change, lookupWindow, holdsSent, actionValue |
| tree, stage, leftover | Der Baum aller Bausteine. Die Stufe der Datei. Der Rest, den dieser Editor nicht kennt |
| source, preset, order, delivery, write, sheet | Datenquelle. Ihre Vorlage (Belegkopf, Positionen, ...). Was die Maske beim Öffnen bestellt. Wie Zeilen ankommen (push, message, relationRows, relationValue). Wie gespeichert wird. Das SEvariablen-Blatt |
| relation | GET_, PUT_ oder PUTADD_RELATION mit Platzhaltern wie Belegart, Jahr, Position |
| step, chain, condition | Ein Schritt eines Ablaufs: RELATION, POPUP_OPEN, POPUP_CLOSE, CONFIRM, START_TOOL. Die Kette hinter einem Ereignis. Die Bedingung eines Schritts (onlyIf) |
| spot, origin, reach | Eine Stelle in einem Baustein, in die ein Feld kommt. Die Herkunft eines Werts: Feld, gewählte, erfasste, geänderte oder verteilte Zeile, Summe, Schrittergebnis. Was ein Baustein von seinem Platz aus sieht |
| giver, carrier | Ein Baustein, dessen gewählte Zeile andere übernehmen. Der Baustein, auf den sich ein Schritt bezieht |
| capture, ledger, split, pick | Die Erfassung. Ihr Buch über erfasste und gebuchte Zeilen. Die Verteilung einer Zeile auf Chargen. Eine verteilte Zeile |
| woven, look, notice | Text mit Feldern in Lücken. Farbton: neutral, info, success, warning, danger. Der Ring am Baustein: loading, writing, saved, sent |
| host, job, hostQueue | Wer der Maske antwortet. Ein Aufruf an SoftEngine. Die Reihe, in der die Aufrufe laufen |
