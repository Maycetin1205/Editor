import { useEffect, useRef, type ReactNode } from 'react'
import { FilePlus, FileUp, FolderOpen, Plus } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { DoneLabel } from '@/editor/widgets/DoneLabel'
import { LINE_CHOSEN, LINE_HOVER } from '@/editor/widgets/lineLook'
import { maskNameOf } from '../../core/block/maskName'
import { canPickFolder, reasonOf } from '../state/folderOnDisk'
import { chooseMaskFolder, loadMaskFromFile, newMaskFrom, openMaskFile, saveAsTemplate } from '../state/maskFile'
import { TEMPLATE_FOLDER, type MaskEntry } from '../state/maskFolder'
import { useEditor } from '../state/useEditor'
import { useMaskFolder } from '../state/useMaskFolder'
import { useView } from '../state/useView'

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
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const LINE = 'flex h-[30px] w-full shrink-0 items-center gap-[8px] pl-[37px] pr-[16px] text-left text-ui font-semibold transition-colors'
  + ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'

export function MasksTab() {
  const ed = useEditor()
  const view = useView()
  const folder = useMaskFolder()
  const fileRef = useRef<HTMLInputElement>(null)
  const canPick = canPickFolder()

  useEffect(() => {
    void folder.list()
  }, [folder])

  const tell = (title: string, error: unknown) => ed.showNotice({ title, lead: `${reasonOf(error)}.` })

  const open = async (entry: MaskEntry) => {
    if (entry.template && ed.blockCount > 0 && !window.confirm(
      `Neue Maske aus der Vorlage „${entry.name}“ anfangen? „${maskNameOf(ed.tree)}“ verschwindet von der Leinwand; „Rückgängig“ holt sie zurück.`,
    )) return
    const why = entry.template ? await newMaskFrom(ed, entry) : await openMaskFile(ed, entry)
    if (why !== null) ed.showNotice({ title: 'Maske nicht geladen', lead: `„${entry.path}“ ${why}` })
  }

  const pickFolder = async () => {
    try {
      await chooseMaskFolder(ed)
    } catch (error) {
      tell('Kein Ordner gewählt', error)
    }
  }

  const grant = async () => {
    try {
      await ed.folderReady()
    } catch (error) {
      tell('Ordner nicht freigegeben', error)
    }
  }

  const newMask = () => {
    if (ed.blockCount === 0 || window.confirm(
      `Neue Maske anfangen? „${maskNameOf(ed.tree)}“ verschwindet von der Leinwand; „Rückgängig“ holt sie zurück.`,
    )) ed.newMask()
  }

  const current = ed.maskOnDisk.attached ? ed.maskOnDisk.path : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[44px] shrink-0 items-center gap-[2px] pl-[12px] pr-[8px]">
        <Button kind="silent" className="h-[30px] px-[10px]" onClick={newMask}>
          <FilePlus size={14} /> Neue Maske
        </Button>
        <span className="flex-1" />
        {canPick && folder.state !== 'none' && (
          <Button kind="command" onlyIcon aria-label="Ordner wählen" title="Anderen Ordner der Masken wählen" onClick={() => void pickFolder()}>
            <FolderOpen size={15} />
          </Button>
        )}
        <Button kind="command" onlyIcon aria-label="Datei laden" title="Eine einzelne Maske laden, die nicht im Ordner liegt" onClick={() => fileRef.current?.click()}>
          <FileUp size={15} />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            try {
              if (file) {
                void loadMaskFromFile(ed, file).then((why) => {
                  if (why !== null) ed.showNotice({ title: 'Maske nicht geladen', lead: `„${file.name}“ ${why}` })
                })
              }
            } finally {
              e.target.value = ''
            }
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[12px]">
        {!canPick ? (
          <Empty>
            Dieser Browser kann keinen Ordner öffnen; Edge und Chrome können es. Eine einzelne Maske
            lädt das Zeichen „Datei laden“ oben.
          </Empty>
        ) : folder.state === 'none' ? (
          <Empty action={<Button kind="primary" onClick={() => void pickFolder()}><FolderOpen size={14} /> Ordner wählen</Button>}>
            <span className="block">
              Die Masken liegen als Dateien in einem Ordner, etwa „masken“. Einmal gewählt, zeigt der
              Editor hier alle Masken darin, auch in Unterordnern, und „Speichern“ legt neue dort ab.
            </span>
            <span className="mt-[8px] block">
              Ein ganzes Laufwerk, den Benutzerordner, Windows und die Programme gibt der Browser nicht
              frei, weil dort Systemdateien liegen. Ein Unterordner darin, wie „masken“, geht.
            </span>
          </Empty>
        ) : folder.state === 'ask' ? (
          <Empty action={<Button kind="primary" onClick={() => void grant()}><FolderOpen size={14} /> Ordner freigeben</Button>}>
            Nach dem Neustart fragt der Browser noch einmal, ob der Editor den Ordner „{folder.name}“
            lesen und schreiben darf.
          </Empty>
        ) : folder.failure !== null ? (
          <Empty>Der Ordner „{folder.name}“ ließ sich nicht lesen: {folder.failure}.</Empty>
        ) : (
          <>
            {folder.entries.every((e) => e.template) && (
              <p className="px-[16px] pb-[4px] pt-[6px] text-dense text-muted">
                Im Ordner „{folder.name}“ liegt noch keine Maske. „Speichern“ legt die offene Maske dort ab.
              </p>
            )}
            {groupsOf(folder.entries, folder.name).map((g) => (
              <section key={g.key} className="flex flex-col">
                <p className="flex items-center gap-[7px] px-[16px] pb-[2px] pt-[8px] text-dense text-muted">
                  <FolderOpen size={14} aria-hidden className="shrink-0" />
                  <span className="truncate">{g.name}</span>
                </p>
                {g.entries.map((e) => (
                  <button
                    key={e.path}
                    type="button"
                    title={`${e.path}, geändert ${DATE.format(e.modified)}${e.template ? '. Klick öffnet eine Kopie ohne Namen' : ''}`}
                    onClick={() => void open(e)}
                    className={cn(LINE, e.path === current ? cn(LINE_CHOSEN, 'font-bold text-accent-ink') : cn(LINE_HOVER, 'text-ink'))}
                  >
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    {e.frame !== '' && <span className="shrink-0 text-dense font-normal tabular-nums text-muted">{e.frame}</span>}
                  </button>
                ))}
                {g.template && (
                  <button
                    type="button"
                    disabled={ed.blockCount === 0}
                    title="Legt eine Kopie der offenen Maske in den Ordner „Vorlagen“"
                    onClick={() => void saveAsTemplate(ed)}
                    className={cn(LINE, LINE_HOVER, 'pl-[35px] text-dense font-normal text-muted hover:text-ink disabled:opacity-[.45]')}
                  >
                    <DoneLabel
                      done={view.done === 'template'}
                      icon={<Plus size={14} />}
                      label="Offene Maske als Vorlage"
                      doneLabel="Als Vorlage gesichert"
                    />
                  </button>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Empty({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-[14px] px-[16px] pt-[8px] text-ui text-ink-2">
      <p>{children}</p>
      {action}
    </div>
  )
}
