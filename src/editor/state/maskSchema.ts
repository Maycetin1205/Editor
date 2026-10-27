import { splitBinding } from '../../core/block/binding'
import { numberText } from '../../core/data/number'

export const CURRENT_SCHEMA_VERSION = 40

const LIFTABLE = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const OLD_TEXT_SIZE = 14

function textVariant(values: Record<string, unknown>): string {
  const size = typeof values.size === 'number' ? values.size : OLD_TEXT_SIZE
  if (values.weight === 'bold') return size >= 15 ? 'title' : 'heading'
  if (size <= 11.5) return 'label'
  if (values.color === 'muted') return 'muted'
  return 'body'
}

function liftTo21(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values)) continue
    const values = node.values
    if (node.type === 'text') {
      values.variant = textVariant(values)
      delete values.size
      delete values.weight
      delete values.color
    }
    if (node.type === 'formfield' && values.appearance === 'line') values.appearance = 'plain'
  }
}

function liftTo22(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'formfield' || !isPlainObject(node.values)) continue
    const values = node.values
    if (values.fieldType === 'lookup') values.lookup = true
    if (values.fieldType === 'lookup' || values.fieldType === 'textarea') values.fieldType = 'text'
  }
}

const COLUMN_VALUES_23 = ['heading', 'tone', 'catchAll']
const CARD_VALUES_23 = [
  'chipTone',
  'heading',
  'heading2',
  'time',
  'date',
  'subline',
  'text',
  'chip',
  'headingField',
  'heading2Field',
  'timeField',
  'dateField',
  'sublineField',
  'textField',
  'chipField',
]

function picked(values: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(values)) return {}
  return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]))
}

function liftTo23(tree: unknown): void {
  if (!isPlainObject(tree)) return
  const drop = (id: unknown): void => {
    if (typeof id !== 'string') return
    const node = tree[id]
    if (isPlainObject(node) && Array.isArray(node.childIds)) node.childIds.forEach(drop)
    delete tree[id]
  }
  for (const board of Object.values(tree)) {
    if (!isPlainObject(board) || board.type !== 'kanban' || !Array.isArray(board.childIds)) continue
    const values = isPlainObject(board.values) ? board.values : {}
    const children = board.childIds.map((id) => (typeof id === 'string' ? tree[id] : undefined)).filter(isPlainObject)
    const columns = children
      .filter((child) => child.type === 'kanban-column')
      .map((child) => {
        const own = isPlainObject(child.values) ? child.values : {}
        return {
          ...picked(own, COLUMN_VALUES_23),
          places: [{ ...picked(own, ['value']), ...('heading' in own ? { name: own.heading } : {}) }],
        }
      })
    if (columns.length > 0) values.columns = columns
    const card = children.find((child) => child.type === 'card')
    if (card) Object.assign(values, picked(card.values, CARD_VALUES_23))
    board.values = values
    board.childIds.forEach(drop)
    board.childIds = []
  }
}

const OLD_AREA_COLUMNS = 48

function cellOf(values: Record<string, unknown>, key: string, fallback: number): number {
  const v = values[key]
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback
}

function liftTo24(tree: unknown): void {
  if (!isPlainObject(tree)) return
  const carry = (id: unknown): void => {
    const node = typeof id === 'string' ? tree[id] : undefined
    if (!isPlainObject(node) || !Array.isArray(node.childIds)) return
    if (node.type === 'area' && isPlainObject(node.values)) {
      const columns = Math.max(1, cellOf(node.values, 'gridW', OLD_AREA_COLUMNS))
      for (const childId of node.childIds) {
        const child = typeof childId === 'string' ? tree[childId] : undefined
        if (!isPlainObject(child) || !isPlainObject(child.values)) continue
        const x = Math.min(columns - 1, Math.round((cellOf(child.values, 'gridX', 0) * columns) / OLD_AREA_COLUMNS))
        const w = Math.max(
          1,
          Math.round((cellOf(child.values, 'gridW', OLD_AREA_COLUMNS) * columns) / OLD_AREA_COLUMNS),
        )
        child.values.gridX = x
        child.values.gridW = Math.min(w, columns - x)
      }
    }
    node.childIds.forEach(carry)
  }
  Object.entries(tree)
    .filter(([, node]) => isPlainObject(node) && (node.parentId === null || node.parentId === undefined))
    .forEach(([id]) => carry(id))
}

function termFrom25(factor: unknown, divides: boolean): Record<string, unknown> | null {
  if (!isPlainObject(factor)) return null
  if (factor.kind === 'column' && typeof factor.column === 'string' && factor.column !== '') {
    return { kind: 'row', value: factor.column, divides }
  }
  if (factor.kind === 'dataField' && typeof factor.field === 'string' && factor.field !== '') {
    const { sourceId, code } = splitBinding(factor.field)
    return { kind: 'helper', ...(sourceId === '' ? {} : { sourceId }), value: code, divides }
  }
  if (factor.kind === 'number' && typeof factor.number === 'number') {
    return { kind: 'fixed', value: numberText(factor.number, 6), divides }
  }
  return null
}

function liftTo25(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values) || !Array.isArray(node.values.calculations)) continue
    node.values.calculations = node.values.calculations.flatMap((old: unknown) => {
      if (!isPlainObject(old) || !isPlainObject(old.lead) || typeof old.lead.column !== 'string') return []
      const factors = (list: unknown, divides: boolean) =>
        (Array.isArray(list) ? list : []).flatMap((f) => termFrom25(f, divides) ?? [])
      const round = isPlainObject(old.lead.round) ? old.lead.round.decimals : undefined
      return [
        {
          key: old.key,
          lead: old.lead.column,
          terms: [...factors(old.numerator, false), ...factors(old.denominator, true)],
          decimals: typeof round === 'number' ? round : 2,
        },
      ]
    })
  }
}

function liftTo26(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'kanban' || !isPlainObject(node.values)) continue
    if (!Array.isArray(node.values.columns)) continue
    for (const column of node.values.columns) {
      if (!isPlainObject(column) || column.buttonKind !== undefined) continue
      column.buttonKind = typeof column.button === 'string' && column.button.trim() !== '' ? 'next' : 'none'
    }
  }
}

const ONE_LINE_TYPES_27 = ['formfield', 'date', 'button']
const ONE_LINE_ROWS_27 = 2

function liftTo27(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || typeof node.type !== 'string' || !isPlainObject(node.values)) continue
    if (ONE_LINE_TYPES_27.includes(node.type)) node.values.gridH = ONE_LINE_ROWS_27
  }
}

const STANDARD_LOOK_28 = { tone: 'neutral', emphasis: 'outline' }
const BUTTON_LOOKS_28: Readonly<Record<string, { tone: string; emphasis: string }>> = {
  standard: STANDARD_LOOK_28,
  primary: { tone: 'accent', emphasis: 'solid' },
  quiet: { tone: 'accent', emphasis: 'soft' },
  ghost: { tone: 'neutral', emphasis: 'text' },
}

function liftTo28(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'button' || !isPlainObject(node.values)) continue
    Object.assign(node.values, BUTTON_LOOKS_28[String(node.values.variant)] ?? STANDARD_LOOK_28)
    delete node.values.variant
  }
}

const TEXT_TONES_29: Readonly<Record<string, string>> = {
  petrol: 'accent',
  blue: 'info',
  green: 'success',
  ochre: 'warning',
  red: 'danger',
}

const HEAD_LOOK_29 = { tone: 'info', emphasis: 'soft' }

function liftTo29(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values)) continue
    const values = node.values
    if (node.type === 'text') {
      const tone = TEXT_TONES_29[String(values.color)]
      if (tone !== undefined) values.tone = tone
      delete values.color
    }
    if (node.type === 'area' && values.appearance === 'headed') {
      values.tone ??= HEAD_LOOK_29.tone
      values.emphasis = HEAD_LOOK_29.emphasis
    }
  }
}

function liftTo30(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'datalist' || !isPlainObject(node.values)) continue
    node.values.pick = 'several'
  }
}

const LABELLED_ROWS_31 = 3

function liftTo31(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'formfield' || !isPlainObject(node.values)) continue
    node.values.gridH = LABELLED_ROWS_31
    delete node.values.appearance
  }
}

const TEXT_SIZES_32: Readonly<Record<string, string>> = { 11: '12', 16: '17', 19: '22' }

function liftTo32(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'text' || !isPlainObject(node.values)) continue
    const size = TEXT_SIZES_32[String(node.values.size)]
    if (size !== undefined) node.values.size = size
  }
}

const LARGE_BUTTON_ROWS_33 = 3

function liftTo33(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'button' || !isPlainObject(node.values)) continue
    if (node.values.size === 'large') node.values.gridH = LARGE_BUTTON_ROWS_33
  }
}

const TEXT_SWITCHES_34 = [
  'oneLine',
  'bottom',
  'emptyDash',
  'redBelowZero',
  'figureFormat',
  'sumRule',
  'withoutChoice',
  'withoutHint',
]

function liftTo34(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'text' || !isPlainObject(node.values)) continue
    for (const key of TEXT_SWITCHES_34) delete node.values[key]
  }
}

function liftTo35(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'text' || !isPlainObject(node.values)) continue
    if (String(node.values.size) === '26') node.values.size = '30'
  }
}

const TEXT_LOOKS_36: Readonly<Record<string, { size: string; bold: boolean; right?: true }>> = {
  title: { size: '20', bold: true },
  heading: { size: '14', bold: true },
  amount: { size: '22', bold: true, right: true },
  body: { size: '13', bold: false },
  number: { size: '13', bold: false, right: true },
}
const QUIET_TEXT_36 = { size: '12', bold: false }
const DEFAULT_ROLE_36 = 'body'

const BUTTON_EMPHASES_36: Readonly<Record<string, string>> = { soft: 'outline', text: 'outline' }

function liftTo36(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values)) continue
    const values = node.values
    if (node.type === 'text') {
      const role = typeof values.variant === 'string' ? values.variant : DEFAULT_ROLE_36
      const look = TEXT_LOOKS_36[role] ?? QUIET_TEXT_36
      values.size = look.size
      values.bold = look.bold
      if (look.right) values.align = 'right'
      delete values.variant
    }
    if (node.type === 'area') {
      delete values.tone
      delete values.emphasis
    }
    if (node.type === 'button') {
      const emphasis = BUTTON_EMPHASES_36[String(values.emphasis)]
      if (emphasis !== undefined) values.emphasis = emphasis
    }
  }
}

type FieldNames37 = (binding: string) => string

function fieldNames37(sources: readonly unknown[], ownSource: unknown): FieldNames37 {
  const list = sources.filter(isPlainObject)
  return (binding) => {
    const { sourceId, code } = splitBinding(binding)
    const source = list.find((s) => s.id === (sourceId === '' ? ownSource : sourceId))
    const fields = Array.isArray(source?.fields) ? source.fields.filter(isPlainObject) : []
    const name = fields.find((f) => f.code === code)?.name
    return typeof name === 'string' ? name : ''
  }
}

function linesOf37(fields: unknown, labels: unknown, nameOf: FieldNames37, sum: boolean): Record<string, unknown>[] {
  const typed = typeof labels === 'string' && labels !== '' ? labels.split(' · ').map((l) => l.trim()) : []
  const codes =
    typeof fields === 'string' ? fields.split(fields.includes(' · ') ? ' · ' : ' ').filter((f) => f.trim() !== '') : []
  return codes.map((field, i) => ({
    label: typed[i] || nameOf(field),
    field,
    amount: true,
    ...(sum ? { sum: true } : {}),
    ...(typed[i] ? { labelTyped: true } : {}),
  }))
}

function liftTo37(tree: unknown, sources: readonly unknown[]): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'sums' || !isPlainObject(node.values)) continue
    const values = node.values
    const nameOf = fieldNames37(sources, values.source)
    values.lines = [
      ...linesOf37(values.linesField, values.labels, nameOf, false),
      ...linesOf37(values.totalField, values.totalLabel, nameOf, true),
    ]
    delete values.linesField
    delete values.labels
    delete values.totalField
    delete values.totalLabel
    node.type = 'valuelist'
  }
}

function liftTo38(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'text' || !isPlainObject(node.values)) continue
    const values = node.values
    if (values.appearance === 'line') {
      values.border = 'line'
    } else if (values.showLabel === true && typeof values.textField === 'string' && values.textField.trim() !== '') {
      values.border = 'box'
    }
    delete values.appearance
  }
}

function liftTo39(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'datalist' || !isPlainObject(node.values)) continue
    if (node.values.pick === 'several') node.values.pick = 'one'
  }
}

// The area of 26.10.2026: its five forms become three kinds and a switch.
const AREA_KINDS_40: Readonly<Record<string, string>> = {
  plain: 'plain',
  box: 'card',
  headed: 'headed',
  fold: 'headed',
  band: 'card',
}

function liftTo40(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'area' || !isPlainObject(node.values)) continue
    const values = node.values
    const appearance = String(values.appearance ?? 'box')
    values.kind = AREA_KINDS_40[appearance] ?? 'headed'
    if (appearance === 'fold') values.foldable = true
    delete values.appearance
  }
}

export function liftState(raw: unknown, knownSources: readonly unknown[] = []): Record<string, unknown> | null {
  if (!isPlainObject(raw) || typeof raw.schemaVersion !== 'number') return null
  if (raw.schemaVersion !== CURRENT_SCHEMA_VERSION && !LIFTABLE.includes(raw.schemaVersion)) return null
  const lifted = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
  if (raw.schemaVersion < 21) liftTo21(lifted.tree)
  if (raw.schemaVersion < 22) liftTo22(lifted.tree)
  if (raw.schemaVersion < 23) liftTo23(lifted.tree)
  if (raw.schemaVersion < 24) liftTo24(lifted.tree)
  if (raw.schemaVersion < 25) liftTo25(lifted.tree)
  if (raw.schemaVersion < 26) liftTo26(lifted.tree)
  if (raw.schemaVersion < 27) liftTo27(lifted.tree)
  if (raw.schemaVersion < 28) liftTo28(lifted.tree)
  if (raw.schemaVersion < 29) liftTo29(lifted.tree)
  if (raw.schemaVersion < 30) liftTo30(lifted.tree)
  if (raw.schemaVersion < 31) liftTo31(lifted.tree)
  if (raw.schemaVersion < 32) liftTo32(lifted.tree)
  if (raw.schemaVersion < 33) liftTo33(lifted.tree)
  if (raw.schemaVersion < 34) liftTo34(lifted.tree)
  if (raw.schemaVersion < 35) liftTo35(lifted.tree)
  if (raw.schemaVersion < 36) liftTo36(lifted.tree)
  if (raw.schemaVersion < 37) {
    liftTo37(lifted.tree, [...(Array.isArray(lifted.dataSources) ? lifted.dataSources : []), ...knownSources])
  }
  if (raw.schemaVersion < 38) liftTo38(lifted.tree)
  if (raw.schemaVersion < 39) liftTo39(lifted.tree)
  if (raw.schemaVersion < 40) liftTo40(lifted.tree)
  lifted.schemaVersion = CURRENT_SCHEMA_VERSION
  return lifted
}
