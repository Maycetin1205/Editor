import type { ComponentType } from 'react'
import type { RelationTemplate } from '../../core/data/relations'
import type { Step, StepKind } from '../../core/data/steps/steps'
import type { Reach } from '../origin/reach'
import { confirmPiece, confirmTab } from './confirmPiece'
import { popupClosePiece, popupOpenPiece, popupTab } from './popupPiece'
import { getTab, putTab, relationPiece } from './relationPiece'
import { startToolPiece, toolTab } from './startToolPiece'

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

export interface StepPiece<K extends StepKind> {
  words(step: StepOf<K>, context: StepContext): StepWords
  tab(step: StepOf<K>, context: StepContext): StepTab
}

export interface StepBodyProps {
  step: Step
  context: StepContext
  reach: Reach
  onChange: (step: Step) => void
}

export interface StepTabPiece {
  key: StepTab
  name: string
  count?: (context: StepContext) => number
  start: (id: string, step: Step | undefined, context: StepContext) => Step
  Body: ComponentType<StepBodyProps>
}

const STEP_PIECES: { [K in StepKind]: StepPiece<K> } = {
  RELATION: relationPiece,
  POPUP_OPEN: popupOpenPiece,
  POPUP_CLOSE: popupClosePiece,
  CONFIRM: confirmPiece,
  START_TOOL: startToolPiece,
}

const TABS: { [T in StepTab]: StepTabPiece } = {
  GET: getTab,
  PUT: putTab,
  TOOL: toolTab,
  POPUP: popupTab,
  ASK: confirmTab,
}

export const STEP_TABS: readonly StepTabPiece[] = Object.values(TABS)

export const NEW_STEP_TAB: StepTab = 'PUT'

export function stepPiece(kind: StepKind): StepPiece<StepKind> {
  return STEP_PIECES[kind]
}

export function stepTab(key: StepTab): StepTabPiece {
  return TABS[key]
}
