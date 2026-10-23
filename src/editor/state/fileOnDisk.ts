import { downloadFile } from './downloadFile'
import { writeText } from './folderOnDisk'

interface PickerOptions {
  suggestedName?: string
  types?: readonly { description: string; accept: Record<string, readonly string[]> }[]
}

type SaveFilePicker = (options: PickerOptions) => Promise<FileSystemFileHandle>

export interface FilePlace {
  handle: FileSystemFileHandle | null
  path: string | null
  locked?: boolean
}

type BackUp = (path: string, text: string) => Promise<void>

const JSON_KIND = [{ description: 'Aufbau-Editor', accept: { 'application/json': ['.json'] } }]

function savePicker(): SaveFilePicker | undefined {
  const spot = (globalThis as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  return typeof spot === 'function' ? spot : undefined
}

export class FileOnDisk {
  private handle: FileSystemFileHandle | null = null

  private _path: string | null = null

  private written: string | null = null

  private quiet = false

  private _locked = false

  private backUp: BackUp | null = null

  private readonly backedUp = new Set<string>()

  get attached(): boolean { return this.handle !== null }

  get path(): string | null { return this._path }

  get name(): string { return this.handle?.name ?? '' }

  get locked(): boolean { return this._locked }

  get place(): FilePlace { return { handle: this.handle, path: this._path, locked: this._locked } }

  backUpWith(backUp: BackUp): void {
    this.backUp = backUp
  }

  remember(handle: FileSystemFileHandle, path: string | null = null, holds: string | null = null, created = false): void {
    this.handle = handle
    this._path = path
    this.written = holds
    this.quiet = holds !== null
    if (created && path !== null) this.backedUp.add(path)
  }

  restore(place: FilePlace): void {
    if (place.handle === null) this.expect(place.path)
    else this.remember(place.handle, place.path)
    this._locked = place.locked === true
  }

  lock(on: boolean): void {
    this._locked = on
  }

  stir(): void {
    this.quiet = false
  }

  expect(path: string | null): void {
    this.handle = null
    this._path = path
    this.written = null
    this.quiet = false
    this._locked = false
  }

  forget(): void {
    this.expect(null)
  }

  async write(text: string): Promise<void> {
    const handle = this.handle
    if (handle === null) throw new Error('keine Datei gewählt')
    if (this._locked) throw new Error('die Maske ist nur zum Ansehen geöffnet')
    this.quiet = false
    if (text === this.written) return
    await this.keepBefore(handle, text)
    await writeText(handle, text)
    if (handle === this.handle) this.written = text
  }

  // Before a file is overwritten for the first time in a session, what stood
  // in it goes to the backup.
  private async keepBefore(handle: FileSystemFileHandle, text: string): Promise<void> {
    const path = this._path
    if (path === null || this.backUp === null || this.backedUp.has(path)) return
    this.backedUp.add(path)
    try {
      const before = await (await handle.getFile()).text()
      if (before.trim() !== '' && before !== text) await this.backUp(path, before)
    } catch {
      // A missing backup does not stop the save.
    }
  }

  async writeAgain(text: string): Promise<boolean> {
    const handle = this.handle
    if (handle === null) return false
    if (this.quiet || this._locked) return true
    try {
      await this.write(text)
      return true
    } catch {
      if (handle === this.handle) this.handle = null
      return false
    }
  }
}

export async function writeFile(
  file: FileOnDisk,
  suggestedName: string,
  text: string,
): Promise<void> {
  if (await file.writeAgain(text)) return

  const pick = savePicker()
  if (pick === undefined) {
    downloadFile(suggestedName, text, 'application/json')
    return
  }

  let handle: FileSystemFileHandle
  try {
    handle = await pick({ suggestedName, types: JSON_KIND })
  } catch {
    return
  }
  file.remember(handle)
  await file.writeAgain(text)
}
