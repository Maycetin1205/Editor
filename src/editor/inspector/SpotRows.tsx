import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import type { BindableSpot } from '../../core/block/capability'
import type { BlockNode } from '../../core/block/tree'
import { declaredValue } from '../../core/block/registry'
import { calculationsProperty } from '../../core/data/calculation'
import { boundNames } from '../../core/data/boundField'
import type { SourceInReach } from '../../core/data/extraSources'
import { Labeled } from '../bar/Labeled'
import { termsText } from '../canvas/calculationWords'
import { librarySourcesChoice } from '../canvas/pickerGroups'
import { splitWords } from '../canvas/splitWords'
import { SpotFieldPicker } from '../canvas/SpotFieldPicker'
import { spotBinding } from '../canvas/useBindingPicker'
import { HELPER_MARK } from '../canvas/useLitElement'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'

const NOT_BOUND = 'Nicht gebunden'

export function SpotRows({ block, spots }: { block: BlockNode; spots: readonly BindableSpot[] }) {
  const ed = useEditor()
  const sources = ed.sourcesFor(block.id)
  return spots.map((spot) => <SpotRow key={spot.prop} block={block} spot={spot} sources={sources} />)
}

function SpotRow({
  block,
  spot,
  sources,
}: {
  block: BlockNode
  spot: BindableSpot
  sources: readonly SourceInReach[]
}) {
  const ed = useEditor()
  const library = useDataSources().list
  const [at, setAt] = useState<{ top: number; left: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = () => setAt(null)
  const names = boundNames(spotBinding(block, spot, sources), sources, HELPER_MARK)

  return (
    <Labeled label={spot.name}>
      <Button
        ref={button}
        aria-haspopup="dialog"
        aria-expanded={at !== null}
        aria-label={`Feld für ${spot.name}: ${names === '' ? NOT_BOUND : names}`}
        onClick={() => {
          const r = button.current?.getBoundingClientRect()
          setAt(at !== null || !r ? null : { top: r.bottom + 4, left: r.left })
        }}
        className={cn(INPUT_EDGE, 'flex h-control w-full items-center gap-2 px-2 text-left focus-visible:ring-0')}
      >
        <span className={cn('min-w-0 flex-1 truncate', names === '' ? 'text-muted' : 'font-medium')}>
          {names === '' ? NOT_BOUND : names}
        </span>
        <ChevronDown size={13} aria-hidden className="shrink-0 text-muted" />
      </Button>
      {at !== null && (
        <SpotFieldPicker
          editor={ed}
          block={block}
          spot={spot}
          sources={sources}
          sourcesChoice={librarySourcesChoice(ed, block.id, sources, library, close)}
          anchor={button}
          top={at.top}
          left={at.left}
          onClose={close}
        />
      )}
    </Labeled>
  )
}

export function SplitRow({ block }: { block: BlockNode }) {
  const ed = useEditor()
  const library = useDataSources().list
  const words = splitWords(block, library)
  return (
    <Labeled label="Verteilen">
      <Button
        aria-label={`Verteilen: ${words}`}
        onClick={() => ed.openSplit(block.id)}
        className={cn(INPUT_EDGE, 'flex h-control w-full items-center gap-2 px-2 text-left focus-visible:ring-0')}
      >
        <span className={cn('min-w-0 flex-1 truncate', words === 'Keins' ? 'text-muted' : 'font-medium')}>{words}</span>
      </Button>
    </Labeled>
  )
}

export function CalculationRow({ block }: { block: BlockNode }) {
  const ed = useEditor()
  const terms = declaredValue(block, calculationsProperty)[0]?.terms.length ?? 0
  const words = termsText(terms)
  return (
    <Labeled label="Berechnung">
      <Button
        aria-label={`Berechnung: ${words}`}
        onClick={() => ed.openCalculation({ blockId: block.id, column: '' })}
        className={cn(INPUT_EDGE, 'flex h-control w-full items-center gap-2 px-2 text-left focus-visible:ring-0')}
      >
        <span className={cn('min-w-0 flex-1 truncate', terms === 0 ? 'text-muted' : 'font-medium')}>{words}</span>
      </Button>
    </Labeled>
  )
}
