import type { IconName } from './icons'
import { IDB_CREATE, IDB_WRITE, type RelationData, type RelationVerb } from './relations'
import { idbParam, sourceKind, withoutTablePrefix } from './sourceKinds'
import { positionOf, type FieldType, type SourceData } from './sources'

// An action is what happens on an event of a block (a click, a card moved):
// a list of steps that run one after the other. A step that fails ends the
// action. Each kind of step is a class that describes and runs itself.

// Where a value comes from when a step runs.
export type ValueBinding =
  | { from: 'fixed'; value: string }
  // A field of the current record of a source.
  | { from: 'field'; source: string; field: string }
  // What the user typed into a Feld block.
  | { from: 'input'; block: string }
  // A value the event brings along, e.g. the column a card was dropped on.
  | { from: 'event'; key: string }
  // The answer of an earlier step of the same action.
  | { from: 'result'; step: string }
  | { from: 'now'; part: 'date' | 'time' }
  // A variable SoftEngine delivers with the data (VARArrays).
  | { from: 'variable'; name: string }

export const fixed = (value: string): ValueBinding => ({ from: 'fixed', value })

export type ConditionOp = 'eq' | 'ne' | 'contains' | 'filled' | 'empty'

export const CONDITION_OPS: readonly { value: ConditionOp; label: string; unary: boolean }[] = [
  { value: 'eq', label: 'ist gleich', unary: false },
  { value: 'ne', label: 'ist nicht', unary: false },
  { value: 'contains', label: 'enthält', unary: false },
  { value: 'filled', label: 'ist ausgefüllt', unary: true },
  { value: 'empty', label: 'ist leer', unary: true },
]

export interface ConditionData {
  left: ValueBinding
  op: ConditionOp
  right: ValueBinding
}

export function conditionHolds(condition: ConditionData, resolve: (binding: ValueBinding) => string): boolean {
  const fold = (text: string): string => text.trim().toLocaleLowerCase('de')
  const left = fold(resolve(condition.left))
  if (condition.op === 'filled') return left !== ''
  if (condition.op === 'empty') return left === ''
  const right = fold(resolve(condition.right))
  if (condition.op === 'eq') return left === right
  if (condition.op === 'ne') return left !== right
  return left.includes(right)
}

export type MessageTone = 'success' | 'info' | 'warning' | 'danger'

interface StepBase {
  id: string
  // Runs only while the condition holds.
  when?: ConditionData
}

export interface RelationStep extends StepBase {
  kind: 'relation'
  relation: string
  params: ValueBinding[]
  extra: ValueBinding[]
}

// Which record a step writes to: the current one of the source, or the one
// an earlier "Satz anlegen" created.
export type RecordTarget = { from: 'current' } | { from: 'result'; step: string }

export interface WriteFieldStep extends StepBase {
  kind: 'writeField'
  source: string
  record: RecordTarget
  field: string
  value: ValueBinding
}

export interface CreateRecordStep extends StepBase {
  kind: 'createRecord'
  source: string
}

export interface StartToolStep extends StepBase {
  kind: 'startTool'
  number: string
  params: ValueBinding[]
}

export interface OpenDialogStep extends StepBase {
  kind: 'openDialog'
  page: string
}

export interface CloseDialogStep extends StepBase {
  kind: 'closeDialog'
}

export interface ConfirmStep extends StepBase {
  kind: 'confirm'
  title: string
  text: string
  okLabel: string
}

export interface MessageStep extends StepBase {
  kind: 'message'
  text: string
  tone: MessageTone
}

export interface ReloadStep extends StepBase {
  kind: 'reload'
}

export interface ResetInputsStep extends StepBase {
  kind: 'resetInputs'
}

export type StepData =
  | RelationStep
  | WriteFieldStep
  | CreateRecordStep
  | StartToolStep
  | OpenDialogStep
  | CloseDialogStep
  | ConfirmStep
  | MessageStep
  | ReloadStep
  | ResetInputsStep

export type StepKindId = StepData['kind']

export interface CallResult {
  ok: boolean
  value: string
  raw?: unknown
  error?: string
}

// What a running step may ask of the mask it runs in.
export interface StepEnv {
  resolve(binding: ValueBinding): string
  source(id: string): SourceData | undefined
  relation(id: string): RelationData | undefined
  // The record number of the current record of a source, '' when none is chosen.
  recordKey(sourceId: string): string
  result(stepId: string): string
  call(verb: RelationVerb, nr: string, params: string[]): Promise<CallResult>
  startTool(number: string, params: string[]): boolean
  // Tells the mask what was written, so it shows before SoftEngine delivers it.
  wrote(sourceId: string, recordKey: string, code: string, value: string): void
  created(sourceId: string, recordKey: string): void
  openDialog(pageId: string): void
  closeDialog(): void
  confirm(title: string, text: string, okLabel: string): Promise<boolean>
  notify(text: string, tone: MessageTone): void
  reload(): void
  resetInputs(): void
}

export type StepOutcome =
  | { ok: true; value?: string; raw?: unknown; wrote?: boolean }
  // quiet: the user said no; nothing went wrong.
  | { ok: false; error: string; quiet?: boolean }

// What the editor knows by name when it describes a step.
export interface StepNames {
  source(id: string): string
  field(sourceId: string, ref: string): string
  relation(id: string): RelationData | undefined
  page(id: string): string
  input(blockId: string): string
  eventValue(key: string): string
  stepNumber(stepId: string): number
}

export interface FieldUse {
  source: string
  ref: string
}

export function describeBinding(binding: ValueBinding, names: StepNames): string {
  switch (binding.from) {
    case 'fixed':
      return binding.value === '' ? 'leer' : `„${binding.value}“`
    case 'field':
      return binding.field === ''
        ? 'Feld wählen'
        : `${names.field(binding.source, binding.field) || '?'} (${names.source(binding.source) || '?'})`
    case 'input':
      return `Eingabe „${names.input(binding.block) || '?'}“`
    case 'event':
      return names.eventValue(binding.key) || binding.key
    case 'result': {
      const nr = names.stepNumber(binding.step)
      return nr > 0 ? `Ergebnis von Schritt ${nr}` : 'Ergebnis eines Schritts'
    }
    case 'now':
      return binding.part === 'date' ? 'Datum von heute' : 'Uhrzeit von jetzt'
    case 'variable':
      return `Variable ${binding.name || '?'}`
  }
}

export abstract class StepType<S extends StepData = StepData> {
  abstract readonly kind: S['kind']
  abstract readonly label: string
  abstract readonly icon: IconName
  abstract readonly description: string
  // SoftEngine is asked or told something.
  readonly talksToSoftEngine: boolean = false

  abstract create(id: string): S
  abstract summary(step: S, names: StepNames): string
  abstract run(step: S, env: StepEnv): Promise<StepOutcome>

  // What keeps the step from working, in words for the user.
  problems(_step: S, _names: StepNames): string[] {
    return []
  }

  bindings(_step: S): ValueBinding[] {
    return []
  }

  // Fields of sources the step reads or writes besides its bindings.
  uses(_step: S): FieldUse[] {
    return []
  }
}

class RelationStepType extends StepType<RelationStep> {
  readonly kind = 'relation'
  readonly label = 'Relation ausführen'
  readonly icon = 'zap'
  readonly description = 'Ruft eine GET-, PUT- oder PUTADD-Relation von SoftEngine auf.'
  override readonly talksToSoftEngine = true

  create(id: string): RelationStep {
    return { id, kind: 'relation', relation: '', params: [], extra: [] }
  }

  summary(step: RelationStep, names: StepNames): string {
    const relation = names.relation(step.relation)
    return relation ? `${relation.name} (${relation.verb.replace('_RELATION', '')} ${relation.nr})` : 'Relation wählen'
  }

  override problems(step: RelationStep, names: StepNames): string[] {
    return names.relation(step.relation) ? [] : ['Es ist keine Relation gewählt.']
  }

  override bindings(step: RelationStep): ValueBinding[] {
    return [...step.params, ...step.extra]
  }

  async run(step: RelationStep, env: StepEnv): Promise<StepOutcome> {
    const relation = env.relation(step.relation)
    if (!relation) return { ok: false, error: 'Die Relation des Schritts gibt es nicht mehr.' }
    const params = [...step.params, ...step.extra].map((binding) => env.resolve(binding))
    const answer = await env.call(relation.verb, relation.nr, params)
    if (!answer.ok) return { ok: false, error: `${relation.name}: ${answer.error ?? 'gescheitert'}` }
    return { ok: true, value: answer.value, raw: answer.raw, wrote: relation.verb !== 'GET_RELATION' }
  }
}

function recordOf(target: RecordTarget, sourceId: string, env: StepEnv): string {
  return (target.from === 'current' ? env.recordKey(sourceId) : env.result(target.step)).trim()
}

// The value as relation 174 takes it: cut to the length of the field.
export function writeParams(source: SourceData, code: string, type: FieldType, record: string, value: string) {
  const [bare] = withoutTablePrefix([code], source.table)
  const place = positionOf(bare)
  if (!place) return null
  const text = value.slice(0, place.len)
  return {
    text,
    params: [String(place.pos), String(place.len), IDB_WRITE.fieldKind[type], record, idbParam(source.table), text],
  }
}

class WriteFieldStepType extends StepType<WriteFieldStep> {
  readonly kind = 'writeField'
  readonly label = 'Feld schreiben'
  readonly icon = 'pencil'
  readonly description = 'Schreibt einen Wert in ein Feld eines IDB-Satzes (Relation 174).'
  override readonly talksToSoftEngine = true

  create(id: string): WriteFieldStep {
    return { id, kind: 'writeField', source: '', record: { from: 'current' }, field: '', value: fixed('') }
  }

  summary(step: WriteFieldStep, names: StepNames): string {
    if (step.source === '' || step.field === '') return 'Feld wählen'
    return `${names.field(step.source, step.field) || '?'} = ${describeBinding(step.value, names)}`
  }

  override problems(step: WriteFieldStep): string[] {
    const out: string[] = []
    if (step.source === '') out.push('Es ist keine Datenquelle gewählt.')
    else if (step.field === '') out.push('Es ist kein Feld gewählt.')
    return out
  }

  override bindings(step: WriteFieldStep): ValueBinding[] {
    return [step.value]
  }

  override uses(step: WriteFieldStep): FieldUse[] {
    return step.source === '' || step.field === '' ? [] : [{ source: step.source, ref: step.field }]
  }

  async run(step: WriteFieldStep, env: StepEnv): Promise<StepOutcome> {
    const source = env.source(step.source)
    if (!source) return { ok: false, error: 'Die Datenquelle des Schritts gibt es nicht mehr.' }
    if (!sourceKind(source.kind).writable) {
      return { ok: false, error: `In „${source.name}“ kann die Maske nicht schreiben: nur IDB-Tabellen.` }
    }
    const field = source.fields.find((candidate) => candidate.code === step.field)
    const record = recordOf(step.record, step.source, env)
    if (record === '') return { ok: false, error: `Es ist kein Satz aus „${source.name}“ gewählt.` }
    const write = writeParams(source, step.field, field?.type ?? 'text', record, env.resolve(step.value))
    if (!write) return { ok: false, error: `Das Feld ${step.field} hat keine Position und Länge.` }
    const answer = await env.call(IDB_WRITE.verb, IDB_WRITE.nr, write.params)
    if (!answer.ok) return { ok: false, error: `${field?.name ?? step.field} schreiben: ${answer.error ?? 'gescheitert'}` }
    env.wrote(step.source, record, step.field, write.text)
    return { ok: true, value: write.text, wrote: true }
  }
}

class CreateRecordStepType extends StepType<CreateRecordStep> {
  readonly kind = 'createRecord'
  readonly label = 'Satz anlegen'
  readonly icon = 'plus'
  readonly description = 'Legt einen neuen Satz in einer IDB-Tabelle an (Relation 640). Das Ergebnis ist die Satznummer.'
  override readonly talksToSoftEngine = true

  create(id: string): CreateRecordStep {
    return { id, kind: 'createRecord', source: '' }
  }

  summary(step: CreateRecordStep, names: StepNames): string {
    return step.source === '' ? 'Datenquelle wählen' : `in „${names.source(step.source) || '?'}“`
  }

  override problems(step: CreateRecordStep): string[] {
    return step.source === '' ? ['Es ist keine Datenquelle gewählt.'] : []
  }

  async run(step: CreateRecordStep, env: StepEnv): Promise<StepOutcome> {
    const source = env.source(step.source)
    if (!source) return { ok: false, error: 'Die Datenquelle des Schritts gibt es nicht mehr.' }
    if (!sourceKind(source.kind).writable) {
      return { ok: false, error: `In „${source.name}“ kann die Maske keinen Satz anlegen: nur IDB-Tabellen.` }
    }
    const answer = await env.call(IDB_CREATE.verb, IDB_CREATE.nr, [idbParam(source.table)])
    const record = answer.value.trim()
    // The answer is the new record number; anything else is SoftEngine saying no.
    if (!answer.ok || record === '' || record.length > 10 || /fehler|error|nicht|ungültig/i.test(record)) {
      return { ok: false, error: `Satz in „${source.name}“ anlegen: ${answer.error ?? (record || 'keine Satznummer')}` }
    }
    env.created(step.source, record)
    return { ok: true, value: record, raw: answer.raw, wrote: true }
  }
}

class StartToolStepType extends StepType<StartToolStep> {
  readonly kind = 'startTool'
  readonly label = 'Werkzeug starten'
  readonly icon = 'wrench'
  readonly description = 'Startet ein Werkzeug von SoftEngine (START_TOOL) mit seiner Nummer.'
  override readonly talksToSoftEngine = true

  create(id: string): StartToolStep {
    return { id, kind: 'startTool', number: '', params: [] }
  }

  summary(step: StartToolStep): string {
    return step.number.trim() === '' ? 'Nummer eintragen' : `Nr. ${step.number.trim()}`
  }

  override problems(step: StartToolStep): string[] {
    return step.number.trim() === '' ? ['Es ist keine Werkzeugnummer eingetragen.'] : []
  }

  override bindings(step: StartToolStep): ValueBinding[] {
    return step.params
  }

  run(step: StartToolStep, env: StepEnv): Promise<StepOutcome> {
    const number = step.number.trim()
    if (number === '') return Promise.resolve({ ok: false, error: 'Dem Schritt fehlt die Werkzeugnummer.' })
    const started = env.startTool(
      number,
      step.params.map((binding) => env.resolve(binding)),
    )
    return Promise.resolve(
      started ? { ok: true } : { ok: false, error: `Werkzeug ${number} ließ sich nicht starten: keine Verbindung.` },
    )
  }
}

class OpenDialogStepType extends StepType<OpenDialogStep> {
  readonly kind = 'openDialog'
  readonly label = 'Fenster öffnen'
  readonly icon = 'app-window'
  readonly description = 'Öffnet ein Fenster der Maske über der Seite.'

  create(id: string): OpenDialogStep {
    return { id, kind: 'openDialog', page: '' }
  }

  summary(step: OpenDialogStep, names: StepNames): string {
    return step.page === '' ? 'Fenster wählen' : `„${names.page(step.page) || '?'}“`
  }

  override problems(step: OpenDialogStep, names: StepNames): string[] {
    return names.page(step.page) === '' ? ['Es ist kein Fenster gewählt.'] : []
  }

  run(step: OpenDialogStep, env: StepEnv): Promise<StepOutcome> {
    env.openDialog(step.page)
    return Promise.resolve({ ok: true })
  }
}

class CloseDialogStepType extends StepType<CloseDialogStep> {
  readonly kind = 'closeDialog'
  readonly label = 'Fenster schließen'
  readonly icon = 'x'
  readonly description = 'Schließt das offene Fenster.'

  create(id: string): CloseDialogStep {
    return { id, kind: 'closeDialog' }
  }

  summary(): string {
    return ''
  }

  run(_step: CloseDialogStep, env: StepEnv): Promise<StepOutcome> {
    env.closeDialog()
    return Promise.resolve({ ok: true })
  }
}

class ConfirmStepType extends StepType<ConfirmStep> {
  readonly kind = 'confirm'
  readonly label = 'Rückfrage'
  readonly icon = 'circle-help'
  readonly description = 'Fragt nach, bevor es weitergeht. Bei „Abbrechen“ endet die Aktion.'

  create(id: string): ConfirmStep {
    return { id, kind: 'confirm', title: 'Sind Sie sicher?', text: '', okLabel: 'Ja' }
  }

  summary(step: ConfirmStep): string {
    return `„${step.title}“`
  }

  async run(step: ConfirmStep, env: StepEnv): Promise<StepOutcome> {
    const yes = await env.confirm(step.title, step.text, step.okLabel)
    return yes ? { ok: true } : { ok: false, error: '', quiet: true }
  }
}

class MessageStepType extends StepType<MessageStep> {
  readonly kind = 'message'
  readonly label = 'Meldung zeigen'
  readonly icon = 'message-square'
  readonly description = 'Zeigt kurz eine Meldung am Rand der Maske.'

  create(id: string): MessageStep {
    return { id, kind: 'message', text: 'Gespeichert', tone: 'success' }
  }

  summary(step: MessageStep): string {
    return `„${step.text}“`
  }

  run(step: MessageStep, env: StepEnv): Promise<StepOutcome> {
    env.notify(step.text, step.tone)
    return Promise.resolve({ ok: true })
  }
}

class ReloadStepType extends StepType<ReloadStep> {
  readonly kind = 'reload'
  readonly label = 'Daten neu laden'
  readonly icon = 'refresh-cw'
  readonly description = 'Holt frische Daten von SoftEngine. Nach dem Schreiben geschieht das von selbst.'
  override readonly talksToSoftEngine = true

  create(id: string): ReloadStep {
    return { id, kind: 'reload' }
  }

  summary(): string {
    return ''
  }

  run(_step: ReloadStep, env: StepEnv): Promise<StepOutcome> {
    env.reload()
    return Promise.resolve({ ok: true })
  }
}

class ResetInputsStepType extends StepType<ResetInputsStep> {
  readonly kind = 'resetInputs'
  readonly label = 'Eingaben leeren'
  readonly icon = 'eraser'
  readonly description = 'Setzt die Felder der Maske auf ihren Anfang zurück, z. B. nach dem Anlegen.'

  create(id: string): ResetInputsStep {
    return { id, kind: 'resetInputs' }
  }

  summary(): string {
    return ''
  }

  run(_step: ResetInputsStep, env: StepEnv): Promise<StepOutcome> {
    env.resetInputs()
    return Promise.resolve({ ok: true })
  }
}

const TYPES: { [K in StepKindId]: StepType<Extract<StepData, { kind: K }>> } = {
  writeField: new WriteFieldStepType(),
  createRecord: new CreateRecordStepType(),
  relation: new RelationStepType(),
  startTool: new StartToolStepType(),
  openDialog: new OpenDialogStepType(),
  closeDialog: new CloseDialogStepType(),
  confirm: new ConfirmStepType(),
  message: new MessageStepType(),
  reload: new ReloadStepType(),
  resetInputs: new ResetInputsStepType(),
}

export const STEP_TYPES: readonly StepType[] = Object.values(TYPES) as unknown as StepType[]

export function stepType(kind: StepKindId): StepType {
  return TYPES[kind] as unknown as StepType
}

// Every binding of a step, its condition included.
export function allBindings(step: StepData): ValueBinding[] {
  const own = stepType(step.kind).bindings(step)
  return step.when ? [...own, step.when.left, step.when.right] : own
}
