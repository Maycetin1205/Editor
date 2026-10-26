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
    const input = el.locator('input').first()
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
