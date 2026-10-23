import { useEffect, useState } from 'react'
import { Check, Database, Download, Eye, Redo2, Save, SquareDashed, Undo2 } from '@/editor/icons/icon'
import { documentFileNames, frameNumberOf } from '../../core/block/documentFrame'
import { exportTargetOf } from '../../core/block/exportTarget'
import { maskNameOf } from '../../core/block/maskName'
import { failedChecks, validateMaskHtml } from '../../export/validator'
import { lostBindings } from '../../export/lostBindings'
import { sourcesWithoutRelation } from '../../export/usedRelations'
import { PageBar } from '../canvas/PageBar'
import { downloadFile } from '../state/downloadFile'
import { exportFolder, writeExport } from '../state/exportTarget'
import { canPickFolder } from '../state/folderOnDisk'
import { leftoverLines } from '../state/leftoverLines'
import { saveOrAsk } from '../state/maskFile'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { Button, PRESSED } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { DoneLabel } from '@/editor/widgets/DoneLabel'
import { Notice } from '@/editor/widgets/Notice'
import { Separator } from '@/editor/widgets/Separator'

const MASK_NAMES = {
  html: 'index.basis.source.html',
  sevariablen: 'index.basis.SEvariablen.json',
}

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
  const frame = frameNumberOf(ed.tree)
  const target = canPickFolder() ? exportTargetOf(ed.tree) : ''

  const handleExport = async (withoutAside = false) => {
    const orphans = sourcesWithoutRelation(ed.tree, ed.relation.list, ed.dataSources.list)
    if (orphans.length > 0) {
      ed.showNotice({
        title: 'Export abgebrochen',
        lead: (orphans.length === 1
          ? 'Nichts exportiert. Diese Quelle fragt mit einer Relation, die es nicht mehr gibt, und bliebe in der Maske leer.'
          : 'Nichts exportiert. Diese Quellen fragen mit einer Relation, die es nicht mehr gibt, und blieben in der Maske leer.')
          + ' Im Datenfenster bei der Quelle „Liefert“ neu wählen:',
        lines: orphans.map((name) => ({ name })),
      })
      return
    }
    // What this editor keeps aside is safe in the mask file, but the export
    // would go out without it, and could replace an export that had it.
    const aside = withoutAside ? [] : leftoverLines(ed.tree, ed.dataSources.list, ed.leftover)
    if (aside.length > 0) {
      ed.showNotice({
        title: 'Export ohne einige Teile',
        lead: 'Noch nichts exportiert. Diese Teile der Maske kann dieser Editor nicht lesen. In der Datei der Maske '
          + 'bleiben sie erhalten, in den Export kommen sie aber nicht. Hat die Maske in SoftEngine sie schon, '
          + 'fehlen sie dort nach dem Export:',
        lines: aside,
        action: { label: 'Trotzdem exportieren', run: () => void handleExport(true) },
      })
      return
    }
    const folder = target === '' ? null : await exportFolder(target)
    let exported: { html: string; sevariablen: string }
    try {
      const { exportMask } = await import('../../export/exportMask')
      exported = exportMask(ed.tree, maskNameOf(ed.tree), ed.dataSources.list, ed.relation.list)
    } catch (error) {
      ed.showNotice({
        title: 'Export abgebrochen',
        lead: 'Nichts exportiert. Beim Bauen der Maske ging etwas schief:',
        lines: [{ name: error instanceof Error ? error.message : String(error) }],
      })
      return
    }
    const { html, sevariablen } = exported
    const failed = failedChecks(validateMaskHtml(html))
    if (failed.length > 0) {
      ed.showNotice({
        title: 'Export abgebrochen',
        lead: failed.length === 1
          ? 'Nichts exportiert. Diese Prüfung der fertigen Maske ist nicht bestanden:'
          : 'Nichts exportiert. Diese Prüfungen der fertigen Maske sind nicht bestanden:',
        lines: failed.map((c) => ({ name: c.name, detail: c.detail })),
      })
      return
    }

    const names = frame === '' ? MASK_NAMES : documentFileNames(frame)
    const why = folder === null
      ? null
      : folder.ok
        ? await writeExport(folder.folder, [{ name: names.html, text: html }, { name: names.sevariablen, text: sevariablen }])
        : folder.why
    const written = folder !== null && why === null
    if (!written) {
      downloadFile(names.html, html, 'text/html')
      downloadFile(names.sevariablen, sevariablen, 'application/json')
    }

    const lost = lostBindings(ed.tree, ed.dataSources.list)
    const gaps = lost.length === 0 ? '' : lost.length === 1
      ? ' Diese Stelle bleibt in der Maske leer, weil ihre Quelle das Feld nicht hat:'
      : ' Diese Stellen bleiben in der Maske leer, weil ihre Quelle das Feld nicht hat:'
    const lines = lost.map((l) => ({
      name: l.blockName,
      detail: l.sourceName === '' ? `Feld ${l.code}, ohne Quelle` : `Feld ${l.code} fehlt in „${l.sourceName}“`,
    }))
    if (why !== null) {
      ed.showNotice({
        title: 'Heruntergeladen statt in den Zielordner',
        lead: `Der Zielordner „${target}“ ${why} Die Maske ist darum heruntergeladen.${gaps}`,
        lines,
      })
      return
    }
    if (lost.length > 0) {
      ed.showNotice({
        title: 'Exportiert, mit Lücken',
        lead: (written ? `Die Maske liegt im Ordner „${target}“.` : 'Die Maske ist heruntergeladen.') + gaps,
        lines,
      })
      return
    }
    ed.markDone('exported')
  }

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
          onClick={() => ed.showData(!dataOpen)}
        >
          <Database size={14} /> <span className={LABEL}>Daten</span>
        </Button>
        <Button
          kind="command"
          aria-pressed={outlines}
          className={cn(NARROW, outlines && PRESSED)}
          title="Umriss um jeden Baustein, nur im Editor"
          onClick={() => ed.showOutlines(!outlines)}
        >
          <SquareDashed size={14} /> <span className={LABEL}>Umrisse</span>
        </Button>
        <Button
          kind="primary"
          className="ml-[4px]"
          onClick={() => void handleExport()}
          disabled={ed.blockCount === 0}
          title={target === '' ? 'Lädt die Maske herunter' : `Schreibt die Maske in den Ordner „${target}“`}
        >
          <DoneLabel done={view.done === 'exported'} icon={<Download size={14} />} label="Exportieren" doneLabel="Exportiert" />
        </Button>
      </nav>

      {view.notice && <Notice notice={view.notice} onClose={() => ed.showNotice(null)} />}
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
        ed.shutColumn('right', false)
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
  if (!ed.maskOnDisk.attached || !ed.maskLocked) return null
  const aside = leftoverLines(ed.tree, ed.dataSources.list, ed.leftover)
  return (
    <button
      type="button"
      title="Änderungen kommen nicht in die Datei der Maske"
      onClick={() => ed.showNotice({
        title: 'Nur zum Ansehen',
        lead: `„${ed.maskOnDisk.name}“ ist zum Schutz nur zum Ansehen geöffnet: Änderungen hier kommen nicht in die Datei. `
          + (aside.length > 0
            ? 'Diese Teile kann dieser Editor nicht lesen; in der Datei bleiben sie in jedem Fall erhalten:'
            : 'Die Datei stammt aus einer neueren Fassung des Editors.'),
        lines: aside,
        action: { label: 'Trotzdem bearbeiten', run: () => ed.unlockMask() },
      })}
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

  if (ed.maskOnDisk.attached && !ed.maskLocked && view.done !== 'saved') {
    return (
      <Button
        kind="command"
        className={cn('font-normal', NARROW)}
        title={`In „${ed.maskOnDisk.name}“ gespeichert. Speichern: Strg+S`}
        onClick={() => void saveOrAsk(ed)}
      >
        <Check size={14} /> <span className={LABEL}>Gespeichert</span>
        {ed.keptAt > 0 && <span className={cn('tabular-nums', LABEL)}>{TIME.format(ed.keptAt)}</span>}
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
