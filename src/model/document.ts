import type { StepData, ValueBinding } from './actions'
import type { BlockType } from './blockType'
import { freeName, newId } from './ids'
import {
  COLUMNS,
  DEFAULT_THEME,
  MASK_KIND,
  MASK_VERSION,
  type BlockData,
  type MaskData,
  type PageData,
  type RowData,
  type SlotData,
  type ThemeData,
} from './mask'
import { readRelations, type RelationData } from './relations'
import { readSources, type SourceData } from './sources'

// A mask and everything that can be done to it. A MaskDocument never changes:
// every edit returns a new one, which makes undo a matter of keeping the old.

// Where a block lies: in which container (a page or a slot), row and cell.
export interface Place {
  containerId: string
  row: number
  cell: number
}

// Where a block is put: into the row at `cell`, or, with cell null, as a new
// row before `row`.
export interface DropTarget {
  containerId: string
  row: number
  cell: number | null
}

interface Located extends Place {
  block: BlockData
  parentId: string | null
  pageId: string
}

type RowsFn = (rows: RowData[], containerId: string) => RowData[]

function mapRowsDeep(rows: RowData[], containerId: string, fn: RowsFn): RowData[] {
  const mapped = fn(rows, containerId)
  let changed = mapped !== rows
  const next = mapped.map((row) => {
    let rowChanged = false
    const cells = row.cells.map((cell) => {
      if (!cell.slots) return cell
      let slotChanged = false
      const slots = cell.slots.map((slot) => {
        const inner = mapRowsDeep(slot.rows, slot.id, fn)
        if (inner === slot.rows) return slot
        slotChanged = true
        return { ...slot, rows: inner }
      })
      if (!slotChanged) return cell
      rowChanged = true
      return { ...cell, slots }
    })
    if (!rowChanged) return row
    changed = true
    return { ...row, cells }
  })
  return changed ? next : rows
}

const sum = (cells: readonly BlockData[]): number => cells.reduce((total, cell) => total + cell.span, 0)

// Spreads the twelve columns evenly over the cells of a row.
function evenSpans(cells: BlockData[]): BlockData[] {
  const base = Math.max(1, Math.floor(COLUMNS / cells.length))
  let extra = Math.max(0, COLUMNS - base * cells.length)
  return cells.map((cell) => {
    const span = base + (extra > 0 ? 1 : 0)
    if (extra > 0) extra -= 1
    return cell.span === span ? cell : { ...cell, span }
  })
}

function fitted(cells: BlockData[]): BlockData[] {
  return sum(cells) <= COLUMNS ? cells : evenSpans(cells)
}

export function clampSpan(span: number): number {
  return Math.min(COLUMNS, Math.max(1, Math.round(span)))
}

// A new block of a type, as the palette hands it out.
export function newBlock(type: BlockType, props: Record<string, unknown> = {}): BlockData {
  const slots = type.slots()
  return {
    id: newId('b'),
    type: type.type,
    span: type.span,
    ...(type.height === 'auto' ? {} : { height: type.height }),
    props: { ...(type.defaults() as Record<string, unknown>), ...props },
    ...(slots.length > 0 ? { slots } : {}),
  }
}

export function newSlot(title: string, rows: RowData[] = []): SlotData {
  return { id: newId('s'), title, rows }
}

export function newRow(cells: BlockData[]): RowData {
  return { id: newId('r'), cells }
}

function rebind(binding: ValueBinding, ids: ReadonlyMap<string, string>): ValueBinding {
  if (binding.from !== 'input') return binding
  const moved = ids.get(binding.block)
  return moved === undefined ? binding : { ...binding, block: moved }
}

// A copy of a block with ids of its own. Steps that read an input inside the
// copy read the copied input, not the original.
function cloneBlock(block: BlockData): BlockData {
  const ids = new Map<string, string>()
  const clone = (b: BlockData): BlockData => {
    const id = newId('b')
    ids.set(b.id, id)
    return {
      ...b,
      id,
      props: structuredClone(b.props),
      ...(b.slots
        ? {
            slots: b.slots.map((slot) => ({
              ...slot,
              id: newId('s'),
              rows: slot.rows.map((row) => ({ id: newId('r'), cells: row.cells.map(clone) })),
            })),
          }
        : {}),
    }
  }
  const copy = clone(block)
  const rebound = (b: BlockData): BlockData => ({
    ...b,
    ...(b.actions
      ? {
          actions: Object.fromEntries(
            Object.entries(b.actions).map(([key, steps]) => [
              key,
              (JSON.parse(JSON.stringify(steps), (_k, v: unknown) =>
                v && typeof v === 'object' && (v as ValueBinding).from === 'input' ? rebind(v as ValueBinding, ids) : v,
              ) as StepData[]),
            ]),
          ),
        }
      : {}),
    ...(b.slots
      ? { slots: b.slots.map((s) => ({ ...s, rows: s.rows.map((r) => ({ ...r, cells: r.cells.map(rebound) })) })) }
      : {}),
  })
  return rebound(copy)
}

function readBlock(raw: unknown): BlockData | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (typeof b.id !== 'string' || typeof b.type !== 'string') return null
  const slots = Array.isArray(b.slots)
    ? b.slots
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && typeof s.id === 'string')
        .map((s) => ({ id: s.id as string, title: typeof s.title === 'string' ? s.title : '', rows: readRows(s.rows) }))
    : undefined
  const height = b.height === 'fill' || typeof b.height === 'number' ? b.height : undefined
  return {
    id: b.id,
    type: b.type,
    span: clampSpan(typeof b.span === 'number' ? b.span : COLUMNS),
    ...(height === undefined ? {} : { height }),
    props: b.props && typeof b.props === 'object' ? (b.props as Record<string, unknown>) : {},
    ...(slots && slots.length > 0 ? { slots } : {}),
    ...(b.actions && typeof b.actions === 'object' ? { actions: b.actions as Record<string, StepData[]> } : {}),
    ...(b.visible && typeof b.visible === 'object' ? { visible: b.visible as BlockData['visible'] } : {}),
  }
}

function readRows(raw: unknown): RowData[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      id: typeof r.id === 'string' ? r.id : newId('r'),
      cells: fitted((Array.isArray(r.cells) ? r.cells : []).map(readBlock).filter((b): b is BlockData => b !== null)),
    }))
    .filter((row) => row.cells.length > 0)
}

export class MaskDocument {
  readonly data: MaskData
  private index: Map<string, Located> | null = null
  private containers: Map<string, RowData[]> | null = null

  constructor(data: MaskData) {
    this.data = data
  }

  static create(name: string): MaskDocument {
    return new MaskDocument({
      kind: MASK_KIND,
      version: MASK_VERSION,
      id: newId('m'),
      name,
      frame: '',
      theme: DEFAULT_THEME,
      pages: [{ id: newId('p'), name: 'Hauptseite', kind: 'main', width: 0, rows: [] }],
      sources: [],
      relations: [],
    })
  }

  // Reads a saved mask; null when the text is none.
  static read(raw: unknown): MaskDocument | null {
    if (!raw || typeof raw !== 'object') return null
    const m = raw as Record<string, unknown>
    if (m.kind !== MASK_KIND || typeof m.version !== 'number' || m.version > MASK_VERSION) return null
    const pages: PageData[] = (Array.isArray(m.pages) ? m.pages : [])
      .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object' && typeof p.id === 'string')
      .map((p, i) => ({
        id: p.id as string,
        name: typeof p.name === 'string' && p.name !== '' ? p.name : i === 0 ? 'Hauptseite' : 'Fenster',
        kind: i === 0 ? 'main' : 'dialog',
        width: typeof p.width === 'number' ? p.width : 560,
        rows: readRows(p.rows),
      }))
    if (pages.length === 0) pages.push({ id: newId('p'), name: 'Hauptseite', kind: 'main', width: 0, rows: [] })
    const theme = m.theme && typeof m.theme === 'object' ? { ...DEFAULT_THEME, ...(m.theme as ThemeData) } : DEFAULT_THEME
    return new MaskDocument({
      kind: MASK_KIND,
      version: MASK_VERSION,
      id: typeof m.id === 'string' && m.id !== '' ? m.id : newId('m'),
      name: typeof m.name === 'string' && m.name.trim() !== '' ? m.name : 'Maske',
      frame: typeof m.frame === 'string' ? m.frame : '',
      theme,
      pages,
      sources: readSources(m.sources),
      relations: readRelations(m.relations),
    })
  }

  static parse(text: string): MaskDocument | null {
    try {
      return MaskDocument.read(JSON.parse(text))
    } catch {
      return null
    }
  }

  toJSON(): string {
    return JSON.stringify(this.data, null, 2) + '\n'
  }

  // ----- reading -----

  get name(): string {
    return this.data.name
  }

  get pages(): readonly PageData[] {
    return this.data.pages
  }

  get mainPage(): PageData {
    return this.data.pages[0]
  }

  get sources(): readonly SourceData[] {
    return this.data.sources
  }

  get relations(): readonly RelationData[] {
    return this.data.relations
  }

  page(id: string): PageData | undefined {
    return this.data.pages.find((page) => page.id === id)
  }

  source(id: string): SourceData | undefined {
    return id === '' ? undefined : this.data.sources.find((source) => source.id === id)
  }

  relation(id: string): RelationData | undefined {
    return id === '' ? undefined : this.data.relations.find((relation) => relation.id === id)
  }

  private located(): Map<string, Located> {
    if (this.index) return this.index
    const index = new Map<string, Located>()
    const containers = new Map<string, RowData[]>()
    const walk = (rows: RowData[], containerId: string, parentId: string | null, pageId: string): void => {
      containers.set(containerId, rows)
      rows.forEach((row, r) =>
        row.cells.forEach((block, c) => {
          index.set(block.id, { block, containerId, row: r, cell: c, parentId, pageId })
          block.slots?.forEach((slot) => walk(slot.rows, slot.id, block.id, pageId))
        }),
      )
    }
    for (const page of this.data.pages) walk(page.rows, page.id, null, page.id)
    this.index = index
    this.containers = containers
    return index
  }

  block(id: string | null | undefined): BlockData | undefined {
    return id ? this.located().get(id)?.block : undefined
  }

  place(id: string): Place | undefined {
    const at = this.located().get(id)
    return at && { containerId: at.containerId, row: at.row, cell: at.cell }
  }

  rows(containerId: string): RowData[] | undefined {
    this.located()
    return this.containers?.get(containerId)
  }

  parentOf(id: string): BlockData | undefined {
    const parentId = this.located().get(id)?.parentId
    return parentId ? this.block(parentId) : undefined
  }

  pageOf(blockId: string): PageData | undefined {
    const at = this.located().get(blockId)
    return at && this.page(at.pageId)
  }

  // The slot of a container block a nested block lies in.
  slotOf(blockId: string): SlotData | undefined {
    const at = this.located().get(blockId)
    const parent = at?.parentId ? this.block(at.parentId) : undefined
    return parent?.slots?.find((slot) => slot.id === at?.containerId)
  }

  // The blocks a block lies in, the nearest first.
  ancestors(id: string): BlockData[] {
    const out: BlockData[] = []
    let at = this.located().get(id)
    while (at?.parentId) {
      const parent = this.located().get(at.parentId)
      if (!parent) break
      out.push(parent.block)
      at = parent
    }
    return out
  }

  // Every block, a container before what it holds.
  blocks(pageId?: string): BlockData[] {
    const all = [...this.located().values()]
    return (pageId === undefined ? all : all.filter((at) => at.pageId === pageId)).map((at) => at.block)
  }

  // Whether a container (page or slot) lies inside a block.
  private containerInside(containerId: string, blockId: string): boolean {
    const block = this.block(blockId)
    if (!block?.slots) return false
    return block.slots.some(
      (slot) =>
        slot.id === containerId ||
        slot.rows.some((row) => row.cells.some((cell) => this.containerInside(containerId, cell.id))),
    )
  }

  // ----- changing -----

  private with(patch: Partial<MaskData>): MaskDocument {
    return new MaskDocument({ ...this.data, ...patch })
  }

  private mapRows(fn: RowsFn): MaskDocument {
    let changed = false
    const pages = this.data.pages.map((page) => {
      const rows = mapRowsDeep(page.rows, page.id, fn)
      if (rows === page.rows) return page
      changed = true
      return { ...page, rows }
    })
    return changed ? this.with({ pages }) : this
  }

  private setRows(containerId: string, change: (rows: RowData[]) => RowData[]): MaskDocument {
    return this.mapRows((rows, id) => (id === containerId ? change(rows) : rows))
  }

  rename(name: string): MaskDocument {
    return this.with({ name })
  }

  setFrame(frame: string): MaskDocument {
    return this.with({ frame })
  }

  setTheme(patch: Partial<ThemeData>): MaskDocument {
    return this.with({ theme: { ...this.data.theme, ...patch } })
  }

  updateBlock(id: string, change: (block: BlockData) => BlockData): MaskDocument {
    const at = this.located().get(id)
    if (!at) return this
    return this.setRows(at.containerId, (rows) =>
      rows.map((row, r) =>
        r === at.row ? { ...row, cells: row.cells.map((cell, c) => (c === at.cell ? change(cell) : cell)) } : row,
      ),
    )
  }

  // Changes every block of the mask; a block the change leaves as it is stays the same object.
  mapBlocks(change: (block: BlockData) => BlockData): MaskDocument {
    return this.mapRows((rows) => {
      let touched = false
      const next = rows.map((row) => {
        const cells = row.cells.map(change)
        if (cells.every((cell, i) => cell === row.cells[i])) return row
        touched = true
        return { ...row, cells }
      })
      return touched ? next : rows
    })
  }

  setProps(id: string, patch: Record<string, unknown>): MaskDocument {
    return this.updateBlock(id, (block) => ({ ...block, props: { ...block.props, ...patch } }))
  }

  setActions(id: string, event: string, steps: StepData[]): MaskDocument {
    return this.updateBlock(id, (block) => {
      const actions = { ...(block.actions ?? {}) }
      if (steps.length === 0) delete actions[event]
      else actions[event] = steps
      const { actions: _old, ...rest } = block
      return Object.keys(actions).length === 0 ? rest : { ...rest, actions }
    })
  }

  // Sets the width of a block. Where the row gets too wide, the blocks after
  // it give way first, then the ones before it.
  setSpan(id: string, wanted: number): MaskDocument {
    const at = this.located().get(id)
    if (!at) return this
    return this.setRows(at.containerId, (rows) =>
      rows.map((row, r) => {
        if (r !== at.row) return row
        const spans = row.cells.map((cell) => cell.span)
        const others = spans.length - 1
        spans[at.cell] = Math.min(COLUMNS - others, clampSpan(wanted))
        let over = spans.reduce((a, b) => a + b, 0) - COLUMNS
        const order = [
          ...spans.map((_, i) => i).filter((i) => i > at.cell),
          ...spans
            .map((_, i) => i)
            .filter((i) => i < at.cell)
            .reverse(),
        ]
        for (const i of order) {
          if (over <= 0) break
          const give = Math.min(over, spans[i] - 1)
          spans[i] -= give
          over -= give
        }
        return { ...row, cells: row.cells.map((cell, i) => (cell.span === spans[i] ? cell : { ...cell, span: spans[i] })) }
      }),
    )
  }

  insert(block: BlockData, target: DropTarget): MaskDocument {
    return this.setRows(target.containerId, (rows) => {
      if (target.cell === null || !rows[target.row]) {
        const at = Math.min(Math.max(0, target.row), rows.length)
        return [...rows.slice(0, at), newRow([{ ...block, span: clampSpan(block.span) }]), ...rows.slice(at)]
      }
      return rows.map((row, r) => {
        if (r !== target.row) return row
        const free = COLUMNS - sum(row.cells)
        const cells = [...row.cells]
        cells.splice(Math.min(target.cell ?? 0, cells.length), 0, free >= 2 ? { ...block, span: Math.min(block.span, free) } : block)
        return { ...row, cells: free >= 2 ? cells : evenSpans(cells) }
      })
    })
  }

  remove(id: string): MaskDocument {
    const at = this.located().get(id)
    if (!at) return this
    return this.setRows(at.containerId, (rows) =>
      rows
        .map((row, r) => (r === at.row ? { ...row, cells: row.cells.filter((cell) => cell.id !== id) } : row))
        .filter((row) => row.cells.length > 0),
    )
  }

  // Moves a block to another place. A block cannot move into itself.
  move(id: string, target: DropTarget): MaskDocument {
    const at = this.located().get(id)
    if (!at || this.containerInside(target.containerId, id)) return this
    const ownRow = this.rows(at.containerId)?.[at.row]
    const rowGoes = ownRow?.cells.length === 1
    let { row, cell } = target
    if (target.containerId === at.containerId) {
      if (cell !== null && row === at.row) {
        if (rowGoes) return this
        if (cell > at.cell) cell -= 1
        if (cell === at.cell) return this
      } else if (rowGoes) {
        if (cell === null && (row === at.row || row === at.row + 1)) return this
        if (row > at.row) row -= 1
      }
    }
    return this.remove(id).insert(at.block, { containerId: target.containerId, row, cell })
  }

  // A copy of the block in a row of its own below it.
  duplicate(id: string): { doc: MaskDocument; id: string } | null {
    const at = this.located().get(id)
    if (!at) return null
    const copy = cloneBlock(at.block)
    return { doc: this.insert(copy, { containerId: at.containerId, row: at.row + 1, cell: null }), id: copy.id }
  }

  // Puts a copied block in; next to `besideId` when given, else at the end of the page.
  paste(block: BlockData, pageId: string, besideId: string | null): { doc: MaskDocument; id: string } {
    const copy = cloneBlock(block)
    const beside = besideId ? this.located().get(besideId) : undefined
    const target: DropTarget = beside
      ? { containerId: beside.containerId, row: beside.row + 1, cell: null }
      : { containerId: pageId, row: this.page(pageId)?.rows.length ?? 0, cell: null }
    return { doc: this.insert(copy, target), id: copy.id }
  }

  // ----- slots (the pages of a Reiter) -----

  addSlot(blockId: string, title: string): MaskDocument {
    return this.updateBlock(blockId, (block) => ({ ...block, slots: [...(block.slots ?? []), newSlot(title)] }))
  }

  updateSlot(blockId: string, slotId: string, patch: Partial<Pick<SlotData, 'title'>>): MaskDocument {
    return this.updateBlock(blockId, (block) => ({
      ...block,
      slots: block.slots?.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
    }))
  }

  removeSlot(blockId: string, slotId: string): MaskDocument {
    return this.updateBlock(blockId, (block) => ({ ...block, slots: block.slots?.filter((slot) => slot.id !== slotId) }))
  }

  moveSlot(blockId: string, slotId: string, by: number): MaskDocument {
    return this.updateBlock(blockId, (block) => {
      const slots = [...(block.slots ?? [])]
      const from = slots.findIndex((slot) => slot.id === slotId)
      const to = from + by
      if (from < 0 || to < 0 || to >= slots.length) return block
      const [moved] = slots.splice(from, 1)
      slots.splice(to, 0, moved)
      return { ...block, slots }
    })
  }

  // ----- pages -----

  addDialog(name = 'Fenster'): { doc: MaskDocument; id: string } {
    const page: PageData = {
      id: newId('p'),
      name: freeName(
        name,
        this.data.pages.map((p) => p.name),
      ),
      kind: 'dialog',
      width: 560,
      rows: [],
    }
    return { doc: this.with({ pages: [...this.data.pages, page] }), id: page.id }
  }

  updatePage(id: string, patch: Partial<Pick<PageData, 'name' | 'width'>>): MaskDocument {
    return this.with({ pages: this.data.pages.map((page) => (page.id === id ? { ...page, ...patch } : page)) })
  }

  // The main page stays; a dialog goes with everything on it.
  removePage(id: string): MaskDocument {
    if (id === this.mainPage.id) return this
    return this.with({ pages: this.data.pages.filter((page) => page.id !== id) })
  }

  // ----- sources and relations -----

  setSources(sources: SourceData[]): MaskDocument {
    return this.with({ sources })
  }

  upsertSource(source: SourceData): MaskDocument {
    const known = this.data.sources.some((s) => s.id === source.id)
    return this.with({
      sources: known ? this.data.sources.map((s) => (s.id === source.id ? source : s)) : [...this.data.sources, source],
    })
  }

  removeSource(id: string): MaskDocument {
    return this.with({ sources: this.data.sources.filter((source) => source.id !== id) })
  }

  upsertRelation(relation: RelationData): MaskDocument {
    const known = this.data.relations.some((r) => r.id === relation.id)
    return this.with({
      relations: known
        ? this.data.relations.map((r) => (r.id === relation.id ? relation : r))
        : [...this.data.relations, relation],
    })
  }

  removeRelation(id: string): MaskDocument {
    return this.with({ relations: this.data.relations.filter((relation) => relation.id !== id) })
  }
}
