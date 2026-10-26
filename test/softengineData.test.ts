import { describe, expect, it } from 'vitest'
import {
  dataFromContent,
  messagesContent,
  rowsFromQueryAnswer,
  rowsOfSource,
  sourceFromList,
} from '../src/softengine/data'
import { fieldRead, fieldWrite } from '../src/softengine/fields'

describe('fieldRead', () => {
  it('reads a direct column, then a prefixed or suffixed one', () => {
    expect(fieldRead({ '12_8': 'A' }, '12_8')).toBe('A')
    expect(fieldRead({ '12_8_NAME': ' B ' }, '12_8')).toBe('B')
    expect(fieldRead({ KUNDE_12_8: 'C' }, '12_8')).toBe('C')
    expect(fieldRead({ other: 'x' }, '12_8')).toBe('')
    expect(fieldRead(null, '12_8')).toBe('')
    expect(fieldRead({ a: 1 }, '')).toBe('')
  })
  it('unwraps a {WERT} cell and decodes entities', () => {
    expect(fieldRead({ F: { WERT: ' M&uuml;ller &amp; Co ' } }, 'F')).toBe('Müller & Co')
    expect(fieldRead({ F: '&#x41;&#66;&unknown;' }, 'F')).toBe('AB&unknown;')
    expect(fieldRead({ F: { WERT: null } }, 'F')).toBe('')
  })
  it('cuts a pos_len code out of the raw record when no column holds it', () => {
    const row = { SATZ: '0123456789ABCDEF' }
    expect(fieldRead(row, '2_3')).toBe('234')
    expect(fieldRead(row, '10_6')).toBe('ABCDEF')
    expect(fieldRead(row, '14_10')).toBe('EF')
    expect(fieldRead(row, '0_0')).toBe('')
    expect(fieldRead({ SATZ: '' }, '2_3')).toBe('')
  })
})

describe('fieldWrite', () => {
  it('writes every matching column', () => {
    const row = { '12_8': 'a', X_12_8: 'b', other: 'c' }
    expect(fieldWrite(row, '12_8', 'Z')).toBe(true)
    expect(row).toEqual({ '12_8': 'Z', X_12_8: 'Z', other: 'c' })
  })
  it('patches the raw record at pos_len, padding and cutting to the length', () => {
    const row = { SATZ: '0123456789' }
    expect(fieldWrite(row, '2_3', 'xy')).toBe(true)
    expect(row.SATZ).toBe('01xy 56789')
    expect(fieldWrite(row, '2_3', 'abcdef')).toBe(true)
    expect(row.SATZ).toBe('01abc56789')
    const short = { SATZ: '01' }
    fieldWrite(short, '4_2', 'Q')
    expect(short.SATZ).toBe('01  Q ')
  })
  it('refuses without a row or a code', () => {
    expect(fieldWrite(null, '1_1', 'x')).toBe(false)
    expect(fieldWrite({ a: 1 }, '', 'x')).toBe(false)
    expect(fieldWrite({ a: 1 }, 'nope', 'x')).toBe(false)
  })
})

describe('rowsFromQueryAnswer', () => {
  it('reads the named list first', () => {
    const answer = { LISTENNAME: 'L', ELEMENTNAME: 'E', L: { E: [{ a: 1 }, 'junk', { b: 2 }] } }
    expect(rowsFromQueryAnswer(answer)).toEqual([{ a: 1 }, { b: 2 }])
    expect(rowsFromQueryAnswer(JSON.stringify(answer))).toEqual([{ a: 1 }, { b: 2 }])
  })
  it('falls back to any *LISTE key, as array or as object', () => {
    expect(rowsFromQueryAnswer({ ARTIKELLISTE: [{ a: 1 }] })).toEqual([{ a: 1 }])
    expect(rowsFromQueryAnswer({ XLISTE: { SAT: 'x', ROWS: [{ a: 1 }] } })).toEqual([{ a: 1 }])
    expect(rowsFromQueryAnswer({ XLISTE: { SAT: 'x', ROW: { a: 1 } } })).toEqual([{ a: 1 }])
    expect(rowsFromQueryAnswer({ XLISTE: 'nothing' })).toEqual([])
    expect(rowsFromQueryAnswer({ other: 1 })).toBeUndefined()
    expect(rowsFromQueryAnswer('not json')).toBeUndefined()
    expect(rowsFromQueryAnswer([1, 2])).toBeUndefined()
  })
})

describe('dataFromContent / messagesContent', () => {
  it('accepts a Daten block with a known section only', () => {
    expect(dataFromContent({ Daten: { Tabellen: {} } })).toEqual({ Tabellen: {} })
    expect(dataFromContent(JSON.stringify({ Daten: { Var: { A: 1 } } }))).toEqual({ Var: { A: 1 } })
    expect(dataFromContent({ Daten: { unrelated: 1 } })).toBeUndefined()
    expect(dataFromContent({ nope: 1 })).toBeUndefined()
    expect(dataFromContent('{broken')).toBeUndefined()
  })
  it('unwraps MSG.DATA from a window message', () => {
    expect(messagesContent({ MSG: { DATA: { x: 1 } } })).toEqual({ x: 1 })
    expect(messagesContent(JSON.stringify({ MSG: { DATA: 'd' } }))).toBe('d')
    expect(messagesContent({ MSG: 'x' })).toBeUndefined()
    expect(messagesContent('nope')).toBeUndefined()
  })
})

describe('sourceFromList / rowsOfSource', () => {
  const list = [
    { id: 's1', name: 'Kunden', tableId: 'KD', recordField: '0_6', fields: ['0_6', '6_30', 7], path: 'Tabellen' },
    { id: 'bad', name: 3, tableId: 'X' },
  ]
  it('reads a source entry and ignores a broken one', () => {
    const source = sourceFromList(list, 's1')
    expect(source).toMatchObject({
      id: 's1',
      name: 'Kunden',
      tableId: 'KD',
      recordField: '0_6',
      fields: ['0_6', '6_30'],
    })
    expect(sourceFromList(list, 'bad')).toBeUndefined()
    expect(sourceFromList(list, '')).toBeUndefined()
    expect(sourceFromList('nope', 's1')).toBeUndefined()
  })
  it('finds pushed rows under the alias in every section SoftEngine uses', () => {
    const source = sourceFromList(list, 's1')!
    const row = { '0_6': '1' }
    expect(rowsOfSource(source, { Daten: { SEFileLoop: [{ ALIAS: 'kunden', Zeilen: [row] }] } })).toEqual([row])
    expect(rowsOfSource(source, { Daten: { SEFileLoop: { Kunden: { Saetze: JSON.stringify([row]) } } } })).toEqual([
      row,
    ])
    expect(rowsOfSource(source, { Daten: { ErpApiCall: { KUNDEN: { Rows: [row] } } } })).toEqual([row])
    expect(rowsOfSource(source, { Daten: { Tabellen: { KD: { Daten: [row] } } } })).toEqual([row])
    expect(rowsOfSource(source, { Daten: { Masken: { kunden: row } } })).toEqual([row])
    expect(rowsOfSource(source, { Daten: { Tabellen: { OTHER: [row] } } })).toEqual([])
    expect(rowsOfSource(source, null)).toEqual([])
  })
  it('reads the open record from the Var block', () => {
    const source = sourceFromList([{ ...list[0], openRecord: true }], 's1')!
    expect(source.delivery).toMatchObject({ kind: 'push', openRecord: true })
    const data = { Daten: { Var: { WINDOW_VARIABLE: { KD_0_6: '4711', XX_1: 'no' }, KD: { '6_30': 'Name' } } } }
    expect(rowsOfSource(source, data)).toEqual([{ KD_0_6: '4711', '6_30': 'Name' }])
    expect(rowsOfSource(source, { Daten: { Var: {} } })).toEqual([])
  })
})
