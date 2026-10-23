import type { Property } from '../../core/block/property'

export function narrow(n: number, property: Property<unknown>): number {
  const min = property.min ?? Number.NEGATIVE_INFINITY
  const max = property.max ?? Number.POSITIVE_INFINITY
  return Math.min(max, Math.max(min, n))
}
