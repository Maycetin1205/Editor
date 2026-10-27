import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { Grid, GridAddLine, Strip, TD } from '@/editor/widgets/Grid'
import { Window } from '@/editor/widgets/Window'
import { blockName } from '../../core/block/blockName'
import { capability, hasCapability } from '../../core/block/capability'
import { blockType, declaredValue } from '../../core/block/registry'
import { sourcesInReach } from '../../core/block/sourcesInReach'
import { calculationsProperty, newCalculation, toldFrom, type Calculation } from '../../core/data/calculation'
import { KIND_NAMES } from '../origin/origins'
import { calculationReach, columnEntries, sourceGroup } from '../origin/reach'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { columnTitle, sentenceText, termName, termOriginKey, termsText, type Names } from './calculationWords'
import { CalculationSettings } from './CalculationSettings'
import { TermLine } from './TermLine'
import { useCalculationDraft, type CalculationDraft } from './useCalculationDraft'

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Zeichen', width: 72 },
  { name: 'Herkunft', width: 240 },
  { name: 'Eingabe' },
]

export function OpenCalculationWindow() {
  const ed = useEditor()
  const open = useView().calculationWindow
  const library = useDataSources().list
  if (open === null) return null
  const block = ed.tree[open.blockId]
  const def = block === undefined ? undefined : blockType(block.type)
  const prop = capability(def, 'compute')?.prop
  if (block === undefined || prop === undefined) return null
  const list = hasCapability(def, 'list')

  const all = declaredValue(block, calculationsProperty)
  const present = all.flatMap((b) => {
    const told = toldFrom(b, open.column)
    return told === null ? [] : [told]
  })[0]
  const own = present ?? newCalculation(all, open.column)
  const close = (): void => ed.view.openCalculation(null)

  return (
    <CalculationWindow
      key={`${open.blockId}:${open.column}:${own.key}`}
      calculation={own}
      names={
        list
          ? {
              lead: open.column,
              reach: {
                row: columnEntries(block),
                helpers: sourcesInReach(ed.tree, block.id, library)
                  .slice(1)
                  .map((q) => sourceGroup(q.source)),
              },
            }
          : { lead: '', leadName: blockName(block, library), reach: calculationReach(ed.tree, library) }
      }
      onApply={(next) => {
        ed.updateProperty(
          block.id,
          prop,
          present === undefined ? [...all, next] : all.map((b) => (b.key === next.key ? next : b)),
        )
        close()
      }}
      onRemove={
        present === undefined
          ? undefined
          : () => {
              ed.updateProperty(
                block.id,
                prop,
                all.filter((b) => b.key !== own.key),
              )
              close()
            }
      }
      onClose={close}
    />
  )
}

function CalculationWindow({
  calculation,
  names,
  onApply,
  onRemove,
  onClose,
}: {
  calculation: Calculation
  names: Names
  onApply: (b: Calculation) => void
  onRemove?: () => void
  onClose: () => void
}) {
  const d = useCalculationDraft(calculation)
  return (
    <Window
      title="Berechnung"
      beside={
        <span className="min-w-0 truncate border-l border-line-soft pl-[14px] font-mono text-dense text-muted">
          {sentenceText(d.finished, names)}
        </span>
      }
      width={1040}
      height={640}
      level={50}
      foot={
        <>
          {onRemove !== undefined && (
            <Button kind="risk" className="mr-auto" onClick={onRemove}>
              Berechnung entfernen
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" disabled={!d.ready} onClick={() => onApply(d.finished)}>
            Übernehmen
          </Button>
        </>
      }
      onClose={onClose}
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
        <TermsPane d={d} names={names} />
        <CalculationSettings d={d} names={names} />
      </div>
    </Window>
  )
}

// The left side: the lead of the sentence and one line per term.
function TermsPane({ d, names }: { d: CalculationDraft; names: Names }) {
  const { draft, pending, open } = d
  return (
    <div className="flex min-h-0 flex-col border-r border-line-soft">
      <Strip right={termsText(d.complete.length)}>Satz</Strip>
      <Grid columns={COLUMNS} onEmpty={d.unselect}>
        <tr className="cursor-default">
          <td className={TD} />
          <td className={cn(TD, 'px-[10px] font-mono text-dense text-muted')}>=</td>
          <td className={cn(TD, 'px-[10px] text-muted')}>
            {names.leadName === undefined ? KIND_NAMES.row : KIND_NAMES.block}
          </td>
          <td className={cn(TD, 'truncate px-[10px] font-semibold')}>{columnTitle(names, draft.lead)}</td>
        </tr>
        {d.terms.map((term, i) => (
          <TermLine
            key={i}
            nr={i + 1}
            term={term}
            adds={draft.adds === true}
            names={names}
            origin={pending?.at === i ? pending.origin : termOriginKey(term)}
            entry={pending?.at === i ? '' : termName(term, names)}
            on={d.selected === i}
            open={open?.at === i ? open.list : null}
            onSelect={() => d.select(i)}
            onOpen={(list) => d.setOpen(list === null ? null : { at: i, list })}
            onSign={(divides) => d.setTerm(i, { ...term, divides })}
            onOrigin={(key) => d.chooseOrigin(i, key)}
            onTake={(value) => d.takeEntry(i, value)}
            onType={(value) => d.setTerm(i, { kind: 'fixed', value, divides: term.divides })}
            onRemove={() => d.remove(i)}
          />
        ))}
        <GridAddLine onAdd={d.add}>Größe hinzufügen</GridAddLine>
      </Grid>
    </div>
  )
}
