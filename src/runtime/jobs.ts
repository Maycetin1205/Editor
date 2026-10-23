import type { JobView } from '../core/data/jobs'
import { warn } from './log'
import { maskState } from './maskState'

const ENDED_KEPT = 200

function ended(job: JobView): boolean {
  return job.endedAt !== undefined
}

export function noteJob(job: JobView): void {
  const known = maskState.jobs.known
  known.set(job.id, job)
  if (ended(job)) {
    const over = [...known.values()].filter(ended).length - ENDED_KEPT
    for (const old of [...known.values()].filter(ended).slice(0, Math.max(0, over))) known.delete(old.id)
  }
  maskState.jobs.listeners.forEach((listener) => {
    try {
      listener(job)
    } catch (error) {
      warn('Beobachter eines Auftrags gescheitert', error)
    }
  })
}

function subscribe(listener: (job: JobView) => void): () => void {
  maskState.jobs.listeners.add(listener)
  return () => {
    maskState.jobs.listeners.delete(listener)
  }
}

// For the developer tools inside SoftEngine: ffAuftraege() lists what the mask
// asked of SoftEngine and how each question ended.
export function exposeJobLog(): void {
  ;(globalThis as { ffAuftraege?: () => JobView[] }).ffAuftraege = () => [...maskState.jobs.known.values()]
}

export function printEndedJobs(): void {
  subscribe((job) => {
    if (ended(job)) console.info('[ff]', job.question, job.state, job.reason ?? '')
  })
}
