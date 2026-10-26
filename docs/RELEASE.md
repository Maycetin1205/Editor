# Einen Stand freigeben

## Vor der Freigabe

1. `npm run check` ist grün, auf GitHub ebenso.
2. Die Rauchprobe im Browser (siehe unten) ist bestanden.
3. Eine exportierte Maske wurde in einer SoftEngine-Installation geöffnet und tut, was sie soll. Das kann kein Test hier ersetzen.
4. `CHANGELOG.md` nennt den Stand: was sich für Anwender ändert, und ob alte Masken ohne Zutun weiter gehen.

## Versionsnummer

Die Nummer steht in `package.json` (`version`) und wandert in jede gespeicherte Maske (`editorVersion`). Ein älterer Editor öffnet eine Maske mit höherer `editorVersion` nur zum Ansehen. Darum:

- Erste Stelle hoch, wenn sich das Maskenformat so ändert, dass ein älterer Editor die Datei nicht mehr lesen soll.
- Zweite Stelle hoch bei neuen Bausteinen oder Eigenschaften (neue `schemaVersion` in `src/editor/state/maskSchema.ts`, Hebung dazu, Test dazu).
- Dritte Stelle für Korrekturen.

Jede neue `schemaVersion` braucht eine `liftTo`-Funktion und einen Test in `test/maskFile.test.ts`, der ein Dokument der Vorstufe hebt und prüft, dass nichts verloren geht.

## Bauen und ausliefern

```sh
npm ci
npm run build
```

`dist/` ist die fertige Seite. Sie wird von einem Webserver unter einer festen Adresse ausgeliefert. Die Adresse soll sich danach nicht mehr ändern: Masken und Bibliothek im Browser hängen an der Adresse (Origin). Ein Umzug auf eine andere Adresse bedeutet für jeden Nutzer: vorher Maske und Bibliothek als Datei sichern.

Es gibt keine Datenbank und keinen Server-Teil. Alles, was Nutzer anlegen, liegt in ihrem Browser oder in Ordnern, die sie dem Browser freigeben.

## Rauchprobe im Browser

In Chrome oder Edge:

1. Editor öffnen. Konsole ohne Fehler.
2. Je einen Baustein jeder Art einfügen (Palette links). Alle erscheinen auf der Fläche.
3. Im Fenster „Daten“ eine Quelle anlegen, einem Feld eine Quelle und ein Datenfeld zuweisen.
4. Speichern (Strg+S) in einen Masken-Ordner. Seite neu laden: Maske ist da. Datei im Ordner vorhanden.
5. Exportieren. Beide Dateien liegen im Zielordner oder im Download.
6. Die exportierte HTML-Datei direkt im Browser öffnen: alle Bausteine sichtbar, in der Konsole nur der Fehler zur fehlenden Brücke (`basis.html.interface.js`).
7. Die zwei Dateien in SoftEngine einsetzen und die Maske dort öffnen.

Schritte 1, 2, 5 und 6 laufen automatisch mit `node tools/smoke.mjs` gegen einen laufenden `npm run dev` (braucht Playwright und Chromium auf dem Rechner, siehe Kopf der Datei).

## Nach der Freigabe

- Tag im Git mit der Versionsnummer.
- `dist/` als Artefakt des GitHub-Laufs oder im Release ablegen.
