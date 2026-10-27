import type { ReactNode } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Grid, GridAddLine, TD } from '@/editor/widgets/Grid'
import { LINE_HOVER } from '@/editor/widgets/lineLook'
import type { RelationTemplate } from '../../core/data/relations'
import type { Reach } from '../origin/reach'
import { PlaceLine } from './PlaceLine'
import { entryText, placeEntries, placeEntry, placeGroups, placeOrigin, placeOriginName } from './placeOrigins'
import { usePlaces, type Filled } from './usePlaces'

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Bezeichnung', width: 150 },
  { name: 'Herkunft', width: 240 },
  { name: 'Eingabe' },
]

// The call as SoftEngine gets it, with what each place is filled from.
export function Result({ template, filled, reach }: { template: RelationTemplate; filled: Filled; reach: Reach }) {
  const all = [...filled.parameter, ...filled.extraParameter]
  return (
    <div className="break-all border-b border-line-soft px-[12px] py-[9px] font-mono text-dense leading-[19px] text-muted">
      {template.verb}[{template.nr}
      {all.map((b, k) => {
        const entry = placeEntry(b, reach)
        return (
          <span key={k}>
            !
            {entry !== '' && (
              <span className="font-semibold text-ink">{b.source === 'fixed' ? entry : `{${entry}}`}</span>
            )}
          </span>
        )
      })}
      ]
    </div>
  )
}

function FoldLine({ shut, onToggle, children }: { shut: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <tr className={cn('text-muted hover:text-ink', LINE_HOVER)}>
      <td className={TD} />
      <td className={TD} colSpan={COLUMNS.length - 1}>
        <button
          type="button"
          aria-expanded={!shut}
          onClick={onToggle}
          className="flex h-[28px] w-full items-center gap-[8px] px-[10px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        >
          <ChevronDown size={13} aria-hidden className={cn('shrink-0 transition-transform', shut && '-rotate-90')} />
          {children}
        </button>
      </td>
    </tr>
  )
}

interface PlacesProps {
  template: RelationTemplate
  filled: Filled
  reach: Reach
  extras?: boolean
  fill?: boolean
  fold?: boolean
  wrap?: boolean
  onChange: (filled: Filled) => void
}

// The places of a relation call, each with its origin and value.
export function Places({
  template,
  filled,
  reach,
  extras = true,
  fill = true,
  fold = false,
  wrap = false,
  onChange,
}: PlacesProps) {
  const p = usePlaces({ template, filled, reach, fold, onChange })
  const hidden = p.shown.filter((s) => !s).length

  return (
    <Grid columns={COLUMNS} fill={fill} wrap={wrap}>
      {p.all.map((b, i) => {
        if (p.shown[i] !== true) return null
        const raw = template.parameter[i] ?? '…'
        const origin = p.pending?.at === i ? p.pending.origin : placeOrigin(b, raw, p.adopted)
        return (
          <PlaceLine
            key={i}
            nr={i + 1}
            raw={raw}
            binding={b}
            origin={origin}
            originText={placeOriginName(origin, reach, p.adopted?.label)}
            entry={p.pending?.at === i ? '' : entryText(b, reach)}
            on={p.selected === i}
            wraps={wrap}
            open={p.open?.at === i ? p.open.list : null}
            origins={() => placeGroups(raw, reach)}
            entries={() => placeEntries(origin, reach)}
            onSelect={() => p.select(i)}
            onOpen={(list) => p.setOpen(list === null ? null : { at: i, list })}
            onOrigin={(o) => p.chooseOrigin(i, o)}
            onTake={(value) => p.take(i, value)}
            onType={(value) => p.set(i, { source: 'fixed', value })}
            onMove={(by) => p.move(i, by)}
            onDone={p.done}
            onRemove={i >= p.fixedCount ? () => p.remove(i) : undefined}
          />
        )
      })}
      {p.folding && (hidden > 0 || !p.shut) && (
        <FoldLine shut={p.shut} onToggle={() => p.setShut(!p.shut)}>
          {p.shut ? `${hidden} leere ${hidden === 1 ? 'Stelle' : 'Stellen'}` : 'Leere Stellen einklappen'}
        </FoldLine>
      )}
      {extras && template.extraParameterAllowed === true && (
        <GridAddLine onAdd={p.addExtra}>Stelle hinzufügen</GridAddLine>
      )}
    </Grid>
  )
}
