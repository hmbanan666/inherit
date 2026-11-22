import type { Guest, PlayerAPI } from './player'

export type Scene = 'village' | 'garden' | 'pier' | 'platform' | 'scoreboard' | 'scale'
  | 'orchard' | 'path' | 'pond' | 'track' | 'parade' | 'fair' | 'picnic'

export interface Readings {
  lane: number
  capacity: number
  position: number
  hooks: number
  distance: number
  leftReady: boolean
  rightReady: boolean
  nearOpen: boolean
  farOpen: boolean
  ringing: boolean
  queue: string[]
  waiting: string[]
  visitors: string[]
  weights: number[]
  booking: Guest
}

export interface Fixture {
  readings?: Partial<Readings>
  basket?: number
  raining?: boolean
  canopy?: boolean
  ledger?: Guest[]
  flag?: string
}

export function initialWorld() {
  return {
    lessonId: '',
    scene: 'village' as Scene,
    prop: 'speech' as Prop,
    cue: '',
    reason: '',
    readings: {} as Partial<Readings>,
    ledger: [] as Guest[],
    // Keep the player's results when the next activity sets up its own props.
    album: {} as Record<string, string>,
    bubble: '',
    announcements: [] as string[],
    sign: '',
    signs: [] as string[],
    flag: '',
    flags: [] as string[],
    beds: [] as number[],
    gateFlowers: 0,
    houseFlowers: 0,
    basket: 0,
    bell: 0,
    shutters: false,
    raining: false,
    canopy: false,
    picnic: false,
    ribbons: 0,
    rails: [] as number[],
    lamps: [] as number[],
    neighbours: [] as string[],
    stalls: [] as string[],
    banner: false,
    score: null as number | null,
    signal: null as boolean | null,
    tray: [] as number[],
    steps: 0,
    cards: [] as Guest[],
    slip: '',
  }
}

export type Village = ReturnType<typeof initialWorld>

export function decodeWorld(value: unknown): Village {
  if (!value || typeof value !== 'object') throw new Error('The village save is incomplete.')
  const world = value as Village
  for (const [key, initial] of Object.entries(initialWorld())) {
    const field = world[key as keyof Village]
    if (initial === null ? field !== null && typeof field !== (key === 'score' ? 'number' : 'boolean')
      : typeof initial !== typeof field || Array.isArray(initial) !== Array.isArray(field) || field === null) {
      throw new Error('Could not read the saved village.')
    }
  }
  return structuredClone(world)
}

function count(value: number, max = 32) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new Error('Use a whole number from 0 to ' + max + '.')
  }
  return value
}

function words(value: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) {
    throw new Error('Use a short, nonblank string.')
  }
  return value
}

function colour(value: string) {
  if (value !== 'gold' && value !== 'blue') throw new Error('Choose blue or gold.')
  return value
}

export function villageAPI(world: Village): PlayerAPI {
  return {
    say(text) {
      world.bubble = words(text)
      world.announcements.push(text)
    },
    plant(amount) {
      world.beds.push(count(amount))
      if (world.lessonId === 'flower-row') world.houseFlowers = amount
      else world.gateFlowers += amount
    },
    paintSign(text) {
      world.sign = words(text)
      world.signs.push(text)
    },
    hangFlag(value) {
      world.flag = colour(value)
    },
    fillBasket(amount) {
      world.basket = count(amount)
    },
    ringBell() {
      world.bell++
    },
    openShutters() {
      world.shutters = true
    },
    hangRibbons(amount) {
      world.ribbons = count(amount)
      world.rails.push(amount)
    },
    isRaining() {
      return world.raining
    },
    openCanopy() {
      world.canopy = true
    },
    foldCanopy() {
      world.canopy = false
    },
    basketCount() {
      return world.basket
    },
    lightLamp(number) {
      if (count(number, 5) === 0) throw new Error('The first lamp is number one.')
      if (!world.lamps.includes(number)) world.lamps.push(number)
    },
    greet(name) {
      world.neighbours.push(words(name))
    },
    openStall(name) {
      world.stalls.push(words(name))
    },
    hangBanner() {
      world.banner = true
    },
    showScore(points) {
      if (!Number.isFinite(points)) throw new Error('Give the board a finite number.')
      world.score = points
    },
    setSignal(on) {
      if (typeof on !== 'boolean') throw new Error('Give the signal a boolean.')
      world.signal = on
    },
    rackFlags(colours) {
      world.flags = colours.map(colour)
    },
    loadWeights(weights) {
      world.tray = weights.map(weight => count(weight))
    },
    step() {
      world.steps++
    },
    postCard(card) {
      world.cards.push({ name: words(card.name), seats: count(card.seats) })
    },
    guests() {
      return structuredClone(world.ledger)
    },
  }
}

export type Prop = 'speech' | 'signs' | 'bell' | 'beds' | 'basket' | 'score' | 'slip'
  | 'flag' | 'shutters' | 'signal' | 'canopy' | 'flags' | 'tray' | 'neighbours'
  | 'lamps' | 'robot' | 'rails' | 'cards' | 'banner'

export function propText(world: Village, prop: Prop): string {
  switch (prop) {
    case 'speech': return world.announcements.join(' · ')
    case 'signs': return world.signs.join(' · ')
    case 'bell': return world.bell + (world.bell === 1 ? ' ring' : ' rings')
    case 'beds': return world.beds.map(count => count + ' blooms').join(' · ')
    case 'basket': return world.basket + ' apples'
    case 'score': return world.score?.toString() ?? ''
    case 'slip': return world.slip
    case 'flag': return world.flag
    case 'shutters': return world.shutters ? 'Open' : 'Closed'
    case 'signal': return world.signal === null ? '' : world.signal ? 'Green' : 'Off'
    case 'canopy': return world.canopy ? 'Open' : 'Folded'
    case 'flags': return world.flags.join(' · ')
    case 'tray': return world.tray.join(' · ')
    case 'neighbours': return world.neighbours.join(' · ')
    case 'lamps': return world.lamps.join(' · ')
    case 'robot': return world.steps + ' steps'
    case 'rails': return world.rails.join(' · ')
    case 'cards': return world.cards.map(card => card.name + ' · ' + card.seats + ' seats').join(' / ')
    case 'banner': return world.banner ? 'Fair open' : 'Preparing the fair'
  }
}
