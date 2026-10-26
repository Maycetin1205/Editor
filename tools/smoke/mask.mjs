// The exported mask, opened in the browser with a stand-in for the bridge
// (basisHTML_REGISTER, basisHTML_SND_MSG): it hands over the rows of the data
// source in the form the mask reads them (src/softengine/data.ts) and records
// what the mask sends. That checks the mask's code, not SoftEngine.
import { rows, SOURCE } from './fixture.mjs'

export function bridgeScript(status) {
  return `
    window.__smokeSent = []
    window.__smokeData = ${JSON.stringify({ SEFileLoop: [{ ALIAS: SOURCE.name, Zeilen: rows(status) }] })}
    window.basisHTML_REGISTER = function (callback) {
      setTimeout(function () { callback({ Daten: window.__smokeData }) }, 50)
    }
    window.basisHTML_SND_MSG = function (art, body) {
      window.__smokeSent.push({ art: String(art), body: typeof body === 'string' ? body : JSON.stringify(body) })
    }
  `
}

// The k-th element of the tag in the mask, in the order of the page.
export const nth = (page, tag, k) => page.locator(tag).nth(k)

// Everything an element shows: its words, the values of its inputs and the
// sources of its pictures, through its own and nested shadow roots.
export function shown(page, tag, k) {
  return page.evaluate(
    ([tag, k]) => {
      const out = []
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot) walk(el.shadowRoot)
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) out.push(el.value)
          if (el instanceof HTMLImageElement) out.push(el.getAttribute('src') ?? '')
        }
        out.push(root.textContent ?? '')
      }
      const el = document.querySelectorAll(tag)[k]
      if (!el) return null
      if (el.shadowRoot) walk(el.shadowRoot)
      walk(el)
      return out.join(' | ')
    },
    [tag, k],
  )
}

// The attributes of the element as the export wrote them.
export function attributesOf(page, tag, k, names) {
  return page.evaluate(
    ([tag, k, names]) => {
      const el = document.querySelectorAll(tag)[k]
      if (!el) return null
      return Object.fromEntries(names.map((name) => [name, el.getAttribute(name)]))
    },
    [tag, k, names],
  )
}

export const sent = (page) => page.evaluate(() => window.__smokeSent.slice())
