import { useMemo, useState } from 'react'
import { Button } from '@/editor/widgets/Button'
import { Window } from '@/editor/widgets/Window'
import { resultStepsBefore, withCondition } from '../../core/data/steps/chains'
import type { Step } from '../../core/data/steps/steps'
import type { StepCondition } from '../../core/data/steps/stepAdapter'
import type { Reach } from '../origin/reach'
import { ConditionLine } from './ConditionLine'
import { STEP_TABS, stepPiece, stepTab, type StepContext, type StepTab } from './stepPiece'

function firstTabOf(asked: StepTab, step: Step | undefined, context: StepContext): StepTab {
  const count = (key: StepTab): number | undefined => stepTab(key).count?.(context)
  if (step !== undefined || count(asked) !== 0) return asked
  return STEP_TABS.find((t) => (count(t.key) ?? 0) > 0)?.key ?? asked
}

export function StepWindow({ nr, step, tab: askedTab, chain, context, onApply, onClose }: {
  nr: number
  step: Step | undefined
  tab: StepTab
  chain: readonly Step[]
  context: StepContext
  onApply: (step: Step) => void
  onClose: () => void
}) {
  const [id] = useState(() => step?.id ?? crypto.randomUUID())
  const [tab, setTab] = useState<StepTab>(() => firstTabOf(askedTab, step, context))
  const [drafts, setDrafts] = useState<Partial<Record<StepTab, Step>>>({})
  const [onlyIf, setOnlyIf] = useState<StepCondition | undefined>(step?.onlyIf)

  const reach: Reach = useMemo(() => ({
    ...context.reach,
    steps: resultStepsBefore(chain, id, context.relations),
  }), [context, chain, id])

  const shown = stepTab(tab)
  const draft = withCondition(drafts[tab] ?? shown.start(id, step, context), onlyIf)
  const { words, short, known } = stepPiece(draft.kind).words(draft, context)

  return (
    <Window
      title={`Schritt ${nr}`}
      beside={known && (
        <span className="flex min-w-0 items-center gap-[8px] border-l border-line-soft pl-[14px] text-muted">
          <span className="min-w-0 truncate" title={words}>{words}</span>
          {short !== '' && <span className="shrink-0 font-mono text-dense">{short}</span>}
        </span>
      )}
      tabs={STEP_TABS.map((t) => ({ key: t.key, name: t.name, ...(t.count ? { count: t.count(context) } : {}) }))}
      tab={tab}
      onTab={setTab}
      width={1040}
      height={720}
      level={50}
      foot={(
        <>
          <ConditionLine condition={onlyIf} sources={context.reach.sources ?? []} onChange={setOnlyIf} />
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" disabled={!known} onClick={() => onApply(draft)}>Übernehmen</Button>
        </>
      )}
      onClose={onClose}
    >
      <shown.Body
        key={tab}
        step={draft}
        context={context}
        reach={reach}
        onChange={(next) => setDrafts((d) => ({ ...d, [tab]: next }))}
      />
    </Window>
  )
}
