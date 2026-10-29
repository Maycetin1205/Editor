import { useState } from 'react'
import { ChevronDown, Search } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Field } from '@/editor/widgets/Field'
import { Grid, Strip, STRIP_FIELD, TD } from '@/editor/widgets/Grid'
import { LINE_HOVER } from '@/editor/widgets/lineLook'
import { relationParameterDefault } from '../../core/data/actions'
import {
  relationFitsToSearch,
  relationSyntaxAsText,
  type RelationTemplate,
  type RelationVerb,
} from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import { PickerControl } from '../controls/PickerControl'
import type { Reach } from '../origin/reach'
import { Places, Result } from './Places'
import { placeEmpty } from './placeOrigins'
import type { StepBodyProps } from './stepTypes'

export function GetRelationBody(props: StepBodyProps) {
  return <RelationTab verb="GET_RELATION" {...props} />
}

export function PutRelationBody(props: StepBodyProps) {
  return <RelationTab verb="PUT_RELATION" {...props} />
}

function RelationTab({ verb, step, context, reach, onChange }: StepBodyProps & { verb: RelationVerb }) {
  if (step.kind !== 'RELATION') return null
  return (
    <RelationBody
      step={step}
      verb={verb}
      template={context.relations.find((r) => r.id === step.relationId)}
      relations={context.relations}
      reach={reach}
      onChange={onChange}
    />
  )
}

function RelationBody({
  step,
  verb,
  template,
  relations,
  reach,
  onChange,
}: {
  step: RelationStep
  verb: RelationVerb
  template: RelationTemplate | undefined
  relations: readonly RelationTemplate[]
  reach: Reach
  onChange: (step: RelationStep) => void
}) {
  const [showResult, setShowResult] = useState(false)
  const offered = relations.filter((r) => r.verb === verb)
  const choose = (relationId: string) => {
    const t = relations.find((r) => r.id === relationId)
    if (!t) return
    onChange({
      ...step,
      relationId,
      parameter: relationParameterDefault(t),
      extraParameter: t.extraParameterAllowed ? step.extraParameter : [],
    })
  }

  if (!template) return <RelationList relations={offered} onChoose={choose} />

  const all = [...step.parameter, ...step.extraParameter]
  const used = all.filter((b) => !placeEmpty(b)).length

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-0 flex-col border-r border-line-soft">
        <Strip>Relation</Strip>
        <div className="border-b border-line-soft px-[12px] py-[8px]">
          <PickerControl
            name="Relation"
            className="w-full"
            groups={[
              {
                key: 'relations',
                entries: offered.map((r) => ({ value: r.id, name: r.name, badge: relationSyntaxAsText(r) })),
              },
            ]}
            value={template.id}
            onChoose={choose}
          />
        </div>
        <Strip right={`${used} von ${all.length} belegt`}>Stellen</Strip>
        <Places
          key={template.id}
          template={template}
          filled={step}
          reach={reach}
          fold
          onChange={(filled) =>
            onChange({ ...step, parameter: [...filled.parameter], extraParameter: [...filled.extraParameter] })
          }
        />
      </div>
      <RelationSide
        template={template}
        step={step}
        reach={reach}
        showResult={showResult}
        onToggleResult={() => setShowResult(!showResult)}
      />
    </div>
  )
}

// Right column: collapsible result preview and the relation's name.
function RelationSide({
  template,
  step,
  reach,
  showResult,
  onToggleResult,
}: {
  template: RelationTemplate
  step: RelationStep
  reach: Reach
  showResult: boolean
  onToggleResult: () => void
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <button
        type="button"
        aria-expanded={showResult}
        onClick={onToggleResult}
        className="flex h-[36px] shrink-0 items-center gap-[8px] border-b border-line-soft bg-panel px-[12px] text-left text-ui font-bold text-ink transition-colors hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        <ChevronDown
          size={14}
          aria-hidden
          className={cn('shrink-0 text-muted transition-transform', !showResult && '-rotate-90')}
        />
        Ergebnis
      </button>
      {showResult && <Result template={template} filled={step} reach={reach} />}
      <Strip>Bezeichnung</Strip>
      <div className="px-[12px] py-[9px]">{template.name}</div>
    </div>
  )
}

function RelationList({
  relations,
  onChoose,
}: {
  relations: readonly RelationTemplate[]
  onChoose: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const hits = relations.filter((r) => relationFitsToSearch(r, search))
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip right={hits.length}>
        <Search size={13} aria-hidden className="text-muted" />
        <Field
          aria-label="Relationen durchsuchen"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className={STRIP_FIELD}
        />
      </Strip>
      <Grid
        columns={[
          { name: 'Syntax', mono: true },
          { name: 'Bezeichnung', width: 300 },
        ]}
      >
        {hits.map((r) => (
          <tr key={r.id} className={cn('cursor-pointer', LINE_HOVER)} onClick={() => onChoose(r.id)}>
            <td className={cn(TD, 'truncate px-[10px] font-mono text-dense')} title={relationSyntaxAsText(r)}>
              {relationSyntaxAsText(r)}
            </td>
            <td className={cn(TD, 'truncate px-[10px]')}>{r.name}</td>
          </tr>
        ))}
      </Grid>
    </div>
  )
}
