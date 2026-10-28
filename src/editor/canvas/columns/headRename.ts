import type { HeadPlace } from '../../../blocks/base/headsReport'
import { listDefaultTitle, withInner, type ListBinding } from '../../../core/block/blockType'
import type { BlockNode } from '../../../core/block/tree'
import type { EditorStore } from '../../state/EditorStore'

// Renames an entry, or an inner entry, right in its head. An emptied title
// falls back to the numbered default.
export function renameHead(editor: EditorStore, block: BlockNode, binding: ListBinding, s: HeadPlace): void {
  s.rename((typed, original) => {
    if (typed === original) return
    const entries = binding.entries(block.values[binding.prop])
    const entry = entries[s.path.index]
    if (entry === undefined) return
    const at = s.path.inner
    if (at === undefined) {
      const next = [...entries]
      next[s.path.index] = binding.withTypedTitle(entry, typed === '' ? listDefaultTitle(binding, s.path.index) : typed)
      editor.updateProperty(block.id, binding.prop, next)
      return
    }
    const inner = binding.inner
    const list = inner ? [...inner.of(entry)] : []
    const own = list[at]
    if (!inner || own === undefined) return
    list[at] = inner.binding.withTypedTitle(own, typed === '' ? listDefaultTitle(inner.binding, at) : typed)
    editor.updateProperty(block.id, binding.prop, withInner(binding, entries, s.path.index, list))
  })
}
