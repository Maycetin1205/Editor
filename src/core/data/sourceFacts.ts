// What every adapter of a data source may know about it: the facts, without
// its order, delivery or write. The adapters stay free of each other that way.

export interface DataField {
  code: string

  name: string

  length?: number
}

export interface SourceFacts {
  id: string

  name: string

  tableId: string

  fields: readonly DataField[]
}
