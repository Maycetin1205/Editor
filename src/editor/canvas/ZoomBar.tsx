import { useRef, useState } from 'react'
import { Plus } from '@/editor/icons/icon'
import { Button, PRESSED } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { MenuRow } from '@/editor/widgets/MenuRow'
import { Popover } from '@/editor/widgets/Popover'
import { Separator } from '@/editor/widgets/Separator'
import { ZOOM_LEAST, ZOOM_MOST, ZOOM_PRESETS, zoomStep, type SheetZoom } from './sheetZoom'

const PERCENT = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0 })

const MINUS = ['M5 12h14']
const FIT = [
  'M8 3H5a2 2 0 0 0-2 2v3',
  'M21 8V5a2 2 0 0 0-2-2h-3',
  'M3 16v3a2 2 0 0 0 2 2h3',
  'M16 21h3a2 2 0 0 0 2-2v-3',
]

function Glyph({ paths, size = 14 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const SMALL = 'h-[28px] w-[28px]'

export function ZoomBar({ zoom, choice, fit, choose }: SheetZoom) {
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement | null>(null)
  const pick = (next: SheetZoom['choice']): void => {
    setOpen(false)
    choose(next)
  }

  return (
    <div
      data-ff-editor-helper
      className="flex h-[36px] shrink-0 items-center justify-end gap-[2px] border-t border-line bg-ground px-[8px]"
    >
      <Button
        kind="command"
        onlyIcon
        className={SMALL}
        aria-label="Verkleinern (Strg+Minus)"
        title="Verkleinern (Strg+Minus)"
        disabled={zoom <= ZOOM_LEAST}
        onClick={() => choose(zoomStep(zoom, -1))}
      >
        <Glyph paths={MINUS} />
      </Button>
      <button
        ref={opener}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Zoom ${PERCENT.format(zoom)}, Stufe wählen`}
        title="Zoomstufe wählen (Strg+Mausrad)"
        onClick={() => setOpen((was) => !was)}
        className={cn(
          'h-[28px] min-w-[60px] rounded px-[8px] text-center text-ui font-semibold tabular-nums text-ink-2 transition-colors',
          'hover:bg-hover hover:text-ink aria-expanded:bg-accent-soft aria-expanded:text-accent',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        )}
      >
        {PERCENT.format(zoom)}
      </button>
      <Button
        kind="command"
        onlyIcon
        className={SMALL}
        aria-label="Vergrößern (Strg+Plus)"
        title="Vergrößern (Strg+Plus)"
        disabled={zoom >= ZOOM_MOST}
        onClick={() => choose(zoomStep(zoom, 1))}
      >
        <Plus size={14} />
      </Button>

      <Separator vertical className="mx-[6px]" />

      <Button
        kind="command"
        aria-pressed={choice === 'fit'}
        className={cn('h-[28px] px-[10px]', choice === 'fit' && PRESSED)}
        title="Die ganze Breite der Maske zeigen (Strg+0)"
        onClick={() => choose('fit')}
      >
        <Glyph paths={FIT} /> Einpassen
      </Button>

      {open && (
        <Popover name="Zoomstufe" anchor={opener} width={184} onClose={() => setOpen(false)}>
          <div role="menu" aria-label="Zoomstufe" className="flex flex-col">
            <MenuRow
              role="menuitemradio"
              aria-checked={choice === 'fit'}
              active={choice === 'fit'}
              onClick={() => pick('fit')}
            >
              Einpassen
              <span className="ml-auto font-normal tabular-nums text-muted">{PERCENT.format(fit)}</span>
            </MenuRow>
            {ZOOM_PRESETS.map((preset) => (
              <MenuRow
                key={preset}
                role="menuitemradio"
                aria-checked={choice === preset}
                active={choice === preset}
                onClick={() => pick(preset)}
              >
                <span className="tabular-nums">{PERCENT.format(preset)}</span>
                {preset === 1 && <span className="ml-auto font-normal text-muted">wie in SoftEngine</span>}
              </MenuRow>
            ))}
          </div>
        </Popover>
      )}
    </div>
  )
}
