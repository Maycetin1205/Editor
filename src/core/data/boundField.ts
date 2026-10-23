import { bindingFields, bindingJoiner, joinedBinding, splitBinding } from '../block/binding'
import { fieldOf, type DataField, type DataSource } from './dataSources'
import type { SourceInReach } from './extraSources'

export function sourceInReachOf(binding: string, sources: readonly SourceInReach[]): DataSource | undefined {
  const { sourceId } = splitBinding(binding)
  return sourceId === ''
    ? sources[0]?.source
    : sources.find((q) => q.source.id === sourceId)?.source
}

export function boundField(binding: string, sources: readonly SourceInReach[]): DataField | undefined {
  return fieldOf(sourceInReachOf(binding, sources), splitBinding(binding).code)
}

export function knownBinding(value: string, sources: readonly SourceInReach[]): string {
  const known = bindingFields(value).filter((binding) => boundField(binding, sources) !== undefined)
  return joinedBinding(known, bindingJoiner(value))
}

export function boundNames(value: string, sources: readonly SourceInReach[], helperMark = ''): string {
  const names = bindingFields(value).flatMap((binding) => {
    const field = boundField(binding, sources)
    return field ? [field.name + (splitBinding(binding).sourceId === '' ? '' : helperMark)] : []
  })
  return names.join(bindingJoiner(value))
}
