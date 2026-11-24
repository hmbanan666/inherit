import { bench, depot, drones, furnace, lathe, manifest, memory, orders, press, prospect, type Drone, type Target } from 'inherit'
import { mine, unload } from './haul'

type Good = 'ingot' | 'steel' | 'plate' | 'blank' | 'gear' | 'pin' | 'cut' | 'shutter' | 'hinge' | 'winch' | 'lamp'
type Job = 'dies' | 'gears' | 'hinges' | 'shutters' | 'kits'

export function tick(job: Job) {
  if (job === 'dies' && !wantsDies()) return
  if (job === 'gears' && orders()[0]?.item !== 'gear') return
  if (job === 'hinges' && orders()[0]?.item !== 'hinge') return
  if (job === 'shutters' && orders()[0]?.item !== 'shutter') return
  if (job === 'kits' && orders()[0]?.item !== 'winch') return
  if (!memory.opened) {
    prospect()
    memory.opened = true
  }
  if (job === 'dies') dies()
  else if (job === 'gears') gears()
  else if (job === 'hinges') hinges()
  else if (job === 'shutters') shutters()
  else kits()
}

function wantsDies() {
  const lines = orders()[0]?.lines
  return !!lines?.some(line => line.item === 'plate') && !!lines?.some(line => line.item === 'blank')
}

function carts() {
  const list = drones()
  return { miner: list[0], hauler: list[1] }
}

function feed(cart: Drone | undefined, rock: 'ore' | 'coal') {
  if (!cart || cart.busy) return
  if (cart.cargo > 0) {
    try { unload(cart) } catch { /* the hopper can wait */ }
    return
  }
  const room = rock === 'coal' ? furnace.coalMax - furnace.coal : furnace.inputMax - furnace.input
  if (room < Math.min(3, cart.capacity)) return
  if (rock === 'ore') {
    let reserved = 0
    for (const other of drones()) {
      if (other.name === cart.name) continue
      if (memory[other.name] === 'ore' && (other.busy || other.cargo > 0)) reserved += other.capacity
    }
    if (room - reserved < Math.min(3, cart.capacity)) return
  }
  memory[cart.name] = rock
  try { mine(cart, rock) } catch { /* no open vein this tick */ }
}

function carry(cart: Drone | undefined, item: Good, from: Target, to: Target, qty: number) {
  if (!cart || cart.busy || cart.cargo > 0 || qty < 1) return false
  try {
    cart.transfer(item, from, to, qty)
    return true
  } catch {
    return false
  }
}

function begin(start: (recipe: string) => void, recipe: string) {
  try { start(recipe) } catch { /* busy, full, or the die is shut */ }
}

function smelt(kind: 'smelt' | 'alloy') {
  if (kind === 'alloy') {
    if (furnace.input < 2 || furnace.coal < 1 || furnace.steel >= 5) return
  } else if (furnace.input < 2 || furnace.output >= 5) return
  begin(id => furnace.start(id === 'alloy' ? 'alloy' : 'smelt'), kind)
}

function held(item: Good) {
  return depot.count(item) + press.count(item) + lathe.count(item) + bench.count(item)
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
