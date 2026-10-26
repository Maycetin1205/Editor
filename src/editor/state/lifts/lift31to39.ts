import { splitBinding } from '../../../core/block/binding'
import { isPlainObject } from './plain'

// Schema steps 31 to 39.

const LABELLED_ROWS_31 = 3

export function liftTo31(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'formfield' || !isPlainObject(node.values)) continue
    node.values.gridH = LABELLED_ROWS_31
    delete node.values.appearance
  }
}

const TEXT_SIZES_32: Readonly<Record<string, string>> = { 11: '12', 16: '17', 19: '22' }

export function liftTo32(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'text' || !isPlainObject(node.values)) continue
    const size = TEXT_SIZES_32[String(node.values.size)]
    if (size !== undefined) node.values.size = size
  }
}

const LARGE_BUTTON_ROWS_33 = 3

export function liftTo33(tree: unknown): void {
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

export function liftTo34(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'text' || !isPlainObject(node.values)) continue
    for (const key of TEXT_SWITCHES_34) delete node.values[key]
  }
}

export function liftTo35(tree: unknown): void {
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

export function liftTo36(tree: unknown): void {
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

export function liftTo37(tree: unknown, sources: readonly unknown[]): void {
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

export function liftTo38(tree: unknown): void {
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

export function liftTo39(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'datalist' || !isPlainObject(node.values)) continue
    if (node.values.pick === 'several') node.values.pick = 'one'
  }
}
