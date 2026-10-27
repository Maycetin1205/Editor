// The area with a source of its own, in the exported mask: what it shows
// while its source has no rows.

// The sentence and the button of the empty state. Returns what went wrong.
export async function emptyInMask(mask, el) {
  const empty = el.locator('.empty')
  if (!(await empty.isVisible())) return ['ohne Zeilen kein leerer Zustand']
  const wrong = []
  const text = (await empty.innerText()).replace(/\s+/g, ' ')
  if (!text.includes('Nichts gewählt')) wrong.push(`der leere Zustand sagt „${text}“, nicht „Nichts gewählt“`)
  if ((await empty.locator('button').innerText()).trim() !== 'Neu anlegen') wrong.push('Knopf „Neu anlegen“ fehlt')
  return wrong
}

// "Ausblenden wenn leer": the area takes no room while its source has no
// rows. Returns what went wrong.
export async function hiddenInMask(mask, el) {
  const box = await el.evaluate((area) => ({ hidden: area.hidden, height: area.getBoundingClientRect().height }))
  return box.hidden && box.height === 0 ? [] : [`leer noch zu sehen (hidden ${box.hidden}, ${box.height} px hoch)`]
}
