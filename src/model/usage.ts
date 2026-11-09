import { allBindings, stepType, type ValueBinding } from './actions'
import type { BlockCatalog } from './blockType'
import type { MaskDocument } from './document'
import type { RelationData } from './relations'
import { visitProps } from './schema'
import { SourceSchema, splitRef, type SourceData } from './sources'

// What a mask really uses: which sources, which of their fields, which
// relations. The export asks SoftEngine only for that, and the running mask
// only loads that.

export interface MaskUsage {
  sources: SourceData[]
  // Source id -> the own field codes the mask reads.
  fields: Map<string, Set<string>>
  relations: RelationData[]
}

export function collectUsage(doc: MaskDocument, catalog: BlockCatalog): MaskUsage {
  const sources = doc.sources
  const usedSources = new Set<string>()
  const fields = new Map<string, Set<string>>()
  const relationIds = new Set<string>()

  const mark = (sourceId: string, code: string): void => {
    if (code === '') return
    let codes = fields.get(sourceId)
    if (!codes) fields.set(sourceId, (codes = new Set()))
    codes.add(code)
  }

  const useBinding = (binding: ValueBinding): void => {
    if (binding.from === 'field') useField(binding.source, binding.field)
  }

  // A source brings along what it needs itself to be loaded.
  const useSource = (sourceId: string): void => {
    if (sourceId === '' || usedSources.has(sourceId)) return
    const source = doc.source(sourceId)
    if (!source) return
    usedSources.add(sourceId)
    if (source.addressFrom) useField(source.addressFrom.source, source.addressFrom.field)
    if (source.kind === 'relation') {
      if (source.relation) relationIds.add(source.relation)
      source.params?.forEach(useBinding)
    }
  }

  function useField(sourceId: string, ref: string): void {
    const source = doc.source(sourceId)
    if (!source || ref === '') return
    useSource(sourceId)
    const { link: linkId, code } = splitRef(ref)
    if (linkId === '') {
      mark(sourceId, code)
      return
    }
    const link = source.links.find((candidate) => candidate.id === linkId)
    if (!link) return
    mark(sourceId, link.field)
    useSource(link.source)
    mark(link.source, link.targetField)
    mark(link.source, code)
  }

  for (const block of doc.blocks()) {
    const type = catalog.get(block.type)
    if (type) {
      visitProps(type.schema(), type.propsOf(block), {
        source: useSource,
        field: (ref, sourceId) => useField(sourceId, ref),
        template: (text, sourceId) => {
          for (const ref of SourceSchema.of(sourceId, sources).refsIn(text)) useField(sourceId, ref)
        },
        binding: useBinding,
      })
    }
    if (block.visible) {
      useBinding(block.visible.left)
      useBinding(block.visible.right)
    }
    for (const steps of Object.values(block.actions ?? {})) {
      for (const step of steps) {
        allBindings(step).forEach(useBinding)
        stepType(step.kind)
          .uses(step)
          .forEach((use) => useField(use.source, use.ref))
        if (step.kind === 'relation' && step.relation !== '') relationIds.add(step.relation)
        if (step.kind === 'createRecord') useSource(step.source)
      }
    }
  }

  return {
    sources: sources.filter((source) => usedSources.has(source.id)),
    fields,
    relations: doc.relations.filter((relation) => relationIds.has(relation.id)),
  }
}

// After a field or a link got a new name: every template of the mask that
// reads from this source follows.
export function renameInMask(
  doc: MaskDocument,
  catalog: BlockCatalog,
  sourceId: string,
  rename: (template: string) => string,
): MaskDocument {
  return doc.mapBlocks((block) => {
    const type = catalog.get(block.type)
    if (!type) return block
    const props = type.propsOf(block)
    const next = visitProps(type.schema(), props, {
      template: (text, templateSource) => (templateSource === sourceId ? rename(text) : undefined),
    })
    return next === props ? block : { ...block, props: next }
  })
}

// Where a source is used, in words: for the question before deleting it.
export function blocksUsingSource(doc: MaskDocument, catalog: BlockCatalog, sourceId: string): string[] {
  const out: string[] = []
  for (const block of doc.blocks()) {
    const type = catalog.get(block.type)
    if (!type) continue
    let hit = false
    visitProps(type.schema(), type.propsOf(block), {
      source: (id) => {
        if (id === sourceId) hit = true
      },
      binding: (binding) => {
        if (binding.from === 'field' && binding.source === sourceId) hit = true
      },
    })
    for (const steps of Object.values(block.actions ?? {})) {
      for (const step of steps) {
        if (allBindings(step).some((b) => b.from === 'field' && b.source === sourceId)) hit = true
        if ((step.kind === 'writeField' || step.kind === 'createRecord') && step.source === sourceId) hit = true
      }
    }
    if (hit) out.push(type.title(type.propsOf(block)) || type.label)
  }
  return out
}
