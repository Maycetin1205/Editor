import { useEffect, useState } from 'react'
import { FileText, FolderOpen, X } from '@/editor/icons/icon'
import { Button, OPENER } from '@/editor/widgets/Button'
import { Field } from '@/editor/widgets/Field'
import { DOCUMENT_FRAME_PROP, FRAME_SPOTS } from '../../core/block/documentFrame'
import { EXPORT_TARGET_PROP, exportTargetOf } from '../../core/block/exportTarget'
import { MASK_NAME_DEFAULT, MASK_NAME_PROP } from '../../core/block/maskName'
import { ROOT_ID } from '../../core/block/tree'
import { Labeled } from '../bar/Labeled'
import { useInputSession } from '../controls/useInputSession'
import { knowsExportTarget, pickExportTarget } from '../state/exportTarget'
import { canPickFolder, reasonOf } from '../state/folderOnDisk'
import { useEditor } from '../state/useEditor'

export function MaskProperties() {
  const ed = useEditor()
  const nameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const frameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const maskName = String(ed.tree[ROOT_ID]?.values[MASK_NAME_PROP] ?? '')
  const frameRaw = String(ed.tree[ROOT_ID]?.values[DOCUMENT_FRAME_PROP] ?? '')

  return (
    <>
      <div className="flex h-[52px] shrink-0 items-center gap-[10px] px-[16px]">
        <FileText size={18} aria-hidden className="shrink-0 text-ink-2" />
        <span className="text-title font-bold text-ink">Maske</span>
      </div>
      <div className="flex shrink-0 flex-col px-[16px] pb-[12px]">
        <Labeled label="Name">
          <Field
            value={maskName}
            placeholder={MASK_NAME_DEFAULT}
            aria-label="Name der Maske"
            onChange={(e) => {
              nameSession.begin()
              ed.updateProperty(ROOT_ID, MASK_NAME_PROP, e.currentTarget.value)
            }}
            onBlur={nameSession.finish}
          />
        </Labeled>
        <Labeled label="Rahmen">
          <Field
            value={frameRaw}
            placeholder="Nr."
            inputMode="numeric"
            maxLength={FRAME_SPOTS}
            aria-label="Nummer des Belegerfassungs-Layoutrahmens"
            className="tabular-nums"
            onChange={(e) => {
              frameSession.begin()
              ed.updateProperty(ROOT_ID, DOCUMENT_FRAME_PROP, e.currentTarget.value)
            }}
            onBlur={frameSession.finish}
          />
        </Labeled>
        {canPickFolder() && <ExportTarget />}
      </div>
    </>
  )
}

function ExportTarget() {
  const ed = useEditor()
  const target = exportTargetOf(ed.tree)
  const [picks, setPicks] = useState(0)
  const [checked, setChecked] = useState<{ target: string; picks: number; known: boolean } | null>(null)

  useEffect(() => {
    if (target === '') return
    let live = true
    void knowsExportTarget(target).then((known) => {
      if (live) setChecked({ target, picks, known })
    })
    return () => {
      live = false
    }
  }, [target, picks])

  const known = checked !== null && checked.target === target && checked.picks === picks ? checked.known : null

  const choose = async () => {
    let name: string | null
    try {
      name = await pickExportTarget(target)
    } catch (error) {
      ed.showNotice({ title: 'Kein Zielordner gewählt', lead: `${reasonOf(error)}.` })
      return
    }
    if (name === null) return
    ed.updateProperty(ROOT_ID, EXPORT_TARGET_PROP, name)
    setPicks((n) => n + 1)
  }

  return (
    <>
      <Labeled label="Zielordner">
        <button
          type="button"
          title="Ordner wählen, in den „Exportieren“ die Maske schreibt"
          onClick={() => void choose()}
          className={`${OPENER} min-w-0 flex-1`}
        >
          <FolderOpen size={14} aria-hidden className="shrink-0 text-muted" />
          {target === ''
            ? <span className="truncate font-normal text-muted">Wählen</span>
            : <span className="truncate">{target}</span>}
        </button>
        {target !== '' && (
          <Button
            onlyIcon
            aria-label="Kein Zielordner"
            title="Kein Zielordner: Exportieren lädt herunter"
            onClick={() => ed.updateProperty(ROOT_ID, EXPORT_TARGET_PROP, '')}
          >
            <X size={14} />
          </Button>
        )}
      </Labeled>
      <p className="pl-[144px] pt-[2px] text-dense leading-tight text-muted">
        {target === ''
          ? 'Ohne Zielordner lädt „Exportieren“ die Maske herunter.'
          : known === false
            ? 'Auf diesem Rechner noch nicht gewählt; bis dahin wird heruntergeladen.'
            : `„Exportieren“ schreibt in den Ordner „${target}“.`}
      </p>
    </>
  )
}
