import type { DataSource } from '../../core/data/dataSources'
import { nameTaken, type SourceData } from './sourceEdit'

export const STOCK_TABS = ['IDB', 'Adresse', 'Beleg', 'Weitere'] as const

const ADDRESS_TABLES = new Set(['ADR', 'ADRESSE.GET', 'LIEFERADRESSE.GET', 'ANSPRECHPARTNER.GET'])

const DOCUMENT_TABLES = new Set(['BEL', 'POS', 'BELEG.GET', 'WINDOW_VARIABLE', 'CHAPOS'])

const DOCUMENT_PRESETS = new Set<DataSource['preset']>(['document', 'documentItem', 'relationValue'])

function stockTabOf(s: DataSource): string {
  const table = s.tableId.toUpperCase()
  if (s.preset === 'idb' || table.startsWith('IDB')) return 'IDB'
  if (s.preset === 'addressMaster' || ADDRESS_TABLES.has(table)) return 'Adresse'
  if (DOCUMENT_PRESETS.has(s.preset) || DOCUMENT_TABLES.has(table)) return 'Beleg'
  return 'Weitere'
}

export const tabOf = (s: DataSource): string => s.folder ?? stockTabOf(s)

export const sameTab = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

export const isStockTab = (name: string): boolean => STOCK_TABS.some((t) => sameTab(t, name))

// Stock tabs first, then the user's own in the order they were made, then
// tabs that only come with a loaded library.
export function allTabs(sources: readonly DataSource[], own: readonly string[]): string[] {
  const tabs: string[] = [...STOCK_TABS]
  const take = (name: string) => {
    if (!tabs.some((t) => sameTab(t, name))) tabs.push(name)
  }
  own.forEach(take)
  sources.forEach((s) => take(tabOf(s)))
  return tabs
}

function withoutId(s: DataSource): SourceData {
  const { id: _id, ...rest } = s
  void _id
  return rest
}

// The source as it is, filed under tab; a source whose table already leads
// there keeps no folder, so it follows its table.
export function inTab(s: SourceData, tab: string): SourceData {
  const { folder: _folder, ...rest } = s
  void _folder
  return sameTab(stockTabOf({ ...rest, id: '' }), tab) ? rest : { ...rest, folder: tab }
}

export const movedTo = (s: DataSource, tab: string): SourceData => inTab(withoutId(s), tab)

export function unfiled(s: DataSource): SourceData {
  const { folder: _folder, ...rest } = withoutId(s)
  void _folder
  return rest
}

export function copyOf(s: DataSource, sources: readonly DataSource[]): SourceData {
  const base = `${s.name} Kopie`
  let name = base
  for (let n = 2; nameTaken(sources, name); n++) name = `${base} ${n}`
  return { ...withoutId(s), name }
}
