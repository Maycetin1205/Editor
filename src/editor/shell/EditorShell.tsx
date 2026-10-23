import { useKeyboardShortcuts } from '../state/useKeyboardShortcuts'
import { useView } from '../state/useView'
import { Canvas } from '../canvas/Canvas'
import { OpenCalculationWindow } from '../canvas/CalculationWindow'
import { OpenSplitWindow } from '../canvas/SplitWindow'
import { OpenStepWindow } from '../actions/ActionsSection'
import { LookupColumns } from '../canvas/LookupColumns'
import { Sidebar } from '../sidebar/Sidebar'
import { DataWindow } from '../data/DataWindow'
import { Inspector } from '../inspector/Inspector'
import { Toolbar } from './Toolbar'

export function EditorShell() {
  useKeyboardShortcuts()
  const view = useView()

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

      {view.dataWindow && <DataWindow onClose={() => view.showData(false)} />}

      <LookupColumns />
      <OpenCalculationWindow />
      <OpenSplitWindow />
      <OpenStepWindow />
    </div>
  )
}
