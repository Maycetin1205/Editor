import type { BlockType } from '../core/block/blockType'
import type { PropertyValue } from '../core/block/property'
import { capability, hasCapability } from '../core/block/capability'
import { allBlockTypes, readDeclared } from '../core/block/registry'
import { propertyVisible } from '../core/block/property'
import { SOURCE_PROP, SOURCE_PROPERTY } from '../core/block/sourceProperty'
import { BLOCK_ID_ATTR } from '../core/data/actions'
import type { RuntimeSource } from '../core/data/dataSources'
import { DELIVERY_KINDS, deliveryAdapter } from '../core/data/deliveries/deliveries'
import { extraSourcesProperty } from '../core/data/extraSources'
import { extraSourcesOf } from './foreignSources'
import { warn } from './log'
import { loadEnded, loadStarted } from './notice'
import { onSelectionList, selectionFor, selectionGiverOf, selectionNumber, traitOf } from './selection'
import { maskHost } from './host'

// What was fetched with which parameters, what loads silently, what runs.
const state = {
  lastPrint: new Map<string, string>(),
  silentLoaded: new Map<string, Set<string>>(),
  running: new Map<string, Promise<void>>(),
  // Sources no block shows before a selection: fetched when first needed.
  deferred: new Set<string>(),
  wired: false,
}

function defsWithRecordChoice(): Map<string, BlockType> {
  const map = new Map<string, BlockType>()
  for (const def of allBlockTypes()) {
    if (hasCapability(def, 'recordChoice')) map.set(def.tag.toLowerCase(), def)
  }
  return map
}

function sourcesAttrFor(el: Element, def: BlockType): string {
  const choice = capability(def, 'recordChoice')
  if (!choice) return ''
  let active = true
  if (choice.when) {
    const name = choice.when.key
    const declared = def.properties[name]
    const value = declared?.type.fromAttribute(el.getAttribute(declared.attribute), declared.default)
    active = propertyVisible(choice.when, { [name]: value as PropertyValue })
  }
  const prop = active ? (choice.sourceProp ?? SOURCE_PROP) : SOURCE_PROP
  return def.properties[prop]?.attribute ?? ''
}

function chosenRowOfSource(
  sourceId: string,
  defsPerTag: Map<string, BlockType>,
  root: ParentNode | undefined = typeof document === 'undefined' ? undefined : document,
): { row: unknown; giver: boolean } {
  if (sourceId === '' || root === undefined) return { row: undefined, giver: false }
  let newest: { row: unknown; number: number } | null = null
  let giver = false
  for (const el of Array.from(root.querySelectorAll(`[${BLOCK_ID_ATTR}]`))) {
    const def = defsPerTag.get(el.tagName.toLowerCase())
    if (!def) continue
    const attr = sourcesAttrFor(el, def)
    if (attr === '' || el.getAttribute(attr) !== sourceId) continue
    for (const giverId of selectionGiverOf(el as HTMLElement)) {
      giver = true
      const row = selectionFor(giverId)
      if (row === undefined) continue
      const number = selectionNumber(giverId)
      if (newest === null || number > newest.number) newest = { row, number }
    }
  }
  return { row: newest?.row, giver }
}

function mayLoad(sourceId: string, print: string, byControls: boolean): boolean {
  const { lastPrint, silentLoaded } = state
  if (lastPrint.get(sourceId) === print) return false
  if (byControls) {
    silentLoaded.set(sourceId, new Set([print]))
  } else {
    const track = silentLoaded.get(sourceId) ?? new Set<string>()
    if (track.has(print)) return false
    track.add(print)
    silentLoaded.set(sourceId, track)
  }
  lastPrint.set(sourceId, print)
  return true
}

function choicePrint(source: RuntimeSource): string | null {
  const parameter = source.delivery.kind === 'relationValue' ? source.delivery.get.parameter : []
  if (!parameter.some((binding) => binding.source === 'chosenRow')) return null
  const values = { context: {}, previousResult: '', chosenRow: selectionFor }
  return JSON.stringify(parameter.map((binding) => maskHost().resolveParameter(binding, values)))
}

function loadOnChoice(source: RuntimeSource): void {
  const print = choicePrint(source)
  if (print === null || state.lastPrint.get(source.id) === print) return
  state.lastPrint.set(source.id, print)
  load(source, undefined)
}

export function sourceSettled(sourceId: string): Promise<void> {
  if (state.deferred.has(sourceId)) return ensureSource(sourceId)
  const source = maskHost().source(sourceId)
  if (source) loadOnChoice(source)
  return state.running.get(sourceId) ?? Promise.resolve()
}

function checkFetchingSources(byControls: boolean): void {
  loadNeeded()
  const defsPerTag = defsWithRecordChoice()
  const host = maskHost()
  for (const source of host.sources()) {
    loadOnChoice(source)
    if (deliveryAdapter(source.delivery.kind).fetchOn !== 'selection') continue
    const { row, giver } = chosenRowOfSource(source.id, defsPerTag)

    if (!giver) continue
    if (!mayLoad(source.id, traitOf(row), byControls)) continue
    load(source, row)
  }
}

function showingSource(sourceId: string): HTMLElement[] {
  if (typeof document === 'undefined') return []
  return Array.from(document.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`)).filter(
    (el) =>
      readDeclared(el, SOURCE_PROPERTY) === sourceId || extraSourcesOf(el).some((extra) => extra.sourceId === sourceId),
  )
}

function load(source: RuntimeSource, giverRow: unknown): void {
  const showing = showingSource(source.id)
  showing.forEach(loadStarted)
  const ended = (): void => {
    showing.forEach(loadEnded)
  }
  const running = maskHost()
    .fetchRows(source, giverRow, selectionFor)
    .then(ended, (error: unknown) => {
      warn(`Quelle "${source.name}" nicht geladen`, error)
      ended()
    })
  state.running.set(source.id, running)
}

const EXTRA_SOURCES_ATTR = extraSourcesProperty.attribute

function blocksInMask(): HTMLElement[] {
  if (typeof document === 'undefined') return []
  return Array.from(document.getElementsByTagName('*')).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.tagName.startsWith('FF-'),
  )
}

// A block names a source by its own source or a lookup source; the extra
// sources of a capture do not count as naming.
function namesSource(el: HTMLElement, sourceId: string): boolean {
  return Array.from(el.attributes).some(
    (a) => a.name !== EXTRA_SOURCES_ATTR && a.name.endsWith('source') && a.value === sourceId,
  )
}

function blocksNaming(sourceId: string): HTMLElement[] {
  return blocksInMask().filter((el) => namesSource(el, sourceId))
}

// A source may wait when no block shows it before a selection: it serves a
// capture as an extra source, or every block naming it follows a selection.
function mayWait(source: RuntimeSource): boolean {
  const named = blocksNaming(source.id)
  const helps = blocksInMask().some(
    (el) => !namesSource(el, source.id) && extraSourcesOf(el).some((extra) => extra.sourceId === source.id),
  )
  if (!helps && named.length === 0) return false
  return named.every((el) => selectionGiverOf(el).length > 0)
}

// A waiting source is needed once a block naming it has its selection.
function neededNow(sourceId: string): boolean {
  return blocksNaming(sourceId).some((el) =>
    selectionGiverOf(el).some((giverId) => selectionFor(giverId) !== undefined),
  )
}

function loadNeeded(): void {
  for (const sourceId of [...state.deferred]) {
    if (neededNow(sourceId)) void ensureSource(sourceId)
  }
}

// Fetches a source that waited; a fetch already running is returned instead.
export function ensureSource(sourceId: string): Promise<void> {
  const running = state.running.get(sourceId)
  if (running) return running
  const source = maskHost().source(sourceId)
  if (!source || deliveryAdapter(source.delivery.kind).fetchOn !== 'delivery') return Promise.resolve()
  state.deferred.delete(sourceId)
  load(source, undefined)
  return state.running.get(sourceId) ?? Promise.resolve()
}

function fetchAfterDelivery(): void {
  const sources = maskHost().sources()
  for (const kind of DELIVERY_KINDS) {
    if (deliveryAdapter(kind).fetchOn !== 'delivery') continue
    for (const source of sources) {
      if (source.delivery.kind !== kind) continue
      if (mayWait(source)) state.deferred.add(source.id)
      else load(source, undefined)
    }
  }
  loadNeeded()
}

export function wireFetchingSources(): void {
  if (state.wired) return
  state.wired = true
  onSelectionList(checkFetchingSources)

  maskHost().onData((delivery) => {
    if (delivery) fetchAfterDelivery()
  })

  if (maskHost().hasData()) fetchAfterDelivery()
}
