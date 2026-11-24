import { bench, depot, furnace, lathe, manifest, orders, press } from 'inherit'
import { unload } from './haul'
import { begin, carry, carts, feed, rememberVein, smelt, type Good } from './mill-floor'

function kits() {
  const order = orders()[0]
  if (!order || order.item !== 'winch') return
  const kit = manifest()
  const want = (item: Good) => kit.lines.find(line => line.item === item)?.qty ?? 0
  const gearShort = Math.max(0, want('gear') - bench.count('gear') - lathe.count('gear'))
  const gearNeed = Math.max(0, gearShort - lathe.count('blank') - press.count('blank'))
  const hingeNeed = Math.max(0, want('hinge') - bench.count('hinge'))
  const pinNeed = Math.max(0, hingeNeed - bench.count('pin') - lathe.count('pin'))
  const plateNeed = Math.max(0, hingeNeed - bench.count('plate') - press.count('plate'))
  const shutterShort = Math.max(0, want('shutter') - bench.count('shutter') - press.count('shutter'))
  const shutterNeed = Math.max(0, shutterShort - lathe.count('cut') - press.count('cut') - lathe.count('plate'))
  const steelNeed = Math.max(0, gearNeed + pinNeed - furnace.steel - press.count('steel') - lathe.count('steel'))
  const ingotNeed = Math.max(0, plateNeed + shutterNeed - furnace.output - press.count('ingot'))
  if (lathe.count('blank') > 0 && gearShort > 0) begin(id => lathe.start(id === 'gear' ? 'gear' : 'pin'), 'gear')
  else if (pinNeed > 0 && lathe.count('steel') > 0) begin(id => lathe.start(id === 'pin' ? 'pin' : 'gear'), 'pin')
  else if (shutterShort > 0 && lathe.count('plate') > 0) begin(id => lathe.start(id === 'cut' ? 'cut' : 'gear'), 'cut')
  if (shutterShort > 0 && press.count('cut') > 0) begin(id => press.start(id === 'shutter' ? 'shutter' : 'plate'), 'shutter')
  else if (gearNeed > 0 && press.count('steel') > 0) begin(id => press.start(id === 'blank' ? 'blank' : 'plate'), 'blank')
  else if (plateNeed + shutterNeed > press.count('plate') && press.count('ingot') > 0 && press.count('plate') < 2) begin(id => press.start(id === 'plate' ? 'plate' : 'blank'), 'plate')
  if (hingeNeed > 0 && bench.count('plate') > 0 && bench.count('pin') > 0) begin(id => bench.start(id === 'hinge' ? 'hinge' : 'pack'), 'hinge')
  if (kit.lines.every(line => bench.count(line.item) >= line.qty)) begin(id => bench.start(id === 'pack' ? 'pack' : 'hinge'), 'pack')
  if (steelNeed > 0 && furnace.coal >= 1) smelt('alloy')
  else if (ingotNeed > 0) smelt('smelt')
  const { miner, hauler } = carts()
  const needCoal = steelNeed > 0 && furnace.coal < 1 && furnace.steel < 1
  const needOre = ingotNeed > 0 || steelNeed > 0
  if (needCoal) feed(miner, 'coal')
  else if (needOre) feed(miner, 'ore')
  if (!hauler || hauler.busy) return
  if (hauler.cargo > 0) {
    try { unload(hauler) } catch { /* raw cargo can wait */ }
    return
  }
  if (bench.count(kit.id) > 0) {
    carry(hauler, kit.id, bench, depot, 1)
    return
  }
  if (want('gear') > bench.count('gear') && lathe.count('gear') > 0) {
    carry(hauler, 'gear', lathe, bench, Math.min(lathe.count('gear'), want('gear') - bench.count('gear')))
    return
  }
  if (want('shutter') > bench.count('shutter') && press.count('shutter') > 0) {
    carry(hauler, 'shutter', press, bench, Math.min(press.count('shutter'), want('shutter') - bench.count('shutter')))
    return
  }
  if (hingeNeed > bench.count('pin') && lathe.count('pin') > 0) {
    carry(hauler, 'pin', lathe, bench, Math.min(lathe.count('pin'), hingeNeed - bench.count('pin'), 3 - bench.count('pin')))
    return
  }
  if (shutterShort > 0 && lathe.count('cut') > 0 && press.count('cut') < 1) {
    carry(hauler, 'cut', lathe, press, 1)
    return
  }
  if (shutterShort > lathe.count('plate') + lathe.count('cut') + press.count('cut') && lathe.count('plate') < 2 && press.count('cut') < 1) {
    const queued = lathe.count('plate') + lathe.count('cut') + press.count('cut')
    const keep = hingeNeed > 0 && bench.count('pin') > 0 ? 1 : 0
    if (press.count('plate') > 0) {
      carry(hauler, 'plate', press, lathe, Math.min(press.count('plate'), shutterShort - queued, 2 - lathe.count('plate')))
      return
    }
    if (bench.count('plate') > keep) {
      carry(hauler, 'plate', bench, lathe, Math.min(bench.count('plate') - keep, shutterShort - queued, 2 - lathe.count('plate')))
      return
    }
  }
  if (hingeNeed > bench.count('plate') && press.count('plate') > 0) {
    carry(hauler, 'plate', press, bench, Math.min(press.count('plate'), hingeNeed - bench.count('plate'), 3 - bench.count('plate')))
    return
  }
  if (gearShort > 0 && press.count('blank') > 0 && lathe.count('blank') < 1) {
    carry(hauler, 'blank', press, lathe, 1)
    return
  }
  if (furnace.steel > 0 && gearNeed > 0 && press.count('steel') < 1) {
    carry(hauler, 'steel', furnace, press, Math.min(furnace.steel, gearNeed, hauler.capacity, 3 - press.count('steel')))
    return
  }
  if (furnace.steel > 0 && pinNeed > lathe.count('steel') + lathe.count('pin')) {
    carry(hauler, 'steel', furnace, lathe, Math.min(furnace.steel, pinNeed - lathe.count('steel') - lathe.count('pin'), hauler.capacity, 3 - lathe.count('steel')))
    return
  }
  const plateGaps = plateNeed + shutterNeed
  if (furnace.output > 0 && plateGaps > press.count('ingot')) {
    carry(hauler, 'ingot', furnace, press, Math.min(furnace.output, plateGaps - press.count('ingot'), hauler.capacity, 3 - press.count('ingot')))
    return
  }
  if (steelNeed > 0 || ingotNeed > 0) feed(hauler, 'ore')
}

export function workKits() {
  if (orders()[0]?.item !== 'winch') return
  rememberVein()
  kits()
}
