import type { MachineKind } from './campaign-api'
import type { Campaign, Tile } from './model'
import { autoPath, buyPlot, connectBelt, placeMachine, removeMachine, removeBelt } from './construction'
import { getSurface } from './research'

import { PRICES } from './prices'
export { PRICES } from './prices'

export function purchaseMachine(
  c: Campaign,
  kind: MachineKind,
  siteId: string,
  x: number,
  y: number,
  id?: string,
) {
  if (!getSurface(c).machines.includes(kind) || (siteId === 'yard' && !c.economy.road)) return
  const deposit = c.world.sites.find((s) => s.id === siteId)?.deposits.find((d) => d.x === x && d.y === y)
  if (kind === 'miner' && deposit?.kind === 'copper' && !c.economy.research.includes('copper')) return
  if (kind === 'miner' && deposit?.kind === 'coal' && !c.economy.research.includes('press')) return
  return placeMachine(c, kind, siteId, x, y, id, PRICES.machines[kind])
}
export function purchaseBelt(c: Campaign, from: string, to: string, path?: Tile[]) {
  const a = c.world.machines.find((m) => m.id === from)
  const b = c.world.machines.find((m) => m.id === to)
  if (!a || !b || a.siteId !== b.siteId || (a.siteId === 'yard' && !c.economy.road)) return
  const site = c.world.sites.find((s) => s.id === a.siteId)!
  const tiles = path ?? autoPath(site, a, b)
  if (tiles) return connectBelt(c, from, to, tiles, PRICES.beltPerTile * tiles.length)
}
export function purchasePlot(c: Campaign, siteId: string, plotId: string) {
  return (
    c.economy.research.includes('survey') &&
    (siteId !== 'yard' || c.economy.road) &&
    buyPlot(c, siteId, plotId)
  )
}
export function purchaseRoad(c: Campaign): boolean {
  const e = c.economy
  if (e.road || !e.research.includes('road') || e.money < PRICES.road) return false
  e.money -= PRICES.road
  e.road = true
  const spur = c.world.sites.find((s) => s.id === 'shed')?.plots.find((p) => p.id === 'rail-spur')
  if (spur?.status === 'locked') spur.status = 'sale'
  return true
}
export const sellMachine = removeMachine
export const sellBelt = removeBelt
