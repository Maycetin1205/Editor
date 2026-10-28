import { useEffect, useRef, type ReactNode } from 'react'
import { FilePlus, FileUp, FolderOpen } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { maskNameOf } from '../../core/block/maskSettings'
import { canPickFolder, reasonOf } from '../state/folderOnDisk'
import { chooseMaskFolder, loadMaskFromFile, newMaskFrom, openMaskFile, saveAsTemplate } from '../state/maskFile'
import type { MaskEntry, MaskFolder } from '../state/maskFolder'
import { useEditor, useMaskFolder, useView } from '../state/useEditor'
import { MaskList } from './MaskList'

export function MasksTab() {
  const ed = useEditor()
  const view = useView()
  const folder = useMaskFolder()
  const canPick = canPickFolder()
  const { open, pickFolder, grant, newMask, loadFile, saveTemplate } = useMaskActions()

  useEffect(() => {
    void folder.list()
  }, [folder])

  const current = ed.files.maskOnDisk.attached ? ed.files.maskOnDisk.path : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MasksToolbar
        canChooseFolder={canPick && folder.state !== 'none'}
        onNewMask={newMask}
        onPickFolder={pickFolder}
        onLoadFile={loadFile}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[12px]">
        <FolderGate canPick={canPick} folder={folder} onPickFolder={pickFolder} onGrant={grant}>
          <MaskList
            entries={folder.entries}
            folderName={folder.name}
            current={current}
            noBlocks={ed.blockCount === 0}
            templateDone={view.done === 'template'}
            onOpen={open}
            onSaveTemplate={saveTemplate}
          />
        </FolderGate>
      </div>
    </div>
  )
}

// Handlers of the mask list: open, start and load masks, choose and release the folder.
function useMaskActions() {
  const ed = useEditor()

  const tell = (title: string, error: unknown) => ed.view.showNotice({ title, lead: `${reasonOf(error)}.` })

  const open = async (entry: MaskEntry) => {
    if (
      entry.template &&
      ed.blockCount > 0 &&
      !window.confirm(
        `Neue Maske aus der Vorlage „${entry.name}“ anfangen? „${maskNameOf(ed.tree)}“ verschwindet von der Leinwand; „Rückgängig“ holt sie zurück.`,
      )
    )
      return
    const why = entry.template ? await newMaskFrom(ed, entry) : await openMaskFile(ed, entry)
    if (why !== null) ed.view.showNotice({ title: 'Maske nicht geladen', lead: `„${entry.path}“ ${why}` })
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
      await ed.files.folderReady()
    } catch (error) {
      tell('Ordner nicht freigegeben', error)
    }
  }

  const newMask = () => {
    if (
      ed.blockCount === 0 ||
      window.confirm(
        `Neue Maske anfangen? „${maskNameOf(ed.tree)}“ verschwindet von der Leinwand; „Rückgängig“ holt sie zurück.`,
      )
    )
      ed.newMask()
  }

  const loadFile = (file: File) => {
    void loadMaskFromFile(ed, file).then((why) => {
      if (why !== null) ed.view.showNotice({ title: 'Maske nicht geladen', lead: `„${file.name}“ ${why}` })
    })
  }

  const saveTemplate = () => saveAsTemplate(ed)

  return { open, pickFolder, grant, newMask, loadFile, saveTemplate }
}

function MasksToolbar({
  canChooseFolder,
  onNewMask,
  onPickFolder,
  onLoadFile,
}: {
  canChooseFolder: boolean
  onNewMask: () => void
  onPickFolder: () => Promise<void>
  onLoadFile: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex h-[44px] shrink-0 items-center gap-[2px] pl-[12px] pr-[8px]">
      <Button kind="silent" className="h-[30px] px-[10px]" onClick={onNewMask}>
        <FilePlus size={14} /> Neue Maske
      </Button>
      <span className="flex-1" />
      {canChooseFolder && (
        <Button
          kind="command"
          onlyIcon
          aria-label="Ordner wählen"
          title="Anderen Ordner der Masken wählen"
          onClick={() => void onPickFolder()}
        >
          <FolderOpen size={15} />
        </Button>
      )}
      <Button
        kind="command"
        onlyIcon
        aria-label="Datei laden"
        title="Eine einzelne Maske laden, die nicht im Ordner liegt"
        onClick={() => fileRef.current?.click()}
      >
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
            if (file) onLoadFile(file)
          } finally {
            e.target.value = ''
          }
        }}
      />
    </div>
  )
}

// Shows what the state of the folder allows: a hint or a way forward, or the list once the folder reads.
function FolderGate({
  canPick,
  folder,
  onPickFolder,
  onGrant,
  children,
}: {
  canPick: boolean
  folder: MaskFolder
  onPickFolder: () => Promise<void>
  onGrant: () => Promise<void>
  children: ReactNode
}) {
  if (!canPick) {
    return (
      <Empty>
        Dieser Browser kann keinen Ordner öffnen; Edge und Chrome können es. Eine einzelne Maske lädt das Zeichen „Datei
        laden“ oben.
      </Empty>
    )
  }
  if (folder.state === 'none') {
    return (
      <Empty
        action={
          <Button kind="primary" onClick={() => void onPickFolder()}>
            <FolderOpen size={14} /> Ordner wählen
          </Button>
        }
      >
        <span className="block">
          Die Masken liegen als Dateien in einem Ordner, etwa „masken“. Einmal gewählt, zeigt der Editor hier alle
          Masken darin, auch in Unterordnern, und „Speichern“ legt neue dort ab.
        </span>
        <span className="mt-[8px] block">
          Ein ganzes Laufwerk, den Benutzerordner, Windows und die Programme gibt der Browser nicht frei, weil dort
          Systemdateien liegen. Ein Unterordner darin, wie „masken“, geht.
        </span>
      </Empty>
    )
  }
  if (folder.state === 'ask') {
    return (
      <Empty
        action={
          <Button kind="primary" onClick={() => void onGrant()}>
            <FolderOpen size={14} /> Ordner freigeben
          </Button>
        }
      >
        Nach dem Neustart fragt der Browser noch einmal, ob der Editor den Ordner „{folder.name}“ lesen und schreiben
        darf.
      </Empty>
    )
  }
  if (folder.failure !== null) {
    return (
      <Empty>
        Der Ordner „{folder.name}“ ließ sich nicht lesen: {folder.failure}.
      </Empty>
    )
  }
  return children
}

function Empty({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-[14px] px-[16px] pt-[8px] text-ui text-ink-2">
      <p>{children}</p>
      {action}
    </div>
  )
}
