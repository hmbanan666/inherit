import type { MachineKind } from './campaign-api'
import type { Campaign, Tile } from './model'
import { autoPath, buyPlot, connectBelt, placeMachine, removeMachine, removeBelt } from './construction'
import { getSurface } from './surface'

import { PRICES } from './prices'
export { PRICES } from './prices'

export function purchaseMachine(
  c: Campaign,
  kind: MachineKind,
  siteId: string,
  x: number,
  y: number,
  id?: string,
  fail?: (reason: string) => undefined,
) {
  if (!getSurface(c).machines.includes(kind)) return fail?.('Machine unavailable at this research level.')
  if (siteId === 'yard' && !c.economy.road) return fail?.('Buy the road to the yard first.')
  const deposit = c.world.sites.find((s) => s.id === siteId)?.deposits.find((d) => d.x === x && d.y === y)
  if (kind === 'miner' && deposit?.kind === 'copper' && !c.economy.research.includes('copper'))
    return fail?.('Research Copper claim to mine copper.')
  if (kind === 'miner' && deposit?.kind === 'coal' && !c.economy.research.includes('press'))
    return fail?.('Research Stamping dies to mine coal.')
  return placeMachine(c, kind, siteId, x, y, id, PRICES.machines[kind], fail)
}
export function purchaseBelt(
  c: Campaign,
  from: string,
  to: string,
  path?: Tile[],
  fail?: (reason: string) => undefined,
) {
  const a = c.world.machines.find((m) => m.id === from)
  const b = c.world.machines.find((m) => m.id === to)
  if (!a || !b || a.siteId !== b.siteId) return fail?.('Choose two machines on the same site.')
  if (a.siteId === 'yard' && !c.economy.road) return fail?.('Buy the road to the yard first.')
  const site = c.world.sites.find((s) => s.id === a.siteId)!
  const tiles = path ?? autoPath(site, a, b)
  if (!tiles) return fail?.('No belt path across owned tiles.')
  return connectBelt(c, from, to, tiles, PRICES.beltPerTile * tiles.length, fail)
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
