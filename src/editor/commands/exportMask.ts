import { documentFileNames, frameNumberOf } from '../../core/block/documentFrame'
import { exportTargetOf } from '../../core/block/exportTarget'
import { maskNameOf } from '../../core/block/maskName'
import type { MaskTree } from '../../core/block/tree'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'
import { lostBindings } from '../../export/lostBindings'
import { sourcesWithoutRelation } from '../../export/usedRelations'
import { failedChecks, validateMaskHtml } from '../../export/validator'
import { downloadFile } from '../state/downloadFile'
import { exportFolder, writeExport } from '../state/exportTarget'
import { canPickFolder } from '../state/folderOnDisk'
import type { Leftover } from '../state/leftover'
import { leftoverLines } from '../state/leftoverLines'
import type { EditorView } from '../state/editorStore/viewState'

const MASK_FILE_NAMES = {
  html: 'index.basis.source.html',
  sevariablen: 'index.basis.SEvariablen.json',
}

// What the export needs from the editor.
interface ExportEditor {
  readonly tree: Readonly<MaskTree>
  readonly leftover: Leftover
  readonly dataSources: { readonly list: readonly DataSource[] }
  readonly relation: { readonly list: readonly RelationTemplate[] }
  readonly view: Pick<EditorView, 'showNotice' | 'markDone'>
}

// Where the export goes: the target folder named in the mask, when the
// browser can write folders; otherwise the download.
export function exportTargetFolder(editor: Pick<ExportEditor, 'tree'>): string {
  return canPickFolder() ? exportTargetOf(editor.tree) : ''
}

function refusedForRelations(editor: ExportEditor): boolean {
  const orphans = sourcesWithoutRelation(editor.tree, editor.relation.list, editor.dataSources.list)
  if (orphans.length === 0) return false
  editor.view.showNotice({
    title: 'Export abgebrochen',
    lead:
      (orphans.length === 1
        ? 'Nichts exportiert. Diese Quelle fragt mit einer Relation, die es nicht mehr gibt, und bliebe in der Maske leer.'
        : 'Nichts exportiert. Diese Quellen fragen mit einer Relation, die es nicht mehr gibt, und blieben in der Maske leer.') +
      ' Im Datenfenster bei der Quelle „Liefert“ neu wählen:',
    lines: orphans.map((name) => ({ name })),
  })
  return true
}

// What this editor keeps aside is safe in the mask file, but the export
// would go out without it, and could replace an export that had it.
function refusedForLeftover(editor: ExportEditor, again: () => void): boolean {
  const aside = leftoverLines(editor.tree, editor.dataSources.list, editor.leftover)
  if (aside.length === 0) return false
  editor.view.showNotice({
    title: 'Export ohne einige Teile',
    lead:
      'Noch nichts exportiert. Diese Teile der Maske kann dieser Editor nicht lesen. In der Datei der Maske ' +
      'bleiben sie erhalten, in den Export kommen sie aber nicht. Hat die Maske in SoftEngine sie schon, ' +
      'fehlen sie dort nach dem Export:',
    lines: aside,
    action: { label: 'Trotzdem exportieren', run: again },
  })
  return true
}

async function buildExport(editor: ExportEditor): Promise<{ html: string; sevariablen: string } | null> {
  try {
    const { exportMask } = await import('../../export/exportMask')
    return exportMask(editor.tree, maskNameOf(editor.tree), editor.dataSources.list, editor.relation.list)
  } catch (error) {
    editor.view.showNotice({
      title: 'Export abgebrochen',
      lead: 'Nichts exportiert. Beim Bauen der Maske ging etwas schief:',
      lines: [{ name: error instanceof Error ? error.message : String(error) }],
    })
    return null
  }
}

function refusedByChecks(editor: ExportEditor, html: string): boolean {
  const failed = failedChecks(validateMaskHtml(html))
  if (failed.length === 0) return false
  editor.view.showNotice({
    title: 'Export abgebrochen',
    lead:
      failed.length === 1
        ? 'Nichts exportiert. Diese Prüfung der fertigen Maske ist nicht bestanden:'
        : 'Nichts exportiert. Diese Prüfungen der fertigen Maske sind nicht bestanden:',
    lines: failed.map((c) => ({ name: c.name, detail: c.detail })),
  })
  return true
}

// Writes into the target folder when there is one and it can be written;
// otherwise downloads. Returns why the folder failed, or null.
async function deliver(
  target: string,
  names: { html: string; sevariablen: string },
  html: string,
  sevariablen: string,
) {
  const folder = target === '' ? null : await exportFolder(target)
  const why =
    folder === null
      ? null
      : folder.ok
        ? await writeExport(folder.folder, [
            { name: names.html, text: html },
            { name: names.sevariablen, text: sevariablen },
          ])
        : folder.why
  const written = folder !== null && why === null
  if (!written) {
    downloadFile(names.html, html, 'text/html')
    downloadFile(names.sevariablen, sevariablen, 'application/json')
  }
  return { written, why }
}

function tellGaps(editor: ExportEditor, target: string, written: boolean, why: string | null): void {
  const lost = lostBindings(editor.tree, editor.dataSources.list)
  const gaps =
    lost.length === 0
      ? ''
      : lost.length === 1
        ? ' Diese Stelle bleibt in der Maske leer, weil ihre Quelle das Feld nicht hat:'
        : ' Diese Stellen bleiben in der Maske leer, weil ihre Quelle das Feld nicht hat:'
  const lines = lost.map((l) => ({
    name: l.blockName,
    detail: l.sourceName === '' ? `Feld ${l.code}, ohne Quelle` : `Feld ${l.code} fehlt in „${l.sourceName}“`,
  }))
  if (why !== null) {
    editor.view.showNotice({
      title: 'Heruntergeladen statt in den Zielordner',
      lead: `Der Zielordner „${target}“ ${why} Die Maske ist darum heruntergeladen.${gaps}`,
      lines,
    })
    return
  }
  if (lost.length > 0) {
    editor.view.showNotice({
      title: 'Exportiert, mit Lücken',
      lead: (written ? `Die Maske liegt im Ordner „${target}“.` : 'Die Maske ist heruntergeladen.') + gaps,
      lines,
    })
    return
  }
  editor.view.markDone('exported')
}

// The export as the toolbar runs it: refuse what would export wrongly, build,
// check, deliver, and say what the mask will miss.
export async function exportCurrentMask(editor: ExportEditor, withoutLeftover = false): Promise<void> {
  if (refusedForRelations(editor)) return
  if (!withoutLeftover && refusedForLeftover(editor, () => void exportCurrentMask(editor, true))) return
  const built = await buildExport(editor)
  if (built === null || refusedByChecks(editor, built.html)) return
  const frame = frameNumberOf(editor.tree)
  const names = frame === '' ? MASK_FILE_NAMES : documentFileNames(frame)
  const target = exportTargetFolder(editor)
  const { written, why } = await deliver(target, names, built.html, built.sevariablen)
  tellGaps(editor, target, written, why)
}
