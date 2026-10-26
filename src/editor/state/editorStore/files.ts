import type { MaskFolder } from '../maskFolder'
import { mustGuard, packMask, packMaskFrom, readNotice, type MaskEditor, type MaskFileAt } from '../maskFile'
import type { EditorPersistence } from './persistence'

// The mask on disk, the library on disk and the folder of the masks: what
// the editor keeps outside the browser, and how it finds it again after a
// restart (rejoin).
export class EditorFiles {
  private readonly editor: MaskEditor

  private readonly kept: EditorPersistence

  private _reopening: Promise<void> | null = null

  constructor(editor: MaskEditor, kept: EditorPersistence) {
    this.editor = editor
    this.kept = kept
  }

  keepIn(at: Omit<MaskFileAt, 'modified'>, holds: string | null, created = false): void {
    this.kept.maskOnDisk.remember(at.file, at.path, holds, created)
    this.kept.plan()
  }

  get maskOnDisk() {
    return this.kept.maskOnDisk
  }

  get libraryOnDisk() {
    return this.kept.libraryOnDisk
  }

  get maskFolder(): MaskFolder {
    return this.kept.folder
  }

  get keptAt(): number {
    return this.kept.keptAt
  }

  saveNow(): void {
    this.kept.now()
  }

  reopenFolder(): Promise<void> {
    this._reopening ??= (async () => {
      await this.kept.folder.restore()
      await this.rejoin()
    })()
    return this._reopening
  }

  async folderReady(): Promise<boolean> {
    if (!(await this.kept.folder.ready())) return false
    await this.rejoin()
    return true
  }

  async pickMaskFolder(): Promise<void> {
    const picked = await this.kept.folder.pick()
    if (picked === 'switched' && !this.kept.maskOnDisk.attached) this.kept.maskOnDisk.forget()
    if (picked !== 'closed') await this.rejoin()
  }

  private async rejoin(): Promise<void> {
    const disk = this.kept.maskOnDisk
    const path = disk.path
    if (path === null || disk.attached || this.kept.folder.state !== 'open') return
    const file = await this.kept.folder.fileAt(path)
    let data: { text: string; modified: number } | null = null
    if (file !== null) {
      try {
        const read = await file.getFile()
        data = { text: await read.text(), modified: read.lastModified }
      } catch {
        data = null
      }
    }
    if (disk.path !== path || disk.attached) return
    if (file === null || data === null) {
      disk.forget()
      return
    }
    if (
      data.text ===
      packMask(this.editor.tree, this.editor.dataSources.list, this.editor.relation.list, this.editor.leftover)
    ) {
      disk.remember(file, path, data.text)
      return
    }
    const read = data.modified > this.kept.keptAt ? packMaskFrom(data.text) : null
    if (read?.ok) {
      const locked = mustGuard(read.note)
      this.editor.replaceMask(read.content, { file, path, modified: data.modified }, locked)
      const notice = readNotice(this.editor, path, read.note, locked)
      if (notice !== null) this.editor.view.showNotice(notice)
      return
    }
    this.keepIn({ file, path }, null)
  }
}
