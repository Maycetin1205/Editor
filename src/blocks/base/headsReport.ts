import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { entryPathFrom, type EntryPath } from '../../core/block/listBinding'
import { cssZoomOf } from './cssZoom'
import { startRename } from './inlineRename'

export const HEADS_PLACED = 'ff-heads-placed'

export interface Frame {
  left: number
  top: number
  width: number
  height: number
}

export interface HeadPlace extends Frame {
  path: EntryPath

  below: boolean

  rename: (done: (typed: string, original: string) => void) => void
}

export interface CellPlace extends Frame {
  key: string
}

export interface HeadsPlaced {
  heads: readonly HeadPlace[]
  places: readonly CellPlace[]
}

export const NO_HEADS: HeadsPlaced = { heads: [], places: [] }

const lastReport = new WeakMap<HTMLElement, HeadsPlaced>()

export function headsPlacedOf(el: HTMLElement): HeadsPlaced {
  return lastReport.get(el) ?? NO_HEADS
}

interface HeadsHost extends ReactiveControllerHost, HTMLElement {
  readonly preview: boolean
}

class HeadsReport implements ReactiveController {
  private readonly host: HeadsHost

  private resized: ResizeObserver | null = null

  private readonly scrolled = (): void => this.report()

  constructor(host: HeadsHost) {
    this.host = host
    host.addController(this)
  }

  hostConnected(): void {
    if (!this.host.preview) return
    this.resized = new ResizeObserver(() => this.report())
    this.resized.observe(this.host)
    this.host.shadowRoot?.addEventListener('scroll', this.scrolled, { capture: true, passive: true })
  }

  hostUpdated(): void {
    if (this.host.preview) this.report()
  }

  hostDisconnected(): void {
    this.resized?.disconnect()
    this.resized = null
    this.host.shadowRoot?.removeEventListener('scroll', this.scrolled, { capture: true })
  }

  private report(): void {
    const host = this.host
    const root = host.shadowRoot
    if (!root) return
    const origin = host.getBoundingClientRect()
    const zoom = cssZoomOf(host)
    const frameOf = (el: HTMLElement): Frame | null => {
      const r = el.getBoundingClientRect()
      const left = Math.max(r.left, origin.left)
      const right = Math.min(r.right, origin.right)
      const top = Math.max(r.top, origin.top)
      const bottom = Math.min(r.bottom, origin.bottom)
      if (right <= left || bottom <= top) return null
      return {
        left: (left - origin.left) / zoom,
        top: (top - origin.top) / zoom,
        width: (right - left) / zoom,
        height: (bottom - top) / zoom,
      }
    }
    const heads: HeadPlace[] = []
    root.querySelectorAll<HTMLElement>('[data-ff-entry]').forEach((el, i) => {
      const frame = frameOf(el)
      if (frame === null) return
      heads.push({
        ...frame,
        path: entryPathFrom(el.getAttribute('data-ff-entry'), i),
        below: el.hasAttribute('data-ff-below'),
        rename: (done) => startRename(el.querySelector<HTMLElement>('.head-text') ?? el, done),
      })
    })
    const places: CellPlace[] = []
    root.querySelectorAll<HTMLElement>('[data-ff-place]').forEach((el) => {
      const frame = frameOf(el)
      if (frame !== null) places.push({ ...frame, key: el.getAttribute('data-ff-place') ?? '' })
    })
    const placed: HeadsPlaced = { heads, places }
    lastReport.set(host, placed)
    host.dispatchEvent(new CustomEvent<HeadsPlaced>(HEADS_PLACED, { detail: placed }))
  }
}

export function reportsHeads(host: HeadsHost): void {
  new HeadsReport(host)
}
