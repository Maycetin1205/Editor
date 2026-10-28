import type { ListBinding } from './listBinding'
import { propertyVisible, type Condition, type PropertyValue } from './property'

export interface BindableSpot {
  prop: string
  name: string
  when?: Condition
  previewProp?: string

  nameProp?: string

  several?: true

  // The property holding words with fields woven in (see fieldPattern.ts):
  // a field picked for the spot goes into these words as a slot.
  weaveProp?: string
}

export interface ValueSpot {
  prop: string
  name: string
}

export interface EventDef {
  key: string
  name: string

  // A key an entry of a list takes for a chain of its own (see EntryEvents);
  // the inspector shows it under the entry, not in the block's own events.
  entry?: true
}

// Each entry of the list in prop may run a chain of its own: the entry holds
// one of the block's entry keys, the chain sits under it in node.chains.
export interface EntryEvents<E = unknown, K extends string = string> {
  prop: K
  name: string
  keyOf(entry: E): string | undefined
  withKey(entry: E, key: string | undefined): E
}

export function entryEventKeys(prefix: string, count: number): EventDef[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `${prefix}${i + 1}`,
    name: `${prefix} ${i + 1}`,
    entry: true,
  }))
}

export interface BlockLookupWindow<K extends string = string> {
  entriesProp?: undefined
  columnsKey: K
  widthKey: K
  heightKey: K

  sourceProp?: K
  storageFieldProp?: K
  storageTitleProp?: K

  titleProp?: K

  when?: Condition<K>
}

export interface EntryLookupWindow<K extends string = string> {
  entriesProp: K

  windowFields: (entry: unknown) => readonly string[]

  when?: Condition<K>
}

export type LookupWindow<K extends string = string> = BlockLookupWindow<K> | EntryLookupWindow<K>

export type Capability<K extends string = string> =
  | { kind: 'source'; when?: Condition<K>; helpers?: 'beside' | 'apart'; after?: K }
  | { kind: 'recordChoice'; sourceProp?: K; when?: Condition<K>; gives?: Condition<K> }
  | { kind: 'followsSelection' }
  | { kind: 'bindable'; spots: readonly BindableSpot[] }
  | { kind: 'actionValue'; spots: readonly ValueSpot[] }
  | { kind: 'list'; binding: ListBinding<unknown, K>; when?: Condition<K> }
  | { kind: 'lookupWindow'; window: LookupWindow<K> }
  | { kind: 'capture'; when?: Condition<K> }
  | { kind: 'change'; key: string }
  | { kind: 'holdsSent' }
  | { kind: 'compute'; prop: K; when?: Condition<K> }
  | { kind: 'events'; list: readonly EventDef[]; entries?: EntryEvents<unknown, K>; when?: Condition<K> }

export type CapabilityKind = Capability['kind']

export type CapabilityOf<A extends CapabilityKind> = Extract<Capability, { kind: A }>

interface HasCapabilities {
  capabilities: readonly Capability[]
}

export function capability<A extends CapabilityKind>(
  carrier: HasCapabilities | undefined,
  kind: A,
): CapabilityOf<A> | undefined {
  return carrier?.capabilities.find((f): f is CapabilityOf<A> => f.kind === kind)
}

export function hasCapability(carrier: HasCapabilities | undefined, kind: CapabilityKind): boolean {
  return capability(carrier, kind) !== undefined
}

// The condition a capability holds under, if it has one.
export function conditionOf(c: Capability): Condition | undefined {
  return 'when' in c ? c.when : undefined
}

export function applies(f: { when?: Condition } | undefined, values: Readonly<Record<string, PropertyValue>>): boolean {
  return f !== undefined && propertyVisible(f.when, values)
}

type BindingProp<P extends string = string> = `${P}Field`

type BindingAttr = `${string}field`

export function bindingProp<P extends string>(prop: P): BindingProp<P> {
  return `${prop}Field`
}

export function bindingAttr(prop: string): BindingAttr {
  return `${prop.toLowerCase()}field`
}

type BindableSpotProp<Props> = keyof Props extends infer K ? (K extends BindingProp<infer P> ? P : never) : never

type BindableSpotsFor<Props> = ReadonlyArray<
  Omit<BindableSpot, 'prop' | 'previewProp' | 'nameProp' | 'weaveProp' | 'when'> & {
    prop: BindableSpotProp<Props>
    previewProp?: keyof Props & string
    nameProp?: keyof Props & string
    weaveProp?: keyof Props & string
    when?: Condition<keyof Props & string>
  }
>

type ValueSpotsFor<Props> = ReadonlyArray<{
  prop: keyof Props & string
  name: string
}>

export function bindable<Props>(spots: BindableSpotsFor<Props>): CapabilityOf<'bindable'> {
  return { kind: 'bindable', spots }
}

export function actionValue<Props>(spots: ValueSpotsFor<Props>): CapabilityOf<'actionValue'> {
  return { kind: 'actionValue', spots }
}

export type PendingKind = 'captured' | 'changed'

export interface CapturedPick {
  record: unknown
  amount: string
}

export interface CaptureCarrier {
  capturedRows: readonly (readonly string[])[]
  capturedKey: readonly string[]
  capturedPicks: readonly (readonly CapturedPick[])[]

  capturedColumn: (key: string) => readonly string[]
}

export interface ChangeCarrier {
  changedRows: readonly { record: string; values: readonly string[] }[]
}

export interface SentRowsElement {
  writtenArrived: () => void
}

export interface WrittenRow {
  key: string
  record: string
  shown?: boolean

  row?: unknown
}

export interface RunReportElement {
  rowWrites: (kind: PendingKind, key: string) => void
  rowFailed: (kind: PendingKind, key: string, reason?: string) => void
  runDone: (kind: PendingKind, written: readonly WrittenRow[]) => void
}

export interface ValueCarrier {
  valueRequired: (prop: string) => boolean
  focusValue: (prop: string) => void
}

export interface RuntimeContracts {
  actionValue: ValueCarrier
  capture: CaptureCarrier & RunReportElement
  change: ChangeCarrier & RunReportElement
  holdsSent: SentRowsElement
}

export type ContractKind = keyof RuntimeContracts

type ContractClass<A extends ContractKind> = abstract new (...args: never[]) => RuntimeContracts[A]

export type ContractClasses = { readonly [A in ContractKind]?: ContractClass<A> }
