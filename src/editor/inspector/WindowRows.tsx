import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import type { BlockNode } from '../../core/block/tree'
import { declaredValue } from '../../core/block/registry'
import { calculationsProperty } from '../../core/data/calculation'
import { Labeled } from '../bar/Labeled'
import { termsText } from '../canvas/calculationWords'
import { splitWords } from '../canvas/splitWords'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'

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
