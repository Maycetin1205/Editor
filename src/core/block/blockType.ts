import type { Capability, ContractClasses } from './capability'
import type { GridMetrics } from './grid'
import type { PropertyMap, PropertyValue } from './property'

export {
  entriesWithValue,
  entryValues,
  fieldChoicesRead,
  innerOf,
  listDefaultTitle,
  flagOn,
  flagFor,
  withInner,
  type ListBinding,
} from './listBinding'

export { bindingWithSource, SOURCES_DIVIDER, splitBinding } from './binding'

export type Category = 'input' | 'display' | 'layout'

export interface ChildDefault {
  type: string
  values?: Record<string, PropertyValue>
  children?: readonly ChildDefault[]
}

export interface BlockDeclaration {
  type: string
  tag: string
  name: string
  category: Category

  properties?: PropertyMap
  capabilities?: readonly Capability[]
  contracts?: ContractClasses

  takesChildren?: boolean

  allowedParent?: readonly string[]
  // Only blocks of these types go into it.
  allowedChildren?: readonly string[]
  // The children a new block of the type starts with.
  startChildren?: readonly ChildDefault[]
  // Fills the body of its parent instead of taking a slot of the parent's
  // grid; its blocks have the parent's columns (the pages of a Reiter).
  fillsParent?: boolean
  inPalette?: boolean

  page?: boolean

  gridArea?: boolean
  grid?: Partial<GridMetrics>
}

export type BlockType = BlockDeclaration &
  Required<Pick<BlockDeclaration, 'properties' | 'capabilities' | 'takesChildren'>>
