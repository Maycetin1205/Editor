import type { IconName } from './icons'
import type { BlockData, BlockHeight, SlotData } from './mask'
import type { Section } from './schema'

// What the editor, the export and the runtime know about a kind of block.
// One class per block; the blocks themselves live in src/blocks.

export type BlockGroup = 'layout' | 'display' | 'input' | 'data'

export const BLOCK_GROUPS: readonly { id: BlockGroup; label: string }[] = [
  { id: 'layout', label: 'Aufbau' },
  { id: 'display', label: 'Anzeige' },
  { id: 'input', label: 'Eingabe' },
  { id: 'data', label: 'Listen' },
]

// Something that happens to a block in the running mask and can start an
// action: a click, a row chosen, a card moved.
export interface EventSpec {
  key: string
  label: string
  // Values the event brings along; a step can use them as parameters.
  values?: readonly { key: string; label: string }[]
  // The prop that names the source whose row the event is about. That row
  // becomes the current record of the source before the steps run.
  source?: string
}

export type HeightMode = 'auto' | 'fill' | 'fixed'

export abstract class BlockType<P extends object = Record<string, unknown>, V = unknown> {
  abstract readonly type: string
  abstract readonly label: string
  abstract readonly group: BlockGroup
  abstract readonly icon: IconName
  abstract readonly description: string
  // The component that draws the block, in the editor and in the mask.
  abstract readonly View: V

  // Columns a new block takes of the twelve.
  readonly span: number = 12
  readonly minSpan: number = 2
  readonly height: BlockHeight = 'auto'
  // The heights that make sense for the block; with one entry there is no choice.
  readonly heights: readonly HeightMode[] = ['auto']
  // The user types a value into it that actions can read.
  readonly input: boolean = false

  abstract defaults(): P
  abstract schema(): readonly Section[]

  // The slots a new block starts with (containers only).
  slots(): SlotData[] {
    return []
  }

  events(_props: P): readonly EventSpec[] {
    return []
  }

  // What the block is called in the outline and in lists: its label, title or text.
  title(_props: P): string {
    return ''
  }

  propsOf(block: BlockData): P {
    return { ...this.defaults(), ...block.props } as P
  }
}

// Everything that has to know the kinds of block gets them through this.
export interface BlockCatalog {
  get(type: string): BlockType | undefined
  all(): readonly BlockType[]
}
