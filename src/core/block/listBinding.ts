import { splitBinding } from './binding'
import type { Property, PropertyMap } from './property'

export interface ListBinding<E = unknown, K extends string = string> {
  prop: K

  defaultTitle: string

  sourceProp?: K

  fieldless?: boolean

  entryProperties?: PropertyMap

  inner?: InnerList<E>

  entryFlag?: readonly EntrySwitch<E>[]

  entryChoice?: readonly EntryChoice<E>[]

  entryFieldChoice?: readonly EntryFieldChoice<E>[]

  entryPlace?: EntryPlaceChoice<E>

  entryHeads?: true

  entriesDown?: true

  entries(raw: unknown): E[]

  keyOf?(entry: E): string

  titleOf(entry: E): string

  fieldOf(entry: E): string

  withTypedTitle(entry: E, title: string): E

  withPickedField(entry: E, field: string, fieldTitle: string, width: number | undefined): E

  withoutEditorMarks(entry: E): E

  entryAdd?(entries: readonly E[]): E[] | null
  entryRemove?(entries: readonly E[], index: number): E[] | null
  entryMove?(entries: readonly E[], from: number, to: number): E[] | null
}

interface InnerList<E> {
  binding: ListBinding
  of(entry: E): readonly unknown[]
  with(entry: E, inner: readonly unknown[]): E
}

export interface EntryPath {
  index: number
  inner?: number
}

export function entryPathFrom(raw: string | null, fallback: number): EntryPath {
  const [outer, inner] = (raw ?? '').split('.')
  const index = Number(outer)
  if (outer === '' || !Number.isInteger(index)) return { index: fallback }
  const at = Number(inner)
  return inner !== undefined && Number.isInteger(at) ? { index, inner: at } : { index }
}

export function innerOf<E>(b: ListBinding<E>, entry: E | undefined): readonly unknown[] {
  return entry === undefined || !b.inner ? [] : b.inner.of(entry)
}

export function withInner<E>(b: ListBinding<E>, entries: readonly E[], index: number, inner: readonly unknown[]): E[] {
  const entry = entries[index]
  if (!b.inner || entry === undefined) return [...entries]
  const next = [...entries]
  next[index] = b.inner.with(entry, inner)
  return next
}

export interface EntryPlaceChoice<E> {
  shown(entry: E): boolean

  placed(entries: readonly E[], index: number, key: string): E[] | null
}

export interface EntryFieldChoice<E> {
  key: string

  name: string

  onlyForeignSources?: boolean

  valueOf(entry: E): string

  withValue(entry: E, field: string, fieldTitle: string): E
}

export interface EntrySwitch<E> {
  key: string

  name: string

  onByDefault?: boolean

  onlyOwnSource?: boolean

  shown?(entry: E): boolean

  short?: string

  valueOf(entry: E): boolean | undefined

  withValue(entry: E, on: boolean | undefined): E
}

export interface EntryChoice<E> {
  key: string

  property: Property<string>

  valueOf(entry: E): string

  withValue(entry: E, value: string): E
}

export function withEntryValue<E, K extends keyof E>(entry: E, key: K, value: E[K] | undefined): E {
  const copy = { ...entry }
  if (value === undefined) delete copy[key]
  else copy[key] = value
  return copy
}

export function entryValues<E>(b: ListBinding<E>, entry: E): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(b.entryProperties ?? {}).map((key) => [
      key,
      entry !== null && typeof entry === 'object' ? Reflect.get(entry, key) : undefined,
    ]),
  )
}

export function entriesWithValue<E>(
  b: ListBinding<E>,
  entries: readonly E[],
  index: number,
  key: string,
  value: unknown,
): E[] {
  const alone = b.entryProperties?.[key]?.onlyUnderSiblings === true && value === true
  return entries.map((entry, i) => {
    if (i === index) return { ...entry, [key]: value }
    return alone && entryValues(b, entry)[key] === true ? { ...entry, [key]: false } : entry
  })
}

export function flagOn<E>(flag: EntrySwitch<E>, entry: E): boolean {
  const value = flag.valueOf(entry)
  return typeof value === 'boolean' ? value : flag.onByDefault === true
}

export function flagFor<E>(b: ListBinding<E>, entry: E): readonly EntrySwitch<E>[] {
  const fromForeignSource = splitBinding(b.fieldOf(entry)).sourceId !== ''
  return (b.entryFlag ?? []).filter(
    (s) => !(s.onlyOwnSource === true && fromForeignSource) && s.shown?.(entry) !== false,
  )
}

export function fieldChoicesRead<E>(b: ListBinding<E>, entry: E): { choice: EntryFieldChoice<E>; value: string }[] {
  return (b.entryFieldChoice ?? []).map((choice) => ({ choice, value: choice.valueOf(entry) }))
}

export function listDefaultTitle(b: ListBinding, index: number): string {
  return b.defaultTitle.replace('{n}', String(index + 1))
}

export function assignKeys(present: readonly string[]): string[] {
  const taken = new Set<string>()
  for (const raw of present) {
    const k = raw.trim()
    if (k !== '') taken.add(k)
  }
  let nextNumber = 1
  for (const k of taken) {
    const hit = /^s(\d+)$/.exec(k)
    if (hit) nextNumber = Math.max(nextNumber, Number(hit[1]) + 1)
  }
  const keep = new Set<string>()
  return present.map((raw) => {
    const k = raw.trim()
    if (k !== '' && !keep.has(k)) {
      keep.add(k)
      return k
    }
    while (taken.has(`s${nextNumber}`)) nextNumber += 1
    const fresh = `s${nextNumber}`
    taken.add(fresh)
    keep.add(fresh)
    return fresh
  })
}

function switchExported<E>(b: ListBinding<E>, flag: EntrySwitch<E>, entry: E): boolean {
  return flagFor(b, entry).includes(flag) && flagOn(flag, entry) !== (flag.onByDefault === true)
}

export function listForExport<E>(entries: readonly E[], b: ListBinding<E>): E[] {
  return entries.map((entry) =>
    (b.entryFlag ?? [])
      .filter((flag) => !switchExported(b, flag, entry))
      .reduce((out, flag) => flag.withValue(out, undefined), b.withoutEditorMarks(entry)),
  )
}
