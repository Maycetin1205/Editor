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
