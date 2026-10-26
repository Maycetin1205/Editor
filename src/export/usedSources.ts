import { ROOT_ID, type BlockNode, type MaskTree } from '../core/block/tree'
import type { BlockType } from '../core/block/blockType'
import { fieldChoicesRead, splitBinding } from '../core/block/blockType'
import { bindingFields } from '../core/block/binding'
import { bindingProp, capability, hasCapability } from '../core/block/capability'
import { blockType, declaredValue } from '../core/block/registry'
import { propertyVisible } from '../core/block/property'
import { selectionSourceIdOf, bindableSpotsOf, maySelectionFollows, carriesOwnSource } from '../core/block/treeQuery'
import { SOURCE_PROPERTY } from '../core/block/sourceProperty'
import { followsSelectionProperty, followUsable } from '../core/data/selectionFollow'
import { calculationsProperty, fieldBindingsOf } from '../core/data/calculation'
import { splitsProperty } from '../core/data/split'
import type { DataSource } from '../core/data/dataSources'
import { deliveryAdapter } from '../core/data/deliveries/deliveries'
import { alwaysOrdered } from '../core/data/positions'
import { sourceUsable, completePairs, extraSourcesProperty, type SourceInReach } from '../core/data/extraSources'
import { sourceIdsUsedBy, sourcesInReach } from '../core/block/sourcesInReach'
import { stepAdapter } from '../core/data/steps/steps'

function fieldsReadBy(source: DataSource): { sourceId: string; code: string }[] {
  const out: { sourceId: string; code: string }[] = []
  for (const binding of deliveryAdapter(source.delivery.kind).bindings(source.delivery)) {
    if (binding.source !== 'dataField') continue
    const sourceId = binding.sourceId ?? ''
    if (sourceId !== '') out.push({ sourceId, code: binding.value })
  }
  return out
}

export function collectDataSources(tree: MaskTree, sources: readonly DataSource[]): DataSource[] {
  const seen = new Set<string>()
  const acc: DataSource[] = []
  const add = (id: string): void => {
    const src = sources.find((s) => s.id === id)
    if (src && !seen.has(src.id)) {
      seen.add(src.id)
      acc.push(src)
    }
  }
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    for (const id of sourceIdsUsedBy(node)) add(id)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])

  for (let i = 0; i < acc.length; i++) {
    for (const { sourceId } of fieldsReadBy(acc[i])) add(sourceId)
  }
  return acc
}

// Where a block reaches into a source: one collector per block, with the
// sources in reach of that block resolved once.
interface Collector {
  tree: MaskTree
  sources: readonly DataSource[]
  node: BlockNode
  def: BlockType | undefined
  remember(sourceId: string, code: unknown): void
  rememberBinding(value: unknown): void
}

function collectorFor(
  tree: MaskTree,
  sources: readonly DataSource[],
  node: BlockNode,
  remember: Collector['remember'],
): Collector {
  let reach: SourceInReach[] | undefined
  const inReach = (): SourceInReach[] => (reach ??= sourcesInReach(tree, node.id, sources))
  return {
    tree,
    sources,
    node,
    def: blockType(node.type),
    remember,
    rememberBinding(value) {
      if (typeof value !== 'string' || value === '') return
      const { sourceId, code } = splitBinding(value)
      const target = sourceId === '' ? inReach()[0] : inReach().find((q) => q.source.id === sourceId)
      if (target) remember(target.source.id, code)
    },
  }
}

function fieldsOfSpots(c: Collector): void {
  for (const spot of bindableSpotsOf(c.node)) {
    const binding = c.node.values[bindingProp(spot.prop)]
    if (typeof binding === 'string') bindingFields(binding).forEach(c.rememberBinding)
  }
}

function fieldsOfList(c: Collector): void {
  const b = capability(c.def, 'list')?.binding
  if (!b) return
  const ownSource = b.sourceProp === undefined ? undefined : String(c.node.values[b.sourceProp] ?? '')
  const rememberEntryField = (value: unknown): void => {
    if (ownSource === undefined) c.rememberBinding(value)
    else c.remember(ownSource, value)
  }

  const window = capability(c.def, 'lookupWindow')?.window
  const windowFields = window?.entriesProp === b.prop ? window.windowFields : () => []

  for (const entry of b.entries(c.node.values[b.prop])) {
    rememberEntryField(b.fieldOf(entry))

    let windowTarget = b.fieldOf(entry)
    for (const { value } of fieldChoicesRead(b, entry)) {
      rememberEntryField(value)
      if (value.trim() !== '') windowTarget = value
    }

    const { sourceId, code: target } = splitBinding(windowTarget)
    if (target === '') continue
    for (const code of windowFields(entry)) {
      if (sourceId !== '') c.remember(sourceId, code)
      else rememberEntryField(code)
    }
  }
}

function fieldsOfCalculations(c: Collector): void {
  if (!hasCapability(c.def, 'compute')) return
  for (const field of fieldBindingsOf(declaredValue(c.node, calculationsProperty))) c.rememberBinding(field)
}

function fieldsOfSplits(c: Collector): void {
  for (const split of declaredValue(c.node, splitsProperty)) {
    c.remember(split.sourceId, split.stockField)
    for (const { field } of [...split.columns, ...split.sort, ...split.hide]) c.remember(split.sourceId, field)
  }
}

function fieldsOfFieldProperties(c: Collector): void {
  for (const [key, prop] of Object.entries(c.def?.properties ?? {})) {
    if (prop.type.control !== 'field') continue
    if (!propertyVisible(prop.when, c.node.values)) continue
    const value = c.node.values[key]
    if (typeof value !== 'string') continue

    for (const field of bindingFields(value)) {
      if (prop.sourceProp === undefined) c.rememberBinding(field)
      else c.remember(String(c.node.values[prop.sourceProp] ?? ''), field)
    }
  }
}

function fieldsOfExtraSources(c: Collector): void {
  if (!carriesOwnSource(c.node)) return
  const first = declaredValue(c.node, SOURCE_PROPERTY)
  for (const q of declaredValue(c.node, extraSourcesProperty)) {
    if (!sourceUsable(q)) continue

    const partner = q.partnerId === '' ? first : q.partnerId
    for (const pair of completePairs(q)) {
      if (pair.from === 'document') c.remember(pair.fromSourceId ?? '', pair.fromField)
      else if (pair.from === undefined) c.remember(partner, pair.fromField)
      c.remember(q.sourceId, pair.toField)
    }
  }
}

function fieldsOfFollows(c: Collector): void {
  if (!maySelectionFollows(c.node)) return
  const own = selectionSourceIdOf(c.node)
  for (const follow of declaredValue(c.node, followsSelectionProperty)) {
    if (!followUsable(follow)) continue
    const giver = selectionSourceIdOf(c.tree[follow.giverId])
    for (const pair of completePairs(follow)) {
      if (pair.from === 'document') c.remember(pair.fromSourceId ?? '', pair.fromField)
      else if (pair.from === undefined) c.remember(giver, pair.fromField)
      c.remember(own, pair.toField)
    }
  }
}

function fieldsOfChains(c: Collector): void {
  for (const event of capability(c.def, 'events')?.list ?? []) {
    for (const step of c.node.chains?.[event.key] ?? []) {
      for (const binding of stepAdapter(step.kind).bindings(step)) {
        if (binding.source === 'dataField') {
          c.remember(binding.sourceId ?? '', binding.value)
        } else if (binding.source === 'chosenRow') {
          c.remember(selectionSourceIdOf(c.tree[binding.blockId ?? '']), binding.value)
        }
      }
    }
  }
}

const COLLECTORS = [
  fieldsOfSpots,
  fieldsOfList,
  fieldsOfCalculations,
  fieldsOfSplits,
  fieldsOfFieldProperties,
  fieldsOfExtraSources,
  fieldsOfFollows,
  fieldsOfChains,
]

export function usedFieldsPerSource(tree: MaskTree, sources: readonly DataSource[]): Map<string, ReadonlySet<string>> {
  const fields = new Map<string, Set<string>>()

  const remember = (sourceId: string, code: unknown): void => {
    if (sourceId === '' || typeof code !== 'string' || code.trim() === '') return
    const present = fields.get(sourceId)
    if (present) present.add(code.trim())
    else fields.set(sourceId, new Set([code.trim()]))
  }

  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    const collector = collectorFor(tree, sources, node, remember)
    for (const collect of COLLECTORS) collect(collector)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])

  for (const source of collectDataSources(tree, sources)) {
    for (const { sourceId, code } of fieldsReadBy(source)) remember(sourceId, code)
  }
  return fields
}

export function getKeyPerGiver(tree: MaskTree, sources: readonly DataSource[]): Map<string, string[]> {
  const perGiver = new Map<string, string[]>()
  const remember = (giverId: string, codes: readonly string[]): void => {
    if (giverId === '') return
    const prefix = sources.find((s) => s.id === giverId)?.fieldPrefix ?? ''
    const list = perGiver.get(giverId) ?? []
    for (const raw of codes) {
      if (raw === '') continue
      const code = prefix !== '' && !raw.startsWith(prefix) ? `${prefix}${raw}` : raw
      if (!list.includes(code)) list.push(code)
    }
    perGiver.set(giverId, list)
  }
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    const source = sources.find((s) => s.id === selectionSourceIdOf(node))
    const giverFields = source ? deliveryAdapter(source.delivery.kind).giverFields(source.delivery) : []
    if (giverFields.length > 0) {
      for (const follow of declaredValue(node, followsSelectionProperty)) {
        remember(selectionSourceIdOf(tree[follow.giverId]), giverFields)
      }
    }
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])
  for (const source of sources) remember(source.id, alwaysOrdered(source, sources))
  return perGiver
}
