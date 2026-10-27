import type { Unread } from '../../unread'

export interface WriteAdapter<W extends { kind: string }> {
  kind: W['kind']
  read(raw: Unread<W>): W | null
  recordField(write: W): string
}
