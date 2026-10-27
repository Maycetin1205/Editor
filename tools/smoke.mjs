// Rauchprobe im Browser: prüft jeden Baustein der Palette so, wie ein Nutzer
// ihn braucht. Je Bausteintyp setzt sie zwei Exemplare ein:
//
//   A (Bedienung): aus der Palette einfügen, Größe ändern, verschieben, jede
//     Eigenschaft über ihr Bedienelement im Inspektor setzen, Wörter auf der
//     Fläche per Doppelklick ändern. Im Export muss A jede gesetzte
//     Eigenschaft tragen.
//   B (Funktion): eigene Quelle wählen, jede Stelle und den ersten Eintrag
//     einer Liste an ein Feld binden, jedes Ereignis mit einem Schritt "Tool"
//     belegen. In der exportierten Maske muss B die Werte der Felder zeigen,
//     und jedes Ereignis muss den Werkzeugstart mit seiner Nummer senden.
//
// Die exportierte Maske läuft mit einem Stellvertreter der SoftEngine-Brücke
// (tools/smoke/mask.mjs); geprüft wird der Code der Maske, nicht SoftEngine.
// Den Zustand des Editors liest die Probe über window.__aufbauSmoke, das nur
// der Entwicklungsbau anbietet (src/editor/smokeAccess.ts).
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
import * as seam from './smoke/seam.mjs'
import { choose, editInPlace, element, insert, move, resize } from './smoke/canvas.mjs'
import {
  chooseOwnSource,
  INSPECTOR_PLACES,
  openSections,
  satisfy,
  setByUi,
  setEveryProperty,
} from './smoke/inspector.mjs'
import { bindFirstEntry, bindSpots, setEntryChoice } from './smoke/binding.mjs'
import { addEntryToolStep, addToolStep } from './smoke/events.mjs'
import { firstValue, SOURCE } from './smoke/fixture.mjs'
import { attributesOf, bridgeScript, nth, sent, shown } from './smoke/mask.mjs'
import { linesKeys, trigger } from './smoke/triggers.mjs'

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
const unchecked = []
let block = ''
const fail = (text) => {
  failures.push(block === '' ? text : `${block}: ${text}`)
  console.error(`  ✗ ${text}`)
}
const pass = (text) => console.log(`  ✓ ${text}`)
const check = (what, wrong) => (wrong.length === 0 ? pass(what) : wrong.forEach((w) => fail(`${what}: ${w}`)))

// Properties that are set elsewhere than in the inspector, by the way the
// probe takes for them. A property no way covers fails the probe; a way the
// probe knows but does not walk is named at the end.
const GRID_CELLS = ['gridX', 'gridY', 'gridW', 'gridH']
const NOT_WALKED = {
  extraSources: 'Hilfsquelle im Inspektor',
  followsSelection: '„Folgt der Auswahl“ im Inspektor',
  calculations: 'Fenster „Berechnung“',
  splits: 'Fenster „Verteilen“',
  lookupColumns: 'Spalten im Suchfenster',
  windowWidth: 'Griffe des Suchfensters',
  windowHeight: 'Griffe des Suchfensters',
  value: 'Wert, den die Maske beim Tippen schreibt',
  pattern: 'Felder in Wörter weben (Stelle mit eigenem Text)',
}

// Settings that change how a block works in the mask: each gets a working
// copy of its own (set before the plain one), so the mask checks it too.
const VARIANTS = {
  formfield: [
    {
      name: 'Mehrzeilig',
      settings: [
        ['fieldType', 'multiline'],
        ['lines', 5],
      ],
      check: linesKeys,
    },
  ],
}

// Places that show something made of the value, not the value itself.
const SHOWN_OTHERWISE = { since: 'die Wartezeit seit der Uhrzeit' }

// What a block needs beyond its own source, its places and its first entry to
// show rows in the mask.
const FUNCTION_SETUP = {
  kanban: {
    field: { key: 'columnsField', code: 'STATUS' },
    entryChoices: [['Knopf', 'Aktion']],
    words: true,
    status: (node) => node.values.columns?.[0]?.value ?? '',
  },
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true })
const page = await context.newPage()
page.setDefaultTimeout(5000)
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await seam.ready(page)
await seam.addSource(page, SOURCE)

const declared = (await seam.blocks(page)).filter((d) => d !== null)
const palette = declared.filter((d) => d.inPalette)
const labels = await page.$$eval('button[aria-label$="einfügen"]', (els) =>
  els.map((e) => e.getAttribute('aria-label')),
)
if (labels.length !== palette.length)
  fail(`${palette.length} Bausteine erlaubt die Palette, ${labels.length} zeigt sie`)

const plan = []
let tool = 7000
const nextTool = () => (tool += 1)

// A: Bedienung. Returns what the export of A must carry.
async function operate(def) {
  const a = await insert(page, def)
  if (a === null) {
    fail('ließ sich nicht aus der Palette einfügen')
    return null
  }
  pass('aus der Palette eingefügt')
  check('Größe geändert', await resize(page, a, def))
  check('verschoben', await move(page, a))

  const inPlace = await editInPlace(page, a, def.tag)
  const edited = new Set(inPlace.changed.map((c) => c.key))
  const missed = []
  for (const p of def.properties.filter((q) => q.place === 'block' && q.control === 'text')) {
    if (!edited.has(p.key) && !(await seam.visible(page, a, p.key))) {
      await choose(page, a)
      await openSections(page)
      await satisfy(page, a, def, p.when)
      const again = await editInPlace(page, a, def.tag)
      again.changed.forEach((c) => edited.add(c.key))
      inPlace.changed.push(...again.changed)
    }
    if (!edited.has(p.key)) missed.push(`„${p.label}“ (${p.key}) ließ sich auf der Fläche nicht ändern`)
  }
  check(`${edited.size} Wörter auf der Fläche geändert`, [...inPlace.wrong, ...missed])

  await choose(page, a)
  if (def.source) {
    if (await chooseOwnSource(page, a)) pass('eigene Quelle gewählt')
    else fail('eigene Quelle ließ sich nicht wählen')
  }
  // Twice: some settings show only while a place is free, others only once
  // it is bound.
  const free = await setEveryProperty(page, a, def)
  // Binding here only opens settings that need a bound place; whether every
  // place binds is checked on B, with nothing else set.
  const spots = await bindSpots(page, a, def, SOURCE.fields)
  const bound = def.spots.length > 0 ? await setEveryProperty(page, a, def) : { set: new Map(), wrong: [] }
  const set = new Map([...free.set, ...bound.set])
  const never = (w) => !set.has(w.split(' ')[0].replace(/:$/, ''))
  const wrong = [...new Set([...free.wrong, ...bound.wrong].filter(never))]
  check(`${set.size} Eigenschaften im Inspektor gesetzt`, wrong)
  return { id: a, set, edited: inPlace.changed, spots: spots.bound }
}

// B: Funktion, plain or with the setting of a variant. Returns what it must
// show and send in the mask.
async function wire(def, variant) {
  const label = variant ? `Funktion (${variant.name})` : 'Funktion'
  const b = await insert(page, def)
  if (b === null) {
    fail(`${label}: Exemplar ließ sich nicht einfügen`)
    return null
  }
  await choose(page, b)
  if (def.source && !(await chooseOwnSource(page, b))) fail(`${label}: eigene Quelle ließ sich nicht wählen`)
  const settings = []
  for (const [key, value] of variant?.settings ?? []) {
    await openSections(page)
    const prop = def.properties.find((p) => p.key === key)
    const now = await setByUi(page, b, prop, value).catch(() => undefined)
    if (now === value) settings.push(key)
    else fail(`${label}: ${prop.label} ließ sich nicht auf ${JSON.stringify(value)} stellen`)
  }
  if (settings.length > 0) pass(`${label}: ${settings.length} Einstellungen gewählt`)
  const spots = await bindSpots(page, b, def, SOURCE.fields)
  if (def.spots.length > 0) check(`${spots.bound.length} Stellen gebunden`, spots.wrong)
  const listed = def.list !== null && def.properties.find((p) => p.key === def.list)?.place === 'block'
  const entryField = listed && !def.fieldless
  if (entryField)
    check('erster Eintrag der Liste gebunden', (await bindFirstEntry(page, b, def, SOURCE.fields[0])).wrong)
  const setup = FUNCTION_SETUP[def.type]
  if (setup?.field) {
    await choose(page, b)
    await openSections(page)
    const prop = def.properties.find((p) => p.key === setup.field.key)
    const field = SOURCE.fields.find((f) => f.code === setup.field.code)
    await setByUi(page, b, prop, field).catch(() => undefined)
  }
  for (const [group, option] of setup?.entryChoices ?? []) {
    if (!(await setEntryChoice(page, b, def, group, option)))
      fail(`Funktion: „${group}: ${option}“ am ersten Eintrag nicht wählbar`)
  }
  if (setup?.words) await editInPlace(page, b, def.tag)
  // The places the block shows now; one setting can show one place in
  // place of another (the corner of a card), the mask shows the same.
  await choose(page, b)
  const showing = new Set()
  for (const spot of def.spots) {
    const place = element(page, b, def.tag).locator(`[data-ff-spot="${spot.prop}"]`).first()
    if ((await place.count()) > 0 && (await place.isVisible())) showing.add(spot.prop)
  }
  const events = []
  for (const event of def.events.filter((e) => !e.entry)) {
    await choose(page, b)
    const nr = nextTool()
    const missedStep = await addToolStep(page, b, event, nr)
    missedStep.forEach((w) => fail(w))
    if (missedStep.length === 0) events.push({ event, nr })
  }
  if (def.events.some((e) => e.entry)) {
    await choose(page, b)
    const nr = nextTool()
    const entry = await addEntryToolStep(page, b, nr)
    entry.wrong.forEach((w) => fail(w))
    if (entry.key) events.push({ event: { key: 'entry', name: `erster Eintrag (${entry.key})` }, nr })
  }
  if (def.events.length > 0) pass(`${events.length} Ereignisse mit Aktionsketten belegt`)
  return {
    id: b,
    label,
    check: variant?.check,
    settings,
    spots: spots.bound.filter((x) => showing.has(x.spot)),
    hidden: spots.bound.filter((x) => !showing.has(x.spot)).map((x) => x.spot),
    listed: entryField,
    events,
    status: setup?.status?.(await seam.node(page, b)) ?? '',
  }
}

for (const def of palette) {
  block = def.name
  console.log(`${def.name} (${def.tag})`)
  try {
    const a = await operate(def)
    if (a === null) continue
    const fns = []
    for (const variant of VARIANTS[def.type] ?? []) {
      const v = await wire(def, variant)
      if (v) fns.push(v)
    }
    const b = await wire(def)
    if (b === null) continue
    fns.push(b)

    // Properties no way the probe walks covers.
    const covered = new Set([...a.set.keys(), ...a.edited.map((c) => c.key), ...GRID_CELLS, 'source'])
    for (const s of [...a.spots, ...fns.flatMap((f) => f.spots)]) s.keys.forEach((k) => covered.add(k))
    def.spots.forEach((s) => covered.add(`${s.prop}Field`))
    if (def.list) covered.add(def.list)
    const setup = FUNCTION_SETUP[def.type]
    if (setup?.field) covered.add(setup.field.key)
    for (const p of def.properties) if (p.plainNameProp && covered.has(p.key)) covered.add(p.plainNameProp)
    const nowhere = []
    for (const p of def.properties) {
      if (covered.has(p.key)) continue
      if (NOT_WALKED[p.key]) unchecked.push(`${def.name}: ${p.label} (${p.key}) — ${NOT_WALKED[p.key]}`)
      else nowhere.push(`„${p.label}“ (${p.key}, Ort ${p.place}) hat keinen Weg im Editor, den die Probe kennt`)
    }
    check('jede Eigenschaft hat einen Weg im Editor', nowhere)
    plan.push({ def, a, fns })
  } catch (error) {
    fail(`Probe brach ab: ${error.message.split('\n')[0]}`)
    await page.keyboard.press('Escape')
  }
}
block = ''
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(out, 'editor.png') })
if (errors.length > 0) fail(`Fehler in der Konsole des Editors:\n  ${errors.join('\n  ')}`)

// Export
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

if (fs.existsSync(html)) {
  const statuses = plan.flatMap((p) => p.fns.map((f) => f.status)).filter((s) => s !== '')
  const mask = await context.newPage()
  mask.setDefaultTimeout(5000)
  const maskErrors = []
  mask.on('pageerror', (e) => maskErrors.push(e.message))
  await mask.addInitScript(bridgeScript(statuses[0] ?? ''))
  await mask.goto('file://' + html, { waitUntil: 'load' })
  await mask.waitForTimeout(2500)
  await mask.screenshot({ path: path.join(out, 'maske.png'), fullPage: true })

  // What each block shows, before any event writes into the rows.
  console.log('Exportierte Maske: Eigenschaften und Daten')
  const live = []
  for (const { def, a, fns } of plan) {
    block = def.name
    console.log(`${def.name} (${def.tag})`)
    const defined = await mask.evaluate(
      (tag) => customElements.get(tag) !== undefined && document.querySelector(tag)?.shadowRoot != null,
      def.tag,
    )
    if (!defined) {
      fail('in der exportierten Maske nicht definiert')
      continue
    }
    const count = await mask.locator(def.tag).count()
    if (count < 1 + fns.length) {
      fail(`${count} statt ${1 + fns.length} Exemplare in der Maske`)
      continue
    }
    const keys = []
    for (const key of [...a.set.keys(), ...a.edited.map((c) => c.key)]) {
      const p = def.properties.find((q) => q.key === key)
      if (!p || p.attribute === '' || keys.includes(key)) continue
      if (!(await seam.visible(page, a.id, key))) continue
      keys.push(key)
    }
    const written = Object.fromEntries(
      await Promise.all(keys.map(async (k) => [k, await seam.exported(page, a.id, k)])),
    )
    const inMask = await attributesOf(
      mask,
      def.tag,
      0,
      keys.map((k) => written[k].attribute),
    )
    const off = keys.filter((k) => inMask[written[k].attribute] !== written[k].raw)
    check(
      `${keys.length} gesetzte Eigenschaften im Export`,
      off.map(
        (k) =>
          `${k} (${written[k].attribute}): erwartet ${JSON.stringify(written[k].raw)}, im Export ${JSON.stringify(inMask[written[k].attribute])}`,
      ),
    )
    for (const [i, b] of fns.entries()) {
      const text = (await shown(mask, def.tag, 1 + i)) ?? ''
      const wanted = [
        ...b.spots.filter((s) => !SHOWN_OTHERWISE[s.spot]).map((s) => ({ what: `Stelle ${s.spot}`, code: s.field })),
        ...(b.listed ? [{ what: 'erster Eintrag', code: SOURCE.fields[0].code }] : []),
      ]
      const missing = wanted.filter((w) => !text.includes(firstValue(w.code, b.status)))
      if (wanted.length > 0) {
        check(
          `${b.label}: ${wanted.length - missing.length} von ${wanted.length} gebundenen Feldern zeigen ihren Wert`,
          missing.map((w) => `${w.what} zeigt „${firstValue(w.code, b.status)}“ (${w.code}) nicht`),
        )
      }
      if (b.settings.length > 0) {
        const set = Object.fromEntries(
          await Promise.all(b.settings.map(async (k) => [k, await seam.exported(page, b.id, k)])),
        )
        const there = await attributesOf(
          mask,
          def.tag,
          1 + i,
          b.settings.map((k) => set[k].attribute),
        )
        check(
          `${b.label}: Einstellungen im Export`,
          b.settings
            .filter((k) => there[set[k].attribute] !== set[k].raw)
            .map(
              (k) =>
                `${k}: erwartet ${JSON.stringify(set[k].raw)}, im Export ${JSON.stringify(there[set[k].attribute])}`,
            ),
        )
      }
      if (b.hidden.length > 0) {
        unchecked.push(`${def.name}: gebunden, mit der letzten Einstellung nicht sichtbar: ${b.hidden.join(', ')}`)
      }
      live.push({ def, b, index: 1 + i })
    }
  }

  console.log('Exportierte Maske: Ereignisse')
  for (const { def, b, index } of live) {
    block = def.name
    if (b.events.length === 0 && !b.check) continue
    console.log(`${def.name} (${def.tag}), ${b.label}`)
    const el = nth(mask, def.tag, index)
    for (const { event, nr } of b.events) {
      const before = (await sent(mask)).length
      const known = await trigger(mask, el, event.key).catch((error) => {
        fail(`Ereignis „${event.name}“: Auslösen scheiterte (${error.message.split('\n')[0]})`)
        return null
      })
      if (known === null) continue
      if (!known) {
        fail(`Ereignis „${event.name}“ (${event.key}): keine Auslösung bekannt (tools/smoke/triggers.mjs)`)
        continue
      }
      const after = (await sent(mask)).slice(before)
      const hit = after.some((m) => m.art === 'START_TOOL' && m.body.includes(String(nr)))
      if (hit) pass(`Ereignis „${event.name}“ startet Tool ${nr}`)
      else fail(`Ereignis „${event.name}“: kein START_TOOL ${nr} gesendet (${JSON.stringify(after)})`)
      await mask.keyboard.press('Escape')
    }
    if (b.check) check(`${b.label}: Tasten`, await b.check(mask, el))
  }
  block = ''
  if (maskErrors.length > 0) fail(`Skriptfehler in der Maske:\n  ${maskErrors.join('\n  ')}`)
}

await browser.close()
if (unchecked.length > 0) {
  console.log('\nNicht von der Probe gegangene Wege (bekannt, aber ungeprüft):')
  unchecked.forEach((u) => console.log(`  · ${u}`))
}
console.log(failures.length === 0 ? `\nRauchprobe bestanden, Dateien in ${out}` : `\n${failures.length} Fehler`)
process.exit(failures.length === 0 ? 0 : 1)
