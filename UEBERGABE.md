# Übergabe: Neubau des Aufbau-Editors (Stand 09.11.2026, mitten in der Arbeit abgebrochen)

Diese Datei ist für die KI oder den Entwickler, der hier weitermacht. Der Betreiber kann nicht programmieren und möchte nichts noch einmal erklären: alles, was er gesagt hat, steht unten.

## Stand in drei Sätzen

Der Zweig `claude/nice-cannon-9cxdop` enthält den Anfang eines Neubaus von Grund auf. Der alte Editor ist auf diesem Zweig gelöscht und liegt unverändert auf `main` (Commit `3d5bcdf`). Vom Neubau stehen das Modell (`src/model`) und der SoftEngine-Anschluss (`src/softengine`); Laufzeit, Bausteine, Editor und Export fehlen noch ganz.

**Der neue Code wurde noch nie kompiliert oder ausgeführt.** `npm run dev`, `npm run build` und `npm test` scheitern, weil `src/main.tsx` und `src/runtime/mount.tsx` fehlen. Die Prüfung auf GitHub (`.github/workflows/check.yml`) nennt noch die alten Schritte `knip` und `cycles` und wird rot sein.

Wer lieber auf dem alten Stand weiterarbeitet: `main` ist unberührt, dieser Zweig kann einfach liegen bleiben.

## Was der Betreiber will (seine Worte, zusammengefasst)

- Sie benutzen SoftEngine ERP (BüroWARE und WEBWARE). Im Editor legt er fest, was eine Maske tut: Relationen, Start-Tools, Datenquellen. Er exportiert, und das läuft in SoftEngine. **Die SoftEngine-Funktionen waren nie das Problem.**
- Alles im Repository ist von KI erzeugt. Die letzte KI hat es „voll verbockt“: es sieht schlecht aus, der Editor ist „nicht mehr der alte“, es ist „noch nicht mal ein Prototyp“.
- Er will ganze Oberflächen bauen: Empfang einer Tierarztpraxis, Behandlungszimmer, Terminkalender. Vieles davon fehlt.
- Er hat Bausteine, bei denen er nicht weiß, warum es sie gibt, und „ganz komische Funktionen“.
- Verlangt: einwandfreie Architektur, objektorientiert, React. Bedienbar, richtig gut aussehend, von vorne bis hinten durchdacht: jede Einstellung eines Bausteins muss sich wirklich einstellen lassen und Sinn ergeben.
- Opus-Agenten sind erlaubt, aber nur, wenn die Qualität gesichert bleibt.
- Eine Aussage ist ungeklärt, siehe „Offene Frage“ unten.

## Befund zum alten Editor (auf `main`)

- 45 000 Zeilen, 514 Dateien. Innen ordentlich (Tests, Lint, keine Importkreise), als Produkt unfertig.
- Editor in React, die 13 Bausteine als Lit-Elemente, eigener Bündler für die Laufzeit: zwei Techniken für eine Sache.
- Die Fläche zeigt leere graue Kästen, weil es keine Beispieldaten gibt. Man sieht nie, was man baut.
- Die letzte KI hat den Editor umgangen und den Empfang von Hand geschrieben (`masken/kanban/kanban.html`, 1 800 Zeilen, eigener Stil in `masken/stil`). Daher zwei Welten nebeneinander.
- Eigene Vokabeln im Code (spot, giver, carrier, ledger, split, pick, woven), die niemand sonst versteht.
- Wertvoll und zu erhalten: `src/softengine` (Anmeldung, Warteschlange, Antworten lesen, Felder lesen und schreiben), das SEvariablen-Blatt (`src/core/data/sheet.ts`, `orders.ts`), die Exportregeln (`src/export/validator.ts`), der DTK-Import, und das Praxiswissen in `masken/kanban/kanban.html`.
- Gelöschte Doku mit Wissen, aus der Geschichte lesbar: `git show 06782b8^:docs/SOFTENGINE-SCHNITTSTELLE.md`, `…:docs/BAUSTEINE.md`, `…:docs/ARCHITEKTUR.md`, `…:BAUPLAN.md`.

## Entscheidungen für den Neubau

1. **Ein Modell, eine Technik.** Eine Maske ist ein JSON-Dokument. Dieselben React-Bausteine zeichnen sie im Editor und in SoftEngine. Der Export schreibt eine HTML-Datei mit eingebetteter Laufzeit (React), dem Dokument als JSON und einem `<style>`.
2. **Logik in Klassen, Ansicht in React-Funktionen.** Klassen: `MaskDocument`, `BlockType`, `SourceKind`, `StepType`, `SourceSchema`, `SoftEngineBridge`, `RequestQueue`, `SoftEngineHost`. Das Dokument ändert sich nie; jede Änderung gibt ein neues zurück, Rückgängig ist dadurch trivial.
3. **Aufbau in Zeilen und zwölf Spalten** statt freiem 48er-Raster: Seite → Zeilen → Bausteine mit Breite 1 bis 12; Höhe nach Inhalt, „füllt den Rest“ oder fest. Bereich und Reiter haben eigene Zeilen (Slots). Fenster (Dialoge) sind Seiten der Maske.
4. **Ein Baustein beschreibt seine Einstellungen einmal** (`src/model/schema.ts`). Daraus entstehen Inspektor, Feldliste für den Export und das Nachziehen umbenannter Felder.
5. **Echte Vorschau:** Jede Datenquelle hat Beispielzeilen (`src/model/sample.ts`). Im Editor antwortet ein Vorschau-Host mit ihnen, in SoftEngine der `SoftEngineHost`. Die Maske kennt nur die Schnittstelle `MaskHost` (`src/model/host.ts`).
6. **Aktueller Satz je Datenquelle:** Ein Klick auf eine Zeile wählt den Satz; alle Bausteine, die Felder dieser Quelle zeigen, zeigen ihn. Die Zeile, die ein Ereignis auslöst, wird vor den Schritten zum aktuellen Satz.
7. **Verknüpfungen:** Eine Quelle schlägt in einer anderen nach (Kundennummer → Kunden); die Felder heißen dann `{Kunde.Nachname}`.
8. **Texte mit Feldern:** `{Tiername} ({Rasse})`, nach Feldnamen. Wird ein Feld umbenannt, zieht `renameInMask` die Texte nach.
9. **Schichten** (in `eslint.config.js` festgelegt): `model` kennt nichts; `softengine` nur `model`; `runtime` und `blocks` nicht den Editor.
10. **Fester Port 5300** bleibt, damit die alte Bibliothek im Browser-Speicher (`localStorage`-Schlüssel `aufbau_editor_library`) gefunden und übernommen werden kann. `src/model/library.ts` liest das alte Format schon.

Geplante Bausteine: Bereich, Reiter, Text, Kennzahl, Status, Bild, Details, Trennlinie, Feld (mit Nachschlagen), Knopf, Tabelle, Liste, Kanban (mit Unterteilung, z. B. Zimmer), Kalender (Tag/Woche, Spalten je Zimmer oder Arzt). Bewusst weggelassen: die alte „Erfassung“ (Belegpositionen tippen, verteilen) und das Laden von Positionen über Relation 69.

Geplante Vorlagen als Einstieg und Prüfstein: Empfang (Tierarztpraxis), Behandlungszimmer, Terminkalender, Karteikarte.

## Was geschrieben ist

Alles unter `src/`, ungeprüft:

| Datei | Inhalt |
|---|---|
| `model/mask.ts` | Datentypen der Maske: Seiten, Zeilen, Bausteine, Slots, Thema, Farbtöne |
| `model/document.ts` | `MaskDocument`: lesen, einfügen, verschieben, löschen, duplizieren, Breite, Seiten, Slots, Quellen |
| `model/blockType.ts` | abstrakte Klasse `BlockType`, Ereignisse, `BlockCatalog` |
| `model/schema.ts` | Beschreibung der Einstellungen (Controls), Filter, Sortierung, `visitProps` |
| `model/sources.ts` | Datenquelle, Feld, Verknüpfung, `SourceSchema` (Felder, Texte mit Feldern) |
| `model/sourceKinds.ts` | Klassen je Quellenart (IDB, Datei, Offener Satz, ERP-Abfrage, DataSet, ERP-Maske, Wert per Relation) und `buildSheet` für das SEvariablen-Blatt |
| `model/relations.ts` | Relation, Schreibweise `GET_RELATION[640!IDB]` lesen und schreiben, Konstanten für 174 und 640 |
| `model/actions.ts` | Schritte als Klassen: Feld schreiben, Satz anlegen, Relation, Werkzeug starten, Fenster öffnen/schließen, Rückfrage, Meldung, Neu laden, Eingaben leeren; Wertquellen und Bedingungen |
| `model/usage.ts` | welche Quellen, Felder und Relationen eine Maske wirklich benutzt |
| `model/format.ts` | Datum, Uhrzeit, Zahl, Suche |
| `model/sample.ts` | Beispielzeilen aus Feldnamen und -typen |
| `model/library.ts` | Bibliothek, liest auch das alte Format `aufbau-editor-bibliothek` |
| `model/dtk.ts` | DTK-Import, unverändert aus dem alten Code |
| `model/host.ts` | Schnittstelle `MaskHost` |
| `model/icons.ts`, `model/ids.ts` | Symbolnamen, Kennungen |
| `softengine/SoftEngineBridge.ts` | Anmeldung bei SoftEngine, Datenankunft, Senden, `EditingAnnouncer` |
| `softengine/RequestQueue.ts` | die eine Leitung: eine Frage zur Zeit, Schreiben vor Fragen, Pause bei Schweigen |
| `softengine/payload.ts` | gelieferte Daten und Antworten lesen |
| `softengine/fields.ts` | Feld aus einer Zeile lesen und hineinschreiben |
| `softengine/SoftEngineHost.ts` | SoftEngine als `MaskHost` |

Dazu neu: `package.json` (ohne Lit und Tailwind, mit `lucide-react`), `vite.config.ts`, `vite.runtime.config.ts` (baut die Laufzeit nach `src/export/generated`), `eslint.config.js`, `tsconfig.*`, `vitest.config.ts`.

## Was fehlt, in sinnvoller Reihenfolge

1. Kompilieren und Fehler beheben (`npx tsc -b`); Tests für `model` und `softengine` schreiben. Die alten Tests auf `main` unter `test/` zeigen, welche Fälle wichtig waren (`softengineData.test.ts`, `export.test.ts`).
2. `src/runtime`: `PreviewHost`, `DataStore` (Zeilen je Quelle, aktueller Satz, Geschriebenes vorläufig anzeigen), `MaskRuntime` mit Ablauf der Schritte, `MaskView`, Dialoge, Meldungen, `mount.tsx`, das Aussehen der Maske als CSS.
3. `src/blocks`: die Bausteine, je eine Klasse von `BlockType` mit React-Ansicht.
4. `src/editor`: Zustand mit Rückgängig, Fläche mit Ziehen und Ablegen, Inspektor aus dem Schema, Datenfenster (Quellen, Felder, Beispielzeilen, Relationen, Bibliothek, DTK-Import), Aktionen bearbeiten, Vorschau mit Protokoll der Aufrufe an SoftEngine, Exportfenster, Maskenliste.
5. `src/export`: HTML und SEvariablen schreiben, Prüfung vor dem Schreiben.
6. Vorlagen, `README.md` und `.github/workflows/check.yml` auf den neuen Stand, `.claude/launch.json` aufräumen.

## SoftEngine-Wissen, das nicht verloren gehen darf

Im neuen Code schon enthalten: Anmeldung (`basisHTML_REGISTER`, bis 400 Versuche alle 25 ms), `Erstellen`/`initData`/`ReloadData`, `basisHTML_SND_MSG` mit `GET_RELATION`, `PUT_RELATION`, `PUTADD_RELATION`, `ERPAPICALL`, `START_TOOL`, `MASKENEVENT`, `ReloadInputJSON`, Datenorte `SEFileLoop`/`Var`/`Tabellen`/`Masken`/`ErpApiCall`, Antwortformen, Feldlesen über Code, Vor- und Nachsatz, `{WERT}` und Rohsatz.

Noch nicht im neuen Code, beim Export zu beachten (Quelle: `src/export/validator.ts` und `exportMask.ts` auf `main`):

- Dateinamen `index.basis.source.html` und `index.basis.SEvariablen.json`; mit Layoutrahmen `Rahmen00003.basis.source.html` und `Rahmen00003.basis.SEvariablen.json` (Nummer fünfstellig).
- Nur ASCII (Umlaute als Entity, im Skript als `\uXXXX`), nur LF, genau ein `<style>`, kein fremdes Skript, kein `<!--SOFTENGINE-VAR!JWHtml…-->`.
- Einziges fremdes Skript, im Kopf: `<script src="<!--SOFTENGINE-VAR!EditorPfad-->/JS/JS/basis.html.interface.js"></script>`.
- Im Blatt stehen `SEFILELOOP` und `ERPAPICALL` immer, auch leer.
- Bilder per Relation 1911/1912 stehen als `GET_RELATION` im Blatt (`src/export/pictureRelations.ts` auf `main`).
- Fehlersuche: `#ff-debug` in der Adresse oder `localStorage["ff-debug"] = "1"`.

Aus dem handgeschriebenen Empfang, gegen die Testinstallation V7 benutzt:

- Feld eines IDB-Satzes schreiben: `PUT_RELATION` 174 mit `[Position, Länge, Feldart, Satznummer, IDB, Wert]`; Feldart `L` Text, `D` Datum, `Z` Uhrzeit, `R` Zahl; IDB als `ID0001`, nicht `IDBID0001`.
- Neuen Satz anlegen: `GET_RELATION` 640 mit `[IDB]`, Antwort ist die Satznummer.
- Dort gingen die Schreibbefehle ohne Warten auf Antwort im Abstand von 100 ms hinaus, danach `ReloadInputJSON` nach 400 ms, zusätzlich alle 60 s.
- Manche SoftEngine-Fassungen legen Antworten unter `SEDATA.MessageN` ab statt den Rückruf zu nutzen.
- Testtabelle IDB 0001: Satz `0_10`, Kunde `10_8`, Tier `18_8`, Datum `26_10`, Uhrzeit `36_5`, Dauer `41_4`, Zimmer `75_30`, Behandlung `135_60`, Status `195_1` (G, W, B, A, F), Notfall `196_1`, Ankunft `197_5`, Notiz `214_60`.
- Kunden über `ADRESSE.GET` (`ADR_2_8`, `ADR_3292_30`, `ADR_3322_40`, `ADR_2233_40`), Tiere über `LIEFERADRESSE.GET` (`LFA_2_8`, `LFA_10_8`, `LFA_400_30`, `LFA_971_30`, `LFA_430_30`, `LFA_960_10`).

Zwei Stellen, an denen der neue Code vom alten abweicht und die gegen SoftEngine geprüft werden müssen:

- **Schreiben wartet kürzer.** Alt: bis 10 s auf Bestätigung. Neu (`RequestQueue.put`): 200 ms auf einen Einspruch, danach gilt es als gesendet; antwortet SoftEngine einmal auf ein Schreiben, wartet die Leitung künftig bis 3 s. Grund: mehrere Felder nacheinander sollen nicht je 10 s dauern. Risiko: eine späte Antwort auf ein Schreiben könnte der nächsten Frage zugeordnet werden.
- **`KARTEIKARTEN_AKTIVIEREN ` mit Leerzeichen am Ende** ist so aus dem alten Code übernommen. Ob das Absicht war, ist nie geklärt worden.

## Offene Frage an den Betreiber

Er sagte, man könne „direkt die eigene Belegerfassungstabelle in der WEBWARE und in der BüroWARE benutzen“, in der BüroWARE lasse sich nur das Aussehen nicht ändern. Im Repository steht dazu nichts. Zu klären ist, wie diese Tabelle in eine Maske eingebunden wird. Davon hängt ab, ob der Baustein „Erfassung“ überhaupt wieder gebraucht wird.
