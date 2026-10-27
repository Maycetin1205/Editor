import { GRID } from '../../core/block/grid'
import { MASK_ROOT_CLASS } from '../../core/block/frameFit'

// The blocks of a mask sit on fixed rows of a grid. A folded area keeps only
// the rows of its head; the rows it gives up close, when no other block of its
// grid holds them, and every block below moves up by as many rows. An open
// area whose own grid closed rows gives up as many at its foot, so a fold
// inside a fold reaches the sheet. An area that gives up all its rows (set to
// hide while it is empty) leaves the grid, hidden, and comes back the same way.

export interface FoldHost extends HTMLElement {
  foldCut(rows: number): number
}

const PITCH = GRID.rowPx + GRID.gapPx

const isFoldHost = (el: Element): el is FoldHost => typeof (el as Partial<FoldHost>).foldCut === 'function'

interface Rows {
  y: number
  h: number
}

const placed = new WeakMap<HTMLElement, Rows>()

function rowsOf(el: HTMLElement): Rows | null {
  const known = placed.get(el)
  if (known) return known
  const start = Number.parseInt(el.style.gridRowStart, 10)
  const span = /^span\s+(\d+)$/.exec(el.style.gridRowEnd.trim())
  if (!Number.isFinite(start) || !span) return null
  const rows = { y: start - 1, h: Number(span[1]) }
  placed.set(el, rows)
  return rows
}

function currentY(el: HTMLElement, fallback: number): number {
  const start = Number.parseInt(el.style.gridRowStart, 10)
  return Number.isFinite(start) ? start - 1 : fallback
}

let moving = false

function slide(el: HTMLElement, rows: number): void {
  if (!moving || rows === 0 || typeof el.animate !== 'function') return
  el.animate([{ transform: `translateY(${rows * PITCH}px)` }, { transform: 'none' }], {
    duration: 180,
    easing: 'cubic-bezier(.2, 0, 0, 1)',
  })
}

// Lays out the grid of container anew and says how many of its rows closed.
export function closedRowsIn(container: Element): number {
  const items: { el: HTMLElement; at: Rows; cut: number }[] = []
  for (const el of container.children) {
    if (!(el instanceof HTMLElement)) continue
    const at = rowsOf(el)
    if (!at) continue
    const cut = isFoldHost(el) ? Math.min(Math.max(0, el.foldCut(at.h)), at.h) : 0
    items.push({ el, at, cut })
  }

  const held = new Set<number>()
  const kept = new Set<number>()
  for (const { at, cut } of items) {
    for (let r = at.y; r < at.y + at.h; r++) held.add(r)
    for (let r = at.y; r < at.y + at.h - cut; r++) kept.add(r)
  }
  const closed = [...held].filter((r) => !kept.has(r)).sort((a, b) => a - b)

  for (const { el, at, cut } of items) {
    const gone = cut === at.h
    if (isFoldHost(el)) el.toggleAttribute('hidden', gone)
    if (gone) continue
    const y = at.y - closed.filter((r) => r < at.y).length
    const was = currentY(el, at.y)
    el.style.gridRowStart = String(y + 1)
    el.style.gridRowEnd = `span ${at.h - cut}`
    slide(el, was - y)
  }

  if (container.classList.contains(MASK_ROOT_CLASS) && container instanceof HTMLElement) {
    sheetTracksWithout(container, new Set(closed))
  }
  return closed.length
}

// --- The rows of the sheet ---------------------------------------------------
// When the sheet holds a growing list its rows are written out one by one
// (grid-template-rows); a closed row leaves that list too.

const sheetTracks = new WeakMap<HTMLElement, readonly string[] | null>()

function tracksRead(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let part = ''
  for (const ch of text.trim()) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ' ' && depth === 0) {
      if (part !== '') parts.push(part)
      part = ''
    } else {
      part += ch
    }
  }
  if (part !== '') parts.push(part)
  return parts.flatMap((p) => {
    const run = /^repeat\((\d+),\s*(.+)\)$/.exec(p)
    return run ? Array.from({ length: Number(run[1]) }, () => run[2].trim()) : [p]
  })
}

function declaredTracks(sheet: HTMLElement): readonly string[] | null {
  if (sheetTracks.has(sheet)) return sheetTracks.get(sheet) ?? null
  let found: string[] | null = null
  for (const styles of Array.from(sheet.ownerDocument.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = styles.cssRules
    } catch {
      continue
    }
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText === `.${MASK_ROOT_CLASS}` &&
        rule.style.gridTemplateRows !== ''
      ) {
        found = tracksRead(rule.style.gridTemplateRows)
      }
    }
  }
  sheetTracks.set(sheet, found)
  return found
}

function sheetTracksWithout(sheet: HTMLElement, closed: ReadonlySet<number>): void {
  const tracks = declaredTracks(sheet)
  if (!tracks) return
  sheet.style.gridTemplateRows = closed.size === 0 ? '' : tracks.filter((_, r) => !closed.has(r)).join(' ')
}

// --- When -------------------------------------------------------------------

function topGrid(from: Element): Element | null {
  let at = from.parentElement
  while (at && isFoldHost(at)) at = at.parentElement
  return at
}

const due = new Set<Element>()

// Folds open at the start: once all areas of the mask are there, without motion.
export function foldLater(area: Element): void {
  const top = topGrid(area)
  if (!top || due.has(top)) return
  due.add(top)
  queueMicrotask(() => {
    due.delete(top)
    closedRowsIn(top)
  })
}

export function foldNow(area: Element): void {
  const top = topGrid(area)
  if (!top) return
  moving = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches !== true
  try {
    closedRowsIn(top)
  } finally {
    moving = false
  }
}
