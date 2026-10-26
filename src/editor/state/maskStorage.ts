import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { emptyTree } from '../../core/block/treeOps'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'
import { leftoverForFile, NO_LEFTOVER, treeForFile, type Leftover } from './leftover'
import { packLibrary, packLibraryFrom } from './libraryFile'
import { CURRENT_SCHEMA_VERSION } from './maskSchema'
import { readMask } from './readMask'

const STORAGE_KEY = 'aufbau_editor_mask'

const LIBRARY_KEY = 'aufbau_editor_library'

const FORMER_LIBRARY_KEY = 'aufbau_editor_datencenter'

const OUTLINES_KEY = 'aufbau_editor_outlines'

const COLUMNS_KEY = 'aufbau_editor_columns'

const SIDE_KEY = 'aufbau_editor_side'

const SOURCE_TABS_KEY = 'aufbau_editor_source_tabs'

const DATA_WINDOW_KEY = 'aufbau_editor_data_window'
export const SAVE_DEBOUNCE_MS = 500

export interface StoredMask {
  tree: MaskTree
  selectedId: string | null
  activePageId: string
  file: string | null
  savedAt: number
  leftover: Leftover
  locked: boolean
  dataSources?: readonly DataSource[]
}

export interface StoredLibrary {
  dataSources: readonly DataSource[]
  relation: readonly RelationTemplate[]
}

function read(key: string, formerKey?: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return formerKey === undefined ? localStorage.getItem(key) : readMoved(key, formerKey)
  } catch {
    return null
  }
}

function readMoved(key: string, formerKey: string): string | null {
  const text = localStorage.getItem(key)
  if (text !== null) return text
  const former = localStorage.getItem(formerKey)
  if (former === null) return null
  write(key, former)
  if (localStorage.getItem(key) === former) localStorage.removeItem(formerKey)
  return former
}

function write(key: string, text: string): void {
  try {
    localStorage.setItem(key, text)
  } catch {}
}

class Slot {
  private readonly key: string
  private readonly formerKey: string | undefined
  private foreign = false

  constructor(key: string, formerKey?: string) {
    this.key = key
    this.formerKey = formerKey
  }

  read<T>(parse: (raw: string) => T | null): T | null {
    const raw = read(this.key, this.formerKey)
    if (raw === null) return null
    const value = parse(raw)
    this.foreign = value === null
    return value
  }

  write(text: string): void {
    if (!this.foreign) write(this.key, text)
  }
}

const maskSlot = new Slot(STORAGE_KEY)
const librarySlot = new Slot(LIBRARY_KEY, FORMER_LIBRARY_KEY)

export function loadLibraryFromStorage(): StoredLibrary {
  return (
    librarySlot.read((raw) => {
      const result = packLibraryFrom(raw)
      return result.ok ? result.content : null
    }) ?? { dataSources: [], relation: [] }
  )
}

export function loadFromStorage(knownSources: readonly DataSource[] = []): StoredMask | null {
  return maskSlot.read((raw) => readState(raw, knownSources))
}

function readState(raw: string, knownSources: readonly DataSource[]): StoredMask | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  try {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const result = readMask(parsed as Record<string, unknown>, knownSources)
    if (!result.ok) return null
    const { read } = result
    const kept = parsed as { file?: unknown; savedAt?: unknown; locked?: unknown }
    return {
      tree: read.tree,
      selectedId: read.selectedId,
      activePageId: typeof read.activePageId === 'string' ? read.activePageId : ROOT_ID,
      file: typeof kept.file === 'string' ? kept.file : null,
      savedAt: typeof kept.savedAt === 'number' ? kept.savedAt : 0,
      leftover: read.leftover,
      locked: kept.locked === true,
      dataSources: read.dataSources,
    }
  } catch {
    return null
  }
}

export function emptyMask(): StoredMask {
  return {
    tree: emptyTree(),
    selectedId: null,
    activePageId: ROOT_ID,
    file: null,
    savedAt: 0,
    leftover: NO_LEFTOVER,
    locked: false,
  }
}

export function persistMask(mask: StoredMask, sources: readonly DataSource[]): void {
  const kept = leftoverForFile(mask.tree, sources, mask.leftover)
  maskSlot.write(
    JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tree: treeForFile(mask.tree, mask.leftover),
      selectedId: mask.selectedId,
      activePageId: mask.activePageId,
      file: mask.file,
      savedAt: mask.savedAt,
      ...(kept ? { leftover: kept } : {}),
      ...(mask.locked ? { locked: true } : {}),
    }),
  )
}

export function loadOutlines(): boolean {
  return read(OUTLINES_KEY) === 'on'
}

export function persistOutlines(on: boolean): void {
  write(OUTLINES_KEY, on ? 'on' : 'off')
}

export type SideTab = 'blocks' | 'masks'

export function loadSide(): SideTab {
  return read(SIDE_KEY) === 'masks' ? 'masks' : 'blocks'
}

export function persistSide(tab: SideTab): void {
  write(SIDE_KEY, tab)
}

export type Column = 'left' | 'right'

export function loadShutColumns(): ReadonlySet<Column> {
  const words = (read(COLUMNS_KEY) ?? '').split(' ')
  return new Set((['left', 'right'] as const).filter((c) => words.includes(c)))
}

export function persistShutColumns(shut: ReadonlySet<Column>): void {
  write(COLUMNS_KEY, [...shut].join(' '))
}

function storedJson(key: string): unknown {
  try {
    return JSON.parse(read(key) ?? 'null')
  } catch {
    return null
  }
}

// The tabs the user made in the data window, also while no source is in them.
export function loadSourceTabs(): string[] {
  const tabs = storedJson(SOURCE_TABS_KEY)
  return Array.isArray(tabs) ? tabs.filter((t): t is string => typeof t === 'string' && t.trim() !== '') : []
}

export function persistSourceTabs(tabs: readonly string[]): void {
  write(SOURCE_TABS_KEY, JSON.stringify(tabs))
}

interface WindowSize {
  width: number
  height: number
}

export function loadDataWindowSize(): WindowSize | null {
  const size = storedJson(DATA_WINDOW_KEY) as Partial<WindowSize> | null
  return size && typeof size.width === 'number' && typeof size.height === 'number'
    ? { width: size.width, height: size.height }
    : null
}

export function persistDataWindowSize(size: WindowSize): void {
  write(DATA_WINDOW_KEY, JSON.stringify(size))
}

export function persistLibrary(library: StoredLibrary): string {
  const text = packLibrary({
    dataSources: [...library.dataSources],
    relation: [...library.relation],
  })
  librarySlot.write(text)
  return text
}
