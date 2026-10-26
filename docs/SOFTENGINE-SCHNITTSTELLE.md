# Schnittstelle zwischen Maske und SoftEngine

Stand 26.10.2026. Dieses Dokument beschreibt, was eine exportierte Maske von SoftEngine erwartet und was sie an SoftEngine sendet. Es ist aus dem Code in `src/softengine` und `src/export` abgeleitet, nicht aus einer SoftEngine-Dokumentation.

**Wichtig:** Der Anschluss wurde ohne Zugriff auf SoftEngine geschrieben. Ob die hier genannten Funktionen und Nachrichtenformate in der eingesetzten SoftEngine-Version so existieren, muss gegen `basis.html.interface.js` und eine laufende Installation geprüft werden. Die Punkte, die geprüft werden müssen, stehen am Ende.

## Die zwei Dateien des Exports

| Datei | Inhalt |
|---|---|
| `index.basis.source.html` | Die Maske: Bausteine als `<ff-*>`-Elemente, die Laufzeit als eingebettetes Skript, die Liste der Datenquellen (`window.FF_DATA_SOURCES`) und Relationen (`window.FF_RELATIONS`). |
| `index.basis.SEvariablen.json` | Das Blatt, das SoftEngine sagt, welche Daten die Maske braucht: `SEFileLoop`, `Var`, `Tabellen`, `Masken`, `ERPAPICALL` (immer vorhanden, notfalls leer) und `GET_RELATION` für Bilder. |

Ist in der Maske ein Rahmen (Layoutrahmen) gesetzt, heißen die Dateien nach dem Rahmen (siehe `src/core/block/documentFrame.ts`).

Die HTML-Datei ist reines ASCII (Umlaute als Entities und `\uXXXX`), nur LF-Zeilenenden, genau ein `<style>`, kein fremdes Skript außer der Brücke. Der Export prüft das vor dem Schreiben (`src/export/validator.ts`).

## Die Brücke

Die Maske lädt als einziges externes Skript:

```html
<script src="<!--SOFTENGINE-VAR!EditorPfad-->/JS/JS/basis.html.interface.js"></script>
```

Der Platzhalter `<!--SOFTENGINE-VAR!EditorPfad-->` wird von SoftEngine ersetzt. Alles Weitere steckt in der Datei.

## Was die Maske von SoftEngine aufruft

Alle Aufrufe sind in `src/softengine/bridge.ts`, `commands.ts`, `editing.ts`, `relations/getJob.ts` und `relations/putJob.ts`; die Reihenfolge der Aufträge regelt `relations/hostQueue.ts`. Jeder Aufruf ist mit `typeof ... === 'function'` abgesichert: fehlt eine Funktion, läuft die Maske ohne sie weiter.

| Funktion | Wann | Wozu |
|---|---|---|
| `basisHTML_REGISTER(callback, document.title, '1.0')` | Beim Start, bis zu 400 Versuche im Abstand von 25 ms | Meldet die Maske an. Der Callback bekommt Daten (`{Daten: ...}` oder eine Relationsantwort). |
| `basisHTML_SND_MSG(art, body)` | Bei Aktionen | Sendet `GET_RELATION`, `PUT_RELATION`, `PUTADD_RELATION`, `START_TOOL`, `MASKENEVENT`. |
| `basisHTML_SetConsoleLog(true, true)` | Nur mit `#ff-debug` in der Adresse oder `localStorage["ff-debug"] = "1"` | Schaltet das Protokoll von SoftEngine ein. |
| `selib.Json.InitializeERPConnection()` | Beim Start, wenn vorhanden | Verbindung initialisieren. |
| `InitialisiereSchnittstelle()` | Beim Start, wenn vorhanden | Dito. |
| `ResetDataBasis()`, `InitialisiereDatenBasis()` | Nach jeder Datenlieferung | Datenbasis von SoftEngine neu aufbauen. |
| `ReloadInputJSON()` | Wenn die Maske frische Daten will | Daten neu anfordern. Fehlt die Funktion, werden `ResetDataBasis`/`InitialisiereDatenBasis` gerufen. |
| `sendBWLinkIntern('0,START_TOOL,<nr>,<params>')` | Nur wenn `basisHTML_SND_MSG` fehlt | Ersatzweg für Werkzeugstart. |

## Was die Maske für SoftEngine bereitstellt

| Global | Bedeutung |
|---|---|
| `Erstellen()`, `initData()` | SoftEngine ruft sie nach dem Laden der Daten. Die Maske liest `SEDATA.Daten` neu. |
| `ReloadData()` | Dito, ohne Neuaufbau der Datenbasis. |
| `basisHTML_DoSetFocusToHTML()` | Antwortet `true`, wenn der Fokus in einem Eingabefeld der Maske liegt. |
| `enableCustomFind = false` | Eigene Suche von SoftEngine aus. |
| `SEDATA.Daten` | Wird von der Maske gesetzt, wenn Daten über den Callback oder `postMessage` kommen, und sonst von SoftEngine erwartet. |
| `FF_DATA_SOURCES`, `FF_RELATIONS` | Die Listen aus dem Export. `FF_POSITIONEN` ist ein Übergabeplatz für Positionen. |
| `window.ffJobs` (nur Debug) | Protokoll der Aufträge, siehe `src/runtime/jobs.ts`. |

Daten kommen zusätzlich über `window.postMessage` an, wenn `basisHTML_REGISTER` fehlt: erwartet wird `{MSG: {DATA: ...}}` (als Objekt oder JSON-Text).

## Datenformat `SEDATA.Daten`

Die Maske sucht Zeilen einer Quelle in dieser Reihenfolge (`src/softengine/data.ts`):

1. `SEFileLoop` (Array mit `ALIAS` oder Objekt mit Alias als Schlüssel), Zeilen unter `Zeilen`, `Saetze`, `Rows`, `Daten` (auch als JSON-Text)
2. `ErpApiCall` / `ERPAPICALL` mit Alias als Schlüssel
3. `Tabellen` mit Alias oder Tabellen-Kennung als Schlüssel
4. `Masken` mit Alias als Schlüssel (ein Satz)

Der offene Satz einer Quelle mit Lieferweg `Var` wird aus `Var.WINDOW_VARIABLE` (Schlüssel `<TABELLE>_<feld>`) und `Var.<TABELLE>` zusammengesetzt.

Feldwerte (`src/softengine/fields.ts`): direkt unter dem Feldcode (`12_8`), unter einem Schlüssel mit Präfix oder Suffix (`KD_12_8`, `12_8_NAME`), als `{WERT: ...}` oder aus dem Rohsatz (`SATZ`, `SATZNEU`, `RAW`) an Position/Länge. HTML-Entities werden dekodiert.

## Nachrichten

### `GET_RELATION`

```json
{ "NR": "<Relationsnummer>", "PARAMS": ["...", "..."] }
```

Optional mit `ALIAS: "SEGet", ALS_ARRAY: "false"`, wenn der Aufrufer es verlangt. Die Antwort wird über den Callback erwartet, innerhalb von `ANSWER_WAIT_MS` (`src/core/data/jobs.ts`). Erkannt wird sie an einem `*LISTE`-Schlüssel, `LISTENNAME`/`ELEMENTNAME` oder einem Ergebnisfeld (`RESULT`, `PINDEX`, `INDEX`, `KEY`, `ID`, `VALUE`, ...). Eine Ablehnung wird an Fehlermerkmalen erkannt (`src/softengine/relations/answer.ts`).

### `PUT_RELATION`, `PUTADD_RELATION`

Gleicher Aufbau. Die Maske wartet bis 10 s auf eine Antwort oder eine Datenlieferung, bei Positionen fragt sie zusätzlich die Positionen nach (Relation 69) und prüft, ob die Zeile erschienen oder verschwunden ist.

### `START_TOOL`

```json
{ "NR": "<Werkzeugnummer>", "PARAMS": ["..."] }
```

### `MASKENEVENT`

```json
{ "EVENT": "KARTEIKARTEN_DEAKTIVIEREN" }
```

Beim Betreten eines Eingabefelds sendet die Maske `KARTEIKARTEN_DEAKTIVIEREN` und `BEARBEITUNG_AKTIV`, beim Verlassen `BEARBEITUNG_BEENDET` und `KARTEIKARTEN_AKTIVIEREN` (mit einem Leerzeichen am Ende, so im Code in `src/softengine/editing.ts`).

## Verhalten ohne SoftEngine

Öffnet man die exportierte Datei direkt im Browser, fehlt die Brücke. Die Bausteine werden gezeichnet, bleiben aber ohne Daten. Die Anmeldung gibt nach 10 s auf, die Datensuche nach 30 s, ohne Meldung an den Nutzer. Relationen scheitern mit `NOT_CONNECTED`.

## Was gegen SoftEngine zu prüfen ist

1. Existieren `basisHTML_REGISTER`, `basisHTML_SND_MSG`, `basisHTML_SetConsoleLog`, `basisHTML_DoSetFocusToHTML` mit genau diesen Signaturen in `basis.html.interface.js`?
2. Ruft SoftEngine `Erstellen`, `initData` oder `ReloadData`? Welche davon?
3. Ist das Leerzeichen in `'KARTEIKARTEN_AKTIVIEREN '` Absicht oder ein Tippfehler? Wenn SoftEngine den Namen exakt vergleicht, wird die Karteikarte nie wieder aktiviert.
4. Entsprechen die Antwortformate (`*LISTE`, `LISTENNAME`/`ELEMENTNAME`, `RESULT`) dem, was SoftEngine wirklich sendet?
5. Ist der Platzhalter `<!--SOFTENGINE-VAR!EditorPfad-->` und der Pfad `/JS/JS/basis.html.interface.js` für alle Installationen richtig?
6. Wird das `SEvariablen`-Blatt in genau dieser Form gelesen (Schlüsselnamen, leeres `ERPAPICALL: []`)?

Erst wenn diese sechs Punkte mit einer echten Installation bestätigt sind, ist der Anschluss als geprüft zu betrachten.
