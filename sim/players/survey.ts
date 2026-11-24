import { depot, drones, veins } from 'inherit'

export function mineVein() {
  const cart = drones()[0]
  if (!cart || cart.busy || cart.cargo) return
  const vein = veins().find(item => item.name === 'D')
  if (vein) cart.mine(vein)
}

export function bringHome() {
  const cart = drones()[0]
  if (!cart || cart.busy || !cart.cargo) return
  cart.unload(depot)
}

export function onTick() {}
