// How the smoke test sets off an event in the exported mask, by the key of
// the event. A block with an event not named here fails the test: a new
// event needs its way in here.

const settle = (page, ms = 200) => page.waitForTimeout(ms)

const firstRow = (el) => el.locator('.body > .row:not(.capture)').first()

export const TRIGGERS = {
  // The event of the first entry of a list (a line of the value list).
  entry: async (page, el) => el.locator('[role="button"]').first().click(),
  onClick: async (page, el) => el.click(),
  onChange: async (page, el) => {
    const input = el.locator('input, textarea').first()
    await input.fill('Neu')
    await input.press('Tab')
  },
  rowChosen: async (page, el) => firstRow(el).click(),
  rowDouble: async (page, el) => firstRow(el).dblclick(),
  keyF4: async (page, el) => {
    await firstRow(el).focus()
    await page.keyboard.press('F4')
  },
  onRowCaptured: async (page, el) => {
    const input = el.locator('.row.capture input').first()
    await input.click()
    await page.keyboard.type('Neu')
    await page.keyboard.press('Enter')
  },
  onCardClick: async (page, el) => el.locator('.card').first().click(),
  onCardButton: async (page, el) => el.locator('.card button').first().click(),
  onCardDrop: async (page, el) => {
    const card = el.locator('.card').first()
    const target = el.locator('.column').nth(1)
    await card.dragTo(target)
  },
}

export async function trigger(page, el, key) {
  const run = TRIGGERS[key]
  if (!run) return false
  await run(page, el)
  await settle(page, 400)
  return true
}

// A field of several lines in the mask: Enter starts a new line and stays,
// Ctrl+Enter goes on to the next field. Returns what went wrong.
export async function linesKeys(page, el) {
  const area = el.locator('textarea').first()
  if ((await area.count()) === 0) return ['kein mehrzeiliges Eingabefeld']
  await area.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('eins')
  await page.keyboard.press('Enter')
  await page.keyboard.type('zwei')
  const value = await area.inputValue()
  const stays = await area.evaluate((t) => t.getRootNode().activeElement === t)
  await page.keyboard.press('Control+Enter')
  await settle(page)
  const left = await area.evaluate((t) => t.getRootNode().activeElement !== t)
  const wrong = []
  if (value !== 'eins\nzwei') wrong.push(`Enter machte keine neue Zeile (${JSON.stringify(value)})`)
  if (!stays) wrong.push('Enter verließ das Feld')
  if (!left) wrong.push('Strg+Enter ging nicht zum nächsten Feld')
  return wrong
}
