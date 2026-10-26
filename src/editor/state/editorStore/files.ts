import type { MaskFolder } from '../maskFolder'
import { mustGuard, packMask, packMaskFrom, readNotice, type MaskEditor, type MaskFileAt } from '../maskFile'
import type { EditorPersistence } from './persistence'

// The mask on disk, the library on disk and the folder of the masks: what
// the editor keeps outside the browser, and how it finds it again after a
// restart (rejoin).
export class EditorFiles {
  private readonly editor: MaskEditor

  private readonly persistence: EditorPersistence

  private _reopening: Promise<void> | null = null

  constructor(editor: MaskEditor, persistence: EditorPersistence) {
    this.editor = editor
    this.persistence = persistence
  }

  keepIn(at: Omit<MaskFileAt, 'modified'>, holds: string | null, created = false): void {
    this.persistence.maskOnDisk.remember(at.file, at.path, holds, created)
    this.persistence.plan()
  }

  get maskOnDisk() {
    return this.persistence.maskOnDisk
  }

  get libraryOnDisk() {
    return this.persistence.libraryOnDisk
  }

  get maskFolder(): MaskFolder {
    return this.persistence.folder
  }

  get savedAt(): number {
    return this.persistence.savedAt
  }

  saveNow(): void {
    this.persistence.now()
  }

  reopenFolder(): Promise<void> {
    this._reopening ??= (async () => {
      await this.persistence.folder.restore()
      await this.rejoin()
    })()
    return this._reopening
  }

  async folderReady(): Promise<boolean> {
    if (!(await this.persistence.folder.ready())) return false
    await this.rejoin()
    return true
  }

  async pickMaskFolder(): Promise<void> {
    const picked = await this.persistence.folder.pick()
    if (picked === 'switched' && !this.persistence.maskOnDisk.attached) this.persistence.maskOnDisk.forget()
    if (picked !== 'closed') await this.rejoin()
  }

  private async rejoin(): Promise<void> {
    const disk = this.persistence.maskOnDisk
    const path = disk.path
    if (path === null || disk.attached || this.persistence.folder.state !== 'open') return
    const file = await this.persistence.folder.fileAt(path)
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
    const read = data.modified > this.persistence.savedAt ? packMaskFrom(data.text) : null
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
