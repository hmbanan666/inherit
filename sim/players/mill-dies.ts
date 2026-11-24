import { depot, furnace, orders, press } from 'inherit'
import { unload } from './haul'
import { begin, carry, carts, feed, rememberVein, smelt } from './mill-floor'

function wantsDies() {
  const lines = orders()[0]?.lines
  return !!lines?.some(line => line.item === 'plate') && !!lines?.some(line => line.item === 'blank')
}

function dies() {
  const lines = orders()[0]?.lines ?? []
  const plate = lines.find(line => line.item === 'plate')
  const blank = lines.find(line => line.item === 'blank')
  if (!plate || !blank) return
  const plateLeft = plate.qty - plate.shipped - depot.count('plate') - press.count('plate')
  const blankLeft = blank.qty - blank.shipped - depot.count('blank') - press.count('blank')
  if (plateLeft > 0 && press.count('ingot') > 0) begin(id => press.start(id === 'plate' ? 'plate' : 'blank'), 'plate')
  else if (blankLeft > 0 && press.count('steel') > 0) begin(id => press.start(id === 'blank' ? 'blank' : 'plate'), 'blank')
  const needSteel = blankLeft > 0 && furnace.steel + press.count('steel') < 1
  const needIngot = plateLeft > 0 && furnace.output + press.count('ingot') < 1
  if (needSteel) smelt('alloy')
  else if (needIngot) smelt('smelt')
  const { miner, hauler } = carts()
  feed(miner, needSteel && furnace.coal < 1 ? 'coal' : 'ore')
  if (!hauler || hauler.busy) return
  if (hauler.cargo > 0) {
    try { unload(hauler) } catch { /* raw cargo can wait */ }
    return
  }
  if (press.count('plate') > 0 && plate.shipped < plate.qty) {
    carry(hauler, 'plate', press, depot, 1)
    return
  }
  if (press.count('blank') > 0 && blank.shipped < blank.qty) {
    carry(hauler, 'blank', press, depot, 1)
    return
  }
  if (plateLeft > 0 && press.count('ingot') < 1 && furnace.output > 0) {
    carry(hauler, 'ingot', furnace, press, Math.min(furnace.output, hauler.capacity, 3 - press.count('ingot')))
    return
  }
  if (blankLeft > 0 && press.count('steel') < 1 && furnace.steel > 0) {
    carry(hauler, 'steel', furnace, press, Math.min(furnace.steel, hauler.capacity, 3 - press.count('steel')))
  }
}

export function workDies() {
  if (!wantsDies()) return
  rememberVein()
  dies()
}
