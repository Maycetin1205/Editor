import type { WrittenRow } from '../../core/block/capability'
import { clearSelection, giverIdOf, selectionFor, setMadeSelection, traitOf } from '../../runtime/selection'
import type { CaptureColumn } from './column'

const TYPING = 'typing'
const CAPTURED = 'captured'

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

  private get stands(): boolean {
    return this.given !== null && selectionFor(this.giverId) === this.given.row
  }

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
