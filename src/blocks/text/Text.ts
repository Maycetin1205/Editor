import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement, defineBlock, sendPropChange } from '../base/BlockElement'
import { reportsHeight } from '../base/heightReport'
import { startRename } from '../base/inlineRename'
import { bindable, bindingAttr } from '../../core/block/capability'
import { readBoundSpot } from '../../runtime/boundSpot'
import { makeDataLink, sourceIdOf, spotValue } from '../../runtime/source'
import { makeFieldReader } from '../../runtime/foreignSources'
import { runEvent } from '../../runtime/events'
import { BINDING_JOINERS, bindingFields, bindingJoiner, joinedBinding } from '../../core/block/binding'
import {
  fieldShortName,
  hasSlots,
  patternForEditing,
  patternFromEditing,
  patternPieces,
  slotFields,
} from '../../core/block/fieldPattern'
import { symbolTpl } from '../look/symbol'
import { textStyle } from './textStyle'
import { textProperties, type TextValues } from './properties'
import { patternText, replacingReader } from './fieldValues'
import { CALCULATIONS_PROP } from '../../core/data/calculation'
import { calculatedText } from '../../runtime/calculated'
import { PENDING_EVENT } from '../../runtime/pendingState'

const ALIGNS = ['left', 'center', 'right']

const TEXT_BINDING = bindingAttr('text')

const DOT = BINDING_JOINERS[0]

const QUIET_SIZE = '12'

const CALCULATED = 'Berechnung'

const CLICK = 'onClick'
const CHAINS_ATTR = 'data-ff-actions'

function showCalculation(el: Text): boolean {
  const calculation = el.calculations[0]
  if (calculation === undefined) return false
  el.fieldValues = []
  el.text = calculatedText(el, calculation)
  return true
}

export interface Text extends TextValues {}

export class Text extends BlockElement {
  static readonly type = 'text'
  static readonly tag = 'ff-text'

  static override styles: CSSResultGroup = [BlockElement.styles, textStyle]

  @state() fieldValues: readonly string[] = []

  @state() private labelTyped = false

  @state() private patternTyped = false

  private wired = false

  constructor() {
    super()
    reportsHeight(this, () => this.renderRoot.querySelector('.with-label') ?? this.renderRoot.querySelector('.text'))
  }

  private get woven(): boolean {
    return hasSlots(this.pattern)
  }

  private pairNames(): string[] | null {
    if (!this.showLabel || this.labelTyped || this.woven) return null
    const fields = bindingFields(this.textField)
    if (fields.length < 2 || bindingJoiner(this.textField) !== DOT) return null
    const names = this.label.split(DOT).map((name) => name.trim())
    return names.length === fields.length ? names : null
  }

  private get frameClass(): string {
    if (this.border === 'box') return ' boxed'
    return this.border === 'line' ? ' lined' : ''
  }

  private get framed(): boolean {
    return this.frameClass !== ''
  }

  override render(): TemplateResult {
    const align = ALIGNS.includes(this.align) ? this.align : 'left'
    const names = this.pairNames()
    if (names !== null) return this.pairsTpl(names, align)
    const calculates = this.preview && this.calculations.length > 0
    const blank = this.text === '' && this.preview && !calculates && !this.woven
    const words = calculates ? CALCULATED : blank ? 'Text' : this.wordsOf()
    const text = this.textTpl(words, align, this.symbol !== '', blank, !calculates)
    if (!this.showLabel) return html`<div class="frame">${text}</div>`
    return html`<div class="frame"><div class="with-label"><span
      class="label"
      style=${styleMap({ textAlign: this.framed ? 'left' : align })}
      data-ff-editable
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${this.label === '' && this.preview ? 'Beschriftung' : this.label}</span>${text}</div></div>`
  }

  // In the editor a woven text shows its fields by name, each as a slot;
  // while typed in, as {Name} in the words.
  private wordsOf(): string | TemplateResult {
    if (!this.preview || (!this.woven && !this.patternTyped)) return this.text
    if (this.patternTyped) return patternForEditing(this.editedPattern(), (field) => this.fieldName(field))
    return html`${patternPieces(this.pattern).map((p) =>
      p.field === undefined ? p.text : html`<span class="slot">${this.fieldName(p.field)}</span>`,
    )}`
  }

  private fieldNames(): Map<string, string> {
    const fields = bindingFields(this.textField)
    const shown = (this.spotTexts.text ?? '').split(bindingJoiner(this.textField)).map((name) => name.trim())
    return new Map(fields.length === shown.length ? fields.map((field, i) => [field, shown[i]]) : [])
  }

  private fieldName(field: string): string {
    return this.fieldNames().get(field) || fieldShortName(field)
  }

  // A text of fields only becomes a woven one once typed in: its fields
  // stand in it as they show, joined as before.
  private editedPattern(): string {
    if (this.woven) return this.pattern
    const fields = bindingFields(this.textField)
    return fields.map((field) => `{{${field}}}`).join(bindingJoiner(this.textField))
  }

  private textTpl(
    words: string | TemplateResult,
    align: string,
    withSymbol: boolean,
    blank = false,
    weaves = false,
  ): TemplateResult {
    const bound = this.textField !== ''
    return html`<div
      class="text align-${align}${this.frameClass}${this.bold ? ' bold' : ''}${this.size === QUIET_SIZE ? ' quiet' : ''}${withSymbol ? ' with-symbol' : ''}"
      style=${styleMap({ fontSize: `${this.size}px` })}
    >${withSymbol ? html`<span class="symbol">${symbolTpl(this.symbol)}</span>` : nothing}<span
        class="words${blank ? ' blank' : ''}${this.woven ? ' woven' : ''}"
        data-ff-editable
        data-ff-spot="text"
        ?data-ff-bound=${bound && !this.woven && !this.patternTyped}
        @click=${this.reportSpot}
        @dblclick=${(e: MouseEvent) => {
          this.reportSpot(e)
          if (weaves && bound) this.typePattern(e)
          else this.inlineEdit(e, 'text')
        }}
      >${words}</span></div>`
  }

  private pairsTpl(names: readonly string[], align: string): TemplateResult {
    const values = this.preview ? this.text.split(DOT) : this.fieldValues
    return html`<div class="frame"><div class="with-label pairs align-${align}">${names.map((name, i) => {
      const value = (values[i] ?? '').trim()
      return html`<div class="pair"><span
        class="label"
        style=${styleMap({ textAlign: this.framed ? 'left' : align })}
        data-ff-editable
        @dblclick=${this.typeLabel}
      >${name}</span>${this.textTpl(value === '' ? '–' : value, align, i === 0 && this.symbol !== '', value === '')}</div>`
    })}</div></div>`
  }

  private readonly typeLabel = (event: MouseEvent): void => {
    if (!this.editable) return
    event.stopPropagation()
    event.preventDefault()
    this.labelTyped = true
  }

  private typePattern(event: MouseEvent): void {
    if (!this.editable) return
    event.stopPropagation()
    event.preventDefault()
    this.patternTyped = true
  }

  // What was typed over a woven text: the fields named in it stay slots, the
  // ones no longer named leave the text; without a field it is plain words.
  private adoptPattern(typed: string): void {
    const fields = bindingFields(this.textField)
    const pattern = patternFromEditing(
      typed,
      fields.map((field) => ({ field, name: this.fieldName(field) })),
    )
    if (!hasSlots(pattern)) {
      sendPropChange(this, 'textField', '')
      sendPropChange(this, 'text', typed)
      sendPropChange(this, 'pattern', '')
      return
    }
    const named = slotFields(pattern)
    if (fields.some((field) => !named.includes(field))) {
      sendPropChange(
        this,
        'textField',
        joinedBinding(
          fields.filter((field) => named.includes(field)),
          bindingJoiner(this.textField),
        ),
      )
    }
    sendPropChange(this, 'pattern', pattern)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('labelTyped') && this.labelTyped) this.renameLabel()
    if (changed.has('patternTyped') && this.patternTyped) this.renamePattern()
  }

  private renameLabel(): void {
    const label = this.renderRoot.querySelector<HTMLElement>('.with-label > .label')
    if (!label) {
      this.labelTyped = false
      return
    }
    startRename(
      label,
      (text, original) => {
        if (text !== original) sendPropChange(this, 'label', text)
      },
      () => {
        this.labelTyped = false
      },
    )
  }

  private renamePattern(): void {
    const words = this.renderRoot.querySelector<HTMLElement>('.words')
    if (!words) {
      this.patternTyped = false
      return
    }
    startRename(
      words,
      (text, original) => {
        if (text !== original) this.adoptPattern(text)
      },
      () => {
        this.patternTyped = false
      },
    )
  }

  private readonly recount = (): void => {
    if (!this.preview) showCalculation(this)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
    document.addEventListener(PENDING_EVENT, this.recount)
    this.wireClick()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
    document.removeEventListener(PENDING_EVENT, this.recount)
  }

  private wireClick(): void {
    if (this.wired || this.preview || !this.hasAttribute(CHAINS_ATTR)) return
    this.wired = true
    this.addEventListener('click', () => {
      void runEvent(this, CLICK, {})
    })
  }
}

const link = makeDataLink<Text>({
  hydrate: (el) => {
    if (showCalculation(el)) return
    const spot = readBoundSpot(el, TEXT_BINDING)
    if (spot.kind === 'unbound') return
    if (spot.kind !== 'value') {
      el.text = spot.kind === 'withoutRow' ? el.emptyText : ''
      el.fieldValues = []
      return
    }
    const binding = el.getAttribute(TEXT_BINDING) ?? ''
    const fields = bindingFields(binding)
    const read = replacingReader(makeFieldReader(el), el.replace)
    if (hasSlots(el.pattern)) {
      el.fieldValues = []
      el.text = patternText(el.pattern, spot.row, read, el.emptyText)
      return
    }
    el.fieldValues = fields.length > 1 ? fields.map((field) => read(spot.row, field)) : []
    const text = fields.length > 1 ? spotValue('', binding, spot.row, read) : read(spot.row, binding)
    el.text = text.trim() === '' ? el.emptyText : text
  },
  wire: (el) => {
    if (sourceIdOf(el) !== '' && el.getAttribute(TEXT_BINDING)) el.text = ''
  },
})

defineBlock(Text, {
  name: 'Text',
  category: 'display',
  properties: textProperties,
  capabilities: [
    { kind: 'source', after: 'text' },
    { kind: 'followsSelection' },
    bindable<typeof textProperties>([
      { prop: 'text', name: 'Text', several: true, nameProp: 'label', weaveProp: 'pattern' },
    ]),
    { kind: 'compute', prop: CALCULATIONS_PROP },
    { kind: 'events', list: [{ key: CLICK, name: 'Klick' }] },
  ],
  grid: { startWidth: 12, startHeight: 2, minWidth: 2, minHeight: 1, heightFromContent: true },
})
