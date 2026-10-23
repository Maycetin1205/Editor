import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { sourcesKey, type DataSource } from '../../core/data/dataSources'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import type { PickerGroup, SourcesChoice } from './FieldPicker'

export function pickerGroups(sources: readonly SourceInReach[]): PickerGroup[] {
  return sources.map((q, i) => ({
    sourceId: i === 0 ? '' : q.source.id,
    name: q.source.name,
    badge: sourcesKey(q.source),
    fields: q.source.fields,
  }))
}

export function librarySourcesChoice(
  editor: EditorStore,
  blockId: string,
  sources: readonly SourceInReach[],
  library: readonly DataSource[],
  onData: () => void,
): SourcesChoice | undefined {
  if (sources.length > 0 || sourcesCarrier(editor.tree, blockId) === undefined) return undefined
  return {
    entries: library.map((s) => ({ value: s.id, name: s.name, badge: sourcesKey(s) })),
    onData: () => {
      onData()
      editor.showData(true)
    },
    onChoose: (sourceId: string) => {
      const carrier = sourcesCarrier(editor.tree, blockId)
      if (sourceId === '' || !carrier) return
      editor.updateProperty(carrier.id, SOURCE_PROP, sourceId)
    },
  }
}
