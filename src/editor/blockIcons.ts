import '../blocks/register'

import {
  AppWindow,
  Calendar,
  Image as ImageSign,
  List,
  ListChecks,
  ListPlus,
  PanelTop,
  RectangleHorizontal,
  SeparatorHorizontal,
  SquareKanban,
  Table as TableSign,
  TextCursorInput,
  Type,
  type Icon,
} from './icons/icon'
import { Area } from '../blocks/area/Area'
import { Button } from '../blocks/button/Button'
import { Capture } from '../blocks/capture/Capture'
import { DataList } from '../blocks/datalist/DataList'
import { DatePicker } from '../blocks/date/DatePicker'
import { Divider } from '../blocks/divider/Divider'
import { FormField } from '../blocks/formfield/FormField'
import { Picture } from '../blocks/image/Picture'
import { Kanban } from '../blocks/kanban/Kanban'
import { Popup } from '../blocks/popup/Popup'
import { Table } from '../blocks/table/Table'
import { Text } from '../blocks/text/Text'
import { ValueList } from '../blocks/valuelist/ValueList'

export const BLOCK_ICONS: Record<string, Icon> = {
  [Area.type]: PanelTop,
  [Button.type]: RectangleHorizontal,
  [Capture.type]: ListPlus,
  [DataList.type]: ListChecks,
  [DatePicker.type]: Calendar,
  [Divider.type]: SeparatorHorizontal,
  [FormField.type]: TextCursorInput,
  [Picture.type]: ImageSign,
  [Kanban.type]: SquareKanban,
  [Popup.type]: AppWindow,
  [Table.type]: TableSign,
  [Text.type]: Type,
  [ValueList.type]: List,
}

export const BLOCK_HINTS: Record<string, string> = {
  [Area.type]: 'Fläche für andere Bausteine',
  [Button.type]: 'Startet eine Aktion',
  [Capture.type]: 'Positionen tippen wie in SoftEngine',
  [DataList.type]: 'Zeilen mit Titel und Unterzeile',
  [DatePicker.type]: 'Ein Tag zur Wahl',
  [Divider.type]: 'Eine Linie zwischen zwei Gruppen, mit Wort oder ohne',
  [FormField.type]: 'Tippen, wählen oder ankreuzen',
  [Picture.type]: 'Logo, Artikelbild oder ein Bild aus einem Feld',
  [Kanban.type]: 'Karten in Spalten, etwa Termine',
  [Popup.type]: 'Ein Fenster über der Maske',
  [Table.type]: 'Zeilen einer Quelle unter einem Kopf',
  [Text.type]: 'Titel, Beschriftung oder Wörter mit Feldwerten',
  [ValueList.type]: 'Werte untereinander, auf Wunsch mit Summe',
}
