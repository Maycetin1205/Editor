import {
  css,
  LitElement,
  nothing,
  render as renderInto,
  type CSSResultGroup,
  type PropertyDeclaration,
  type PropertyValues,
} from 'lit'
import { property } from 'lit/decorators.js'
import type { BlockDeclaration } from '../../core/block/blockType'
import { capability, hasCapability, type Capability } from '../../core/block/capability'
import type { Condition, Property, PropertyMap, PropertyValue } from '../../core/block/property'
import { checkPropertyNames } from '../../core/block/propertyNames'
import { registerBlockType } from '../../core/block/registry'
import { GRID_PROPERTIES } from '../../core/block/grid'
import { SOURCE_PROP, SOURCE_PROPERTY } from '../../core/block/sourceProperty'
import { deepClone } from '../../core/deepClone'
import { followsSelectionProperty } from '../../core/data/selectionFollow'
import { extraSourcesProperty } from '../../core/data/extraSources'
import { fitToFrame } from '../../runtime/frameFit'
import { NOTICE_ATTR, noticeStateOf, type NoticeState } from '../../runtime/notice'
import { startRename } from './inlineRename'
import { busyLineTpl, noticeStyle } from './notice'

type BlockShape<P extends PropertyMap = PropertyMap> = Omit<
  BlockDeclaration,
  'type' | 'tag' | 'properties' | 'capabilities'
> & {
  properties?: P
  capabilities?: readonly Capability<keyof P & string>[]
}

interface BlockElementClass {
  readonly type: string
  readonly tag: string
  declaredProperties: PropertyMap
  createProperty(name: PropertyKey, options: PropertyDeclaration): void
  new (): BlockElement
}

function holdsWhile<V>(property: Property<V>, when: Condition | undefined): Property<V> {
  return when ? { ...property, when } : property
}

function ownProperties(shape: BlockShape): PropertyMap {
  const own = Object.entries(shape.properties ?? {})
  const source = capability({ capabilities: shape.capabilities ?? [] }, 'source')
  if (!source) return Object.fromEntries(own)
  const at = own.findIndex(([key]) => key === source.after) + 1
  return Object.fromEntries([
    ...own.slice(0, at),
    [SOURCE_PROP, holdsWhile(SOURCE_PROPERTY, source.when)],
    ...own.slice(at),
  ])
}

function either(test: Condition, then: Condition, otherwise: Condition): Condition {
  return {
    ...test,
    and: test.and ? either(test.and, then, otherwise) : then,
    otherwise: test.otherwise ? either(test.otherwise, then, otherwise) : otherwise,
  }
}

function selectionSourceSet(capable: { capabilities: readonly Capability[] }): Condition {
  const set = (key: string): Condition => ({ key, notEquals: '' })
  const pick = capability(capable, 'recordChoice')
  if (pick?.sourceProp === undefined) return set(SOURCE_PROP)
  if (!pick.when) return set(pick.sourceProp)
  return either(pick.when, set(pick.sourceProp), set(SOURCE_PROP))
}

function allProperties(shape: BlockShape): PropertyMap {
  const capable = { capabilities: shape.capabilities ?? [] }
  const source = capability(capable, 'source')
  return {
    ...GRID_PROPERTIES,
    ...(source?.helpers ? { extraSources: holdsWhile(extraSourcesProperty, source.when) } : null),
    ...(hasCapability(capable, 'followsSelection')
      ? { followsSelection: holdsWhile(followsSelectionProperty, selectionSourceSet(capable)) }
      : null),
    ...ownProperties(shape),
  }
}

function declareLitProperties(element: BlockElementClass, properties: PropertyMap): void {
  for (const [name, declared] of Object.entries(properties)) {
    if (declared.attribute === '') continue
    element.createProperty(name, {
      attribute: declared.attribute,
      converter: {
        fromAttribute: (raw: string | null) => declared.type.fromAttribute(raw, declared.default),
        toAttribute: (value: never) => declared.type.toAttribute(value),
      },
    })
  }
}

export const PROP_CHANGE = 'ff-prop-change'

export interface PropChange {
  prop: string
  value: unknown
}

export function sendPropChange(el: HTMLElement, prop: string, value: unknown): void {
  el.dispatchEvent(new CustomEvent<PropChange>(PROP_CHANGE, { detail: { prop, value } }))
}

// A block that holds its children's words (the titles of a Reiter's pages)
// changes them on the canvas through these; the child is its place among
// the block's children.
export const CHILD_CHANGE = 'ff-child-change'

export interface ChildChange {
  child: number
  prop: string
  value: unknown
}

export const CHILD_ADD = 'ff-child-add'

export interface ChildAdd {
  type: string
  values: Readonly<Record<string, unknown>>
}

export const CHILD_REMOVE = 'ff-child-remove'

export interface ChildRemove {
  child: number
}

export const SPOT_CLICK = 'ff-spot-click'

export type SpotClick =
  { kind: 'binding'; click: MouseEvent; prop: string; rect: DOMRect } | { kind: 'lookupWindow'; click: MouseEvent }

export function sendSpotClick(el: BlockElement, detail: SpotClick): void {
  if (el.preview) el.dispatchEvent(new CustomEvent<SpotClick>(SPOT_CLICK, { detail }))
}

function startValues(properties: PropertyMap): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  for (const [name, declared] of Object.entries(properties)) {
    if (declared.attribute === '') continue
    out[name] = deepClone(declared.default) as PropertyValue
  }
  return out
}

export abstract class BlockElement extends LitElement {
  static declaredProperties: PropertyMap = {}

  static busyLine = false

  static override styles: CSSResultGroup = [
    css`
    /* Marked text as on the sheet around the block. */
    ::selection { background: var(--se-selection-ground); color: var(--se-ink); }
    :host { display: block; }
    :host([hidden]) { display: none; }

    :host([fills]) { height: 100%; box-sizing: border-box; }
    [data-ff-editable] { cursor: text; }
    :host(:not([data-editable])) [data-ff-editable] { cursor: inherit; }
    /* In the editor a bound spot shows the names of its fields as a quiet
       placeholder, in the second ink and plain, not as a value. The dotted
       line that says "bound, click to bind anew" shows only while the block
       is marked or under the pointer: under every value it made the sheet
       look like a page of broken links. A spot of a card or row keeps the
       look of its value, so that the card in the editor is the card of the
       mask. */
    :host([preview]) [data-ff-bound]:not([data-ff-in-card]) {
      color: var(--se-ink-2);
      font-weight: 400;
    }
    :host([preview][data-editable]) [data-ff-bound],
    :host([preview]:hover) [data-ff-bound] {
      text-decoration: underline dotted var(--se-accent);
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }
    :host([preview][data-editable]) [data-ff-bound] { cursor: pointer; }
  `,
    noticeStyle,
  ]

  @property({ type: Boolean, reflect: true, attribute: 'data-editable' })
  editable = false

  @property({ type: Boolean, reflect: true })
  preview = false

  @property({ attribute: false })
  spotTexts: Readonly<Record<string, string>> = {}

  @property({ attribute: NOTICE_ATTR, converter: { fromAttribute: noticeStateOf } })
  notice: NoticeState = 'quiet'

  // On the canvas: the place of the child that holds the editor's choice,
  // -1 when none does.
  @property({ attribute: false })
  chosenChild = -1

  private noticeRoom: HTMLElement | null = null

  constructor() {
    super()
    Object.assign(this, startValues(this.properties))
  }

  get properties(): PropertyMap {
    return (this.constructor as typeof BlockElement).declaredProperties
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (!this.preview) fitToFrame(this)
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot()
    const edge = document.createElement('div')
    const room = document.createElement('div')
    edge.className = 'ff-notice-room'
    room.className = 'ff-notice-room'
    edge.append(room)
    root.insertBefore(edge, this.renderOptions.renderBefore ?? null)
    this.renderOptions.renderBefore = edge
    this.noticeRoom = room
    return root
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed)
    if (this.noticeRoom) {
      const line = !this.preview && (this.constructor as typeof BlockElement).busyLine
      renderInto(line ? busyLineTpl(this.notice) : nothing, this.noticeRoom, { host: this })
    }
  }

  setDeclared(name: string, value: unknown): void {
    if (!Object.hasOwn(this.properties, name) || !this.properties[name].type.read(value).ok) return
    Object.assign(this, { [name]: value })
  }

  protected reportSpot(event: MouseEvent): void {
    const at = event.currentTarget
    if (!(at instanceof HTMLElement) || at.dataset.ffSpot === undefined) return
    sendSpotClick(this, { kind: 'binding', click: event, prop: at.dataset.ffSpot, rect: at.getBoundingClientRect() })
  }

  protected inlineEdit(event: MouseEvent, prop: string): void {
    this.renameOn(event, (text) => sendPropChange(this, prop, text))
  }

  protected inlineEditChild(event: MouseEvent, child: number, prop: string): void {
    this.renameOn(event, (text) => {
      this.dispatchEvent(new CustomEvent<ChildChange>(CHILD_CHANGE, { detail: { child, prop, value: text } }))
    })
  }

  private renameOn(event: MouseEvent, adopt: (text: string) => void): void {
    if (!this.editable) return
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    if (target.hasAttribute('data-ff-bound')) return
    event.stopPropagation()
    event.preventDefault()
    startRename(target, (text, original) => {
      if (text !== original) adopt(text)
    })
  }
}

export function defineBlock<P extends PropertyMap>(element: BlockElementClass, shape: BlockShape<P>): void {
  const properties = allProperties(shape)
  checkPropertyNames(element.type, properties, shape.capabilities ?? [])
  element.declaredProperties = properties
  declareLitProperties(element, properties)
  if (!customElements.get(element.tag)) customElements.define(element.tag, element)
  registerBlockType({ ...shape, type: element.type, tag: element.tag, properties })
}
