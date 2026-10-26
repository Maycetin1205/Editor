import type { MaskTree } from '../../core/block/tree'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'
import type { FilePlace } from './fileOnDisk'
import type { Leftover } from './leftover'

export interface EditorSnapshot {
  tree: MaskTree
  selectedId: string | null
  activePageId?: string
  dataSources: readonly DataSource[]
  relation: readonly RelationTemplate[]
  file?: FilePlace
  leftover?: Leftover
}

const HISTORY_LIMIT = 50

export class History {
  private _past: EditorSnapshot[] = []
  private _future: EditorSnapshot[] = []

  private _txDepth = 0

  // The redo steps the outermost transaction cleared when it began.
  private _futureBefore: EditorSnapshot[] = []

  get canUndo(): boolean {
    return this._past.length > 0
  }
  get canRedo(): boolean {
    return this._future.length > 0
  }

  record(makeSnapshot: () => EditorSnapshot): void {
    if (this._txDepth > 0) return
    this._past.push(makeSnapshot())
    if (this._past.length > HISTORY_LIMIT) this._past.shift()
    this._future = []
  }

  begin(makeSnapshot: () => EditorSnapshot): void {
    if (this._txDepth === 0) {
      this._futureBefore = this._future
      this.record(makeSnapshot)
    }
    this._txDepth++
  }

  end(): void {
    if (this._txDepth > 0) this._txDepth--
  }

  // Ends the outermost transaction without its step: hands back the state
  // it began with and puts the redo steps back. Inside another transaction
  // there is no state of its own; it only ends, and null says so.
  abandon(): EditorSnapshot | null {
    if (this._txDepth !== 1) {
      this.end()
      return null
    }
    this._txDepth = 0
    const start = this._past.pop() ?? null
    this._future = this._futureBefore
    return start
  }

  transaction<T>(makeSnapshot: () => EditorSnapshot, run: () => T): T {
    this.begin(makeSnapshot)
    try {
      return run()
    } finally {
      this.end()
    }
  }

  undo(makeCurrent: () => EditorSnapshot): EditorSnapshot | null {
    const prev = this._past.pop()
    if (!prev) return null
    this._future.push(makeCurrent())
    return prev
  }

  redo(makeCurrent: () => EditorSnapshot): EditorSnapshot | null {
    const next = this._future.pop()
    if (!next) return null
    this._past.push(makeCurrent())
    return next
  }
}

export interface GestureBracket {
  open(): void
  close(): void
  // Ends the gesture as if it had not happened.
  cancel(): void
}

export function gestureBracket(open: () => void, close: () => void, cancel: () => void = close): GestureBracket {
  let opened = false
  let done = false
  return {
    open: () => {
      if (done || opened) return
      opened = true
      open()
    },
    close: () => {
      if (done) return
      done = true
      if (opened) close()
    },
    cancel: () => {
      if (done) return
      done = true
      if (opened) cancel()
    },
  }
}
