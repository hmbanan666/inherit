import { hoverScale, tile, type Box } from './floorPick'
import { houseBox, propBox, villageGround, villageHomes, villageLots, villageProps, villagerBox, type VillageView } from './village'

const stepRadius = 0.3 * tile

function hash(who: string) {
  let seed = 2166136261
  for (let i = 0; i < who.length; i++) seed = Math.imul(seed ^ who.charCodeAt(i), 16777619)
  return seed
}

// Independent samples for a cycle's duration and destination, with no mutable RNG.
function sample(seed: number, index: number) {
  let n = seed + Math.imul(index, 0x9e3779b9)
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad)
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97)
  return ((n ^ (n >>> 15)) >>> 0) / 0x100000000
}

function nominal(radius: number) {
  return { left: -radius, right: radius, top: -radius / 2, bottom: radius / 2 }
}

export const bobHeight = 2
type Npc = VillageView['npcs'][number]

function footprint(npc: Npc): Box {
  const box = villagerBox({ x: 0, y: 0 }, npc.name)
  return {
    x: npc.spot.x + box.x * hoverScale, y: npc.spot.y + (box.y - bobHeight) * hoverScale,
    w: box.w * hoverScale, h: (box.h + bobHeight) * hoverScale,
  }
}

const scenery = [
  ...Object.values(villageHomes).map(houseBox), ...villageProps.map(propBox),
  villageGround.river, villageGround.road, villageGround.spur, ...villageGround.lanes,
]

/** Convex bounds for every destination and everything on the straight walk between two stops. */
export function wanderEnvelope(npc: Npc, neighbours: Npc[], radius = stepRadius) {
  const box = footprint(npc)
  const lot = villageLots.find(lot => lot.building === npc.building)!
  // All house lots end west of the works fence.
  const limits = {
    left: Math.max(-radius, lot.x - box.x), right: Math.min(radius, lot.x + lot.w - (box.x + box.w)),
    top: Math.max(-radius / 2, lot.y - box.y), bottom: Math.min(radius / 2, lot.y + lot.h - (box.y + box.h)),
  }

  // Stay on one side of each obstacle. The greatest signed gap also picks the
  // nearest clear edge when a Phase 3b caption already protrudes into a lane.
  function exclude(other: Box, share: number) {
    const left = other.x - (box.x + box.w), right = box.x - (other.x + other.w)
    const above = other.y - (box.y + box.h), below = box.y - (other.y + other.h)
    const gap = Math.max(left, right, above, below)
    if (gap === left) limits.right = Math.min(limits.right, left * share)
    else if (gap === right) limits.left = Math.max(limits.left, -right * share)
    else if (gap === above) limits.bottom = Math.min(limits.bottom, above * share)
    else limits.top = Math.max(limits.top, -below * share)
  }
  for (const obstacle of scenery) exclude(obstacle, 1)
  for (const neighbour of neighbours) {
    if (neighbour.id !== npc.id && neighbour.building === npc.building) exclude(footprint(neighbour), 0.5)
  }

  // At the farthest vertical extreme, both horizontal extremes still fit inside the circle.
  const base = villageHomes[npc.building]
  const dy = npc.spot.y - base.y
  const farY = Math.max(Math.abs(dy + limits.top), Math.abs(dy + limits.bottom))
  const reachX = Math.sqrt(240 ** 2 - farY ** 2)
  limits.left = Math.max(limits.left, base.x - npc.spot.x - reachX)
  limits.right = Math.min(limits.right, base.x - npc.spot.x + reachX)
  return limits
}

export function wanderFrozen(flags: {
  hovered: boolean; dialog: boolean; reducedMotion: boolean; pressed?: boolean; hidden?: boolean; paused?: boolean
}) {
  return !!(flags.hovered || flags.dialog || flags.reducedMotion || flags.pressed || flags.hidden || flags.paused)
}

/** World-pixel offset at ms milliseconds of this villager's active animation time. */
export function wanderOffset(who: string, ms: number, radius = stepRadius, limits = nominal(radius)) {
  const seed = hash(who)
  const period = 6000 + 3000 * sample(seed, -1)
  const elapsed = Math.max(0, ms) + 4000 * sample(seed, -2)
  const cycle = Math.floor(elapsed / period)
  const walk = 1200 + 600 * sample(seed, 3 * cycle)
  const t = Math.max(0, 1 - (period - elapsed % period) / walk)
  const ease = t * t * (3 - 2 * t)

  function target(stop: number) {
    if (stop === 0) return {
      x: Math.min(limits.right, Math.max(limits.left, 0)),
      y: Math.min(limits.bottom, Math.max(limits.top, 0)),
    }
    return {
      x: limits.left + sample(seed, 3 * stop + 1) * (limits.right - limits.left),
      y: limits.top + sample(seed, 3 * stop + 2) * (limits.bottom - limits.top),
    }
  }

  const from = target(cycle)
  const to = target(cycle + 1)
  return { x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease, walking: t > 0 }
}

export interface WanderClock { ms: number; previous?: number }

/** A frozen or unobserved interval contributes zero active milliseconds. */
export function advanceWander(clock: WanderClock, now: number, frozen: boolean): WanderClock {
  if (frozen) return { ms: clock.ms }
  return { ms: clock.ms + Math.max(0, now - (clock.previous ?? now)), previous: now }
}

export function markerBob(mark: Npc['mark'], ms: number) {
  return mark === 'offer' || mark === 'ready' ? bobHeight * Math.sin(2 * Math.PI * (ms % 1600) / 1600) : 0
}
