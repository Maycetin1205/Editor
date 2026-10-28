import type { Unread } from '../unread'

interface WriteAdapter<W extends { kind: string }> {
  kind: W['kind']
  read(raw: Unread<W>): W | null
  recordField(write: W): string
}

export interface NoWrite {
  kind: 'none'
}

const noWrite: WriteAdapter<NoWrite> = {
  kind: 'none',
  read: () => ({ kind: 'none' }),
  recordField: () => '',
}

export interface PutRelationWrite {
  kind: 'putRelation'
  recordField: string
}

const putRelation: WriteAdapter<PutRelationWrite> = {
  kind: 'putRelation',
  read(raw) {
    const recordField = typeof raw.recordField === 'string' ? raw.recordField.trim() : ''
    return recordField === '' ? null : { kind: 'putRelation', recordField }
  },
  recordField: (write) => write.recordField,
}

export type Write = NoWrite | PutRelationWrite

type WriteKind = Write['kind']

const WRITE_ADAPTERS: { [K in WriteKind]: WriteAdapter<Write & { kind: K }> } = {
  none: noWrite,
  putRelation,
}

const WRITE_KINDS: readonly WriteKind[] = Object.values(WRITE_ADAPTERS).map((a) => a.kind)

export function writeAdapter(kind: WriteKind): WriteAdapter<Write> {
  return WRITE_ADAPTERS[kind]
}

export function isWriteKind(kind: string): kind is WriteKind {
  return (WRITE_KINDS as readonly string[]).includes(kind)
}

export function recordFieldOf(write: Write): string {
  return writeAdapter(write.kind).recordField(write)
}
