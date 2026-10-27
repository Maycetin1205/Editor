import { css } from 'lit'
import { frameStyle } from './style/frame'
import { searchStyle } from './style/search'
import { rowsStyle } from './style/rows'
import { rowAskStyle } from './style/rowAsk'
import { cellsStyle } from './style/cells'
import { headStyle } from './style/head'
import { columnPickerStyle } from './style/columnPicker'
import { footStyle } from './style/foot'

// One sheet whose parts keep this order: the head cell rule overrides the line
// height and wrapping of the shared cell rule, so it has to come after it.
export const tableStyle = css`${frameStyle}${searchStyle}${rowsStyle}${rowAskStyle}${cellsStyle}${headStyle}${columnPickerStyle}${footStyle}`
