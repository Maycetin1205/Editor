import { fitZoom, MASK_ROOT_CLASS } from '../core/block/frameFit'

let started = false

export function fitToFrame(from: Element): void {
  if (started) return
  const sheet = from.closest(`.${MASK_ROOT_CLASS}`)
  if (!(sheet instanceof HTMLElement)) return
  started = true
  const fit = (): void => {
    sheet.style.zoom = ''
    const zoom = fitZoom(sheet.clientHeight, sheet.scrollHeight)
    sheet.style.zoom = zoom === 1 ? '' : String(zoom)
  }
  fit()
  void document.fonts.ready.then(fit)
  window.addEventListener('resize', fit)
}
