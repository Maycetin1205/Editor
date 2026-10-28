import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Icon } from '../icons/icon'
import { Button, PRESSED } from '../widgets/Button'
import { Popover } from '../widgets/Popover'
import { LabelsShown } from './labelsShown'

export function BarWindow({
  label,
  icon,
  width = 340,
  defaultOpen = false,
  flush = false,
  onOpen,
  children,
}: {
  label: string
  icon?: Icon
  width?: number
  defaultOpen?: boolean
  flush?: boolean
  onOpen?: () => void
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => {
    if (open) onOpen?.()
  }, [open, onOpen])
  const button = useRef<HTMLButtonElement>(null)
  const toggle = () => setOpen(!open)
  const pressed = open ? PRESSED : undefined
  return (
    <>
      {icon ? (
        <Button
          ref={button}
          onlyIcon
          aria-label={label}
          title={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={pressed}
          onClick={toggle}
        >
          {createElement(icon, { size: 15 })}
        </Button>
      ) : (
        <Button ref={button} aria-haspopup="dialog" aria-expanded={open} className={pressed} onClick={toggle}>
          {label}
        </Button>
      )}
      {open && (
        <Popover name={label} anchor={button} width={width} maxHeight={480} onClose={() => setOpen(false)}>
          <LabelsShown.Provider value>
            <div className={flush ? '-m-[6px]' : 'p-[4px]'}>{children(() => setOpen(false))}</div>
          </LabelsShown.Provider>
        </Popover>
      )}
    </>
  )
}
