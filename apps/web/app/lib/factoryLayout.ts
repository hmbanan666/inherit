/** Widths for the Kettlewick Works frame. The map stays the largest share. */

export const questRailPx = 280
export const fileTreePx = 140
export const splitterPx = 7
export const worldInsetPx = 8
export const worldGapPx = 8

/** Horizontal pixels that are neither the quest rail, the map, nor the editor dock. */
export const layoutChromePx = splitterPx + worldInsetPx * 2 + worldGapPx

/** Editor dock share once the map already has its floor. */
export const editorPreferredShare = 0.38
export const editorDockMin = 16
export const editorDockMax = 40

/** The map's share of the window. The dock gives way to this before it takes its preferred share. */
export const mapMinShare = 0.45

/** Below this width the file tree starts collapsed. */
export const filesNarrowPx = 1280

export const dockStorageKey = 'inherit.v8.dock'
export const filesStorageKey = 'inherit.v8.files'

/** A space, then the word. The nav reads "300 credits", not "300credits". */
export const creditSuffix = ' credits'

export function formatCredits(amount: number) {
  return `${amount}${creditSuffix}`
}

export function clampDockPercent(percent: number, min = editorDockMin, max = editorDockMax) {
  if (!Number.isFinite(percent)) return min
  return Math.min(max, Math.max(min, percent))
}

/**
 * Editor dock as a percent of the window.
 * Prefers 38%, and never past 40%, but only after the map has 45% and the rail has its fixed width.
 * At 1024px that leaves the dock near a quarter. From about 1560px the dock is in the 35–40% band,
 * and wider windows give the extra space to the map.
 */
export function editorDockPercent(viewport: number) {
  if (viewport <= 0) return editorPreferredShare * 100
  const mapFloorPx = Math.ceil(viewport * mapMinShare - 1e-9)
  const maxForMap = viewport - mapFloorPx - questRailPx - layoutChromePx
  const dockPx = Math.min(viewport * editorPreferredShare, (viewport * editorDockMax) / 100, Math.max(0, maxForMap))
  return (dockPx / viewport) * 100
}

export function columnWidths(viewport: number, dockPercent = editorDockPercent(viewport)) {
  const editor = (viewport * dockPercent) / 100
  const map = viewport - editor - layoutChromePx - questRailPx
  return { quest: questRailPx, map, editor, splitter: splitterPx }
}

export function readFilesOpen(stored: string | null, viewport: number) {
  if (stored === 'open') return true
  if (stored === 'closed') return false
  return viewport >= filesNarrowPx
}

/**
 * Uniform scale for the grid inside the map frame.
 * The whole grid is shown when that already fills the frame.
 * When the whole grid would be a short band in a tall frame, the scale covers the frame
 * so the tiles fill it. Zooming out from that view still reaches the whole grid.
 */
export function fitScale(viewW: number, viewH: number, worldW: number, worldH: number) {
  if (viewW <= 0 || viewH <= 0 || worldW <= 0 || worldH <= 0) return 1
  const contain = Math.min(viewW / worldW, viewH / worldH)
  const cover = Math.max(viewW / worldW, viewH / worldH)
  const strip = worldH * contain < viewH * 0.55
  return strip ? cover : contain
}

export function containScale(viewW: number, viewH: number, worldW: number, worldH: number) {
  if (viewW <= 0 || viewH <= 0 || worldW <= 0 || worldH <= 0) return 1
  return Math.min(viewW / worldW, viewH / worldH)
}
