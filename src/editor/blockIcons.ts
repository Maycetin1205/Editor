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
  SquareKanban,
  StatusChip,
  Table as TableSign,
  Tabs as TabsSign,
  TextCursorInput,
  Type,
  type Icon,
} from './icons/icon'
import { Area } from '../blocks/area/Area'
import { Button } from '../blocks/button/Button'
import { Capture } from '../blocks/capture/Capture'
import { DataList } from '../blocks/datalist/DataList'
import { DatePicker } from '../blocks/date/DatePicker'
import { FormField } from '../blocks/formfield/FormField'
import { Picture } from '../blocks/image/Picture'
import { Kanban } from '../blocks/kanban/Kanban'
import { Popup } from '../blocks/popup/Popup'
import { Status } from '../blocks/status/Status'
import { Table } from '../blocks/table/Table'
import { Tabs } from '../blocks/tabs/Tabs'
import { Text } from '../blocks/text/Text'
import { ValueList } from '../blocks/valuelist/ValueList'

export const BLOCK_ICONS: Record<string, Icon> = {
  [Area.type]: PanelTop,
  [Button.type]: RectangleHorizontal,
  [Capture.type]: ListPlus,
  [DataList.type]: ListChecks,
  [DatePicker.type]: Calendar,
  [FormField.type]: TextCursorInput,
  [Picture.type]: ImageSign,
  [Kanban.type]: SquareKanban,
  [Popup.type]: AppWindow,
  [Status.type]: StatusChip,
  [Table.type]: TableSign,
  [Tabs.type]: TabsSign,
  [Text.type]: Type,
  [ValueList.type]: List,
}
