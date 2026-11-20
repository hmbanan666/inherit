import type { Kind, Layout, Level, Link, Station } from './types'

export const COLUMNS = 9
export const ROWS = 4
const targets: Record<Kind, Kind[]> = {
  mine: ['furnace', 'splitter'],
  coal: ['assembler'],
  furnace: ['assembler', 'dispatch'],
  assembler: ['dispatch'],
  splitter: ['furnace'],
  dispatch: [],
}
export function canConnect(layout: Layout, from: string, to: string) {
  const source = layout.stations.find((m) => m.id === from)
  const target = layout.stations.find((m) => m.id === to)
  return (
    !!source &&
    !!target &&
    targets[source.kind].includes(target.kind) &&
    !layout.links.some((b) => b.from === from && (source.kind !== 'splitter' || b.to === to))
  )
}
export function canPlace(level: Level, stations: Station[], x: number, y: number) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < COLUMNS &&
    y >= 0 &&
    y < ROWS &&
    !!level.buildTiles?.some(([col, row]) => x === col && y === row) &&
    !stations.some((m) => m.x === x && m.y === y)
  )
}
// Rebuild from the fixed plan so a stale save cannot remove chapter equipment.
export function restoreLayout(level: Level, saved?: Partial<Layout>): Layout {
  const layout = structuredClone(level.layout)
  for (const option of level.additions) {
    const m = Array.isArray(saved?.stations) && saved.stations.find((s: Station) => s?.id === option.id)
    if (m && canPlace(level, layout.stations, m.x, m.y)) layout.stations.push({ ...option, x: m.x, y: m.y })
  }
  if (Array.isArray(saved?.links))
    for (const b of saved.links as Link[]) {
      if (b && canConnect(layout, b.from, b.to)) layout.links.push({ from: b.from, to: b.to })
    }
  return layout
}
