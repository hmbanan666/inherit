import { referenceActions, type Campaign, type MachineKind, type Objective } from '@inherit/sim'

export type BuildTool = MachineKind | 'belt' | 'remove'
type Button = Extract<Objective['highlight'], { type: 'button' }>['id']
export type BuildGuide =
  | ['focus' | 'research', string]
  | ['button', Button]
  | ['plot', string, string]
  | ['tile', string, number, number, MachineKind?]
  | ['machine', MachineKind, string, number, number]
  | ['shop', MachineKind, string]
  | ['belt' | 'unbelt', string, string]
  | ['belt-tool' | 'road']
  | undefined

export function buildGuide(c: Campaign, objective?: Objective): BuildGuide {
  if (!objective) return
  const target = objective.highlight
  switch (target.type) {
    case 'button':
      return ['button', target.id]
    case 'research':
      return ['research', target.id]
    case 'plot':
      return ['plot', target.siteId, target.id]
    case 'tile':
      return ['tile', target.siteId, target.x, target.y, target.tool]
    case 'machine': {
      const machines = c.world.machines.filter(
        (m) => m.kind === target.kind && (!target.deposit || m.deposit === target.deposit),
      )
      const station = target.id
        ? machines.find((m) => m.id === target.id)
        : (machines.find((m) => m.recipe === target.recipe) ?? machines[0])
      if (station) return ['focus', station.id]
      return
    }
    case 'shop': {
      if (target.item === 'road') return ['road']
      const actions = referenceActions(objective.id)
      if (target.item === 'belt') {
        for (const [action, from, to] of actions) {
          if (action !== 'belt' && action !== 'unbelt') continue
          const source = typeof from === 'string' ? from : c.memory[from.memory]
          const dest = typeof to === 'string' ? to : c.memory[to.memory]
          if (typeof source !== 'string' || typeof dest !== 'string') continue
          if (![source, dest].every((id) => c.world.machines.some((m) => m.id === id))) continue
          const exists = c.world.belts.some((b) => b.from === source && b.to === dest)
          if (exists === (action === 'unbelt')) return [action, source, dest]
        }
        return ['belt-tool']
      }
      const site = target.siteId ?? 'shed'
      for (const a of actions)
        if (a[0] === 'machine' && a[1] === target.item && a[2] === site)
          return ['machine', a[1], site, a[3], a[4]]
      return ['shop', target.item, site]
    }
  }
}
