import type { JobView } from '../core/data/jobs'
import type { MaskHost } from './maskHost'
import { previewHost } from './previewHost'

interface MaskState {
  host: MaskHost
  selection: {
    chosen: Map<string, { row: unknown; trait: string; number: number; made?: true }>
    listeners: Set<(byControls: boolean) => void>
    counter: number
    messageRuns: boolean
    lateReport: boolean
    toControls: boolean
  }
  chosenDay: {
    day: string
    listeners: Set<() => void>
  }
  search: {
    text: string
    listeners: Set<() => void>
  }
  lookupWindow: {
    open: HTMLElement | null
    openFor: HTMLElement | null
    backFocus: HTMLElement | (() => void) | null
  }
  fetchingSources: {
    lastPrint: Map<string, string>
    silentLoaded: Map<string, Set<string>>
    running: Map<string, Promise<void>>
    wired: boolean
  }
  catchingFrames: { readonly isConnected: boolean; close(): void }[]
  jobs: {
    known: Map<number, JobView>
    listeners: Set<(job: JobView) => void>
  }
}

export const maskState: MaskState = {
  // The preview host answers nothing; src/runtime/softEngineStart.ts puts
  // SoftEngine in its place when the exported mask starts.
  host: previewHost,
  selection: {
    chosen: new Map(),
    listeners: new Set(),
    counter: 0,
    messageRuns: false,
    lateReport: false,
    toControls: false,
  },
  chosenDay: {
    day: '',
    listeners: new Set(),
  },
  search: {
    text: '',
    listeners: new Set(),
  },
  lookupWindow: {
    open: null,
    openFor: null,
    backFocus: null,
  },
  fetchingSources: {
    lastPrint: new Map(),
    silentLoaded: new Map(),
    running: new Map(),
    wired: false,
  },
  catchingFrames: [],
  jobs: {
    known: new Map(),
    listeners: new Set(),
  },
}
