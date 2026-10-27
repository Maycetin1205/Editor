import { useState } from 'react'
import { Search } from '@/editor/icons/icon'
import { Field } from '@/editor/widgets/Field'
import { Grid, GridLine, GridNewLine, Strip, STRIP_FIELD, TD } from '@/editor/widgets/Grid'
import { blockName } from '../../core/block/blockName'
import { relationIdsOf } from '../../core/block/treeQuery'
import { deliveryAdapter } from '../../core/data/deliveries/deliveries'
import {
  relationFitsToSearch,
  relationSyntaxAsText,
  relationSyntaxRead,
  type RelationTemplate,
} from '../../core/data/relations'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'

const COLUMNS = [
  { name: 'Syntax', mono: true },
  { name: 'Bezeichnung', width: 260 },
]

const at = (v: readonly string[], k: number): string => v[k] ?? ''

function relationFrom(
  before: RelationTemplate | undefined,
  syntaxText: string,
  name: string,
): Omit<RelationTemplate, 'id'> | null {
  const syntax = relationSyntaxRead(syntaxText)
  if (!syntax || name.trim() === '') return null
  const positions = before?.positions
  const keeps = positions && syntax.verb === 'GET_RELATION' && positions.slots.length === syntax.parameter.length
  return {
    name: name.trim(),
    verb: syntax.verb,
    nr: syntax.nr,
    parameter: [...syntax.parameter],
    extraParameterAllowed: syntax.extraParameterAllowed,
    ...(keeps ? { positions } : {}),
  }
}

export function RelationsTab() {
  const store = useRelations()
  const [search, setSearch] = useState('')
  const [markedId, setMarkedId] = useState<string | null>(null)

  const hits = store.list.filter((r) => relationFitsToSearch(r, search))
  const marked = hits.find((r) => r.id === markedId)
  const usage = useRelationUsage(marked)

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <Strip right={hits.length}>
          <Search size={13} aria-hidden className="text-muted" />
          <Field
            aria-label="Relationen durchsuchen"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            className={STRIP_FIELD}
          />
        </Strip>
        <Grid columns={COLUMNS} wrap onEmpty={() => setMarkedId(null)}>
          {hits.map((r) => (
            <GridLine
              key={r.id}
              cells={[relationSyntaxAsText(r), r.name]}
              marked={marked?.id === r.id}
              tips
              valid={(v) => relationFrom(r, at(v, 0), at(v, 1)) !== null}
              onMark={() => setMarkedId(r.id)}
              onSave={(v) => {
                const next = relationFrom(r, at(v, 0), at(v, 1))
                if (next) store.update(r.id, next)
              }}
              onRemove={() => store.remove(r.id)}
            />
          ))}
          <GridNewLine
            names={['Neue Relation, Syntax', 'Neue Relation, Bezeichnung']}
            valid={(v) => at(v, 0).trim() === '' || relationSyntaxRead(at(v, 0)) !== null}
            onAdd={(v) => {
              const next = relationFrom(undefined, at(v, 0), at(v, 1))
              if (!next) return false
              setMarkedId(store.add(next).id)
              return true
            }}
          />
        </Grid>
      </div>

      <RelationDetail marked={marked} usage={usage} />
    </>
  )
}

// Names of the blocks and sources that refer to the relation.
function useRelationUsage(marked: RelationTemplate | undefined): string[] {
  const ed = useEditor()
  const sources = useDataSources().list
  if (!marked) return []
  return [
    ...Object.values(ed.tree)
      .filter((n) => relationIdsOf(n).includes(marked.id))
      .map((n) => blockName(n, sources)),
    ...sources
      .filter((s) => deliveryAdapter(s.delivery.kind).relationIds(s.delivery).includes(marked.id))
      .map((s) => `Quelle ${s.name}`),
  ]
}

// Right column: syntax, places and users of the marked relation.
function RelationDetail({ marked, usage }: { marked: RelationTemplate | undefined; usage: readonly string[] }) {
  return (
    <div className="flex w-[300px] shrink-0 flex-col border-l border-line-soft">
      <Strip wrap>{marked?.name ?? 'Relation'}</Strip>
      {marked && (
        <>
          <div className="break-all border-b border-line-soft px-[12px] py-[8px] font-mono text-dense">
            {relationSyntaxAsText(marked)}
          </div>
          <Strip right={marked.parameter.length}>Stellen</Strip>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {marked.parameter.map((name, i) => (
                  <tr key={i}>
                    <td className={`${TD} w-[44px] px-[10px] text-right font-mono text-dense text-muted`}>{i + 1}</td>
                    <td className={`${TD} px-[10px] font-mono text-dense`}>{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usage.length > 0 && (
            <>
              <div className="border-t border-line-soft">
                <Strip>Benutzt von</Strip>
              </div>
              <div className="px-[12px] py-[8px] text-dense">{usage.join(', ')}</div>
            </>
          )}
        </>
      )}
    </div>
  )
}
