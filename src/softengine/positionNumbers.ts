const MAX_POSITIONS = 999

const MAX_GAP = 100

export type PositionStep = { kind: 'row'; row: Record<string, string> } | { kind: 'gap' } | { kind: 'stop' }

export async function rowsByNumber(
  step: (position: number) => Promise<PositionStep>,
): Promise<Record<string, string>[] | null> {
  const rows: Record<string, string>[] = []
  let gap = 0
  for (let position = 1; position <= MAX_POSITIONS && gap < MAX_GAP; position += 1) {
    const next = await step(position)
    if (next.kind === 'stop') return null
    if (next.kind === 'row') {
      rows.push(next.row)
      gap = 0
    } else {
      gap += 1
    }
  }
  return rows
}
