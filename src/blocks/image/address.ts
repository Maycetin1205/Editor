import type { RuntimeRelation } from '../../core/data/relations'

// Where a picture of a mask comes from, as the SoftEngine templates do it:
// SEBild takes its src as written, the frames write seimgpfad + a file name
// of the image library, Liefersystem/Mini writes the field ART_2035_80 as is,
// InventurZaehllisten asks GET_RELATION 1911 with the article number.

// The alias under which the export asks SoftEngine for the picture (see
// export/pictureRelations.ts).
export const PICTURE_ALIAS_ATTR = 'data-ff-alias'

const WEB_ADDRESS = /^(?:https?:|data:|blob:)/i

// A scheme (a drive letter is one too), a rooted or an explicitly relative path.
const OWN_ADDRESS = /^(?:[a-z][a-z0-9+.-]*:|\/|\.{1,2}\/)/i

// A marker SoftEngine replaces when it loads the mask; one it left standing
// (as in the editor) means the image library.
const ENGINE_MARKER = /^(?:\/\*--SOFTENGINE-VAR!\w+--\*\/|<!--SOFTENGINE-VAR!\w+-->)/

const BRIDGE_TAIL = '/JS/JS/basis.html.interface.js'

const LIBRARY_BELOW_STANDARD = '/Images/Global/'

interface EngineWindow {
  seimgpfad?: unknown
  SEDATA?: { __WEBWARE__?: unknown }
}

export function loadsInBrowser(address: string): boolean {
  return WEB_ADDRESS.test(address.trim())
}

// The folder of SoftEngine's image library: seimgpfad where the page has it,
// ./ICONVERWALTUNG in the WebUI (as PGBEV1 does), else beside the bridge
// script: <EditorPfad> is …/Ressourcen/Standard/HtmlTemplates/HTMLEditor, the
// library …/Ressourcen/Standard/Images/Global.
export function imageLibrary(doc: Document): string {
  const engine = (doc.defaultView ?? window) as unknown as EngineWindow
  if (typeof engine.seimgpfad === 'string' && engine.seimgpfad.trim() !== '') return engine.seimgpfad
  if (String(engine.SEDATA?.__WEBWARE__ ?? '') === '1') return './ICONVERWALTUNG/'
  for (const script of doc.querySelectorAll('script[src]')) {
    const src = (script.getAttribute('src') ?? '').replace(/\\/g, '/')
    if (!src.endsWith(BRIDGE_TAIL)) continue
    const standard = src.slice(0, -BRIDGE_TAIL.length).split('/').slice(0, -2).join('/')
    if (standard !== '') return `${standard}${LIBRARY_BELOW_STANDARD}`
  }
  return ''
}

function inFolder(folder: string, name: string): string {
  if (folder === '') return name
  return `${folder.replace(/[\\/]$/, '')}/${name.replace(/^[\\/]/, '')}`
}

// A file name typed into the block lies in the image library; an address of
// its own stays as written, with the slashes SoftEngine writes (E:/…). What a
// field or a relation delivers is used as delivered.
export function pictureUrl(raw: string, library: string, delivered: boolean): string {
  const typed = raw.trim()
  if (typed === '' || delivered || WEB_ADDRESS.test(typed)) return typed
  const marker = ENGINE_MARKER.exec(typed)
  if (marker) return inFolder(library, typed.slice(marker[0].length).replace(/\\/g, '/'))
  const address = typed.replace(/\\/g, '/')
  if (OWN_ADDRESS.test(address)) return address
  return inFolder(library, address)
}

// What SoftEngine put under the alias of the picture in Daten.Var, as the
// frames read it (SEDATA.Daten.Var.ArtikelBild): a text as it is; in a list
// or an answer object its first text. Undefined where nothing stands there.
export function pictureFromVar(doc: Document, alias: string): string | undefined {
  if (alias === '') return undefined
  const engine = (doc.defaultView ?? window) as unknown as { SEDATA?: { Daten?: Record<string, unknown> } }
  const data = engine.SEDATA?.Daten
  if (!data || typeof data !== 'object') return undefined
  for (const key of ['Var', 'VAR', 'var']) {
    const block = data[key]
    if (block && typeof block === 'object' && alias in block) return firstText((block as Record<string, unknown>)[alias], 0)
  }
  return undefined
}

function firstText(value: unknown, depth: number): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (depth > 3 || value === null || typeof value !== 'object') return ''
  const inner = Array.isArray(value)
    ? value
    : ['RESULT', 'result'].some((k) => k in value)
      ? [(value as Record<string, unknown>).RESULT ?? (value as Record<string, unknown>).result]
      : Object.values(value)
  for (const entry of inner) {
    const text = firstText(entry, depth + 1)
    if (text.trim() !== '') return text
  }
  return ''
}

export function fileNameOf(address: string): string {
  const name = address.trim().replace(ENGINE_MARKER, '').split(/[\\/]/).pop() ?? ''
  return name === '' ? address.trim() : name
}

// The relations the templates ask for a picture, with the values they send
// after the one of the field (SEvariablen.json of InventurZaehllisten and of
// MIS_V3/LANDINGPAGES/VTR). What the answer holds shows only a live test.
export const PICTURE_RELATIONS: Readonly<Record<string, { name: string; more: readonly string[] }>> = {
  1911: { name: 'Artikelbild', more: ['J', 'J'] },
  1912: { name: 'Medienbild', more: ['J'] },
}

interface PictureAsk {
  relation: RuntimeRelation
  more: readonly string[]
}

export function pictureAsk(fetch: string, otherNr: string, otherMore: string): PictureAsk | null {
  const known = PICTURE_RELATIONS[fetch]
  const nr = known ? fetch : fetch === 'other' ? otherNr.trim() : ''
  if (!/^\d+$/.test(nr)) return null
  const more = known ? known.more : otherMore.split(/[;,]/).map((v) => v.trim()).filter((v) => v !== '')
  return {
    relation: { id: `bild ${nr}`, verb: 'GET_RELATION', nr, parameter: ['WERT', ...more.map(() => '')] },
    more,
  }
}
