import { capability } from '../core/block/capability'
import { gridMetricsOf } from '../core/block/grid'
import { listForExport } from '../core/block/listBinding'
import { propertyVisible, type PropertyPlace } from '../core/block/property'
import { propertiesFor } from '../core/block/propertyPlace'
import { allBlockTypes, blockType } from '../core/block/registry'
import { checkDataSources } from '../core/data/dataSources'
import { deepClone } from '../core/deepClone'
import { controlShown } from './bar/controlShown'
import type { EditorStore } from './state/EditorStore'

const INSPECTOR_PLACES: readonly PropertyPlace[] = ['bar', 'font', 'source', 'display', 'lookup']

// What a block declares, as plain data.
function described(type: string) {
  const def = blockType(type)
  if (!def) return null
  const spots = capability(def, 'bindable')?.spots ?? []
  return {
    type: def.type,
    tag: def.tag,
    name: def.name,
    inPalette: def.inPalette !== false,
    takesChildren: def.takesChildren === true,
    page: def.page === true,
    grid: gridMetricsOf(def),
    source: capability(def, 'source') !== undefined,
    list: capability(def, 'list')?.binding.prop ?? null,
    fieldless: capability(def, 'list')?.binding.fieldless === true,
    events: (capability(def, 'events')?.list ?? []).map((e) => ({ key: e.key, name: e.name, entry: e.entry === true })),
    spots: spots.map((s) => ({ prop: s.prop, name: s.name })),
    properties: Object.entries(def.properties).map(([key, p]) => ({
      key,
      label: p.label,
      place: p.place,
      control: p.type.control ?? null,
      options: (p.type.options ?? []).map((o) => ({ value: o.value, name: o.name })),
      default: p.default,
      attribute: p.attribute,
      when: p.when ?? null,
      min: p.min ?? null,
      max: p.max ?? null,
      maxLength: p.maxLength ?? null,
      plainNameProp: p.plainNameProp ?? null,
      sourceProp: p.sourceProp ?? null,
      needsSource: p.needsSource === true,
    })),
  }
}

// Only in the development build (npm run dev): the smoke test
// (tools/smoke.mjs) reads through this what the editor holds and what a block
// declares, to check what it did on the screen. It acts on the screen only;
// through this it only lays out the data source it binds to.
export function offerToSmoke(editor: EditorStore): void {
  if (!import.meta.env.DEV) return
  Object.assign(window, {
    __aufbauSmoke: {
      blocks: () => allBlockTypes().map((def) => described(def.type)),
      node: (id: string) => {
        const node = editor.getNode(id)
        return node ? deepClone(node) : null
      },
      tree: () => deepClone(editor.tree),
      selectedId: () => editor.selectedId,
      // The attribute as the export writes it, null where it leaves it out
      // (the default): a list without the marks only the editor keeps.
      exported: (id: string, key: string) => {
        const node = editor.getNode(id)
        const def = node ? blockType(node.type) : undefined
        const declared = def?.properties[key]
        if (!node || !def || !declared) return null
        const list = capability(def, 'list')?.binding
        const value = node.values[key] ?? declared.default
        const held = (list?.prop === key ? listForExport(list.entries(value), list) : value) as typeof value
        const raw = declared.type.toAttribute(held)
        return { attribute: declared.attribute, raw: raw === declared.type.toAttribute(declared.default) ? null : raw }
      },
      visible: (id: string, key: string) => {
        const node = editor.getNode(id)
        const declared = node ? blockType(node.type)?.properties[key] : undefined
        return node !== undefined && declared !== undefined && propertyVisible(declared.when, node.values)
      },
      inspector: (id: string) => {
        const node = editor.getNode(id)
        const def = node ? blockType(node.type) : undefined
        if (!node || !def) return []
        const library = editor.dataSources.list
        const inReach = editor.dataSourceFor(id)
        return INSPECTOR_PLACES.flatMap((place) =>
          propertiesFor(node, def, place)
            .filter(({ property }) => controlShown(property, node, inReach, library))
            .map(({ key }) => ({ key, place })),
        )
      },
      addSource: (raw: Record<string, unknown>) => {
        const [source] = checkDataSources([raw])
        if (!source) return null
        editor.dataSources.replaceAll([...editor.dataSources.list.filter((s) => s.id !== source.id), source])
        return source.id
      },
    },
  })
}
