import type { ConditionData, StepData } from './actions'
import type { RelationData } from './relations'
import type { SourceData } from './sources'

// The data of a mask as it is saved, exported and undone: plain JSON.
// Everything that changes a mask goes through MaskDocument (document.ts).

export const MASK_KIND = 'aufbau-maske'
export const MASK_VERSION = 1

// A row is twelve columns wide; a block takes 1 to 12 of them.
export const COLUMNS = 12

// auto: as high as its content. fill: takes the room left on the page.
// A number: fixed height in pixels.
export type BlockHeight = 'auto' | 'fill' | number

export interface BlockData {
  id: string
  type: string
  span: number
  height?: BlockHeight
  props: Record<string, unknown>
  // Containers (Bereich, Reiter) hold rows of their own in slots.
  slots?: SlotData[]
  // Event key -> the steps that run when it happens.
  actions?: Record<string, StepData[]>
  visible?: ConditionData
}

export interface SlotData {
  id: string
  title: string
  rows: RowData[]
}

export interface RowData {
  id: string
  cells: BlockData[]
}

export type PageKind = 'main' | 'dialog'

export interface PageData {
  id: string
  name: string
  kind: PageKind
  // Width of a dialog in pixels; the main page fills the frame.
  width: number
  rows: RowData[]
}

export type Density = 'comfortable' | 'compact'
export type Corners = 'sharp' | 'soft' | 'round'
export type Surface = 'gray' | 'white'

export interface ThemeData {
  accent: string
  density: Density
  corners: Corners
  surface: Surface
}

export interface MaskData {
  kind: typeof MASK_KIND
  version: number
  id: string
  name: string
  // Number of the SoftEngine layout frame the mask is exported for, or ''.
  frame: string
  theme: ThemeData
  pages: PageData[]
  sources: SourceData[]
  relations: RelationData[]
}

export const ACCENTS: readonly { value: string; label: string }[] = [
  { value: '#2563eb', label: 'Blau' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#7c3aed', label: 'Violett' },
  { value: '#0d9488', label: 'Petrol' },
  { value: '#16a34a', label: 'Grün' },
  { value: '#d97706', label: 'Bernstein' },
  { value: '#e11d48', label: 'Rot' },
  { value: '#334155', label: 'Schiefer' },
]

export const DEFAULT_THEME: ThemeData = {
  accent: '#2563eb',
  density: 'comfortable',
  corners: 'soft',
  surface: 'gray',
}

// Colour tones a block may take: fixed meanings instead of free colours, so
// every mask stays in one palette.
export type Tone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'teal'

export const TONES: readonly { value: Tone; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'accent', label: 'Akzent' },
  { value: 'info', label: 'Blau' },
  { value: 'success', label: 'Grün' },
  { value: 'warning', label: 'Gelb' },
  { value: 'danger', label: 'Rot' },
  { value: 'violet', label: 'Violett' },
  { value: 'teal', label: 'Petrol' },
]
