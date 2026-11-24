import { drones, furnace, orders } from 'inherit'
import { mine, unload } from './lib/haul'

export function onTick() {
  const steel = orders()[0]?.item === 'steel'
  if (steel && !furnace.steel) furnace.alloy()
  if (!steel && !furnace.output) furnace.smelt()

  const [miner, hauler] = drones()
  if (!miner.busy) {
    if (miner.cargo) unload(miner)
    else mine(miner, 'ore')
  }
  if (hauler.busy) return
  if (hauler.cargo) unload(hauler)
  else if (furnace.output || furnace.steel) hauler.pickup(furnace)
  else if (steel && !furnace.coal) mine(hauler, 'coal')
}
