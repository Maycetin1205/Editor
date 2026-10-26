import { css, html, nothing, type TemplateResult } from 'lit'
import { fieldProperty, type Property } from '../../core/block/property'
import type { BlockElement } from '../base/BlockElement'
import { animalOf, animalOutline, type Animal } from './animal'

export function spotBinding(label: string, attribute: string): Property<string> {
  return fieldProperty({
    default: '',
    label: `${label} — Feld`,
    place: 'none',
    attribute,
  })
}

export const AVATAR_SPOT = { prop: 'avatar', name: 'Avatar' } as const

export const avatarStyle = css`
  .avatar {
    box-sizing: border-box;
    flex: none;
    width: var(--avatar-size, 36px);
    height: var(--avatar-size, 36px);
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--animal-soft, var(--se-neutral-soft));
    color: var(--animal, var(--se-ink-2));
  }
  .avatar svg { width: 56%; height: 56%; }
  .avatar.letter {
    font-size: var(--se-fs-lg);
    font-weight: 700;
    line-height: 1;
  }
`

function animalAvatarTpl(animal: Animal): TemplateResult {
  return html`<span
    class="avatar"
    style="--animal:var(--se-animal-${animal});--animal-soft:var(--se-animal-${animal}-soft)"
  >${animalOutline(animal)}</span>`
}

const initial = (text: string): string => (Array.from(text.trim())[0] ?? '').toUpperCase()

function letterAvatarTpl(text: string): TemplateResult {
  return html`<span class="avatar letter" aria-hidden="true">${initial(text)}</span>`
}

function avatarTpl(value: string): TemplateResult | typeof nothing {
  if (value.trim() === '') return nothing
  const animal = animalOf(value)
  return animal === undefined ? letterAvatarTpl(value) : animalAvatarTpl(animal)
}

export const cardSpotStyle = css`
  :host([preview]) [data-ff-in-card]:not([data-ff-bound]) { color: var(--se-placeholder); }
`

export type CardValues = Readonly<Record<string, string>> | null

export interface Card<P extends string> {
  shows: (prop: P | 'avatar') => boolean
  spot: (prop: P, className: string) => TemplateResult
  avatar: () => TemplateResult | typeof nothing
}

/* Mask and editor draw a card or row with this one template, so that the
   editor shows where each field lands and how it looks (21.10.). The name
   of an unbound spot is no data. */
export function cardOf<P extends string>(
  el: BlockElement,
  spots: readonly { prop: P; name: string }[],
  fieldOf: (prop: P) => string,
  report: (event: MouseEvent) => void,
  values: CardValues,
): Card<P> {
  const bound = (prop: P): boolean => fieldOf(prop) !== ''
  const onlyBound = !el.editable && spots.some((s) => bound(s.prop))
  const shows = (prop: P | 'avatar'): boolean => {
    if (values !== null) return (values[prop] ?? '').trim() !== ''
    if (prop === 'avatar') return el.editable || (el.spotTexts.avatar ?? '') !== ''
    return !onlyBound || bound(prop)
  }
  const spot = (prop: P, className: string): TemplateResult => {
    if (values !== null) return html`<span class=${className}>${values[prop]}</span>`
    const isBound = bound(prop)
    return html`<span
      class=${className}
      data-ff-spot=${prop}
      data-ff-in-card
      ?data-ff-bound=${isBound}
      @click=${report}
      @dblclick=${report}
    >${isBound ? (el.spotTexts[prop] ?? '') : (spots.find((s) => s.prop === prop)?.name ?? '')}</span>`
  }
  const avatar = (): TemplateResult | typeof nothing => {
    if (!shows('avatar')) return nothing
    if (values !== null) return avatarTpl(values.avatar ?? '')
    const text = el.spotTexts.avatar ?? ''
    return html`<span
      class="avatar letter"
      data-ff-spot="avatar"
      data-ff-in-card
      ?data-ff-bound=${text !== ''}
      @click=${report}
      @dblclick=${report}
    >${initial(text)}</span>`
  }
  return { shows, spot, avatar }
}
