import { useState } from 'react'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import { Strip } from '@/editor/widgets/Grid'
import type { DataSource } from '../../core/data/dataSources'
import { readMaskFields } from '../../core/data/maskFields'
import { useDataSources } from '../state/useDataSources'
import { withSettings } from './sourceEdit'

// Reads the fields of a mask source from pasted text, with their prefix.
export function MaskFields({ source }: { source: DataSource }) {
  const store = useDataSources()
  const [text, setText] = useState('')
  return (
    <div className="flex shrink-0 flex-col border-t border-line-soft">
      <Strip>Felder einlesen</Strip>
      <div className="flex flex-col gap-[6px] p-[8px]">
        <textarea
          aria-label="Felder einlesen"
          value={text}
          rows={3}
          onChange={(e) => setText(e.currentTarget.value)}
          className={cn(INPUT_EDGE, 'p-[8px] font-mono text-dense')}
        />
        <Button
          className="self-start"
          disabled={text.trim() === ''}
          onClick={() => {
            const read = readMaskFields(text)
            if (read === null) return
            store.update(
              source.id,
              withSettings(source, {
                fields: read.fields,
                ...(read.prefix !== '' ? { fieldPrefix: read.prefix } : {}),
              }),
            )
            setText('')
          }}
        >
          Felder übernehmen
        </Button>
      </div>
    </div>
  )
}
