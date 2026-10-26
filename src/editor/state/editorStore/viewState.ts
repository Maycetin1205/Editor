import type { LookupWindow } from '../../../core/block/capability'
import type { StepTab } from '../../actions/stepRegistry'
import type { NoticeText } from '../noticeText'
import { Subject } from '../Subject'
import {
  loadOutlines,
  loadShutColumns,
  loadSide,
  persistOutlines,
  persistShutColumns,
  persistSide,
  type Column,
  type SideTab,
} from '../maskStorage'

export type { SideTab } from '../maskStorage'

// What the toolbar just finished, shown for a moment as a tick.
type Finished = 'saved' | 'exported' | 'template'

const DONE_MS = 1600

interface OpenStep {
  blockId: string
  eventKey: string
  stepId: string | null
  tab: StepTab
}

interface OpenCalculation {
  blockId: string
  column: string
}

export interface OpenLookup {
  blockId: string
  window: LookupWindow
  slot: number
}

// What the editor shows beside the mask: open windows, panels, notices. It
// changes without touching the mask and tells its own listeners.
export class EditorView {
  private readonly subject = new Subject<void>()

  private _version = 0

  private _stepWindow: OpenStep | null = null

  private _calculationWindow: OpenCalculation | null = null

  private _splitWindow: string | null = null

  private _lookupWindow: OpenLookup | null = null

  private _followPickFor: string | null = null

  private _dataWindow: 'closed' | 'open' | 'newSource' = 'closed'

  private _sideTab = loadSide()

  private _saveWaits = false

  private _shut = loadShutColumns()

  private _notice: NoticeText | null = null

  private _done: Finished | null = null

  private doneTimer: ReturnType<typeof setTimeout> | null = null

  private _outlines = loadOutlines()

  subscribe(listener: () => void): () => void {
    return this.subject.subscribe(listener)
  }

  get version(): number {
    return this._version
  }

  private changed(): void {
    this._version++
    this.subject.notify()
  }

  get dataWindow(): boolean {
    return this._dataWindow !== 'closed'
  }

  get startsNewSource(): boolean {
    return this._dataWindow === 'newSource'
  }

  showData(open: boolean): void {
    const next = open ? 'open' : 'closed'
    if (this._dataWindow === next) return
    this._dataWindow = next
    this.changed()
  }

  startNewSource(): void {
    if (this._dataWindow === 'newSource') return
    this._dataWindow = 'newSource'
    this.changed()
  }

  get sideTab(): SideTab {
    return this._sideTab
  }

  showSide(tab: SideTab): void {
    if (tab !== 'masks') this._saveWaits = false
    if (this._sideTab === tab && !this._shut.has('left')) return
    this._sideTab = tab
    persistSide(tab)
    this.shutColumn('left', false)
    this.changed()
  }

  get saveWaits(): boolean {
    return this._saveWaits
  }

  waitToSave(on: boolean): void {
    this._saveWaits = on
  }

  isShut(column: Column): boolean {
    return this._shut.has(column)
  }

  shutColumn(column: Column, shut: boolean): void {
    if (this._shut.has(column) === shut) return
    const next = new Set(this._shut)
    if (shut) next.add(column)
    else next.delete(column)
    this._shut = next
    persistShutColumns(next)
    this.changed()
  }

  get notice(): NoticeText | null {
    return this._notice
  }

  showNotice(notice: NoticeText | null): void {
    if (this._notice === notice) return
    this._notice = notice
    this.changed()
  }

  get done(): Finished | null {
    return this._done
  }

  markDone(finished: Finished): void {
    if (this.doneTimer !== null) clearTimeout(this.doneTimer)
    this._done = finished
    this.changed()
    this.doneTimer = setTimeout(() => {
      this.doneTimer = null
      this._done = null
      this.changed()
    }, DONE_MS)
  }

  get outlines(): boolean {
    return this._outlines
  }

  showOutlines(on: boolean): void {
    if (this._outlines === on) return
    this._outlines = on
    persistOutlines(on)
    this.changed()
  }

  get stepWindow(): OpenStep | null {
    return this._stepWindow
  }

  openStep(open: OpenStep | null): void {
    if (this._stepWindow === open) return
    this._stepWindow = open
    this.changed()
  }

  get calculationWindow(): OpenCalculation | null {
    return this._calculationWindow
  }

  openCalculation(open: OpenCalculation | null): void {
    if (this._calculationWindow === open) return
    this._calculationWindow = open
    this.changed()
  }

  get splitWindow(): string | null {
    return this._splitWindow
  }

  openSplit(blockId: string | null): void {
    if (this._splitWindow === blockId) return
    this._splitWindow = blockId
    this.changed()
  }

  get lookupWindow(): OpenLookup | null {
    return this._lookupWindow
  }

  setLookupWindow(open: OpenLookup | null): void {
    if (this._lookupWindow === open) return
    this._lookupWindow = open
    this.changed()
  }

  get followPickFor(): string | null {
    return this._followPickFor
  }

  pickFollowFor(blockId: string | null): void {
    if (this._followPickFor === blockId) return
    this._followPickFor = blockId
    this.changed()
  }
}
