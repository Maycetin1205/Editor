import { FileText, Link2 } from '@/editor/icons/icon'
import { Button, PRESSED } from '@/editor/widgets/Button'
import { useCloseOnEscape } from '@/editor/widgets/useCloseOnEscape'
import type { BlockNode } from '../../core/block/tree'
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import { openDocumentOf } from '../origin/reach'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { followOnDocument } from './followOffer'

export function FollowPick({ block }: { block: BlockNode }) {
  const ed = useEditor()
  const view = useView()
  const openDocument = openDocumentOf(useDataSources().list)
  const waiting = view.followPickFor === block.id
  return (
    <div className="flex flex-col items-start gap-[2px]">
      <Button
        kind="command"
        aria-pressed={waiting}
        className={waiting ? PRESSED : '-ml-[10px]'}
        onClick={() => view.pickFollowFor(waiting ? null : block.id)}
      >
        <Link2 size={14} /> {waiting ? 'Geber auf der Leinwand anklicken …' : 'Geber auf der Leinwand anklicken'}
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
