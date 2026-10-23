import { ROOT_ID, type BlockNode, type MaskTree } from '../core/block/tree'
import { splitBinding } from '../core/block/binding'
import { SOURCE_PROP } from '../core/block/sourceProperty'
import type { DataSource } from '../core/data/dataSources'
import { PICTURE_ALIAS_ATTR } from '../blocks/image/address'

// A picture asked by a relation goes into the SEvariablen as SoftEngine's own
// frames do it (Belegerfassung/LAYOUTRAHMEN/00003, MIS_V3/…/VTR/HTML/03):
// SoftEngine answers before the mask opens, under the alias in Daten.Var.

export { PICTURE_ALIAS_ATTR }

export interface GetRelationEntry {
  ID: string
  FORMAT?: 'P'
  PARAMETER: string[]
  RUECKGABE_ALS_ARRAY: false
  ALIAS: string
}

const PICTURE_TYPE = 'image'

const FLAGS: Readonly<Record<string, readonly string[]>> = {
  1911: ['J', 'J'],
  1912: ['J'],
}

function relationNrOf(node: BlockNode): string {
  const fetch = String(node.values.fetch ?? 'field')
  if (fetch in FLAGS) return fetch
  const nr = fetch === 'other' ? String(node.values.relationNr ?? '').trim() : ''
  return /^\d+$/.test(nr) ? nr : ''
}

export function pictureAlias(node: BlockNode): string {
  if (node.type !== PICTURE_TYPE || String(node.values.pictureField ?? '') === '' || relationNrOf(node) === '') return ''
  return `FFBild${node.id.replace(/[^0-9a-zA-Z]/g, '').slice(0, 12).toUpperCase()}`
}

function fullField(node: BlockNode, sources: readonly DataSource[]): string {
  const { sourceId, code } = splitBinding(String(node.values.pictureField ?? ''))
  const source = sources.find((s) => s.id === (sourceId !== '' ? sourceId : String(node.values[SOURCE_PROP] ?? '')))
  const tableId = source?.tableId ?? ''
  return tableId !== '' && /^\d+_\d+$/.test(code) ? `${tableId}_${code}` : code
}

export function pictureRelations(tree: MaskTree, sources: readonly DataSource[]): GetRelationEntry[] {
  const out: GetRelationEntry[] = []
  const visit = (id: string): void => {
    const node = tree[id]
    if (!node) return
    const alias = pictureAlias(node)
    if (alias !== '') {
      const nr = relationNrOf(node)
      const flags = FLAGS[nr] ?? String(node.values.moreValues ?? '').split(/[;,]/).map((v) => v.trim()).filter((v) => v !== '')
      out.push({
        ID: nr,
        ...(nr in FLAGS ? { FORMAT: 'P' as const } : {}),
        PARAMETER: [fullField(node, sources), ...flags],
        RUECKGABE_ALS_ARRAY: false,
        ALIAS: alias,
      })
    }
    node.childIds.forEach(visit)
  }
  visit(ROOT_ID)
  return out
}
