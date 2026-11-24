import { bench, depot, furnace, lathe, orders, press, type Target } from 'inherit'
import { unload } from './haul'
import { begin, carry, carts, feed, rememberVein, smelt, type Good } from './mill-floor'

function held(item: Good) {
  return depot.count(item) + press.count(item) + lathe.count(item) + bench.count(item)
}

/** The next station follows the part, not the machine it is sitting on. */
function shutterStop(part: Good): Target | undefined {
  if (part === 'plate') return lathe
  if (part === 'cut') return press
  if (part === 'shutter') return depot
  return undefined
}

function shutters() {
  const order = orders()[0]
  if (!order || order.item !== 'shutter') return
  const left = order.qty - order.shipped
  if (press.count('cut') > 0) begin(id => press.start(id === 'shutter' ? 'shutter' : 'plate'), 'shutter')
  else if (press.count('ingot') > 0 && held('plate') + held('cut') + held('shutter') < left) begin(id => press.start(id === 'plate' ? 'plate' : 'shutter'), 'plate')
  if (lathe.count('plate') > 0) begin(id => lathe.start(id === 'cut' ? 'cut' : 'gear'), 'cut')
  if (held('plate') + held('cut') + held('shutter') < left) smelt('smelt')
  const { miner, hauler } = carts()
  feed(miner, 'ore')
  if (!hauler || hauler.busy) return
  const carried = hauler.cargoKind
  if (carried === 'plate' || carried === 'cut' || carried === 'shutter') {
    const stop = shutterStop(carried)
    if (stop) {
      try { hauler.unload(stop) } catch { try { hauler.unload(depot) } catch { /* wait */ } }
    }
    return
  }
  if (hauler.cargo > 0) {
    try { unload(hauler) } catch { /* raw cargo */ }
    return
  }
  if (left > lathe.count('cut') + press.count('cut') + press.count('shutter') && lathe.count('gear') + lathe.count('pin') >= 3) {
    const blocking = lathe.count('pin') > 0 ? 'pin' : 'gear'
    carry(hauler, blocking, lathe, depot, 1)
    return
  }
  if (lathe.count('plate') < 1 && lathe.count('cut') < 1 && press.count('cut') < 1 && press.count('plate') < 1) {
    const from = bench.count('plate') > 0 ? bench : depot.count('plate') > 0 ? depot : undefined
    if (from) {
      carry(hauler, 'plate', from, lathe, 1)
      return
    }
  }
  const next: Good | undefined = press.count('shutter') > 0 ? 'shutter' : lathe.count('cut') > 0 ? 'cut' : press.count('plate') > 0 ? 'plate' : undefined
  if (next) {
    const from = next === 'cut' ? lathe : press
    const stop = shutterStop(next)
    if (stop) carry(hauler, next, from, stop, 1)
    return
  }
  if (furnace.output > 0 && press.count('ingot') < 1) {
    carry(hauler, 'ingot', furnace, press, Math.min(furnace.output, hauler.capacity, 3 - press.count('ingot')))
  }
}

export function workShutters() {
  if (orders()[0]?.item !== 'shutter') return
  rememberVein()
  shutters()
}
