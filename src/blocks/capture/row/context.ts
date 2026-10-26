import { splitBinding } from '../../../core/block/blockType'
import type { Calculation } from '../../../core/data/calculation'
import type { KeyPair } from '../../../core/data/extraSources'
import type { Split } from '../../../core/data/split'
import { extraSourcesOf } from '../../../runtime/foreignSources'
import { maskHost } from '../../../runtime/host'
import { windowColumnsOr } from '../../lookup/lookup'
import { FIELD_KEY_PREFIX, type Column } from '../../parts/column'
import type { CaptureColumn } from '../column'

// A cell is typed freely, or fills from the block's own source, or from a
// linked helper source.
type CellKind = 'free' | 'own' | 'linked'

interface CellTarget {
  kind: CellKind

  sourceId: string

  code: string
}

// What the typing row needs to know of its block to fill its cells.
export interface CaptureContext {
  block?: HTMLElement
  columns: readonly CaptureColumn[]

  calculations: readonly Calculation[]

  sourceId: string

  pairsTo: (sourceId: string) => readonly KeyPair[]

  partnerOf: (sourceId: string) => string

  split?: Split
}

export function cellTargetOf(column: CaptureColumn | undefined, tablesSourceId: string): CellTarget {
  const fill = (column?.fillField ?? '').trim()
  const field = fill !== '' ? fill : (column?.field ?? '').trim()
  if (field === '') return { kind: 'free', sourceId: '', code: '' }
  const { sourceId, code } = splitBinding(field)
  if (sourceId === '') return { kind: 'own', sourceId: tablesSourceId, code }
  return { kind: 'linked', sourceId, code }
}

export function captureContext(
  block: HTMLElement,
  columns: readonly CaptureColumn[],
  sourceId: string,
  calculations: readonly Calculation[],
  split?: Split,
): CaptureContext {
  const left = extraSourcesOf(block)
  const helper = split !== undefined && left.some((v) => v.sourceId === split.sourceId) ? split : undefined
  return {
    block,
    columns,
    calculations,
    sourceId,
    ...(helper === undefined ? {} : { split: helper }),
    pairsTo: (id) => left.find((v) => v.sourceId === id)?.pairs ?? [],
    partnerOf: (id) => left.find((v) => v.sourceId === id)?.partnerId ?? '',
  }
}

export function targetIn(context: CaptureContext, index: number): CellTarget {
  return cellTargetOf(context.columns[index], context.sourceId)
}

export function linkedSourcesIn(context: CaptureContext): string[] {
  const out: string[] = []
  for (const column of context.columns) {
    const target = cellTargetOf(column, context.sourceId)
    if (target.kind !== 'linked' || target.sourceId === '') continue
    if (!out.includes(target.sourceId)) out.push(target.sourceId)
  }
  return out
}

export function displayColumnIn(context: CaptureContext, index: number): { title: string; code: string } | undefined {
  const target = targetIn(context, index)
  if (target.sourceId === '' || target.code === '') return undefined
  for (let i = 0; i < context.columns.length; i++) {
    if (i === index) continue
    const column = context.columns[i]
    const other = cellTargetOf(column, context.sourceId)
    if (other.sourceId !== target.sourceId) continue
    if (other.code === '' || other.code === target.code) continue
    return { title: column.title, code: other.code }
  }
  return undefined
}

export function sameSourceCodes(context: CaptureContext, index: number): string[] {
  const target = targetIn(context, index)
  if (target.sourceId === '') return []
  const codes: string[] = []
  for (const column of context.columns) {
    const other = cellTargetOf(column, context.sourceId)
    if (other.sourceId === target.sourceId && other.code !== '' && !codes.includes(other.code)) {
      codes.push(other.code)
    }
  }
  return codes
}

export function windowColumnsIn(context: CaptureContext, index: number): Column[] {
  return windowColumnsOr(context.columns[index]?.windowColumns, () => automaticColumnsIn(context, index))
}

function automaticColumnsIn(context: CaptureContext, index: number): Column[] {
  const target = targetIn(context, index)
  if (target.kind !== 'linked' || target.sourceId === '' || target.code === '') return []
  return [{ key: `${FIELD_KEY_PREFIX}${target.code}`, title: context.columns[index]?.title ?? '', field: target.code }]
}

export function fittingRecords(
  pairs: readonly KeyPair[],
  keyValue: (pair: KeyPair) => string | undefined,
  candidates: readonly unknown[],
): unknown[] {
  const known = pairs
    .map((p) => ({ toField: p.toField, expected: keyValue(p) }))
    .filter((b): b is { toField: string; expected: string } => b.expected !== undefined)
  if (known.length === 0) return [...candidates]
  return candidates.filter((record) =>
    known.every((b) => b.expected !== '' && b.expected === maskHost().readField(record, b.toField)),
  )
}
