const NUMBER = /^-?(?:[1-9]\d{0,2}(?:\.\d{3})+|\d+)(?:,\d+)?$/

export function asNumber(value: string): number | null {
  const t = value.trim()
  if (!NUMBER.test(t)) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function decimalsIn(value: string): number {
  const t = value.trim()
  const at = t.lastIndexOf(',')
  return at < 0 ? 0 : t.length - at - 1
}

export function numberText(value: number, decimals: number): string {
  return value.toLocaleString('de-DE', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, decimals),
  })
}

const SHOWN_DECIMALS_MAX = 20

export function shownNumber(value: number, decimals: number): string {
  const d = Math.min(Math.max(0, decimals), SHOWN_DECIMALS_MAX)
  return value.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function shownFigure(value: string, decimals: number | null): string {
  const number = asNumber(value)
  return number === null ? value : shownNumber(number, decimals ?? decimalsIn(value))
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** Math.max(0, decimals)
  return Math.round(value * f) / f
}
