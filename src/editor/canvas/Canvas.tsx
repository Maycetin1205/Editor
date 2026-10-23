import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { fitZoom, FIT_LEAST, SE_FRAME_HEIGHT, SE_FRAME_WIDTH } from '../../core/block/frameFit'
import { GRID, gridAreaStyle } from '../../core/block/grid'
import { freeRowOn } from '../../core/block/gridArea'
import { useEditor } from '../state/useEditor'
import { NodeList } from './NodeList'
import { isNewBlockDrag } from './dnd'
import { commitDrop, DndContext, sameTarget, type DndState, type DragOffset, type DropTarget } from './dndState'
import { gridTarget } from './gridDnd'
import { areaUnderPointer } from './gridArea'
import { PopupPage } from './PopupPage'
import { SHEET_MARGIN, useSheetZoom } from './sheetZoom'
import { ZoomBar } from './ZoomBar'

const SHEET_WIDTH = SE_FRAME_WIDTH

export function Canvas() {
  const ed = useEditor()
  const mainPage = ed.pages.find((p) => p.id === ed.activePageId)?.isMainPage ?? true
  const { canvas, sheet, ...sheetZoom } = useSheetZoom(mainPage, ed.selectedId)
  const zoom = sheetZoom.zoom
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, rememberDropTarget] = useState<DropTarget | null>(null)

  const setDropTarget = useCallback((target: DropTarget | null) => {
    rememberDropTarget((before) => (sameTarget(before, target) ? before : target))
  }, [])

  const [dragOffset, setDragOffset] = useState<DragOffset | null>(null)

  const dnd = useMemo<DndState>(() => ({
    dragId,
    dropTarget,
    dragOffset,
    setDragId,
    setDropTarget,
    setDragOffset,
    reset: () => {
      setDragId(null)
      setDropTarget(null)
      setDragOffset(null)
    },
  }), [dragId, dropTarget, dragOffset, setDropTarget])

  const maskRows = mainPage ? freeRowOn(ed.tree, ed.rootId) : 0

  const onGridDragOver = (e: DragEvent) => {
    if (!mainPage || (dragId === null && !isNewBlockDrag(e.dataTransfer))) return
    const target = areaUnderPointer(ed.tree, ed.rootId, e.clientX, e.clientY)
    if (!target) return setDropTarget(null)
    e.preventDefault()
    setDropTarget(gridTarget(e, ed, dnd, target.parentId, target.area))
  }

  return (
    <DndContext.Provider value={dnd}>
      <div className="flex h-full w-full flex-col">
        <div
          ref={canvas}
          data-ff-canvas
          onClick={() => {
            if (ed.followPickFor !== null) ed.pickFollowFor(null)
            else ed.selectBlock(null)
          }}

          className="relative min-h-0 w-full flex-1 overflow-auto"

          style={{
            minHeight: 400,
            boxSizing: 'border-box',
            fontFamily: 'var(--se-font)',
            fontSize: 'var(--se-fs)',
            lineHeight: 'var(--se-lh)',
            color: 'var(--se-ink)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--se-scrollbar) transparent',
            scrollbarGutter: 'stable',
          }}
        >
          <SheetRoom on={mainPage}>
            <div
              ref={sheet}
              data-ff-root-area

              style={{
                ...gridAreaStyle(),
                ...(mainPage
                  ? {
                      zoom,
                      width: SHEET_WIDTH,
                      flexGrow: 1,
                      alignSelf: 'center',
                    }
                  : { height: '100%' }),
                padding: 'var(--se-sheet-top) var(--se-sheet-x) var(--se-sheet-bottom)',
                boxSizing: 'border-box',
                fontVariantNumeric: 'tabular-nums',
                caretColor: 'var(--se-accent)',
              }}
              onDragOver={onGridDragOver}
              onDrop={(e) => {
                e.preventDefault()
                commitDrop(e, ed, dnd)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDropTarget(null)
                }
              }}
            >
              {maskRows > 0 && <Paper rows={maskRows} zoom={zoom} />}
              {mainPage && <NodeList parentId={ed.rootId} />}
            </div>
          </SheetRoom>

          {mainPage && ed.blockCount === 0 && dropTarget === null && <EmptyCanvas />}
          {!mainPage && <PopupPage popupId={ed.activePageId} />}
        </div>
        {mainPage && <ZoomBar {...sheetZoom} />}
      </div>
    </DndContext.Provider>
  )
}

// Around the sheet of the main page: as wide as the sheet when it is zoomed
// past the canvas, so it scrolls sideways with a margin on both sides.
function SheetRoom({ on, children }: { on: boolean; children: ReactNode }) {
  if (!on) return children
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 'max-content',
        minWidth: '100%',
        minHeight: '100%',
        padding: SHEET_MARGIN,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}

function Paper({ rows, zoom }: { rows: number; zoom: number }) {
  const paper = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const el = paper.current
    const area = el?.parentElement
    if (!el || !area) return
    const watch = new ResizeObserver(() => setHeight(paperHeight(rows, area)))
    watch.observe(el)
    return () => watch.disconnect()
  }, [rows])

  return (
    <>
      <div
        ref={paper}
        aria-hidden
        data-ff-editor-helper
        style={{
          gridColumn: '1 / -1',
          gridRow: `1 / span ${rows}`,
          margin: 'calc(-1 * var(--se-sheet-top)) calc(-1 * var(--se-sheet-x)) calc(-1 * var(--se-sheet-bottom))',
          background: 'var(--se-bg)',
          boxShadow: 'var(--se-shadow-pop)',
          pointerEvents: 'none',
        }}
      />
      {height > 0 && (
        <p
          data-ff-editor-helper
          className="pointer-events-none whitespace-nowrap font-sans text-dense text-muted"
          style={{
            gridColumn: '1 / -1',
            gridRow: `${rows + 1}`,
            zoom: 1 / zoom,
            margin: `calc(var(--se-sheet-bottom) * ${zoom} + 2px) 0 0 calc(-1 * var(--se-sheet-x) * ${zoom})`,
          }}
        >
          {frameLine(height)}
        </p>
      )}
    </>
  )
}

function paperHeight(rows: number, area: HTMLElement): number {
  const style = getComputedStyle(area)
  const room = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
  return rows * GRID.rowPx + (rows - 1) * GRID.gapPx + room
}

const PERCENT = new Intl.NumberFormat('de-DE', { style: 'percent' })

function frameLine(own: number): string {
  const frame = `In SoftEngine (Rahmen ${SE_FRAME_HEIGHT} px hoch): ${own} px`
  const zoom = fitZoom(SE_FRAME_HEIGHT, own)
  if (zoom === 1) return `${frame}, passt in voller Größe.`
  const rolls = Math.ceil(own * zoom - SE_FRAME_HEIGHT)
  if (rolls <= 0) return `${frame}, verkleinert auf ${PERCENT.format(zoom)}, nichts rollt.`
  return `${frame}, auch auf ${PERCENT.format(FIT_LEAST)} verkleinert zu hoch, rollt um ${rolls} px.`
}

function EmptyCanvas() {
  return (
    <div
      data-ff-editor-helper
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-center text-ui text-muted"
    >
      <p className="text-title font-bold text-ink">Die Maske ist leer</p>
      <p>Einen Baustein in der Spalte links anklicken oder hierher ziehen.</p>
      <p>Oder eine gespeicherte Maske im Reiter „Masken“ öffnen, etwa aus dem Ordner „masken“.</p>
    </div>
  )
}
