export const REVEAL = 'ff-reveal'

// Asks the blocks around an element that hide some of their blocks (the
// pages of a Reiter) to show the one that holds it. They do it at once, so
// that a focus right after it lands.
export function revealSelf(el: HTMLElement): void {
  el.dispatchEvent(new Event(REVEAL, { bubbles: true, composed: true }))
}
