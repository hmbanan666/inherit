import type { Cell } from '@inherit/sim/v8'

export interface LabelSpot {
  id: string
  title: string
  pos: Cell
}

/**
 * The Depot and Furnace captions sit above the building.
 * A hit here selects the building even when a drone stands on the tile.
 */
export function buildingLabelHit(px: number, py: number, tile: number, spots: readonly LabelSpot[]) {
  for (const spot of spots) {
    const cx = (spot.pos.x + 0.5) * tile
    const cy = (spot.pos.y + 0.5) * tile
    const width = Math.max(72, spot.title.length * 11)
    const left = cx - width / 2
    const top = cy - 63
    if (px >= left && px <= left + width && py >= top && py <= top + 22) return spot.id
  }
}
