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

export {
  bindingWithSource,
  SOURCES_DIVIDER,
  splitBinding,
} from './binding'

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
  inPalette?: boolean

  page?: boolean

  gridArea?: boolean
  grid?: Partial<GridMetrics>
}

export type BlockType = BlockDeclaration & Required<Pick<
  BlockDeclaration,
  'properties' | 'capabilities' | 'takesChildren'
>>
