# Masken von Hand

Kundenmasken für SoftEngine, direkt als HTML gebaut, alle im Stil von `stil/stil.css`.

- `stil/stil.css`: Farben, Schrift, Abstände und Bausteine. Eine Maske schreibt keine eigenen Werte.
- `<maske>/<maske>.html`: die Maske, von Hand geschrieben.
- `node masken/bauen.mjs` setzt den Stil ein, schreibt `<maske>/index.basis.source.html` (nur ASCII) und prüft die Regeln.
- Vorschau mit Beispieldaten: Eintrag `masken-ansicht` in `.claude/launch.json`, http://localhost:5311.

## Empfang (`kanban/`)

In den Vorlagenordner der Maske in SoftEngine: `index.basis.source.html` und `index.basis.SEvariablen.json`.
Einstellungen oben im Skript von `kanban.html` unter `CONFIG`, danach neu bauen. Beim Kunden prüfen oder setzen:
- `idb`, `felder`: Terminplaner IDB 0021; die gelesenen Felder stehen auch in `index.basis.SEvariablen.json`.
- `status`: was im Feld Zimmer/Status für Termin, Wartezimmer, Behandlung, Abrechnung und Fertig steht.
- `praxis`: der Name der Praxis oben links.
- `zimmer`: die Behandlungszimmer und was im Feld Zimmer steht.
- `tiere.felder.medien`: Feld mit der Foto-Nummer des Tiers; leer heißt keine Fotos.
- `kassenWerkzeug`: Werkzeug, das „Kassieren“ zusätzlich startet; leer heißt keins.
- `neuLaden`: Sekunden zwischen zwei Abrufen frischer Daten.
