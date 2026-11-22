import type { PlayerAPI } from './player'
export interface Village {
  bubble: string
  bed: 'gate' | 'house'
  gateFlowers: number
  houseFlowers: number
  sign: string
  flag: string
  basket: number
  bell: number
  shutters: boolean
  ribbons: number
  raining: boolean
  canopy: boolean
  picnic: boolean
  lamps: number[]
  neighbours: string[]
  stalls: string[]
  banner: boolean
}
export function initialWorld(): Village {
  return { bubble:'', bed:'gate', gateFlowers:0, houseFlowers:0, sign:'', flag:'', basket:0, bell:0,
    shutters:false, ribbons:0, raining:false, canopy:false, picnic:false, lamps:[], neighbours:[], stalls:[], banner:false }
}
export function decodeWorld(value: unknown): Village {
  if (!value || typeof value !== 'object') throw new Error('The village save is incomplete.')
  const w = value as Village
  const defaults = initialWorld()
  for (const key of Object.keys(defaults) as (keyof Village)[]) {
    if (typeof w[key] !== typeof defaults[key] || Array.isArray(w[key]) !== Array.isArray(defaults[key]))
      throw new Error('Could not read the saved village.')
  }
  if (!['gate','house'].includes(w.bed) || ![w.gateFlowers,w.houseFlowers,w.basket,w.bell,w.ribbons].every(n=>Number.isSafeInteger(n)&&n>=0) ||
    !w.lamps.every(n=>Number.isInteger(n)&&n>=1&&n<=5) || ![...w.neighbours,...w.stalls].every(n=>typeof n==='string'))
    throw new Error('Could not read the decorations.')
  return structuredClone(w)
}
function count(value: number, max: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error('Use a whole number from 0 to ' + max + '.')
  return value
}
function words(value: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) throw new Error('Use a short word or greeting in quotes.')
  return value.trim()
}
function include<T>(list: T[], item: T) { if (!list.includes(item)) list.push(item) }
export function villageAPI(world: Village): PlayerAPI {
  return {
    say(text) { world.bubble = words(text) },
    plant(n) { const key = world.bed === 'gate' ? 'gateFlowers' : 'houseFlowers'; world[key] = Math.min(24,world[key]+count(n,24)) },
    paintSign(name) { world.sign = words(name) },
    hangFlag(colour) {
      if (!['blue','gold'].includes(colour)) throw new Error('Choose "blue" or "gold" for the flag.')
      world.flag = colour
    },
    fillBasket(n) { world.basket = count(n,5) },
    ringBell() { world.bell++ },
    openShutters() { world.shutters = true },
    hangRibbons(n) { world.ribbons = count(n,12) },
    isRaining() { return world.raining },
    openCanopy() { world.canopy = true },
    foldCanopy() { world.canopy = false },
    basketCount() { return world.basket },
    setPicnic() { world.picnic = true },
    lightLamp(n) {
      if (count(n,5)<1) throw new Error('The first lamp is number 1.')
      include(world.lamps,n)
    },
    greet(name) { include(world.neighbours,words(name)) },
    openStall(name) {
      if (!world.neighbours.includes(name)) throw new Error('Choose someone you greeted on the path.')
      include(world.stalls,name)
    },
    hangBanner() { world.banner = true },
  }
}
