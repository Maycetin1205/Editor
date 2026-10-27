import type { RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { bindingFields, bindingJoiner, joinedBinding, toggledBinding } from '../../core/block/binding'
import { bindingProp, type BindableSpot } from '../../core/block/capability'
import { weave } from '../../core/block/fieldPattern'
import { blockType } from '../../core/block/registry'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import { FieldPicker, type SourcesChoice } from './FieldPicker'
import { pickerGroups } from './pickerGroups'
import { spotBinding } from './useBindingPicker'

interface SpotFieldPickerProps {
  editor: EditorStore
  block: BlockNode
  spot: BindableSpot
  sources: readonly SourceInReach[]
  sourcesChoice: SourcesChoice | undefined

  anchor?: RefObject<HTMLElement | null>
  top: number
  left: number

  onClose: () => void
}

export function SpotFieldPicker({
  editor,
  block,
  spot,
  sources,
  sourcesChoice,
  anchor,
  top,
  left,
  onClose,
}: SpotFieldPickerProps) {
  const current = spotBinding(block, spot, sources)
  const latest = (): string => spotBinding(editor.getNode(block.id) ?? block, spot, sources)
  const bind = (binding: string): void => {
    editor.updateProperty(block.id, bindingProp(spot.prop), binding)
  }

  // A spot that weaves takes a picked field into its words (fieldPattern.ts).
  const woven = (value: string): boolean => {
    const weaveProp = spot.weaveProp
    if (weaveProp === undefined) return false
    const node = editor.getNode(block.id) ?? block
    const typed = String(node.values[spot.prop] ?? '')
    const words = typed === blockType(node.type)?.properties[spot.prop]?.default ? '' : typed
    const next = weave(String(node.values[weaveProp] ?? ''), words, latest(), value)
    if (next === null) return false
    editor.history.transaction(() => {
      bind(next.binding)
      editor.updateProperty(block.id, weaveProp, next.pattern)
      if (next.text !== undefined) editor.updateProperty(block.id, spot.prop, next.text)
    })
    if (next.pattern === '') onClose()
    return true
  }

  return (
    <FieldPicker
      spotLabel={spot.name}
      groups={pickerGroups(sources)}
      current={current}
      several={
        spot.several
          ? {
              joiner: bindingJoiner(current),
              onJoiner: (joiner) => bind(joinedBinding(bindingFields(latest()), joiner)),
            }
          : undefined
      }
      anchor={anchor}
      top={top}
      left={left}
      sourcesChoice={sourcesChoice}
      onPick={(value) => {
        if (woven(value)) return
        const several = spot.several === true && value !== ''
        bind(several ? toggledBinding(latest(), value) : value)
        if (!several) onClose()
      }}
      onClose={onClose}
    />
  )
}
