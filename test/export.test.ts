import { beforeAll, describe, expect, it } from 'vitest'
import '../src/blocks/register'
import { allBlockTypes, blockType, mayContain } from '../src/core/block/registry'
import { newSubtree } from '../src/core/block/newBlock'
import { emptyTree } from '../src/core/block/treeOps'
import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../src/core/block/tree'
import { MASK_NAME_PROP } from '../src/core/block/maskSettings'
import { checkDataSources } from '../src/core/data/dataSources'
import { exportMask } from '../src/export/exportMask'
import { failedChecks, validateMaskHtml } from '../src/export/validator'

const HOSTILE = `Mü"ller's <b>&</b> </script><script>alert(1)</script> \u2028`

function treeWithEveryBlock(): MaskTree {
  const tree = emptyTree()
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
  return tree
}

function runtimeScript(html: string): string {
  const at = html.indexOf('(function(){var d={}')
  return at < 0 ? '' : html.slice(at)
}

function withoutRuntime(html: string): string {
  const at = html.indexOf('(function(){var d={}')
  return at < 0 ? html : html.slice(0, at) + '<<RUNTIME>>' + html.slice(html.lastIndexOf('})();') + 5)
}

describe('exportMask', () => {
  let tree: MaskTree
  beforeAll(() => {
    tree = treeWithEveryBlock()
  })

  it('places every palette block type at the top level', () => {
    const types = tree[ROOT_ID].childIds.map((id) => tree[id].type)
    expect(types.length).toBeGreaterThanOrEqual(10)
    expect(types).toEqual(expect.arrayContaining(['area', 'button', 'formfield', 'table', 'kanban', 'text']))
  })

  it('passes its own validator and carries the runtime for every used block', () => {
    const { html } = exportMask(tree, 'Prüfmaske')
    expect(failedChecks(validateMaskHtml(html))).toEqual([])
    for (const id of tree[ROOT_ID].childIds) {
      const tag = blockType(tree[id].type)!.tag
      expect(html).toContain(`<${tag}`)
      expect(runtimeScript(html)).toMatch(new RegExp('[`"\']' + tag + '[`"\']'))
    }
    expect((html.match(/<script/g) ?? []).length).toBe(3)
    expect(html).not.toMatch(/[^\n\t\x20-\x7E]/)
  })

  it('matches the stored shape of the mask markup (runtime chunk left out)', () => {
    const stable = JSON.parse(JSON.stringify(tree)) as MaskTree
    const ids = Object.keys(stable).filter((id) => id !== ROOT_ID)
    const renamed: MaskTree = { [ROOT_ID]: { ...stable[ROOT_ID], childIds: [] } }
    ids.forEach((id, i) => {
      const node = stable[id]
      const fresh = `id-${i}`
      renamed[fresh] = { ...node, id: fresh, childIds: [] }
    })
    ids.forEach((id, i) => {
      const node = stable[id]
      const fresh = `id-${i}`
      const parent = node.parentId === ROOT_ID ? ROOT_ID : `id-${ids.indexOf(node.parentId ?? '')}`
      renamed[fresh].parentId = parent
      renamed[parent].childIds.push(fresh)
    })
    const { html, sevariablen } = exportMask(renamed, 'Prüfmaske')
    expect(withoutRuntime(html)).toMatchSnapshot()
    expect(sevariablen).toMatchSnapshot()
  })

  it('never lets a label, a mask name or a source name break out of the markup', () => {
    const hostileTree = JSON.parse(JSON.stringify(tree)) as MaskTree
    hostileTree[ROOT_ID].values[MASK_NAME_PROP] = HOSTILE
    const button = Object.values(hostileTree).find((n) => n.type === 'button')!
    button.values.label = HOSTILE
    const field = Object.values(hostileTree).find((n) => n.type === 'formfield')!
    field.values.source = 'src-1'
    const sources = checkDataSources([
      {
        id: 'src-1',
        name: HOSTILE,
        preset: 'file',
        tableId: 'KD',
        fields: [{ code: '0_6', name: HOSTILE }],
      },
    ])
    expect(sources).toHaveLength(1)

    const { html, sevariablen } = exportMask(hostileTree, HOSTILE, sources)
    expect(failedChecks(validateMaskHtml(html))).toEqual([])
    expect((html.match(/<script/g) ?? []).length).toBe(3)
    expect(html).not.toContain('alert(1)</script>')

    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(doc.querySelector('ff-button')?.getAttribute('label')).toBe(HOSTILE)
    expect(doc.querySelector('title')?.textContent).toBe(HOSTILE)
    const dataScript = doc.querySelectorAll('script')[1].textContent
    const sourcesJson = /window\.FF_DATA_SOURCES = (\[.*?\]);/s.exec(dataScript)![1]
    const parsed = JSON.parse(sourcesJson) as { name: string }[]
    expect(parsed[0].name).toBe(HOSTILE)
    expect(sevariablen).not.toMatch(/[^\n\t\x20-\x7E]/)
  })

  it('refuses a block type without a built runtime', () => {
    const broken = JSON.parse(JSON.stringify(tree)) as MaskTree
    const first = broken[ROOT_ID].childIds[0]
    broken[first].type = 'nope'
    const { html } = exportMask(broken, 'x')
    expect(html).not.toContain('<nope')
  })
})

describe('validator on action chains', () => {
  const button = (step: object) =>
    `<ff-button data-ff-actions='${JSON.stringify({ onClick: [step] }).replace(/'/g, '&#39;')}'></ff-button>`
  const unread = (html: string) => validateMaskHtml(html).find((r) => r.name === 'Ablaeufe lesbar')

  it('names an event whose chain the runtime would drop', () => {
    const html = button({ kind: 'RELATION', resultName: '', relationId: 'r', parameter: [] })
    expect(unread(html)).toMatchObject({ ok: false, detail: 'onClick' })
  })

  it('passes a chain it can read', () => {
    const html = button({ kind: 'RELATION', resultName: '', relationId: 'r', parameter: [], extraParameter: [] })
    expect(unread(html)).toMatchObject({ ok: true })
  })
})
