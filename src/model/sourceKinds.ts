import { POS_LEN, type SourceData, type SourceKindId } from './sources'

// The kinds of data source. Each kind knows what the user enters for it, how
// SoftEngine is asked for its rows (the SEvariablen sheet) and where the rows
// then arrive.

export interface SheetPart {
  VAR?: { ID: string; FELDER: string }[]
  SEFILELOOP?: { INDEX_NR: 0; ALIAS: string; ID: string; KOPFSATZ_INDEX?: string; FELDER: string }[]
  ERPAPICALL?: { ID: string; ALIAS: string; FELDER: string }[]
  DATASET?: { ID: string; ALIAS: string; FELDER: string }[]
  MASKE?: { ID: string; BEREICH: string; FELDER: '*'; REFRESH_FELDER: '*'; ALIAS: string }[]
}

// How the rows reach the mask: pushed by SoftEngine when the mask opens,
// asked with an ERP query, or asked with a GET_RELATION.
export type Delivery = 'push' | 'query' | 'relation'

// Where pushed rows lie in SEDATA.Daten.
export type PushPath = 'SEFileLoop' | 'Var' | 'Tabellen' | 'Masken'

const KEY_FREE = /^[A-Za-z][A-Za-z0-9._]*$/

// "ADR_2_8" -> "2_8" in the field list of a table that is asked by its own name.
export function withoutTablePrefix(codes: readonly string[], table: string): string[] {
  if (table === '') return [...codes]
  const prefix = `${table}_`
  const out: string[] = []
  for (const code of codes) {
    const bare = code.startsWith(prefix) && POS_LEN.test(code.slice(prefix.length)) ? code.slice(prefix.length) : code
    if (!out.includes(bare)) out.push(bare)
  }
  return out
}

export abstract class SourceKind {
  abstract readonly id: SourceKindId
  abstract readonly label: string
  abstract readonly description: string
  abstract readonly delivery: Delivery
  readonly pushPath: PushPath | null = null

  // What the user enters to say which table, query or mask is meant.
  readonly tableLabel: string = 'Kennung'
  readonly tablePlaceholder: string = ''
  readonly tableChoices: readonly { value: string; label: string }[] = []
  readonly codeHint: string = 'Position_Länge, z. B. 78_30'

  // Delivers one record instead of a list.
  readonly single: boolean = false
  // Its fields can be written with relation 174, records created with 640.
  readonly writable: boolean = false
  // Asks SoftEngine for "*" as long as the mask uses no field.
  protected readonly wildcard: boolean = false

  normalizeTable(raw: string): string {
    const t = raw.trim()
    return KEY_FREE.test(t) ? t : ''
  }

  // The codes SoftEngine is asked for: the record field first, then what the
  // mask uses, in the order of the source.
  protected usedCodes(source: SourceData, used: ReadonlySet<string>): string[] {
    const codes = source.recordField === '' ? [] : [source.recordField]
    for (const field of source.fields) {
      if (used.has(field.code) && !codes.includes(field.code)) codes.push(field.code)
    }
    for (const code of used) if (!codes.includes(code)) codes.push(code)
    return codes
  }

  // FELDER as SoftEngine reads it.
  fieldList(source: SourceData, used: ReadonlySet<string>): string {
    if (used.size === 0) {
      return this.wildcard ? '*' : source.fields.map((field) => field.code).join(',')
    }
    const codes = this.usedCodes(source, used)
    if (this.wildcard && !withoutTablePrefix(codes, source.table).every((code) => POS_LEN.test(code))) return '*'
    return codes.join(',')
  }

  abstract sheet(source: SourceData, used: ReadonlySet<string>): SheetPart
}

class IdbKind extends SourceKind {
  readonly id = 'idb'
  readonly label = 'IDB-Tabelle'
  readonly description = 'Eine eigene Tabelle (individuelle Datenbank). SoftEngine liefert alle Sätze beim Öffnen.'
  readonly delivery = 'push'
  override readonly pushPath = 'SEFileLoop'
  override readonly tableLabel = 'IDB-Nummer'
  override readonly tablePlaceholder = 'z. B. 21'
  override readonly writable = true
  protected override readonly wildcard = true

  // "21", "ID0021" and "IDBID0021" all mean IDBID0021.
  override normalizeTable(raw: string): string {
    const m = /^(?:IDB)?(?:ID)?(\d{1,4})$/i.exec(raw.trim())
    return m ? `IDBID${m[1].padStart(4, '0')}` : ''
  }

  sheet(source: SourceData, used: ReadonlySet<string>): SheetPart {
    const fields = this.fieldList(source, used)
    return {
      SEFILELOOP: [
        {
          INDEX_NR: 0,
          ALIAS: source.name,
          ID: source.table,
          FELDER: fields === '*' ? fields : withoutTablePrefix(fields.split(','), source.table).join(','),
        },
      ],
    }
  }
}

// The IDB as relations 174 and 640 name it: "ID0021".
export function idbParam(table: string): string {
  const m = /^IDB(ID\d{4})$/.exec(table)
  return m ? m[1] : table
}

const FILES = [
  { value: 'ADR', label: 'Adressstamm' },
  { value: 'ART', label: 'Artikelstamm' },
  { value: 'BEL', label: 'Belege' },
  { value: 'POS', label: 'Belegpositionen' },
  { value: 'LFA', label: 'Lieferadressen' },
]

const HEADER_KEY = /^([A-Za-z][A-Za-z0-9]*)_(\d+_\d+)$/

class FileKind extends SourceKind {
  readonly id = 'file'
  readonly label = 'Datei als Liste'
  readonly description = 'Sätze einer SoftEngine-Datei (Adressen, Artikel, Belege, Positionen) als Liste.'
  readonly delivery = 'push'
  override readonly pushPath = 'SEFileLoop'
  override readonly tableLabel = 'Datei'
  override readonly tablePlaceholder = 'z. B. ADR'
  override readonly tableChoices = FILES

  sheet(source: SourceData, used: ReadonlySet<string>): SheetPart {
    const headerKey = (source.headerKey ?? '').trim()
    const header = HEADER_KEY.exec(headerKey)
    return {
      SEFILELOOP: [
        {
          INDEX_NR: 0,
          ALIAS: source.name,
          ID: source.table,
          ...(headerKey !== '' ? { KOPFSATZ_INDEX: headerKey } : {}),
          FELDER: withoutTablePrefix(this.fieldList(source, used).split(','), source.table).join(','),
        },
      ],
      ...(header ? { VAR: [{ ID: header[1], FELDER: header[2] }] } : {}),
    }
  }
}

class RecordKind extends SourceKind {
  readonly id = 'record'
  readonly label = 'Offener Satz'
  readonly description = 'Der Satz, der in SoftEngine gerade offen ist, z. B. die Adresse der Karteikarte.'
  readonly delivery = 'push'
  override readonly pushPath = 'Var'
  override readonly tableLabel = 'Datei'
  override readonly tablePlaceholder = 'z. B. ADR'
  override readonly tableChoices = FILES
  override readonly single = true

  sheet(source: SourceData, used: ReadonlySet<string>): SheetPart {
    const fields = withoutTablePrefix(this.fieldList(source, used).split(','), source.table).join(',')
    return fields === '' ? {} : { VAR: [{ ID: source.table, FELDER: fields }] }
  }
}

class QueryKind extends SourceKind {
  readonly id = 'query'
  readonly label = 'ERP-Abfrage'
  readonly description = 'Eine Liste, die die Maske beim Öffnen bei SoftEngine abfragt, z. B. ADRESSE.GET.'
  readonly delivery = 'query'
  override readonly tableLabel = 'Abfrage'
  override readonly tablePlaceholder = 'z. B. ADRESSE.GET'
  override readonly codeHint = 'Feld mit Datei davor, z. B. ADR_2_8'

  sheet(): SheetPart {
    return {}
  }
}

class DatasetKind extends SourceKind {
  readonly id = 'dataset'
  readonly label = 'DataSet'
  readonly description = 'Ein DataSet, das SoftEngine beim Öffnen mitliefert.'
  readonly delivery = 'push'
  override readonly pushPath = 'Tabellen'
  override readonly tableLabel = 'DataSet-ID'
  override readonly codeHint = 'Spalte im DataSet'

  sheet(source: SourceData, used: ReadonlySet<string>): SheetPart {
    return { DATASET: [{ ID: source.table, ALIAS: source.name, FELDER: this.fieldList(source, used) }] }
  }
}

class ErpMaskKind extends SourceKind {
  readonly id = 'erpMask'
  readonly label = 'ERP-Maske'
  readonly description = 'Die Felder einer SoftEngine-Maske, als ein Satz.'
  readonly delivery = 'push'
  override readonly pushPath = 'Masken'
  override readonly tableLabel = 'Maskennummer'
  override readonly codeHint = 'Feldname der Maske'
  override readonly single = true

  sheet(source: SourceData): SheetPart {
    return {
      MASKE: [
        {
          ID: source.table,
          BEREICH: (source.area ?? '').trim().toUpperCase(),
          FELDER: '*',
          REFRESH_FELDER: '*',
          ALIAS: source.name,
        },
      ],
    }
  }
}

class RelationKind extends SourceKind {
  readonly id = 'relation'
  readonly label = 'Wert per Relation'
  readonly description = 'Was eine GET_RELATION antwortet: ein Wert oder eine Liste von Sätzen.'
  readonly delivery = 'relation'
  override readonly tableLabel = ''
  override readonly codeHint = 'Name in der Antwort'

  sheet(): SheetPart {
    return {}
  }
}

const KINDS: Record<SourceKindId, SourceKind> = {
  idb: new IdbKind(),
  file: new FileKind(),
  record: new RecordKind(),
  query: new QueryKind(),
  dataset: new DatasetKind(),
  erpMask: new ErpMaskKind(),
  relation: new RelationKind(),
}

export const SOURCE_KINDS: readonly SourceKind[] = Object.values(KINDS)

export function sourceKind(id: SourceKindId): SourceKind {
  return KINDS[id]
}

// The SEvariablen sheet for the sources of a mask. SEFILELOOP and ERPAPICALL
// are always there, even when empty; a VAR of one table is asked once.
export function buildSheet(sources: readonly SourceData[], used: ReadonlyMap<string, ReadonlySet<string>>): SheetPart {
  const none: ReadonlySet<string> = new Set()
  const parts = sources.map((source) => sourceKind(source.kind).sheet(source, used.get(source.id) ?? none))
  const all = <K extends keyof SheetPart>(key: K): NonNullable<SheetPart[K]> =>
    parts.flatMap((part) => (part[key] ?? []) as never[]) as unknown as NonNullable<SheetPart[K]>

  const perTable = new Map<string, string[]>()
  for (const entry of all('VAR')) {
    if (entry.ID === '') continue
    const codes = perTable.get(entry.ID) ?? []
    for (const code of entry.FELDER.split(',').map((c) => c.trim())) {
      if (code !== '' && !codes.includes(code)) codes.push(code)
    }
    perTable.set(entry.ID, codes)
  }
  const vars = [...perTable].filter(([, codes]) => codes.length > 0).map(([ID, codes]) => ({ ID, FELDER: codes.join(',') }))

  const loops = all('SEFILELOOP')
  const dataset = all('DATASET')
  const masks = all('MASKE')
  return {
    ...(vars.length > 0 ? { VAR: vars } : {}),
    // Lists under an open record come after the free ones.
    SEFILELOOP: [...loops.filter((l) => l.KOPFSATZ_INDEX === undefined), ...loops.filter((l) => l.KOPFSATZ_INDEX !== undefined)],
    ERPAPICALL: all('ERPAPICALL'),
    ...(dataset.length > 0 ? { DATASET: dataset } : {}),
    ...(masks.length > 0 ? { MASKE: masks } : {}),
  }
}
