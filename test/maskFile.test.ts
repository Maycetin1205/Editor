import { beforeAll, describe, expect, it } from 'vitest'
import '../src/blocks/register'
import { allBlockTypes, mayContain } from '../src/core/block/registry'
import { newSubtree } from '../src/core/block/newBlock'
import { emptyTree } from '../src/core/block/treeOps'
import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../src/core/block/tree'
import { MASK_NAME_PROP } from '../src/core/block/maskName'
import { checkDataSources } from '../src/core/data/dataSources'
import { packMask, packMaskFrom } from '../src/editor/state/maskFile'
import { CURRENT_SCHEMA_VERSION, liftState } from '../src/editor/state/maskSchema'
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

describe('liftState', () => {
  it('turns old button looks and text colors into tones the inspector knows', () => {
    const file = {
      schemaVersion: 27,
      tree: {
        root: { id: 'root', type: 'root', values: {}, parentId: null, childIds: ['b', 't'] },
        b: { id: 'b', type: 'button', values: { variant: 'primary' }, parentId: 'root', childIds: [] },
        t: { id: 't', type: 'text', values: { color: 'petrol' }, parentId: 'root', childIds: [] },
      },
    }
    const lifted = liftState(file)!
    const tree = lifted.tree as Record<string, { values: Record<string, unknown> }>
    expect(tree.b.values).toMatchObject({ tone: 'info', emphasis: 'solid' })
    expect(tree.b.values).not.toHaveProperty('variant')
    expect(tree.t.values.tone).toBe('info')
    const result = readMask(lifted)
    expect(result.ok && result.read.tree.b.values.tone).toBe('info')
  })

  it('folds the columns of an old board into the board and keeps their button', () => {
    const file = {
      schemaVersion: 22,
      tree: {
        root: { id: 'root', type: 'root', values: {}, parentId: null, childIds: ['k'] },
        k: { id: 'k', type: 'kanban', values: {}, parentId: 'root', childIds: ['c1', 'c2'] },
        c1: {
          id: 'c1',
          type: 'kanban-column',
          values: { heading: 'Offen', value: 'O', button: 'Weiter', tone: 'info' },
          parentId: 'k',
          childIds: [],
        },
        c2: { id: 'c2', type: 'kanban-column', values: { heading: 'Fertig', value: 'F' }, parentId: 'k', childIds: [] },
      },
    }
    const result = readMask(liftState(file)!)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.read.tree).sort()).toEqual(['k', 'root'])
    expect(result.read.lines).toEqual([])
    const columns = result.read.tree.k.values.columns as { heading: string; button: string; buttonKind: string }[]
    expect(columns.map((c) => [c.heading, c.button, c.buttonKind])).toEqual([
      ['Offen', 'Weiter', 'next'],
      ['Fertig', '', 'none'],
    ])
  })

  it('returns the current schema unchanged', () => {
    const file = JSON.parse(packMask(treeWithEveryBlock(), [], [])) as Record<string, unknown>
    const lifted = liftState(file)
    expect(lifted).toEqual(file)
    expect(liftState({ schemaVersion: 'x' })).toBeNull()
    expect(liftState({ schemaVersion: 19, tree: {} })).toBeNull()
  })

  it('reads a document at the oldest liftable version without dropping its blocks', () => {
    const tree = treeWithEveryBlock()
    const file = JSON.parse(packMask(tree, [], [])) as Record<string, unknown> & { tree: MaskTree }
    file.schemaVersion = 20
    const result = readMask(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const before = Object.keys(tree).sort()
    const after = Object.keys(result.read.tree).sort()
    expect(after).toEqual(before)
  })
})
