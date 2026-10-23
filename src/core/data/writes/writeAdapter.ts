import type { Write, WriteKind } from './writes'
import type { Unread } from '../../unread'

type WriteOf<K extends WriteKind> = Write & { kind: K }

export interface WriteAdapter<K extends WriteKind> {
  kind: K
  read(raw: Unread<WriteOf<K>>): WriteOf<K> | null
  recordField(write: WriteOf<K>): string
}
