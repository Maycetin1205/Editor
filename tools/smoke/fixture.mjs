// The data source the smoke test binds to and the rows its stand-in for
// SoftEngine hands to the exported mask, in the form src/softengine/data.ts
// reads (SEFileLoop under the alias of the source).

export const SOURCE = {
  id: 'smoke-source',
  name: 'Probe',
  preset: 'file',
  tableId: 'PR',
  fields: [
    { code: 'NAME', name: 'Name' },
    { code: 'ORT', name: 'Ort' },
    { code: 'BETRAG', name: 'Betrag' },
    { code: 'STATUS', name: 'Status' },
    { code: 'DATUM', name: 'Datum' },
    { code: 'ZEIT', name: 'Zeit' },
    { code: 'NR', name: 'Nummer' },
  ],
}

// A source that answers without rows: a block that shows it shows its empty
// state.
export const EMPTY_SOURCE = {
  id: 'smoke-empty',
  name: 'Leer',
  preset: 'file',
  tableId: 'LE',
  fields: [{ code: 'NAME', name: 'Name' }],
}

// Every field shows a value of its own, so a check can tell which field a
// place shows.
export function rows(status) {
  return [1, 2, 3].map((n) => ({
    NAME: `Name-${n}`,
    ORT: `Ort-${n}`,
    BETRAG: `${n}2,50`,
    STATUS: status,
    DATUM: `2${n}.10.2026`,
    ZEIT: `0${n}:30`,
    NR: String(n),
  }))
}

export const fieldName = (code) => SOURCE.fields.find((f) => f.code === code)?.name ?? code

// The value of a field in the first row, as a place should show it.
export const firstValue = (code, status = '') => String(rows(status)[0][code] ?? '')
