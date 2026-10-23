type Warn = (what: string, detail?: unknown) => void

const sink: { warn: Warn } = {
  warn: (what, detail) => {
    console.warn('[ff]', what, ...(detail === undefined ? [] : [detail]))
  },
}

export function wireWarning(warn: Warn): void {
  sink.warn = warn
}

export function warn(what: string, detail?: unknown): void {
  sink.warn(what, detail)
}
