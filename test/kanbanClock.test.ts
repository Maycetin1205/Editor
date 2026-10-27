import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { html, type TemplateResult } from 'lit'
import { cardsByClock } from '../src/blocks/kanban/clock'
import type { CardData } from '../src/blocks/kanban/board'
import { setChosenDay } from '../src/runtime/chosenDay'

const card = (key: string, time: string): CardData => ({
  key,
  row: {},
  record: key,
  cell: { column: 0, place: 0 },
  values: { time },
})

// What a line of the column is: a card's key, "now" or the hour.
function lineOf(line: TemplateResult): string {
  const markup = line.strings.join('')
  if (markup.includes('class="now"')) return 'now'
  if (markup.includes('class="hour"')) return 'hour'
  return String(line.values[0])
}

const order = (cards: CardData[]): string[] => cardsByClock(cards, (c) => html`<i>${c.key}</i>`).map(lineOf)

describe('cardsByClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 26, 15, 0))
    setChosenDay('26.10.2026')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('puts the now line between past and coming cards', () => {
    expect(order([card('b', '16:30'), card('a', '09:00')])).toEqual(['hour', 'a', 'now', 'hour', 'b'])
  })
  it('puts the now line before cards without a time when every time has passed', () => {
    expect(order([card('x', ''), card('a', '09:00'), card('b', '10:30')])).toEqual([
      'hour',
      'a',
      'hour',
      'b',
      'now',
      'x',
    ])
  })
  it('shows no now line on another day', () => {
    setChosenDay('27.10.2026')
    expect(order([card('a', '09:00'), card('x', '')])).toEqual(['hour', 'a', 'x'])
  })
})
