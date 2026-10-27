import type { WriteAdapter } from './writeAdapter'

export interface PutRelationWrite {
  kind: 'putRelation'
  recordField: string
}

export const putRelation: WriteAdapter<PutRelationWrite> = {
  kind: 'putRelation',
  read(raw) {
    const recordField = typeof raw.recordField === 'string' ? raw.recordField.trim() : ''
    return recordField === '' ? null : { kind: 'putRelation', recordField }
  },
  recordField: (write) => write.recordField,
}
