export const POS_LEN = /^\d+_\d+$/

const PREFIX_FORM = /^[A-Za-z0-9_]+$/

export function fieldPrefixFromInput(raw: string): string {
  const t = raw.trim()
  return t !== '' && PREFIX_FORM.test(t) ? t : ''
}

const KEY_IDB_SHORT = /^(?:IDB)?ID(\d{1,4})$/i
const KEY_FREE = /^[A-Za-z][A-Za-z0-9.]*$/

export function keyFromInput(raw: string, idbShortForm = true): string {
  const t = raw.trim()
  const short = idbShortForm ? KEY_IDB_SHORT.exec(t) : null
  if (short) return `IDBID${short[1].padStart(4, '0')}`
  return KEY_FREE.test(t) ? t : ''
}

export function keyDisplay(key: string | undefined): string {
  const m = /^IDB(ID\d{4})$/.exec(key ?? '')
  return m ? m[1] : (key ?? '')
}
