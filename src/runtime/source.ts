import { bindingFields, bindingJoiner } from '../core/block/binding'
import { DAY_FIELD_PROPERTY, SOURCE_PROPERTY } from '../core/block/sharedProperties'
import { readDeclared } from '../core/block/registry'
import { BLOCK_ID_ATTR } from '../core/data/actions'
import type { RuntimeSource } from '../core/data/dataSources'
import { positionIdentity } from '../core/data/positions'
import { maskHost } from './host'
import { followsFormField, onSelectionList, traitOf } from './selection'
import { keyedByFormField, makeFieldReader, type FieldReader } from './foreignSources'
import { onChosenDay, chosenDay, dayKey } from './chosenDay'
import { wireFetchingSources } from './fetchingSources'

export function sourceIdOf(el: Element): string {
  return readDeclared(el, SOURCE_PROPERTY) ?? ''
}

export function recordOf(source: RuntimeSource, row: unknown): string {
  return source.recordField === '' ? '' : maskHost().readField(row, source.recordField)
}

export function identityOf(source: RuntimeSource | undefined, row: unknown): string {
  if (!source) return ''
  return positionIdentity(source.tableId, row, maskHost().readField) || recordOf(source, row)
}

function rowsAtDay(rows: readonly unknown[], dayCode: string, day: string): unknown[] {
  if (dayCode === '' || day === '') return [...rows]
  return rows.filter((row) => dayKey(maskHost().readField(row, dayCode)) === day)
}

export interface DataPreamble {
  source: RuntimeSource

  rows: unknown[]

  read: FieldReader
}

export function readDataPreamble(el: HTMLElement): DataPreamble | null {
  const sourceId = sourceIdOf(el)
  if (sourceId === '') return null
  const source = maskHost().source(sourceId)
  if (!source) return null
  const rows = rowsAtDay(maskHost().rows(source), readDeclared(el, DAY_FIELD_PROPERTY) ?? '', chosenDay())
  return { source, rows, read: makeFieldReader(el) }
}

export function spotValue(typed: string, binding: string, row: unknown, read: FieldReader): string {
  if (binding === '') return typed
  return bindingFields(binding)
    .map((field) => read(row, field))
    .filter((v) => v.trim() !== '')
    .join(bindingJoiner(binding))
}

export function rowKeys(source: RuntimeSource | undefined, rows: readonly unknown[]): string[] {
  const identities = rows.map((row) => identityOf(source, row))
  const identityCount = new Map<string, number>()
  for (const identity of identities) {
    if (identity !== '') identityCount.set(identity, (identityCount.get(identity) ?? 0) + 1)
  }
  const occurrences = new Map<string, number>()
  return rows.map((row, i) => {
    const identity = identities[i]
    const unique = identity !== '' && identityCount.get(identity) === 1
    const base = JSON.stringify([source?.id ?? '', unique ? 'record' : 'content', unique ? identity : traitOf(row)])
    const number = occurrences.get(base) ?? 0
    occurrences.set(base, number + 1)
    return `${base}:${number}`
  })
}

interface DataLink<T extends HTMLElement> {
  connect: (el: T) => void

  disconnect: (el: T) => void
}

export function makeDataLink<T extends HTMLElement>(opts: {
  hydrate: (el: T, delivery: boolean) => void

  wire?: (el: T) => void
}): DataLink<T> {
  const elements = new Set<T>()
  let registered = false

  const hydrateAll = (delivery: boolean): void => {
    if (!maskHost().hasData()) return
    elements.forEach((el) => {
      opts.hydrate(el, delivery)
    })
  }

  const connect = (el: T): void => {
    elements.add(el)
    opts.wire?.(el)

    if (!registered) {
      registered = true
      maskHost().onData(hydrateAll)

      onChosenDay(() => {
        hydrateAll(false)
      })

      onSelectionList(() => {
        hydrateAll(false)
      })

      el.ownerDocument.addEventListener(
        'change',
        (e) => {
          const blockId = e.target instanceof Element ? e.target.getAttribute(BLOCK_ID_ATTR) : null
          if (blockId === null || !maskHost().hasData()) return
          elements.forEach((other) => {
            if (keyedByFormField(other, blockId) || followsFormField(other, blockId)) opts.hydrate(other, false)
          })
        },
        true,
      )

      wireFetchingSources()
    }
    maskHost().start()

    if (maskHost().hasData()) opts.hydrate(el, false)
  }

  const disconnect = (el: T): void => {
    elements.delete(el)
  }

  return { connect, disconnect }
}
