const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

// Short ids, unique within a mask: "b_k3x9a2m1".
export function newId(prefix: string): string {
  let body = ''
  for (let i = 0; i < 8; i++) body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `${prefix}_${body}`
}

// A name not yet taken: "Fenster", "Fenster 2", "Fenster 3".
export function freeName(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((name) => name.trim().toLocaleLowerCase('de')))
  let name = base
  for (let n = 2; used.has(name.toLocaleLowerCase('de')); n++) name = `${base} ${n}`
  return name
}
