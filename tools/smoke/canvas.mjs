// The canvas: insert a block from the palette, choose it, pull its grips,
// carry it, and edit its words in place.
import * as seam from './seam.mjs'

const host = (page, id) => page.locator(`main [data-block-id="${id}"]`)

// The block in the middle of the canvas, so a pull at its grips stays in
// the window.
async function center(page, id) {
  await page.evaluate((id) => {
    document.querySelector(`main [data-block-id="${id}"]`)?.scrollIntoView({ block: 'center', inline: 'nearest' })
  }, id)
  await page.waitForTimeout(80)
}

export const element = (page, id, tag) => host(page, id).locator(`${tag}[preview]`).first()

async function settle(page, ms = 150) {
  await page.waitForTimeout(ms)
}

// A point of the block where the block itself is on top, not a block inside
// it, a grip or another helper the editor lays over it (the heads of a list
// carry their own handles): the first of a grid of points, from the left top.
async function corner(page, id) {
  await center(page, id)
  const box = await host(page, id).boundingBox()
  if (!box) throw new Error('nicht auf der Fläche')
  const point = await page.evaluate((id) => {
    const root = document.querySelector(`main [data-block-id="${id}"]`)
    const r = root.getBoundingClientRect()
    for (const fy of [0.12, 0.5, 0.88, 0.3, 0.7, 0.04]) {
      for (const fx of [0.05, 0.3, 0.6, 0.9]) {
        const x = r.left + Math.max(4, r.width * fx)
        const y = r.top + Math.max(4, Math.min(r.height - 4, r.height * fy))
        const hit = document.elementFromPoint(x, y)
        if (
          hit?.closest('[data-block-id]') === root &&
          !hit.closest('[data-ff-editor-helper]') &&
          !hit.closest('.cursor-ew-resize, .cursor-ns-resize, .cursor-nwse-resize, .cursor-nesw-resize')
        )
          return { x, y }
      }
    }
    return null
  }, id)
  if (!point) throw new Error('keine freie Stelle zum Greifen')
  return { ...point, box }
}

// Inserts a block of this type from the palette onto the page; the id of the
// new node, or null.
export async function insert(page, def) {
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  // On the page, not into the block chosen last.
  if ((await seam.selectedId(page)) !== null) return null
  const before = new Set(Object.keys(await seam.tree(page)))
  await page.click(`button[aria-label="${def.name} einfügen"]`)
  await settle(page, 300)
  const after = Object.values(await seam.tree(page))
  const added = after.find((n) => !before.has(n.id) && n.type === def.type)
  return added?.id ?? null
}

export async function choose(page, id) {
  if ((await seam.selectedId(page)) === id) return true
  const { x, y } = await corner(page, id)
  await page.mouse.click(x, y)
  await settle(page)
  return (await seam.selectedId(page)) === id
}

// The width of a column and the height of a row of the page on the screen.
async function columnPx(page) {
  const area = await page.locator('[data-ff-root-area]').boundingBox()
  return area.width / 48
}

async function rowPx(page) {
  const zoom = await page.$eval('[data-ff-root-area]', (el) => el.getBoundingClientRect().width / el.offsetWidth)
  return 16 * zoom
}

async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
  }
  await page.mouse.up()
  await settle(page, 250)
}

async function grip(page, id, axis, end) {
  const cursor = axis === 'x' ? 'cursor-ew-resize' : 'cursor-ns-resize'
  const grips = host(page, id).locator(`:scope > div.${cursor}`)
  const boxes = []
  for (let i = 0; i < (await grips.count()); i++) boxes.push(await grips.nth(i).boundingBox())
  if (boxes.length === 0) return null
  boxes.sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y))
  const b = end === 'far' ? boxes[boxes.length - 1] : boxes[0]
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

const slotOf = (node) => ({
  x: node.values.gridX,
  y: node.values.gridY,
  w: node.values.gridW,
  h: node.values.gridH,
})

// Narrower at the right grip, then taller at the lower grip where the block
// lets its height be pulled. Returns what went wrong, or [].
export async function resize(page, id, def) {
  const wrong = []
  if (!(await choose(page, id))) return ['ließ sich nicht wählen']
  const start = slotOf(await seam.node(page, id))
  const col = await columnPx(page)
  await center(page, id)
  const right = await grip(page, id, 'x', 'far')
  const less = Math.max(1, Math.min(Math.floor(start.w / 3), start.w - def.grid.minWidth))
  if (!right) wrong.push('kein Griff rechts')
  else if (start.w > def.grid.minWidth) {
    await drag(page, right, { x: right.x - less * col, y: right.y })
    const now = slotOf(await seam.node(page, id))
    if (!(now.w < start.w)) wrong.push(`Breite blieb ${start.w} (erwartet weniger)`)
  }
  if (!def.grid.heightFixed && !def.grid.heightFromContent) {
    await center(page, id)
    const lower = await grip(page, id, 'y', 'far')
    const before = slotOf(await seam.node(page, id))
    if (!lower) wrong.push('kein Griff unten')
    else {
      await drag(page, lower, { x: lower.x, y: lower.y + 3 * (await rowPx(page)) })
      const now = slotOf(await seam.node(page, id))
      if (!(now.h > before.h)) wrong.push(`Höhe blieb ${before.h} (erwartet mehr)`)
    }
  }
  return wrong
}

// Carries the block four columns to the right.
export async function move(page, id) {
  const start = slotOf(await seam.node(page, id))
  const col = await columnPx(page)
  const { x, y } = await corner(page, id)
  await drag(page, { x, y }, { x: x + 4 * col, y })
  const now = slotOf(await seam.node(page, id))
  if (now.x === start.x && now.y === start.y) return [`Lage blieb Spalte ${start.x}, Zeile ${start.y}`]
  if (now.x <= start.x) return [`nach rechts gezogen, steht jetzt in Spalte ${now.x} statt nach ${start.x}`]
  return []
}

// Edits every word of the block in place (double click, typing, Enter) and
// names the properties that changed by it.
export async function editInPlace(page, id, tag) {
  if (!(await choose(page, id))) return { changed: [], wrong: ['ließ sich nicht wählen'] }
  const editables = element(page, id, tag).locator('[data-ff-editable]')
  const count = await editables.count()
  const changed = []
  for (let i = 0; i < count; i++) {
    const target = editables.nth(i)
    if (!(await target.isVisible())) continue
    const before = (await seam.node(page, id)).values
    const box = await target.boundingBox()
    if (!box) continue
    await page.mouse.dblclick(box.x + Math.min(box.width / 2, 20), box.y + box.height / 2)
    await settle(page)
    const word = `Probe${i + 1}`
    await page.keyboard.type(word)
    await page.keyboard.press('Enter')
    await settle(page)
    const after = (await seam.node(page, id)).values
    for (const key of Object.keys(after)) {
      if (JSON.stringify(after[key]) !== JSON.stringify(before[key])) changed.push({ key, value: after[key], word })
    }
    await page.keyboard.press('Escape')
    await choose(page, id)
  }
  return { changed, wrong: [] }
}
