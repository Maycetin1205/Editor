import { booleanProperty, choiceProperty, textProperty, type ValuesOf } from '../../core/block/property'

const FOLDS = { key: 'appearance', equals: 'fold' }
const HEADED = { key: 'appearance', equals: 'headed', otherwise: FOLDS }

export const areaProperties = {
  appearance: choiceProperty(
    [
      { value: 'plain', name: 'Frei' },
      { value: 'box', name: 'Kasten' },
      { value: 'headed', name: 'Kopfzeile' },
      { value: 'fold', name: 'Klappbar' },
      { value: 'band', name: 'Band' },
    ],
    {
      default: 'box',
      label: 'Form',
      attribute: 'appearance',
    },
  ),
  heading: textProperty({
    default: 'Bereich',
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
    when: HEADED,
  }),
  startFolded: booleanProperty({
    default: false,
    label: 'Startet eingeklappt',
    attribute: 'start-folded',
    when: FOLDS,
  }),
}

export type AreaValues = ValuesOf<typeof areaProperties>
