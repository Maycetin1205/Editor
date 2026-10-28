# Plan: Bausteine neu gedacht

Stand 26.10.2026. Konzept, kein Umbau. Grundlage: der Code jedes Bausteins
unter `src/blocks/` (Stand nach Commit `7f1a389`, dazu die beiden noch nicht
eingecheckten Änderungen an `area/areaStyle.ts` und `formfield/FormField.ts`),
`src/design/mask.css`, die Laufzeitteile in `src/runtime/`, die Grundlage in
`src/core/block/` und `BAUPLAN.md`. Das Lexikon unter
`C:\Users\mu.aycetin\Desktop\Softengine\softengine-lexikon` wurde nur als
Nachschlagewerk benutzt (was Masken ans ERP schicken und von dort lesen).

Was dieser Plan ist: eine Vorlage für Entscheidungen. Wo mehrere Wege gehen,
stehen die Wege als Frage (im Text als **D1**, **D2** …, gesammelt in
Abschnitt 6). Umgebaut wird erst, wenn der Auftraggeber das Konzept und die
Antworten freigegeben hat. `BAUPLAN.md` (Aufräumen der Bauweise) bleibt
gültig; dieser Plan setzt darauf auf und sagt, was die Bausteine danach
*können* sollen, nicht nur, wie sie gebaut sind.

Geändert am 26.10.2026 nach Durchsicht der Seite
`entwuerfe/bereich-heute-neu.html` (Entscheidung des Auftraggebers): Ein
Bereich bleibt in Lage und Größe fest, Leeres wird still gezeigt,
verschwinden kann ein Bereich nur über eine Einstellung. Schrumpfen nach
Inhalt gilt nur für Karten, Steckbrief und Listen. Betroffen sind die
Abschnitte 1, 2.1, 2.2, 2.8, 2.11, 3.1, 3.4, 3.8, 3.9, 3.10, 3.14, 4, 5,
D2 und D12. Vergleichsseiten unter `entwuerfe/`: `bereich-heute-neu.html`,
`feld-heute-neu.html`.

**Neuer Maßstab (26.10.2026, Auftraggeber), gilt vor allem Übrigen in
dieser Datei:** Minimal umbauen ist nicht das Ziel. Die Bausteine sollen so
gut aussehen wie die besten Oberflächen, die es gibt; jeder Baustein wird
von Grund auf neu gedacht, auch wenn kein Code übrig bleibt. Bleiben müssen
Maskenformat, Export nach SoftEngine und Anschluss. Drei Pflichten je
Baustein: (1) Aussehen auf Profi-Niveau aus einem System (Abstände,
Schrift, Farben, Zustände leer, lädt, Fehler, gewählt, gesperrt), vorher
ein Entwurf als HTML-Seite, gebaut wird erst nach dem Ja; (2) alles
Sichtbare im Inspektor einstellbar mit sinnvollen Vorgaben, was nicht
einstellbar ist, wird begründet; (3) ohne Fehler: `npm run check` grün,
jeder Baustein in der Vorschau und in einer exportierten Maske in
SoftEngine geprüft, bevor er als fertig gilt. Arbeitsweise: ein Baustein
nach dem anderen, zuerst Bereich, Feld, Erfassung, Tabelle; je Baustein
Entwurf zeigen, Ja abwarten, bauen, prüfen, Bild schicken. Entscheidungen
als eine Frage mit Vorschlag, nicht als Liste. Die Liste D1 bis D24 unten
bleibt als Sammlung stehen; gefragt wird je Entwurf nur eine. Die Entwürfe
liegen unter `entwuerfe/entwurf-<baustein>.html`; der erste ist
`entwurf-bereich.html`.

Was dieser Plan nicht ist: Das Bild der heutigen SoftEngine-Maske „Abgabe
Menge“ (Dosierungsrechner, Chargen, bisherige Abgaben) ist das
Negativbeispiel, nicht die Vorlage. Nichts davon wird übernommen: keine
Raster aus vierzig Feldern, keine Werkzeugleiste mit Textknöpfen, keine
Radioknöpfe. Der Abgabe-Dialog wird in einer anderen Sitzung gebaut und
hält sich später an die Regeln aus Abschnitt 2 (Kurzliste in Abschnitt 2.11).

Wörter, die im Plan vorkommen: *Baustein* = ein Teil, das der Bauer auf die
Maske setzt (Knopf, Tabelle, Kanban …). *Maske* = die fertige Oberfläche in
SoftEngine. *Bauer* = wer im Editor baut. *Anwender* = wer mit der Maske
arbeitet. *Steckteil* = ein Stück Code, das mehrere Bausteine gemeinsam
benutzen (zum Beispiel „Zeilen laden“), statt dass jeder es selbst hat.
*Quelle* = die Datenlieferung aus SoftEngine, an die ein Baustein
angeschlossen ist. *Kette* = die Folge von Aktionen, die ein Klick oder eine
Taste auslöst.

---

## 0. Kurzfassung

1. Es gibt 13 Bausteine und etwa 10 gemeinsame Teile. Die Bauweise ist
   ordentlich, das Aussehen ist einheitlich (ein Blau, weiße Karten,
   Haarlinien, Windows-Schrift). Die Karte der Kanban-Tafel ist heute schon
   das Vorbild für den Leitgedanken: sie zeigt nur Felder mit Inhalt.
2. Die anderen Bausteine folgen dem Leitgedanken noch nicht. Ein leerer
   Text zeigt einen leeren grauen Kasten, eine leere Tabelle zeigt Kopf und
   leere Linien ohne ein Wort, ein Bild ohne Bild zeigt einen gestrichelten
   Kasten mit Satz, eine Werteliste zeigt leere Zeilen in voller Tinte.
3. Die Maske passt sich keinem Bildschirm an: Sie ist 1861 × 886 Punkte
   groß und wird höchstens auf 85 % verkleinert. Darunter wird abgeschnitten.
4. Tastatur gibt es, aber jeder Baustein hat seine eigene Handschrift, und
   nirgends steht, welche Tasten gelten. Die Tafel kann man nur mit der
   Maus bedienen (Karten ziehen).
5. Fehler und Warten sind gut gelöst (Ring, Haken, Lauflinie, Leiste unten),
   aber an zwei Stellen geht Getipptes stillschweigend verloren.
6. Rechte gibt es im Editor nicht. SoftEngine-Masken lesen aber Rechte und
   Sperren (laut Lexikon: Zugriffsrechte, Löschrechte, gesperrte Spalten,
   Belegsperren).
7. Fachwissen der Tierarztpraxis steckt im allgemeinen Teil (Tierarten,
   „Belegt/Frei“, „Wartet seit“, Symbole wie Impfung und Arzt).
8. Vorschlag: gemeinsame Regeln (Abschnitt 2), je Baustein ein
   Neukonzept (Abschnitt 3), Umbau in neun Schritten (Abschnitt 5), die mit
   den Steckteilen beginnen und mit der Erfassung enden.
9. Entschieden am 26.10.2026: Die feste Lage ist der Anker des Anwenders.
   Ein Bereich mit Feldern bleibt in Lage und Größe, Leeres wird still
   gezeigt (Beschriftung schwach, ein Strich, kein leerer Kasten), und nur
   die Einstellung „Ausblenden wenn leer“ lässt ihn verschwinden. Kleiner
   werden nur Karten, der Steckbrief und Listen.

---

## 1. Leitgedanke

**Ein Baustein zeigt nur, was es wirklich gibt, und passt sich den Daten an.**

Das heißt für jeden Baustein vier Dinge:

- **Fehlt ein Wert, wird er still.** In einem Bereich oder Dialog bleibt
  jeder Baustein an seiner Stelle. Ein leerer Wert zeigt nur seine
  Beschriftung in schwacher Tinte und einen Strich, keinen leeren Kasten
  und keinen Satz. Die feste Lage ist der Anker des Anwenders: Wer Kunden
  durchklickt, will das Telefon immer an derselben Stelle finden
  (Entscheidung des Auftraggebers, 26.10.2026).
- **Auf einer Karte fehlt der Platz.** Eine Karte der Tafel, eine Zeile des
  Steckbriefs, ein Eintrag einer Liste zeigt nur, was einen Wert hat, und
  wird kleiner. Da ist jeder Eintrag ohnehin ein eigenes Ding, verschieden
  hohe Karten sind normal. (Die Technik gibt es schon: das Einklappen eines
  Bereichs schließt heute Zeilen des Rasters, `src/blocks/area/fold.ts`.)
- **Fehlt die Liste, sagt die Liste es.** Eine Tabelle, eine Liste oder eine
  Tafel ist eine Arbeitsfläche. Sie verschwindet nicht, aber sie zeigt einen
  stillen Satz statt leerer Linien: „Keine Einträge“, „Nichts gewählt“,
  „lädt …“, „Kein Treffer für ‚Müller‘“.
- **Fehlt das Recht, fehlt der Knopf.** Was der Anwender nicht darf, sieht
  er nicht (oder sieht es gesperrt, das ist **D6**). Heute gibt es dafür
  keinen Schalter.
- **Fehlt der Platz, bleibt der Inhalt.** Auf einem schmalen Bildschirm
  bricht die Maske um oder lässt Nebensächliches weg, statt abzuschneiden.

Was *nicht* verschwindet: Eingabefelder, Knöpfe, die Tippzeile der
Erfassung. Leer ist dort der Normalzustand, der Anwender soll ja tippen.
Ein ganzer Bereich verschwindet nur, wenn der Bauer es für ihn einstellt
(„Ausblenden wenn leer“), etwa für die Chargen eines Artikels, der keine
hat, oder wenn das Recht fehlt. Dann fehlt er samt Platz, und was darunter
liegt, rückt nach.

---

## 2. Gemeinsame Regeln für alle Bausteine

### 2.1 Raster und Abstände

Heute: Das Blatt hat 48 Spalten; eine Rasterzeile ist 12 Punkte hoch mit
4 Punkten Lücke, also 16 Punkte Schritt (`src/core/block/grid.ts`). Jeder
Baustein hat feste Rasterkoordinaten. Ein Feld ist 2 Zeilen hoch (28 Punkte),
mit Beschriftung 3 Zeilen (44 Punkte), eine Tabellenzeile 36 Punkte, ein
Kartenkopf 36 Punkte. Schrift 13 Punkte, Beschriftungen 12, Titel 14,
Überschrift 20, Betrag 22 (`src/design/mask.css`).

Regeln:

- Der 16-Punkte-Schritt und die 48 Spalten bleiben. Sie passen zu Windows
  und zu der Schrift.
- Abstände gibt es nur in fünf Größen: 4, 8, 12, 16, 24. Heute stehen
  daneben 2, 6, 10, 14 (zum Beispiel 10 in der Karte, 6 im Fuß der
  Werteliste, 14 im Dialogkopf). Das wird vereinheitlicht.
- Innen in einer Karte: 16 seitlich, 12 oben und unten. Zwischen zwei
  Bausteinen: 4 (die Rasterlücke) ohne Karte, 12 mit Karte.
- Höhen aus dem Raster: 28 (Feld, Knopf), 36 (Zeile, Kopf), 44 (Feld mit
  Beschriftung, großer Knopf). Nichts dazwischen.
- Nur Karten, der Steckbrief und Listen wachsen oder schrumpfen nach
  Inhalt und melden ihre Höhe; das Raster öffnet oder schließt Zeilen. Das
  ist das Steckteil „Zeilen zeigen“ (Abschnitt 2.8). Ein Bereich mit
  Feldern behält die Höhe, die der Bauer ihm im Raster gegeben hat. Heute
  wird die Höhe nur im Editor gemessen (`heightReport.ts`), in der Maske
  nicht.

### 2.2 Leere Zustände

Jeder Baustein, der Daten zeigt, ist in genau einem von sechs Zuständen:

| Zustand | Wann | Wer sieht es |
|---|---|---|
| Ohne Anschluss | keine Quelle oder kein Feld gewählt | nur der Bauer im Editor; in der Maske gibt es den Zustand nicht, der Export weist ihn zurück |
| Lädt | Quelle ist angefordert, noch keine Antwort | Anwender |
| Nichts gewählt | der Baustein folgt der Auswahl einer Liste, dort ist nichts gewählt | Anwender |
| Leer | Antwort da, aber null Zeilen, oder der Wert ist leer | Anwender |
| Wert da | normal | Anwender |
| Laden gescheitert | keine Antwort in 20 s oder Absage von SoftEngine (`src/core/data/jobs.ts`) | Anwender |

Was ein Baustein in jedem Zustand tut, hängt von seiner Familie ab:

| Familie | Bausteine | Lädt | Nichts gewählt | Leer | Gescheitert |
|---|---|---|---|---|---|
| Wert in einem Bereich oder Dialog | Text, Lesefeld, Bild | bleibt an seiner Stelle, ein schwacher Balken statt des Wertes | bleibt an seiner Stelle: Beschriftung schwach, ein Strich | bleibt an seiner Stelle: Beschriftung schwach, ein Strich (Option je Baustein: „Wenn leer: Wort zeigen“) | bleibt an seiner Stelle, Leiste unten meldet |
| Wert auf einer Karte, im Steckbrief, in einer Liste | Platz einer Karte, Zeile des Steckbriefs, Eintrag | hält den Platz, zeigt nichts | verschwindet | verschwindet (Option: „Immer zeigen“) | verschwindet, Leiste unten meldet |
| Liste | Tabelle, Liste, Werteliste als Ganzes, Spalte der Tafel | Lauflinie oben, Körper leer | ein Satz: „Nichts gewählt“ | ein Satz: „Keine Einträge“ (Option: „ohne Einträge ausblenden“) | ein Satz mit „Erneut laden“ |
| Eingabe | Feld, Erfassung, Knopf, Tagwahl | bedienbar, Ring beim Schreiben | Feld gesperrt mit Hinweis „Erst Zeile wählen“ | bedienbar, leer ist normal | Wert bleibt stehen, roter Rand, Leiste meldet |
| Behälter | Bereich, Dialog | Lage und Größe fest, Lauflinie oben | Lage und Größe fest, ein Satz oben im Körper, die Felder darunter still | Lage und Größe fest, ein Satz oben im Körper; weg nur mit der Einstellung „Ausblenden wenn leer“ (**D2**, entschieden) | Lage fest, roter Balken links, Satz mit „Erneut laden“ |

Sätze in leeren Zuständen sind still: 12 Punkte, zweite Tinte, kein
Rahmen, kein Symbol. Sie nennen, was fehlt, und wenn möglich, was zu tun ist
(„Nichts gewählt – links eine Zeile wählen“). In einem Bereich steht der
Satz oben im Körper über den still gewordenen Feldern, in einer Liste
mittig im Körper.

Warum nicht alles verschwindet: Eine Maske, die bei jedem Datensatz anders
aussieht, lässt das Auge jedes Mal neu suchen. Das wiegt schwerer als ein
stiller Strich an einer bekannten Stelle. Darum schrumpft nur, was ohnehin
ein Eintrag unter vielen ist (Karte, Zeile, Eintrag), nie der Rahmen, in
dem der Anwender arbeitet (Bereich, Dialog).

**D1** Leere Linien in Listen: Die Tabelle zeichnet heute unter den
Datensätzen leere Zeilen bis zum Fuß („wie ein Hauptbuch“, Wunsch vom
14.10.). Soll das bleiben (A) nur in der Erfassung, (B) in Tabelle und
Erfassung, (C) nirgends mehr, weil der stille Satz die Fläche erklärt?

### 2.3 Fehler- und Wartezustände

Heute (`src/runtime/notice.ts`, `src/blocks/base/notice.ts`,
`src/runtime/infoBar.ts`): sechs Zustände je Baustein (ruhig, lädt,
schreibt, gespeichert, gesendet, Fehler). Ein Knopf oder Feld zeigt beim
Schreiben den Windows-Ring, danach 2 Sekunden den Haken (grau, wenn
SoftEngine ohne Bestätigung angenommen hat). Eine Liste zeigt beim Laden und
Schreiben die Lauflinie an der Oberkante. Ein Fehler erscheint einmal für die
ganze Maske in der Leiste unten (rote Kante, Name des Bausteins, Satz,
Kreuz). Das ist gut und bleibt.

Was dazukommt:

- **Nichts geht verloren.** Wenn SoftEngine einen Wert ablehnt, bleibt der
  getippte Wert im Feld, das Feld bekommt die rote Unterkante, die Leiste
  nennt den Grund, und Enter versucht es erneut. Heute setzt das Feld auf
  den alten Wert zurück (`formfield/valueBinding.ts`, `takeBack`), und das
  Nachschlagen verwirft einen getippten Text beim Verlassen des Feldes ohne
  ein Wort (`lookup/lookupControl.ts`, `actionOnLeave` → `back`).
- **Warten hat drei Stufen.** Unter 300 ms passiert sichtbar nichts (kein
  Flackern). Danach Ring oder Lauflinie. Nach 20 s (die Wartezeit aus
  `jobs.ts`) der Satz „SoftEngine antwortet nicht“ am Ort und in der Leiste.
- **Ein Fehler hat einen Ort.** Die Leiste unten sagt, was; der Baustein
  selbst trägt die rote Kante (Feld: Unterkante, Zeile: Balken links, Karte:
  Balken links). Klick auf die Leiste springt zum Ort.
- **Ein Fehler sagt, was als Nächstes geht.** „Nicht gespeichert. Enter
  versucht es erneut.“ statt nur „abgelehnt“. Technische Codes nur hinter
  dem Satz in Klammern, nie allein.
- **Unbestätigt bleibt sichtbar.** Eine Zeile, die gesendet, aber nicht
  bestätigt ist, bleibt grau mit grauem Haken, bis die nächste Lieferung sie
  wiederfindet. Der Hauptknopf zählt sie als offen.

### 2.4 Tastatur

Heute gibt es viel, aber verstreut, und nirgends sichtbar:

| Baustein | Tasten heute (aus dem Code) |
|---|---|
| Feld | Enter springt zum nächsten Feld in Leserichtung (`runtime/nextField.ts`); beim Ankreuzfeld schaltet der Klick auf den Text |
| Nachschlagen | ↓ öffnet die Vorschläge, ↑↓ markieren, Bild↑↓ blättern, Enter übernimmt den eindeutigen oder von Hand markierten Treffer (sonst Fenster), Tab ebenso (sonst nichts), F5 oder Alt+↓ öffnet das Fenster, Esc schließt oder leert |
| Tabelle | ↑↓ zwischen Zeilen, Enter wählt, Doppelklick öffnet, F4 Aktion an der Zeile, Rechtsklick auf den Kopf wählt Spalten, ↓ aus der Suche in die erste Zeile, ↑ aus der ersten Zeile in die Suche; in der Rückfrage ←→ Esc |
| Erfassung | Einfg springt in die Tippzeile, Tab und Shift+Tab zwischen Zellen, Enter erfasst die Zeile, ↑↓ zwischen Tippzeile und Zellen darüber, Esc leert oder gibt auf, F5 Fenster; in gebuchten Zeilen Enter ↑↓ Bild↑↓ (zehn Zeilen) Esc (Änderung verwerfen); im Aufteilen-Fenster ↑↓ Pos1 Ende Leertaste Ziffern Entf Rücktaste Enter Esc, mit sichtbarer Tastenzeile |
| Tafel (Kanban) | Enter oder Leertaste wählt die Karte; verschieben nur mit der Maus |
| Liste (Datenliste) | Enter oder Leertaste wählt; keine Pfeile, nur Tab von Zeile zu Zeile |
| Werteliste | Enter oder Leertaste auf einer Zeile mit Kette |
| Bereich | Enter oder Leertaste klappt |
| Dialog | Esc schließt |
| Tagwahl | nur die Tasten des Browser-Datumsfeldes |

Regeln:

- **Eine Tastenordnung für die ganze Maske.** Sie gilt in jedem Baustein
  gleich:

  | Taste | Bedeutung |
  |---|---|
  | Tab, Shift+Tab | nächstes, voriges Element |
  | Enter | nächstes Feld; in einer Liste: die Zeile öffnen; im letzten Feld eines Bereichs oder Dialogs: der Hauptknopf (**D3**) |
  | Esc | eine Stufe zurück: Vorschläge zu, dann Getipptes zurück auf den alten Wert, dann Dialog zu (mit Rückfrage, wenn etwas Ungespeichertes da ist) |
  | ↑ ↓ | Zeile, Karte, Vorschlag |
  | ← → | Spalte auf der Tafel, Tag in der Tagwahl, Zelle in der Tippzeile |
  | Leertaste | Häkchen, Zeile wählen, Karte aufnehmen und ablegen |
  | Pos1, Ende, Bild↑, Bild↓ | Anfang, Ende, seitenweise |
  | F4 | Aktion an der Zeile (bleibt, SoftEngine-Gewohnheit) |
  | F5 | Nachschlagen (bleibt) |
  | Einfg | neue Zeile in der Erfassung (bleibt) |
  | Entf | Zeile wegnehmen, mit Rückfrage (bleibt) |
  | F1 | Tastenhilfe einblenden (neu) |
  | Tippen in einer Liste | springt in die Suchzeile, wie im Windows-Explorer (neu, **D4**) |

- **Jeder Baustein meldet seine Tasten.** Eine Liste je Baustein im Code
  (ein Steckteil „Tasten“, Abschnitt 2.8). Daraus zeigt der Editor unter dem
  Baustein „Tastatur“, die Maske blendet bei F1 die Hilfe ein, und die
  Erfassung zeigt wie heute das Aufteilen-Fenster eine Tastenzeile, solange
  die Tippzeile den Fokus hat.
- **Alles, was die Maus kann, kann die Tastatur.** Das fehlt heute beim
  Verschieben einer Karte, beim Spaltenwählen (nur Rechtsklick) und beim
  Zurückholen einer erfassten Zeile (nur Doppelklick).
- **Der Fokus ist sichtbar und kehrt zurück.** Ring in der Tinte (Knopf),
  Akzentkante (Feld), Balken (Zeile). Nach einem Dialog oder Fenster geht
  der Fokus dorthin zurück, wo er herkam (das Nachschlagefenster macht das
  schon, der Dialog nicht erkennbar).

### 2.5 Benennung

Die Beschriftungen im Editor sind deutsch und meist gut. Vier Unsauberkeiten:

- „Beschriftung“ ist im Feld und im Text zweimal vergeben: einmal als
  Schalter (zeigen ja/nein), einmal als Text (`formfield/properties.ts`,
  `text/properties.ts`).
- Farben heißen nach der Farbe (Neutral, Akzent, Grün, Ocker, Rot), nicht
  nach dem Sinn.
- Schriftgrößen heißen nach der Zahl (12, 13, 14, 20, 22), der Bauer denkt
  aber in Rollen.
- „Fett“ beim Text macht den Text blau und halbfett (`textStyle.ts`,
  `.text.bold`). Das überrascht.

Vorschlag (alles **D5**, eine Entscheidung):

| Heute | Vorschlag | Wo |
|---|---|---|
| Beschriftung (Schalter) | Beschriftung zeigen | Feld, Text |
| Beschriftung (Text) | Beschriftung | Feld, Text, Knopf |
| Form: Frei, Kasten, Kopfzeile, Klappbar, Band | Art: Frei, Karte, Karte mit Kopf; Klappbar als eigener Schalter; Band entfällt (Abschnitt 3.1) | Bereich |
| Farbe: Neutral, Akzent, Grün, Ocker, Rot | Bedeutung: Neutral, Hinweis, Erfolg, Warnung, Gefahr | Knopf, Spalte der Tafel |
| Art: Gefüllt, Rand | Rolle: Hauptknopf, Nebenknopf | Knopf |
| Größe: 12, 13, 14, 20, 22 | Größe: Beschriftung, Wert, Titel, Überschrift, Betrag | Text |
| Fett | Hervorgehoben | Text |
| Datum | Tagwahl | Baustein |
| Datenliste | Liste | Baustein |
| Werteliste | Steckbrief | Baustein |
| Popup | Dialog | Baustein |
| Kanban | Tafel (oder Kanban bleibt, es ist ein bekanntes Wort) | Baustein |
| Spaltenwahl | Spalten wählbar | Tabelle, Erfassung |
| Einzigen Treffer übernehmen | bleibt | Feld |

Regel: Ein Begriff pro Ding, in allen Bausteinen: Titel (Überschrift eines
Teils), Beschriftung (kleines Wort über einem Wert), Wert, Quelle, Feld
(ein Feld der Quelle), Spalte, Zeile, Eintrag, Karte, Platz. Was in
gespeicherten oder exportierten Masken steht, bleibt als Zweitname gültig
(so steht es in `BAUPLAN.md`, Phase 5).

### 2.6 Rechte und Bedingungen

Befund: Im Editor und in der Laufzeit gibt es keinen Begriff von Rechten
(Suche im Code: nur das Programmwort `readonly`). Die SoftEngine-Vorlagen
lesen Rechte sehr wohl: Das Lexikon kennt Einträge wie „Zugriffsrechte der
PPS-Ansicht lesen“, „Löschrecht Aufgabe prüfen“, „Tabelle mit gesperrten
Spalten“, „Belegsperren und Kreditlimitprüfung“. Wie SoftEngine ein Recht an
eine Maske liefert, steht im Lexikon je Vorlage (Relation oder Variable);
welchen Weg der Editor nimmt, ist ein Echttest.

Regel: Jeder Baustein bekommt zwei Bedingungen, die der Bauer an ein Feld
oder eine Variable der Maske bindet:

- **Sichtbar wenn** (Feld = Wert, Feld ≠ leer). Trifft es nicht zu,
  verschwindet der Baustein. Innerhalb eines Bereichs bleibt sein Platz
  leer (die Lage der Nachbarn ändert sich nicht); ein ganzer Bereich gibt
  seine Zeilen frei, wie bei „Ausblenden wenn leer“.
- **Änderbar wenn**. Trifft es nicht zu, wird ein Feld zum Lesefeld, eine
  Tabellenzelle zur Anzeige, ein Knopf verschwindet oder wird gesperrt
  (**D6**: verschwinden oder gesperrt zeigen? Vorschlag: Knöpfe
  verschwinden, Felder werden Lesefelder, damit der Anwender die Werte
  weiter sieht).

Technisch ist das ein Steckteil „Sichtbarkeit“, das vor dem Zeichnen
ausgewertet wird, und ein Feld in der exportierten Maske, das SoftEngine
beim Start füllt. Welche Variable das ist, entscheidet ein Echttest mit
einer Vorlage, die das Lexikon als Belegstelle nennt.

### 2.7 Kleine Bildschirme

Heute: Das Blatt ist so groß wie der SoftEngine-Rahmen (1861 × 886,
`src/core/block/frameFit.ts`). Ist das Fenster kleiner, wird die ganze Maske
verkleinert, aber höchstens auf 85 %. Darunter wird abgeschnitten. Die Tafel
scrollt ab etwa fünf Spalten seitlich (232 Punkte je Spalte), ohne Hinweis.

**D7** Drei Wege, einer ist zu wählen:

- (A) **Bleibt so, plus Vorrang.** Verkleinern bis 85 %; Spalten einer
  Tabelle und Plätze einer Karte bekommen einen Rang (1 wichtig, 3
  verzichtbar); bei Platzmangel fallen Rang 3, dann Rang 2 weg. Wenig Umbau.
- (B) **Umbruch der Bereiche.** Unter einer Breite (etwa 1200) stapeln sich
  die Bereiche untereinander, jeder so breit wie das Blatt; innen bleibt
  das Raster. Tafel-Spalten werden untereinander gestapelt, die erste offen,
  die anderen als Kopfzeile zum Aufklappen. Mittlerer Umbau, braucht das
  Steckteil „Zeilen zeigen“.
- (C) **Zwei Masken.** Der Bauer baut eine breite und eine schmale Maske;
  die Maske wählt beim Start. Kein Umbau an den Bausteinen, doppelte Arbeit
  je Maske.

Vorschlag: A sofort (es ist fast nur Konfiguration), B als zweiter Schritt,
wenn Masken auf Tablets laufen sollen.

### 2.8 Architektur: Steckteile statt Eigenbau

`BAUPLAN.md` nennt die Steckteile, die aus Doppelungen entstehen
(Ketten starten, Zeilen laden, Zeile wählen, Kartenplätze, Drücken,
Listen bearbeiten). Dieser Plan ergänzt die, die der Leitgedanke braucht.
Ein Baustein ist dann: eine Erklärung (Eigenschaften, Fähigkeiten, Tasten,
Zustände) plus ein Zeichenteil je Zustand plus Steckteile.

| Steckteil | Aufgabe | Heute |
|---|---|---|
| Zeilen zeigen | meldet, wie viele Rasterzeilen ein Baustein gerade braucht: beim Klappen eines Bereichs, bei Karten, Steckbrief und Listen und bei „Ausblenden wenn leer“; das Blatt öffnet und schließt Zeilen, die Bausteine darunter rücken. Ein Bereich mit Feldern meldet immer seine feste Höhe | nur für eingeklappte Bereiche (`area/fold.ts`), Höhe nur im Editor gemessen |
| Leerer Zustand | die sechs Zustände aus 2.2 und ihr Satz, einmal gezeichnet | jeder Baustein anders oder gar nicht |
| Tasten | die Tastenliste des Bausteins; speist Editor, F1-Hilfe und Tastenzeile | nur im Aufteilen-Fenster sichtbar |
| Sichtbarkeit | „Sichtbar wenn“, „Änderbar wenn“ | fehlt |
| Prüfung | Pflicht, Mindest- und Höchstwert, Muster, Länge; geprüft beim Verlassen und beim Hauptknopf | nur Pflicht, nur beim Ausführen einer Kette |
| Eine Suche | ein Textvergleich für Tabelle, Tafel, Vorschläge: Groß und Klein egal, ü wie u, ß wie ss, Wörter in beliebiger Reihenfolge | zwei Suchen mit verschiedenem Ergebnis (`parts/cellSearch.ts` gegen `runtime/searchText.ts`) |
| Gebundener Wert | liest ein Feld der gewählten Zeile, kennt die sechs Zustände | dreimal ähnlich (Feld, Text, Bild) |
| Drücken | Klick, Enter, Leertaste starten die Kette; Ring, Haken, Fehler am Ort | dreimal ähnlich (Knopf, Text, Bild), dazu vier Enter/Leertaste-Fassungen |
| Kartenvorlage | Avatar, Titel, Untertitel, Zeilen, Ecke, Fuß; zeigt nur gebundene Plätze mit Wert | `parts/card.ts`, von Tafel und Datenliste benutzt, aber mit verschiedenen Plätzen |
| Avatar | Kreis mit Bild, Anfangsbuchstabe oder Fachsymbol | in `parts/card.ts`, das Bild kann ihn nicht |
| Listenmotor | Zeilen, Auswahl, Suche, Sortieren, Spalten, Tasten | `blocks/list/`, gut; Datenliste und Tafel benutzen ihn nicht |
| Nachschlagen | Vorschläge und Fenster | `blocks/lookup/`, gut, von Feld und Erfassung benutzt |
| Fachpaket | Tierarten, Fachsymbole, „Belegt/Frei“, „Wartet seit“ | im allgemeinen Teil (`parts/animal.ts`, `look/symbol.ts`, `kanban/`) |

Regeln dazu:

- Ein Baustein zeichnet seine Zustände in getrennten kleinen Funktionen
  („leer“, „lädt“, „Wert da“), nicht in einer großen mit Verzweigungen.
- Was zwei Bausteine gleich tun, ist ein Steckteil. Der dritte Eigenbau
  wird im Prüflauf (`npm run check`) als Fehler gemeldet, sobald die
  Steckteile da sind (Regel in eslint, wie `BAUPLAN.md` sie für Importe
  vorsieht).
- Die exportierte Maske bleibt lesbar für alte Masken: Tag-Namen
  (`ff-…`), Attribute (`data-ff-…`), das SEVariablen-Blatt und das
  Maskenformat mit seinen Versionsstufen ändern sich nicht (`BAUPLAN.md`,
  „Was nicht kaputtgehen darf“).

### 2.9 Fachpaket

Was aus der Tierarztpraxis stammt, wandert in ein Paket, das eine Maske
einschaltet („Fachpaket: Tierarztpraxis“): Tierarten mit Farben und
Umrissen (`parts/animal.ts`, Farbwerte in `mask.css`), die Symbole Tier,
Impfung, Medikament, Behandlung, Arzt, die Begriffe „Belegt/Frei“ und
„Wartet seit“ und die Zimmer (Plätze) der Tafel, falls **D14** sie als
Fachsache einstuft. Der allgemeine Teil kennt dann nur Avatar mit Bild oder
Buchstabe, allgemeine Symbole und Spalten ohne Plätze. Der Export nimmt das
Paket nur mit, wenn die Maske es einschaltet (heute schon teils so: die
Tierfarben stehen nur unter `ff-datalist, ff-kanban`).

### 2.10 Idiotensicher beim Bauen

Der Anwender kann nur so wenig falsch machen, wie der Bauer ihm lässt.
Darum prüft der Editor beim Bauen und beim Export:

- Ein Knopf ohne Kette, eine Liste ohne Quelle, ein Feld ohne Feld, eine
  Karte ohne Titel, ein Dialog, den keine Kette öffnet, zwei Hauptknöpfe in
  einem Bereich, zwei Tagwahlen in einer Maske: gelbes Dreieck am Baustein
  auf der Fläche und ein Satz im Inspektor. Der Export zählt sie auf und
  fragt, ob er trotzdem soll. Heute gibt es eine kleine Prüfung
  (`src/export/validator.ts`), die ausgebaut wird.
- Eigenschaften, die nur in einem Zustand gelten, sind nur dort zu sehen
  (gibt es: `when`-Bedingungen). Eigenschaften, die der Bauer fast nie
  braucht (Fensterbreite, Raster), stehen in einem eingeklappten
  „Weiteres“.
- Der Bauer sieht auf der Fläche, was der Anwender sieht, in jedem Zustand:
  ein Umschalter „Vorschau: mit Daten / leer / lädt / ohne Recht“ zeichnet
  den Baustein im gewählten Zustand (Editorarbeit, Phase 4 in `BAUPLAN.md`).

Tasten des Bauers heute (`src/editor/state/useKeyboardShortcuts.ts`):
Pfeile verschieben den Baustein, Shift+Pfeile ändern die Größe, Entf oder
Rücktaste löscht, Esc wählt ab, Strg+Z und Strg+Y, Strg+D dupliziert,
Strg+S speichert. Das bleibt; dazu kommt Strg+Pfeil für „an die nächste
Kante springen“ und eine Tastenhilfe mit F1 wie in der Maske.

### 2.11 Kurzliste für den Abgabe-Dialog

Die andere Sitzung baut den Dialog „Abgabe Menge“ neu. Was sie aus diesem
Plan mitnimmt, in zehn Sätzen:

1. Ein Dialog hat Titel, Inhalt und einen Fuß mit höchstens einem
   Hauptknopf rechts, Nebenknöpfen links davon und Abbrechen.
2. Felder bleiben an ihrem Platz. Ein leerer Wert zeigt Beschriftung und
   Strich, keinen leeren Kasten. Ein ganzer Block, den die Lieferung nicht
   hat (zum Beispiel die Chargen eines Artikels ohne Chargen), wird als
   eigener Bereich mit „Ausblenden wenn leer“ gebaut und fehlt dann samt
   Platz.
3. Keine Radioknöpfe, keine Textknopfleiste: Entweder-oder ist ein
   Umschalter mit zwei bis drei Worten; Aktionen sind Knöpfe mit Rolle.
4. Werte, die SoftEngine liefert und der Anwender nicht ändern darf, sind
   Lesefelder (Kasten, zweite Tinte), keine gesperrten Eingabefelder.
5. Enter führt durch die Felder und am Ende zum Hauptknopf; Esc fragt,
   wenn etwas Ungespeichertes da ist.
6. Ein Fehler steht am Feld (rote Unterkante, das Wort in der
   Beschriftungszeile) und einmal in der Leiste unten; der getippte Wert
   bleibt.
7. Pflichtfelder tragen den Stern an der Beschriftung und werden erst beim
   Verlassen oder am Hauptknopf rot, nicht vorher.
8. Berechnete Werte (Menge aus Tiere × Tage × Dosis) stehen als Lesefeld
   mit sichtbarer Herkunft („= 31 × 1 × 2 ml“), nie als tippbares Feld, das
   still überschrieben wird.
9. Die Liste der bisherigen Abgaben ist eine Tabelle mit Suchzeile, Rang je
   Spalte und stillem Satz, wenn sie leer ist; nicht 585 Zeilen mit
   Blättern.
10. Alles, was der Anwender tut, kann er mit der Tastatur tun; die Tasten
    stehen bei F1.

---

## 3. Die Bausteine

Je Baustein: Ist-Zustand in zwei Sätzen, Schwächen, Neukonzept (Aussehen,
Bedienung, Verhalten bei fehlenden Daten, Architektur), offene
Entscheidungen. „Quelle“ nennt die Dateien, aus denen der Ist-Zustand
gelesen wurde.

### 3.1 Bereich

Quelle: `src/blocks/area/` (Area.ts, areaStyle.ts, fold.ts, properties.ts).

**Ist.** Eine Karte mit fünf Formen (Frei, Kasten, Kopfzeile, Klappbar,
Band), die andere Bausteine auf einem eigenen 48-Spalten-Raster trägt und
in der Maske alles abschneidet, was über ihren Rand reicht. Eingeklappt
behält sie nur ihren Kopf (36 Punkte), die freigewordenen Rasterzeilen
schließen sich, und alles darunter rückt nach.

**Schwächen.**

- Ein Bereich, dessen Inhalt leer ist, zeigt leere graue Kästen und einen
  gestrichelten Bildkasten, als fehlte etwas, und kein Wort sagt, warum.
- Die Höhe ist fest. Wächst der Inhalt (längerer Text, mehr Zeilen), wird er
  still abgeschnitten.
- Der Titel ist fester Text; er kann keinen Wert tragen („Kunde 4711“,
  „Positionen · 12“).
- Ob ein Bereich eingeklappt ist, merkt sich die Maske nicht.
- Fünf Formen, von denen „Band“ nur „Texte mittig“ heißt und „Kasten“ und
  „Kopfzeile“ sich nur durch den Kopf unterscheiden.
- Kein Recht, keine Bedingung.

**Neukonzept.**

- *Aussehen.* Drei Arten: Frei (nur Raster), Karte, Karte mit Kopf. Der
  Kopf trägt links den Titel (14, halbfett, Akzent, wie heute) und rechts
  wahlweise einen Wert aus einem Feld oder die Zahl der Einträge der Liste
  im Bereich. Klappbar ist ein Schalter, kein eigener Typ.
- *Bedienung.* Enter oder Leertaste auf dem Kopf klappt (wie heute). Die
  Maske merkt sich den Klappzustand je Anwender und Maske (so wie heute die
  Spaltenwahl der Tabelle in `list/operatorState.ts`).
- *Verhalten bei fehlenden Daten.* Lage und Größe bleiben fest; die feste
  Lage ist der Anker des Anwenders. Ein leerer Wert im Bereich zeigt seine
  Beschriftung in schwacher Tinte und einen Strich, keinen leeren Kasten.
  Nichts gewählt, keine Daten, Fehler: ein stiller Satz oben im Körper, die
  Felder darunter bleiben als stille Beschriftungen stehen. Lädt: Lauflinie
  und an jeder Stelle ein schwacher Balken. Nur mit der Einstellung
  „Ausblenden wenn leer“ verschwindet der Bereich samt Platz, für Blöcke,
  die es bei diesem Datensatz sachlich nicht gibt, oder bei fehlendem
  Recht; was darunter liegt, rückt dann nach. Eine Liste im Bereich darf
  wachsen, wenn der Bauer „Höhe: nach Inhalt“ setzt (Vorgabe aus).
  (So steht es in `entwuerfe/bereich-heute-neu.html` zum Vergleich.)
- *Architektur.* Der Bereich ist der einzige Behälter. Der Dialog benutzt
  ihn innen. `fold.ts` wird zum allgemeinen „Zeilen zeigen“ und zieht aus
  dem Bereich in die Grundlage (`core/block/`).

**Offen.** **D2** ist entschieden (26.10.2026): Lage und Größe fest,
Leeres still, Verschwinden nur mit „Ausblenden wenn leer“. Neu **D2a**:
Nimmt die Einstellung den Bereich ganz weg (die Nachbarn rücken nach) oder
zieht sie ihn auf den Kopf zusammen? **D8** Soll „Band“ bleiben, oder
reicht „Texte mittig“ als Schalter am Bereich?

### 3.2 Trennlinie

Quelle: `src/blocks/divider/`.

**Ist.** Eine Haarlinie, waagerecht oder senkrecht, 1 bis 8 Punkte dick,
wahlweise mit einem Wort in der Mitte. Sie nimmt eine Rasterzeile.

**Schwächen.**

- Dicken bis 8 Punkte laden zu schweren Linien ein; die Maske kennt sonst
  nur 1 Punkt.
- Zwischen zwei Karten, die schon Haarlinien tragen, verdoppelt sie die
  Linie.
- Verschwindet der Baustein über oder unter ihr, bleibt sie als Linie am
  Rand oder doppelt stehen.
- Die Linie mit Wort ist in Wahrheit eine Zwischenüberschrift.

**Neukonzept.**

- *Aussehen.* Nur noch 1 Punkt in der Linienfarbe. Mit Wort: das Wort 12
  Punkte halbfett in der zweiten Tinte links, die Linie danach (so sieht
  eine Zwischenüberschrift in Windows aus); ohne Wort: Linie allein.
- *Bedienung.* Keine.
- *Verhalten bei fehlenden Daten.* Eine Trennlinie steht nie als Erstes,
  nie als Letztes und nie neben einer anderen Trennlinie. Verschwinden die
  Nachbarn, verschwindet sie mit.
- *Architektur.* Bleibt ein Baustein, aber ohne eigenen Stil-Spielraum.
  Die senkrechte Linie entfällt (**D9**), weil das Raster zeilenweise
  denkt und zwei Bereiche nebeneinander ihre eigene Kante haben.

**Offen.** **D9** Senkrechte Linie und Dicke behalten?

### 3.3 Knopf

Quelle: `src/blocks/button/`, `src/blocks/look/look.ts`.

**Ist.** Ein Knopf mit Beschriftung, Farbe (fünf Töne), Art (gefüllt oder
Rand) und Größe, der bei Klick seine Kette startet, dabei den Ring zeigt und
gesperrt ist, danach 2 Sekunden den Haken. Hängt die Kette an einer
Erfassung, zählt er in Klammern die noch nicht gespeicherten Zeilen
(„Speichern (3)“).

**Schwächen.**

- Jeder Knopf kann blau und gefüllt sein; es gibt keinen Rang. Eine Maske
  mit vier blauen Knöpfen sagt dem Anwender nicht, welcher der wichtige ist.
- Kein Symbol, keine Taste, kein sichtbarer Kurzbefehl.
- Ein Knopf ohne Kette steht in der Maske und tut nichts.
- Hat die Erfassung nichts zu speichern, ist der Knopf trotzdem aktiv.
- Die Zählung „(3)“ sieht nach Fehler aus.
- Vorgabetext „Schaltfläche“.
- Kein Recht.

**Neukonzept.**

- *Aussehen.* Drei Rollen statt Farbe mal Art: **Hauptknopf** (Akzent,
  gefüllt, halbfett; höchstens einer je Bereich oder Dialog),
  **Nebenknopf** (weiß mit Haarlinie), **Gefahr** (rot, nur gefüllt in einer
  Rückfrage, sonst roter Text mit Rand). Wahlweise ein Symbol links. Offene
  Zeilen als kleine Marke rechts im Knopf statt „(3)“. Höhen 28 und 44.
- *Bedienung.* Enter und Leertaste wie im Browser. Ein Knopf kann eine
  Taste tragen (F9, Strg+Enter), die rechts klein im Knopf steht
  („Speichern  F9“). Der Hauptknopf eines Bereichs läuft, wenn Enter im
  letzten Feld des Bereichs gedrückt wird (**D3**).
- *Verhalten bei fehlenden Daten.* Keine Kette: nicht exportiert, der
  Editor warnt. Nichts zu tun (keine offene Zeile, keine gewählte Zeile, die
  die Kette braucht): gesperrt mit Hinweis beim Zeigen „Nichts zu
  speichern“. Fehlt das Recht: weg (**D6**). Beim Schreiben: Ring, Knopf
  behält Breite. Danach: Haken 2 s. Fehler: rote Unterkante, Leiste unten,
  Knopf wieder aktiv.
- *Architektur.* Das Steckteil „Drücken“ trägt Klick, Enter, Leertaste,
  Ring, Haken und Fehler; Text und Bild benutzen dasselbe. Der Knopf hat
  einen Zustand (bereit, gesperrt, läuft, erledigt, gescheitert) und je
  Zustand ein Zeichenteil.

**Offen.** **D6** Fehlendes Recht: Knopf weg oder gesperrt sichtbar?
**D10** Darf der Editor einen zweiten Hauptknopf im selben Bereich
verbieten, oder nur warnen?

### 3.4 Feld

Quelle: `src/blocks/formfield/` (FormField.ts, properties.ts,
formFieldStyle.ts, valueBinding.ts), `src/runtime/nextField.ts`.

**Ist.** Ein Eingabefeld mit Beschriftung darüber und Wert im Kasten, in
sieben Typen (Text, Zahl, Datum, Uhrzeit, Auswahl, Ankreuzfeld, Suche), dazu
„Nachschlagen“ mit Vorschlägen und Fenster. Es liest seinen Wert aus der
gewählten Zeile einer Quelle, schreibt Änderungen zurück und schickt sie als
Kette „Wert geändert“ nacheinander ab; Enter springt zum nächsten Feld in
Leserichtung.

**Schwächen.**

- Sieben Typen in einem Baustein, davon einer („Suche“) etwas ganz anderes:
  er filtert die Tafeln der Maske, hält keinen Wert.
- Die Auswahl (Typ „Auswahl“) nimmt ihre Einträge aus einem Text mit Kommas,
  nicht aus einer Quelle, und kennt keinen Unterschied zwischen Anzeige und
  gespeichertem Wert.
- Kein Lesefeld. Ein Wert, den der Anwender nur sehen soll, ist entweder ein
  Eingabefeld (das er ändern kann) oder ein Text mit Kasten (ein anderer
  Baustein).
- Keine Prüfung außer „Pflicht“, und die greift erst, wenn eine Kette läuft.
  Kein Mindest- oder Höchstwert, keine Länge, keine Einheit (ml, kg, €).
- Lehnt SoftEngine ab, springt das Feld auf den alten Wert zurück; die
  Leiste meldet, der getippte Wert ist weg.
- Beim Nachschlagen geht ein getippter, nicht bestätigter Text beim
  Verlassen ohne Wort verloren.
- Enter sucht das nächste Feld nach seiner Lage auf dem Bildschirm (Zeilen,
  die sich um weniger als 8 Punkte unterscheiden, gelten als eine). Das
  klappt, bis zwei Bereiche nebeneinander stehen.
- Gebunden an eine Quelle ohne gewählte Zeile: leerer Kasten, bedienbar, der
  Wert geht nirgendwohin.
- Fehlermeldung nur in der Leiste unten, nicht am Feld.
- Kein Hilfetext, kein Platzhalter.

**Neukonzept.**

- *Aussehen.* Beschriftung 12 Punkte zweite Tinte, Kasten 28 Punkte, links
  wahlweise Symbol, rechts das Zeichen des Typs (Kalender, Uhr, Pfeil) oder
  die Einheit („ml“, „€“) in der zweiten Tinte. Pflicht: Stern hinter der
  Beschriftung. Fehler: rote Unterkante und das Wort in der
  Beschriftungszeile („Menge · Pflicht“, „Menge · nicht gespeichert, Enter
  wiederholt“), damit das Feld seine 44 Punkte behält und nichts rutscht
  (siehe `entwuerfe/feld-heute-neu.html`). Lesefeld:
  grauer Kasten, zweite Tinte, kein Zeiger (das ist heute der Text mit
  „Kasten“; er wandert hierher, Abschnitt 3.9).
- *Bedienung.* Enter: nächstes Feld, im letzten der Hauptknopf (**D3**).
  Esc: zurück auf den Wert beim Betreten. ↑↓ bei Zahl: Schritt um 1 (bei
  Betrag um 0,01 mit Strg). Auswahl: Tippen springt zum Eintrag, Alt+↓
  öffnet. Nachschlagen: wie Abschnitt 3.14. Ankreuzfeld: Leertaste, Klick
  auf den Text (wie heute).
- *Verhalten bei fehlenden Daten.* Folgt der Auswahl und nichts gewählt:
  Feld gesperrt, Platzhalter „Erst Zeile wählen“. Quelle lädt: Feld
  gesperrt, Lauflinie. Absage: Wert bleibt, rote Unterkante, in der
  Beschriftungszeile „nicht gespeichert, Enter wiederholt“, Leiste unten.
  Pflicht und leer:
  erst beim Verlassen oder am Hauptknopf rot, nie beim Betreten. Fehlendes
  Recht: wird Lesefeld.
- *Architektur.* Der Baustein ist eine Hülle (Beschriftung, Kasten, Zeichen,
  Hinweis, Prüfung) mit einem Steckteil je Typ (Text, Zahl, Betrag, Datum,
  Uhrzeit, Ja/Nein, Auswahl aus Quelle, Nachschlagen). „Suche“ wird ein
  eigener Baustein **Suchfeld** (Abschnitt 3.12). Der Wert kommt über das
  Steckteil „Gebundener Wert“, Prüfungen über „Prüfung“, die Reihenfolge
  für Enter aus dem Baum der Maske (Bereich für Bereich, Zeile für Zeile),
  nicht aus Bildschirmkoordinaten.

**Offen.** **D11** Soll die Auswahl ihre Einträge aus einer Quelle nehmen
(Anzeige und Wert getrennt) oder weiter aus einem Text? **D12** Fehlerwort
in der Beschriftungszeile (Höhe bleibt), ein Satz unter dem Feld (nimmt
Platz, rutscht) oder nur rote Kante plus Leiste unten?

### 3.5 Erfassung

Quelle: `src/blocks/capture/` (19 Dateien, 3.386 Zeilen), darunter
`ledger/captureRow.ts`, `ledger/bookedRows.ts`, `ledger/capturedRows.ts`,
`ledger/split.ts`, `splitList.ts`, `controls.ts`, `row.ts`, `body.ts`,
`workingRow.ts`.

**Ist.** Eine Tabelle, an deren Fuß eine Tippzeile klebt, in der der
Anwender Zelle für Zelle eine neue Zeile eingibt, mit Vorschlägen aus
verbundenen Quellen, Berechnungen zwischen Spalten, Pflichtspalten, einem
Fenster zum Aufteilen einer Menge auf Chargen und einer Unterzeile (graue
zweite Zeile je Datensatz). Erfasste Zeilen sammeln sich über der Tippzeile,
gebuchte Zeilen darüber lassen sich direkt in der Zelle ändern, und jede
Zeile trägt einen von sechs Zuständen (gebucht, erfasst, geändert, schreibt,
geschrieben, Fehler).

**Schwächen.**

- Der größte und verwickeltste Baustein; `BAUPLAN.md` zerlegt ihn in Phase
  3. Das bleibt richtig.
- Sechs Zustände, die sich nur durch Tönungen unterscheiden (grau, ocker,
  rot, blinkend, grau geschrieben). Der Anwender kann sie nicht benennen.
- Die Tasten sind reich, aber unsichtbar. Nur das Aufteilen-Fenster zeigt
  eine Tastenzeile.
- Eine Pflichtspalte zeigt als Platzhalter ihren Titel; das sieht aus wie
  der Kopf darüber und nicht wie „hier fehlt etwas“.
- Das Kreuz zum Wegnehmen einer erfassten Zeile erscheint erst beim
  Überfahren mit der Maus. Eine weggenommene Zeile ist weg, kein Zurück.
- Zurückholen einer erfassten Zeile zum Ändern nur per Doppelklick.
- Fehlgeschlagene Zeilen bleiben rot, aber ohne Satz an der Zeile und ohne
  „Erneut“.
- Bei null gebuchten Zeilen zeichnet sie leere Linien bis zum Fuß; kein
  Satz.
- Die Taste Einfg gilt maskenweit; steht der Fokus in keiner Erfassung,
  gewinnt bei zweien die erste im Dokument, ohne dass der Anwender das
  sieht.
- Der Vertrag mit dem Tabellenmotor läuft über Klassennamen (`.row`,
  `.body`), siehe `BAUPLAN.md` Nr. 12.

**Neukonzept.**

- *Aussehen.* Die Tabelle wie in 3.6. Die Tippzeile auf dem weichen Akzent
  mit Akzentbalken links (wie heute). Vier Zustände statt sechs, jeder mit
  Zeichen *und* Wort: **erfasst** (neutrale Tönung, Punkt links, bleibt bis
  zum Speichern), **schreibt** (Ring in der letzten Zelle), **gespeichert**
  (Haken 2 Sekunden, dann wie gebucht), **Fehler** (roter Balken, Satz in
  der Zeile, Knopf „Erneut“). „Geändert“ ist eine gebuchte Zeile mit ockerer
  Zelle, nicht ein Zeilenzustand. Pflichtspalte: Stern im Kopf, leere
  Pflichtzelle zeigt „…“ in der schwachen Tinte, wird erst beim Erfassen
  rot. Die Tastenzeile unter der Tabelle, solange die Tippzeile den Fokus
  hat: „Tab nächste Zelle · Enter Zeile erfassen · F5 nachschlagen · Esc
  leeren · Entf Zeile weg · Einfg neue Zeile“. Das Kreuz steht immer, in der
  schwachen Tinte; weggenommene Zeilen lassen sich mit Strg+Z zurückholen,
  solange nichts gespeichert wurde.
- *Bedienung.* Wie heute, dazu: Enter auf einer erfassten Zeile holt sie
  zum Ändern zurück (statt Doppelklick); Entf fragt mit der kleinen
  Rückfrage, die die Tabelle schon hat; Einfg gilt für die Erfassung, in
  der der Fokus steht, sonst für die erste sichtbare.
- *Verhalten bei fehlenden Daten.* Quelle lädt: Lauflinie, Tippzeile
  gesperrt mit „lädt …“. Verbundene Quelle fehlt noch: Zelle sagt „<Quelle>
  lädt …“ (gibt es, bleibt). Null gebuchte Zeilen: ein stiller Satz „Noch
  keine Positionen“ über der Tippzeile statt leerer Linien (**D1**).
  Kein Vorschlag zum Getippten: Zelle hält die Zeile zurück mit roter
  Unterkante und dem Satz „‚xy‘ nicht gefunden – F5 sucht“, der Text bleibt
  stehen. Absage beim Speichern: Zeile rot mit Satz und „Erneut“, die
  anderen Zeilen gehen weiter.
- *Architektur.* Wie `BAUPLAN.md` Phase 3: Fassade weg, Tippzeile,
  Erfasste, Gebuchte, Aufteilen und Status als eigene Teile, der Vertrag
  mit dem Tabellenmotor über benannte Teile (`part`-Attribute) statt
  Klassen. Die Erfassung ist dann Tabelle plus Steckteil „Hauptbuch“.

**Offen.** **D13** Tippzeile unten (wie heute; neue Zeilen wachsen nach
oben) oder oben (wie Excel; neue Zeilen fallen darunter)? **D1** leere
Linien. **D19** Jede erfasste Zeile sofort speichern (ohne Hauptknopf)
oder gesammelt mit „Speichern (3)“?

### 3.6 Tabelle

Quelle: `src/blocks/table/`, `src/blocks/list/` (recordList.ts,
tableBody.ts, tableModel.ts, tableStyle.ts, columnPicker.ts, columnWidth.ts,
sorting.ts, pageSize.ts, rowActivation.ts, rowAsk.ts, viewChoices.ts,
sourceRows.ts), `src/blocks/parts/column.ts`.

**Ist.** Eine Liste mit bis zu 16 Spalten (Titel, Feld, Breite, Zahl oder
Betrag, Summe im Fuß, ausgeblendet), Suchzeile, Blättern oder Scrollen,
Sortieren per Klick auf den Kopf, Spaltenwahl per Rechtsklick, Breiten
ziehen, Zeile wählen, Doppelklick und F4 als Ketten. Sortierung und
Spaltenwahl merkt sie sich je Anwender im Browser.

**Schwächen.**

- Leer ist stumm. Null Zeilen: Kopf über leeren Linien, kein Wort (der Fuß
  mit „Keine Datensätze“ wird bei leer nicht gezeichnet, `tableBody.ts`,
  `tableFoot`). Kein Unterschied zwischen „lädt“, „nichts gewählt“, „keine
  Daten“ und „keine Spalte angebunden“.
- Sortierbar und Spaltenwahl sind unsichtbar: kein Zeichen am Kopf, bis
  sortiert ist; Spalten nur per Rechtsklick.
- Blättern ist Vorgabe, mit winzigen ‹ › Knöpfen und „Seite 1 von 3“.
- Spalten kennen nur Text, Zahl, Betrag. Datum wird erraten, Ja/Nein
  gibt es nicht, einen Status-Chip gibt es nicht.
- Abgeschnittener Text hat keine Sprechblase mit dem ganzen Wert.
- Kein Rang je Spalte für schmale Bildschirme.
- Keine Mehrfachauswahl, keine Zeilennummer, keine feste erste Spalte.
- Der Sortierpfeil ist ein Textzeichen („▲“).

**Neukonzept.**

- *Aussehen.* Kopf 12 Punkte halbfett auf dem weichen Akzent, Zeilen 36
  Punkte, Haarlinien zwischen den Zeilen, gewählte Zeile mit Balken (alles
  wie heute, das ist gut). Im Kopf rechts ein kleines „⋯“, das die
  Spaltenwahl öffnet (Rechtsklick bleibt). Beim Überfahren eines Kopfes
  erscheint ein schwacher Pfeil, wenn die Spalte sortierbar ist. Spalten
  bekommen einen Typ (Text, Zahl, Betrag, Datum, Ja/Nein, Status) und einen
  Rang (1 bis 3). Zu lange Werte enden mit „…“ und zeigen den ganzen Wert
  beim Zeigen. Der Fuß zeigt „12 von 240“ und die Summen; Blättern ist aus,
  der Körper scrollt mit festem Kopf (**D15**).
- *Bedienung.* ↑↓, Pos1, Ende, Bild↑↓, Enter öffnet (die Kette „Zeile
  doppelt geklickt“ wird „Zeile geöffnet“), Leertaste wählt, F4 Aktion,
  Tippen springt in die Suchzeile (**D4**). Spaltenwahl mit Tastatur über
  das „⋯“.
- *Verhalten bei fehlenden Daten.* Lädt: Lauflinie, Körper leer. Nichts
  gewählt: „Nichts gewählt“. Null Zeilen: „Keine Einträge“. Suche ohne
  Treffer: „Kein Treffer für ‚Müller‘“. Keine Spalte angebunden: nur im
  Editor sichtbar, Export verweigert. Gescheitert: Satz mit „Erneut laden“.
  Schmal: Spalten mit Rang 3 fallen zuerst weg (**D7** A).
- *Architektur.* Der Tabellenmotor (`blocks/list/`) bleibt der eine
  Listenmotor der Maske; Tabelle, Erfassung, Nachschlagefenster und künftig
  die Liste (3.7) benutzen ihn. Das Spaltenmodell (`parts/column.ts`)
  bekommt Typ und Rang. Die Zustände aus 2.2 zeichnet das Steckteil
  „Leerer Zustand“.

**Offen.** **D15** Blättern als Vorgabe behalten oder scrollen mit festem
Kopf? **D16** Mehr als 16 Spalten zulassen? **D1** leere Linien.

### 3.7 Liste (heute Datenliste)

Quelle: `src/blocks/datalist/`, `src/blocks/parts/card.ts`.

**Ist.** Eine Liste von Zeilen mit Avatar, Titel, Unterzeile und einem
Wert rechts, die eine Zeile wählen lässt oder nur zeigt. Sie zeichnet eine
Zeile mit derselben Vorlage wie die Karte der Tafel und zeigt in der Maske
nur Plätze mit Wert.

**Schwächen.**

- Überschneidet sich mit der Tabelle (einspaltig) und der Tafel (Karte).
- Keine Suchzeile, kein Sortieren, keine Gruppen, kein Satz bei leer.
- Tastatur nur Tab von Zeile zu Zeile, keine Pfeile.
- Zeilenhöhe fest 44 (48 mit Avatar); eine Zeile mit nur einem Titel ist
  so hoch wie eine mit drei Zeilen.
- Vier feste Plätze (Titel, Unterzeile, rechts, Avatar); die Tafel hat neun.

**Neukonzept.**

- *Aussehen.* Dieselbe Karte wie auf der Tafel, als Zeile gelegt: Avatar,
  Titel, Untertitel, bis zu zwei weitere Zeilen, rechts ein Wert oder Chip.
  Die Zeile ist so hoch wie ihr Inhalt (eine Zeile 36, zwei 44, drei 56).
  Wahlweise Gruppenzeilen nach einem Feld („Heute“, „Morgen“, oder der
  Anfangsbuchstabe), so wie die Tafel ihre Stundenlinien zeichnet.
- *Bedienung.* Wie die Tabelle: ↑↓, Enter öffnet, Leertaste wählt, Tippen
  sucht, Suchzeile wahlweise.
- *Verhalten bei fehlenden Daten.* Wie die Tabelle (Sätze). Ein Platz ohne
  Wert fehlt auf der Zeile (gibt es schon).
- *Architektur.* Die Liste ist der Tabellenmotor mit einer anderen
  Zeilenvorlage (Karte statt Zellen). Die Kartenvorlage ist ein Steckteil,
  das Liste und Tafel gleich benutzen, mit denselben Plätzen.

**Offen.** **D17** Eigener Baustein „Liste“ oder eine Darstellung der
Tabelle („Darstellung: Zellen / Karten“)? Vorschlag: Darstellung der
Tabelle; ein Baustein weniger, derselbe Motor.

### 3.8 Steckbrief (heute Werteliste)

Quelle: `src/blocks/valuelist/` (ValueList.ts, lines.ts, valueListStyle.ts).

**Ist.** Zeilen aus Beschriftung links und Wert rechts, dazu Summenzeilen
(Strich darüber, Wert groß im Akzent) und Zeilen, die bei Klick eine Kette
starten (Pfeil rechts). Die Werte kommen aus der ersten passenden Zeile der
Quelle oder aus der gewählten Zeile.

**Schwächen.**

- Zeilen mit leerem Wert bleiben stehen (Beschriftung und Leere).
- Keine Einheit, kein Symbol je Zeile, kein Datumsformat (nur Text, Zahl,
  Betrag).
- Nur untereinander; ein zweispaltiger Steckbrief geht nicht. Dafür hat der
  Text einen versteckten „Paare“-Modus (`text/Text.ts`, `pairsTpl`), der
  dasselbe tut.
- Bis zu 40 Klickketten je Liste (`entryEventKeys('lineClick', 40)`),
  jede als eigener Eintrag im Inspektor.
- Nichts gewählt: die Werte sind leer, der Baustein steht.

**Neukonzept.**

- *Aussehen.* Beschriftung 12 zweite Tinte, Wert 13 Tinte, Zahlen rechts
  bündig; je Zeile wahlweise Symbol links und Einheit rechts; Typ Text,
  Zahl, Betrag, Datum, Ja/Nein (Chip). Zwei Anordnungen: Liste (wie heute)
  und Raster (Paare nebeneinander, zwei oder drei je Zeile; ersetzt den
  Paare-Modus des Textes). Summenzeile wie heute.
- *Bedienung.* ↑↓ zwischen Zeilen mit Kette, Enter startet sie; ohne Kette
  keine Tasten.
- *Verhalten bei fehlenden Daten.* Eine Zeile mit leerem Wert verschwindet
  („Immer zeigen“ je Zeile möglich). Sind alle leer oder ist nichts
  gewählt, zeigt der Steckbrief an seiner Stelle eine Zeile „Nichts
  gewählt“; verschwinden kann er nur mit „Ausblenden wenn leer“, wie der
  Bereich (**D2**).
- *Architektur.* Zeilen über „Gebundener Wert“, Höhe über „Zeilen zeigen“.
  Der Paare-Modus des Textes wandert hierher.

**Offen.** Name „Steckbrief“ (**D5**).

### 3.9 Text

Quelle: `src/blocks/text/` (Text.ts, properties.ts, textStyle.ts,
fieldValues.ts), `src/core/block/fieldPattern.ts`.

**Ist.** Ein Text mit Größe, Ausrichtung, Symbol, Rahmen (keiner, Linie
unten, Kasten), wahlweise Beschriftung darüber, gebunden an ein oder mehrere
Felder, die er als Wörter mit Lücken einwebt („Angelegt von {Name} am {Datum
als Datum}“), mit Ersatzwort bei leer, Werte-Ersetzung („A=Auftrag“),
Berechnung und Klickkette. Er zeigt daneben Paare (Name über Wert) und
Lesefelder (Kasten).

**Schwächen.**

- Zu viele Rollen in einem Baustein: Überschrift, Fließtext, Lesefeld,
  Paare, berechneter Wert, Link.
- Leer zeigt er einen leeren Kasten oder ein Ersatzwort in voller Tinte;
  im Bereich wird er nicht still (keine schwache Beschriftung, kein
  Strich), auf einer Karte verschwindet er nicht.
- Ein Webtext mit leerer Lücke lässt die Wörter um die Lücke stehen
  („Tel  · Mobil 0171 …“ wird „· Mobil 0171“).
- „Fett“ heißt blau und halbfett; Größe heißt Zahl.
- Ein Text mit Kette ist nur am Unterstrich beim Überfahren als Link zu
  erkennen und hat keinen Fokus für die Tastatur.
- Der Paare-Modus entsteht durch einen Trenner „ · “ in der Bindung; der
  Bauer sieht nicht, warum.

**Neukonzept.**

- *Aussehen.* Vier Rollen, als eine Wahl am Baustein (**D18**):
  **Überschrift** (20 oder 14, Tinte oder Akzent), **Text** (13, mehrzeilig,
  Wörter mit Lücken), **Lesefeld** (Beschriftung über grauem Kasten, das
  heutige „Kasten“; wandert begrifflich zum Feld, Abschnitt 3.4, bleibt
  technisch hier), **Link** (13, Akzent, Unterstrich, Pfeil, fokussierbar).
  „Hervorgehoben“ macht halbfett in der Tinte; der Akzent ist der
  Überschrift vorbehalten.
- *Bedienung.* Link: Enter, Leertaste, Tab-Fokus. Sonst keine.
- *Verhalten bei fehlenden Daten.* Gebunden und leer: In einem Bereich
  bleibt der Text an seiner Stelle und zeigt die Beschriftung schwach mit
  einem Strich („Wenn leer: Wort zeigen“ je Baustein); auf einer Karte oder
  im Steckbrief verschwindet er samt Beschriftung. Webtext: Der Text
  zerfällt in Stücke
  (Wörter plus Lücke); ein Stück, dessen Lücke leer ist, fällt samt seinem
  Trenner weg („Tel {Tel} · Mobil {Mobil}“ ohne Mobil wird „Tel 030 …“).
  Das ist genau der Fall der Karte ohne E-Mail aus dem Auftrag. Berechnung
  ohne Zahlen: ein Strich.
- *Architektur.* Rollen als Zeichenteile; „Gebundener Wert“, „Drücken“
  (Link), „Zeilen zeigen“. `fieldPattern.ts` kennt Stücke statt nur
  Lücken. Paare gehen in den Steckbrief.

**Offen.** **D18** Ein Baustein mit vier Rollen oder vier Bausteine
(Überschrift, Text, Lesefeld, Link)? Vorschlag: ein Baustein mit Rolle, weil
der Bauer oft die Rolle wechselt, ohne die Bindung zu verlieren.

### 3.10 Bild

Quelle: `src/blocks/image/` (Picture.ts, address.ts, properties.ts,
pictureStyle.ts).

**Ist.** Ein Bild aus der Bildbibliothek von SoftEngine, von einem Pfad oder
einer Adresse, oder aus einem Feld (das Bild selbst oder eine Nummer, die
SoftEngine per Relation 1911, 1912 oder einer anderen in ein Bild wandelt),
eingepasst oder füllend, mit runden Ecken und Klickkette. Ohne Bild zeigt es
einen gestrichelten Kasten mit einem Satz („Kein Bild hinterlegt“, „Warte auf
SoftEngine …“, „Bild nicht gefunden“).

**Schwächen.**

- Der gestrichelte Kasten mit Satz steht in der Maske. Ein Patient ohne Foto
  bekommt eine Beschriftung seiner Lücke.
- Kein Avatar mit Anfangsbuchstabe oder Fachsymbol, obwohl die Karte das
  kann (`parts/card.ts`).
- Keine Größenrollen (Avatar, Vorschau, Banner); jedes Bild wird im Raster
  gezogen.
- Klick ohne Kette tut nichts; ein Foto lässt sich nicht groß ansehen.
- Beschreibung (Alternativtext) ist fester Text, nicht aus einem Feld.

**Neukonzept.**

- *Aussehen.* Drei Formen: **Foto** (Rechteck, einpassen oder füllen, runde
  Ecken 8), **Avatar** (Kreis 36 oder 56, Fallback Anfangsbuchstabe oder
  Fachsymbol aus einem zweiten Feld), **Marke** (Logo aus der Bibliothek,
  feste Größe). Beschreibung aus einem Feld möglich.
- *Bedienung.* Klick mit Kette wie heute. Klick ohne Kette auf ein Foto:
  groß im Dialog (**D20**). Fokus und Enter dasselbe.
- *Verhalten bei fehlenden Daten.* Avatar ohne Bild: Buchstabe oder Symbol,
  nie ein Satz. Foto ohne Bild: in einem Bereich bleibt die Stelle als
  stiller Platz ohne Rahmen und ohne Satz; auf einer Karte verschwindet es.
  Lädt: schwacher Grund ohne Worte. Nicht gefunden: kleines
  Zeichen, die Adresse nur beim Zeigen und im Editor. Die Sätze von heute
  bleiben im Editor, wo der Bauer sie braucht.
- *Architektur.* „Avatar“ als Steckteil, das Bild, Karte und Liste gleich
  benutzen. Die Herkunft (Bibliothek, Pfad, Feld, Relation) bleibt in
  `address.ts`. Ein kleiner Zwischenspeicher je Adresse, damit zehn Karten
  mit demselben Bild es einmal laden.

**Offen.** **D20** Foto ohne Kette groß ansehen?

### 3.11 Tagwahl (heute Datum)

Quelle: `src/blocks/date/`, `src/runtime/chosenDay.ts`.

**Ist.** Ein Tagwähler mit Pfeilen für Vortag und Folgetag, dem Datum fett
in der Mitte und dem Knopf „Heute“, der den einen gewählten Tag der Maske
setzt. Listen und Tafeln mit „Tag filtern nach“ zeigen dann nur Zeilen
dieses Tages; unter 274 Punkten Breite fällt „Heute“ weg.

**Schwächen.**

- Er ist ein Filter der ganzen Maske, sieht aber aus wie ein Feld und ist
  als Anzeige-Baustein eingeordnet.
- Welche Listen er filtert, sieht man nirgends; eine leere Liste sagt nicht
  „keine Termine am 26.10.“.
- Zwei Tagwahlen in einer Maske streiten sich; der Editor warnt nicht.
- Tasten: nur die des Browser-Datumsfeldes.
- Kein Wochen- oder Zeitraum-Modus.

**Neukonzept.**

- *Aussehen.* Eine Leiste: ‹ Montag, 26.10.2026 › Heute. Der Tag als Wort
  und Zahl, 14 halbfett. Beim Zeigen auf eine gefilterte Liste nennt deren
  leerer Satz den Tag („Keine Termine am 26.10.“).
- *Bedienung.* ← → Tag, Shift+← → Woche, T heute, Enter öffnet den
  Kalender, Esc schließt ihn.
- *Verhalten bei fehlenden Daten.* Keine Daten gibt es hier nicht; der
  Baustein ist Eingabe. Zweite Tagwahl: Editor warnt, Export verweigert.
- *Architektur.* Der gewählte Tag bleibt der eine Wert der Maske
  (`chosenDay.ts`); der Baustein ist nur sein Regler. Gehört in die
  Familie Eingabe. **D21** Soll daraus eine „Filterleiste“ werden, die
  Tagwahl, Suchfeld und künftige Filter (Mitarbeiter, Status) in einer Zeile
  trägt?

**Offen.** **D21**.

### 3.12 Suchfeld (neu, heute Feldtyp „Suche“)

Quelle: `src/blocks/formfield/` (Typ `search`), `src/runtime/searchText.ts`.

**Ist.** Ein Feld vom Typ Suche setzt den einen Suchtext der Maske; die
Tafeln zeigen nur Karten, die alle Wörter enthalten. Die Tabelle hat davon
unabhängig ihre eigene Suchzeile mit einer anderen Suche (mit ü = u).

**Schwächen.** Zwei Suchen, zwei Ergebnisse; das Suchfeld steckt im Feld;
welche Bausteine es filtert, ist unsichtbar.

**Neukonzept.** Eigener Baustein „Suchfeld“ mit Lupe links, Kreuz rechts
zum Leeren, Esc leert; eine Suche für alles (2.8); der Bauer wählt, welche
Listen und Tafeln es filtert (Vorgabe: alle auf derselben Seite). Eine
gefilterte Liste zeigt „12 von 240“ und bei null „Kein Treffer für ‚xy‘“.
Kein Wert, keine Kette. Siehe **D21**.

### 3.13 Tafel (Kanban)

Quelle: `src/blocks/kanban/` (Kanban.ts, board.ts, columns.ts, places.ts,
clock.ts, kanbanStyle.ts, properties.ts), `src/blocks/parts/card.ts`,
`src/blocks/parts/animal.ts`.

**Ist.** Spalten mit Ton, Punkt, Titel und Zahl, in denen Karten nach einem
Feld einsortiert sind; eine Spalte kann Plätze (Zimmer) mit „Belegt/Frei“
haben, nach Uhrzeit mit Stunden- und Jetzt-Linie ordnen, einen Knopf
(Weiter oder Aktion) tragen, in der Ecke Zeit, Wartezeit oder Betrag zeigen,
im Fuß den Platz oder eine Notiz, und beim Ankommen einer Karte eine
Meldung einblenden. Karten werden mit der Maus gezogen, der Zug wird als
Kette an SoftEngine geschickt und bei Absage zurückgenommen; ein Suchfeld
der Maske filtert die Karten.

**Schwächen.**

- Verschieben nur mit der Maus. Tastatur kann Karten nur wählen.
- Fachwissen der Praxis fest verdrahtet: Zimmer, „Belegt/Frei“, „Wartet
  seit“, Tierarten als Avatar.
- 13 Eigenschaften je Spalte und 9 Plätze je Karte: der Inspektor ist eine
  Wand; `nameFromParentField`, `onlyUnderSiblings` und Bedingungen helfen,
  reichen aber nicht.
- Ab fünf Spalten scrollt die Tafel seitlich ohne Hinweis (232 Punkte je
  Spalte, `kanbanStyle.ts`).
- Eine leere Spalte ist leer, außer der Bauer schreibt „Wenn leer“.
- Die Meldung beim Ankommen ist ein dunkler Kasten unten links für 2,4
  Sekunden; wer wegschaut, verpasst sie.
- Die Übersicht oben wiederholt die Spaltenköpfe.
- Keine Obergrenze je Spalte (WIP), kein Zuklappen einer Spalte.

Was gut ist und bleibt: Die Karte zeigt nur Plätze mit Wert; Zug mit
Rücknahme bei Absage; Stunden- und Jetzt-Linie; Ton je Spalte nur als Punkt
und Chip, nicht als Fläche.

**Neukonzept.**

- *Aussehen.* Karte wie heute (Vorlage für alle). Spaltenkopf: Punkt, Titel,
  Zahl, rechts ein kleiner Pfeil zum Zuklappen; zugeklappt ist die Spalte
  ein schmaler Streifen mit senkrechtem Titel und Zahl. Obergrenze je Spalte
  wahlweise („3 / 5“, bei Überschreitung ocker). Plätze (Zimmer) und
  „Belegt/Frei“ kommen aus dem Fachpaket (**D14**). Übersicht oben
  entfällt (**D22**), weil Kopf und Zahl dasselbe sagen.
- *Bedienung.* Tab in die Tafel, ↑↓ Karte, ← → Spalte, Leertaste nimmt
  die Karte auf (sie hebt sich wie beim Ziehen), ← → trägt sie, Enter legt
  ab, Esc bricht ab. Kontextmenü auf der Karte (Rechtsklick, Umschalt+F10)
  mit „Nach ‚Behandlung‘ verschieben“ für jede Spalte, auch für Touch.
  Knopf „Weiter“ wie heute.
- *Verhalten bei fehlenden Daten.* Lädt: Köpfe stehen, Körper mit
  Lauflinie. Null Karten: jede Spalte mit stiller Zeile „Keine“. Nichts
  gewählt in der Liste, der sie folgt: „Nichts gewählt“ einmal über der
  Tafel. Absage beim Zug: Karte gleitet zurück, trägt zehn Sekunden den
  roten Balken, Leiste unten meldet (heute ohne Balken). Fehlendes Recht:
  Karten nicht ziehbar, Knöpfe weg. Schmal: Spalten zugeklappt bis auf die
  erste, oder seitlich mit Schnappen (**D7**).
- *Architektur.* Tafel = Spalten und Züge (`board.ts`, bleibt) plus
  Kartenvorlage (Steckteil) plus Fachpaket. Eigenschaften in drei Gruppen:
  Spalten, Karte, Verhalten. Die Suche über das eine Steckteil.

**Offen.** **D14** Zimmer, „Belegt/Frei“, Wartezeit ins Fachpaket oder
allgemein als „Unterspalten“? **D22** Übersicht oben weg? **D7**.

### 3.14 Dialog (heute Popup)

Quelle: `src/blocks/popup/`, `src/blocks/dialog/DialogFrame.ts`.

**Ist.** Eine Seite der Maske, die als Fenster über dem Blatt erscheint
(Schleier, Kopf mit Titel und Kreuz, feste Breite und Höhe, Vorgabe
520 × 380), von einer Kette geöffnet und geschlossen, mit Esc schließbar; der
Fokus geht beim Öffnen auf das erste Element. Innen liegt ein eigenes Raster.

**Schwächen.**

- Feste Größe in Punkten, unabhängig vom Inhalt.
- Kein Fuß für Knöpfe; Hauptknopf und Abbrechen liegen, wo der Bauer sie
  hinsetzt.
- Esc schließt immer, auch über ungespeicherten Zeilen.
- Der Fokus kehrt nach dem Schließen nicht zum Auslöser zurück (weder in
  `Popup.ts` noch in den Schritten `popupOpen.ts` und `popupClose.ts`
  vorgesehen; das Nachschlagefenster macht es).
- Kein nicht-sperrendes Seitenblatt.

**Neukonzept.**

- *Aussehen.* Kopf (Titel, Kreuz), Inhalt (Bereich), Fuß (rechts
  Hauptknopf, links davon Nebenknöpfe, ganz links Abbrechen). Größen Klein,
  Mittel, Groß oder „nach Inhalt“ (Höhe folgt den Zeilen des Inhalts über
  „Zeilen zeigen“).
- *Bedienung.* Esc = Abbrechen; liegt etwas Ungespeichertes vor, fragt es
  („Änderungen verwerfen?“). Enter im letzten Feld = Hauptknopf. Der Fokus
  bleibt im Dialog (Falle) und kehrt beim Schließen zum Auslöser zurück.
- *Verhalten bei fehlenden Daten.* Wie der Bereich: Lage und Größe fest,
  Leeres still, ein Satz oben im Körper.
- *Architektur.* Ein Dialograhmen für Dialog, Nachschlagefenster und
  Rückfrage (gibt es schon: `DialogFrame.ts`). Der Dialog ist ein Bereich
  im Rahmen. **D23** Zweite Form „Seitenblatt“ (rechts, nicht sperrend,
  für Details zur gewählten Zeile)?

**Offen.** **D23**.

### 3.15 Nachschlagen (Steckteil)

Quelle: `src/blocks/lookup/` (lookup.ts, lookupControl.ts,
suggestionList.ts, suggestionState.ts, inputSpot.ts).

**Ist.** Unter einem Feld oder einer Zelle hängen Vorschläge (höchstens 50,
zwölf sichtbar, zuerst genaue, dann beginnende, dann enthaltende Treffer),
und F5 öffnet ein Fenster mit einer Tabelle samt Suchzeile und Spaltenwahl.
Tab übernimmt nur einen eindeutigen Treffer, Enter übernimmt den markierten
oder öffnet das Fenster, „Einzigen Treffer übernehmen“ füllt ein leeres
Feld, wenn die Quelle genau einen Datensatz hat.

**Schwächen.**

- Getippter Text, der zu keinem Treffer passt, verschwindet beim Verlassen
  des Feldes ohne ein Wort.
- Kein „Nichts gefunden“ in der Liste, kein „Neu anlegen …“.
- Nach 50 Treffern ist Schluss, ohne „mehr …“.
- Enter ohne Markierung öffnet das Fenster; das überrascht beim schnellen
  Tippen.
- Die Tasten stehen nirgends.

**Neukonzept.**

- Vorschläge ab dem ersten Zeichen, Markierung auf dem besten Treffer,
  Enter übernimmt ihn, F5 oder Alt+↓ öffnet das Fenster, Tab übernimmt den
  eindeutigen Treffer und lässt sonst den Text stehen und markiert das Feld
  rot („‚xy‘ nicht gefunden“). Esc stellt den Wert vor dem Tippen wieder
  her. Letzte Zeile der Liste: „Kein Treffer“ oder „12 weitere – F5 zeigt
  alle“ und wahlweise „Neu anlegen …“ als Kette des Bausteins.
- Eine Suche für Vorschläge, Fenster, Tabelle und Tafel (2.8).
- Das Fenster ist Dialograhmen plus Tabellenmotor (so ist es schon).

**Offen.** **D24** Enter übernimmt immer den markierten Vorschlag (neu) oder
öffnet bei mehreren Treffern das Fenster (heute)?

### 3.16 Gemeinsame Teile: Hinweis, Leiste, Optik, Symbole, Ankreuzkasten

Quelle: `src/blocks/base/notice.ts`, `src/runtime/notice.ts`,
`src/runtime/infoBar.ts`, `src/blocks/look/`, `src/blocks/parts/icons.ts`,
`src/blocks/parts/tickBox.ts`.

- **Hinweis** (Ring, Haken, Lauflinie) und **Leiste** bleiben, mit den
  Ergänzungen aus 2.3 (Ort des Fehlers, Satz mit nächstem Schritt, 300-ms-
  Schwelle).
- **Optik** (Ton, Art, Größe) wird zu Bedeutung und Rolle (2.5). Töne
  gelten nur für Punkt, Chip, Balken und Rückfrage, nie als Fläche eines
  Bereichs.
- **Symbole**: Die Liste (`look/symbol.ts`) trennt sich in allgemein
  (Telefon, Mobil, E-Mail, Ort, Adresse, Person, Datum, Uhrzeit, Notiz,
  Warnung, Hinweis, Betrag, Nummer, Kennzeichen, Ausweis) und Fachpaket
  (Tier, Impfung, Medikament, Gewicht, Chip, Behandlung, Arzt). Ein Symbol
  ist 16 oder 18 Punkte, schwache Tinte, nie allein ohne Wort (außer in
  Knöpfen mit Sprechblase).
- **Ankreuzkasten**: bleibt (20 Punkte, Haken in der Tinte). Ein gesperrtes
  Ankreuzfeld zeigt den Haken grau statt ein Lesefeld.

---

## 4. Was der Anwender je Baustein wirklich braucht

Eine Tabelle als Prüfliste für den Umbau: Was muss, was ist überflüssig, was
fehlt.

| Baustein | Muss | Überflüssig heute | Fehlt heute |
|---|---|---|---|
| Bereich | Karte, Titel, Klappen, feste Lage | Band, zwei fast gleiche Formen | Titel mit Wert, stilles Leer, Satz oben im Körper, „Ausblenden wenn leer“ als Einstellung |
| Trennlinie | Linie, Zwischenüberschrift | Dicke, senkrecht | Wegfallen mit Nachbarn |
| Knopf | Rolle, Kette, Warten, Fehler | Farbe mal Art, „(3)“ | Taste, Symbol, Sperre bei nichts zu tun, Recht |
| Feld | Typen, Pflicht, Nachschlagen | Typ Suche, Auswahl aus Kommatext | Lesefeld, Prüfung, Einheit, Satz am Feld, Wert bleibt bei Absage |
| Erfassung | Tippzeile, Vorschläge, Aufteilen, Zustände | zwei von sechs Zuständen | Tastenzeile, Wort je Zustand, Erneut, Zurückholen per Enter |
| Tabelle | Spalten, Suche, Sortieren, Wählen, F4 | Blättern als Vorgabe | leere Sätze, Spaltentyp, Rang, sichtbare Spaltenwahl, Sprechblase |
| Liste | Karte als Zeile, Wählen | eigener Motor | Suche, Pfeile, Gruppen, Höhe nach Inhalt |
| Steckbrief | Beschriftung und Wert, Summe | 40 Klickketten | Zeile weg bei leer, Einheit, Symbol, Raster |
| Text | Wörter mit Lücken, Rollen | Paare, „Fett = blau“ | stilles Leer im Bereich, Verschwinden auf Karten, Stücke, Link mit Fokus |
| Bild | Foto, aus Feld oder Relation | Kasten mit Satz in der Maske | Avatar mit Fallback, Formen, groß ansehen |
| Tagwahl | Tag wählen | | Tasten, Hinweis in gefilterten Listen, Warnung bei zwei |
| Suchfeld | ein Suchtext | Versteck im Feld | eigener Baustein, Leeren, Ziel sichtbar |
| Tafel | Spalten, Karten, Zug, Uhrzeit | Übersicht oben, Meldung unten links | Tastatur-Zug, Zuklappen, Obergrenze, Fachpaket getrennt |
| Dialog | Kopf, Inhalt, Esc | feste Punkte | Fuß mit Knöpfen, Größe nach Inhalt, Rückfrage, Fokus zurück |

---

## 5. Reihenfolge für den Umbau

Nach Freigabe des Konzepts. Jeder Schritt ist ein eigener Stand auf GitHub,
mit `npm run check` grün und einer Maske, an der der Auftraggeber den
Unterschied sieht. `BAUPLAN.md` Phase 1 und 2 (Ordnung, Grundlage) laufen
vorher oder parallel; sie ändern kein Verhalten.

| Schritt | Was | Baut auf | Sichtbar an |
|---|---|---|---|
| 1 | Entscheidungen D1 bis D24 einholen, Tokens in `mask.css` auf die fünf Abstände bringen, Benennung (2.5) im Editor | Freigabe | Inspektor |
| 2 | Steckteile: eine Suche, Leerer Zustand, Tasten mit F1-Hilfe, Zeilen zeigen (aus `fold.ts` in die Grundlage), Sichtbarkeit, Prüfung | 1 | noch nichts |
| 3 | Kleine Bausteine: Text mit Rollen und Stücken, Steckbrief, Bild mit Avatar, Trennlinie, Knopf mit Rollen | 2 | eine Karte des Kunden ohne E-Mail wird kleiner |
| 4 | Feld und Nachschlagen: Typen als Steckteile, Lesefeld, Prüfung, Satz am Feld, nichts geht verloren; Suchfeld als Baustein | 2 | ein abgelehnter Wert bleibt stehen |
| 5 | Bereich, Dialog, Tagwahl: stilles Leer, Satz oben im Körper, „Ausblenden wenn leer“, Fuß mit Knöpfen, Rückfrage, Fokus zurück | 2, 3 | ein Bereich ohne Kunden sagt, was zu tun ist, und bleibt, wo er ist |
| 6 | Tabelle und Liste: leere Sätze, Spaltentyp und Rang, sichtbare Spaltenwahl, Liste als Darstellung | 2 | leere Tabelle sagt, warum |
| 7 | Tafel: Tastatur-Zug, Zuklappen, Fachpaket herauslösen | 2, 3, 6 | Karte mit Leertaste verschieben |
| 8 | Erfassung: Zerlegung nach `BAUPLAN.md`, vier Zustände, Tastenzeile, Erneut | 4, 6 | Fehlerzeile mit Satz und Erneut |
| 9 | Kleine Bildschirme (**D7**) und Rechte (**D6**) mit Echttest gegen eine Vorlage aus dem Lexikon | alle | Maske auf 1200 Punkten |

Warum diese Reihenfolge: Die Steckteile zuerst, weil jeder spätere Schritt
sie braucht und sie allein noch nichts ändern (geringes Risiko). Dann die
kleinen Bausteine, weil dort der Leitgedanke am schnellsten sichtbar wird.
Die Erfassung zuletzt, weil sie auf Tabelle, Feld und Nachschlagen steht
und den größten Umbau hat. Rechte und Bildschirme zuletzt, weil beides einen
Echttest mit SoftEngine braucht, den dieser Plan nicht ersetzen kann.

Was der Abgabe-Dialog in der anderen Sitzung schon heute übernehmen kann,
ohne auf den Umbau zu warten: die Kurzliste 2.11 (Fuß mit Knöpfen, Lesefelder
als Text mit Kasten, leere Werte still, Enter-Folge, Pflicht erst beim
Verlassen). Was er erst nach Schritt 2 bekommt: das stille Leer und
„Ausblenden wenn leer“ als Steckteile; bis dahin baut er beides von Hand
(leere Werte als Strich in schwacher Tinte, einen Bereich wie „Chargen“
mit einer Bedingung).

---

## 6. Offene Entscheidungen

| Nr. | Frage | Wege | Vorschlag |
|---|---|---|---|
| D1 | Leere Linien unter den Datensätzen | A nur Erfassung, B Tabelle und Erfassung, C nirgends | A |
| D2 | Leerer Bereich | entschieden 26.10.2026: Lage und Größe fest, Leeres still, Verschwinden nur per Einstellung „Ausblenden wenn leer“ | erledigt |
| D2a | Einstellung „Ausblenden wenn leer“ | Bereich ganz weg, Nachbarn rücken nach / auf den Kopf zusammengezogen | ganz weg |
| D3 | Enter im letzten Feld löst den Hauptknopf aus | ja / nein | ja, nur wenn der Bereich genau einen Hauptknopf hat |
| D4 | Tippen in einer Liste springt in die Suchzeile | ja / nein | ja |
| D5 | Benennung nach Tabelle 2.5 | ganz / teilweise (welche Zeilen) | ganz; „Kanban“ darf bleiben |
| D6 | Fehlendes Recht | Baustein weg / gesperrt zeigen | Knöpfe weg, Felder als Lesefeld |
| D7 | Kleine Bildschirme | A Vorrang, B Umbruch, C zwei Masken | A jetzt, B später |
| D8 | Form „Band“ | behalten / als Schalter „Texte mittig“ | Schalter |
| D9 | Trennlinie senkrecht und Dicke | behalten / weg | weg |
| D10 | Zweiter Hauptknopf im Bereich | verbieten / warnen | warnen |
| D11 | Auswahl-Einträge | aus Quelle / aus Text | aus Quelle, Text bleibt für feste Listen |
| D12 | Fehler am Feld | Wort in der Beschriftungszeile (Höhe bleibt) / Satz unter dem Feld (rutscht) / nur Kante und Leiste | in der Beschriftungszeile |
| D13 | Tippzeile der Erfassung | unten / oben | unten (wie heute) |
| D14 | Zimmer, Belegt/Frei, Wartezeit | Fachpaket / allgemein | Fachpaket |
| D15 | Tabelle blättern | Vorgabe an / aus, scrollen | aus |
| D16 | Mehr als 16 Spalten | ja / nein | nein |
| D17 | Liste | eigener Baustein / Darstellung der Tabelle | Darstellung |
| D18 | Text | ein Baustein mit Rollen / vier Bausteine | ein Baustein |
| D19 | Erfasste Zeile | sofort speichern / gesammelt | gesammelt (wie heute), sofort als Option |
| D20 | Foto groß ansehen bei Klick ohne Kette | ja / nein | ja |
| D21 | Filterleiste (Tagwahl, Suchfeld, weitere) | ja / nein | später, erst D7 |
| D22 | Übersicht oben auf der Tafel | weg / behalten | weg |
| D23 | Seitenblatt (nicht sperrender Dialog rechts) | ja / nein | später |
| D24 | Enter beim Nachschlagen | übernimmt markierten Vorschlag / öffnet Fenster | übernimmt |

Dazu zwei Fragen außerhalb der Bausteine: Wer baut Masken (nur der
Auftraggeber, oder auch Kollegen)? Davon hängt ab, wie streng der Editor
beim Bauen prüft (2.10). Und: Gibt es eine Vorlage im Lexikon, die Rechte
liest und als Echttest für 2.6 taugt (zum Beispiel „Zugriffsrechte der
PPS-Ansicht lesen“)?

---

## 7. Gelesene Dateien

Alle Dateien unter `src/blocks/` (98 Dateien, 14.097 Zeilen), dazu
`src/core/block/` (registry, blockType, capability, property, grid,
gridArea, tree, binding, listBinding, pages, documentFrame, frameFit,
fieldPattern, ownText, propertyNames, newBlock, sourceProperty,
dayFieldProperty), `src/core/data/` (number, calculation und split im Kopf,
steps, jobs im Kopf, selectionFollow, extraSources), `src/runtime/`
(notice, infoBar, nextField, selection, searchText, source, boundSpot,
maskHost, pendingState, events im Kopf), `src/design/mask.css` und
`editor.css`, `src/editor/sidebar/BlockPalette.tsx`, `blockIcons.ts`,
`inspector/BlockProperties.tsx`, `inspector/Sections.tsx`,
`state/useKeyboardShortcuts.ts`, `BAUPLAN.md`, `package.json`,
`.claude/launch.json`. Nicht gelesen: `src/softengine/` (Anschluss, bleibt
laut `BAUPLAN.md` unangetastet), der Rest des Editors, `src/export/` außer
der Dateiliste.
