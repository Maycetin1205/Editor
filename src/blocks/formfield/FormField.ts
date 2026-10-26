import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { live } from 'lit/directives/live.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { noticeSignTpl } from '../base/notice'
import { reportsHeight } from '../base/heightReport'
import { actionValue, bindable, type ValueCarrier } from '../../core/block/capability'
import { propertyVisible } from '../../core/block/property'
import { LOOKUP_COLUMNS_BINDING } from '../lookup/lookup'
import { focusNextField } from '../../runtime/nextField'
import { setSearchText } from '../../runtime/searchText'
import { suggestionStyle } from '../lookup/suggestionList'
import { LookupControl } from '../lookup/lookupControl'
import { icon, type IconName } from '../parts/icons'
import { tickBoxStyle, tickBoxTpl } from '../parts/tickBox'
import { symbolTpl } from '../look/symbol'
import '../table/Table'
import { disconnectValue, connectValue } from './valueBinding'
import { fieldStyle } from './formFieldStyle'
import { fieldTypeOf, forInput, fromInput } from './inputValue'
import {
  NOT_CHECKBOX,
  ONLY_LOOKUP,
  TICKED,
  UNTICKED,
  WITH_VALUE,
  formFieldProperties,
  type FieldType,
  type FormFieldValues,
} from './properties'

const SIGNS: Partial<Record<FieldType, IconName>> = {
  select: 'caretDown',
  date: 'calendar',
  time: 'clock',
  search: 'magnifier',
}

export interface FormField extends FormFieldValues {}

export class FormField extends BlockElement implements ValueCarrier {
  static readonly type = 'formfield'
  static readonly tag = 'ff-formfield'

  static override styles: CSSResultGroup = [BlockElement.styles, fieldStyle, tickBoxStyle, suggestionStyle]

  private valueAtFocus = ''
  private typed = false

  private readonly _lookup = new LookupControl({
    block: this,
    report: () => this.requestUpdate(),
    source: () => this.lookupSource,
    storageField: () => this.storageField,
    storageTitle: () => this.storageTitle,
    columns: () => this.lookupColumns,
    title: () => this.label,
    width: () => this.windowWidth,
    height: () => this.windowHeight,
    onlyHit: () => this.onlyHit,
    value: () => this.value,
    setValue: (value) => {
      this.value = value
    },
    changed: () => this.dispatchEvent(new Event('change')),
  })

  constructor() {
    super()
    reportsHeight(this, () => this.renderRoot.querySelector('.field'))
  }

  fillsSelf(): boolean {
    return this.lookup
  }

  checkOwnValue(): void {
    if (this.fillsSelf()) this._lookup.checkValue()
  }

  valueRequired(prop: string): boolean {
    return prop === 'value' && this.required && propertyVisible(NOT_CHECKBOX, { fieldType: this.fieldType })
  }

  focusValue(): void {
    this.renderRoot.querySelector<HTMLElement>('input, select')?.focus()
  }

  private onInput(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLSelectElement
    const kind = fieldTypeOf(this.fieldType)
    this.value = fromInput(kind, target.value)
    this.typed = true
    if (kind === 'search') setSearchText(this.value)
  }

  private get searches(): boolean {
    return fieldTypeOf(this.fieldType) === 'search' && !this.preview
  }

  private onChange(): void {
    this.dispatchEvent(new Event('change'))
  }

  private onFocus(): void {
    this.valueAtFocus = this.value
    this.typed = false
  }

  private takeTyped(): void {
    if (this.typed && this.value !== this.valueAtFocus) this.onChange()
    this.onFocus()
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key !== 'Enter' || this.preview) return
    e.preventDefault()
    this.takeTyped()
    focusNextField(this)
  }

  private onFieldClick(e: MouseEvent): void {
    if (this.preview) return
    const control = this.renderRoot.querySelector<HTMLElement>('input, select')
    if (!control || e.composedPath().includes(control)) return
    if (e.composedPath().some((at) => at instanceof HTMLButtonElement)) return
    control.focus()
  }

  private labelTpl(): TemplateResult {
    return html`<span
      class="label"
      data-ff-editable
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${this.label}</span>`
  }

  private get ticked(): boolean {
    return this.value === TICKED
  }

  private tick(on: boolean): void {
    this.value = on ? TICKED : UNTICKED
  }

  private onTextClick(): void {
    if (this.preview) return
    this.tick(!this.ticked)
    this.onChange()
  }

  private controlTpl(kind: FieldType): TemplateResult {
    if (this.lookup) return this._lookup.render('ctrl', this.label)
    if (this.preview) return html`<span class="shown">${this.value}</span>`
    if (kind === 'select') {
      const entries = this.options
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o !== '')
      const foreignValue = this.value !== '' && !entries.includes(this.value)
      return html`<span class="shown">${this.value}</span><select
        class="ctrl"
        aria-label=${this.label}
        .value=${live(this.value)}
        @input=${this.onInput}
        @change=${this.onChange}
        @keydown=${this.onKey}
      >
        <option value="" hidden></option>
        ${foreignValue ? html`<option value=${this.value} hidden selected>${this.value}</option>` : nothing}
        ${entries.map((o) => html`<option value=${o} ?selected=${o === this.value}>${o}</option>`)}
      </select>`
    }
    return html`<input
      class="ctrl"
      type=${kind}
      aria-label=${this.label}
      placeholder=${kind === 'search' && !this.showLabel ? this.label : nothing}
      .value=${live(forInput(kind, this.value))}
      @input=${this.onInput}
      @focus=${this.onFocus}
      @blur=${this.takeTyped}
      @keydown=${this.onKey}
    />`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (fieldTypeOf(this.fieldType) === 'checkbox' && !this.ticked) this.value = UNTICKED
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)

    this.toggleAttribute('data-ff-list', this._lookup.hangsBelow)
  }

  private checkboxTpl(bound: boolean): TemplateResult {
    return html`<div class=${classMap({ field: true, check: true, labelled: this.showLabel })}>
      <div
        class="row"
        data-ff-spot="value"
        ?data-ff-bound=${bound}
        @click=${this.reportSpot}
        @dblclick=${this.reportSpot}
      >
        ${tickBoxTpl(html`<input
          class="ctrl"
          type="checkbox"
          aria-label=${this.label}
          .checked=${live(this.ticked)}
          @input=${(e: Event) => this.tick((e.target as HTMLInputElement).checked)}
          @change=${this.onChange}
          @keydown=${this.onKey}
        />`)}
        ${
          this.showLabel
            ? html`<span
              class="text"
              data-ff-editable
              @click=${this.onTextClick}
              @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
            >${this.label}</span>`
            : nothing
        }
        ${noticeSignTpl(this.notice)}
      </div>
    </div>`
  }

  override render(): TemplateResult {
    const kind = fieldTypeOf(this.fieldType)
    const valueBindable = !this.lookup
    const bound = valueBindable && this.valueField !== ''
    if (kind === 'checkbox') return this.checkboxTpl(bound)

    const empty = (valueBindable ? this.value : this._lookup.inField) === ''
    const sign = this.lookup ? undefined : SIGNS[kind]
    const notice = noticeSignTpl(this.notice)
    const noticed = notice !== nothing
    return html`<div
      class=${classMap({ field: true, labelled: this.showLabel, [`kind-${kind}`]: true, lookup: this.lookup, noticed })}
      @click=${this.onFieldClick}
    >
      ${this.symbol !== '' ? html`<span class="symbol">${symbolTpl(this.symbol)}</span>` : nothing}
      ${this.showLabel ? this.labelTpl() : nothing}
      <div
        class=${classMap({ value: true, empty })}
        data-ff-spot=${valueBindable ? 'value' : nothing}
        ?data-ff-bound=${bound}
        @click=${this.reportSpot}
        @dblclick=${this.reportSpot}
      >
        ${this.controlTpl(kind)}
      </div>
      ${
        noticed
          ? html`<span class="sign">${notice}</span>`
          : sign
            ? html`<span class="sign">${icon(sign)}</span>`
            : nothing
      }
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    connectValue(this)
    if (this.searches) setSearchText(this.value)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    disconnectValue(this)
    if (this.searches) setSearchText('')
  }
}

defineBlock(FormField, {
  name: 'Feld',
  category: 'input',
  properties: formFieldProperties,
  capabilities: [
    { kind: 'source', when: WITH_VALUE, after: 'options' },
    { kind: 'followsSelection' },
    { kind: 'recordPick', sourceProp: 'lookupSource', when: ONLY_LOOKUP },
    { kind: 'list', binding: LOOKUP_COLUMNS_BINDING },
    {
      kind: 'lookupWindow',
      window: {
        columnsKey: 'lookupColumns',
        widthKey: 'windowWidth',
        heightKey: 'windowHeight',
        sourceProp: 'lookupSource',
        storageFieldProp: 'storageField',
        storageTitleProp: 'storageTitle',
        titleProp: 'label',
        when: ONLY_LOOKUP,
      },
    },
    bindable<typeof formFieldProperties>([
      {
        prop: 'value',
        name: 'Wert',
        when: WITH_VALUE,
      },
    ]),
    actionValue<typeof formFieldProperties>([{ prop: 'value', name: 'Wert' }]),
    { kind: 'events', list: [{ key: 'onChange', name: 'Wert geändert' }] },
  ],
  grid: { startWidth: 12, startHeight: 3, minWidth: 4, heightFromContent: true },
  contracts: { actionValue: FormField },
})
