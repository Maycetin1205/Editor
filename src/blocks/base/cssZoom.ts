export function cssZoomOf(el: Element): number {
  const zoom = el.currentCSSZoom
  return typeof zoom === 'number' && zoom > 0 ? zoom : 1
}
