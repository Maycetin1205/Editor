import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ['control'],
      tracking: ['label'],
    },
    classGroups: {
      'font-size': [{ text: ['ui', 'ui-title', 'dense', 'label', 'title'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
