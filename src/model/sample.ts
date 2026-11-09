import { addDays, germanDate, timeOfMinute, todayKey } from './format'
import { lengthOf, type FieldData, type SourceData } from './sources'

// Example rows for a source, so a mask in the editor looks like a mask in
// use. Guessed from the names and types of the fields; the user can edit them.

const WORDS: readonly [RegExp, readonly string[]][] = [
  [/vorname/i, ['Anna', 'Thomas', 'Sabine', 'Mehmet', 'Julia', 'Peter', 'Lena', 'Karin', 'Stefan', 'Ayşe']],
  [/nachname|besitzer|kunde(?!n?nummer)|name 1|^name$/i, ['Wagner', 'Becker', 'Krüger', 'Yılmaz', 'Hoffmann', 'Schulz', 'Fischer', 'Neumann', 'Wolf', 'Demir']],
  [/tiername|patient/i, ['Bello', 'Luna', 'Rocky', 'Minka', 'Balu', 'Nala', 'Max', 'Simba', 'Mia', 'Oskar']],
  [/tierart|art$/i, ['Hund', 'Katze', 'Hund', 'Katze', 'Hund', 'Katze', 'Hund', 'Katze', 'Kaninchen', 'Hund']],
  [/rasse|unterart/i, ['Labrador', 'Maine Coon', 'Dackel', 'Hauskatze', 'Golden Retriever', 'Britisch Kurzhaar', 'Beagle', 'Bengal', 'Zwergwidder', 'Border Collie']],
  [/ort|stadt/i, ['Köln', 'Hürth', 'Frechen', 'Pulheim', 'Brühl', 'Köln', 'Bonn', 'Köln', 'Leverkusen', 'Köln']],
  [/stra(ß|ss)e|anschrift/i, ['Lindenweg 4', 'Hauptstraße 12', 'Am Stadtpark 7', 'Bergstraße 3', 'Ringstraße 21']],
  [/plz/i, ['50667', '50354', '50226', '50259', '50321']],
  [/telefon|tel\b|handy|mobil/i, ['0221 123456', '02233 98765', '0171 5551234', '0221 445566', '02234 77889']],
  [/mail/i, ['a.wagner@example.de', 't.becker@example.de', 's.krueger@example.de', 'm.yilmaz@example.de']],
  [/behandlung|grund|betreff|anliegen|beschreibung|text|notiz|bemerkung/i, ['Impfung', 'Nachkontrolle', 'Zahnkontrolle', 'Krallen schneiden', 'Blutabnahme', 'Erstuntersuchung', 'Lahmt vorne links', 'Frisst seit zwei Tagen nicht']],
  [/zimmer|raum|platz/i, ['Zimmer 1', 'Zimmer 2', 'Zimmer 3', 'Zimmer 1', 'Zimmer 2', '']],
  [/status|zustand/i, ['Offen', 'In Arbeit', 'Erledigt', 'Offen', 'In Arbeit']],
  [/arzt|ärztin|mitarbeiter|bearbeiter/i, ['Dr. Weber', 'Dr. Lindner', 'Dr. Weber', 'Dr. Aydın']],
  [/artikel|bezeichnung|produkt/i, ['Impfstoff Tollwut', 'Entwurmung', 'Verband klein', 'Futter Diät 2 kg', 'Zeckenmittel']],
  [/einheit/i, ['Stk', 'Stk', 'Pkg', 'kg', 'ml']],
]

function wordFor(field: FieldData, row: number): string | undefined {
  const list = WORDS.find(([pattern]) => pattern.test(field.name))?.[1]
  return list?.[row % list.length]
}

function sampleValue(field: FieldData, row: number, isRecord: boolean): string {
  if (isRecord) return String(row + 1)
  switch (field.type) {
    case 'date':
      return germanDate(/geburt/i.test(field.name) ? addDays(todayKey(), -365 * (2 + row) - row * 31) : todayKey())
    case 'time':
      return timeOfMinute(8 * 60 + row * 30)
    case 'money':
      return (19.9 + row * 12.35).toFixed(2).replace('.', ',')
    case 'number':
      return /dauer/i.test(field.name) ? String(15 + (row % 3) * 15) : String(10001 + row * 7)
    case 'bool':
      return row % 3 === 0 ? 'J' : 'N'
    default: {
      const word = wordFor(field, row) ?? `${field.name} ${row + 1}`
      const length = lengthOf(field.code)
      return length === null ? word : word.slice(0, length)
    }
  }
}

export function sampleRows(source: Pick<SourceData, 'fields' | 'recordField'>, count = 6): Record<string, string>[] {
  return Array.from({ length: count }, (_, row) =>
    Object.fromEntries(source.fields.map((field) => [field.code, sampleValue(field, row, field.code === source.recordField)])),
  )
}

// The rows the editor shows for a source: its own, or guessed ones.
export function sampleOf(source: SourceData, single: boolean): Record<string, string>[] {
  if (source.sample.length > 0) return single ? source.sample.slice(0, 1) : source.sample
  return sampleRows(source, single ? 1 : 6)
}
