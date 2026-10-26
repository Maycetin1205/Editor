import {
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { BlockNode } from '../../core/block/tree'
import type { SourceInReach } from '../../core/data/extraSources'
import { blockType } from '../../core/block/registry'
import { capability, type BindableSpot } from '../../core/block/capability'
import { bindableSpotsOf, carriesOwnSource } from '../../core/block/treeQuery'
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import type { DataSource } from '../../core/data/dataSources'
import { useEditorInstance } from '../state/EditorContext'
import type { EditorStore } from '../state/EditorStore'
import { useView } from '../state/useView'
import { followableByClick, followByClick } from '../bar/followOffer'
import { ownSourcesOf, sourcesCarrier } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { BlockGrips } from './BlockGrips'
import { ColumnControls } from './ColumnControls'
import { useFieldBinding } from './useFieldBinding'
import { openLookupInEditor } from './lookupWindowState'
import { useLitElement } from './useLitElement'

interface BlockHostProps {
  block: BlockNode
  selected?: boolean

  onSelect?: () => void

  grid?: boolean

  children?: ReactNode
}

const NO_SOURCES: readonly SourceInReach[] = []

const CONTAINER_STYLE: CSSProperties = { pointerEvents: 'auto', height: '100%' }

// The sources a block can bind to, only looked up when it binds at all.
function useBlockSources(editor: EditorStore, block: BlockNode, bindableSpots: readonly BindableSpot[]) {
  const library = useDataSources().list
  const carrier = sourcesCarrier(editor.tree, block.id)
  const needs = bindableSpots.length > 0 || carriesOwnSource(block)
  const sources = useMemo(
    () => (needs && carrier ? ownSourcesOf(carrier, library) : NO_SOURCES),
    [needs, carrier, library],
  )
  return { sources, library }
}

// The value of the last render, for handlers and element events that
// outlive it.
function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

function hostStyle(selected: boolean | undefined, toFollow: boolean): CSSProperties {
  return {
    display: 'block',
    position: 'relative',
    height: '100%',
    cursor: selected ? 'default' : 'pointer',
    outline: selected ? '2px solid var(--wb-selection)' : toFollow ? '2px dashed var(--wb-selection)' : undefined,
    outlineOffset: 1,
    borderRadius: 'var(--radius)',
    userSelect: 'none',
  }
}

// While a block picks one to follow, a click on a block that can be followed
// makes it the one.
function followClicked(editor: EditorStore, block: BlockNode, library: readonly DataSource[], follower: string) {
  const node = editor.getNode(follower)
  const next = node ? followByClick(node, block, library) : null
  if (next) editor.updateProperty(follower, SELECTION_FOLLOW_PROP, next)
  editor.view.pickFollowFor(null)
}

export function BlockHost({ block, selected, onSelect, grid = false, children }: BlockHostProps) {
  const editor = useEditorInstance()
  const view = useView()
  const follower = view.followPickFor
  const rootRef = useRef<HTMLDivElement | null>(null)
  const def = blockType(block.type)
  const list = capability(def, 'list')?.binding
  const searchWindow = capability(def, 'lookupWindow')?.window
  const bindableSpots = useMemo(() => bindableSpotsOf(block), [block])
  const { sources, library } = useBlockSources(editor, block, bindableSpots)

  const blockRef = useLatest(block)

  const { containerRef, elementRef, element, spotClickOf } = useLitElement({
    editor,
    blockRef,
    block,
    selected,
    bindableSpots,
    sources,
    grid,
  })
  const binding = useFieldBinding({
    editor,
    blockRef,
    block,
    selected,
    bindableSpots,
    listBinding: list,
    searchWindow,
    sources,
    element,
    spotClickOf,
    onSelect,
  })
  const toFollow = follower !== null && followableByClick(block, follower)

  const onClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (follower !== null) {
      if (!toFollow) return
      e.stopPropagation()
      followClicked(editor, block, library, follower)
      return
    }
    const lookup = spotClickOf(e.nativeEvent)?.kind === 'lookupWindow' ? searchWindow : undefined
    const el = elementRef.current
    if (lookup !== undefined && el && openLookupInEditor(editor, el, block.id, lookup, 0)) {
      e.stopPropagation()
      onSelect?.()
      return
    }
    binding.onClick(e)
  }

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      onDoubleClick={binding.onDoubleClick}
      data-block-id={block.id}
      className={view.outlines ? 'block-outline block-outline--all' : 'block-outline'}
      style={hostStyle(selected, toFollow)}
    >
      <div ref={containerRef} style={CONTAINER_STYLE}>
        {element && def?.takesChildren && children != null ? createPortal(children, element) : null}
      </div>
      {binding.pickers}
      {list?.entryHeads === true && (
        <ColumnControls
          block={block}
          selected={selected === true}
          open={binding.openEntry}
          openSpot={binding.openSpot}
          binding={list}
          element={element}
          host={rootRef}
          onSelect={onSelect}
          onPick={binding.pickList}
        />
      )}
      {selected && grid && <BlockGrips editor={editor} def={def} blockRef={blockRef} rootRef={rootRef} />}
    </div>
  )
}
