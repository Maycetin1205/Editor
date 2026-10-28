// Every layer warns the same way, so a warning of the mask can be found in
// the console of SoftEngine by its prefix.
export function warn(what: string, detail?: unknown): void {
  if (detail === undefined) console.warn('[ff]', what)
  else console.warn('[ff]', what, detail)
}
