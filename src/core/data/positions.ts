import type { DataSource, RuntimeSource } from './dataSources'
import type { OpenDocument, PutConfirm } from './jobs'
import { asNumber } from './number'
import type { RuntimeRelation } from './relations'

export const POSITION_FIELDS = {
  year: '0_1',
  archive: '1_1',
  documentKind: '2_1',
  documentNumber: '3_8',
  number: '11_6',
  ident: '645_10',
  article: '18_25',
  quantity: '164_8',
} as const

const POSITIONS_TABLE = 'POS'

const DOCUMENT_TABLE = 'BEL'

export const POSITION_DELETE_NR = '53'

export const POSITIONS_QUERY = {
  id: 'BELPOS.GET',
  alias: 'FF_POSITIONEN',
  withoutEmpty: '1',
  prefix: 'POS_',
} as const

const POSITION_KEYS: readonly string[] = [POSITION_FIELDS.number, POSITION_FIELDS.ident]

const DOCUMENT_KEYS: readonly string[] = [
  POSITION_FIELDS.year,
  POSITION_FIELDS.archive,
  POSITION_FIELDS.documentKind,
  POSITION_FIELDS.documentNumber,
]

const CHECKED_FIELDS: readonly string[] = [
  POSITION_FIELDS.ident,
  POSITION_FIELDS.number,
  POSITION_FIELDS.article,
  POSITION_FIELDS.quantity,
]

const PLACES = {
  documentKind: 'BELART',
  documentNumber: 'BELNR',
  article: 'ARTNR',
  quantity: 'MENGE',
} as const

type Read = (row: unknown, code: string) => string

interface PositionsLook {
  sources(): readonly RuntimeSource[]
  source(id: string): RuntimeSource | undefined
  rows(source: RuntimeSource): unknown[]
  readField(row: unknown, code: string): string
}

export type PositionsWrite =
  | { kind: 'added'; sourceId: string }
  | { kind: 'removed'; sourceId: string; row: unknown }

function listsPositions(source: Pick<DataSource, 'tableId' | 'delivery'>): boolean {
  return source.tableId === POSITIONS_TABLE && source.delivery.kind === 'push' && source.delivery.path !== 'Var'
}

function holdsOpenDocument(source: Pick<DataSource, 'tableId' | 'delivery'>): boolean {
  return source.tableId === DOCUMENT_TABLE && source.delivery.kind === 'push' && source.delivery.path === 'Var'
}

export function alwaysOrdered(source: DataSource, used: readonly DataSource[]): readonly string[] {
  if (listsPositions(source)) return POSITION_KEYS
  if (holdsOpenDocument(source) && used.some(listsPositions)) return DOCUMENT_KEYS
  return []
}

export function documentIndex(document: OpenDocument): string {
  return `${document.year}${document.archive}${document.kind}${document.number}`
}

export function positionsAsked(codes: readonly string[]): string {
  const asked = [...codes, ...CHECKED_FIELDS].filter((code) => /^\d+_\d+$/.test(code))
  return [...new Set(asked)].map((code) => `${POSITIONS_QUERY.prefix}${code}`).join(',')
}

function placeValue(put: RuntimeRelation, params: readonly string[], name: string): string {
  const at = put.parameter.indexOf(name)
  return at < 0 ? '' : (params[at] ?? '').trim()
}

function documentRows(look: PositionsLook): unknown[] {
  return look.sources()
    .filter((s) => s.tableId === DOCUMENT_TABLE && s.delivery.kind === 'push')
    .flatMap((s) => look.rows(s))
}

function openDocument(
  look: PositionsLook,
  put: RuntimeRelation,
  params: readonly string[],
  fromRow: unknown,
): OpenDocument | undefined {
  const rows = documentRows(look)
  const number = placeValue(put, params, PLACES.documentNumber)
    || look.readField(fromRow, POSITION_FIELDS.documentNumber)
    || rows.map((r) => look.readField(r, POSITION_FIELDS.documentNumber)).find((v) => v !== '')
    || ''
  if (number === '') return undefined
  const own = rows.filter((r) => look.readField(r, POSITION_FIELDS.documentNumber) === number)
  const field = (code: string): string => own.map((r) => look.readField(r, code)).find((v) => v !== '') ?? ''
  const document = {
    kind: placeValue(put, params, PLACES.documentKind) || field(POSITION_FIELDS.documentKind),
    number,
    year: field(POSITION_FIELDS.year),
    archive: field(POSITION_FIELDS.archive),
  }
  return Object.values(document).every((v) => v !== '') ? document : undefined
}

export function positionsConfirm(
  look: PositionsLook,
  put: RuntimeRelation,
  params: readonly string[],
  write: PositionsWrite,
): PutConfirm | undefined {
  const source = look.source(write.sourceId)
  if (!source || source.tableId !== POSITIONS_TABLE || source.delivery.kind !== 'push' || source.delivery.openRecord) {
    return undefined
  }
  const fromRow = write.kind === 'removed' ? write.row : undefined
  const document = openDocument(look, put, params, fromRow)
  if (!document) return undefined
  const confirm: PutConfirm = { document, kind: write.kind, sourceId: source.id }

  if (write.kind === 'removed') {
    const own = identityOf(write.row, look.readField)
    return own.ident === '' && own.number === '' ? undefined : { ...confirm, row: write.row }
  }
  const article = placeValue(put, params, PLACES.article)
  if (article === '') return undefined
  const quantity = placeValue(put, params, PLACES.quantity)
  return { ...confirm, expectedArticle: article, ...(quantity === '' ? {} : { expectedQuantity: quantity }) }
}

interface Identity {
  ident: string
  number: string
}

function identityOf(row: unknown, read: Read): Identity {
  return { ident: read(row, POSITION_FIELDS.ident), number: read(row, POSITION_FIELDS.number) }
}

export function positionIdentity(tableId: string, row: unknown, read: Read): string {
  if (tableId !== POSITIONS_TABLE) return ''
  const own = identityOf(row, read)
  return own.ident !== '' ? own.ident : own.number
}

interface KnownPositions {
  idents: ReadonlySet<string>
  numbers: ReadonlySet<string>
}

export function knownPositions(rows: readonly unknown[], read: Read): KnownPositions {
  const idents = new Set<string>()
  const numbers = new Set<string>()
  for (const row of rows) {
    const own = identityOf(row, read)
    if (own.ident !== '') idents.add(own.ident)
    if (own.number !== '') numbers.add(own.number)
  }
  return { idents, numbers }
}

function isKnown(own: Identity, known: KnownPositions): boolean {
  return (own.ident !== '' && known.idents.has(own.ident)) || (own.number !== '' && known.numbers.has(own.number))
}

function sameQuantity(found: string, expected: string): boolean {
  const a = asNumber(found)
  return a === null ? found === expected.trim() : a === asNumber(expected)
}

function numberOf(row: unknown, read: Read): number {
  const n = Number(read(row, POSITION_FIELDS.number))
  return Number.isFinite(n) ? n : -1
}

export function writtenPosition(
  rows: readonly unknown[],
  confirm: PutConfirm,
  known: KnownPositions,
  read: Read,
): unknown {
  const article = (confirm.expectedArticle ?? '').trim().toUpperCase()
  const quantity = confirm.expectedQuantity
  const hits = rows.filter((row) => {
    const own = identityOf(row, read)
    if (own.ident === '' && own.number === '') return false
    if (isKnown(own, known)) return false
    if (read(row, POSITION_FIELDS.article).toUpperCase() !== article) return false
    return quantity === undefined || sameQuantity(read(row, POSITION_FIELDS.quantity), quantity)
  })
  return hits.reduce<unknown>((best, row) => (best === undefined || numberOf(row, read) > numberOf(best, read) ? row : best), undefined)
}

export function positionGone(
  rows: readonly unknown[],
  confirm: PutConfirm,
  known: KnownPositions,
  read: Read,
): boolean {
  const gone = identityOf(confirm.row, read)
  const carries = (row: unknown): boolean => {
    const own = identityOf(row, read)
    return gone.ident !== '' ? own.ident === gone.ident : own.number === gone.number
  }
  if (rows.some(carries)) return false
  const othersKnown = [...known.idents].some((ident) => ident !== gone.ident)
    || [...known.numbers].some((number) => number !== gone.number)
  return rows.length > 0 || !othersKnown
}
