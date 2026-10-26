// What the smoke test reads of the editor: window.__aufbauSmoke, offered by
// src/editor/smokeAccess.ts in the development build only. The test acts on
// the screen; through this it only checks and lays out its data source.

export const tree = (page) => page.evaluate(() => window.__aufbauSmoke.tree())

export const node = (page, id) => page.evaluate((id) => window.__aufbauSmoke.node(id), id)

export const blocks = (page) => page.evaluate(() => window.__aufbauSmoke.blocks())

export const visible = (page, id, key) => page.evaluate(([id, key]) => window.__aufbauSmoke.visible(id, key), [id, key])

export const inspector = (page, id) => page.evaluate((id) => window.__aufbauSmoke.inspector(id), id)

export const addSource = (page, raw) => page.evaluate((raw) => window.__aufbauSmoke.addSource(raw), raw)

export const exported = (page, id, key) =>
  page.evaluate(([id, key]) => window.__aufbauSmoke.exported(id, key), [id, key])

export const selectedId = (page) => page.evaluate(() => window.__aufbauSmoke.selectedId())

export async function ready(page) {
  const offered = await page.evaluate(() => typeof window.__aufbauSmoke === 'object')
  if (!offered) throw new Error('window.__aufbauSmoke fehlt: läuft der Editor mit npm run dev?')
}
