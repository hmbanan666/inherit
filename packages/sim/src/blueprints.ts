import type { BlueprintAPI, BuildOptions, MachineKind } from './campaign-api'
import { machineRecipes } from './catalog'
import { connectBelt, placeMachine, removeMachine } from './construction'
import type { Campaign, Tile } from './model'
import { PRICES } from './prices'
import { getSurface } from './research'

const upstream: Partial<Record<MachineKind, MachineKind>> = {
  furnace: 'miner',
  splitter: 'miner',
  press: 'furnace',
  cutter: 'press',
  assembler: 'cutter',
}
function placement(c: Campaign, kind: MachineKind, opts: BuildOptions) {
  const site = c.world.sites.find((s) => s.id === 'shed')!
  const anchor = c.world.machines.find((m) => m.kind === upstream[kind]) ?? { x: 4, y: 2 }
  const tiles: Tile[] = []
  for (const p of site.plots.filter((p) => p.status === 'owned')) {
    for (let y = p.y; y < p.y + p.height; y++)
      for (let x = p.x; x < p.x + p.width; x++) {
        if ((opts.x !== undefined && opts.x !== x) || (opts.y !== undefined && opts.y !== y)) continue
        if (c.world.machines.some((m) => m.x === x && m.y === y && m.siteId === site.id)) continue
        if (
          kind === 'miner' &&
          !site.deposits.some((d) => d.x === x && d.y === y && (!opts.deposit || d.kind === opts.deposit))
        )
          continue
        tiles.push({ x, y })
      }
  }
  const distance = (p: Tile) => Math.abs(p.x - anchor.x) + Math.abs(p.y - anchor.y)
  return tiles.sort((a, b) => distance(a) - distance(b))[0]
}
export function blueprintCommands(c: Campaign): BlueprintAPI {
  let error: string | undefined
  const fail = (why: string) => {
    error = why
    return undefined
  }
  return {
    build(kind, opts = {}) {
      error = undefined
      const id = opts.name ?? kind
      const existing = c.world.machines.find((m) => m.id === id)
      if (existing) return existing.kind === kind ? id : fail('That name belongs to another machine.')
      if (!getSurface(c).machines.includes(kind)) return fail('This machine is still locked in Kettlewick.')
      if (opts.deposit && kind !== 'miner') return fail('Only miners use deposits.')
      if (opts.recipe && !machineRecipes(kind).includes(opts.recipe))
        return fail('Choose a recipe for this machine.')
      const tile = placement(c, kind, opts)
      if (!tile) return fail('Choose a free owned tile in the shed.')
      const m = placeMachine(c, kind, 'shed', tile.x, tile.y, id, PRICES.machines[kind], fail)
      if (!m) return
      if (opts.recipe) m.recipe = opts.recipe
      m.builtByCode = true
      return m.id
    },
    connect(from, to) {
      error = undefined
      if (c.world.belts.some((b) => b.from === from && b.to === to)) return true
      const b = connectBelt(c, from, to, undefined, 0, fail, true)
      if (b) b.builtByCode = true
      return !!b
    },
    dismantle(id) {
      return !!c.world.machines.find((m) => m.id === id)?.builtByCode && removeMachine(c, id)
    },
    clear(id) {
      const m = c.world.machines.find((m) => m.id === id)
      if (m?.fault !== 'jammed') return false
      c.world.lost += m.queue.length
      m.queue = []
      delete m.fault
      m.status = 'idle'
      return true
    },
    repair(id) {
      const m = c.world.machines.find((m) => m.id === id)
      if (m?.fault !== 'broken' || m.repairing || c.economy.money < 5) return false
      c.economy.money -= 5
      m.repairing = true
      m.coolAt = Math.min(m.coolAt!, c.world.tick + 12)
      return true
    },
    orders: () =>
      c.economy.orders.map((o) => ({
        id: o.id,
        who: o.customer,
        items: { ...o.items },
        filled: { ...o.filled },
        due: o.deadline!,
        late: c.world.tick > o.deadline!,
      })),
    lastError: () => error,
  }
}
