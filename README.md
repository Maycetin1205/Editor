# Aufbau-Editor

Ein Editor im Browser, mit dem Masken für SoftEngine gebaut werden. Eine Maske wird als eine HTML-Datei plus ein `SEvariablen`-Blatt exportiert und ersetzt in SoftEngine die eingebaute Oberfläche einer Karteikarte.

- Für Anwender: [docs/BAUSTEINE.md](docs/BAUSTEINE.md) (Bestand der Bausteine und Einstellungen); ein Handbuch folgt, wenn Bausteine und Einstellungen entschieden sind
- Für den Anschluss an SoftEngine: [docs/SOFTENGINE-SCHNITTSTELLE.md](docs/SOFTENGINE-SCHNITTSTELLE.md)
- Für Entwickler: dieser Text, [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md), [BAUPLAN.md](BAUPLAN.md) (was noch offen ist) und [docs/RELEASE.md](docs/RELEASE.md)

## Voraussetzungen

- Node.js 22 oder 24, npm
- Zum Arbeiten mit Masken-Ordnern im Browser: Chrome oder Edge (File System Access API). In anderen Browsern wird die Maske heruntergeladen statt in einen Ordner geschrieben.

## Starten

```sh
npm ci
npm run dev
```

Der Editor läuft dann auf `http://localhost:5300`. Der Port ist fest: Masken und Bibliothek, die der Browser hält, hängen an dieser Adresse.

`npm run dev` baut vorher die Laufzeit der Maske (`src/export/generated/runtime.json`, nicht im Repository). Ohne sie scheitert der Export.

## Prüfen

```sh
npm run check
```

Läuft Typprüfung, eslint, Prettier, Kreis-Prüfung der Importe, knip (toter Code) und die Tests. Dasselbe läuft auf GitHub bei jedem Push (`.github/workflows/check.yml`), dort zusätzlich der Produktionsbau.

Nur die Tests:

```sh
npm test
```

Die Tests liegen in `test/` und prüfen die Nähte, an denen ein Fehler teuer wird: das Markup des Exports (Abbild in `test/__snapshots__`), das Escaping feindlicher Eingaben, die Maskendatei mit Leftover und Abweisung fremder Stufen, die Aktionsketten und das Lesen der SoftEngine-Daten. Ändert sich das Export-Markup absichtlich, wird das Abbild mit `npx vitest run -u` erneuert und der Unterschied im Commit erklärt.

Die Rauchprobe im Browser (`npm run smoke`, gegen einen laufenden `npm run dev`, braucht Playwright) prüft jeden Baustein so, wie ein Nutzer ihn braucht, bis in die exportierte Maske. Ein neuer Baustein ist erst fertig, wenn er sie besteht; was sie dafür braucht, steht in `docs/ARCHITEKTUR.md`.

## Bauen

```sh
npm run build
```

Ergebnis in `dist/`: eine statische Seite, die von jedem Webserver ausgeliefert werden kann. Es gibt keinen Server-Teil. Der Editor speichert im Browser (localStorage) und, in Chrome/Edge, in Ordnern, die der Nutzer freigibt.

Vorschau des Baus: `npm run preview`.

## Aufbau des Codes

| Ordner | Inhalt |
|---|---|
| `src/core` | Modell: Bausteinbaum, Eigenschaften, Datenquellen, Aktionsketten. Kein DOM, kein React, kein Lit. |
| `src/blocks` | Die Bausteine als Lit-Elemente. Laufen im Editor und in der exportierten Maske. |
| `src/runtime` | Was in der Maske läuft: Aktionen, Auswahl, Datenbezug. Kennt SoftEngine nur über `MaskHost`. |
| `src/softengine` | Der Anschluss an SoftEngine. Einziger Ort, der die Host-Funktionen kennt. |
| `src/export` | Schreibt HTML und SEvariablen aus dem Modell. |
| `src/editor` | Der Editor in React. `editor/state` hält Zustand, Verlauf, Dateien. |
| `src/design` | Die Gestaltungswerte (Tokens) für Editor und Maske. |
| `tools` | `buildRuntime.mjs` bündelt die Bausteine für den Export, `cycles.mjs` findet Importkreise. |
| `test` | Tests (vitest, happy-dom). |

Die Importregeln zwischen den Schichten stehen in `eslint.config.js` und werden geprüft.

## Masken und Dateien

- Eine Maske ist eine JSON-Datei (`kind: "aufbau-editor-maske"`, `schemaVersion`). Der Editor liest die Stufe 40 und hebt die Stufe 39 beim Öffnen (`src/editor/state/maskSchema.ts`); eine ältere Maske lehnt er mit „zu alte Fassung“ ab, eine neuere mit dem Hinweis, den Editor zu erneuern. Was der Editor in einer Maske nicht lesen kann, bleibt in der Datei erhalten (`leftover`).
- Die Bibliothek mit Datenquellen und Relationen ist eine eigene JSON-Datei (`kind: "aufbau-editor-bibliothek"`).
- Der Export schreibt `index.basis.source.html` und `index.basis.SEvariablen.json`, bei gesetztem Rahmen mit dem Rahmen im Namen.

## Bekannte Grenzen

- Der SoftEngine-Anschluss ist gegen keine laufende Installation geprüft. Die offenen Punkte stehen in `docs/SOFTENGINE-SCHNITTSTELLE.md`.
- Masken unter Stufe 39 öffnen nicht. Die Hebungen dafür sind gestrichen (26.10.2026), weil keine solche Maske mehr im Umlauf ist.
- Ordner und Dateien gehen nur in Chrome und Edge. Firefox und Safari laden herunter.
- Der Editor ist auf eine Maske je Browser-Profil ausgelegt. Zwei Tabs mit verschiedenen Masken überschreiben sich im Browser-Speicher gegenseitig.
