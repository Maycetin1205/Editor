import { Button } from '@/editor/widgets/Button'
import type { ChoiceOption } from '@/editor/widgets/Choice'
import { Window } from '@/editor/widgets/Window'
import { blockName } from '../../core/block/blockName'
import { declaredValue } from '../../core/block/registry'
import type { DataSource } from '../../core/data/dataSources'
import { extraSourcesProperty } from '../../core/data/extraSources'
import { newSplit, SPLITS_PROP, splitsProperty, type Split } from '../../core/data/split'
import { columnEntries } from '../origin/reach'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { useSplitDraft } from './splitDraft'
import { SplitColumns } from './SplitColumns'
import { SplitSettings } from './SplitSettings'
import { carriesSplit } from './splitWords'

// Closed, the window hears only the view, not every change of the mask.
export function OpenSplitWindow() {
  const blockId = useView().splitWindow
  return blockId === null ? null : <OpenedSplitWindow blockId={blockId} />
}

function OpenedSplitWindow({ blockId }: { blockId: string }) {
  const ed = useEditor()
  const library = useDataSources().list
  const block = ed.tree[blockId]
  if (block === undefined || !carriesSplit(block)) return null

  const helpers = declaredValue(block, extraSourcesProperty).flatMap((e) => library.filter((s) => s.id === e.sourceId))
  const present = declaredValue(block, splitsProperty)[0]
  const close = (): void => ed.view.openSplit(null)

  return (
    <SplitWindow
      key={blockId}
      title={`Verteilen: ${blockName(block, library)}`}
      split={present ?? newSplit(helpers[0]?.id ?? '')}
      helpers={helpers}
      columns={columnEntries(block)}
      onApply={(next) => {
        ed.updateProperty(block.id, SPLITS_PROP, [next])
        close()
      }}
      onRemove={
        present === undefined
          ? undefined
          : () => {
              ed.updateProperty(block.id, SPLITS_PROP, [])
              close()
            }
      }
      onClose={close}
    />
  )
}

interface SplitWindowProps {
  title: string
  split: Split
  helpers: readonly DataSource[]
  columns: readonly ChoiceOption[]
  onApply: (split: Split) => void
  onRemove?: () => void
  onClose: () => void
}

// The frame: the columns of the list on the left, where the rows come from
// on the right, and nothing written before Übernehmen.
function SplitWindow({ title, split, helpers, columns, onApply, onRemove, onClose }: SplitWindowProps) {
  const edit = useSplitDraft(split)
  const draft = edit.draft
  const source = helpers.find((s) => s.id === draft.sourceId)
  const fields: ChoiceOption[] = (source?.fields ?? []).map((f) => ({ value: f.code, name: f.name || f.code }))
  const fieldName = (code: string): string => fields.find((f) => f.value === code)?.name ?? code

  const ready = draft.sourceId !== '' && draft.amountColumn !== '' && draft.columns.length > 0
  const finished: Split = { ...draft, hide: draft.hide.filter((h) => h.field !== '') }

  return (
    <Window
      title={title}
      width={1040}
      height={620}
      level={50}
      foot={
        <>
          {onRemove !== undefined && (
            <Button kind="risk" className="mr-auto" onClick={onRemove}>
              Verteilen entfernen
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" disabled={!ready} onClick={() => onApply(finished)}>
            Übernehmen
          </Button>
        </>
      }
      onClose={onClose}
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
        <SplitColumns edit={edit} fields={fields} fieldName={fieldName} />
        <SplitSettings edit={edit} helpers={helpers} columns={columns} fields={fields} />
      </div>
    </Window>
  )
}
