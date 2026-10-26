// Rauchprobe im Browser: öffnet den laufenden Editor (npm run dev), fügt jeden
// Baustein der Palette ein, exportiert, öffnet die exportierte Maske ohne
// SoftEngine und prüft, dass jeder Baustein dort definiert ist.
//
//   npm run dev            (in einem zweiten Fenster)
//   node tools/smoke.mjs   [Zielordner für Bildschirmfotos und Export]
//
// Braucht das Paket playwright mit Chromium (npx playwright install chromium).
// Es ist absichtlich keine Abhängigkeit des Projekts: der Browser-Download ist
// groß und die Probe läuft nicht auf GitHub, sondern vor einer Freigabe.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  console.error('playwright fehlt: npm install --no-save playwright && npx playwright install chromium')
  process.exit(2)
}

const URL = process.env.EDITOR_URL ?? 'http://localhost:5300/'
const out = path.resolve(process.argv[2] ?? 'smoke-out')
fs.mkdirSync(out, { recursive: true })

const failures = []
const fail = (text) => {
  failures.push(text)
  console.error('FEHLER', text)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)

const labels = await page.$$eval('button[aria-label$="einfügen"]', (els) =>
  els.map((e) => e.getAttribute('aria-label')),
)
if (labels.length === 0) fail('Palette leer')
// Each block goes to the top level: nothing stays selected, so the area does
// not swallow the others.
for (const label of labels) {
  await page.keyboard.press('Escape')
  await page.click(`button[aria-label="${label}"]`)
  await page.waitForTimeout(150)
}
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(out, 'editor.png') })
const onCanvas = await page.$$eval('main *', (els) => [
  ...new Set(els.map((e) => e.tagName.toLowerCase()).filter((t) => t.startsWith('ff-'))),
])
console.log('Bausteine auf der Fläche:', onCanvas.join(', '))
if (onCanvas.length < labels.length) fail(`${labels.length} Bausteine eingefügt, ${onCanvas.length} auf der Fläche`)

const downloads = []
page.on('download', (d) => downloads.push(d))
await page.click('button:has-text("Exportieren")')
await page.waitForTimeout(3000)
for (const d of downloads) await d.saveAs(path.join(out, d.suggestedFilename()))
const html = path.join(out, 'index.basis.source.html')
if (!fs.existsSync(html)) {
  fail('kein Export heruntergeladen')
  const text = await page.$eval('body', (b) => b.innerText)
  console.error(
    text
      .split('\n')
      .filter((l) => /abgebrochen|exportiert/i.test(l))
      .join('\n'),
  )
}
if (errors.length > 0) fail(`Fehler in der Konsole des Editors:\n  ${errors.join('\n  ')}`)

if (fs.existsSync(html)) {
  const mask = await context.newPage()
  const maskErrors = []
  mask.on('pageerror', (e) => maskErrors.push(e.message))
  await mask.goto('file://' + html, { waitUntil: 'load' })
  await mask.waitForTimeout(2000)
  await mask.screenshot({ path: path.join(out, 'maske.png') })
  const defined = await mask.evaluate(() => {
    const tags = [...new Set([...document.querySelectorAll('*')].map((e) => e.tagName.toLowerCase()))].filter((t) =>
      t.startsWith('ff-'),
    )
    return tags.map((t) => [t, customElements.get(t) !== undefined && document.querySelector(t).shadowRoot !== null])
  })
  console.log('In der Maske:', defined.map(([t, ok]) => `${t}${ok ? '' : ' (STUMM)'}`).join(', '))
  for (const [tag, ok] of defined) if (!ok) fail(`${tag} ist in der exportierten Maske nicht definiert`)
  for (const tag of onCanvas) if (!defined.some(([t]) => t === tag)) fail(`${tag} fehlt im Export`)
  if (maskErrors.length > 0) fail(`Skriptfehler in der Maske:\n  ${maskErrors.join('\n  ')}`)
}

await browser.close()
console.log(failures.length === 0 ? `Rauchprobe bestanden, Dateien in ${out}` : `${failures.length} Fehler`)
process.exit(failures.length === 0 ? 0 : 1)
