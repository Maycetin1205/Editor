import { LEADS_TO_TYPING_ATTR, TAKES_KEYS_ATTR } from '../core/block/typingMarks'
import { hostCall, seWindow, typable } from './bridge'

const ENTER = ['KARTEIKARTEN_DEAKTIVIEREN', 'BEARBEITUNG_AKTIV']
const LEAVE = ['BEARBEITUNG_BEENDET', 'KARTEIKARTEN_AKTIVIEREN ']

const editing = { installed: false, on: false, byHover: false }

function tell(events: readonly string[]): boolean {
  const g = seWindow()
  if (typeof g.basisHTML_SND_MSG !== 'function') return false
  return hostCall(() => {
    for (const EVENT of events) g.basisHTML_SND_MSG('MASKENEVENT', { EVENT })
  })
}

function origin(evt: Event): unknown {
  return evt.composedPath()[0] ?? evt.target
}

function towardsTyping(spot: unknown): boolean {
  return typable(spot)
    || (spot instanceof Element && spot.closest(`[${LEADS_TO_TYPING_ATTR}], [${TAKES_KEYS_ATTR}]`) !== null)
}

export function announceEditing(): void {
  if (editing.installed) return
  editing.installed = true
  const enter = (): void => { if (!editing.on && tell(ENTER)) editing.on = true }
  const leave = (): void => { if (editing.on && tell(LEAVE)) editing.on = false }
  window.addEventListener('pointerdown', (evt) => {
    editing.byHover = false
    if (towardsTyping(origin(evt))) enter(); else leave()
  }, true)
  window.addEventListener('focusin', (evt) => { if (typable(origin(evt))) enter() }, true)
  window.addEventListener('pointerover', (evt) => {
    if (editing.on || !towardsTyping(origin(evt))) return
    enter()
    editing.byHover = editing.on
  }, true)
  document.documentElement.addEventListener('pointerleave', () => {
    if (!editing.byHover) return
    editing.byHover = false
    leave()
  })
}
