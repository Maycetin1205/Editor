import { beforeAll, describe, expect, it } from 'vitest'
import '../src/blocks/register'
import { allBlockTypes, mayContain } from '../src/core/block/registry'
import { newSubtree } from '../src/core/block/newBlock'
import { emptyTree } from '../src/core/block/treeOps'
import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../src/core/block/tree'
import { MASK_NAME_PROP } from '../src/core/block/maskName'
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

  it('refuses a mask below the current stage as too old and names its stage', () => {
    const file = JSON.parse(packMask(treeWithEveryBlock(), [], [])) as Record<string, unknown>
    for (const step of [20, 38]) {
      const result = packMaskFrom(JSON.stringify({ ...file, schemaVersion: step }))
      expect(result).toMatchObject({ ok: false, why: expect.stringContaining('zu alten Fassung') })
      expect(result).toMatchObject({ why: expect.stringContaining(`Stufe ${step}`) })
    }
    expect(readMask({ ...file, schemaVersion: 38 })).toEqual({ ok: false, why: 'stage' })
  })
})
