import { MASK_ROOT_CLASS } from '../core/block/frameFit'
import { elementName } from '../core/block/ownText'

const BAR_CLASS = 'ff-infobar'

const MARKUP = '<svg class="ff-infobar-sign" viewBox="0 0 16 16" aria-hidden="true">'
  + '<circle cx="8" cy="8" r="8"></circle><path d="M8 4.5v4"></path>'
  + '<circle class="ff-infobar-dot" cx="8" cy="11.25" r="1"></circle></svg>'
  + '<span class="ff-infobar-text"><span class="ff-infobar-name"></span><span class="ff-infobar-sentence"></span></span>'
  + '<button class="ff-infobar-close" type="button" title="Schließen" aria-label="Schließen">'
  + '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg></button>'

const CONNECTION_NAME = 'SoftEngine'
const CONNECTION_SENTENCE = 'antwortet nicht. Sobald wieder eine Antwort kommt, macht die Maske weiter.'

let bar: HTMLElement | null = null

let holds: 'failure' | 'connection' | null = null

function sheetOf(el: HTMLElement): Element | null {
  return el.closest(`.${MASK_ROOT_CLASS}`) ?? el.ownerDocument.querySelector(`.${MASK_ROOT_CLASS}`)
}

function barFor(el: HTMLElement): HTMLElement | null {
  if (bar?.isConnected) return bar
  const sheet = sheetOf(el)
  if (!sheet) return null
  const made = el.ownerDocument.createElement('div')
  made.className = BAR_CLASS
  made.setAttribute('role', 'alert')
  made.hidden = true
  made.innerHTML = MARKUP
  made.querySelector('.ff-infobar-close')?.addEventListener('click', closeFailure)
  sheet.append(made)
  bar = made
  return made
}

function fill(shown: HTMLElement, name: string, sentence: string): void {
  const nameSpan = shown.querySelector('.ff-infobar-name')
  const sentenceSpan = shown.querySelector('.ff-infobar-sentence')
  if (nameSpan) nameSpan.textContent = `${name}:`
  if (sentenceSpan) sentenceSpan.textContent = ` ${sentence}`
  shown.querySelector('.ff-infobar-text')?.setAttribute('title', `${name}: ${sentence}`)
  shown.hidden = false
}

export function showFailure(el: HTMLElement, sentence: string): void {
  const shown = barFor(el)
  if (!shown) return
  fill(shown, elementName(el), sentence)
  holds = 'failure'
}

export function closeFailure(): void {
  if (bar) bar.hidden = true
  holds = null
}

export function showConnectionLost(): void {
  const shown = typeof document === 'undefined' || !document.body ? null : barFor(document.body)
  if (!shown) return
  fill(shown, CONNECTION_NAME, CONNECTION_SENTENCE)
  holds = 'connection'
}

export function closeConnectionLost(): void {
  if (holds === 'connection') closeFailure()
}
