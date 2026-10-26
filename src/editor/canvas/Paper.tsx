import { useEffect, useRef, useState } from 'react'
import { fitZoom, FIT_LEAST, SE_FRAME_HEIGHT } from '../../core/block/frameFit'
import { GRID } from '../../core/block/grid'

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

// The paper behind the rows of the main page, and under it how the mask fits
// into the frame SoftEngine gives it.
export function Paper({ rows, zoom }: { rows: number; zoom: number }) {
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
