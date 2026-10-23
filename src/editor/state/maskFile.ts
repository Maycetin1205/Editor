import { EXPORT_TARGET_PROP } from '../../core/block/exportTarget'
import { MASK_NAME_PROP, maskNameOf } from '../../core/block/maskName'
import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'
import { collectDataSources } from '../../export/usedSources'
import { collectRelation } from '../../export/usedRelations'
import { writeFile } from './fileOnDisk'
import { canPickFolder, reasonOf } from './folderOnDisk'
import type { EditorStore } from './EditorStore'
import { EDITOR_VERSION, newerEditor } from './editorVersion'
import { leftoverForFile, NO_LEFTOVER, treeForFile, type Leftover } from './leftover'
import { LIBRARY_FILE_KIND } from './libraryFile'
import type { MaskEntry } from './maskFolder'
import { CURRENT_SCHEMA_VERSION } from './maskSchema'
import { readMask } from './readMask'
import type { NoticeLine, NoticeText } from '../widgets/Notice'

const MASK_FILE_KIND = 'aufbau-editor-maske'

const MASK_FILE_VERSION = 5

export interface MaskContent {
  tree: MaskTree
  dataSources: DataSource[]
  relation: RelationTemplate[]
  leftover: Leftover
}

interface ReadNote {
  newer: string | null
  lines: readonly NoticeLine[]
}

export interface MaskFileAt {
  file: FileSystemFileHandle
  path: string
  modified: number
}

type UnpackResult = { ok: true; content: MaskContent; note: ReadNote } | { ok: false; why: string }

type EntryRead = { ok: true; content: MaskContent; note: ReadNote; modified: number } | { ok: false; why: string }

const NO_MASK = 'ist keine Maske des Editors.'

export function packMask(
  tree: MaskTree,
  sources: readonly DataSource[],
  relation: readonly RelationTemplate[],
  leftover: Leftover = NO_LEFTOVER,
): string {
  const used = collectDataSources(tree, sources)
  const kept = leftoverForFile(tree, sources, leftover)
  return (
    JSON.stringify(
      {
        kind: MASK_FILE_KIND,
        fileVersion: MASK_FILE_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        editorVersion: EDITOR_VERSION,
        tree: treeForFile(tree, leftover),
        dataSources: used,
        relation: collectRelation(tree, relation, used),
        ...(kept ? { leftover: kept } : {}),
      },
      null,
      2,
    ) + '\n'
  )
}

function maskFileName(): string {
  return `aufbau-maske-${new Date().toISOString().slice(0, 10)}.json`
}

function packed(editor: EditorStore, tree: MaskTree = editor.tree): string {
  return packMask(tree, editor.dataSources.list, editor.relation.list, editor.leftover)
}

function treeWithout(tree: MaskTree, names: readonly string[]): MaskTree {
  const root = tree[ROOT_ID]
  if (!root) return tree
  const values = Object.fromEntries(Object.entries(root.values).filter(([name]) => !names.includes(name)))
  return { ...tree, [ROOT_ID]: { ...root, values } }
}

async function saveMask(editor: EditorStore): Promise<void> {
  const disk = editor.maskOnDisk
  if (disk.attached && disk.locked) {
    editor.showNotice({
      title: 'Nur zum Ansehen geöffnet',
      lead:
        `„${disk.name}“ ist zum Schutz nur zum Ansehen geöffnet. „Trotzdem speichern“ schreibt die Maske ab jetzt ` +
        'in die Datei; was dieser Editor nicht lesen kann, bleibt darin erhalten. Vorher legt er eine Sicherung an.',
      action: {
        label: 'Trotzdem speichern',
        run: () => {
          editor.unlockMask()
          void saveMask(editor)
        },
      },
    })
    return
  }
  if (!disk.attached && !canPickFolder()) {
    await writeFile(disk, maskFileName(), packed(editor))
    return
  }
  try {
    if (!disk.attached && !(await editor.folderReady())) return
  } catch (error) {
    editor.showNotice({
      title: 'Nicht gespeichert',
      lead: `Der Ordner der Masken ließ sich nicht öffnen: ${reasonOf(error)}.`,
    })
    return
  }
  const text = packed(editor)
  try {
    if (disk.attached) {
      await disk.write(text)
    } else {
      editor.keepIn(await editor.maskFolder.saveNew(maskNameOf(editor.tree), text), text, true)
    }
  } catch (error) {
    editor.showNotice({
      title: 'Nicht gespeichert',
      lead:
        (disk.attached
          ? `„${disk.name}“ ließ sich nicht schreiben: ${reasonOf(error)}.`
          : `Im Ordner „${editor.maskFolder.name}“ ließ sich keine Datei anlegen: ${reasonOf(error)}.`) +
        ' Die Maske bleibt im Browser; „Speichern“ versucht es noch einmal.',
    })
    return
  }
  editor.markDone('saved')
}

export async function saveOrAsk(editor: EditorStore): Promise<void> {
  if (!editor.maskOnDisk.attached && canPickFolder() && editor.maskFolder.state === 'none') {
    editor.showSide('masks')
    editor.waitToSave(true)
    return
  }
  await saveMask(editor)
}

export async function chooseMaskFolder(editor: EditorStore): Promise<void> {
  await editor.pickMaskFolder()
  if (!editor.saveWaits) return
  editor.waitToSave(false)
  await saveMask(editor)
}

export async function saveAsTemplate(editor: EditorStore): Promise<void> {
  try {
    if (!(await editor.folderReady())) return
    await editor.maskFolder.saveTemplate(
      maskNameOf(editor.tree),
      packed(editor, treeWithout(editor.tree, [EXPORT_TARGET_PROP])),
    )
  } catch (error) {
    editor.showNotice({ title: 'Nicht als Vorlage gesichert', lead: `${reasonOf(error)}.` })
    return
  }
  editor.markDone('template')
}

async function readEntry(entry: MaskEntry): Promise<EntryRead> {
  let text: string
  let modified: number
  try {
    const data = await entry.file.getFile()
    text = await data.text()
    modified = data.lastModified
  } catch {
    return { ok: false, why: 'ließ sich nicht lesen.' }
  }
  const result = packMaskFrom(text)
  return result.ok ? { ...result, modified } : result
}

export function mustGuard(note: ReadNote): boolean {
  return note.newer !== null || note.lines.length > 0
}

export function readNotice(editor: EditorStore, name: string, note: ReadNote, locked: boolean): NoticeText | null {
  if (!mustGuard(note)) return null
  const lead = [
    note.newer === null
      ? ''
      : `„${name}“ wurde mit einer neueren Fassung des Editors gespeichert (${note.newer}, dieser hat ${EDITOR_VERSION}).`,
    note.lines.length === 0
      ? ''
      : `In „${name}“ kennt dieser Editor einige Teile nicht. Sie bleiben unverändert in der Datei, ` +
        'erscheinen hier aber nicht und kommen nicht in den Export.',
    locked
      ? 'Damit nichts verloren geht, ist die Maske nur zum Ansehen geöffnet: Änderungen kommen nicht in die Datei. ' +
        '„Trotzdem bearbeiten“ hebt das auf.'
      : '',
  ]
    .filter((part) => part !== '')
    .join(' ')
  return {
    title: note.newer !== null ? 'Maske aus einer neueren Fassung' : 'Nicht alles gelesen',
    lead,
    ...(note.lines.length > 0 ? { lines: note.lines } : {}),
    ...(locked ? { action: { label: 'Trotzdem bearbeiten', run: () => editor.unlockMask() } } : {}),
  }
}

function tellRead(editor: EditorStore, name: string, note: ReadNote, locked: boolean): void {
  const notice = readNotice(editor, name, note, locked)
  if (notice !== null) editor.showNotice(notice)
}

export async function openMaskFile(editor: EditorStore, entry: MaskEntry): Promise<string | null> {
  const result = await readEntry(entry)
  if (!result.ok) return result.why
  const locked = mustGuard(result.note)
  editor.replaceMask(result.content, { file: entry.file, path: entry.path, modified: result.modified }, locked)
  tellRead(editor, entry.path, result.note, locked)
  return null
}

export async function newMaskFrom(editor: EditorStore, entry: MaskEntry): Promise<string | null> {
  const result = await readEntry(entry)
  if (!result.ok) return result.why
  editor.replaceMask({
    ...result.content,
    tree: treeWithout(result.content.tree, [MASK_NAME_PROP, EXPORT_TARGET_PROP]),
  })
  tellRead(editor, entry.path, result.note, false)
  return null
}

export async function loadMaskFromFile(editor: EditorStore, file: File): Promise<string | null> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return 'ließ sich nicht lesen.'
  }
  const result = packMaskFrom(text)
  if (!result.ok) return result.why
  editor.replaceMask(result.content)
  tellRead(editor, file.name, result.note, false)
  return null
}

export function packMaskFrom(text: string): UnpackResult {
  try {
    return unpack(text)
  } catch (error) {
    return { ok: false, why: `ist beschädigt (${error instanceof Error ? error.message : String(error)}).` }
  }
}

function unpack(text: string): UnpackResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, why: 'ist kein vollständiges JSON und damit keine lesbare Maske.' }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, why: NO_MASK }
  if ((raw as Record<string, unknown>).kind === LIBRARY_FILE_KIND) {
    return {
      ok: false,
      why:
        'ist eine Kundendatei mit Quellen und Relationen, keine Maske. ' +
        'Sie wird im Fenster „Daten“ mit „Bibliothek laden“ geladen.',
    }
  }
  const file = raw as Record<string, unknown>
  const result = readMask(file)
  if (!result.ok) {
    return {
      ok: false,
      why: result.why === 'lift' ? whyNotLifted(file.schemaVersion) : 'ist beschädigt: der Anfang der Maske fehlt.',
    }
  }
  const { read } = result
  return {
    ok: true,
    content: { tree: read.tree, dataSources: read.dataSources, relation: read.relation, leftover: read.leftover },
    note: { newer: newerEditor(file.editorVersion), lines: read.lines },
  }
}

function whyNotLifted(step: unknown): string {
  if (typeof step !== 'number') return NO_MASK
  if (step > CURRENT_SCHEMA_VERSION) {
    return (
      `kommt aus einer neueren Fassung des Editors (Stufe ${step}, dieser kennt bis ${CURRENT_SCHEMA_VERSION}). ` +
      'Erst den Editor auf den neuesten Stand bringen.'
    )
  }
  return `kommt aus einer zu alten Fassung des Editors (Stufe ${step}), die dieser nicht mehr liest.`
}
