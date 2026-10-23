type KeysOf<T> = T extends unknown ? keyof T : never

export type Unread<T> = { readonly [K in KeysOf<T>]?: unknown }

export function isUnread<T>(raw: unknown): raw is Unread<T> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}
