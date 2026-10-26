import { useEffect, useState } from 'react'
import { Check, Database, Download, Eye, Redo2, Save, SquareDashed, Undo2 } from '@/editor/icons/icon'
import { frameNumberOf } from '../../core/block/documentFrame'
import { maskNameOf } from '../../core/block/maskName'
import { PageBar } from '../canvas/PageBar'
import { exportCurrentMask, exportTargetFolder } from '../commands/exportMask'
import { leftoverLines } from '../state/leftoverLines'
import { saveOrAsk } from '../state/maskFile'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { Button, PRESSED } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { DoneLabel } from '@/editor/widgets/DoneLabel'
import { Notice } from '@/editor/widgets/Notice'
import { Separator } from '@/editor/widgets/Separator'

const TIME = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

// Below 1024 px the commands of the bar keep their symbol and lose their word,
// which the title and the screen reader still have.
const LABEL = 'max-lg:sr-only'
const NARROW = 'max-lg:px-[9px]'

export function Toolbar() {
  const ed = useEditor()
  const view = useView()
  const dataOpen = view.dataWindow
  const outlines = view.outlines
  const target = exportTargetFolder(ed)

  return (
    <header className="flex h-[44px] shrink-0 items-center border-b border-line bg-ground">
      <div className="flex min-w-0 flex-1 basis-0 items-center">
        <MaskWho />
        <OnlyToSee />
      </div>

      <PageBar />

      <nav className="flex min-w-max flex-1 basis-0 items-center justify-end gap-[2px] pr-[12px]">
        <Button
          kind="command"
          onlyIcon
          aria-label="Rückgängig (Strg+Z)"
          title="Rückgängig (Strg+Z)"
          onClick={() => ed.undo()}
          disabled={!ed.canUndo}
        >
          <Undo2 size={15} />
        </Button>
        <Button
          kind="command"
          onlyIcon
          aria-label="Wiederholen (Strg+Umschalt+Z)"
          title="Wiederholen (Strg+Umschalt+Z)"
          onClick={() => ed.redo()}
          disabled={!ed.canRedo}
        >
          <Redo2 size={15} />
        </Button>
        <SaveState />

        <Separator vertical className="mx-[6px]" />

        <Button
          kind="command"
          aria-pressed={dataOpen}
          className={cn(NARROW, dataOpen && PRESSED)}
          title="Quellen und Relationen der Daten"
          onClick={() => ed.view.showData(!dataOpen)}
        >
          <Database size={14} /> <span className={LABEL}>Daten</span>
        </Button>
        <Button
          kind="command"
          aria-pressed={outlines}
          className={cn(NARROW, outlines && PRESSED)}
          title="Umriss um jeden Baustein, nur im Editor"
          onClick={() => ed.view.showOutlines(!outlines)}
        >
          <SquareDashed size={14} /> <span className={LABEL}>Umrisse</span>
        </Button>
        <Button
          kind="primary"
          className="ml-[4px]"
          onClick={() => void exportCurrentMask(ed)}
          disabled={ed.blockCount === 0}
          title={target === '' ? 'Lädt die Maske herunter' : `Schreibt die Maske in den Ordner „${target}“`}
        >
          <DoneLabel
            done={view.done === 'exported'}
            icon={<Download size={14} />}
            label="Exportieren"
            doneLabel="Exportiert"
          />
        </Button>
      </nav>

      {view.notice && <Notice notice={view.notice} onClose={() => ed.view.showNotice(null)} />}
    </header>
  )
}

function MaskWho() {
  const ed = useEditor()
  const frame = frameNumberOf(ed.tree)
  return (
    <button
      type="button"
      title="Name, Rahmen und Zielordner der Maske stehen in den Eigenschaften"
      onClick={() => {
        ed.selectBlock(null)
        ed.view.shutColumn('right', false)
      }}
      className="ml-[4px] flex min-w-0 items-baseline gap-[10px] rounded px-[12px] py-[5px] text-left transition-colors hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
    >
      <span className="truncate font-bold text-ink">{maskNameOf(ed.tree)}</span>
      {frame !== '' && (
        <span className="shrink-0 text-dense text-muted">
          Rahmen <span className="tabular-nums text-ink">{frame}</span>
        </span>
      )}
    </button>
  )
}

// The sign of a mask opened only to look at: changes stay out of its file
// until the guard is lifted.
function OnlyToSee() {
  const ed = useEditor()
  if (!ed.files.maskOnDisk.attached || !ed.maskLocked) return null
  const aside = leftoverLines(ed.tree, ed.dataSources.list, ed.leftover)
  return (
    <button
      type="button"
      title="Änderungen kommen nicht in die Datei der Maske"
      onClick={() =>
        ed.view.showNotice({
          title: 'Nur zum Ansehen',
          lead:
            `„${ed.files.maskOnDisk.name}“ ist zum Schutz nur zum Ansehen geöffnet: Änderungen hier kommen nicht in die Datei. ` +
            (aside.length > 0
              ? 'Diese Teile kann dieser Editor nicht lesen; in der Datei bleiben sie in jedem Fall erhalten:'
              : 'Die Datei stammt aus einer neueren Fassung des Editors.'),
          lines: aside,
          action: { label: 'Trotzdem bearbeiten', run: () => ed.unlockMask() },
        })
      }
      className="mr-[8px] flex shrink-0 items-center gap-[6px] rounded-full bg-pending-soft px-[10px] py-[3px] text-dense font-semibold text-pending transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
    >
      <Eye size={13} /> <span className={LABEL}>Nur zum Ansehen</span>
    </button>
  )
}

function SaveState() {
  const ed = useEditor()
  const view = useView()
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 15_000)
    return () => clearInterval(timer)
  }, [])

  if (ed.files.maskOnDisk.attached && !ed.maskLocked && view.done !== 'saved') {
    return (
      <Button
        kind="command"
        className={cn('font-normal', NARROW)}
        title={`In „${ed.files.maskOnDisk.name}“ gespeichert. Speichern: Strg+S`}
        onClick={() => void saveOrAsk(ed)}
      >
        <Check size={14} /> <span className={LABEL}>Gespeichert</span>
        {ed.files.keptAt > 0 && <span className={cn('tabular-nums', LABEL)}>{TIME.format(ed.files.keptAt)}</span>}
      </Button>
    )
  }
  return (
    <Button
      kind="command"
      className={NARROW}
      title="In die Datei der Maske im Ordner der Masken (Strg+S)"
      onClick={() => void saveOrAsk(ed)}
    >
      <DoneLabel
        done={view.done === 'saved'}
        icon={<Save size={14} />}
        label="Speichern"
        doneLabel="Gespeichert"
        labelClassName={LABEL}
      />
    </Button>
  )
}
