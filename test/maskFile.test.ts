import { beforeAll, describe, expect, it } from 'vitest'
import '../src/blocks/register'
import { allBlockTypes, mayContain } from '../src/core/block/registry'
import { newSubtree } from '../src/core/block/newBlock'
import { emptyTree } from '../src/core/block/treeOps'
import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../src/core/block/tree'
import type { PropertyValue } from '../src/core/block/property'
import { MASK_NAME_PROP } from '../src/core/block/maskSettings'
import { checkDataSources } from '../src/core/data/dataSources'
import { packMask, packMaskFrom } from '../src/editor/state/maskFile'
import { CURRENT_SCHEMA_VERSION, currentState } from '../src/editor/state/maskSchema'
import { readMask } from '../src/editor/state/readMask'

function treeWithEveryBlock(): MaskTree {
  const tree = emptyTree()
  tree[ROOT_ID].values[MASK_NAME_PROP] = 'Rundlauf'
  let row = 0
  for (const def of allBlockTypes()) {
    if (def.inPalette === false || !mayContain(ROOT_TYPE, def.type)) continue
    const { nodes, rootId } = newSubtree(def.type)
    for (const node of Object.values(nodes)) tree[node.id] = node
    nodes[rootId].parentId = ROOT_ID
    nodes[rootId].values = { ...nodes[rootId].values, gridX: 0, gridY: row, gridW: 12, gridH: 2 }
    row += 2
    tree[ROOT_ID].childIds.push(rootId)
  }
  const button = Object.values(tree).find((n) => n.type === 'button')!
  button.chains = { onClick: [{ id: 'step-1', kind: 'CONFIRM', resultName: 'ok' }] }
  return tree
}

describe('mask file', () => {
  let tree: MaskTree
  beforeAll(() => {
    tree = treeWithEveryBlock()
  })

  it('round-trips a mask with every block, its sources and relations without loss', () => {
    const field = Object.values(tree).find((n) => n.type === 'formfield')!
    field.values.source = 'src-1'
    const sources = checkDataSources([
      { id: 'src-1', name: 'Kunden', preset: 'file', tableId: 'KD', fields: [{ code: '0_6', name: 'Nr' }] },
      { id: 'unused', name: 'Weg', preset: 'file', tableId: 'XX', fields: [] },
    ])
    const relation = [{ id: 'rel-1', name: 'Holen', verb: 'GET_RELATION' as const, nr: '12', parameter: ['A'] }]
    const text = packMask(tree, sources, relation)
    const result = packMaskFrom(text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content.tree).toEqual(tree)
    expect(result.content.dataSources.map((s) => s.id)).toEqual(['src-1'])
    expect(result.note).toEqual({ newer: null, lines: [] })
    expect(JSON.parse(packMask(result.content.tree, result.content.dataSources, result.content.relation))).toEqual(
      JSON.parse(text),
    )
  })

  it('keeps what it cannot read and names it once', () => {
    const file = JSON.parse(packMask(tree, [], [])) as Record<string, unknown> & { tree: MaskTree }
    const button = Object.values(file.tree).find((n) => n.type === 'button')!
    ;(button.values as Record<string, unknown>).futureProp = { deep: true }
    ;(button.values as Record<string, unknown>).label = 42
    file.tree['alien'] = { id: 'alien', type: 'hologram', values: {}, parentId: ROOT_ID, childIds: [] }
    file.tree[ROOT_ID].childIds.push('alien')
    const result = packMaskFrom(JSON.stringify(file))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.note.lines.map((l) => l.name)).toEqual(['Baustein „hologram“'])
    const kept = result.content.tree[button.id]
    expect(kept.values.label).toBe('Schaltfläche')
    expect(result.content.leftover.values[button.id]).toEqual({
      futureProp: { raw: { deep: true } },
      label: { raw: 42, readAs: 'Schaltfläche' },
    })
    expect(result.content.leftover.nodes).toHaveProperty('alien')
    // Saving again writes the unknown parts back where they stood.
    const again = JSON.parse(
      packMask(result.content.tree, result.content.dataSources, result.content.relation, result.content.leftover),
    ) as { tree: MaskTree; leftover: { nodes: Record<string, unknown> } }
    expect((again.tree[button.id].values as Record<string, unknown>).futureProp).toEqual({ deep: true })
    expect(again.tree[button.id].values.label).toBe(42)
    expect(again.leftover.nodes['alien']).toMatchObject({ id: 'alien', type: 'hologram' })
  })

  it('refuses junk and names the reason', () => {
    expect(packMaskFrom('{broken')).toMatchObject({ ok: false, why: expect.stringContaining('JSON') })
    expect(packMaskFrom('[]')).toMatchObject({ ok: false })
    expect(packMaskFrom(JSON.stringify({ kind: 'aufbau-editor-bibliothek' }))).toMatchObject({ ok: false })
    expect(packMaskFrom(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, tree: {} }))).toMatchObject({
      ok: false,
      why: expect.stringContaining('neueren Fassung'),
    })
    expect(packMaskFrom(JSON.stringify({ schemaVersion: 5, tree: {} }))).toMatchObject({
      ok: false,
      why: expect.stringContaining('zu alten Fassung'),
    })
  })

  it('reads a mask saved by a newer editor as a guarded one', () => {
    const file = JSON.parse(packMask(tree, [], [])) as Record<string, unknown>
    file.editorVersion = '99.0.0'
    const result = packMaskFrom(JSON.stringify(file))
    expect(result.ok && result.note.newer).toBe('99.0.0')
  })
})

describe('currentState', () => {
  it('returns a copy of the current stage and nothing for any other', () => {
    const file = JSON.parse(packMask(treeWithEveryBlock(), [], [])) as Record<string, unknown>
    const read = currentState(file)
    expect(read).toEqual(file)
    expect(read).not.toBe(file)
    expect(currentState({ schemaVersion: 'x' })).toBeNull()
    for (const step of [19, 20, 27, 38]) expect(currentState({ ...file, schemaVersion: step })).toBeNull()
  })

  it('refuses a mask below the oldest stage it lifts as too old and names its stage', () => {
    const file = JSON.parse(packMask(treeWithEveryBlock(), [], [])) as Record<string, unknown>
    for (const step of [20, 38]) {
      const result = packMaskFrom(JSON.stringify({ ...file, schemaVersion: step }))
      expect(result).toMatchObject({ ok: false, why: expect.stringContaining('zu alten Fassung') })
      expect(result).toMatchObject({ why: expect.stringContaining(`Stufe ${step}`) })
    }
    expect(readMask({ ...file, schemaVersion: 38 })).toEqual({ ok: false, why: 'stage' })
  })
})

describe('stage 40', () => {
  // Areas as stage 39 wrote them: each of the five forms, one without a form
  // (the default, Kasten), and one saved by the area of 26.10. that carries
  // its kind without its stage.
  function stage39(): Record<string, unknown> {
    const file = JSON.parse(packMask(emptyTree(), [], [])) as { tree: MaskTree } & Record<string, unknown>
    const areas: Record<string, Record<string, unknown>> = {
      plain: { appearance: 'plain' },
      box: { appearance: 'box', heading: 'Kunde' },
      headed: { appearance: 'headed', heading: 'Adresse' },
      fold: { appearance: 'fold', startFolded: true },
      band: { appearance: 'band' },
      none: {},
      kept: { kind: 'card', meta: 'count', countWord: 'Posten', foldable: false },
    }
    for (const [id, values] of Object.entries(areas)) {
      file.tree[id] = {
        id,
        type: 'area',
        values: { gridX: 0, gridY: 0, gridW: 12, gridH: 4, ...values },
        parentId: ROOT_ID,
        childIds: [],
      }
      file.tree[ROOT_ID].childIds.push(id)
    }
    return { ...file, schemaVersion: 39 }
  }

  it('lifts the areas of stage 39 to kinds and keeps everything else', () => {
    const before = stage39()
    const read = currentState(before) as { schemaVersion: number; tree: MaskTree }
    expect(read.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    const kind = (id: string) => read.tree[id].values
    expect(kind('plain')).toMatchObject({ kind: 'plain' })
    expect(kind('box')).toMatchObject({ kind: 'card', heading: 'Kunde' })
    expect(kind('headed')).toMatchObject({ kind: 'headed', heading: 'Adresse' })
    expect(kind('fold')).toMatchObject({ kind: 'headed', foldable: true, startFolded: true })
    expect(kind('band')).toMatchObject({ kind: 'card' })
    expect(kind('none')).toMatchObject({ kind: 'card' })
    for (const id of ['plain', 'box', 'headed', 'fold', 'band', 'none'])
      expect(kind(id)).not.toHaveProperty('appearance')
    expect(kind('kept')).toEqual((before.tree as MaskTree).kept.values)
    expect(read.tree[ROOT_ID]).toEqual((before.tree as MaskTree)[ROOT_ID])
    expect((before.tree as MaskTree).box.values).toHaveProperty('appearance', 'box')
  })

  it('lifts once: a lifted mask read again stays the same', () => {
    const once = currentState(stage39())!
    expect(currentState(once)).toEqual(once)
    expect(currentState({ ...once, schemaVersion: 39 })).toEqual(once)
  })

  it('opens a mask of stage 39 without a note on the lifted areas', () => {
    const result = packMaskFrom(JSON.stringify(stage39()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.note.lines).toEqual([])
    expect(result.content.tree.kept.values).toMatchObject({ kind: 'card', meta: 'count', countWord: 'Posten' })
  })
})

describe('stage 41', () => {
  // Blocks as stage 40 wrote them before they went into others.
  function stage40(
    nodes: Record<string, { type: string; values: Record<string, PropertyValue> }>,
  ): Record<string, unknown> {
    const file = JSON.parse(packMask(emptyTree(), [], [])) as { tree: MaskTree } & Record<string, unknown>
    for (const [id, node] of Object.entries(nodes)) {
      file.tree[id] = { id, type: node.type, values: node.values, parentId: ROOT_ID, childIds: [] }
      file.tree[ROOT_ID].childIds.push(id)
    }
    return { ...file, schemaVersion: 40 }
  }

  const dividers = {
    across: {
      type: 'divider',
      values: { gridX: 0, gridY: 41, gridW: 48, gridH: 1, word: 'Vergangene Belege', thickness: 5 },
    },
    down: { type: 'divider', values: { gridX: 26, gridY: 0, gridW: 1, gridH: 4, word: '', direction: 'vertical' } },
    bare: { type: 'divider', values: { gridX: 0, gridY: 5, gridW: 11, gridH: 2 } },
  }

  it('takes a Trennlinie over as a Text drawn as a divider', () => {
    const read = currentState(stage40(dividers)) as { schemaVersion: number; tree: MaskTree }
    expect(read.schemaVersion).toBe(41)
    expect(read.tree.across).toMatchObject({
      type: 'text',
      values: { form: 'divider', text: 'Vergangene Belege', thickness: 5, gridW: 48 },
    })
    expect(read.tree.down).toMatchObject({
      type: 'text',
      values: { form: 'divider', text: '', direction: 'vertical', gridH: 4 },
    })
    expect(read.tree.bare.values).toEqual({ gridX: 0, gridY: 5, gridW: 11, gridH: 2, form: 'divider', text: '' })
    for (const id of Object.keys(dividers)) expect(read.tree[id].values).not.toHaveProperty('word')
  })

  it('takes a Datum over as a Feld of type Tagwahl without a label', () => {
    const read = currentState(
      stage40({ day: { type: 'date', values: { gridX: 30, gridY: 0, gridW: 18, gridH: 2 } } }),
    ) as {
      tree: MaskTree
    }
    expect(read.tree.day).toMatchObject({
      type: 'formfield',
      values: { fieldType: 'day', showLabel: false, gridX: 30, gridW: 18, gridH: 2 },
    })
  })

  it('takes a Datenliste over as a Tabelle in the form of a list, with its card and choice', () => {
    const values = { gridX: 0, gridY: 3, gridW: 24, gridH: 10, source: 'kunden', pick: 'none', headingField: '6_30' }
    const read = currentState(stage40({ list: { type: 'datalist', values } })) as { tree: MaskTree }
    expect(read.tree.list).toMatchObject({ type: 'table', values: { ...values, look: 'list' } })
  })

  it('takes over once, and also in a mask of this stage', () => {
    const once = currentState(stage40(dividers))!
    expect(currentState(once)).toEqual(once)
    expect(currentState({ ...stage40(dividers), schemaVersion: 41 })).toEqual(once)
  })

  it('lifts a mask of stage 39 through 40 to 41', () => {
    const file = stage40({
      ...dividers,
      box: { type: 'area', values: { gridX: 0, gridY: 0, gridW: 12, gridH: 4, appearance: 'box' } },
    })
    const read = currentState({ ...file, schemaVersion: 39 }) as { tree: MaskTree }
    expect(read.tree.box.values).toMatchObject({ kind: 'card' })
    expect(read.tree.across.type).toBe('text')
  })

  it('opens a lifted mask without a note on what it took over', () => {
    const result = packMaskFrom(JSON.stringify(stage40(dividers)))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.note.lines).toEqual([])
    expect(result.content.tree.down.values).toMatchObject({ form: 'divider', direction: 'vertical' })
  })
})
