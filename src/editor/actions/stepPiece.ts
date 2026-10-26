import type { StepKind } from '../../core/data/steps/steps'
import { confirmPiece, confirmTab } from './confirmPiece'
import type { StepPiece, StepTab, StepTabPiece } from './piece'
import { popupClosePiece, popupOpenPiece, popupTab } from './popupPiece'
import { getTab, putTab, relationPiece } from './relationPiece'
import { startToolPiece, toolTab } from './startToolPiece'

export type { StepContext, StepTab } from './piece'

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
