# Masken von Hand

Kundenmasken für SoftEngine, direkt als HTML gebaut, alle im Stil von `stil/stil.css`.

- `stil/stil.css`: Farben, Schrift, Abstände und Bausteine. Eine Maske schreibt keine eigenen Werte.
- `stil/gold.css`: die Gestaltung über `stil.css`, nachgebaut nach der Vorlage „Kanban Board“ von Philip Litassy
  (https://dribbble.com/shots/17511387-Kanban-Board), der Designsprache aller Masken. Maße aus dem Bild gemessen;
  Schrift Inter, solange sie nicht eingebettet ist Segoe UI auf Inter-Maße gebracht. `bauen.mjs` setzt sie nach
  `stil.css` ein; ohne den Eintrag dort sieht jede Maske wieder aus wie mit `stil.css` allein.
- `<maske>/<maske>.html`: die Maske, von Hand geschrieben.
- `node masken/bauen.mjs` setzt den Stil ein, schreibt `<maske>/index.basis.source.html` (nur ASCII) und prüft die Regeln.
- Vorschau mit Beispieldaten: Eintrag `masken-ansicht` in `.claude/launch.json`, http://localhost:5311.
  Leere Tafel: in der Konsole (F12) `takeRows([])`.

## Empfang (`kanban/`)

In den Vorlagenordner der Maske in SoftEngine: `index.basis.source.html` und `index.basis.SEvariablen.json`.
Einstellungen oben im Skript von `kanban.html` unter `CONFIG`, danach neu bauen. Beim Kunden prüfen oder setzen:
- `termine`: `TABELLEN.test` (IDB 0001, Testtermine in V7) oder `TABELLEN.terminplaner` (IDB 0021). Dort stehen Felder,
  Statuswerte und Zimmerwerte; `index.basis.SEvariablen.json` nennt dieselbe Tabelle (Zeile „SEvariablen“). Jetzt: 0001.
- `praxis`, `zimmer`: der Name der Praxis oben links, die Behandlungszimmer mit ihrem Zusatz.
- `tiere.felder.medien`: Feld mit der Foto-Nummer des Tiers; leer heißt keine Fotos.
- `kassenWerkzeug`: Werkzeug, das „Kassieren“ zusätzlich startet; leer heißt keins.
- `neuLaden`: Sekunden zwischen zwei Abrufen frischer Daten.
