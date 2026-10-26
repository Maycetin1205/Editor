import type { ComponentType } from 'react'
import type { RelationTemplate } from '../../core/data/relations'
import type { Step, StepKind } from '../../core/data/steps/steps'
import type { Reach } from '../origin/reach'

export type StepTab = 'GET' | 'PUT' | 'TOOL' | 'POPUP' | 'ASK'

export interface StepContext {
  relations: readonly RelationTemplate[]
  popups: readonly { value: string; name: string }[]
  reach: Omit<Reach, 'steps'>
}

export interface StepWords {
  words: string
  short: string
  known: boolean
}

type StepOf<K extends StepKind> = Step & { kind: K }

// What the editor says and shows about one kind of step.
export interface StepSummary<K extends StepKind> {
  words(step: StepOf<K>, context: StepContext): StepWords
  tab(step: StepOf<K>, context: StepContext): StepTab
}

export interface StepBodyProps {
  step: Step
  context: StepContext
  reach: Reach
  onChange: (step: Step) => void
}

export interface StepTabDef {
  key: StepTab
  name: string
  count?: (context: StepContext) => number
  start: (id: string, step: Step | undefined, context: StepContext) => Step
  Body: ComponentType<StepBodyProps>
}
