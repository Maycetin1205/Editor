# Bausteine und Einstellungen: Bestand und Vorschlag

Stand 26.10.2026. Eine Bewertung, keine Entscheidung. Die Entscheidung trifft das Produkt.

## Bestand: 13 Bausteine

| Baustein | Tag | Was er tut | Eigene Einstellungen | Urteil |
|---|---|---|---|---|
| Bereich | `ff-area` | Gruppe mit Titel, Rahmen oder Band; kann einklappen | 3 | bleibt |
| Trennlinie | `ff-divider` | Linie mit optionalem Wort | 3 | bleibt |
| Knopf | `ff-button` | löst eine Aktionskette aus | 4 | bleibt |
| Feld | `ff-formfield` | Text, mehrzeiliger Text, Zahl, Datum, Uhrzeit, Auswahl, Ankreuzfeld, Suche; nachschlagen in einer Quelle | 16 | bleibt, zu voll (siehe unten) |
| Datum | `ff-date` | der gewählte Tag der Maske, mit Vor/Zurück | 0 | bleibt |
| Text | `ff-text` | Wort, Wert eines Feldes, Text mit eingewebten Feldern, Berechnung | 12 | bleibt |
| Bild | `ff-image` | Bild aus Datei, Feld oder Relation | 9 | bleibt |
| Tabelle | `ff-table` | Zeilen einer Quelle mit Suche, Sortieren, Blättern, Spaltenwahl | 5 + Spalten | bleibt |
| Datenliste | `ff-datalist` | einfache Liste zum Auswählen; die Tabelle ohne Kopf und Fuß mit einer Spalte (Karte) | 1 + 4 Felder | bleibt, als Modus der Tabelle gebaut |
| Kanban | `ff-kanban` | Karten in Spalten nach einem Feldwert, Plätze mit Belegung, Verschieben löst Aktion aus | 4 + 18 je Spalte | bleibt, verallgemeinert (Praxis-Reste raus) |
| Werteliste | `ff-valuelist` | Beschriftung und Wert je Zeile, Summen | 1 + Zeilen | bleibt |
| Popup | `ff-popup` | eigene Seite, die eine Aktion öffnet | 3 | bleibt |
| Erfassung | `ff-capture` | Positionen tippen, Vorschläge, buchen, Beträge verteilen | 2 + Spalten | bleibt (Kernstück für Belege), muss kleiner werden |

Die Zahlen sind Eigenschaften aus `properties.ts`. Dazu kommen bei jedem Baustein Lage und Größe im Raster, bei Datenbausteinen Quelle, weitere Quellen und „Folgt der Auswahl“.

## Was fehlt

Nach dem, was eine ERP-Karteikarte braucht, und was die vorhandenen Bausteine nicht können:

1. **Reiter** innerhalb einer Maske. Heute gibt es nur Seiten über Popups. Eine Karteikarte mit „Adresse / Konditionen / Historie“ ist nicht baubar.
2. **Mehrzeiliger Text**. Gebaut als Feldtyp „Mehrzeilig“ des Feldes (`multiline`) mit „Zeilen“ (2 bis 12, Vorgabe 3). Enter beginnt eine neue Zeile, Strg+Enter und Tab gehen zum nächsten Feld.
3. **Auswahlgruppe** (Optionsfelder nebeneinander, Ankreuzfelder als Gruppe). Das Auswahlfeld ist ein Aufklapper, mehr nicht.
4. **Status** (Badge, Ampel, Fortschritt) aus einem Feldwert mit Zuordnung Wert → Farbe und Wort. Heute nur über einen Text mit Ton.
5. **Dokumente / Anhänge**: Liste der Dateien zu einem Satz, mit Öffnen. SoftEngine hat Dokumentverknüpfungen, die Maske kann sie nicht zeigen.
6. **Kennzahl** (eine große Zahl mit Beschriftung und Vergleich). Für Übersichtsmasken.
7. **Verlauf / Zeitleiste** (Ereignisse eines Satzes in Reihenfolge). Für Historie-Reiter.
8. **Link / Aktionstext**: ein Wort, das eine Aktionskette startet, ohne Knopf-Optik. Der Text kann heute schon klicken (`onClick`), aber ohne Hinweis darauf.

Reihenfolge nach Nutzen: 1, 2, 4, 3, dann 5 bis 8.

## Einstellungen: was nicht passt

**Das Feld hat 16 Einstellungen in einer Liste**, davon sieben nur fürs Nachschlagen (Fenster, Spalten, Breite, Höhe, einzigen Treffer übernehmen, Klarname). Das gehört in eine eigene Gruppe „Nachschlagen“, die nur erscheint, wenn Nachschlagen an ist; heute steuert das `when` einzelne Zeilen, die Liste bleibt lang.

**Zwei Beschriftungen** heißen gleich (Feld, Text): „Beschriftung“ für das Wort über dem Feld und „Beschriftung“ für den Text davor. Eins davon muss „Überschrift“ oder „Wort davor“ heißen.

**Die Kanban-Spalte hat 18 Einstellungen**, alle in einer Ebene, von „Name“ bis „Meldung beim Ankommen“. Gruppen: Spalte (Name, Wert, Zusatz, Auffangspalte), Karte (Titel, Unterzeile, Ecke, Fuß), Knopf, Plätze, Meldung.

**Der Inspektor sortiert nach Technik, nicht nach Frage.** Die Gruppen heißen intern `bar`, `display`, `font`, `source`, `lookup`, `block`. Der Nutzer fragt: Was zeigt der Baustein? Woher kommen die Daten? Wie sieht er aus? Was passiert beim Klick? Das sind vier Gruppen, in dieser Reihenfolge, für jeden Baustein gleich.

## Einstellungen: was fehlt

| Ebene | fehlt | Einbau |
|---|---|---|
| Maske | Gestaltung: Grundfarbe, Schriftgröße, Dichte (kompakt/normal), Rasterweite | Eigenschaften am Wurzelknoten (wie Name und Rahmen), die der Export als Überschreibung der `--se-*`-Tokens in den `<style>` schreibt. Die Tokens gibt es; es fehlt nur die Stelle, die sie je Maske setzt. |
| Maske | Beschreibung, Fassung, Notiz für den Nächsten | Wurzelknoten; steht in der Datei, nicht im Export. |
| Feld | Pflichtfeld (vorhanden), **Format** (Zahl mit Stellen, Datum), **Sichtbar wenn** (Bedingung auf ein anderes Feld), **Schreibgeschützt** | `properties.ts` des Feldes; die Laufzeit prüft vor der Aktionskette (`runEvent` prüft heute schon Pflichtfelder). |
| Jede Liste | Zeilen je Seite ist da; **Standard-Sortierung**, **Spaltenbreiten speichern** | Listendeklaration. |
| Editor | gar keine Editor-Einstellungen: Tastenkürzel, Autospeichern-Abstand, Standard-Ordner, Umrisse an/aus beim Start | Ein Fenster „Einstellungen“, Werte im Browser (`maskStorage`), nicht in der Maske. |
| Bausteine | Vorlagen eines fertig eingestellten Bausteins („mein Adressblock“) | Ein Baustein mit Kindern als JSON in der Bibliothek, Palette zeigt sie unter den Standardbausteinen. |

## Was uns sonst hilft

- **Vorschau mit Beispieldaten** im Editor. Heute ist die Vorschau leer, weil der Vorschau-Host nichts liefert. Ein Beispielsatz je Quelle (im Datenfenster eingebbar) würde die Maske im Editor so zeigen, wie der Kunde sie sieht. Der Einbau ist klein: `previewHost` liefert die Beispielzeilen statt nichts.
- **Prüfung vor dem Export** ist da (fehlende Felder, verwaiste Relationen). Es fehlt eine Prüfung der Bedienung: Felder ohne Beschriftung, Knöpfe ohne Aktion, Listen ohne Quelle.
- **Eine Seite Bedienung**: Was Entf, Strg+D, Pfeile, Umschalt+Pfeile tun, steht nirgends im Editor.
