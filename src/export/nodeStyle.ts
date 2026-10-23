import type { BlockNode } from '../core/block/tree'
import { gridSlotRead, gridSlotStyle } from '../core/block/grid'
import { areaColumnsStyle } from '../core/block/gridArea'
import { styleAsCss } from '../core/block/styleCss'
import { escapeHtmlAttr } from './serializer'

export function styleAttr(node: BlockNode, isPage: boolean): string {
  if (isPage) return ''
  const css = styleAsCss({
    ...gridSlotStyle(gridSlotRead(node.values)),
    ...areaColumnsStyle(node),
  })
  return css ? ` style="${escapeHtmlAttr(css)}"` : ''
}
