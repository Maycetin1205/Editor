// Baut jede Maske unter masken/: aus <name>/<name>.html und dem gemeinsamen Stil wird
// <name>/index.basis.source.html, die Datei, die SoftEngine öffnet.
//   - der Stil (stil/stil.css, darüber stil/gold.css) kommt an die Stelle /*STIL*/ im einzigen <style> der Maske
//   - /*DATEI:name.json*/ null wird zum Inhalt dieser Datei aus dem Ordner der Maske
//   - nur ASCII und Zeilenende LF, wie die Masken des Editors (src/export/validator.ts)
// Aufruf: node masken/bauen.mjs

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ordner = dirname(fileURLToPath(import.meta.url))
const BRUECKE = '<!--SOFTENGINE-VAR!EditorPfad-->/JS/JS/basis.html.interface.js'

// Was eine Maske im eigenen Stil nicht selbst schreibt: das kommt aus stil.css.
const EIGENE_WERTE = [
  ['Farbe', /:[^;{}]*(?:#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\()/i],
  ['Schrift', /font-family\s*:/i],
  ['Schriftgröße', /font-size\s*:[^;{}]*\d(?:px|rem|em|pt|%)/i],
  ['Schriftstärke', /font-weight\s*:\s*\d/i],
  ['Radius', /radius\s*:[^;{}]*\d(?:px|rem|em)/i],
  ['Schatten', /box-shadow\s*:(?!\s*(?:none|var\(--[\w-]+\))\s*[;}])/i],
]

function lesen(datei) {
  return readFileSync(datei, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}

function nurAscii(html) {
  const ascii = /^[\n\t\x20-\x7E]$/
  const hex = (c) => c.codePointAt(0).toString(16).toUpperCase()
  return html
    .split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>)/i)
    .map((teil) => {
      if (/^<script/i.test(teil)) {
        return teil.replace(
          /[^\n\t\x20-\x7E]/g,
          (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'),
        )
      }
      if (/^<style/i.test(teil)) return Array.from(teil, (c) => (ascii.test(c) ? c : `\\${hex(c)} `)).join('')
      return Array.from(teil, (c) => (ascii.test(c) ? c : `&#x${hex(c)};`)).join('')
    })
    .join('')
}

function bauen(name, stil) {
  const quelle = lesen(join(ordner, name, `${name}.html`))
  const fehler = []

  const stile = [...quelle.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  if (stile.length !== 1 || !stile[0][1].includes('/*STIL*/')) fehler.push('braucht genau ein <style> mit /*STIL*/')
  for (const [was, muster] of EIGENE_WERTE) {
    const treffer = stile.map((s) => muster.exec(s[1])).find(Boolean)
    if (treffer) fehler.push(`eigene ${was} im Stil der Maske: ${treffer[0].trim()}`)
  }
  if (/\sstyle\s*=/i.test(quelle)) fehler.push('style-Attribut: Werte gehören in den Stil')

  const html = nurAscii(
    quelle
      .replace('/*STIL*/', () => stil.trim())
      .replace(/\/\*DATEI:([\w.-]+)\*\/\s*null/g, (_, datei) => lesen(join(ordner, name, datei)).trim()),
  )

  const skripte = [...html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((s) => s[1])
  if (/[^\n\t\x20-\x7E]/.test(html)) fehler.push('nicht nur ASCII')
  if (skripte.filter((s) => s === BRUECKE).length !== 1) fehler.push('Brücke zu SoftEngine fehlt')
  if (skripte.some((s) => s !== BRUECKE))
    fehler.push(`fremdes Skript: ${skripte.filter((s) => s !== BRUECKE).join(', ')}`)
  if (/<!--SOFTENGINE-VAR!JWHtml\w*-->/.test(html)) fehler.push('JWHtml-Marker')

  if (fehler.length > 0) {
    console.error(`${name}: nicht gebaut\n  ${fehler.join('\n  ')}`)
    process.exitCode = 1
    return
  }
  writeFileSync(join(ordner, name, 'index.basis.source.html'), html)
  console.log(`${name}: index.basis.source.html, ${Math.round(html.length / 1024)} KB`)
}

// gold.css überschreibt stil.css; ohne den Eintrag baut jede Maske im Stil von stil.css allein.
const stil = ['stil.css', 'gold.css'].map((datei) => lesen(join(ordner, 'stil', datei))).join('\n\n')
for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
  if (eintrag.isDirectory() && existsSync(join(ordner, eintrag.name, `${eintrag.name}.html`))) bauen(eintrag.name, stil)
}
