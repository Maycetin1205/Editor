import { accessOf, askAccess, pickFolder, reasonOf, writeText } from './folderOnDisk'
import { keepHandle, keptHandle } from './handleStore'

const KEPT_KEY = 'exportziele'

interface KeptTarget {
  name: string
  folder: FileSystemDirectoryHandle
}

async function keptTargets(): Promise<KeptTarget[]> {
  return await keptHandle<KeptTarget[]>(KEPT_KEY) ?? []
}

async function keptFolder(name: string): Promise<FileSystemDirectoryHandle | null> {
  return (await keptTargets()).find((t) => t.name === name)?.folder ?? null
}

export async function knowsExportTarget(name: string): Promise<boolean> {
  return await keptFolder(name) !== null
}

export async function pickExportTarget(now: string): Promise<string | null> {
  const before = now === '' ? null : await keptFolder(now)
  const folder = await pickFolder('export', before ?? undefined)
  if (folder === null) return null
  const targets = await keptTargets()
  for (const t of targets) {
    if (await t.folder.isSameEntry(folder)) return t.name
  }
  const taken = new Set(targets.map((t) => t.name))
  let name = folder.name
  for (let n = 2; taken.has(name); n++) name = `${folder.name} (${n})`
  await keepHandle(KEPT_KEY, [...targets, { name, folder }])
  return name
}

type ExportFolder =
  | { ok: true; folder: FileSystemDirectoryHandle }
  | { ok: false; why: string }

export async function exportFolder(name: string): Promise<ExportFolder> {
  const folder = await keptFolder(name)
  if (folder === null) {
    return { ok: false, why: 'ist auf diesem Rechner noch nicht gewählt; das geht in den Eigenschaften der Maske.' }
  }
  if (await accessOf(folder) === 'ask' && !(await askAccess(folder))) {
    return { ok: false, why: 'darf der Editor nicht beschreiben; der Browser hat es nicht erlaubt.' }
  }
  return { ok: true, folder }
}

export async function writeExport(
  folder: FileSystemDirectoryHandle,
  files: readonly { name: string; text: string }[],
): Promise<string | null> {
  try {
    for (const f of files) await writeText(await folder.getFileHandle(f.name, { create: true }), f.text)
    return null
  } catch (error) {
    return `ließ sich nicht beschreiben (${reasonOf(error)}).`
  }
}
