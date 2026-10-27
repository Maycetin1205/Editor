import type { RuntimeQuery } from '../core/data/deliveries/message'
import { reportTrigger } from './bridge'
import { fieldRead } from './fields'
import { setFetchedRows } from './fetchedRows'
import { queryRun } from './relations'
import { rowsOfSource, runtimeSource } from './runtimeSources'

interface QuerySource {
  id: string
  name: string
}

const queries = {
  fetched: new Map<string, string>(),
  inFlight: new Set<string>(),
  // Asked again while a question was on its way: once it is back, ask with
  // what holds then, or the list keeps the rows of the address before.
  again: new Set<string>(),
}

function addressOf(query: RuntimeQuery): string {
  const address = query.restriction?.address
  if (!address) return ''
  const source = runtimeSource(address.sourceId)
  return source ? fieldRead(rowsOfSource(source)[0], address.code) : ''
}

export async function fetchQuerySource(source: QuerySource, query: RuntimeQuery): Promise<void> {
  const address = addressOf(query)
  if (query.restriction?.address && address === '') return
  if (queries.inFlight.has(source.id)) {
    queries.again.add(source.id)
    return
  }
  if (queries.fetched.get(source.id) === address) return
  queries.inFlight.add(source.id)
  try {
    const answer = await queryRun(query, source.name, { documentKind: query.restriction?.documentKind ?? '', address })
    if (answer.rows !== undefined) {
      queries.fetched.set(source.id, address)
      setFetchedRows(source.name, answer.rows)
      reportTrigger()
    }
  } finally {
    queries.inFlight.delete(source.id)
  }
  if (queries.again.delete(source.id)) await fetchQuerySource(source, query)
}
