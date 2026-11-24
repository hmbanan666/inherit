import { depot, furnace, lathe, orders, press } from 'inherit'
import { unload } from './haul'
import { begin, carry, carts, feed, rememberVein, smelt } from './mill-floor'

function gears() {
  const order = orders()[0]
  if (!order || order.item !== 'gear') return
  const left = order.qty - order.shipped - depot.count('gear') - lathe.count('gear')
  if (lathe.count('blank') > 0 && left > 0) begin(id => lathe.start(id === 'gear' ? 'gear' : 'pin'), 'gear')
  if (press.count('steel') > 0 && press.count('blank') + lathe.count('blank') < left) begin(id => press.start(id === 'blank' ? 'blank' : 'plate'), 'blank')
  if (left > 0) smelt('alloy')
  const { miner, hauler } = carts()
  const needCoal = furnace.coal < 1 && furnace.steel < 1 && left > 0
  feed(miner, needCoal ? 'coal' : 'ore')
  if (!hauler || hauler.busy) return
  if (hauler.cargo > 0) {
    try { unload(hauler) } catch { /* raw cargo can wait */ }
    return
  }
  if (lathe.count('gear') > 0) {
    carry(hauler, 'gear', lathe, depot, Math.min(lathe.count('gear'), hauler.capacity))
    return
  }
  if (press.count('blank') > 0 && lathe.count('blank') < 1) {
    carry(hauler, 'blank', press, lathe, Math.min(press.count('blank'), hauler.capacity, 3 - lathe.count('blank')))
    return
  }
  if (furnace.steel > 0 && press.count('steel') < 1) {
    carry(hauler, 'steel', furnace, press, Math.min(furnace.steel, hauler.capacity, 3 - press.count('steel')))
  }
}

export function workGears() {
  if (orders()[0]?.item !== 'gear') return
  rememberVein()
  gears()
}
