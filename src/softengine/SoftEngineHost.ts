import type { CallResult } from '@/model/actions'
import type { HostNotice, MaskHost, QueryKeys } from '@/model/host'
import type { RelationVerb } from '@/model/relations'
import { sourceKind } from '@/model/sourceKinds'
import type { SourceData } from '@/model/sources'
import { fieldRead, fieldWrite } from './fields'
import { pushedRows, rowsFromRelationAnswer } from './payload'
import { RequestQueue } from './RequestQueue'
import { EditingAnnouncer, SoftEngineBridge } from './SoftEngineBridge'

const DEBUG_KEY = 'ff-debug'
// SoftEngine normally announces its data right after the mask signed on. A
// mask that is pushed nothing asks its questions after this wait.
const READY_FALLBACK_MS = 1_500

// Switched on with #ff-debug in the address or localStorage "ff-debug" = "1":
// every message to and from SoftEngine goes to the console (F12).
function debugWanted(): boolean {
  try {
    return location.hash.includes(DEBUG_KEY) || localStorage.getItem(DEBUG_KEY) === '1'
  } catch {
    return false
  }
}

// SoftEngine as the host of a mask.
export class SoftEngineHost implements MaskHost {
  readonly live = true
  private readonly bridge = new SoftEngineBridge()
  private readonly queue = new RequestQueue(this.bridge)
  private readonly announcer = new EditingAnnouncer(this.bridge)
  private readonly noticeListeners = new Set<(notice: HostNotice) => void>()
  private ready: Promise<void> | null = null

  start(onData: () => void): void {
    this.bridge.onData(onData)
    this.queue.onLost((lost) => this.notice({ kind: lost ? 'lost' : 'back' }))
    this.queue.onRefusal((text) => this.notice({ kind: 'refused', text }))
    if (debugWanted()) this.bridge.setLogging(true)
    this.bridge.start()
    this.announcer.install()
  }

  whenReady(): Promise<void> {
    this.ready ??= Promise.race([
      this.bridge.whenData,
      new Promise<void>((resolve) => setTimeout(resolve, READY_FALLBACK_MS)),
    ])
    return this.ready
  }

  private notice(notice: HostNotice): void {
    this.noticeListeners.forEach((listener) => listener(notice))
  }

  onNotice(listener: (notice: HostNotice) => void): void {
    this.noticeListeners.add(listener)
  }

  pushed(source: SourceData): unknown[] | undefined {
    const path = sourceKind(source.kind).pushPath
    const data = this.bridge.data()
    if (!path || !data) return undefined
    return pushedRows(data, path, source.name, source.table)
  }

  readField(row: unknown, code: string): string {
    return fieldRead(row, code)
  }

  writeField(row: unknown, code: string, value: string): void {
    fieldWrite(row, code, value)
  }

  query(source: SourceData, fields: string, keys: QueryKeys): Promise<unknown[] | null> {
    const body: Record<string, string> = { ID: source.table, ALIAS: source.name, FELDER: fields }
    if (keys.documentKind !== '') body.BELART = keys.documentKind
    if (keys.address !== '') {
      body.VON_ADRNR = keys.address
      body.BIS_ADRNR = keys.address
    }
    return this.queue.query(body, fields)
  }

  async relationRows(nr: string, params: string[], fields: string[]): Promise<Record<string, string>[] | null> {
    const answer = await this.queue.get(nr, params)
    return answer.ok ? rowsFromRelationAnswer(answer.value, answer.raw, fields) : null
  }

  call(verb: RelationVerb, nr: string, params: string[]): Promise<CallResult> {
    return verb === 'GET_RELATION' ? this.queue.get(nr, params) : this.queue.put(verb, nr, params)
  }

  startTool(number: string, params: string[]): boolean {
    return this.bridge.startTool(number, params)
  }

  requestFreshData(): void {
    this.bridge.requestFreshData()
  }

  variable(name: string): string {
    return this.bridge.variable(name)
  }
}
