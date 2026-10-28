// Builds the mask runtime that an exported mask carries along: every block
// named in src/blocks/register.ts, bundled with lit and the shared runtime into
// src/export/generated/runtime.json. src/export/runtime.ts assembles the parts
// a mask needs from that file (runtimeFor) and wraps them in its own loader.
//
// The file holds CommonJS chunks the way rolldown splits them: each chunk is a
// function body over (require, module, exports), imports between chunks are
// numbers, the export lists of the shared chunks are folded into the loader's
// `__ff` helper, and the lit `css` templates are squeezed to one line. Chunk
// numbers follow the chunk names, so the file only changes when the code does.
//
// Runs before dev, build and test (see package.json) and on
//   npm run build:runtime

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'
import { parseAst } from 'rolldown/parseAst'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REGISTER = path.join(root, 'src', 'blocks', 'register.ts')
const TSCONFIG = path.join(root, 'tsconfig.app.json')
const OUT = path.join(root, 'src', 'export', 'generated', 'runtime.json')

// Runs before any block in an exported mask: puts SoftEngine in as the host.
const HOST_ENTRY = { type: 'softengine-host', file: path.join(root, 'src', 'runtime', 'softEngineStart.ts') }

// --- Entries: the blocks in the order register.ts names them -----------------

function blockEntries() {
  const register = fs.readFileSync(REGISTER, 'utf8')
  const entries = []
  for (const match of register.matchAll(/^import\s+['"]\.\/([^'"]+)['"]/gm)) {
    const file = path.join(path.dirname(REGISTER), `${match[1]}.ts`)
    const source = fs.readFileSync(file, 'utf8')
    const type = /static\s+(?:readonly\s+)?type\s*=\s*['"]([^'"]+)['"]/.exec(source)?.[1]
    if (!type) {
      throw new Error(`${path.relative(root, file)}: kein "static readonly type = '...'" gefunden.`)
    }
    if (entries.some((entry) => entry.type === type)) {
      throw new Error(`Bausteintyp "${type}" kommt in register.ts zweimal vor.`)
    }
    entries.push({ type, file })
  }
  if (entries.length === 0) throw new Error(`${path.relative(root, REGISTER)}: keine Bausteine gefunden.`)
  return entries
}

// --- Squeezing the lit css templates ------------------------------------------
// The style of a block is a css`...` template written for reading, with
// comments, line breaks and indentation. In the mask only the rules count, so
// the template loses its comments and keeps a single space where it needs one.
// Only the literal text of the template changes; the ${...} expressions stay.

function squeezeCssText(raw, first, last) {
  let text = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?([{};,]) ?/g, '$1')
  if (first) text = text.trimStart()
  if (last) text = text.trimEnd()
  return text
}

function cssTemplates(ast) {
  const found = []
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (node.type === 'TaggedTemplateExpression' && node.tag.type === 'Identifier' && node.tag.name === 'css') {
      found.push(node.quasi)
    }
    for (const key in node) {
      if (key === 'type') continue
      const value = node[key]
      if (value && typeof value === 'object') visit(value)
    }
  }
  visit(ast)
  return found
}

function squeezeCss(code, id) {
  const edits = []
  for (const template of cssTemplates(parseAst(code, { lang: 'ts' }, id))) {
    const parts = template.quasis
    parts.forEach((part, index) => {
      const raw = part.value.raw
      // The parser's span of a template part may include its delimiter
      // (` or } at the start); the raw text tells where it really begins.
      const start = code.startsWith(raw, part.start)
        ? part.start
        : code.startsWith(raw, part.start + 1)
          ? part.start + 1
          : -1
      if (start < 0) throw new Error(`${path.relative(root, id)}: css-Template nicht wiedergefunden.`)
      const text = squeezeCssText(raw, index === 0, index === parts.length - 1)
      if (text !== raw) edits.push({ start, end: start + raw.length, text })
    })
  }
  if (edits.length === 0) return null
  edits.sort((a, b) => b.start - a.start)
  let out = code
  for (const edit of edits) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  return out
}

const squeezeCssPlugin = {
  name: 'squeeze-css',
  transform(code, id) {
    if (!id.endsWith('.ts') || id.includes('node_modules') || !code.includes('css`')) return null
    const squeezed = squeezeCss(code, id)
    return squeezed === null ? null : { code: squeezed, map: null }
  },
}

// --- Bundling -------------------------------------------------------------------

async function bundleBlocks(entries) {
  const bundle = await rolldown({
    input: Object.fromEntries(entries.map((entry) => [entry.type, entry.file])),
    cwd: root,
    platform: 'browser',
    tsconfig: TSCONFIG,
    plugins: [squeezeCssPlugin],
    logLevel: 'warn',
  })
  try {
    const { output } = await bundle.generate({
      format: 'cjs',
      exports: 'named',
      esModule: false,
      generatedCode: { symbols: false },
      minify: true,
      topLevelVar: true,
      comments: false,
      sourcemap: false,
      entryFileNames: '[name].js',
      chunkFileNames: 'chunk-[name]-[hash].js',
    })
    return output.filter((item) => item.type === 'chunk')
  } finally {
    await bundle.close()
  }
}

// --- From rolldown's chunks to the parts of runtime.json ------------------------

const MODULE_TAG = /^Object\.defineProperty\(exports,Symbol\.toStringTag,\{value:`Module`\}\);?/
const CHUNK_REQUIRE = /require\(["']\.\/([^"']+)["']\)/g
const ONE_EXPORT =
  /Object\.defineProperty\(exports,"([\w$]+)",\{enumerable:!0,get:function\(\)\{return ?([^{}]*)\}\}\)/g
const EXPORT_RUN =
  /(?:Object\.defineProperty\(exports,"[\w$]+",\{enumerable:!0,get:function\(\)\{return ?[^{}]*\}\}\),?)+/g

function foldExports(code) {
  return code.replace(EXPORT_RUN, (run) => {
    const getters = [...run.matchAll(ONE_EXPORT)].map(([, name, value]) => `${name}:()=>${value}`)
    return `__ff(exports,{${getters.join(',')}})${run.endsWith(',') ? ',' : ''}`
  })
}

function chunkCode(chunk, idOf) {
  let code = chunk.code.replace(MODULE_TAG, '')
  code = code.replace(CHUNK_REQUIRE, (_, file) => `require(${idOf(file)})`)
  code = foldExports(code).trim()
  if (/require\(["']/.test(code)) throw new Error(`${chunk.fileName}: ein require blieb unaufgeloest.`)
  if (/\bimport\(/.test(code)) throw new Error(`${chunk.fileName}: der Lader kennt kein dynamisches import().`)
  if (code.includes('Object.defineProperty(exports,')) {
    console.warn(`buildRuntime: ${chunk.fileName}: nicht jeder Export liess sich in __ff falten.`)
  }
  return code
}

function runtimeParts(chunks, entries) {
  // Numbered by name, not by the order rolldown emits them, so the numbers hold
  // still between two builds of the same code.
  const sorted = [...chunks].sort(
    (a, b) => a.name.localeCompare(b.name, 'en') || a.fileName.localeCompare(b.fileName, 'en'),
  )
  const ids = new Map(sorted.map((chunk, index) => [chunk.fileName, index]))
  const idOf = (file) => {
    const id = ids.get(file)
    if (id === undefined) throw new Error(`Unbekannter Teil "${file}".`)
    return id
  }
  for (const chunk of sorted) {
    if (chunk.dynamicImports.length > 0)
      throw new Error(`${chunk.fileName}: der Lader kennt kein dynamisches import().`)
  }

  const blocks = {}
  for (const entry of entries) {
    const chunk = sorted.find((item) => item.isEntry && item.name === entry.type)
    if (!chunk) throw new Error(`Fuer den Baustein "${entry.type}" entstand kein Teil.`)
    blocks[entry.type] = idOf(chunk.fileName)
  }

  return {
    chunks: sorted.map((chunk) => ({ code: chunkCode(chunk, idOf), imports: chunk.imports.map(idOf) })),
    blocks,
    order: entries.map((entry) => entry.type),
  }
}

// --- Main ------------------------------------------------------------------------

const started = Date.now()
const entries = [HOST_ENTRY, ...blockEntries()]
const parts = runtimeParts(await bundleBlocks(entries), entries)
const json = JSON.stringify(parts)

fs.mkdirSync(path.dirname(OUT), { recursive: true })
const unchanged = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === json
if (!unchanged) fs.writeFileSync(OUT, json)

const kb = Math.round(Buffer.byteLength(json) / 1024)
console.log(
  `Laufzeit: ${entries.length - 1} Bausteine in ${parts.chunks.length} Teilen, ${kb} KB` +
    ` -> ${path.relative(root, OUT)}${unchanged ? ' (unveraendert)' : ''}, ${Date.now() - started} ms`,
)
