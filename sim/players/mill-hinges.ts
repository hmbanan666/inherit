import { bench, depot, furnace, lathe, orders, press } from 'inherit'
import { unload } from './haul'
import { begin, carry, carts, feed, rememberVein, smelt } from './mill-floor'

function hinges() {
  const order = orders()[0]
  if (!order || order.item !== 'hinge') return
  const left = order.qty - order.shipped - depot.count('hinge') - bench.count('hinge')
  if (bench.count('plate') > 0 && bench.count('pin') > 0 && left > 0) begin(id => bench.start(id === 'hinge' ? 'hinge' : 'pack'), 'hinge')
  if (press.count('ingot') > 0 && press.count('plate') < left) begin(id => press.start(id === 'plate' ? 'plate' : 'blank'), 'plate')
  if (lathe.count('steel') > 0 && lathe.count('pin') < left) begin(id => lathe.start(id === 'pin' ? 'pin' : 'gear'), 'pin')
  if (left > 0 && furnace.coal >= 1) smelt('alloy')
  else if (left > 0) smelt('smelt')
  const { miner, hauler } = carts()
  const needCoal = left > 0 && furnace.coal < 1 && furnace.steel + lathe.count('steel') + lathe.count('pin') < left
  feed(miner, needCoal ? 'coal' : 'ore')
  if (!hauler || hauler.busy) return
  if (hauler.cargo > 0) {
    try { unload(hauler) } catch { /* raw cargo can wait */ }
    return
  }
  if (bench.count('hinge') > 0) {
    carry(hauler, 'hinge', bench, depot, Math.min(bench.count('hinge'), hauler.capacity))
    return
  }
  if (press.count('plate') > 0 && bench.count('plate') < left) {
    carry(hauler, 'plate', press, bench, Math.min(press.count('plate'), hauler.capacity, left - bench.count('plate'), 3 - bench.count('plate')))
    return
  }
  if (lathe.count('pin') > 0 && bench.count('pin') < left) {
    carry(hauler, 'pin', lathe, bench, Math.min(lathe.count('pin'), hauler.capacity, left - bench.count('pin'), 3 - bench.count('pin')))
    return
  }
  if (furnace.output > 0 && press.count('ingot') < 1) {
    carry(hauler, 'ingot', furnace, press, Math.min(furnace.output, hauler.capacity, 3 - press.count('ingot')))
    return
  }
  if (furnace.steel > 0 && lathe.count('steel') < 1) {
    carry(hauler, 'steel', furnace, lathe, Math.min(furnace.steel, hauler.capacity, 3 - lathe.count('steel')))
  }
}

export function workHinges() {
  if (orders()[0]?.item !== 'hinge') return
  rememberVein()
  hinges()
}
