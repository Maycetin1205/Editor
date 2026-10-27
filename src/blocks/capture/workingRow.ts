import type { WrittenRow } from '../../core/block/capability'
import { clearSelection, giverIdOf, selectionFor, setMadeSelection, traitOf } from '../../runtime/selection'
import type { CaptureColumn } from './column'

const TYPING = 'typing'
const CAPTURED = 'captured'

// The row of the capture that blocks following its selection see. While the
// operator types, it is the typing row; once captured, the captured row it
// became; once booked, that row as SoftEngine wrote it. A click on a captured
// row chooses it, a second click lets it go.
export class WorkingRow {
  private readonly block: HTMLElement

  private given: { key: string; trait: string; row: unknown } | null = null

  private capturedKey = ''

  constructor(block: HTMLElement) {
    this.block = block
  }

  private get giverId(): string {
    return giverIdOf(this.block)
  }

  // Nobody chose another row of this capture since the row was given.
  private get stands(): boolean {
    return this.given !== null && selectionFor(this.giverId) === this.given.row
  }

  // The trait tells the same row from a new one. The same row typed again
  // does not take the selection back from a row chosen meanwhile; a click on
  // it does.
  private give(key: string, columns: readonly CaptureColumn[], values: readonly string[], byClick: boolean): void {
    const row: Record<string, string> = {}
    columns.forEach((column, i) => {
      const value = values[i] ?? ''
      if (column.field !== '' && value !== '') row[column.field] = value
    })
    const trait = `${key}:${JSON.stringify(row)}`
    if (this.given?.trait === trait && (this.stands || !byClick)) return
    this.given = { key, trait, row }
    setMadeSelection(this.giverId, row, trait)
  }

  private drop(): void {
    if (this.stands) clearSelection(this.giverId)
    this.given = null
  }

  // After each update. A row given by typing goes when the typing row is
  // empty again, unless it was just captured: then it stays, under the key of
  // the captured row, until booked() swaps in the written row.
  followTyping(
    columns: readonly CaptureColumn[],
    touched: boolean,
    values: () => readonly string[],
    capturedKey: string | null,
  ): void {
    if (touched) {
      this.give(TYPING, columns, values(), false)
      return
    }
    if (this.given?.key !== TYPING) return
    if (capturedKey === null) {
      this.drop()
      return
    }
    this.given = { ...this.given, key: CAPTURED }
    this.capturedKey = capturedKey
  }

  booked(written: readonly WrittenRow[]): void {
    if (this.given?.key !== CAPTURED || !this.stands) return
    const row = written.find((w) => w.key === this.capturedKey)?.row
    if (row === undefined) return
    const trait = `${CAPTURED}:${traitOf(row)}`
    this.given = { key: CAPTURED, trait, row }
    setMadeSelection(this.giverId, row, trait)
  }

  toggleCaptured(key: string, columns: readonly CaptureColumn[], values: readonly string[]): void {
    if (this.chosen(key)) {
      this.drop()
      return
    }
    this.give(key, columns, values, true)
  }

  chosen(key: string): boolean {
    return this.given?.key === key && this.stands
  }
}
