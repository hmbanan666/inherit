import { drones, furnace } from 'inherit'
import { mine, unload } from './lib/haul'

export function onTick() {
  if (!furnace.steel) furnace.alloy()
  const cart = drones()[0]
  if (cart.busy) return
  if (cart.cargo) unload(cart)
  else if (furnace.steel || furnace.output) cart.pickup(furnace)
  else mine(cart, furnace.coal ? 'ore' : 'coal')
}
