import { ROOT_ID, type BlockNode, type MaskTree } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { gridSlotRead, type GridSlot } from '../../core/block/grid'
import { type ActionChains } from '../../core/data/steps/steps'
import { type DataSource } from '../../core/data/dataSources'
import { type SourceInReach } from '../../core/data/extraSources'
import { DataSourceStore } from './DataSourceStore'
import { firstSourceInReach, sourcesInReach } from '../../core/block/sourcesInReach'
import { gestureBracket, History, type EditorSnapshot, type GestureBracket } from './history'
import { mustGuard, packMask, packMaskFrom, readNotice, type MaskContent, type MaskFileAt } from './maskFile'
import { NO_LEFTOVER, type Leftover } from './leftover'
import type { MaskFolder } from './maskFolder'
import type { NoticeText } from '../widgets/Notice'
import { missingOn } from './libraryFile'
import { RelationStore } from './RelationStore'
import { Subject } from './Subject'
import { duplicateSubtree } from './duplicateSubtree'
import { emptyTree } from '../../core/block/treeOps'
import {
  activePagesRoot,
  freePagesName,
  childrenInFlow,
  pageOf,
  pagesOfMask,
  type PagesEntry,
} from '../../core/block/pages'
import { newBlockOnCell, cellMoveIn, slotGrownPushing, slotResize } from '../../core/block/gridArea'
import { selectionOnPage, selectionTarget } from '../../core/block/selection'
import { deepClone } from '../../core/deepClone'
import { EditorPersistence } from './editorStore/persistence'
import { blockAdded, blockRemoved, eventsUpdated, inSubtree, propertyUpdated } from './editorStore/treeEdits'
import {
  EditorView,
  type Deed,
  type OpenCalculation,
  type OpenLookup,
  type OpenStep,
  type SideTab,
} from './editorStore/viewState'
import type { Column } from './maskStorage'

export type { OpenLookup } from './editorStore/viewState'

export class EditorStore extends Subject<EditorStore> {
  readonly dataSources: DataSourceStore
  readonly relation: RelationStore

  private _tree: MaskTree = emptyTree()
  private _leftover: Leftover = NO_LEFTOVER
  private _selectedId: string | null = null

  private _changedId: string | null = null

  private _activePageId: string = ROOT_ID
  private _version = 0
  private _history = new History()

  readonly view = new Subject<EditorStore>()
  private _viewVersion = 0
  private readonly _shows = new EditorView(() => this.viewChanged())

  private readonly _kept = new EditorPersistence(() => this.snapshot())
  private _hydrated = false

  private _restoring = false

  private _reopening: Promise<void> | null = null

  constructor() {
    super()
    const { library, mask } = EditorPersistence.load()
    this.dataSources = new DataSourceStore(library.dataSources)
    this.relation = new RelationStore(library.relation)
    this._tree = mask.tree
    this._leftover = mask.leftover
    this._activePageId = mask.activePageId
    this._selectedId = this.selectionOnActivePage(mask.selectedId)
    this._kept.started(mask, library)
    this._hydrated = true

    for (const store of [this.dataSources, this.relation]) {
      store.observeBeforeChange(() => {
        if (!this._restoring) this.pushHistory()
      })
      store.subscribe(() => {
        if (!this._restoring) this.notify(this)
      })
    }
  }

  get tree(): Readonly<MaskTree> {
    return this._tree
  }

  get leftover(): Leftover {
    return this._leftover
  }

  get rootId(): string {
    return activePagesRoot(this._tree, this._activePageId)
  }

  get activePageId(): string {
    return this.rootId
  }

  get pages(): PagesEntry[] {
    return pagesOfMask(this._tree)
  }

  private selectionOnActivePage(id: string | null): string | null {
    return selectionOnPage(this._tree, id, this.rootId)
  }

  setActivePage(id: string): void {
    const next = activePagesRoot(this._tree, id)
    if (next === this._activePageId) return
    this._activePageId = next
    this._selectedId = null
    this.notify(this)
  }

  getNode(id: string): BlockNode | undefined {
    return this._tree[id]
  }

  childNodesOf(parentId: string): BlockNode[] {
    return childrenInFlow(this._tree, parentId)
  }

  get blockCount(): number {
    return Object.keys(this._tree).length - 1
  }

  get selectedId(): string | null {
    return this._selectedId
  }
  get selectedNode(): BlockNode | null {
    if (this._selectedId === null) return null
    const node = this._tree[this._selectedId]
    return node && node.id !== ROOT_ID ? node : null
  }

  isInSubtree(ancestorId: string, id: string): boolean {
    return inSubtree(this._tree, ancestorId, id)
  }

  selectBlock(id: string | null): void {
    if (this._selectedId === id) return
    this._selectedId = id
    this.pickFollowFor(null)
    this.notify(this)
  }

  chooseHit(hitId: string): void {
    const target = selectionTarget(this._tree, hitId)
    if (target !== null) this.selectBlock(target)
  }

  dataSourceFor(id: string): DataSource | undefined {
    return firstSourceInReach(this._tree, id, this.dataSources.list)
  }

  sourcesFor(id: string): SourceInReach[] {
    return sourcesInReach(this._tree, id, this.dataSources.list)
  }

  get version(): number {
    return this._version
  }
  get canUndo(): boolean {
    return this._history.canUndo
  }
  get canRedo(): boolean {
    return this._history.canRedo
  }

  override notify(data: EditorStore): void {
    this._version++
    try {
      super.notify(data)
    } finally {
      if (this._hydrated) this._kept.plan()
    }
  }

  private snapshot(): EditorSnapshot {
    return {
      tree: deepClone(this._tree),
      selectedId: this._selectedId,
      activePageId: this.activePageId,
      dataSources: this.dataSources.list,
      relation: this.relation.list,
      file: this.maskOnDisk.place,
      leftover: this._leftover,
    }
  }

  private setLibraries(state: Pick<EditorSnapshot, 'dataSources' | 'relation'>): void {
    this._restoring = true
    try {
      if (this.dataSources.list !== state.dataSources) this.dataSources.replaceAll(state.dataSources)
      if (this.relation.list !== state.relation) this.relation.replaceAll(state.relation)
    } finally {
      this._restoring = false
    }
  }

  private pushHistory(): void {
    this._history.record(() => this.snapshot())
    this.maskOnDisk.stir()
  }

  beginTransaction(): void {
    this._history.begin(() => this.snapshot())
  }

  endTransaction(): void {
    this._history.end()
  }

  transaction<T>(run: () => T): T {
    return this._history.transaction(() => this.snapshot(), run)
  }

  openGesture(): GestureBracket {
    return gestureBracket(
      () => this.beginTransaction(),
      () => this.endTransaction(),
    )
  }

  undo(): void {
    const prev = this._history.undo(() => this.snapshot())
    if (!prev) return
    this.restoreFrom(prev)
  }

  redo(): void {
    const next = this._history.redo(() => this.snapshot())
    if (!next) return
    this.restoreFrom(next)
  }

  private restoreFrom(state: EditorSnapshot): void {
    this.setLibraries(state)
    if (state.file) this.maskOnDisk.restore(state.file)
    this._tree = state.tree
    this._leftover = state.leftover ?? NO_LEFTOVER
    this._activePageId = state.activePageId ?? ROOT_ID
    this._selectedId = this.selectionOnActivePage(state.selectedId)
    this.notify(this)
  }

  private apply(tree: MaskTree, selectedId: string | null = this._selectedId): void {
    this.pushHistory()
    this._tree = tree
    this._selectedId = selectedId
    this.notify(this)
  }

  addBlock(type: string, parentId?: string, index?: number, rows: number | null = null): BlockNode | null {
    const next = blockAdded(this._tree, type, parentId ?? this.rootId, index, rows)
    if (!next) return null
    this.apply(next.tree, next.node.id)
    return next.node
  }

  addPage(type: string): BlockNode | null {
    const def = blockType(type)
    if (def?.page !== true) return null
    const name = freePagesName(
      this.pages.map((p) => p.name),
      def.name,
    )
    return this.transaction(() => {
      const node = this.addBlock(type, ROOT_ID)
      if (node) {
        this._activePageId = node.id
        this.updateProperty(node.id, 'name', name)
      }
      return node
    })
  }

  removeBlock(id: string): void {
    const next = blockRemoved(this._tree, id)
    if (!next) return
    const selected = this._selectedId !== null && next.removed.has(this._selectedId) ? null : this._selectedId
    this.apply(next.tree, selected)
  }

  updateProperty(id: string, name: string, raw: unknown): boolean {
    const outcome = propertyUpdated(this._tree, this.pages, id, name, raw)
    if (outcome.kind === 'changed') {
      this._changedId = id
      this.apply(outcome.tree)
    }
    return outcome.kind !== 'refused'
  }

  updateBlockEvents(id: string, events: ActionChains): void {
    const next = eventsUpdated(this._tree, id, events)
    if (next) this.apply(next)
  }

  duplicateBlock(id: string, rows: number | null = null): BlockNode | null {
    const res = duplicateSubtree(this._tree, id, rows)
    if (!res) return null
    this.pushHistory()
    this._tree = res.tree

    this._activePageId = pageOf(this._tree, res.copyId)
    this._selectedId = res.copyId
    this.notify(this)
    return res.tree[res.copyId]
  }

  moveNodeToCell(id: string, parentId: string, x: number, y: number): void {
    const next = cellMoveIn(this._tree, id, parentId, x, y)
    if (next) this.apply(next, id)
  }

  resizeNodeToSlot(id: string, slot: GridSlot): void {
    const next = slotResize(this._tree, id, slot)
    if (!next) return
    this._changedId = id
    this.apply(next)
  }

  fitNodeHeight(id: string, rows: number, capacity: (areaId: string) => number | null): void {
    const node = this._tree[id]
    if (!node) return
    const next =
      id === this._changedId
        ? slotGrownPushing(this._tree, id, rows, capacity)
        : slotResize(this._tree, id, { ...gridSlotRead(node.values), h: rows })
    if (!next) return
    this._tree = next
    this.notify(this)
  }

  addBlockAtCell(type: string, parentId: string, x: number, y: number): BlockNode | null {
    const res = newBlockOnCell(this._tree, type, parentId, x, y)
    if (!res) return null
    this.apply(res.tree, res.node.id)
    return res.node
  }

  newMask(): void {
    if (!this.maskOnDisk.attached && JSON.stringify(this._tree) === JSON.stringify(emptyTree())) return
    this.pushHistory()
    this.maskOnDisk.forget()
    this._kept.restarted(null, 0)
    this._tree = emptyTree()
    this._leftover = NO_LEFTOVER
    this._selectedId = null
    this._activePageId = ROOT_ID
    this.notify(this)
  }

  replaceMask(content: MaskContent, from: MaskFileAt | null = null, locked = false): void {
    this.pushHistory()
    this.maskOnDisk.forget()
    this.setLibraries({
      dataSources: missingOn(this.dataSources.list, content.dataSources),
      relation: missingOn(this.relation.list, content.relation),
    })
    this._tree = content.tree
    this._leftover = content.leftover
    this._selectedId = null
    this._activePageId = ROOT_ID
    if (from === null) {
      this._kept.restarted(null, 0)
    } else {
      const text = packMask(this._tree, this.dataSources.list, this.relation.list, this._leftover)
      this.maskOnDisk.remember(from.file, from.path, text)
      this.maskOnDisk.lock(locked)
      this._kept.restarted(text, from.modified)
    }
    this.notify(this)
  }

  get maskLocked(): boolean {
    return this.maskOnDisk.locked
  }

  unlockMask(): void {
    if (!this.maskOnDisk.locked) return
    this.maskOnDisk.lock(false)
    this.notify(this)
  }

  keepIn(at: Omit<MaskFileAt, 'modified'>, holds: string | null, created = false): void {
    this.maskOnDisk.remember(at.file, at.path, holds, created)
    this._kept.plan()
  }

  get viewVersion(): number {
    return this._viewVersion
  }

  private viewChanged(): void {
    this._viewVersion++
    this.view.notify(this)
  }

  get stepWindow(): OpenStep | null {
    return this._shows.stepWindow
  }

  openStep(open: OpenStep | null): void {
    this._shows.openStep(open)
  }

  get calculationWindow(): OpenCalculation | null {
    return this._shows.calculationWindow
  }

  openCalculation(open: OpenCalculation | null): void {
    this._shows.openCalculation(open)
  }

  get splitWindow(): string | null {
    return this._shows.splitWindow
  }

  openSplit(blockId: string | null): void {
    this._shows.openSplit(blockId)
  }

  get lookupWindow(): OpenLookup | null {
    return this._shows.lookupWindow
  }

  setLookupWindow(open: OpenLookup | null): void {
    this._shows.setLookupWindow(open)
  }

  get followPickFor(): string | null {
    return this._shows.followPickFor
  }

  pickFollowFor(blockId: string | null): void {
    this._shows.pickFollowFor(blockId)
  }

  get dataWindow(): boolean {
    return this._shows.dataWindow
  }

  get startsNewSource(): boolean {
    return this._shows.startsNewSource
  }

  showData(open: boolean): void {
    this._shows.showData(open)
  }

  startNewSource(): void {
    this._shows.startNewSource()
  }

  get outlines(): boolean {
    return this._shows.outlines
  }

  showOutlines(on: boolean): void {
    this._shows.showOutlines(on)
  }

  get sideTab(): SideTab {
    return this._shows.sideTab
  }

  showSide(tab: SideTab): void {
    this._shows.showSide(tab)
  }

  get saveWaits(): boolean {
    return this._shows.saveWaits
  }

  waitToSave(on: boolean): void {
    this._shows.waitToSave(on)
  }

  isShut(column: Column): boolean {
    return this._shows.isShut(column)
  }

  shutColumn(column: Column, shut: boolean): void {
    this._shows.shutColumn(column, shut)
  }

  get notice(): NoticeText | null {
    return this._shows.notice
  }

  showNotice(notice: NoticeText | null): void {
    this._shows.showNotice(notice)
  }

  get done(): Deed | null {
    return this._shows.done
  }

  markDone(deed: Deed): void {
    this._shows.markDone(deed)
  }

  get maskOnDisk() {
    return this._kept.maskOnDisk
  }

  get libraryOnDisk() {
    return this._kept.libraryOnDisk
  }

  get maskFolder(): MaskFolder {
    return this._kept.folder
  }

  get keptAt(): number {
    return this._kept.keptAt
  }

  saveNow(): void {
    this._kept.now()
  }

  reopenFolder(): Promise<void> {
    this._reopening ??= (async () => {
      await this.maskFolder.restore()
      await this.rejoin()
    })()
    return this._reopening
  }

  async folderReady(): Promise<boolean> {
    if (!(await this.maskFolder.ready())) return false
    await this.rejoin()
    return true
  }

  async pickMaskFolder(): Promise<void> {
    const picked = await this.maskFolder.pick()
    if (picked === 'switched' && !this.maskOnDisk.attached) this.maskOnDisk.forget()
    if (picked !== 'closed') await this.rejoin()
  }

  private async rejoin(): Promise<void> {
    const disk = this.maskOnDisk
    const path = disk.path
    if (path === null || disk.attached || this.maskFolder.state !== 'open') return
    const file = await this.maskFolder.fileAt(path)
    let data: { text: string; modified: number } | null = null
    if (file !== null) {
      try {
        const read = await file.getFile()
        data = { text: await read.text(), modified: read.lastModified }
      } catch {
        data = null
      }
    }
    if (disk.path !== path || disk.attached) return
    if (file === null || data === null) {
      disk.forget()
      return
    }
    if (data.text === packMask(this._tree, this.dataSources.list, this.relation.list, this._leftover)) {
      disk.remember(file, path, data.text)
      return
    }
    const read = data.modified > this._kept.keptAt ? packMaskFrom(data.text) : null
    if (read?.ok) {
      const locked = mustGuard(read.note)
      this.replaceMask(read.content, { file, path, modified: data.modified }, locked)
      const notice = readNotice(this, path, read.note, locked)
      if (notice !== null) this.showNotice(notice)
      return
    }
    this.keepIn({ file, path }, null)
  }
}
