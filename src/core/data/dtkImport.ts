interface DtkField {
  code: string
  name: string
}

export interface DtkTable {
  key: string

  name: string

  fields: DtkField[]

  expectedCount: number
}

const PAGE = 2048
const HEAD_LENGTH = 30

const HEAD_OFFSET = 2042

function isContinuationHead(bytes: Uint8Array, p: number): boolean {
  if (bytes[p] !== 0xfa) return false
  for (let i = p + 16; i <= p + 20; i++) if (bytes[i] !== 0xff) return false
  for (let i = p + 24; i <= p + 29; i++) if (bytes[i] !== 0xff) return false
  return true
}

function latin1(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)))
  }
  return s
}

function dtkTextFromBytes(bytes: Uint8Array): string {
  const parts: string[] = []
  let start = 0
  for (let p = HEAD_OFFSET; p + HEAD_LENGTH <= bytes.length; p += PAGE) {
    if (!isContinuationHead(bytes, p)) continue
    parts.push(latin1(bytes.subarray(start, p)))
    start = p + HEAD_LENGTH
  }
  parts.push(latin1(bytes.subarray(start)))
  return parts.join('')
}

function isGarbageIcon(c: number): boolean {
  return c < 32 || (c >= 127 && c <= 159) || c === 255
}

function cleanLabel(raw: string): string {
  let of = 0
  let to = raw.length
  while (of < to && isGarbageIcon(raw.charCodeAt(of))) of++
  while (to > of && isGarbageIcon(raw.charCodeAt(to - 1))) to--
  const t = raw.slice(of, to).trim()
  if (t === '' || t.length > 60) return ''
  for (let i = 0; i < t.length; i++) {
    if (isGarbageIcon(t.charCodeAt(i))) return ''
  }

  if (t.includes('@') || /^\d+,/.test(t)) return ''
  return t
}

interface RawField {
  pos: number
  len: number
  label: string
}

const codeOf = (f: RawField) => `${f.pos}_${f.len}`

const RECORD_ROW = /IDB(ID\d{4})_(\d+)_(\d+),(\d*),(\d+),(\d+),([^,\r\n]+),([A-Z]{1,4}\d?)/g

function harvestRecord(text: string): Map<string, Map<string, RawField>> {
  const tables = new Map<string, Map<string, RawField>>()
  for (const m of text.matchAll(RECORD_ROW)) {
    if (m[2] !== m[5] || m[3] !== m[6]) continue
    const label = cleanLabel(m[7])
    if (label === '') continue
    const field = { pos: Number(m[5]), len: Number(m[6]), label }
    let fields = tables.get(m[1])
    if (!fields) {
      fields = new Map()
      tables.set(m[1], fields)
    }
    if (!fields.has(codeOf(field))) fields.set(codeOf(field), field)
  }
  return tables
}

const POS_RECORD = /3,POS,(ID\d{4}), {5,9}(\d{1,4}) /g

// A field record has fixed columns, counted from its "3,POS,": the label,
// then position and length twice. The second pair is the field's code.
const LABEL: [number, number] = [1082, 1122]
const SHOWN_LENGTH: [number, number] = [1126, 1130]
const CODE_POSITION: [number, number] = [1161, 1165]
const CODE_LENGTH: [number, number] = [1165, 1169]

// Binary bytes inside a record: a page break cut it apart.
function cutApart(record: string): boolean {
  for (let i = 0; i < record.length; i++) {
    const c = record.charCodeAt(i)
    if (c < 9 || (c > 13 && c < 32)) return true
  }
  return false
}

const whole = (column: string): number | null => (/^ *\d+$/.test(column) ? Number(column) : null)

function harvestPosRecords(text: string): Map<string, Map<number, RawField>> {
  const tables = new Map<string, Map<number, RawField>>()
  for (const record of text.matchAll(POS_RECORD)) {
    const number = Number(record[2])
    const fields = tables.get(record[1])
    if (fields?.has(number)) continue
    const r = text.slice(record.index, record.index + CODE_LENGTH[1])
    if (r.length < CODE_LENGTH[1] || cutApart(r)) continue
    const label = cleanLabel(r.slice(...LABEL))
    const pos = whole(r.slice(...CODE_POSITION))
    const len = whole(r.slice(...CODE_LENGTH))
    if (label === '' || pos === null || len === null || len < 1 || whole(r.slice(...SHOWN_LENGTH)) !== len) continue
    const target = fields ?? new Map<number, RawField>()
    if (!fields) tables.set(record[1], target)
    target.set(number, { pos, len, label })
  }
  return tables
}

const POS_NUMBER = /3,POS,(ID\d{4}), {5,9}(\d{1,4})/g

function expectedCounts(text: string): Map<string, number> {
  const numbers = new Map<string, Set<number>>()
  for (const m of text.matchAll(POS_NUMBER)) {
    let s = numbers.get(m[1])
    if (!s) {
      s = new Set()
      numbers.set(m[1], s)
    }
    s.add(Number(m[2]))
  }
  return new Map([...numbers].map(([id, s]) => [id, s.size]))
}

// The table's header record: its key twice, then its name. Where a page
// break cuts the record, the name is found before its time stamp instead.
const TABLE_NAME = /0,(ID\d{4}) {2,}\1 {2,}(\S[^\r\n]{0,58}?) {2,}/g
const HEADER_KEY = /0,(ID\d{4}) {2,}/g
const NAME_BEFORE_TIME = / {2,}(\S[^\r\n]{0,58}?) {2,}\d{5}\.\d{2}\.\d{4}/

function tablesNames(text: string): Map<string, string> {
  const names = new Map<string, string>()
  const add = (id: string, raw: string) => {
    const name = cleanLabel(raw)
    if (name !== '' && !/^ID\d{4}$/.test(name) && !names.has(id)) names.set(id, name)
  }
  for (const m of text.matchAll(TABLE_NAME)) add(m[1], m[2])
  for (const m of text.matchAll(HEADER_KEY)) {
    if (!names.has(m[1])) add(m[1], NAME_BEFORE_TIME.exec(text.slice(m.index, m.index + 500))?.[1] ?? '')
  }
  return names
}

// The field list names each field with its code. Where a page break cut a
// line of it, the field records fill the gap.
function fieldsOf(
  listed: Map<string, RawField> | undefined,
  recorded: Map<number, RawField> | undefined,
  expected: number,
) {
  const fields = new Map(listed)
  if (fields.size < expected) {
    for (const f of recorded?.values() ?? []) if (!fields.has(codeOf(f))) fields.set(codeOf(f), f)
  }
  return [...fields.values()].sort((x, y) => x.pos - y.pos || x.len - y.len)
}

function parseDtk(text: string): DtkTable[] {
  const listed = harvestRecord(text)
  const fromPos = harvestPosRecords(text)
  const expected = expectedCounts(text)
  const names = tablesNames(text)

  const ids = new Set([...listed.keys(), ...fromPos.keys(), ...expected.keys()])
  const out: DtkTable[] = []
  for (const id of [...ids].sort()) {
    const expectedCount = expected.get(id) ?? 0
    const fields = fieldsOf(listed.get(id), fromPos.get(id), expectedCount)

    if (fields.length === 0 && expectedCount === 0) continue
    out.push({
      key: `IDB${id}`,
      name: names.get(id) ?? '',
      fields: fields.map((f) => ({ code: codeOf(f), name: f.label })),
      expectedCount: expectedCount,
    })
  }
  return out
}

export function dtkRead(bytes: Uint8Array): DtkTable[] {
  return parseDtk(dtkTextFromBytes(bytes))
}
