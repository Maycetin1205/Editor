import type { Unread } from '../../unread'

export function popupIdRead(raw: Unread<{ popupId: string }>): string | null {
  return typeof raw.popupId === 'string' ? raw.popupId : null
}

export function popupNameRead(raw: Unread<{ popup: string; popupId: string }>): string | null {
  if (typeof raw.popup === 'string') return raw.popup
  return typeof raw.popupId === 'string' ? '' : null
}

export function popupIdMoved(popupId: string, newId: (oldId: string) => string | undefined): string | undefined {
  return popupId === '' ? undefined : newId(popupId)
}
