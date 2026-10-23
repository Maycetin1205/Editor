export function warn(what: string, detail?: unknown): void {
  if (detail === undefined) console.warn('[ff]', what)
  else console.warn('[ff]', what, detail)
}
