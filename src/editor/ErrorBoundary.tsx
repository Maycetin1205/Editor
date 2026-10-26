import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/editor/widgets/Button'
import { downloadFile } from './state/downloadFile'
import { LIBRARY_STORAGE_KEY, MASK_STORAGE_KEY } from './state/maskStorage'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
}

// The mask and the library as the browser holds them, as files the editor
// opens again with "Maske laden" and "Bibliothek laden".
function downloadBackup(): void {
  const mask = stored(MASK_STORAGE_KEY)
  const library = stored(LIBRARY_STORAGE_KEY)
  if (mask !== null) downloadFile(`aufbau-sicherung-maske-${stamp()}.json`, mask, 'application/json')
  if (library !== null) downloadFile(`aufbau-sicherung-bibliothek-${stamp()}.json`, library, 'application/json')
}

function resetMask(): void {
  try {
    localStorage.removeItem(MASK_STORAGE_KEY)
  } catch {
    // Without storage there is nothing to reset.
  }
  location.reload()
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Editor abgestuerzt:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    const hasBackup = stored(MASK_STORAGE_KEY) !== null
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-ground p-6 text-ink">
        <div className="flex max-w-xl flex-col gap-3 rounded border border-line bg-panel p-5">
          <h1 className="text-title font-bold">Der Editor ist abgestürzt</h1>
          <p className="text-ui text-ink-2">
            Die Maske liegt weiter im Browser. „Neu laden“ öffnet sie wieder. Stürzt der Editor dann noch einmal ab,
            erst die Sicherung herunterladen und dann die Maske im Browser zurücksetzen.
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-ground p-3 text-dense text-ink-2">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              kind="primary"
              onClick={() => {
                location.reload()
              }}
            >
              Neu laden
            </Button>
            <Button onClick={downloadBackup} disabled={!hasBackup}>
              Sicherung herunterladen
            </Button>
            <Button
              kind="risk"
              disabled={!hasBackup}
              onClick={() => {
                if (!confirm('Die Maske im Browser wird verworfen und der Editor neu geladen. Fortfahren?')) return
                resetMask()
              }}
            >
              Maske im Browser zurücksetzen
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
