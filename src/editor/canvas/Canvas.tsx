import type { CSSProperties, ReactNode, RefObject } from 'react'
import { SE_FRAME_WIDTH } from '../../core/block/frameFit'
import { gridAreaStyle } from '../../core/block/grid'
import { freeRowOn } from '../../core/block/gridArea'
import { useEditorInstance } from '../state/EditorContext'
import { useEditorSelect } from '../state/useEditorSelect'
import { NodeList } from './NodeList'
import { DndContext, useDnd, useDndState } from './dndState'
import { useStoreSelect } from '../state/useStoreSelect'
import { pageDrop } from './gridDnd'
import { Paper } from './Paper'
import { PopupPage } from './PopupPage'
import { SHEET_MARGIN, useSheetZoom } from './sheetZoom'
import { ZoomBar } from './ZoomBar'

const SHEET_WIDTH = SE_FRAME_WIDTH

const CANVAS_STYLE: CSSProperties = {
  minHeight: 400,
  boxSizing: 'border-box',
  fontFamily: 'var(--se-font)',
  fontSize: 'var(--se-fs)',
  lineHeight: 'var(--se-lh)',
  color: 'var(--se-ink)',
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--se-scrollbar) transparent',
  scrollbarGutter: 'stable',
}

const SHEET_ROOM_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: 'max-content',
  minWidth: '100%',
  minHeight: '100%',
  padding: SHEET_MARGIN,
  boxSizing: 'border-box',
}

export function Canvas() {
  const ed = useEditorInstance()
  const mainPage = useEditorSelect((e) => e.pages.find((p) => p.id === e.activePageId)?.isMainPage ?? true)
  const selectedId = useEditorSelect((e) => e.selectedId)
  const empty = useEditorSelect((e) => e.blockCount === 0)
  const activePageId = useEditorSelect((e) => e.activePageId)
  const { canvas, sheet, ...sheetZoom } = useSheetZoom(mainPage, selectedId)
  const dnd = useDndState()
  const noGhost = useStoreSelect(dnd, (d) => d.dropTarget === null)

  return (
    <DndContext.Provider value={dnd}>
      <div className="flex h-full w-full flex-col">
        <div
          ref={canvas}
          data-ff-canvas
          onClick={() => {
            if (ed.view.followPickFor !== null) ed.view.pickFollowFor(null)
            else ed.selectBlock(null)
          }}
          className="relative min-h-0 w-full flex-1 overflow-auto"
          style={CANVAS_STYLE}
        >
          <SheetRoom on={mainPage}>
            <RootArea sheet={sheet} mainPage={mainPage} zoom={sheetZoom.zoom} />
          </SheetRoom>

          {mainPage && empty && noGhost && <EmptyCanvas />}
          {!mainPage && <PopupPage popupId={activePageId} />}
        </div>
        {mainPage && <ZoomBar {...sheetZoom} />}
      </div>
    </DndContext.Provider>
  )
}

// The grid area of the main page, the sheet that zooms. On a popup page it
// stays empty under the popup.
function RootArea({
  sheet,
  mainPage,
  zoom,
}: {
  sheet: RefObject<HTMLDivElement | null>
  mainPage: boolean
  zoom: number
}) {
  const ed = useEditorInstance()
  const dnd = useDnd()
  const maskRows = useEditorSelect((e) => (mainPage ? freeRowOn(e.tree, e.rootId) : 0))
  const rootId = useEditorSelect((e) => e.rootId)
  return (
    <div
      ref={sheet}
      data-ff-root-area
      style={{
        ...gridAreaStyle(),
        ...(mainPage ? { zoom, width: SHEET_WIDTH, flexGrow: 1, alignSelf: 'center' } : { height: '100%' }),
        padding: 'var(--se-sheet-top) var(--se-sheet-x) var(--se-sheet-bottom)',
        boxSizing: 'border-box',
        fontVariantNumeric: 'tabular-nums',
        caretColor: 'var(--se-accent)',
      }}
      {...pageDrop(ed, dnd, rootId, mainPage)}
    >
      {maskRows > 0 && <Paper rows={maskRows} zoom={zoom} />}
      {mainPage && <NodeList parentId={rootId} />}
    </div>
  )
}

// Around the sheet of the main page: as wide as the sheet when it is zoomed
// past the canvas, so it scrolls sideways with a margin on both sides.
function SheetRoom({ on, children }: { on: boolean; children: ReactNode }) {
  if (!on) return children
  return <div style={SHEET_ROOM_STYLE}>{children}</div>
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
