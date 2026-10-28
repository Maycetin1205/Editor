import { useRef, useState } from 'react'
import { Plus } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Grid, GridLine, GridNewLine, Strip } from '@/editor/widgets/Grid'
import type { DataSource } from '../../core/data/dataSources'
import { sourcePreset } from '../../core/data/presets'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { SourceBelow, SourceSettings } from './SourceSettings'
import { SOURCE_DRAG, SourceTabs } from './SourceTabs'
import { copyOf, inTab } from './sourceFiling'
import { useSourceFiling } from './useSourceFiling'
import { codeReads, fieldFrom, lengthReads, nameTaken, newSource, tableKind, tableText, withEntry } from './sourceEdit'

const SOURCE_COLUMNS = [{ name: 'Name' }, { name: 'Tabelle', width: 150, mono: true }]

const at = (v: readonly string[], k: number): string => v[k] ?? ''

export function SourcesTab({ startsNew }: { startsNew: boolean }) {
  const store = useDataSources()
  const ed = useEditor()
  const [markedId, setMarkedId] = useState<string | null>(() =>
    ed.selectedId === null ? null : (ed.dataSourceFor(ed.selectedId)?.id ?? null),
  )
  const filing = useSourceFiling(store, markedId)
  const marked = filing.shown.find((s) => s.id === markedId) ?? filing.shown[0]
  const taken = (name: string, except?: string) => nameTaken(store.list, name, except)
  const newName = useRef<HTMLInputElement>(null)

  return (
    <>
      <div className="flex w-[40%] min-w-[400px] shrink-0 flex-col border-r border-line-soft">
        <Strip
          right={
            <>
              <Button
                disabled={!marked}
                onClick={() => {
                  if (marked) setMarkedId(store.add(copyOf(marked, store.list)).id)
                }}
              >
                Duplizieren
              </Button>
              <Button onClick={() => newName.current?.focus()}>
                <Plus size={14} /> Neu
              </Button>
            </>
          }
        >
          Quellen
        </Strip>
        <SourceTabs {...filing.bar} />
        <Grid columns={SOURCE_COLUMNS} wrap>
          {filing.shown.map((s) => (
            <GridLine
              key={s.id}
              cells={[s.name, tableText(s)]}
              marked={marked?.id === s.id}
              tips
              valid={(v) => at(v, 0).trim() !== '' && !taken(at(v, 0), s.id) && tableKind(at(v, 1), s) !== null}
              onMark={() => setMarkedId(s.id)}
              onDragStart={(e) => {
                e.dataTransfer.setData(SOURCE_DRAG, s.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onSave={(v) => {
                const next = withEntry(s, { name: at(v, 0), table: at(v, 1) })
                if (next) store.update(s.id, next)
              }}
              onRemove={() => store.remove(s.id)}
            />
          ))}
          <GridNewLine
            names={['Neue Quelle, Name', 'Neue Quelle, Tabelle']}
            placeholders={['Neue Quelle', 'Tabelle']}
            firstRef={newName}
            autoFocus={startsNew}
            valid={(v) => !taken(at(v, 0)) && (at(v, 1).trim() === '' || tableKind(at(v, 1)) !== null)}
            onAdd={(v) => {
              const kind = tableKind(at(v, 1))
              if (at(v, 0).trim() === '' || taken(at(v, 0)) || !kind) return false
              setMarkedId(store.add(inTab(newSource(at(v, 0), kind), filing.tab)).id)
              return true
            }}
          />
        </Grid>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {marked ? <SourcePart key={marked.id} source={marked} /> : <Strip>{null}</Strip>}
      </div>
    </>
  )
}

function SourcePart({ source }: { source: DataSource }) {
  const store = useDataSources()
  const [markedAt, setMarkedAt] = useState<number | null>(null)
  const fields = source.fields
  const setFields = (next: DataSource['fields']) => {
    const changed = withEntry(source, { fields: next })
    if (changed) store.update(source.id, changed)
  }
  const codeFree = (code: string, except?: number) => !fields.some((f, k) => k !== except && f.code === code.trim())
  const label = sourcePreset(source.preset).columnsLabel
  const columns = [
    { name: label || 'Code', width: label === '' ? 120 : 170, mono: true },
    { name: 'Name' },
    { name: 'Max. Länge', width: 90, mono: true, right: true },
  ]

  return (
    <>
      <SourceSettings source={source} />
      <Grid columns={columns} wrap onEmpty={() => setMarkedAt(null)}>
        {fields.map((f, i) => (
          <GridLine
            key={`${i}:${f.code}`}
            cells={[f.code, f.name, f.length === undefined ? '' : String(f.length)]}
            marked={markedAt === i}
            tips
            valid={(v) =>
              codeReads(at(v, 0)) && at(v, 1).trim() !== '' && lengthReads(at(v, 2)) && codeFree(at(v, 0), i)
            }
            onMark={() => setMarkedAt(i)}
            onSave={(v) => setFields(fields.map((o, k) => (k === i ? fieldFrom(at(v, 0), at(v, 1), at(v, 2)) : o)))}
            onRemove={() => {
              setFields(fields.filter((_, k) => k !== i))
              setMarkedAt(null)
            }}
          />
        ))}
        <GridNewLine
          names={['Neues Feld, Code', 'Neues Feld, Name', 'Neues Feld, Max. Länge']}
          valid={(v) =>
            (at(v, 0).trim() === '' || (codeReads(at(v, 0)) && codeFree(at(v, 0)))) && lengthReads(at(v, 2))
          }
          onAdd={(v) => {
            if (!codeReads(at(v, 0)) || at(v, 1).trim() === '' || !lengthReads(at(v, 2)) || !codeFree(at(v, 0)))
              return false
            setFields([...fields, fieldFrom(at(v, 0), at(v, 1), at(v, 2))])
            return true
          }}
        />
      </Grid>
      <SourceBelow source={source} />
    </>
  )
}
