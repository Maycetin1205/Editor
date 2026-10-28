import { FileText, Link2 } from '../icons/icon'
import { Button, PRESSED } from '../widgets/Button'
import { useCloseOnEscape } from '../widgets/useCloseOnEscape'
import type { BlockNode } from '../../core/block/tree'
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import { openDocumentOf } from '../origin/reach'
import { useDataSources, useEditor, useView } from '../state/useEditor'
import { followOnDocument } from './followOffer'

export function FollowPick({ block }: { block: BlockNode }) {
  const ed = useEditor()
  const view = useView()
  const openDocument = openDocumentOf(useDataSources().list)
  const waiting = view.followPickFor === block.id
  return (
    <div className="flex min-w-0 flex-col items-start gap-[2px]">
      <Button
        kind="command"
        aria-pressed={waiting}
        className={waiting ? `${PRESSED} max-w-full` : '-ml-[10px] max-w-full'}
        onClick={() => view.pickFollowFor(waiting ? null : block.id)}
      >
        <Link2 size={14} className="shrink-0" />
        <span className="truncate">{waiting ? 'Baustein anklicken …' : 'Auf der Fläche wählen'}</span>
      </Button>
      {waiting && openDocument && (
        <Button
          kind="command"
          className="-ml-[10px]"
          onClick={() => {
            ed.updateProperty(block.id, SELECTION_FOLLOW_PROP, followOnDocument(block, openDocument.id))
            view.pickFollowFor(null)
          }}
        >
          <FileText size={14} /> {openDocument.name}
        </Button>
      )}
      {waiting && <EscapeEnds onEscape={() => view.pickFollowFor(null)} />}
    </div>
  )
}

function EscapeEnds({ onEscape }: { onEscape: () => void }) {
  useCloseOnEscape(onEscape)
  return null
}
