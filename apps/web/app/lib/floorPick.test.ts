import { expect, test } from 'vitest'
import { kettlewick } from '@inherit/sim/v8'
import { buildingLabelHit } from './floorPick'

test('the depot caption is hit above the tile, and the tile itself is not the caption', () => {
  const tile = 96
  const spots = [
    { id: 'depot', title: 'Depot', pos: kettlewick.depot.pos },
    { id: 'furnace', title: 'Furnace', pos: kettlewick.furnace.pos },
  ]
  const depot = kettlewick.depot.pos
  const cx = (depot.x + 0.5) * tile
  const cy = (depot.y + 0.5) * tile
  expect(buildingLabelHit(cx, cy - 50, tile, spots)).toBe('depot')
  expect(buildingLabelHit(cx, cy, tile, spots)).toBeUndefined()
  const furnace = kettlewick.furnace.pos
  const fx = (furnace.x + 0.5) * tile
  const fy = (furnace.y + 0.5) * tile
  expect(buildingLabelHit(fx, fy - 50, tile, spots)).toBe('furnace')
})
