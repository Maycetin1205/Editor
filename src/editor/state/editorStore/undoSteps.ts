import { gestureBracket, History, type EditorSnapshot, type GestureBracket } from '../history'

// Undo and redo for the editor. A step is a snapshot of the mask and its
// libraries, taken before a change; a transaction or a gesture makes one
// step out of several changes.
export class UndoSteps {
  private readonly history = new History()

  private readonly snapshot: () => EditorSnapshot

  private readonly restore: (state: EditorSnapshot) => void

  private readonly recorded: () => void

  constructor(snapshot: () => EditorSnapshot, restore: (state: EditorSnapshot) => void, recorded: () => void) {
    this.snapshot = snapshot
    this.restore = restore
    this.recorded = recorded
  }

  get canUndo(): boolean {
    return this.history.canUndo
  }

  get canRedo(): boolean {
    return this.history.canRedo
  }

  record(): void {
    this.history.record(this.snapshot)
    this.recorded()
  }

  begin(): void {
    this.history.begin(this.snapshot)
  }

  end(): void {
    this.history.end()
  }

  transaction<T>(run: () => T): T {
    return this.history.transaction(this.snapshot, run)
  }

  // One step for a gesture; cancel puts the mask back as it was when the
  // gesture began.
  openGesture(): GestureBracket {
    return gestureBracket(
      () => this.begin(),
      () => this.end(),
      () => {
        const start = this.history.abandon()
        if (start) this.restore(start)
      },
    )
  }

  undo(): void {
    const prev = this.history.undo(this.snapshot)
    if (prev) this.restore(prev)
  }

  redo(): void {
    const next = this.history.redo(this.snapshot)
    if (next) this.restore(next)
  }
}
