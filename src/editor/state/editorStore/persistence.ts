import { ROOT_ID } from '../../../core/block/tree'
import { FileOnDisk } from '../fileOnDisk'
import type { EditorSnapshot } from '../history'
import { missingOn } from '../libraryFile'
import { NO_LEFTOVER } from '../leftover'
import { MaskFolder } from '../maskFolder'
import { packMask } from '../maskFile'
import {
  emptyMask,
  loadFromStorage,
  loadLibraryFromStorage,
  persistLibrary,
  persistMask,
  SAVE_DEBOUNCE_MS,
  type StoredLibrary,
  type StoredMask,
} from '../maskStorage'
import { SavePlanner } from '../savePlanner'

export class EditorPersistence {
  private readonly state: () => EditorSnapshot

  private readonly planner: SavePlanner

  readonly maskOnDisk = new FileOnDisk()

  readonly libraryOnDisk = new FileOnDisk()

  readonly folder = new MaskFolder()

  private keptText: string | null = null

  private _keptAt = 0

  constructor(state: () => EditorSnapshot) {
    this.state = state
    this.planner = new SavePlanner(() => this.write(), SAVE_DEBOUNCE_MS)
    this.maskOnDisk.backUpWith((path, text) => this.folder.saveBackup(path, text))
  }

  static load(): { library: StoredLibrary; mask: StoredMask } {
    const stored = loadLibraryFromStorage()
    const mask = loadFromStorage(stored.dataSources) ?? emptyMask()
    const library =
      mask.dataSources && mask.dataSources.length > 0
        ? { ...stored, dataSources: missingOn(stored.dataSources, mask.dataSources) }
        : stored
    return { library, mask }
  }

  started(mask: StoredMask, library: StoredLibrary): void {
    this.maskOnDisk.expect(mask.file)
    this.maskOnDisk.lock(mask.locked)
    this.keptText = packMask(mask.tree, library.dataSources, library.relation, mask.leftover)
    this._keptAt = mask.savedAt
  }

  restarted(text: string | null, at: number): void {
    this.keptText = text
    this._keptAt = at
  }

  get keptAt(): number {
    return this._keptAt
  }

  plan(): void {
    this.planner.plan()
  }

  now(): void {
    this.planner.now()
  }

  private write(): void {
    const state = this.state()
    const leftover = state.leftover ?? NO_LEFTOVER
    const text = packMask(state.tree, state.dataSources, state.relation, leftover)
    if (text !== this.keptText) {
      this.keptText = text
      this._keptAt = Date.now()
    }
    persistMask(
      {
        tree: state.tree,
        selectedId: state.selectedId,
        activePageId: state.activePageId ?? ROOT_ID,
        file: this.maskOnDisk.path,
        savedAt: this._keptAt,
        leftover,
        locked: this.maskOnDisk.locked,
      },
      state.dataSources,
    )
    void this.maskOnDisk.writeAgain(text)
    void this.libraryOnDisk.writeAgain(
      persistLibrary({
        dataSources: state.dataSources,
        relation: state.relation,
      }),
    )
  }
}
