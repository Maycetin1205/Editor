import type { StepKind } from '../../core/data/steps/steps'
import { confirmSummary, confirmTab } from './confirmStep'
import type { StepSummary, StepTab, StepTabDef } from './stepTypes'
import { popupCloseSummary, popupOpenSummary, popupTab } from './popupStep'
import { getTab, putAddTab, putTab, relationSummary } from './relationStep'
import { startToolSummary, toolTab } from './startToolStep'

export type { StepContext, StepTab } from './stepTypes'

const STEP_SUMMARIES: { [K in StepKind]: StepSummary<K> } = {
  RELATION: relationSummary,
  POPUP_OPEN: popupOpenSummary,
  POPUP_CLOSE: popupCloseSummary,
  CONFIRM: confirmSummary,
  START_TOOL: startToolSummary,
}

const TABS: { [T in StepTab]: StepTabDef } = {
  GET: getTab,
  PUT: putTab,
  PUTADD: putAddTab,
  TOOL: toolTab,
  POPUP: popupTab,
  ASK: confirmTab,
}

export const STEP_TABS: readonly StepTabDef[] = Object.values(TABS)

export const NEW_STEP_TAB: StepTab = 'PUT'

export function stepSummary(kind: StepKind): StepSummary<StepKind> {
  return STEP_SUMMARIES[kind]
}

export function stepTab(key: StepTab): StepTabDef {
  return TABS[key]
}
