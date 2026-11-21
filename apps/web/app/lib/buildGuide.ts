import { referenceActions, type Campaign, type MachineKind } from '@inherit/sim'

export type BuildTool = MachineKind | 'belt' | 'remove'
export function buildGuide(c: Campaign, objective?: string) {
  return referenceActions(objective ?? '').find((a) => {
    switch (a[0]) {
      case 'research':
        return !c.economy.research.includes(a[1])
      case 'plot':
        return c.world.sites.find((s) => s.id === a[1])?.plots.find((p) => p.id === a[2])?.status === 'sale'
      case 'machine':
        return !c.world.machines.some((m) => m.id === a[5])
      case 'belt':
        return !c.world.belts.some((b) => b.from === a[1] && b.to === a[2])
      case 'unbelt':
        return c.world.belts.some((b) => b.from === a[1] && b.to === a[2])
      case 'road':
        return !c.economy.road
      default:
        return false
    }
  })
}
export type BuildGuide = ReturnType<typeof buildGuide>
