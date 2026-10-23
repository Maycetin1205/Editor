import { useMemo } from 'react'
import { isWindowPage, pagesOfMask } from '../../core/block/pages'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { maskReach } from '../origin/reach'
import type { StepContext } from './stepPiece'

export function useStepContext(): StepContext {
  const ed = useEditor()
  const relations = useRelations().list
  const sources = useDataSources().list
  const tree = ed.tree
  return useMemo(() => ({
    relations,
    popups: pagesOfMask(tree).filter(isWindowPage).map((p) => ({ value: p.id, name: p.name })),
    reach: maskReach(tree, sources),
  }), [tree, sources, relations])
}
