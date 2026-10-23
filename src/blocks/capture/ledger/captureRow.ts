import { columnSlots, rowValues } from '../../../core/data/calculation'
import { asNumber } from '../../../core/data/number'
import type { KeyPair } from '../../../core/data/extraSources'
import { outsideValue } from '../../../runtime/foreignSources'
import { maskState } from '../../../runtime/maskState'
import { columnWithKey, type Column } from '../../parts/column'
import { walkOrder, type RowLayout } from '../../parts/cell'
import { plainText, rowFits } from '../../parts/cellSearch'
import {
  automaticColumns,
  entryWindowSize,
  lookupEntries,
  sourceCame,
  sourcesRows,
  type Entry,
} from '../../lookup/lookup'
import { orderedSuggestions } from '../../lookup/suggestionList'
import { SuggestionState, type KeyAction } from '../../lookup/suggestionState'
import { splitRows, SplitState, type SplitPick } from './split'
import {
  cellTargetOf,
  displayColumnIn,
  fittingRecords,
  linkedSourcesIn,
  missingRequired,
  neighbourSlot,
  sameSourceCodes,
  targetIn,
  windowColumnsIn,
  type CaptureContext,
} from '../row'

export interface Helpers {
  chosen: ReadonlyMap<string, unknown>
  byHand: ReadonlySet<string>
  picks: readonly SplitPick[]
}

type SplitOpening = 'none' | 'open' | 'waits'

export interface LookupSpot {
  spot: string

  sourceId: string

  field: string

  title: string

  columns: readonly Column[]

  entries: readonly Entry[]

  searchText: string

  width: number

  height: number
}

interface CaptureRowHost {
  block: HTMLElement

  context: () => CaptureContext

  layout: () => RowLayout

  report: () => void

  focusCell: (index: number) => void
}

export class CaptureRow {
  private readonly host: CaptureRowHost

  private readonly typed = new Map<number, string>()

  private readonly chosen = new Map<string, unknown>()

  private readonly byHand = new Set<string>()

  private readonly held = new Set<number>()

  private readonly waiting = new Set<number>()

  private captureAsked = false

  private readonly list = new SuggestionState<Entry>()

  private computed = new Map<number, string>()

  private cursorColumn = -1

  readonly split = new SplitState()

  private picks: SplitPick[] = []

  private splitDone = false

  constructor(host: CaptureRowHost) {
    this.host = host
  }

  get typingColumn(): number {
    return this.cursorColumn
  }

  isHeld(index: number): boolean {
    return this.held.has(index)
  }

  get waits(): boolean {
    return this.waiting.size > 0
  }

  askCapture(): void {
    this.captureAsked = true
  }

  get mark(): number {
    return this.list.mark
  }

  get suggestions(): readonly Entry[] {
    return this.list.hit
  }

  get touched(): boolean {
    return this.chosen.size > 0 || [...this.typed.values()].some((text) => text !== '')
  }

  rowView(): { value: string; automatic: boolean; held: boolean }[] {
    const context = this.host.context()
    return context.columns.map((_, index) => {
      const typed = this.typed.get(index)
      const computed = typed === '' && this.computed.has(index)
      const value = this.valueIn(context, index)
      return {
        value,
        automatic: (typed === undefined || computed) && value !== '',
        held: this.held.has(index),
      }
    })
  }

  valueIn(context: CaptureContext, index: number): string {
    const typed = this.typed.get(index)
    if (typed !== undefined && typed !== '') return typed
    return this.computed.get(index) ?? this.givenIn(context, index)
  }

  private givenIn(context: CaptureContext, index: number): string {
    const typed = this.typed.get(index)
    if (typed !== undefined) return typed
    const target = targetIn(context, index)
    if (target.sourceId === '' || target.code === '') return ''
    const record = this.chosen.get(target.sourceId)
    return record === undefined ? '' : maskState.host.readField(record, target.code)
  }

  type(index: number, text: string): void {
    this.splitDone = false
    this.typed.set(index, text)
    this.held.delete(index)
    this.waiting.delete(index)
    this.captureAsked = false
    this.cursorColumn = index
    this.list.restart()
    this.host.report()
  }

  leave(index: number): void {
    if (this.cursorColumn === index) {
      this.settle(index)
      this.cursorColumn = -1
      this.list.idle()
    }
    this.host.report()
  }

  settle(index: number): void {
    const context = this.host.context()
    const typed = (this.typed.get(index) ?? '').trim()
    const target = targetIn(context, index)
    if (typed === '' || target.kind !== 'linked') return
    if (!sourceCame(target.sourceId)) {
      this.waiting.add(index)
      return
    }
    this.waiting.delete(index)
    const wanted = plainText(typed)
    const exact = this.entriesIn(context, index).filter((e) => plainText(e.value.trim()) === wanted)
    if (exact.length === 1) this.take(context, index, exact[0].record)
    else this.held.add(index)
    if (this.cursorColumn === index) {
      this.cursorColumn = -1
      this.list.idle()
    }
    this.host.report()
  }

  holdBack(): number {
    const context = this.host.context()
    const order = walkOrder(this.host.layout())
    const held = order.find((slot) => this.held.has(slot))
    if (held !== undefined) return held
    const values = context.columns.map((_, i) => this.valueIn(context, i))
    const missing = missingRequired(context.columns, values, order)
    if (missing !== -1) this.held.add(missing)
    return missing
  }

  empty(index: number): void {
    const context = this.host.context()
    this.splitDone = false
    this.typed.delete(index)
    this.held.delete(index)
    this.waiting.delete(index)
    this.captureAsked = false
    const target = targetIn(context, index)
    if (target.sourceId !== '' && this.chosen.has(target.sourceId)) {
      this.choose(context, target.sourceId, undefined)
      this.syncChosen(context)
    }
    this.list.restart()
    this.host.report()
  }

  setMark(mark: number): void {
    this.list.setMark(mark)
    this.host.report()
  }

  decideKey(index: number, key: string): KeyAction {
    const context = this.host.context()
    const target = targetIn(context, index)
    const action = this.list.actionFor(key, {
      listOpen: this.cursorColumn === index && this.list.open,
      fieldEmpty: this.valueIn(context, index) === '',
      typed: this.typed.get(index) !== undefined,
      lookupable: target.kind === 'linked',
      hasRecords: () => this.entriesIn(context, index).length > 0,
      jumps: true,
    })
    if (action !== 'nothing') this.host.report()
    return action
  }

  neighbour(from: number, direction: 1 | -1): number {
    const view = this.rowView()
    const typed = walkOrder(this.host.layout()).filter((slot) => view[slot]?.automatic !== true)
    return neighbourSlot(typed, from, direction)
  }

  get firstCell(): number {
    return walkOrder(this.host.layout())[0] ?? 0
  }

  get openCell(): number {
    const order = walkOrder(this.host.layout())
    const held = order.find((slot) => this.held.has(slot))
    if (held !== undefined) return held
    const view = this.rowView()
    const open = order
      .find((slot) => view[slot]?.automatic !== true && (view[slot]?.value ?? '') === '')
    return open ?? this.firstCell
  }

  waitingSources(): Map<number, string> {
    const context = this.host.context()
    const named = new Map<number, string>()
    const seen = new Set<string>()
    for (const slot of walkOrder(this.host.layout())) {
      const target = targetIn(context, slot)
      if (target.kind !== 'linked' || seen.has(target.sourceId)) continue
      if (sourceCame(target.sourceId)) {
        seen.add(target.sourceId)
        continue
      }
      if (this.valueIn(context, slot) !== '') continue
      seen.add(target.sourceId)
      named.set(slot, maskState.host.source(target.sourceId)?.name ?? '')
    }
    return named
  }

  lookupAt(index: number): LookupSpot | null {
    const context = this.host.context()
    const column = context.columns[index]
    const target = targetIn(context, index)
    if (column === undefined || target.sourceId === '' || target.code === '') return null
    if (target.kind === 'linked' && (sourcesRows(target.sourceId)?.length ?? 0) === 0) return null
    return {
      spot: column.key,
      sourceId: target.sourceId,
      field: target.code,
      title: column.title,
      columns: windowColumnsIn(context, index),
      entries: this.entriesIn(context, index),
      searchText: this.valueIn(context, index),
      ...entryWindowSize(column, this.windowColumnsAt(index).length),
    }
  }

  adoptSuggestion(index: number, listIndex: number): void {
    const hit = this.list.hit[listIndex]
    if (hit === undefined) return
    this.adopt(index, hit.record)
  }

  adopt(index: number, record: unknown): void {
    this.take(this.host.context(), index, record)
    this.cursorColumn = -1
    this.list.idle()
    this.host.report()
  }

  private take(context: CaptureContext, index: number, record: unknown): void {
    const target = targetIn(context, index)
    if (target.sourceId === '') return
    this.splitDone = false
    this.choose(context, target.sourceId, record)
    this.byHand.add(target.sourceId)
    if (target.kind === 'own') {
      for (const id of [...this.chosen.keys()]) {
        if (id !== target.sourceId) this.choose(context, id, undefined)
      }
    }
    this.syncChosen(context)
  }

  private entriesIn(context: CaptureContext, index: number): Entry[] {
    const target = targetIn(context, index)
    if (target.kind !== 'linked' || target.sourceId === '' || target.code === '') return []
    const rows = sourcesRows(target.sourceId)
    if (rows === null) return []
    const records = this.possible(context, target.sourceId, rows)
    return lookupEntries(records, displayColumnIn(context, index)?.code ?? '', target.code)
  }

  refresh(): boolean {
    const context = this.host.context()
    let came = false
    const split = context.split
    if (this.split.loading && split !== undefined && sourceCame(split.sourceId)) {
      if (this.openSplit(context) === 'none') {
        this.split.stop()
        this.captureAsked = false
        this.compute(context)
        return true
      }
    }
    for (const index of [...this.waiting]) {
      if (!sourceCame(targetIn(context, index).sourceId)) continue
      this.settle(index)
      came = true
    }
    this.compute(context)
    this.list.show(this.suggestionsFor(context))
    if (!came || !this.captureAsked || this.waits) return false
    this.captureAsked = false
    return true
  }

  private suggestionsFor(context: CaptureContext): Entry[] {
    const index = this.cursorColumn
    if (this.list.closed || targetIn(context, index).kind === 'free') return []
    const typed = this.typed.get(index) ?? ''
    if (typed === '') return []
    const codes = sameSourceCodes(context, index)
    const texts = (e: Entry): string[] => [
      e.display, e.value, ...codes.map((code) => maskState.host.readField(e.record, code)),
    ]
    const entries = this.entriesIn(context, index)
    const hit = typed.trim() === '' ? entries : entries.filter((e) => rowFits(texts(e), typed))
    return orderedSuggestions(hit, typed, texts)
  }

  typedAt(index: number): string {
    return this.typed.get(index) ?? ''
  }

  windowColumnsAt(index: number): Column[] {
    const context = this.host.context()
    const own = windowColumnsIn(context, index)
    if (own.length > 0) return own
    const target = targetIn(context, index)
    return automaticColumns({ storageField: target.code, storageTitle: context.columns[index]?.title ?? '' })
  }

  compute(context: CaptureContext): void {
    this.computed = rowValues(
      context.calculations,
      (key) => columnWithKey(context.columns, key),
      (slot) => this.givenIn(context, slot),
      (sourceId, field) => {
        const record = this.chosen.get(sourceId ?? context.sourceId)
        return record === undefined ? '' : maskState.host.readField(record, field)
      },
    )
  }

  private choose(context: CaptureContext, sourceId: string, record: unknown): void {
    if (record === undefined) {
      this.chosen.delete(sourceId)
      this.byHand.delete(sourceId)
    } else this.chosen.set(sourceId, record)
    for (let i = 0; i < context.columns.length; i++) {
      if (cellTargetOf(context.columns[i], context.sourceId).sourceId === sourceId) {
        this.typed.delete(i)
        this.held.delete(i)
        this.waiting.delete(i)
      }
    }
  }

  private keyValue(
    context: CaptureContext,
    partnerId: string,
    field: string,
    except: string,
  ): string | undefined {
    if (partnerId !== '' && partnerId !== context.sourceId) {
      const record = this.chosen.get(partnerId)
      return record === undefined ? '' : maskState.host.readField(record, field)
    }
    const base = this.chosen.get(context.sourceId)
    if (base !== undefined) return maskState.host.readField(base, field)
    for (const sourceId of linkedSourcesIn(context)) {
      if (sourceId === except || !this.byHand.has(sourceId)) continue

      const partner = context.partnerOf(sourceId)
      if (partner !== '' && partner !== context.sourceId) continue
      const record = this.chosen.get(sourceId)
      if (record === undefined) continue
      for (const pair of context.pairsTo(sourceId)) {
        if (pair.from !== undefined || pair.fromField !== field) continue
        const value = maskState.host.readField(record, pair.toField)
        if (value !== '') return value
      }
    }
    return undefined
  }

  private pairValue(
    context: CaptureContext,
    partnerId: string,
    pair: KeyPair,
    except: string,
  ): string | undefined {
    return outsideValue(pair, this.host.block) ?? this.keyValue(context, partnerId, pair.fromField, except)
  }

  private possible(context: CaptureContext, sourceId: string, rows: readonly unknown[]): unknown[] {
    const partnerId = context.partnerOf(sourceId)
    return fittingRecords(
      context.pairsTo(sourceId),
      (pair) => this.pairValue(context, partnerId, pair, sourceId),
      rows,
    )
  }

  private syncChosen(context: CaptureContext): void {
    const sources = linkedSourcesIn(context)
    for (let round = 0; round <= sources.length; round++) {
      let moved = false
      for (const sourceId of sources) {
        const pairs = context.pairsTo(sourceId)
        if (pairs.length === 0) continue
        const partnerId = context.partnerOf(sourceId)
        const record = this.chosen.get(sourceId)
        if (record !== undefined) {
          const fits = pairs.every((p) => {
            const expected = this.pairValue(context, partnerId, p, sourceId)
            return expected === undefined || (expected !== '' && expected === maskState.host.readField(record, p.toField))
          })
          if (!fits) {
            this.choose(context, sourceId, undefined)
            moved = true
          }
          continue
        }
        if (!pairs.some((p) => this.pairValue(context, partnerId, p, sourceId) !== undefined)) continue
        const rows = sourcesRows(sourceId)
        if (rows === null) continue
        const fitting = this.possible(context, sourceId, rows)
        if (fitting.length === 1) {
          this.choose(context, sourceId, fitting[0])
          this.byHand.delete(sourceId)
          moved = true
        }
      }
      if (!moved) break
    }
  }

  adoptRow(context: CaptureContext, values: readonly string[], helpers: Helpers): void {
    this.clear()
    values.forEach((value, index) => {
      if (value !== '') this.typed.set(index, value)
    })
    for (const [sourceId, record] of helpers.chosen) this.choose(context, sourceId, record)
    for (const sourceId of helpers.byHand) this.byHand.add(sourceId)
    this.picks = [...helpers.picks]
    this.yieldToComputed(context)
    this.compute(context)
  }

  private yieldToComputed(context: CaptureContext): void {
    const slots = columnSlots(
      context.calculations,
      (key) => columnWithKey(context.columns, key),
    )
    for (const index of slots) {
      const value = this.typed.get(index)
      if (value === undefined || value === '') continue
      this.typed.delete(index)
      this.compute(context)
      if (this.computed.get(index) !== value) this.typed.set(index, value)
    }
  }

  helpersNow(): Helpers {
    return { chosen: new Map(this.chosen), byHand: new Set(this.byHand), picks: [...this.picks] }
  }

  openSplit(context: CaptureContext): SplitOpening {
    const split = context.split
    if (split === undefined || this.splitDone) return 'none'
    const amountAt = context.columns.findIndex((c) => c.key === split.amountColumn)
    const total = amountAt === -1 ? null : asNumber(this.valueIn(context, amountAt))
    if (!sourceCame(split.sourceId)) {
      this.split.start(split, [], total, this.picks, true)
      return 'waits'
    }
    const rows = splitRows(split, this.possible(context, split.sourceId, sourcesRows(split.sourceId) ?? []))
    if (rows.length === 0) {
      this.picks = []
      return 'none'
    }
    this.split.start(split, rows, total, this.picks)
    return 'open'
  }

  closeSplit(): void {
    if (!this.split.open) return
    if (!this.split.loading) this.picks = this.split.picked()
    this.split.stop()
  }

  confirmSplit(): void {
    this.picks = this.split.picked()
    this.splitDone = true
    this.split.stop()
  }

  clear(): void {
    this.split.stop()
    this.picks = []
    this.splitDone = false
    this.typed.clear()
    this.chosen.clear()
    this.byHand.clear()
    this.held.clear()
    this.waiting.clear()
    this.captureAsked = false
    this.computed.clear()
    this.cursorColumn = -1
    this.list.idle()
  }
}
