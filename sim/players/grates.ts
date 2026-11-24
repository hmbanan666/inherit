import { depot, drones, furnace, orders, press } from 'inherit'
import { mine, unload } from './lib/haul'

// Elsie: one cart feeds the press, the other carries the grate home.
// A plate or a blank order is left alone.
export function onTick() {
  if (orders()[0]?.item === 'grate' && press.installed) {
    if (press.count('grate') < 2) press.start('grate')
    if (!furnace.steel) furnace.start('alloy')
    const [feeder, hauler] = drones()
    feed(feeder)
    carry(hauler)
    return
  }
  const steel = orders()[0]?.item === 'steel'
  if (steel && !furnace.steel) furnace.alloy()
  if (!steel && !furnace.output) furnace.smelt()
  const [miner, hauler] = drones()
  if (miner && !miner.busy) {
    if (miner.cargo) unload(miner)
    else mine(miner, 'ore')
  }
  if (!hauler || hauler.busy) return
  if (hauler.cargo) unload(hauler)
  else if (furnace.output || furnace.steel) hauler.pickup(furnace)
  else if (steel && !furnace.coal) mine(hauler, 'coal')
}

function feed(cart: ReturnType<typeof drones>[number] | undefined) {
  if (!cart || cart.busy) return
  if (cart.cargo > 0) {
    unload(cart)
    return
  }
  const need = 2 - press.count('steel')
  if (need > 0 && furnace.steel > 0) {
    cart.transfer('steel', furnace, press, Math.min(furnace.steel, need, cart.capacity))
    return
  }
  mine(cart, furnace.coal ? 'ore' : 'coal')
}

function carry(cart: ReturnType<typeof drones>[number] | undefined) {
  if (!cart || cart.busy) return
  if (cart.cargo > 0) {
    unload(cart)
    return
  }
  if (press.count('grate') > 0) {
    cart.transfer('grate', press, depot, 1)
    return
  }
  mine(cart, 'ore')
}
