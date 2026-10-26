import { html, nothing, type TemplateResult } from 'lit'

interface FootPlacement {
  showsRows: boolean

  visible: number
  total: number
  searchesActive: boolean
  page: number
  pageCount: number

  totals: readonly { title: string; text: string }[]

  paging: boolean

  empty: boolean
}

interface FootAct {
  page: (to: number) => void
}

function recordText(args: { showsRows: boolean; visible: number; total: number; searchesActive: boolean }): string {
  if (!args.showsRows) return '— Datensätze'

  const word = (n: number): string => (n === 1 ? 'Datensatz' : 'Datensätze')
  const wordDative = (n: number): string => (n === 1 ? 'Datensatz' : 'Datensätzen')
  if (!args.searchesActive) {
    return args.total === 0 ? 'Keine Datensätze' : `${args.total} ${word(args.total)}`
  }
  if (args.visible === 0) return `Kein Treffer von ${args.total} ${wordDative(args.total)}`
  return `${args.visible} von ${args.total} ${wordDative(args.total)}`
}

function pageNavTpl(placement: FootPlacement, act: FootAct): TemplateResult | typeof nothing {
  if (!placement.paging || placement.pageCount <= 1) return nothing
  return html`<div class="page-nav">
        <button
          aria-label="Seite zurück"
          ?disabled=${placement.page <= 0}
          @click=${() => act.page(placement.page - 1)}
        >‹</button>
        <span>Seite ${placement.page + 1} von ${placement.pageCount}</span>
        <button
          aria-label="Seite vor"
          ?disabled=${placement.page >= placement.pageCount - 1}
          @click=${() => act.page(placement.page + 1)}
        >›</button>
      </div>`
}

// The foot only shows when it has something to say: pages, a search or sums.
export function tableFoot(placement: FootPlacement, act: FootAct): TemplateResult | typeof nothing {
  if (placement.empty) return nothing

  const saysSomething = placement.pageCount > 1 || placement.searchesActive || placement.totals.length > 0
  if (!saysSomething) return nothing
  return html`<div class="foot">
    <div class="page-info">${recordText({
      showsRows: placement.showsRows,
      visible: placement.visible,
      total: placement.total,
      searchesActive: placement.searchesActive,
    })}</div>
    ${
      placement.totals.length === 0
        ? nothing
        : html`<div class="totals">
      ${placement.totals.map(
        (s) => html`<span class="total">
        <span class="total-title">${s.title}</span>
        <b>${s.text}</b>
      </span>`,
      )}
    </div>`
    }
    <div class="foot-right">
      ${pageNavTpl(placement, act)}
    </div>
  </div>`
}
