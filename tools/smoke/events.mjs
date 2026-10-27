// Actions: every event of a block gets a step "Tool" with a number of its
// own, through the inspector and the step window. In the mask the stand-in
// bridge then has to receive START_TOOL with exactly that number.
import * as seam from './seam.mjs'
import { openSections } from './inspector.mjs'

const settle = (page, ms = 150) => page.waitForTimeout(ms)

async function toolInWindow(page, nr) {
  const window = page.getByRole('dialog', { name: /^Schritt / }).last()
  await window.waitFor({ timeout: 2000 })
  await window.locator('button[aria-pressed]', { hasText: /^Tool/ }).first().click()
  await window.locator('input[aria-label="Nummer des Tools"]').fill(String(nr))
  await window.getByRole('button', { name: 'Übernehmen', exact: true }).click()
}

// The event of the first entry of a list (a line of the value list): its
// key once it has a step, or what went wrong.
export async function addEntryToolStep(page, id, nr) {
  await openSections(page)
  const before = (await seam.node(page, id)).chains ?? {}
  const first = page.locator('[data-ff-inspector] button', { hasText: /Schritt$/ }).first()
  if ((await first.count()) === 0) return { wrong: ['keine Einträge unter Aktionen'] }
  await first.click()
  await settle(page, 250)
  try {
    await toolInWindow(page, nr)
  } catch (error) {
    await page.keyboard.press('Escape')
    return { wrong: [`Schritt am ersten Eintrag ließ sich nicht anlegen (${error.message.split('\n')[0]})`] }
  }
  await settle(page)
  const chains = (await seam.node(page, id)).chains ?? {}
  const key = Object.keys(chains).find(
    (k) => !before[k] && chains[k].some((s) => s.kind === 'START_TOOL' && String(s.toolNumber) === String(nr)),
  )
  return key ? { key, wrong: [] } : { wrong: [`kein Schritt START_TOOL ${nr} am ersten Eintrag`] }
}

export async function addToolStep(page, id, event, nr) {
  await openSections(page)
  const panel = page.locator('[data-ff-inspector]')
  const chain = panel
    .locator('section')
    .filter({
      has: page.locator('span', { hasText: new RegExp(`^${event.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }),
    })
    .filter({ has: page.locator('button', { hasText: 'Schritt hinzufügen' }) })
    .last()
  if ((await chain.count()) === 0) return [`Ereignis „${event.name}“ fehlt unter Aktionen`]
  await chain.locator('button', { hasText: 'Schritt hinzufügen' }).click()
  await settle(page, 250)
  try {
    await toolInWindow(page, nr)
  } catch (error) {
    await page.keyboard.press('Escape')
    return [`Ereignis „${event.name}“: Schritt ließ sich nicht anlegen (${error.message.split('\n')[0]})`]
  }
  await settle(page)
  const steps = (await seam.node(page, id)).chains?.[event.key] ?? []
  const hit = steps.some((s) => s.kind === 'START_TOOL' && String(s.toolNumber) === String(nr))
  return hit ? [] : [`Ereignis „${event.name}“: kein Schritt START_TOOL ${nr} in der Kette`]
}
