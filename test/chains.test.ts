import { describe, expect, it } from 'vitest'
import { chainsClean, chainsForExport } from '../src/core/data/steps/chains'
import { chainsRead, sectionsOf } from '../src/core/data/steps/chainsRead'

const saved = {
  click: [
    { id: 'a', kind: 'POPUP_OPEN', resultName: 'open', popupId: 'popup-1', note: ' hi ' },
    {
      id: 'b',
      kind: 'RELATION',
      resultName: 'r',
      relationId: 'rel-1',
      parameter: [
        { source: 'fixed', value: '1' },
        { source: 'stepResult', value: 'a', resultField: 'F' },
        { source: 'captureCell', value: 'col-key', blockId: 'blk' },
      ],
      extraParameter: [],
      onlyIf: { sourceId: 's1', rows: true },
    },
    { id: 'c', kind: 'CONFIRM', resultName: 'ok' },
    {
      id: 'd',
      kind: 'START_TOOL',
      resultName: 't',
      toolNumber: '4711',
      parameter: [{ source: 'context', value: 'PINDEX' }],
    },
    { id: 'e', kind: 'POPUP_CLOSE', resultName: 'close', popupId: 'popup-1' },
  ],
  ignored: [{ id: 'x', kind: 'CONFIRM', resultName: 'n' }],
}

describe('chainsClean', () => {
  it('keeps only allowed events, trims notes and reads conditions', () => {
    const chains = chainsClean(saved, ['click'])!
    expect(Object.keys(chains)).toEqual(['click'])
    expect(chains.click).toHaveLength(5)
    expect(chains.click[0]).toMatchObject({ kind: 'POPUP_OPEN', popupId: 'popup-1', note: 'hi' })
    expect(chains.click[1]).toMatchObject({ onlyIf: { sourceId: 's1', rows: true } })
    expect(chains.click[2]).not.toHaveProperty('note')
  })
  it('drops a chain whole when one step is unreadable or an id repeats', () => {
    const broken = { click: [saved.click[0], { id: 'z', kind: 'NOPE', resultName: 'x' }] }
    expect(chainsClean(broken, ['click'])).toBeUndefined()
    const twice = { click: [saved.click[2], { ...saved.click[2] }] }
    expect(chainsClean(twice, ['click'])).toBeUndefined()
    expect(chainsClean(null, ['click'])).toBeUndefined()
    expect(chainsClean({ click: [] }, ['click'])).toBeUndefined()
  })
})

describe('chainsForExport / chainsRead', () => {
  it('rewrites references to names and positions and reads them back', () => {
    const chains = chainsClean(saved, ['click'])!
    const json = chainsForExport(
      chains,
      ['click'],
      (id) => (id === 'popup-1' ? 'Details' : ''),
      (blockId, key) => (blockId === 'blk' && key === 'col-key' ? '2' : '-1'),
    )!
    const exported = JSON.parse(json) as Record<string, Record<string, unknown>[]>
    expect(exported.click[0]).toEqual({ kind: 'POPUP_OPEN', resultName: 'open', popup: 'Details' })
    expect(exported.click[1]).toMatchObject({
      parameter: [
        { source: 'fixed', value: '1' },
        { source: 'stepResult', value: '0', resultField: 'F' },
        { source: 'captureCell', value: '2', blockId: 'blk' },
      ],
      onlyIf: { sourceId: 's1', rows: true },
    })
    expect(exported.click[1]).not.toHaveProperty('id')
    expect(exported.click[4]).toEqual({ kind: 'POPUP_CLOSE', resultName: 'close', popup: 'Details' })

    const read = chainsRead(json)
    expect(read.click).toHaveLength(5)
    expect(read.click[1]).toMatchObject({
      kind: 'RELATION',
      relationId: 'rel-1',
      onlyIf: { sourceId: 's1', rows: true },
    })
    expect(read.click[3]).toMatchObject({ kind: 'START_TOOL', toolNumber: '4711' })
  })
  it('exports nothing without chains and reads nothing from junk', () => {
    expect(chainsForExport(undefined, ['click'])).toBeNull()
    expect(chainsForExport({ click: [] }, ['click'])).toBeNull()
    expect(chainsRead(null)).toEqual({})
    expect(chainsRead('{not json')).toEqual({})
    expect(chainsRead('{"click":[{"kind":"NOPE","resultName":"x"}]}')).toEqual({})
  })
})

describe('sectionsOf', () => {
  it('groups steps by the rows they read', () => {
    const chains = chainsClean(saved, ['click'])!
    const sections = sectionsOf(chains.click)
    expect(sections.map((s) => [s.kind, s.blockId, [...s.slots]])).toEqual([
      ['once', '', [0]],
      ['captured', 'blk', [1, 2, 3, 4]],
    ])
  })
})
