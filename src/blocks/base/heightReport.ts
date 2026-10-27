import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { cssZoomOf } from './cssZoom'

export const HEIGHT_REPORTED = 'ff-height-reported'

export interface HeightReported {
  height: number
}

interface HeightHost extends ReactiveControllerHost, HTMLElement {
  readonly preview: boolean
}

class HeightReport implements ReactiveController {
  private readonly host: HeightHost

  private readonly content: () => HTMLElement | null

  private resized: ResizeObserver | null = null
  private watched: HTMLElement | null = null

  constructor(host: HeightHost, content: () => HTMLElement | null) {
    this.host = host
    this.content = content
    host.addController(this)
  }

  hostUpdated(): void {
    if (!this.host.preview) return
    const el = this.content()
    if (!el) return
    if (el !== this.watched) {
      this.resized?.disconnect()
      this.resized = new ResizeObserver(() => this.report(el))
      this.resized.observe(el)
      this.watched = el
    }
    this.report(el)
  }

  hostDisconnected(): void {
    this.resized?.disconnect()
    this.resized = null
    this.watched = null
  }

  private report(el: HTMLElement): void {
    // Not drawn (on a hidden page of a Reiter): no height to report.
    if (el.getClientRects().length === 0) return
    const height = el.getBoundingClientRect().height / cssZoomOf(el)
    this.host.dispatchEvent(new CustomEvent<HeightReported>(HEIGHT_REPORTED, { detail: { height } }))
  }
}

export function reportsHeight(host: HeightHost, content: () => HTMLElement | null): void {
  new HeightReport(host, content)
}
