import { Link2, X } from '../icons/icon'
import { Button } from '../widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { selectionSourceIdOf } from '../../core/block/treeQuery'
import type { KeyPair } from '../../core/data/extraSources'
import { SELECTION_FOLLOW_PROP, type SelectionFollow } from '../../core/data/selectionFollow'
import { originPair, pairOrigin, type ValueOrigin } from '../../core/data/valueOrigin'
import { OriginPicker } from '../origin/OriginPicker'
import { formFieldsOf, giverGroup, outsideReach, type Reach } from '../origin/reach'
import { useDataSources, useEditor } from '../state/useEditor'
import { followedName, followOf } from './followOffer'
import { KeyPairRows } from './KeyPairRows'

interface SelectionFollowSectionProps {
  block: BlockNode

  onPick: () => void
}

export function SelectionFollowSection({ block, onPick }: SelectionFollowSectionProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const follow = followOf(block)
  if (!follow) return null

  const giver = ed.tree[follow.giverId]
  const ownSource = library.find((s) => s.id === selectionSourceIdOf(block))

  const reach: Reach = {
    givers: giver ? [giverGroup(giver, library)] : [],
    ...outsideReach(
      library,
      formFieldsOf(ed.tree, library).filter((f) => f.blockId !== block.id),
    ),
  }

  const originOf = (pair: KeyPair): ValueOrigin | null =>
    pairOrigin(pair, (value) => ({ kind: 'chosenRow', blockId: follow.giverId, value }))

  const pairFor = (origin: ValueOrigin, pair: KeyPair): KeyPair | null => {
    const next = originPair(origin, pair.toField)
    return next && pair.unequal ? { ...next, unequal: true } : next
  }

  function set(next: SelectionFollow[]): void {
    ed.updateProperty(
      block.id,
      SELECTION_FOLLOW_PROP,
      next.map((f) => (f.pairs.length > 0 && f.pairs.every((p) => p.from !== undefined) ? { ...f, giverId: '' } : f)),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-control items-center gap-1.5">
        <span className="shrink-0 text-dense font-semibold text-muted">Folgt</span>
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{followedName(follow, ed.tree, library)}</span>
        <Button onlyIcon aria-label="Anderes wählen" title="Anderes wählen" onClick={onPick}>
          <Link2 size={13} />
        </Button>
        <Button onlyIcon aria-label="Folgt nicht mehr" title="Folgt nicht mehr" onClick={() => set([])}>
          <X size={13} />
        </Button>
      </div>
      {follow.pairs.length > 0 && (
        <KeyPairRows
          pairs={follow.pairs}
          left={(pair, at) => (
            <OriginPicker
              name={`Wert ${at + 1}`}
              origin={originOf(pair)}
              reach={reach}
              onChoose={(origin) => {
                const next = pairFor(origin, pair)
                if (next) set([{ ...follow, pairs: follow.pairs.map((p, x) => (x === at ? next : p)) }])
              }}
            />
          )}
          rightFields={ownSource?.fields ?? []}
          rightName={(at) => `Feld ${at + 1} in diesem Baustein`}
          removeName={(at) => `Feldpaar ${at + 1} entfernen`}
          onChange={(keyPairs) => set([{ ...follow, pairs: keyPairs }])}
          comparable
        />
      )}
    </div>
  )
}
