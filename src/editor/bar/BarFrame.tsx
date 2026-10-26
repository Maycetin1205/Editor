import { createElement, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Component } from '@/editor/icons/icon'
import { BLOCK_ICONS } from '../blockIcons'
import { LabelsShown } from './labelsShown'
import { useCloseOnScrollBeside } from '@/editor/widgets/closeBeside'

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

const EDGE = 8

export function BarFrame({
  at,
  onClose,
  children,
}: {
  at: { top: number; left: number }
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const bar = ref.current
    if (!bar) return
    const width = bar.getBoundingClientRect().width
    bar.style.left = `${Math.max(EDGE, Math.min(at.left, window.innerWidth - EDGE - width))}px`
  })

  useCloseOnScrollBeside(onClose)

  return createPortal(
    <div
      ref={ref}
      data-ff-editor-helper
      className="fixed z-[35] flex w-max items-center gap-[6px] whitespace-nowrap rounded border border-line bg-panel p-[4px] text-ui text-ink shadow-overlay"
      style={{ top: at.top, left: at.left }}
      onPointerDown={hold}
      onClick={hold}
      onDoubleClick={hold}
      onDragStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <LabelsShown.Provider value={false}>{children}</LabelsShown.Provider>
    </div>,
    document.body,
  )
}

export function BarSign({ type, name }: { type: string; name: string }) {
  return (
    <span role="img" aria-label={name} className="flex h-control items-center px-[4px]">
      {createElement(BLOCK_ICONS[type] ?? Component, { size: 16, className: 'text-ink-2', 'aria-hidden': true })}
    </span>
  )
}
