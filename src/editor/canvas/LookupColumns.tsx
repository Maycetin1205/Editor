import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/editor/widgets/cn'
import { LEVEL_OVER_MASK_WINDOW } from '@/editor/widgets/Popover'
import { Plus } from '@/editor/icons/icon'
import { cssZoomOf } from '../../blocks/base/cssZoom'
import type { HeadsPlaced } from '../../blocks/base/headsReport'
import type { DialogFrame } from '../../blocks/dialog/DialogFrame'
import type { Table } from '../../blocks/table/Table'
import { newColumn, COLUMNS_MAX } from '../../blocks/parts/column'
import type { EditorStore } from '../state/EditorStore'
import { useDataSources, useEditor, useView } from '../state/useEditor'
import type { OpenLookup } from '../state/editorStore/viewState'
import { windowFrameInEditor, windowStateOf, type WindowState } from './lookupWindowState'
import { LookupColumnPicker } from './LookupColumnPicker'
import { axesOf, sizeDrag } from './sizeDrag'
import { Grip } from './Grip'
import { GRIPS } from './useBlockResize'
import { useHeadsPlaced } from './useHeadsPlaced'

const HANDLE_EDGE = 6

const PLUS_WIDTH = 26

interface Head {
  slot: number

  left: number
  top: number
  width: number
  height: number
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

function tableIn(frame: DialogFrame): Table | null {
  return frame.querySelector<Table>('ff-table')
}

function headsOnScreen(table: Table | null, placed: HeadsPlaced): Head[] {
  if (table === null) return []
  const at = table.getBoundingClientRect()
  const zoom = cssZoomOf(table)
  return placed.heads
    .filter((head) => !head.below)
    .map((head) => ({
      slot: head.path.index,
      left: at.left + head.left * zoom,
      top: at.top + head.top * zoom,
      width: head.width * zoom,
      height: head.height * zoom,
    }))
}

interface Metrics {
  width: number
  height: number
}

function carryTo(frame: DialogFrame, state: WindowState, before: Metrics | null): void {
  const table = tableIn(frame)
  if (table !== null) {
    const columns = [...state.columns]
    if (JSON.stringify(table.columns) !== JSON.stringify(columns)) table.columns = columns
  }

  if (before === null || before.width !== state.width) frame.width = state.width
  if (before === null || before.height !== state.height) frame.height = state.height
}

export function LookupColumns() {
  const open = useView().lookupWindow
  if (open === null) return null

  return <Heads key={`${open.blockId}:${open.slot}`} open={open} />
}

function HeadHandle({ head, chosen, onChoose }: { head: Head; chosen: boolean; onChoose: () => void }) {
  const left = head.left + HANDLE_EDGE
  const right = head.left + head.width - HANDLE_EDGE
  return (
    <div
      className={cn(
        'pointer-events-auto absolute cursor-pointer',
        'hover:bg-selection/[.08]',
        chosen && 'bg-selection/[.08]',
      )}
      style={{ left: left, top: head.top, width: Math.max(0, right - left), height: head.height }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onChoose()
      }}
    />
  )
}

// The grips around the lookup window; a double click lets a side size itself.
function WindowGrips({ ed, state, box }: { ed: EditorStore; state: WindowState; box: Box }) {
  return (
    <div className="absolute" style={box}>
      {GRIPS.map((edge) => (
        <Grip
          key={edge}
          edge={edge}
          onDrag={(e) => sizeDrag(ed, e, edge, box, (axis, value) => state.setMetrics(axis, value))}
          onReset={() =>
            ed.history.transaction(() => {
              for (const axis of axesOf(edge)) state.setMetrics(axis, undefined)
            })
          }
        />
      ))}
    </div>
  )
}

function AddColumn({ right, top, onAdd }: { right: number; top: number; onAdd: () => void }) {
  return (
    <button
      type="button"
      aria-label="Spalte anfügen"
      title="Spalte anfügen"
      className={cn(
        'pointer-events-auto absolute grid cursor-pointer place-items-center rounded border border-line bg-panel',
        'text-selection hover:bg-selection/[.08]',
      )}
      style={{ left: right - PLUS_WIDTH, top: top - 29, width: PLUS_WIDTH, height: 24 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
    >
      <Plus size={13} />
    </button>
  )
}

// What the editor lays over the open lookup window: a spot per column head
// to bind it, grips to size the window and a button to add a column.
function Heads({ open }: { open: OpenLookup }) {
  const ed = useEditor()
  const library = useDataSources().list
  const [chosen, setChosen] = useState<number | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)

  // The window can close itself; the layer goes with it.
  useEffect(() => {
    const check = (): void => {
      if (windowFrameInEditor() === null) ed.view.setLookupWindow(null)
    }
    const mo = new MutationObserver(check)
    mo.observe(document.body, { childList: true })
    check()
    return () => mo.disconnect()
  }, [ed, open])

  const frame = windowFrameInEditor()
  const table = frame === null ? null : tableIn(frame)
  const heads = headsOnScreen(table, useHeadsPlaced(table))

  const state = windowStateOf(ed, open.blockId, open.window, open.slot)

  const backfilled = useRef<Metrics | null>(null)
  useEffect(() => {
    if (frame === null || state === null) return
    carryTo(frame, state, backfilled.current)
    backfilled.current = { width: state.width, height: state.height }
  })

  if (state === null) return null

  const append = (): void => {
    const slot = state.columns.length
    state.setColumns([...state.columns, newColumn(slot)])
    setChosen(slot)
  }
  const headOfPickers = chosen === null ? undefined : heads.find((k) => k.slot === chosen)
  const plus = state.columns.length < COLUMNS_MAX && heads.length > 0
  const rect = frame?.windowBox() ?? null
  const box = rect === null ? null : { left: rect.left, top: rect.top, width: rect.width, height: rect.height }

  return createPortal(
    <>
      <div
        ref={layerRef}
        data-ff-editor-helper
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: LEVEL_OVER_MASK_WINDOW }}
      >
        {heads.map((head) => (
          <HeadHandle
            key={head.slot}
            head={head}
            chosen={chosen === head.slot}
            onChoose={() => setChosen((v) => (v === head.slot ? null : head.slot))}
          />
        ))}
        {box !== null && <WindowGrips ed={ed} state={state} box={box} />}
        {plus && (
          <AddColumn
            right={Math.max(...heads.map((h) => h.left + h.width))}
            top={Math.min(...heads.map((h) => h.top))}
            onAdd={append}
          />
        )}
      </div>

      {headOfPickers !== undefined && chosen !== null && (
        <LookupColumnPicker
          key={chosen}
          state={state}
          source={library.find((s) => s.id === state.sourceId)}
          slot={chosen}
          head={headOfPickers}
          layer={layerRef}
          onClose={() => setChosen(null)}
        />
      )}
    </>,
    document.body,
  )
}
