// Finds import cycles in src, type-only imports included: a cycle of types
// still ties the files together. Fails when there are more than --max groups.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..', 'src')
const maxArg = process.argv.indexOf('--max')
const allowed = maxArg === -1 ? 0 : Number(process.argv[maxArg + 1])

const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
  }
}
walk(root)

const resolve = (from, spec) => {
  let base
  if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else if (spec.startsWith('@/')) base = path.join(root, spec.slice(2))
  else return null
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = base + ext
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  return null
}

const IMPORT =
  /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
const graph = new Map()
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const targets = [...source.matchAll(IMPORT)].map((m) => resolve(file, m[1] ?? m[2] ?? m[3])).filter(Boolean)
  graph.set(file, targets)
}

// Tarjan: every strongly connected group of more than one file is a cycle.
let counter = 0
const index = new Map()
const low = new Map()
const stack = []
const onStack = new Set()
const groups = []
const visit = (file) => {
  index.set(file, counter)
  low.set(file, counter)
  counter++
  stack.push(file)
  onStack.add(file)
  for (const next of graph.get(file) ?? []) {
    if (!index.has(next)) {
      visit(next)
      low.set(file, Math.min(low.get(file), low.get(next)))
    } else if (onStack.has(next)) {
      low.set(file, Math.min(low.get(file), index.get(next)))
    }
  }
  if (low.get(file) !== index.get(file)) return
  const group = []
  let member
  do {
    member = stack.pop()
    onStack.delete(member)
    group.push(member)
  } while (member !== file)
  if (group.length > 1) groups.push(group)
}
for (const file of files) if (!index.has(file)) visit(file)

const rel = (file) => path.relative(root, file).replaceAll('\\', '/')
for (const group of groups.sort((a, b) => b.length - a.length)) {
  console.log(`${group.length} files: ${group.map(rel).sort().join(', ')}`)
}
console.log(`${groups.length} import cycles (allowed: ${allowed})`)
if (groups.length > allowed) process.exit(1)
