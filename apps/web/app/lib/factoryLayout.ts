/** Kettlewick Works frame. The map is a wide row, because the grid is 16 by 6. */

export const questRailPx = 280
export const fileTreePx = 140
export const treeRailPx = 36
export const splitterPx = 7
export const worldInsetPx = 8
export const worldGapPx = 8

/** One header row for the file tree, the open tabs, and the checks pane. */
export const editorHeaderPx = 36

/** Checks sit to the right of the code, inside the 280–320px band. */
export const checksPanePx = 300

/** Map row as a share of the column beside the quest rail. */
export const mapHeightShare = 0.45
export const mapHeightMin = 22
export const mapHeightMax = 75

/** Below this width the file tree starts collapsed. */
export const filesNarrowPx = 1280

export const mapHeightKey = 'inherit.v8.map-height'
export const filesStorageKey = 'inherit.v8.tree'
export const sideTabKey = 'inherit.v8.side'
export const treeWidthKey = 'inherit.v8.tree-width'
export const sideWidthKey = 'inherit.v8.side-width'

/** Open file tree and checks pane, in pixels. Double-click returns to the defaults. */
export const treeWidthMin = 96
export const treeWidthMax = 420
export const sideWidthMin = 220
export const sideWidthMax = 560

export type SideTab = 'checks' | 'console'

export function readSideTab(stored: string | null): SideTab {
  return stored === 'console' ? 'console' : 'checks'
}

/** A space, then the word. The nav reads "300 credits". */
export const creditSuffix = ' credits'

export function formatCredits(amount: number) {
  return `${amount}${creditSuffix}`
}

export function clampDockPercent(percent: number, min = 30, max = 70) {
  if (!Number.isFinite(percent)) return min
  return Math.min(max, Math.max(min, percent))
}

export function defaultMapHeight() {
  return mapHeightShare * 100
}

export function clampMapHeight(percent: number) {
  if (!Number.isFinite(percent)) return defaultMapHeight()
  return Math.min(mapHeightMax, Math.max(mapHeightMin, percent))
}

export function readMapHeight(stored: string | null) {
  if (stored === null || stored === '') return defaultMapHeight()
  return clampMapHeight(Number(stored))
}

export function readPaneWidth(stored: string | null, min: number, max: number, fallback: number) {
  if (stored === null || stored === '') return fallback
  const value = Number(stored)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Drop a leading `main.ts:18 · ` the console already shows in its own column. */
export function consoleBody(text: string) {
  return text.replace(/^[\w./-]+\.ts:\d+ · /, '')
}

/** Width of the map and editor column after the fixed rail and the frame padding. */
export function worksWidth(viewport: number) {
  return Math.max(0, viewport - questRailPx - worldInsetPx * 2 - worldGapPx)
}

export function readFilesOpen(stored: string | null, viewport: number) {
  if (stored === 'open') return true
  if (stored === 'closed') return false
  return viewport >= filesNarrowPx
}

/** Uniform scale that keeps the whole grid inside the frame and touches one edge. */
export function containScale(viewW: number, viewH: number, worldW: number, worldH: number) {
  if (viewW <= 0 || viewH <= 0 || worldW <= 0 || worldH <= 0) return 1
  return Math.min(viewW / worldW, viewH / worldH)
}

/** Where the contain-fit grid sits. The leftover space is split evenly on both axes. */
export function containPlace(viewW: number, viewH: number, worldW: number, worldH: number, zoom = 1) {
  const fit = containScale(viewW, viewH, worldW, worldH)
  const scale = fit * (Number.isFinite(zoom) && zoom > 0 ? zoom : 1)
  const drawnW = worldW * scale
  const drawnH = worldH * scale
  return { scale, x: (viewW - drawnW) / 2, y: (viewH - drawnH) / 2 }
}

/** The map fit is contain. The frame never crops the grid on load or resize. */
export function fitScale(viewW: number, viewH: number, worldW: number, worldH: number) {
  return containScale(viewW, viewH, worldW, worldH)
}
