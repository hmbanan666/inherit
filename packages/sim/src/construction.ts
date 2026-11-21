import { MACHINES } from './catalog'
import type { MachineKind } from './campaign-api'
import type { Campaign, CampaignBelt, CampaignMachine, Plot, Site, Tile } from './model'

function contains(plot: Plot, { x, y }: Tile) {
  return x >= plot.x && x < plot.x + plot.width && y >= plot.y && y < plot.y + plot.height
}
function owned(site: Site, tile: Tile) {
  return (
    Number.isSafeInteger(tile.x) &&
    Number.isSafeInteger(tile.y) &&
    site.plots.some((p) => p.status === 'owned' && contains(p, tile))
  )
}
function adjacent(a: Plot, b: Plot) {
  const overlaps = (start: number, size: number, other: number, length: number) =>
    start < other + length && start + size > other
  return (
    ((a.x + a.width === b.x || b.x + b.width === a.x) && overlaps(a.y, a.height, b.y, b.height)) ||
    ((a.y + a.height === b.y || b.y + b.height === a.y) && overlaps(a.x, a.width, b.x, b.width))
  )
}
function affordable(campaign: Campaign, cost: number) {
  return Number.isSafeInteger(cost) && cost >= 0 && campaign.economy.money >= cost
}
export function buyPlot(campaign: Campaign, siteId: string, plotId: string): boolean {
  const site = campaign.world.sites.find((s) => s.id === siteId)
  const plot = site?.plots.find((p) => p.id === plotId)
  if (
    !site ||
    !plot ||
    plot.status !== 'sale' ||
    !affordable(campaign, plot.price) ||
    !site.plots.some((p) => p.status === 'owned' && adjacent(p, plot))
  )
    return false
  campaign.economy.money -= plot.price
  plot.status = 'owned'
  return true
}
export function placeMachine(
  campaign: Campaign,
  kind: MachineKind,
  siteId: string,
  x: number,
  y: number,
  id?: string,
  cost = 0,
): CampaignMachine | undefined {
  const { world } = campaign
  const site = world.sites.find((s) => s.id === siteId)
  if (!site || !Object.hasOwn(MACHINES, kind) || !owned(site, { x, y }) || !affordable(campaign, cost)) return
  if (world.machines.some((machine) => machine.siteId === siteId && machine.x === x && machine.y === y))
    return
  const deposit = site.deposits.find((d) => d.x === x && d.y === y)
  if (kind === 'miner' && !deposit) return
  if (id === undefined) {
    do {
      id = kind + '-' + world.nextMachineId++
    } while (world.machines.some((machine) => machine.id === id))
  }
  if (!id || world.machines.some((machine) => machine.id === id)) return
  const machine: CampaignMachine = {
    id,
    kind,
    siteId,
    x,
    y,
    paid: cost,
    builtAt: world.tick,
    remaining: 0,
    queue: [],
    status: 'idle',
    recentProduction: [],
    stats: { processed: 0, activeTicks: 0, idleTicks: 0, blockedTicks: 0, rate: 0 },
  }
  if (kind === 'miner') machine.deposit = deposit!.kind
  if (MACHINES[kind].defaultRecipe) machine.recipe = MACHINES[kind].defaultRecipe
  world.machines.push(machine)
  campaign.economy.money -= cost
  return machine
}
const same = (a: Tile, b: Tile) => a.x === b.x && a.y === b.y
const distance = (a: Tile, b: Tile) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
// Breadth-first search gives the same shortest owned route for every replay.
export function autoPath(site: Site, start: Tile, end: Tile): Tile[] | undefined {
  const open = [{ x: start.x, y: start.y, parent: -1 }]
  const seen = new Set([start.x + ',' + start.y])
  for (let i = 0; i < open.length; i++) {
    const at = open[i]
    if (same(at, end)) {
      const path: Tile[] = []
      for (let j = i; j >= 0; j = open[j].parent) path.push({ x: open[j].x, y: open[j].y })
      return path.reverse()
    }
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const x = at.x + dx,
        y = at.y + dy,
        key = x + ',' + y
      if (!seen.has(key) && owned(site, { x, y })) {
        seen.add(key)
        open.push({ x, y, parent: i })
      }
    }
  }
}
export function connectBelt(
  campaign: Campaign,
  from: string,
  to: string,
  path?: Tile[],
  cost = 0,
): CampaignBelt | undefined {
  const { world } = campaign
  const a = world.machines.find((machine) => machine.id === from),
    b = world.machines.find((machine) => machine.id === to)
  if (
    !a ||
    !b ||
    a === b ||
    a.siteId !== b.siteId ||
    ['dock', 'truck'].includes(a.kind) ||
    !MACHINES[b.kind].bin ||
    !affordable(campaign, cost)
  )
    return
  if (world.belts.some((link) => link.from === from && (link.to === to || !MACHINES[a.kind].routes))) return
  const site = world.sites.find((s) => s.id === a.siteId)!
  const tiles = path ?? autoPath(site, a, b)
  if (
    !tiles ||
    tiles.length < 2 ||
    !same(tiles[0], a) ||
    !same(tiles[tiles.length - 1], b) ||
    tiles.some((p, i) => !owned(site, p) || (i > 0 && distance(p, tiles[i - 1]) !== 1))
  )
    return
  const belt: CampaignBelt = {
    siteId: a.siteId,
    from,
    to,
    path: tiles.map(({ x, y }) => ({ x, y })),
    items: [],
    sequence: 0,
    paid: cost,
  }
  world.belts.push(belt)
  campaign.economy.money -= cost
  return belt
}
export function removeBelt(campaign: Campaign, from: string, to: string): boolean {
  const i = campaign.world.belts.findIndex((b) => b.from === from && b.to === to)
  if (i < 0) return false
  const [belt] = campaign.world.belts.splice(i, 1)
  campaign.economy.money += belt.paid
  campaign.world.lost += belt.items.length
  return true
}
export function removeMachine(campaign: Campaign, id: string): boolean {
  const { world } = campaign
  const i = world.machines.findIndex((machine) => machine.id === id)
  if (i < 0 || world.trips.some((t) => t.truckId === id || t.from === id || t.to === id)) return false
  for (const b of [...world.belts]) if (b.from === id || b.to === id) removeBelt(campaign, b.from, b.to)
  const [machine] = world.machines.splice(i, 1)
  campaign.economy.money += machine.paid
  world.lost += machine.queue.length + Number(!!machine.output || machine.remaining > 0)
  for (const incident of world.incidents) {
    if (incident.machineId === id && incident.endTick === undefined) incident.endTick = world.tick
  }
  return true
}
