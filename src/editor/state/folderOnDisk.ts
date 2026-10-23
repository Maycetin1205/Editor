type Access = 'granted' | 'denied' | 'prompt'

interface Rights {
  queryPermission?: (options: { mode: 'readwrite' }) => Promise<Access>
  requestPermission?: (options: { mode: 'readwrite' }) => Promise<Access>
}

interface Walkable {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>
}

interface FolderPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle
}

type FolderPicker = (options: FolderPickerOptions) => Promise<FileSystemDirectoryHandle>

function folderPicker(): FolderPicker | undefined {
  const spot = (globalThis as { showDirectoryPicker?: FolderPicker }).showDirectoryPicker
  return typeof spot === 'function' ? spot : undefined
}

export function canPickFolder(): boolean {
  return folderPicker() !== undefined
}

export async function pickFolder(id: string, startIn?: FileSystemHandle): Promise<FileSystemDirectoryHandle | null> {
  const pick = folderPicker()
  if (pick === undefined) return null
  try {
    return await pick({ id, mode: 'readwrite', ...(startIn ? { startIn } : {}) })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}

export async function accessOf(handle: FileSystemHandle): Promise<'granted' | 'ask'> {
  const query = (handle as FileSystemHandle & Rights).queryPermission
  if (query === undefined) return 'granted'
  try {
    return (await query.call(handle, { mode: 'readwrite' })) === 'granted' ? 'granted' : 'ask'
  } catch {
    return 'ask'
  }
}

export async function askAccess(handle: FileSystemHandle): Promise<boolean> {
  const request = (handle as FileSystemHandle & Rights).requestPermission
  if (request === undefined) return true
  try {
    return (await request.call(handle, { mode: 'readwrite' })) === 'granted'
  } catch {
    return false
  }
}

export function entriesOf(
  folder: FileSystemDirectoryHandle,
): AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle> {
  return (folder as FileSystemDirectoryHandle & Walkable).values()
}

export async function writeText(file: FileSystemFileHandle, text: string): Promise<void> {
  const open = await file.createWritable()
  await open.write(text)
  await open.close()
}

async function fileIn(folder: FileSystemDirectoryHandle, name: string): Promise<FileSystemFileHandle | null> {
  try {
    return await folder.getFileHandle(name)
  } catch {
    return null
  }
}

export function fileNameFrom(text: string, fallback: string): string {
  const allowed = [...text].map((c) => (c < ' ' || '<>:"/\\|?*'.includes(c) ? ' ' : c)).join('')
  const clean = allowed.replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '')
  return clean === '' ? fallback : clean
}

export async function freeFileName(folder: FileSystemDirectoryHandle, base: string, suffix: string): Promise<string> {
  for (let n = 1; ; n++) {
    const name = n === 1 ? `${base}${suffix}` : `${base} ${n}${suffix}`
    if ((await fileIn(folder, name)) === null) return name
  }
}

export function reasonOf(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'der Browser erlaubt es nicht'
    if (error.name === 'NotFoundError') return 'die Datei oder der Ordner ist nicht mehr da'
    if (error.name === 'NoModificationAllowedError') return 'die Datei ist gesperrt'
    if (error.name === 'QuotaExceededError') return 'die Platte ist voll'
  }
  return error instanceof Error ? error.message : String(error)
}
