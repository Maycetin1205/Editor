import type { RuntimeLoadRelation } from '../core/data/deliveries/relationRows'
import { positionParams, type PositionFetch, type RelationAnswer, type RuntimeRelation } from '../core/data/relations'
import { reportTrigger, seWindow } from './bridge'
import { fieldRead } from './data'
import { fetchedRowsFor, setFetchedRows } from './fetchedRows'
import { rowsByNumber, type PositionStep } from './positionNumbers'
import { relationFromList, relationRun } from './relations'

const CUT_POS = '0'

interface GetSource {
  id: string
  name: string
}

const generations = new Map<string, number>()

function emptySource(name: string): void {
  const before = fetchedRowsFor(name)
  setFetchedRows(name, [])
  if (before !== undefined && before.length > 0) reportTrigger()
}

async function question(
  template: RuntimeRelation,
  positions: PositionFetch,
  key: { documentKind: string; documentNumber: string; year: string; archive: string },
  position: number,
  pos: string,
  len: string,
): Promise<RelationAnswer> {
  return relationRun(template, positionParams(positions.slots, { ...key, positionNumber: position, pos, len }), {
    recordAnswer: true,
  })
}

export async function loadRowsPerRelation(
  source: GetSource,
  load: RuntimeLoadRelation,
  giverRow: unknown,
): Promise<void> {
  const gen = (generations.get(source.id) ?? 0) + 1
  generations.set(source.id, gen)

  if (giverRow === undefined) {
    emptySource(source.name)
    return
  }

  const key = {
    documentKind: fieldRead(giverRow, load.documentKindField),
    documentNumber: fieldRead(giverRow, load.documentNumberField),

    year: load.yearField === '' ? '' : fieldRead(giverRow, load.yearField),
    archive: load.archiveField === '' ? '' : fieldRead(giverRow, load.archiveField),
  }

  const template = relationFromList(seWindow().FF_RELATIONS, load.relationId)
  const positions = template?.positions
  if (key.documentKind === '' || key.documentNumber === '' || !template || !positions) {
    emptySource(source.name)
    return
  }

  emptySource(source.name)

  const rows = await rowsByNumber(async (position): Promise<PositionStep> => {
    const answer = await question(template, positions, key, position, CUT_POS, String(positions.answerLength))
    if (generations.get(source.id) !== gen || answer.failed === true) return { kind: 'stop' }
    const record = answer.value

    if (load.endFields.every((field) => fieldRead({ SATZ: record }, field) === '')) return { kind: 'gap' }

    const row: Record<string, string> = { SATZ: record }
    for (const field of load.extraFields) {
      const divider = field.indexOf('_')
      const extra = await question(
        template,
        positions,
        key,
        position,
        field.slice(0, divider),
        field.slice(divider + 1),
      )
      if (generations.get(source.id) !== gen || extra.failed === true) return { kind: 'stop' }
      row[field] = extra.value
    }
    return { kind: 'row', row }
  })

  if (rows !== null && generations.get(source.id) === gen) {
    setFetchedRows(source.name, rows)
    reportTrigger()
  }
}
