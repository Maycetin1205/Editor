import { warn } from '../warning'

// Who listens to the line. A listener that throws is warned about and does
// not keep the others from hearing.
export class Watchers<T> {
  private readonly listeners = new Set<(value: T) => void>()

  private readonly failure: string

  constructor(failure: string) {
    this.failure = failure
  }

  add(listener: (value: T) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  tell(value: T): void {
    this.listeners.forEach((listener) => {
      try {
        listener(value)
      } catch (error) {
        warn(this.failure, error)
      }
    })
  }
}
