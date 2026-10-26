import type { ReactNode } from 'react'
import { FolderOpen, Plus } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { DoneLabel } from '@/editor/widgets/DoneLabel'
import { LINE_CHOSEN, LINE_HOVER } from '@/editor/widgets/lineLook'
import { TEMPLATE_FOLDER, type MaskEntry } from '../state/maskFolder'

interface Group {
  key: string
  name: string
  template: boolean
  entries: MaskEntry[]
}

function groupsOf(entries: readonly MaskEntry[], folderName: string): Group[] {
  const groups = new Map<string, Group>()
  for (const e of entries) {
    let g = groups.get(e.folder)
    if (!g) {
      g = { key: e.folder, name: e.folder === '' ? folderName : e.folder, template: e.template, entries: [] }
      groups.set(e.folder, g)
    }
    g.entries.push(e)
  }
  const all = [...groups.values()]
  if (!all.some((g) => g.template)) all.push({ key: '\0templates', name: TEMPLATE_FOLDER, template: true, entries: [] })
  return all
}

const DATE = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const LINE =
  'flex h-[30px] w-full shrink-0 items-center gap-[8px] pl-[37px] pr-[16px] text-left text-ui font-semibold transition-colors' +
  ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'

// The masks of the folder, grouped by subfolder; the template folder always offers saving the open mask.
export function MaskList({
  entries,
  folderName,
  current,
  noBlocks,
  templateDone,
  onOpen,
  onSaveTemplate,
}: {
  entries: readonly MaskEntry[]
  folderName: string
  current: string | null
  noBlocks: boolean
  templateDone: boolean
  onOpen: (entry: MaskEntry) => Promise<void>
  onSaveTemplate: () => Promise<void>
}) {
  return (
    <>
      {entries.every((e) => e.template) && (
        <p className="px-[16px] pb-[4px] pt-[6px] text-dense text-muted">
          Im Ordner „{folderName}“ liegt noch keine Maske. „Speichern“ legt die offene Maske dort ab.
        </p>
      )}
      {groupsOf(entries, folderName).map((g) => (
        <MaskGroup key={g.key} group={g} current={current} onOpen={onOpen}>
          {g.template && <TemplateLine disabled={noBlocks} done={templateDone} onSave={onSaveTemplate} />}
        </MaskGroup>
      ))}
    </>
  )
}

function MaskGroup({
  group,
  current,
  onOpen,
  children,
}: {
  group: Group
  current: string | null
  onOpen: (entry: MaskEntry) => Promise<void>
  children: ReactNode
}) {
  return (
    <section className="flex flex-col">
      <p className="flex items-center gap-[7px] px-[16px] pb-[2px] pt-[8px] text-dense text-muted">
        <FolderOpen size={14} aria-hidden className="shrink-0" />
        <span className="truncate">{group.name}</span>
      </p>
      {group.entries.map((e) => (
        <MaskLine key={e.path} entry={e} chosen={e.path === current} onOpen={onOpen} />
      ))}
      {children}
    </section>
  )
}

function MaskLine({
  entry: e,
  chosen,
  onOpen,
}: {
  entry: MaskEntry
  chosen: boolean
  onOpen: (entry: MaskEntry) => Promise<void>
}) {
  return (
    <button
      type="button"
      title={`${e.path}, geändert ${DATE.format(e.modified)}${e.template ? '. Klick öffnet eine Kopie ohne Namen' : ''}`}
      onClick={() => void onOpen(e)}
      className={cn(LINE, chosen ? cn(LINE_CHOSEN, 'font-bold text-accent-ink') : cn(LINE_HOVER, 'text-ink'))}
    >
      <span className="min-w-0 flex-1 truncate">{e.name}</span>
      {e.frame !== '' && <span className="shrink-0 text-dense font-normal tabular-nums text-muted">{e.frame}</span>}
    </button>
  )
}

function TemplateLine({ disabled, done, onSave }: { disabled: boolean; done: boolean; onSave: () => Promise<void> }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title="Legt eine Kopie der offenen Maske in den Ordner „Vorlagen“"
      onClick={() => void onSave()}
      className={cn(
        LINE,
        LINE_HOVER,
        'pl-[35px] text-dense font-normal text-muted hover:text-ink disabled:opacity-[.45]',
      )}
    >
      <DoneLabel
        done={done}
        icon={<Plus size={14} />}
        label="Offene Maske als Vorlage"
        doneLabel="Als Vorlage gesichert"
      />
    </button>
  )
}
