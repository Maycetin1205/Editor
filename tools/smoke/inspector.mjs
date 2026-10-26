// The inspector: every property it shows is set through its control, the
// way a user sets it, and the node must hold the value afterwards.
import * as seam from './seam.mjs'
import { SOURCE } from './fixture.mjs'
import { choose } from './canvas.mjs'

export const INSPECTOR_PLACES = ['bar', 'font', 'source', 'display', 'lookup']

const panel = (page) => page.locator('[data-ff-inspector]')

const settle = (page, ms = 150) => page.waitForTimeout(ms)

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export async function openSections(page) {
  for (let round = 0; round < 6; round++) {
    const folded = panel(page).locator('section > button[aria-expanded="false"]')
    if ((await folded.count()) === 0) return
    await folded.first().click()
    await settle(page, 80)
  }
}

async function pickEntry(page, dialogName, text) {
  const dialog = page.getByRole('dialog', { name: dialogName }).last()
  await dialog.waitFor({ timeout: 2000 })
  const entry = dialog.locator('button', { hasText: text }).first()
  await entry.click()
  await settle(page)
}

const holds = (cond, values) => {
  const value = values[cond.key]
  if (cond.noneOf) return !cond.noneOf.some((v) => Object.is(value, v))
  if ('notEquals' in cond) return !Object.is(value, cond.notEquals)
  return Object.is(value, cond.equals)
}

// A value for the property other than the one it holds.
export function otherValue(prop, now, avoid) {
  switch (prop.control) {
    case 'boolean':
      return now !== true
    case 'choice':
    case 'segment': {
      const options = prop.options.filter((o) => o.value !== now && !(avoid ?? []).includes(o.value))
      return (options.find((o) => o.value !== '') ?? options[0])?.value
    }
    case 'number': {
      const n = Number(now ?? prop.default ?? 0)
      return prop.max !== null && n + 1 > prop.max ? n - 1 : n + 1
    }
    case 'text':
      return `Probe-${prop.key}`.slice(0, prop.maxLength ?? 40)
    case 'source':
      return SOURCE.id
    case 'ladder':
      return 'step'
    default:
      return undefined
  }
}

// Sets the property through its control; the value the node holds after it.
export async function setByUi(page, id, prop, wanted) {
  const p = panel(page)
  const label = prop.label
  switch (prop.control) {
    case 'text':
    case 'number': {
      const input = p.locator(`input[aria-label="${label}"]`).first()
      await input.fill(String(wanted))
      await input.press('Tab')
      break
    }
    case 'ladder': {
      const up = p.locator(`button[aria-label="${label} größer"]`).first()
      if ((await up.count()) > 0 && (await up.isEnabled())) await up.click()
      else await p.locator(`button[aria-label="${label} kleiner"]`).first().click()
      break
    }
    case 'boolean': {
      const tile = p.getByRole('switch', { name: label, exact: true })
      const exact = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)
      const control =
        (await tile.count()) > 0 ? tile.first() : p.locator('label[data-switch]', { hasText: exact }).first()
      await control.click({ timeout: 3000 })
      break
    }
    case 'segment': {
      const name = prop.options.find((o) => o.value === wanted)?.name ?? String(wanted)
      await p.getByRole('radiogroup', { name: label }).getByRole('radio', { name, exact: true }).first().click()
      break
    }
    case 'choice': {
      const select = p.locator(`select[aria-label="${label}"]`)
      if ((await select.count()) > 0) {
        await select.first().selectOption(String(wanted))
      } else {
        const name = prop.options.find((o) => o.value === wanted)?.name ?? String(wanted)
        await p.locator(`button[aria-label^="${label}: "]`).first().click()
        const dialog = page.getByRole('dialog', { name: label }).last()
        await dialog.locator(`button[aria-label="${name}"]`).first().click()
      }
      break
    }
    case 'source':
      await p.locator(`button[aria-label^="Quelle für ${label}: "]`).first().click()
      await pickEntry(page, `Quelle für ${label}`, SOURCE.name)
      break
    case 'field':
      await p.locator(`button[aria-label^="Feld für ${label}: "]`).first().click()
      await pickEntry(page, `Feld für ${label}`, wanted.name)
      break
    default:
      throw new Error(`kein Bedienelement für die Art ${prop.control}`)
  }
  await settle(page)
  return (await seam.node(page, id)).values[prop.key]
}

// Makes the condition of a property hold, through the controls of the
// properties it names.
export async function satisfy(page, id, def, cond, depth = 0) {
  if (!cond || depth > 5) return
  const values = (await seam.node(page, id)).values
  if (holds(cond, values)) return satisfy(page, id, def, cond.and, depth + 1)
  const keyProp = def.properties.find((p) => p.key === cond.key)
  const target =
    cond.equals !== undefined
      ? cond.equals
      : keyProp
        ? otherValue(keyProp, values[cond.key], cond.noneOf ?? ('notEquals' in cond ? [cond.notEquals] : []))
        : undefined
  if (keyProp && target !== undefined && INSPECTOR_PLACES.includes(keyProp.place)) {
    await satisfy(page, id, def, keyProp.when, depth + 1)
    await setByUi(page, id, keyProp, target).catch(() => undefined)
  }
  const now = (await seam.node(page, id)).values
  if (!holds(cond, now) && cond.otherwise) return satisfy(page, id, def, cond.otherwise, depth + 1)
  return satisfy(page, id, def, cond.and, depth + 1)
}

export async function chooseOwnSource(page, id) {
  await choose(page, id)
  await openSections(page)
  const picker = panel(page).locator('button[aria-label^="Datenquelle: "]').first()
  if ((await picker.count()) === 0) return false
  await picker.click()
  await pickEntry(page, 'Datenquelle', SOURCE.name)
  return (await seam.node(page, id)).values.source === SOURCE.id
}

const ORDER = ['source', 'choice', 'segment', 'boolean', 'ladder', 'number', 'text', 'field']

// Every property the inspector can show, set once through its control.
// Returns the properties set and what went wrong.
export async function setEveryProperty(page, id, def) {
  const wrong = []
  const set = new Map()
  const usedFields = new Set()
  // Bound at a place on the canvas, or named after the bound field: never in
  // the inspector (core/block/propertyPlace.ts).
  const elsewhere = new Set([
    ...def.spots.map((s) => `${s.prop}Field`),
    ...def.properties.map((p) => p.plainNameProp).filter((k) => k !== null),
  ])
  const candidates = def.properties
    .filter((p) => INSPECTOR_PLACES.includes(p.place) && p.control !== 'structured' && !elsewhere.has(p.key))
    .sort((a, b) => ORDER.indexOf(a.control) - ORDER.indexOf(b.control))
  for (const prop of candidates) {
    await choose(page, id)
    await openSections(page)
    let shown = (await seam.inspector(page, id)).some((s) => s.key === prop.key)
    if (!shown) {
      await satisfy(page, id, def, prop.when)
      if (prop.sourceProp) {
        const sourceProp = def.properties.find((p) => p.key === prop.sourceProp)
        if (sourceProp && (await seam.node(page, id)).values[sourceProp.key] !== SOURCE.id) {
          await satisfy(page, id, def, sourceProp.when)
          await openSections(page)
          await setByUi(page, id, sourceProp, SOURCE.id).catch(() => undefined)
        }
      }
      await openSections(page)
      shown = (await seam.inspector(page, id)).some((s) => s.key === prop.key)
    }
    if (!shown) {
      wrong.push(`${prop.key} („${prop.label}“) erscheint nicht im Inspektor`)
      continue
    }
    const now = (await seam.node(page, id)).values[prop.key]
    const field = prop.control === 'field' ? SOURCE.fields.find((f) => !usedFields.has(f.code)) : undefined
    const wanted = prop.control === 'field' ? field : otherValue(prop, now)
    if (wanted === undefined) {
      wrong.push(`${prop.key}: kein anderer Wert wählbar`)
      continue
    }
    let after
    try {
      after = await setByUi(page, id, prop, wanted)
    } catch (error) {
      wrong.push(`${prop.key} („${prop.label}“): Bedienelement nicht bedienbar (${error.message.split('\n')[0]})`)
      await page.keyboard.press('Escape')
      continue
    }
    const expected = prop.control === 'field' ? wanted.code : prop.control === 'ladder' ? 'ein anderer Wert' : wanted
    const ok =
      prop.control === 'field'
        ? String(after ?? '').endsWith(expected)
        : prop.control === 'ladder'
          ? !same(after, now)
          : same(after, expected)
    if (!ok)
      wrong.push(
        `${prop.key} („${prop.label}“): ${JSON.stringify(now)} → ${JSON.stringify(after)}, erwartet ${JSON.stringify(expected)}`,
      )
    else {
      set.set(prop.key, after)
      if (field) usedFields.add(field.code)
    }
  }
  return { set, wrong }
}
