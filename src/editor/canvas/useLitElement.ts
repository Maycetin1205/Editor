import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { bindingProp, capability, type BindableSpot } from '../../core/block/capability'
import { gridMetricsOf, heightFollowsContent, rowsForHeight } from '../../core/block/grid'
import { blockType } from '../../core/block/registry'
import {
  BlockElement,
  CHILD_ADD,
  CHILD_CHANGE,
  CHILD_REMOVE,
  PROP_CHANGE,
  SPOT_CLICK,
  type ChildAdd,
  type ChildChange,
  type ChildRemove,
  type PropChange,
  type SpotClick,
} from '../../blocks/base/BlockElement'
import { HEIGHT_REPORTED, type HeightReported } from '../../blocks/base/heightReport'
import { boundNames } from '../../core/data/boundField'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import { capacityOf } from './gridArea'

const HELPER_MARK = ' ↗'

interface LitElementArgs {
  editor: EditorStore

  blockRef: RefObject<BlockNode>
  block: BlockNode
  selected: boolean | undefined
  bindableSpots: readonly BindableSpot[]

  sources: readonly SourceInReach[]

  grid: boolean

  chosenChild: number
}

// What a block changes in its children on the canvas: their words (the
// title of a page of a Reiter), a new child (a new page, one undo step) and
// a child taken away (a page with its blocks).
function listenToChildren(el: HTMLElement, editor: EditorStore, blockRef: RefObject<BlockNode>): () => void {
  const onChange = (e: Event) => {
    const { child, prop, value } = (e as CustomEvent<ChildChange>).detail
    const id = editor.childNodesOf(blockRef.current.id)[child]?.id
    if (id !== undefined) editor.updateProperty(id, prop, value)
  }
  const onAdd = (e: Event) => {
    const { type, values } = (e as CustomEvent<ChildAdd>).detail
    editor.history.transaction(() => {
      const node = editor.addBlock(type, blockRef.current.id)
      if (node) for (const [prop, value] of Object.entries(values)) editor.updateProperty(node.id, prop, value)
    })
  }
  const onRemove = (e: Event) => {
    const { child } = (e as CustomEvent<ChildRemove>).detail
    const id = editor.childNodesOf(blockRef.current.id)[child]?.id
    if (id !== undefined) editor.removeBlock(id)
  }
  el.addEventListener(CHILD_CHANGE, onChange)
  el.addEventListener(CHILD_ADD, onAdd)
  el.addEventListener(CHILD_REMOVE, onRemove)
  return () => {
    el.removeEventListener(CHILD_CHANGE, onChange)
    el.removeEventListener(CHILD_ADD, onAdd)
    el.removeEventListener(CHILD_REMOVE, onRemove)
  }
}

export function useLitElement(args: LitElementArgs) {
  const { editor, blockRef, block, selected, bindableSpots, sources, grid, chosenChild } = args
  const containerRef = useRef<HTMLDivElement | null>(null)

  const elementRef = useRef<HTMLElement | null>(null)
  const [element, setElement] = useState<HTMLElement | null>(null)

  const spotClick = useRef<SpotClick | null>(null)

  useEffect(() => {
    const def = blockType(block.type)
    if (!def) {
      console.warn(`BlockHost: keine Bausteinart für Typ "${block.type}"`)
      return
    }
    const container = containerRef.current
    if (!container) return
    const el = document.createElement(def.tag)

    el.setAttribute('preview', '')
    container.appendChild(el)
    elementRef.current = el
    setElement(el)

    const onPropChange = (e: Event) => {
      const { prop, value } = (e as CustomEvent<PropChange>).detail
      editor.updateProperty(blockRef.current.id, prop, value)
    }
    el.addEventListener(PROP_CHANGE, onPropChange)

    const unlistenChildren = listenToChildren(el, editor, blockRef)

    const onSpotClick = (e: Event) => {
      spotClick.current = (e as CustomEvent<SpotClick>).detail
    }
    el.addEventListener(SPOT_CLICK, onSpotClick)

    const onHeightReported = (e: Event) => {
      if (!heightFollowsContent(gridMetricsOf(def), blockRef.current.values)) return
      const { height } = (e as CustomEvent<HeightReported>).detail
      editor.fitNodeHeight(blockRef.current.id, rowsForHeight(height), (areaId) => capacityOf(editor.tree, areaId))
    }
    if (gridMetricsOf(def).heightFromContent !== false) el.addEventListener(HEIGHT_REPORTED, onHeightReported)

    return () => {
      el.removeEventListener(PROP_CHANGE, onPropChange)
      unlistenChildren()
      el.removeEventListener(SPOT_CLICK, onSpotClick)
      el.removeEventListener(HEIGHT_REPORTED, onHeightReported)
      if (container.contains(el)) container.removeChild(el)
      elementRef.current = null
      setElement(null)
    }
  }, [block.type, editor, blockRef])

  useEffect(() => {
    const el = elementRef.current
    if (!(el instanceof BlockElement)) return
    for (const [key, value] of Object.entries(block.values)) {
      el.setDeclared(key, value)
    }

    const texts: Record<string, string> = {}
    for (const spot of bindableSpots) {
      const value = block.values[bindingProp(spot.prop)]
      if (typeof value !== 'string' || value === '') continue

      const names = boundNames(value, sources, HELPER_MARK)
      if (names !== '') {
        texts[spot.prop] = names
        el.setDeclared(spot.previewProp ?? spot.prop, texts[spot.prop])
      } else {
        el.setDeclared(bindingProp(spot.prop), '')
      }
      if (spot.nameProp !== undefined && String(block.values[spot.nameProp] ?? '') === '') {
        el.setDeclared(spot.nameProp, boundNames(value, sources))
      }
    }
    const list = capability(blockType(block.type), 'list')?.binding
    list?.entries(block.values[list.prop]).forEach((entry, i) => {
      const names = boundNames(list.fieldOf(entry), sources, HELPER_MARK)
      if (names !== '') texts[`${list.prop}.${i}`] = names
    })
    el.spotTexts = texts

    el.editable = !!selected
    el.chosenChild = chosenChild

    el.toggleAttribute('fills', !!grid)
  }, [element, block.type, block.values, selected, bindableSpots, sources, grid, chosenChild])

  const spotClickOf = (click: Event): SpotClick | null =>
    spotClick.current?.click === click ? spotClick.current : null

  return { containerRef, elementRef, element, spotClickOf }
}
