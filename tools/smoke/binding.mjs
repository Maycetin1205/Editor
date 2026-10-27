// Binding fields of the data source: at the places of a block on the canvas
// (a click on the place, then the field) and at the first entry of a list
// (a click on its head, then "Feld" in the bar).
import * as seam from './seam.mjs'
import { choose, element } from './canvas.mjs'
import { SOURCE } from './fixture.mjs'

const settle = (page, ms = 150) => page.waitForTimeout(ms)

async function pickField(page, dialogName, field) {
  const dialog = page.getByRole('dialog', { name: dialogName }).last()
  await dialog.waitFor({ timeout: 2000 })
  await dialog.locator('button', { hasText: field.name }).first().click()
  await settle(page)
}

const changedTo = (before, after, code) =>
  Object.keys(after).filter(
    (key) => JSON.stringify(after[key]) !== JSON.stringify(before[key]) && JSON.stringify(after[key]).includes(code),
  )

// Opens the bar of the first entry of the list (a click on its head).
async function openFirstEntry(page, id, def) {
  if (!(await choose(page, id))) return false
  const head = element(page, id, def.tag).locator('[data-ff-entry]').first()
  if ((await head.count()) === 0) return false
  const box = await head.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await settle(page, 300)
  return true
}

// The bar of the open entry floats above the canvas; its settings open as
// dialogs from its buttons ("Anzeige").
const entryBar = (page) => page.locator('div.fixed[data-ff-editor-helper]').last()

// Each dialog of the bar in turn, open; the callback says whether to stop.
async function eachEntryDialog(page, visit) {
  const openers = entryBar(page).locator('button[aria-haspopup="dialog"]')
  for (let i = 0; i < (await openers.count()); i++) {
    await openers.nth(i).click()
    await settle(page, 200)
    if (await visit(page.getByRole('dialog').last())) return true
    await page.keyboard.press('Escape')
    await settle(page, 80)
  }
  return false
}

// Sets a choice of the first entry in its bar (a segment of radios).
export async function setEntryChoice(page, id, def, group, option) {
  if (!(await openFirstEntry(page, id, def))) return false
  const done = await eachEntryDialog(page, async (dialog) => {
    const radio = dialog.getByRole('radiogroup', { name: group }).getByRole('radio', { name: option, exact: true })
    if ((await radio.count()) === 0) return false
    await radio.first().click()
    await settle(page)
    return true
  })
  await page.keyboard.press('Escape')
  return done
}

// A place some blocks show only when an entry asks for it (the corner or
// foot of a card in a column): every choice in the dialogs of the first
// entry's bar is tried until the place shows. Returns what puts the choices
// back, or null when the place never showed.
async function reveal(page, id, def, prop) {
  if (!def.list || !(await openFirstEntry(page, id, def))) return null
  const place = () => element(page, id, def.tag).locator(`[data-ff-spot="${prop}"]`).first()
  const before = []
  const found = await eachEntryDialog(page, async (dialog) => {
    const groups = dialog.getByRole('radiogroup')
    for (let g = 0; g < (await groups.count()); g++) {
      const group = groups.nth(g)
      const checked = group.locator('[role="radio"][aria-checked="true"]').first()
      if ((await checked.count()) > 0) {
        before.push([await group.getAttribute('aria-label'), await checked.getAttribute('aria-label')])
      }
      const radios = group.getByRole('radio')
      for (let r = 0; r < (await radios.count()); r++) {
        await radios.nth(r).click()
        await settle(page, 120)
        if ((await place().count()) > 0 && (await place().isVisible())) return true
      }
    }
    return false
  })
  await page.keyboard.press('Escape')
  if (!found) return null
  return async () => {
    for (const [group, option] of before) await setEntryChoice(page, id, def, group, option)
  }
}

// Places that format their value take a field whose value suits them.
const SUITED = { time: 'ZEIT', since: 'ZEIT', date: 'DATUM', amount: 'BETRAG' }

export async function bindSpots(page, id, def, fields) {
  const bound = []
  const wrong = []
  const plain = fields.filter((f) => !Object.values(SUITED).includes(f.code))
  for (const [i, spot] of def.spots.entries()) {
    const field = fields.find((f) => f.code === SUITED[spot.prop]) ?? plain[i % plain.length]
    if (!(await choose(page, id))) return { bound, wrong: ['ließ sich nicht wählen'] }
    let place = element(page, id, def.tag).locator(`[data-ff-spot="${spot.prop}"]`).first()
    let putBack = null
    if ((await place.count()) === 0 || !(await place.isVisible())) {
      putBack = await reveal(page, id, def, spot.prop)
      if (!putBack) {
        wrong.push(`Stelle „${spot.name}“ nicht auf der Fläche, auch nicht mit einer Einstellung am ersten Eintrag`)
        continue
      }
      await choose(page, id)
      place = element(page, id, def.tag).locator(`[data-ff-spot="${spot.prop}"]`).first()
    }
    const before = (await seam.node(page, id)).values
    await place.click()
    await settle(page, 450)
    try {
      await pickField(page, `Feld für ${spot.name}`, field)
    } catch {
      wrong.push(`Stelle „${spot.name}“: keine Feldwahl nach Klick`)
      await page.keyboard.press('Escape')
      continue
    }
    await page.keyboard.press('Escape')
    const after = (await seam.node(page, id)).values
    if (putBack) await putBack()
    const keys = changedTo(before, after, field.code)
    if (keys.length === 0) wrong.push(`Stelle „${spot.name}“: ${field.code} nicht gebunden`)
    else bound.push({ spot: spot.prop, field: field.code, keys })
  }
  return { bound, wrong }
}

// Binds the first entry of the list (column, line) to the field.
export async function bindFirstEntry(page, id, def, field) {
  if (!(await openFirstEntry(page, id, def))) return { wrong: ['kein Eintrag der Liste auf der Fläche'] }
  const opener = page.locator('button[aria-label="Feld"][aria-haspopup="dialog"]').first()
  if ((await opener.count()) === 0) return { wrong: ['keine Leiste mit „Feld“ nach Klick auf den Eintrag'] }
  const before = (await seam.node(page, id)).values
  await opener.click()
  try {
    await pickField(page, 'Feld für Feld', field)
  } catch {
    return { wrong: ['keine Feldwahl in der Leiste des Eintrags'] }
  }
  await page.keyboard.press('Escape')
  const after = (await seam.node(page, id)).values
  const list = after[def.list]
  if (JSON.stringify(list) === JSON.stringify(before[def.list]) || !JSON.stringify(list).includes(field.code)) {
    return { wrong: [`erster Eintrag nicht an ${field.code} gebunden`] }
  }
  return { wrong: [] }
}

export const fieldsOf = () => SOURCE.fields
