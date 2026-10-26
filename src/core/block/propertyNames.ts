import { bindingProp, capability, type Capability } from './capability'
import type { Condition, Property, PropertyMap } from './property'

interface Named {
  at: string
  name: string
}

function named(at: string, name: string | undefined): Named[] {
  return name === undefined ? [] : [{ at, name }]
}

function inCondition(condition: Condition | undefined, at: string): Named[] {
  if (!condition) return []
  return [
    ...named(`${at}.key`, condition.key),
    ...inCondition(condition.and, `${at}.and`),
    ...inCondition(condition.otherwise, `${at}.otherwise`),
  ]
}

function inProperty(property: Property<unknown>, inEntry: boolean): Named[] {
  return [
    ...named('sourceProp', property.sourceProp),
    ...named('plainNameProp', property.plainNameProp),
    ...named('nameFromParentField', inEntry ? property.nameFromParentField : undefined),
    ...named('preset.by', property.preset?.by),
    ...inCondition(property.when, 'when'),
  ]
}

function inCapability(c: Capability): Named[] {
  switch (c.kind) {
    case 'source':
      return [...named('after', c.after), ...inCondition(c.when, 'when')]
    case 'recordChoice':
      return [...named('sourceProp', c.sourceProp), ...inCondition(c.when, 'when'), ...inCondition(c.gives, 'gives')]
    case 'bindable':
      return c.spots.flatMap((spot) => [
        ...named('spots.prop', bindingProp(spot.prop)),
        ...named('spots.previewProp', spot.previewProp),
        ...named('spots.weaveProp', spot.weaveProp),
        ...inCondition(spot.when, 'spots.when'),
      ])
    case 'actionValue':
      return c.spots.flatMap((spot) => named('spots.prop', spot.prop))
    case 'list':
      return [...named('binding.prop', c.binding.prop), ...named('binding.sourceProp', c.binding.sourceProp)]
    case 'lookupWindow': {
      const w = c.window
      if (w.entriesProp !== undefined) {
        return [...named('window.entriesProp', w.entriesProp), ...inCondition(w.when, 'window.when')]
      }
      return [
        ...named('window.columnsKey', w.columnsKey),
        ...named('window.widthKey', w.widthKey),
        ...named('window.heightKey', w.heightKey),
        ...named('window.sourceProp', w.sourceProp),
        ...named('window.storageFieldProp', w.storageFieldProp),
        ...named('window.storageTitleProp', w.storageTitleProp),
        ...named('window.titleProp', w.titleProp),
        ...inCondition(w.when, 'window.when'),
      ]
    }
    case 'capture':
      return inCondition(c.when, 'when')
    case 'compute':
      return named('prop', c.prop)
    case 'events':
      return named('entries.prop', c.entries?.prop)
    default:
      return []
  }
}

export function checkPropertyNames(type: string, properties: PropertyMap, capabilities: readonly Capability[]): void {
  const stop = (what: string, { at, name }: Named, isNot = 'keine Eigenschaft des Bausteins'): never => {
    throw new Error(`Baustein "${type}": ${what} nennt in ${at} "${name}", das ist ${isNot}.`)
  }
  // Settings of a list entry may also name their siblings in the same entry.
  const check = (what: string, names: readonly Named[], siblings: PropertyMap = {}): void => {
    for (const n of names) if (!Object.hasOwn(properties, n.name) && !Object.hasOwn(siblings, n.name)) stop(what, n)
  }

  for (const [key, property] of Object.entries(properties)) check(`Eigenschaft "${key}"`, inProperty(property, false))
  for (const c of capabilities) check(`Fähigkeit "${c.kind}"`, inCapability(c))

  const carrier = { capabilities }
  const list = capability(carrier, 'list')?.binding
  for (const entries of [list, list?.inner?.binding]) {
    if (!entries) continue
    const siblings = entries.entryProperties ?? {}
    for (const [key, property] of Object.entries(siblings)) {
      check(`Eigenschaft "${key}" der Liste "${entries.prop}"`, inProperty(property, true), siblings)
    }
  }

  const change = capability(carrier, 'change')
  if (change && !(list?.entryFlag ?? []).some((s) => s.key === change.key)) {
    stop('Fähigkeit "change"', { at: 'key', name: change.key }, 'kein Schalter der Liste')
  }
}
