import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { chosenDay, dayOf, onChosenDay, readDate, setChosenDay } from '../../runtime/chosenDay'
import { fieldTypeOf, fromInput } from './inputValue'

// The field of type Tagwahl chooses the day of the mask, by which the lists
// of the mask filter: its value is that day, in the form a date field holds
// (21.10.2026), and the day it chooses is the day of every Tagwahl. The
// first one to open chooses today.

interface DayField extends ReactiveControllerHost, HTMLElement {
  fieldType: string
  value: string
  readonly preview: boolean
}

function nextDay(key: string, days: number): string {
  const moment = readDate(key)
  if (!moment) return key
  moment.setDate(moment.getDate() + days)
  return dayOf(moment)
}

export class DayChoice implements ReactiveController {
  private readonly field: DayField

  private unlisten: (() => void) | null = null

  constructor(field: DayField) {
    this.field = field
    field.addController(this)
  }

  get active(): boolean {
    return fieldTypeOf(this.field.fieldType) === 'day'
  }

  hostConnected(): void {
    if (!this.active || this.field.preview) return
    if (chosenDay() === '') setChosenDay(dayOf(new Date()))
    this.show()
    this.unlisten = onChosenDay(() => this.show())
  }

  hostDisconnected(): void {
    this.unlisten?.()
    this.unlisten = null
  }

  // The day as the browser's date input holds it, today in the editor.
  get inputDay(): string {
    return this.field.preview ? dayOf(new Date()) : chosenDay()
  }

  readonly choose = (day: string): void => {
    if (this.field.preview || day === '' || day === chosenDay()) return
    setChosenDay(day)
    this.field.dispatchEvent(new Event('change'))
  }

  readonly step = (days: number): void => this.choose(nextDay(chosenDay(), days))

  readonly today = (): void => this.choose(dayOf(new Date()))

  private show(): void {
    this.field.value = fromInput('date', chosenDay())
  }
}
