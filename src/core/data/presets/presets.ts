import type { SourcePreset } from './sourcePreset'
import { idb } from './idb'
import { addressMaster } from './addressMaster'
import { itemMaster } from './itemMaster'
import { document } from './document'
import { documentItem } from './documentItem'
import { file } from './file'
import { erpQuery } from './erpQuery'
import { dataset } from './dataset'
import { relationValue } from './relationValue'
import { erpMask } from './erpMask'

const PRESETS = {
  idb,
  addressMaster,
  itemMaster,
  document,
  documentItem,
  file,
  erpQuery,
  dataset,
  relationValue,
  erpMask,
} satisfies Record<string, SourcePreset<string>>

export type PresetId = keyof typeof PRESETS

export const PRESET_IDS: readonly PresetId[] = Object.values(PRESETS).map((p) => p.id)

export function sourcePreset(id: PresetId): SourcePreset<PresetId> {
  return PRESETS[id]
}

export function isPresetId(id: unknown): id is PresetId {
  return typeof id === 'string' && (PRESET_IDS as readonly string[]).includes(id)
}
