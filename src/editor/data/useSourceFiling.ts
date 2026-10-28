import { useState } from 'react'
import type { DataSource } from '../../core/data/dataSources'
import type { LibraryStore } from '../state/LibraryStore'
import { loadSourceTabs, persistSourceTabs } from '../state/maskStorage'
import type { SourceTab } from './SourceTabs'
import { allTabs, isStockTab, movedTo, sameTab, STOCK_TABS, tabOf, unfiled } from './sourceFiling'

function firstTab(sources: readonly DataSource[], startId: string | null): string {
  const start = sources.find((s) => s.id === startId)
  if (start) return tabOf(start)
  return STOCK_TABS.find((t) => sources.some((s) => sameTab(tabOf(s), t))) ?? STOCK_TABS[0]
}

// Which tab of the data window is open, and what the tab bar does to the sources.
export function useSourceFiling(store: LibraryStore<DataSource>, startId: string | null) {
  const [own, setOwn] = useState(loadSourceTabs)
  const [tab, setTab] = useState(() => firstTab(store.list, startId))

  const keepOwn = (next: string[]) => {
    setOwn(next)
    persistSourceTabs(next)
  }
  const tabs: SourceTab[] = allTabs(store.list, own).map((name) => ({
    name,
    count: store.list.filter((s) => sameTab(tabOf(s), name)).length,
    own: !isStockTab(name),
  }))
  const refile = (from: string, to: string | null) => {
    for (const s of store.list) {
      if (s.folder !== undefined && sameTab(s.folder, from))
        store.update(s.id, to === null ? unfiled(s) : movedTo(s, to))
    }
  }

  return {
    tab,
    shown: store.list.filter((s) => sameTab(tabOf(s), tab)),
    bar: {
      tabs,
      active: tab,
      onPick: setTab,
      onDropSource: (id: string, to: string) => {
        const s = store.get(id)
        if (s && !sameTab(tabOf(s), to)) store.update(id, movedTo(s, to))
      },
      onCreate: (name: string) => {
        const known = tabs.find((t) => sameTab(t.name, name))
        if (!known) keepOwn([...own, name])
        setTab(known?.name ?? name)
      },
      onRename: (was: string, name: string) => {
        if (tabs.some((t) => sameTab(t.name, name) && !sameTab(t.name, was))) return
        keepOwn(own.some((t) => sameTab(t, was)) ? own.map((t) => (sameTab(t, was) ? name : t)) : [...own, name])
        refile(was, name)
        setTab(name)
      },
      onRemove: (name: string) => {
        keepOwn(own.filter((t) => !sameTab(t, name)))
        refile(name, null)
        setTab(STOCK_TABS[0])
      },
    },
  }
}
