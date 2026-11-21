import type { BlueprintAPI } from './campaign-api'
import { machineRecipes } from './catalog'
import type { Campaign } from './model'
import { purchaseMachine, purchaseBelt, sellMachine } from './shop'

/** One allowance and one error slot shared by all handlers for this tick. */
export function blueprintCommands(c: Campaign): BlueprintAPI {
  let attempts = 0
  let error: string | undefined
  function fail(reason: string): undefined {
    error = reason
    return undefined
  }
  function canAttempt() {
    error = undefined
    if (++attempts <= 4) return true
    fail('Construction limit reached (4 attempts per tick).')
    return false
  }
  return {
    build(kind, x, y, opts = {}) {
      if (!canAttempt()) return
      const { siteId = 'shed', recipe, deposit } = opts
      if (recipe !== undefined && !machineRecipes(kind).includes(recipe))
        return fail('This machine cannot run that recipe.')
      if (deposit !== undefined) {
        const site = c.world.sites.find((s) => s.id === siteId)
        if (kind !== 'miner' || !site?.deposits.some((d) => d.x === x && d.y === y && d.kind === deposit))
          return fail('Place a miner on the requested deposit.')
      }
      const machine = purchaseMachine(c, kind, siteId, x, y, undefined, fail)
      if (!machine) return
      machine.builtByCode = true
      if (recipe !== undefined) machine.recipe = recipe
      return machine.id
    },
    connect(from, to) {
      if (!canAttempt()) return false
      const belt = purchaseBelt(c, from, to, undefined, fail)
      if (!belt) return false
      belt.builtByCode = true
      return true
    },
    dismantle(id) {
      if (!canAttempt()) return false
      if (sellMachine(c, id)) return true
      fail('Machine missing or assigned to an active truck trip.')
      return false
    },
    lastError: () => error,
  }
}
