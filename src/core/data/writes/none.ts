import type { WriteAdapter } from './writeAdapter'

export interface NoWrite {
  kind: 'none'
}

export const noWrite: WriteAdapter<NoWrite> = {
  kind: 'none',
  read: () => ({ kind: 'none' }),
  recordField: () => '',
}
