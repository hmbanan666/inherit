import { drones, furnace, memory, prospect, type Drone, type Target } from 'inherit'
import { mine, unload } from './haul'

export type Good = 'ingot' | 'steel' | 'plate' | 'blank' | 'gear' | 'pin' | 'cut' | 'shutter' | 'hinge' | 'winch' | 'lamp'

export function rememberVein() {
  if (!memory.opened) {
    prospect()
    memory.opened = true
  }
}

export function carts() {
  const list = drones()
  return { miner: list[0], hauler: list[1] }
}

export function feed(cart: Drone | undefined, rock: 'ore' | 'coal') {
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

export function carry(cart: Drone | undefined, item: Good, from: Target, to: Target, qty: number) {
  if (!cart || cart.busy || cart.cargo > 0 || qty < 1) return false
  try {
    cart.transfer(item, from, to, qty)
    return true
  } catch {
    return false
  }
}

export function begin(start: (recipe: string) => void, recipe: string) {
  try { start(recipe) } catch { /* busy, full, or the die is shut */ }
}

export function smelt(kind: 'smelt' | 'alloy') {
  if (kind === 'alloy') {
    if (furnace.input < 2 || furnace.coal < 1 || furnace.steel >= 5) return
  } else if (furnace.input < 2 || furnace.output >= 5) return
  begin(id => furnace.start(id === 'alloy' ? 'alloy' : 'smelt'), kind)
}
