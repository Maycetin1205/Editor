import { bindingAttr } from '../../core/block/capability'
import { giverIdOf, clearSelection, setSelection } from '../../runtime/selection'
import { makeDataLink, recordOf } from '../../runtime/source'
import { maskState } from '../../runtime/maskState'
import { readBoundSpot } from '../../runtime/boundSpot'
import { runEvent } from '../../runtime/events'
import type { FormField } from './FormField'

interface Connected {
  row: unknown
  code: string
  pindex: string
}

// The change of a field goes out one after the other: a change typed while
// the last one is still on its way waits and goes out with the newest value.
// kept is what SoftEngine last had, for when it refuses the newer value.
interface Sending {
  running: boolean
  again: boolean
  kept: string
}

const data = new WeakMap<FormField, Connected>()
const wired = new WeakSet<FormField>()
const sending = new WeakMap<FormField, Sending>()

function sendingOf(el: FormField): Sending {
  const known = sending.get(el)
  if (known) return known
  const made: Sending = { running: false, again: false, kept: el.value }
  sending.set(el, made)
  return made
}

function fill(el: FormField): void {
  el.checkOwnValue()
  if (el.fillsSelf()) {
    data.delete(el)
    return
  }

  const spot = readBoundSpot(el, bindingAttr('value'))
  if (spot.kind !== 'value') {
    data.delete(el)

    clearSelection(giverIdOf(el))
    if (spot.kind === 'withoutRow') el.value = ''
    return
  }

  const { row, source, sourceId, cleanCode, value } = spot
  const pindex = recordOf(source, row)
  if (sourceId === '') data.set(el, { row, code: cleanCode, pindex })
  else data.delete(el)
  el.value = value

  setSelection(giverIdOf(el), row)
}

function hydrate(el: FormField): void {
  fill(el)
  const state = sendingOf(el)
  if (!state.running) state.kept = el.value
}

function writeLocal(el: FormField): Connected | undefined {
  const state = data.get(el)
  if (state) maskState.host.writeField(state.row, state.code, el.value)
  return state
}

function takeBack(el: FormField, value: string): void {
  el.value = value
  writeLocal(el)
}

function sendChange(el: FormField): void {
  const state = sendingOf(el)
  if (state.running) {
    state.again = true
    return
  }
  state.running = true
  void (async () => {
    try {
      do {
        state.again = false
        const value = el.value
        const result = await runEvent(el, 'onChange', {
          VALUE: value,
          PINDEX: data.get(el)?.pindex ?? '',
        })
        if (result.state === 'busy') break
        if (result.writeFailed === true) {
          if (!state.again) takeBack(el, state.kept)
        } else if (result.state === 'ran' || result.state === 'unconfirmed') {
          state.kept = value
        }
      } while (state.again)
    } finally {
      state.running = false
    }
  })()
}

function wire(el: FormField): void {
  if (wired.has(el)) return
  wired.add(el)
  el.addEventListener('input', () => {
    writeLocal(el)
  })
  el.addEventListener('change', () => {
    writeLocal(el)
    sendChange(el)
  })
}

const link = makeDataLink<FormField>({ hydrate, wire })

export const connectValue = link.connect
export const disconnectValue = link.disconnect
