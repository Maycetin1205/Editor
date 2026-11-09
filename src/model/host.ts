import type { CallResult } from './actions'
import type { RelationVerb } from './relations'
import type { SourceData } from './sources'

// Who answers the mask. In SoftEngine that is SoftEngine (softengine/
// SoftEngineHost.ts); in the editor a stand-in that serves example rows
// (runtime/PreviewHost.ts). The mask itself knows only this interface.

export interface QueryKeys {
  documentKind: string
  address: string
}

export type HostNotice =
  | { kind: 'lost' }
  | { kind: 'back' }
  // SoftEngine objected to something after the mask had moved on.
  | { kind: 'refused'; text: string }

export interface MaskHost {
  // True in SoftEngine, false in the editor.
  readonly live: boolean
  // Begins listening; onData is called whenever pushed data arrive or change.
  start(onData: () => void): void
  // Resolves when questions can be asked.
  whenReady(): Promise<void>
  // The rows SoftEngine pushed for a source; undefined before they arrive.
  pushed(source: SourceData): unknown[] | undefined
  readField(row: unknown, code: string): string
  // Changes a row the mask holds, so a write shows before SoftEngine confirms it.
  writeField(row: unknown, code: string, value: string): void
  // An ERP query; null when SoftEngine gave no answer.
  query(source: SourceData, fields: string, keys: QueryKeys): Promise<unknown[] | null>
  // The rows a GET_RELATION answers for a source of kind "relation".
  relationRows(nr: string, params: string[], fields: string[]): Promise<Record<string, string>[] | null>
  call(verb: RelationVerb, nr: string, params: string[]): Promise<CallResult>
  startTool(number: string, params: string[]): boolean
  requestFreshData(): void
  variable(name: string): string
  onNotice(listener: (notice: HostNotice) => void): void
}
