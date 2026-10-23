import type { RuntimeGetValue } from '../core/data/deliveries/relationValue'
import { reportTrigger, seWindow } from './bridge'
import { fetchedRowsFor, setFetchedRows } from './fetchedRows'
import { cancelJobs, relationRun, fieldFromAnswer, relationFromList, parameterResolve, resultList } from './relations'

interface ValueSource {
  id: string
  name: string
}

const generations = new Map<string, number>()

const asked = new Map<string, string>()

function rowFromAnswer(value: string, raw: unknown, fields: readonly string[]): Record<string, string> {
  const row: Record<string, string> = {}
  fields.forEach((code, slot) => {
    const fromAnswer = fieldFromAnswer(raw, code)
    row[code] = fromAnswer !== '' ? fromAnswer : slot === 0 ? value : ''
  })
  return row
}

function rowsFromAnswer(value: string, raw: unknown, fields: readonly string[]): Record<string, string>[] {
  const list = resultList(raw)
  const rows =
    list === undefined ? [rowFromAnswer(value, raw, fields)] : list.map((entry) => rowFromAnswer('', entry, fields))
  return rows.filter((row) => Object.values(row).some((v) => v !== ''))
}

export async function fetchValueSource(
  source: ValueSource,
  get: RuntimeGetValue,
  chosen?: (giverId: string) => unknown,
): Promise<void> {
  const gen = (generations.get(source.id) ?? 0) + 1
  generations.set(source.id, gen)

  const relation = relationFromList(seWindow().FF_RELATIONS, get.relationId)

  if (!relation || relation.verb !== 'GET_RELATION') return

  const params = get.parameter.map((binding) =>
    parameterResolve(binding, { context: {}, previousResult: '', ...(chosen ? { chosenRow: chosen } : {}) }),
  )

  const origin = `source ${source.id}`
  const print = JSON.stringify(params)
  if (asked.has(source.id) && asked.get(source.id) !== print) {
    cancelJobs(origin)
    if ((fetchedRowsFor(source.name) ?? []).length > 0) {
      setFetchedRows(source.name, [])
      reportTrigger()
    }
  }
  asked.set(source.id, print)
  if (get.parameter.some((binding, i) => binding.source === 'chosenRow' && params[i] === '')) return

  const answer = await relationRun(relation, params, { origin })
  if (generations.get(source.id) !== gen) return

  if (answer.failed === true) return
  setFetchedRows(source.name, rowsFromAnswer(answer.value, answer.raw, get.fields))
  reportTrigger()
}
