import { bindingFields, bindingJoiner, joinedBinding, splitBinding } from './binding'

// Words with fields woven in, as "Angelegt von {{BEARB}} am {{DATUM|date}}":
// a slot names the binding of a field, after a bar how its value shows. The
// mask keeps the slots; the editor shows them as {Name} and {Name als Datum}.

export type SlotForm = '' | 'number' | 'amount' | 'date'

export interface PatternPiece {
  text: string
  field?: string
  form?: SlotForm
}

const SLOT = /\{\{([^{}|]+)(?:\|(number|amount|date))?\}\}/g

const FORM_WORDS: Readonly<Record<Exclude<SlotForm, ''>, string>> = {
  number: 'Zahl',
  amount: 'Betrag',
  date: 'Datum',
}

export function hasSlots(pattern: string): boolean {
  return new RegExp(SLOT.source).test(pattern)
}

export function patternPieces(pattern: string): PatternPiece[] {
  const pieces: PatternPiece[] = []
  let at = 0
  for (const hit of pattern.matchAll(SLOT)) {
    if (hit.index > at) pieces.push({ text: pattern.slice(at, hit.index) })
    pieces.push({ text: '', field: hit[1].trim(), form: (hit[2] ?? '') as SlotForm })
    at = hit.index + hit[0].length
  }
  if (at < pattern.length) pieces.push({ text: pattern.slice(at) })
  return pieces
}

export function slotFields(pattern: string): string[] {
  return [...new Set(patternPieces(pattern).flatMap((p) => (p.field === undefined ? [] : [p.field])))]
}

function slot(field: string, form: SlotForm = ''): string {
  return form === '' ? `{{${field}}}` : `{{${field}|${form}}}`
}

function tidy(words: string): string {
  return words.replace(/ {2,}/g, ' ').trim()
}

function withSlot(pattern: string, field: string): string {
  const before = pattern.trimEnd()
  return before === '' ? slot(field) : `${before} ${slot(field)}`
}

function withoutSlot(pattern: string, field: string): string {
  return tidy(patternPieces(pattern)
    .map((p) => (p.field === undefined ? p.text : p.field === field ? '' : slot(p.field, p.form)))
    .join(''))
}

export function plainOf(pattern: string): string {
  return tidy(patternPieces(pattern).map((p) => p.text).join(''))
}

export interface Woven {
  pattern: string
  binding: string
  text?: string
}

// A field picked for a spot that weaves: own words and no field yet start a
// pattern; in a pattern a field it holds leaves it, another one joins it at
// the end. Null where the pick binds as before (plain text, or fields only).
export function weave(pattern: string, words: string, binding: string, field: string): Woven | null {
  const fields = bindingFields(binding)
  const joiner = bindingJoiner(binding)
  if (!hasSlots(pattern)) {
    if (field === '' || fields.length > 0 || words.trim() === '') return null
    return { pattern: withSlot(words, field), binding: field }
  }
  if (field === '') return { pattern: '', binding: '', text: plainOf(pattern) }
  if (slotFields(pattern).includes(field)) {
    const next = withoutSlot(pattern, field)
    if (!hasSlots(next)) return { pattern: '', binding: '', text: next }
    return { pattern: next, binding: joinedBinding(fields.filter((f) => f !== field), joiner) }
  }
  return {
    pattern: withSlot(pattern, field),
    binding: fields.includes(field) ? binding : joinedBinding([...fields, field], joiner),
  }
}

export interface NamedField {
  field: string
  name: string
}

export function fieldShortName(field: string): string {
  return splitBinding(field).code
}

export function patternForEditing(pattern: string, nameOf: (field: string) => string): string {
  return patternPieces(pattern)
    .map((p) => {
      if (p.field === undefined) return p.text
      const name = nameOf(p.field)
      return p.form ? `{${name} als ${FORM_WORDS[p.form]}}` : `{${name}}`
    })
    .join('')
}

function formOfWord(word: string): SlotForm | null {
  const key = word.trim().toLowerCase()
  const hit = Object.entries(FORM_WORDS).find(([, name]) => name.toLowerCase() === key)
  return hit ? (hit[0] as SlotForm) : null
}

function fieldNamed(name: string, fields: readonly NamedField[]): string | undefined {
  const key = name.trim().toLowerCase()
  return fields.find((f) => f.name.trim().toLowerCase() === key || fieldShortName(f.field).toLowerCase() === key)?.field
}

// Back from what was typed: {Name} and {Name als Datum} of a field the text
// has become slots again; braces around anything else stay words.
export function patternFromEditing(typed: string, fields: readonly NamedField[]): string {
  return typed.replace(/\{([^{}]+)\}/g, (whole, inner: string) => {
    const field = fieldNamed(inner, fields)
    if (field !== undefined) return slot(field)
    const at = inner.toLowerCase().lastIndexOf(' als ')
    if (at < 0) return whole
    const form = formOfWord(inner.slice(at + 5))
    const named = fieldNamed(inner.slice(0, at), fields)
    return form !== null && named !== undefined ? slot(named, form) : whole
  })
}

// "A=Auftrag; R=Rechnung": a value of a field shows as the word after its
// equals sign. Pairs part at a semicolon or a line, or at a comma where the
// text has no semicolon.
export function replacementsOf(text: string): ReadonlyMap<string, string> {
  const parts = /[;\n]/.test(text) ? text.split(/[;\n]/) : text.split(',')
  const out = new Map<string, string>()
  for (const part of parts) {
    const at = part.indexOf('=')
    if (at <= 0) continue
    const key = part.slice(0, at).trim()
    if (key !== '') out.set(key, part.slice(at + 1).trim())
  }
  return out
}
