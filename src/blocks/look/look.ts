import { css, unsafeCSS } from 'lit'
import { choiceProperty, type ChoiceOption, type Property } from '../../core/block/property'

type ToneValue = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface Tone {
  value: ToneValue
  name: string

  strong: string
  ink: string
  tint: string
  shell: string
  line: string
  soft: string
}

function tone(value: ToneValue, name: string): Tone {
  const token = `--se-${value}`
  return {
    value,
    name,
    strong: token,
    ink: `${token}-ink`,
    tint: `${token}-tint`,
    shell: `${token}-shell`,
    line: `${token}-line`,
    soft: `${token}-soft`,
  }
}

const TONES: readonly Tone[] = [
  tone('neutral', 'Neutral'),
  tone('info', 'Akzent'),
  tone('success', 'Grün'),
  tone('warning', 'Ocker'),
  tone('danger', 'Rot'),
]

const EMPHASES: readonly ChoiceOption[] = [
  { value: 'solid', name: 'Gefüllt' },
  { value: 'outline', name: 'Rand' },
]

const SIZES: readonly (ChoiceOption & { font: string })[] = [
  { value: 'small', name: 'Klein', font: '--se-fs-sm' },
  { value: 'normal', name: 'Normal', font: '--se-fs' },
  { value: 'large', name: 'Groß', font: '--se-fs-lg' },
]

export function toneValue(value: string): ToneValue {
  return TONES.some((f) => f.value === value) ? (value as ToneValue) : 'info'
}

export type LookInit = Partial<Pick<Property<string>, 'default' | 'label' | 'place' | 'attribute' | 'when'>>

export function toneProperty(init: LookInit = {}): Property<string> {
  const options = TONES.map((f) => ({ value: f.value, name: f.name, color: `var(${f.strong})` }))
  return choiceProperty(options, { default: 'info', label: 'Farbe', attribute: 'tone', ...init })
}

export function emphasisProperty(init: LookInit = {}): Property<string> {
  return choiceProperty(EMPHASES, { default: 'solid', label: 'Art', attribute: 'emphasis', ...init })
}

export function sizeProperty(init: LookInit = {}): Property<string> {
  return choiceProperty(
    SIZES.map(({ value, name }) => ({ value, name })),
    { default: 'normal', label: 'Größe', attribute: 'size', ...init },
  )
}

export function lookClass(look: { tone: string; emphasis: string; size: string }): string {
  return `tone-${toneValue(look.tone)} emphasis-${look.emphasis} size-${look.size}`
}

export const lookStyle = css`
  ${unsafeCSS(
    TONES.map(
      (f) =>
        `.tone-${f.value} {` +
        ` --tone-strong: var(${f.strong}); --tone-ink: var(${f.ink}); --tone-tint: var(${f.tint});` +
        ` --tone-shell: var(${f.shell}); --tone-line: var(${f.line}); --tone-soft: var(${f.soft}); }`,
    ).join('\n  '),
  )}
  ${unsafeCSS(SIZES.map((s) => `.size-${s.value} { --look-fs: var(${s.font}); }`).join('\n  '))}

  .emphasis-solid {
    --look-ground: var(--tone-strong); --look-edge: var(--tone-strong); --look-ink: var(--se-panel);
    --look-ground-hover: var(--tone-ink); --look-edge-hover: var(--tone-ink);
  }
  .emphasis-outline {
    --look-ground: var(--se-panel); --look-edge: var(--tone-line); --look-ink: var(--se-ink);
    --look-ground-hover: var(--se-hover); --look-edge-hover: var(--tone-line);
  }
`
