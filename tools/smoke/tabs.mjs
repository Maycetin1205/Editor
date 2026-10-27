// The Reiter: what the probe does with its pages beyond what every block
// gets, in the editor and in the exported mask.
import * as seam from './seam.mjs'
import { bridgeScript } from './mask.mjs'
import { bindSpots } from './binding.mjs'
import { choose, element } from './canvas.mjs'
import { firstValue, SOURCE } from './fixture.mjs'
import { chooseOwnSource } from './inspector.mjs'

const settle = (page, ms = 200) => page.waitForTimeout(ms)

const heads = (scope) => scope.locator('[role="tab"]')

const pageIds = async (page, id) => (await seam.node(page, id)).childIds

// Clicks into a page of the Reiter, where nothing else lies, to choose it.
async function choosePage(page, pageId) {
  const shown = page.locator(`main [data-block-id="${pageId}"]`)
  await shown.scrollIntoViewIfNeeded()
  const area = await shown.boundingBox()
  await page.mouse.click(area.x + area.width / 4, area.y + area.height / 2)
  await settle(page)
  return (await seam.selectedId(page)) === pageId
}

async function insertField(page) {
  const before = new Set(Object.keys(await seam.tree(page)))
  await page.click('button[aria-label="Feld einfügen"]')
  await settle(page, 300)
  return Object.values(await seam.tree(page)).find((n) => !before.has(n.id) && n.type === 'formfield')
}

const openAt = async (tabs) =>
  (await heads(tabs).evaluateAll((all) => all.map((b) => b.getAttribute('aria-selected')))).indexOf('true')

// On the canvas: rename the second page in its title, add a third with "+",
// add a fourth and delete it again with Entf, once more with the cross at
// its title, put a field on the second page (undone
// once: the page with the choice opens again), bound to a field of the
// source. Returns what went wrong.
export async function pagesWork(page, id) {
  const wrong = []
  if (!(await choose(page, id))) return ['ließ sich nicht wählen']
  const tabs = element(page, id, 'ff-tabs')
  const [, second] = await pageIds(page, id)
  const title = heads(tabs).nth(1).locator('[data-ff-editable]')
  const box = await title.boundingBox()
  await page.mouse.dblclick(box.x + Math.min(box.width / 2, 20), box.y + box.height / 2)
  await settle(page)
  await page.keyboard.type('Konditionen')
  await page.keyboard.press('Enter')
  await settle(page)
  const named = (await seam.node(page, second)).values.name
  if (named !== 'Konditionen') wrong.push(`Titel der zweiten Seite ist „${named}“, nicht „Konditionen“`)

  await choose(page, id)
  await tabs.locator('button.add').click()
  await settle(page, 300)
  const pages = await pageIds(page, id)
  const third = pages.length === 3 ? (await seam.node(page, pages[2])).values.name : null
  if (third !== 'Seite 3') wrong.push(`„+“ legte keine „Seite 3“ an (${pages.length} Seiten)`)
  if ((await heads(tabs).nth(2).getAttribute('aria-selected')) !== 'true')
    wrong.push('die neue Seite steht nicht offen')

  await choose(page, id)
  await tabs.locator('button.add').click()
  await settle(page, 300)
  const fourth = (await pageIds(page, id))[3]
  if (fourth === undefined || !(await choosePage(page, fourth))) wrong.push('die vierte Seite ließ sich nicht wählen')
  else {
    await page.evaluate(() => document.activeElement?.blur())
    await page.keyboard.press('Delete')
    await settle(page)
    if ((await pageIds(page, id)).length !== 3) wrong.push('Entf löscht die gewählte Seite nicht')
  }
  await choose(page, id)
  await tabs.locator('button.add').click()
  await settle(page, 300)
  const cross = tabs.locator('button.drop')
  if ((await cross.count()) !== 1) wrong.push(`${await cross.count()} Kreuze zum Löschen statt eines am offenen Titel`)
  else {
    await cross.click()
    await settle(page, 300)
    const left = await pageIds(page, id)
    if (left.length !== 3) wrong.push('das Kreuz am Titel löscht die Seite nicht')
    if ((await openAt(tabs)) !== 2) wrong.push('nach dem Löschen steht nicht die Seite davor offen')
  }

  await heads(tabs).nth(1).click()
  await settle(page)
  if (!(await choosePage(page, second))) wrong.push('Klick in die offene Seite wählt sie nicht')
  let field = await insertField(page)
  await heads(tabs).nth(0).click()
  await settle(page)
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Control+z')
  await settle(page, 300)
  if ((await seam.selectedId(page)) !== second || (await openAt(tabs)) !== 1) {
    wrong.push('nach Rückgängig steht die Seite mit der Auswahl nicht offen')
  }
  if (await seam.node(page, field?.id ?? '')) wrong.push('Rückgängig nahm das Feld nicht weg')
  field = await insertField(page)
  if (field?.parentId !== second) {
    wrong.push('ein Feld aus der Palette landet nicht auf der gewählten Seite')
    return wrong
  }
  if (!(await chooseOwnSource(page, field.id))) wrong.push('das Feld auf der Seite bekommt keine eigene Quelle')
  const fieldDef = (await seam.blocks(page)).find((d) => d?.type === 'formfield')
  // ORT: the events of the other fields write NAME into the shared row.
  const spots = await bindSpots(
    page,
    field.id,
    fieldDef,
    SOURCE.fields.filter((f) => f.code === 'ORT'),
  )
  wrong.push(...spots.wrong)
  if (spots.bound.length === 0) wrong.push('das Feld auf der Seite lässt sich nicht binden')
  await page.keyboard.press('Escape')
  return wrong
}

async function state(el) {
  return el.evaluate((tabs) => ({
    open: Array.from(tabs.shadowRoot.querySelectorAll('[role="tab"]')).findIndex(
      (b) => b.getAttribute('aria-selected') === 'true',
    ),
    titles: Array.from(tabs.shadowRoot.querySelectorAll('[role="tab"]')).map((b) => b.textContent.trim()),
    shown: Array.from(tabs.querySelectorAll('ff-tab')).map((p) => p.getBoundingClientRect().height > 0),
  }))
}

// In the mask: one page at a time, by click and by arrow; the field of the
// second page shows its value; a field on a hidden page that takes the focus
// opens its page. Returns what went wrong.
export async function pagesInMask(mask, el) {
  const wrong = []
  const field = el.locator('ff-formfield').first()
  if ((await field.count()) === 0) return ['kein Feld auf der zweiten Seite']
  const titles = (await state(el)).titles
  if (titles.join('|') !== 'Seite 1|Konditionen|Seite 3') wrong.push(`Titel ${JSON.stringify(titles)}`)
  await heads(el).nth(0).click()
  await settle(mask)
  let now = await state(el)
  if (now.shown.join() !== 'true,false,false') wrong.push(`nach Klick auf Seite 1 sichtbar: ${now.shown}`)
  if (await field.isVisible()) wrong.push('das Feld der zweiten Seite ist auf der ersten zu sehen')
  await heads(el).nth(1).click()
  await settle(mask)
  if (!(await field.isVisible())) wrong.push('nach Klick auf „Konditionen“ fehlt ihr Feld')
  const code = await field.getAttribute('valuefield')
  const value = await field.evaluate((f) => f.shadowRoot.querySelector('input')?.value ?? '')
  if (code === null || value !== firstValue(code)) {
    wrong.push(`das gebundene Feld der Seite zeigt „${value}“, nicht „${firstValue(code ?? '')}“ (${code})`)
  }
  await mask.keyboard.press('ArrowLeft')
  await settle(mask)
  now = await state(el)
  if (now.open !== 0 || now.shown.join() !== 'true,false,false') wrong.push(`Pfeil links: offen ${now.open}`)
  await mask.keyboard.press('ArrowLeft')
  await settle(mask)
  if ((await state(el)).open !== 2) wrong.push('Pfeil links auf der ersten Seite geht nicht zur letzten')
  await field.evaluate((f) => f.focusValue('value'))
  await settle(mask)
  now = await state(el)
  const focused = await field.evaluate((f) => f.shadowRoot.activeElement?.tagName === 'INPUT')
  if (now.open !== 1 || !focused) wrong.push('ein Feld auf verborgener Seite öffnet sie nicht vor dem Fokus')
  return wrong
}

// In the mask, with "Letzten Reiter merken": the page chosen last is open
// again when the mask opens anew. Returns what went wrong.
export async function rememberInMask(mask, el) {
  const at = await el.evaluate((tabs) => Array.from(document.querySelectorAll('ff-tabs[data-ff-main]')).indexOf(tabs))
  await heads(el).nth(2).click()
  await settle(mask)
  const again = await mask.context().newPage()
  await again.addInitScript(bridgeScript(''))
  await again.goto(mask.url(), { waitUntil: 'load' })
  await settle(again, 1000)
  const open = (await state(again.locator('ff-tabs[data-ff-main]').nth(at))).open
  await again.close()
  return open === 2 ? [] : [`neu geöffnet steht Seite ${open + 1} offen, nicht die zuletzt gewählte dritte`]
}
