import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useEditorInstance } from '../state/useEditor'
import { useStoreSelect } from '../state/useStoreSelect'
import { Canvas } from '../canvas/Canvas'
import { OpenCalculationWindow } from '../canvas/calculation/CalculationWindow'
import { OpenSplitWindow } from '../canvas/split/SplitWindow'
import { OpenStepWindow } from '../actions/ActionsSection'
import { LookupColumns } from '../canvas/lookup/LookupColumns'
import { Sidebar } from '../sidebar/Sidebar'
import { DataWindow } from '../data/DataWindow'
import { Inspector } from '../inspector/Inspector'
import { Toolbar } from './Toolbar'

export function EditorShell() {
  useKeyboardShortcuts()
  // The shell reads only the data window of the view; each part below hears
  // the view itself, so a change of the view does not draw the whole editor.
  const view = useEditorInstance().view
  const dataOpen = useStoreSelect(view, (v) => v.dataWindow)
  const startsNewSource = useStoreSelect(view, (v) => v.startsNewSource)

  return (
    <div className="flex h-screen w-screen flex-col bg-ground text-ink">
      <Toolbar />

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 bg-canvas">
          <Canvas />
        </main>
        <Inspector />
      </div>

      {dataOpen && <DataWindow startsNewSource={startsNewSource} onClose={() => view.showData(false)} />}

      <LookupColumns />
      <OpenCalculationWindow />
      <OpenSplitWindow />
      <OpenStepWindow />
    </div>
  )
}
