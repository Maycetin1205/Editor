import { describe, expect, it, vi } from 'vitest'
import { startPointerDrag, type PointerDrag } from '../src/editor/canvas/pointerDrag'

function fire(on: EventTarget, type: string, extra: Record<string, unknown> = {}): Event {
  const ev = Object.assign(new Event(type, { cancelable: true }), { pointerId: 1, clientX: 0, ...extra })
  on.dispatchEvent(ev)
  return ev
}

function steps(more: Partial<PointerDrag> = {}) {
  return {
    begin: vi.fn(),
    move: vi.fn(),
    drop: vi.fn(),
    click: vi.fn(),
    cancel: vi.fn(),
    ...more,
  }
}

function holder() {
  let held = false
  return {
    setPointerCapture: vi.fn(() => {
      held = true
    }),
    releasePointerCapture: vi.fn(() => {
      held = false
    }),
    hasPointerCapture: () => held,
  }
}

describe('startPointerDrag', () => {
  it('starts on the press without a threshold and drops on the release', () => {
    const on = new EventTarget()
    const drag = steps()
    const grip = holder()
    startPointerDrag({ pointerId: 1, currentTarget: grip as unknown as EventTarget }, drag, on)
    expect(drag.begin).toHaveBeenCalledOnce()
    expect(grip.setPointerCapture).toHaveBeenCalledWith(1)
    fire(on, 'pointermove', { clientX: 3 })
    fire(on, 'pointerup')
    fire(on, 'pointermove', { clientX: 9 })
    expect(drag.move).toHaveBeenCalledOnce()
    expect(drag.drop).toHaveBeenCalledOnce()
    expect(drag.click).not.toHaveBeenCalled()
    expect(grip.releasePointerCapture).toHaveBeenCalledWith(1)
  })

  it('counts a release before the threshold as a click', () => {
    const on = new EventTarget()
    const drag = steps({ starts: (ev) => Math.abs(ev.clientX) >= 4 })
    startPointerDrag({ pointerId: 1, currentTarget: null }, drag, on)
    fire(on, 'pointermove', { clientX: 2 })
    fire(on, 'pointerup')
    expect(drag.begin).not.toHaveBeenCalled()
    expect(drag.move).not.toHaveBeenCalled()
    expect(drag.click).toHaveBeenCalledOnce()
    expect(drag.drop).not.toHaveBeenCalled()
  })

  it('begins with the move that passes the threshold and moves with it', () => {
    const on = new EventTarget()
    const drag = steps({ starts: (ev) => Math.abs(ev.clientX) >= 4 })
    startPointerDrag({ pointerId: 1, currentTarget: null }, drag, on)
    fire(on, 'pointermove', { clientX: 5 })
    expect(drag.begin).toHaveBeenCalledOnce()
    expect(drag.move).toHaveBeenCalledOnce()
    fire(on, 'pointerup')
    expect(drag.drop).toHaveBeenCalledOnce()
  })

  it('cancels on Escape, keeps the key to itself and swallows the click of the release', () => {
    const on = new EventTarget()
    const drag = steps()
    startPointerDrag({ pointerId: 1, currentTarget: null }, drag, on)
    const key = Object.assign(new Event('keydown'), { key: 'Escape' })
    const kept = vi.spyOn(key, 'stopPropagation')
    on.dispatchEvent(key)
    fire(on, 'pointermove', { clientX: 7 })
    fire(on, 'pointerup')
    const click = fire(on, 'click')
    expect(drag.cancel).toHaveBeenCalledOnce()
    expect(drag.move).not.toHaveBeenCalled()
    expect(drag.drop).not.toHaveBeenCalled()
    expect(kept).toHaveBeenCalled()
    expect(key.defaultPrevented).toBe(false)
    expect(click.defaultPrevented).toBe(true)
  })
})

describe('startPointerDrag ends', () => {
  it('cancels on a cancelled pointer and on a lost window focus', () => {
    for (const type of ['pointercancel', 'blur']) {
      const on = new EventTarget()
      const drag = steps()
      startPointerDrag({ pointerId: 1, currentTarget: null }, drag, on)
      fire(on, type)
      fire(on, 'pointerup')
      expect(drag.cancel).toHaveBeenCalledOnce()
      expect(drag.drop).not.toHaveBeenCalled()
    }
  })

  it('cancels from outside while running and does nothing after the end', () => {
    const on = new EventTarget()
    const drag = steps()
    const stop = startPointerDrag({ pointerId: 1, currentTarget: null }, drag, on)
    stop()
    fire(on, 'pointerup')
    stop()
    expect(drag.cancel).toHaveBeenCalledOnce()
    expect(drag.drop).not.toHaveBeenCalled()
  })

  it('ignores another pointer', () => {
    const on = new EventTarget()
    const drag = steps()
    startPointerDrag({ pointerId: 1, currentTarget: null }, drag, on)
    fire(on, 'pointermove', { pointerId: 2 })
    fire(on, 'pointercancel', { pointerId: 2 })
    fire(on, 'pointerup', { pointerId: 2 })
    expect(drag.move).not.toHaveBeenCalled()
    expect(drag.cancel).not.toHaveBeenCalled()
    expect(drag.drop).not.toHaveBeenCalled()
  })
})
