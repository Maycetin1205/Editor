// What a notice of the editor says. widgets/Notice.tsx shows it.
export interface NoticeLine {
  name: string
  detail?: string
}

export interface NoticeText {
  title: string
  lead: string
  lines?: readonly NoticeLine[]
  action?: { label: string; run: () => void }
}
