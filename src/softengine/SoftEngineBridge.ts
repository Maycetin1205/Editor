import { dataFromContent, isObject, messageContent, type JsonObject } from './payload'

// The one place that touches the globals of SoftEngine's HTML interface
// (basis.html.interface.js): signing the mask on, taking what SoftEngine
// sends, sending messages. Every call is guarded: where SoftEngine lacks a
// function, the mask goes on without it.

/* eslint-disable @typescript-eslint/no-explicit-any -- SEDATA, selib and the
   basisHTML_ functions are untyped globals of the SoftEngine host. */
function seWindow(): any {
  return globalThis as any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const REGISTER_TRIES = 400
const REGISTER_EVERY_MS = 25
const LOOK_TRIES = 100
const LOOK_EVERY_MS = 300
const SIGNATURE_LIMIT = 2_000_000

// Elements that take typing although they are no input, e.g. a list that is
// moved through with the arrow keys.
export const TAKES_KEYS_ATTR = 'data-m-takes-keys'

function deepestActive(): Element | null {
  let el: Element | null = document.activeElement
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement
  return el
}

export function typable(el: unknown): boolean {
  if (!(el instanceof HTMLElement)) return false
  return (
    el.isContentEditable ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  )
}

function signatureOf(data: JsonObject): string {
  try {
    const raw = JSON.stringify(data)
    return raw.length > SIGNATURE_LIMIT ? '' : raw
  } catch {
    return ''
  }
}

export class SoftEngineBridge {
  private readonly dataListeners = new Set<() => void>()
  private readonly answerListeners = new Set<(raw: unknown) => void>()
  private readonly arrivalListeners = new Set<() => void>()
  private started = false
  private lastSignature = ''
  private logging = false
  private dataSeen = false
  private readonly firstData: Promise<void>
  private resolveFirstData: () => void = () => {}

  constructor() {
    this.firstData = new Promise((resolve) => {
      this.resolveFirstData = resolve
    })
  }

  // Resolves when SoftEngine has delivered data for the first time.
  get whenData(): Promise<void> {
    return this.firstData
  }

  get connected(): boolean {
    return typeof seWindow().basisHTML_SND_MSG === 'function'
  }

  // The block "Daten" SoftEngine filled, or undefined before the first delivery.
  data(): JsonObject | undefined {
    const g = seWindow()
    return isObject(g.SEDATA) && isObject(g.SEDATA.Daten) ? g.SEDATA.Daten : undefined
  }

  // Called when pushed data arrived or changed.
  onData(listener: () => void): () => void {
    this.dataListeners.add(listener)
    return () => this.dataListeners.delete(listener)
  }

  // Called with everything SoftEngine sends that is no pushed data: answers.
  onAnswer(listener: (raw: unknown) => void): () => void {
    this.answerListeners.add(listener)
    return () => this.answerListeners.delete(listener)
  }

  // Called whenever SoftEngine delivers data, new or not: a sign of life.
  onArrival(listener: () => void): () => void {
    this.arrivalListeners.add(listener)
    return () => this.arrivalListeners.delete(listener)
  }

  setLogging(on: boolean): void {
    this.logging = on
    const g = seWindow()
    if (typeof g.basisHTML_SetConsoleLog === 'function') this.guarded(() => g.basisHTML_SetConsoleLog(on, on))
  }

  private log(...args: unknown[]): void {
    if (this.logging) console.log('[Maske]', ...args)
  }

  private guarded(call: () => void): boolean {
    try {
      call()
      return true
    } catch (error) {
      console.warn('[Maske] Aufruf an SoftEngine gescheitert', error)
      return false
    }
  }

  // Sends a message to SoftEngine. False when there is no connection.
  send(verb: string, body: Record<string, unknown>): boolean {
    const g = seWindow()
    this.log('an SoftEngine:', verb, body)
    if (typeof g.basisHTML_SND_MSG !== 'function') return false
    return this.guarded(() => g.basisHTML_SND_MSG(verb, body))
  }

  // Starts a tool of SoftEngine; where the message function is missing, by link.
  startTool(number: string, params: readonly string[]): boolean {
    const message: { NR: string; PARAMS?: string[] } = { NR: number }
    if (params.length > 0) message.PARAMS = [...params]
    if (this.send('START_TOOL', message)) return true
    const g = seWindow()
    let link = '0,START_TOOL,' + number
    if (params.length > 0) link += ',' + params.map((p) => encodeURIComponent(p)).join(',')
    return typeof g.sendBWLinkIntern === 'function' && this.guarded(() => g.sendBWLinkIntern(link))
  }

  // Asks SoftEngine to deliver its data again.
  requestFreshData(): void {
    const g = seWindow()
    const asked = typeof g.ReloadInputJSON === 'function' && this.guarded(() => g.ReloadInputJSON())
    this.log(asked ? 'frische Daten angefordert' : 'ReloadInputJSON fehlt')
    if (!asked) this.refreshDataBase()
  }

  variable(name: string): string {
    const arrays = this.data()?.VARArrays
    const value = isObject(arrays) ? arrays[name] : undefined
    return value == null ? '' : String(value)
  }

  // Keys "Message1", "Message2", ... under which some versions of SoftEngine
  // leave the answer to a question instead of calling back.
  messageKeys(): string[] {
    const se = seWindow().SEDATA
    return isObject(se) ? Object.keys(se).filter((key) => /^Message\d+$/.test(key)) : []
  }

  message(key: string): unknown {
    const se = seWindow().SEDATA
    return isObject(se) ? se[key] : undefined
  }

  private refreshDataBase(): void {
    const g = seWindow()
    if (typeof g.ResetDataBasis === 'function') this.guarded(() => g.ResetDataBasis())
    if (typeof g.InitialisiereDatenBasis === 'function') this.guarded(() => g.InitialisiereDatenBasis())
  }

  private arrived(): void {
    this.arrivalListeners.forEach((listener) => this.guarded(listener))
  }

  private spread(): void {
    if (!this.dataSeen) {
      this.dataSeen = true
      this.resolveFirstData()
    }
    this.dataListeners.forEach((listener) => this.guarded(listener))
  }

  // SoftEngine says the data are there (Erstellen, initData, ReloadData).
  private dataAnnounced(rebuild: boolean): void {
    if (rebuild) this.refreshDataBase()
    this.arrived()
    const data = this.data()
    if (!data) return
    this.lastSignature = signatureOf(data)
    this.spread()
  }

  // Everything SoftEngine hands to the callback: pushed data or an answer.
  private consume(raw: unknown): void {
    this.log('von SoftEngine:', raw)
    const data = dataFromContent(raw)
    if (!data) {
      this.answerListeners.forEach((listener) => this.guarded(() => listener(raw)))
      return
    }
    const g = seWindow()
    if (!isObject(g.SEDATA)) g.SEDATA = {}
    g.SEDATA.Daten = data
    this.refreshDataBase()
    this.arrived()
    const signature = signatureOf(data)
    if (signature !== '' && signature === this.lastSignature) return
    this.lastSignature = signature
    this.spread()
  }

  private register(tries = 0): void {
    const g = seWindow()
    if (typeof g.basisHTML_REGISTER === 'function') {
      try {
        g.basisHTML_REGISTER((data: unknown) => this.consume(data), document.title, '1.0')
        this.log('bei SoftEngine angemeldet')
        return
      } catch {
        if (tries >= REGISTER_TRIES) return
      }
    }
    if (tries < REGISTER_TRIES) setTimeout(() => this.register(tries + 1), REGISTER_EVERY_MS)
  }

  start(): void {
    if (this.started) return
    this.started = true
    const g = seWindow()
    this.guarded(() => g.selib?.Json?.InitializeERPConnection?.())
    if (typeof g.InitialisiereSchnittstelle === 'function') this.guarded(() => g.InitialisiereSchnittstelle())

    g.enableCustomFind = false
    // SoftEngine calls these names once SEDATA is filled.
    g.Erstellen = () => this.dataAnnounced(true)
    g.initData = g.Erstellen
    g.ReloadData = () => this.dataAnnounced(false)
    // SoftEngine asks whether the focus is in a field of the mask.
    g.basisHTML_DoSetFocusToHTML = (): boolean => typable(deepestActive())
    this.register()

    // Without the register function the data come as a window message.
    window.addEventListener(
      'message',
      (event) => {
        if (typeof seWindow().basisHTML_REGISTER === 'function') return
        const payload = messageContent(event.data)
        if (payload !== undefined) this.consume(payload)
      },
      true,
    )

    // SEDATA may be there without anybody saying so: look for it.
    let looks = 0
    const look = setInterval(() => {
      looks += 1
      if (this.dataSeen || looks > LOOK_TRIES) {
        clearInterval(look)
        return
      }
      if (this.data()) {
        clearInterval(look)
        this.dataAnnounced(true)
      }
    }, LOOK_EVERY_MS)
  }
}

// While the user types in the mask, SoftEngine must not take the keys for its
// own index cards: the mask says when typing begins and ends.
export class EditingAnnouncer {
  private readonly bridge: SoftEngineBridge
  private installed = false
  private on = false
  private byHover = false

  constructor(bridge: SoftEngineBridge) {
    this.bridge = bridge
  }

  private tell(events: readonly string[]): boolean {
    if (!this.bridge.connected) return false
    return events.every((EVENT) => this.bridge.send('MASKENEVENT', { EVENT }))
  }

  private enter(): void {
    if (!this.on && this.tell(['KARTEIKARTEN_DEAKTIVIEREN', 'BEARBEITUNG_AKTIV'])) this.on = true
  }

  private leave(): void {
    // The blank after KARTEIKARTEN_AKTIVIEREN is the form that was tested against SoftEngine.
    if (this.on && this.tell(['BEARBEITUNG_BEENDET', 'KARTEIKARTEN_AKTIVIEREN '])) this.on = false
  }

  install(): void {
    if (this.installed) return
    this.installed = true
    const origin = (event: Event): unknown => event.composedPath()[0] ?? event.target
    const towardsTyping = (spot: unknown): boolean =>
      typable(spot) || (spot instanceof Element && spot.closest(`[${TAKES_KEYS_ATTR}]`) !== null)

    window.addEventListener(
      'pointerdown',
      (event) => {
        this.byHover = false
        if (towardsTyping(origin(event))) this.enter()
        else this.leave()
      },
      true,
    )
    window.addEventListener(
      'focusin',
      (event) => {
        if (typable(origin(event))) this.enter()
      },
      true,
    )
    window.addEventListener(
      'pointerover',
      (event) => {
        if (this.on || !towardsTyping(origin(event))) return
        this.enter()
        this.byHover = this.on
      },
      true,
    )
    document.documentElement.addEventListener('pointerleave', () => {
      if (!this.byHover) return
      this.byHover = false
      this.leave()
    })
  }
}
