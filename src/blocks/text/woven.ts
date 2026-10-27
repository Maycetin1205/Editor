import { sendPropChange } from '../base/BlockElement'
import { bindingFields, bindingJoiner, joinedBinding } from '../../core/block/binding'
import { fieldShortName, hasSlots, patternFromEditing, slotFields } from '../../core/block/fieldPattern'

// A woven text: words with fields in slots ({{12_8}}), the fields bound in
// textField and shown by the names in spotTexts.
interface WovenText extends HTMLElement {
  textField: string
  pattern: string
  spotTexts: Readonly<Record<string, string>>
}

function fieldNamesOf(el: WovenText): Map<string, string> {
  const fields = bindingFields(el.textField)
  const shown = (el.spotTexts.text ?? '').split(bindingJoiner(el.textField)).map((name) => name.trim())
  return new Map(fields.length === shown.length ? fields.map((field, i) => [field, shown[i]]) : [])
}

export function fieldNameOf(el: WovenText, field: string): string {
  return fieldNamesOf(el).get(field) || fieldShortName(field)
}

// A text of fields only becomes a woven one once typed in: its fields stand
// in it as they show, joined as before.
export function editedPattern(el: WovenText & { woven: boolean }): string {
  if (el.woven) return el.pattern
  const fields = bindingFields(el.textField)
  return fields.map((field) => `{{${field}}}`).join(bindingJoiner(el.textField))
}

// What was typed over a woven text: the fields named in it stay slots, the
// ones no longer named leave the text; without a field it is plain words.
export function adoptPattern(el: WovenText, typed: string): void {
  const fields = bindingFields(el.textField)
  const pattern = patternFromEditing(
    typed,
    fields.map((field) => ({ field, name: fieldNameOf(el, field) })),
  )
  if (!hasSlots(pattern)) {
    sendPropChange(el, 'textField', '')
    sendPropChange(el, 'text', typed)
    sendPropChange(el, 'pattern', '')
    return
  }
  const named = slotFields(pattern)
  if (fields.some((field) => !named.includes(field))) {
    sendPropChange(
      el,
      'textField',
      joinedBinding(
        fields.filter((field) => named.includes(field)),
        bindingJoiner(el.textField),
      ),
    )
  }
  sendPropChange(el, 'pattern', pattern)
}
