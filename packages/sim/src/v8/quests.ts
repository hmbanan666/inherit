import type { Site, World } from './core/world'

export interface QuestTest {
  id: string
  text: string
  pass(world: World): boolean
}

export interface QuestDef {
  id: string
  from: string
  who: 'bram' | 'odile' | 'elsie' | 'tomas' | 'pell' | 'wen'
  role: string
  building: 'forge' | 'bridge' | 'bakery' | 'mill' | 'riverside' | 'lamp-street'
  title: string
  goal: string
  why: string
  /** One line in the villager's voice. It is not a hint and not a solution. */
  quote: string
  change: string
  item: 'ingot' | 'steel'
  qty: number
  pay: number
  xp: number
  needLevel: number
  prepare?(world: World): void
  tests: QuestTest[]
}

export interface ShopItem {
  id: string
  name: string
  price: number
  detail: string
  apply(world: World): void
}

const steps = [20, 40, 65, 90, 115, 145]
export function levelFor(xp: number) {
  return 1 + steps.filter(step => xp >= step).length
}

export function levelSpan(xp: number) {
  const level = levelFor(xp)
  const start = steps[level - 2] ?? 0
  const next = steps[level - 1]
  return { level, start, next: next ?? null }
}

const shipped = (world: World, id: string) => world.orders.find(order => order.id === id)?.shipped ?? 0

export const questList: QuestDef[] = [
  {
    id: 'bram', from: 'Bram', who: 'bram', role: 'Blacksmith', building: 'forge',
    title: 'Horseshoes for the mail horse',
    goal: 'Bring Bram 4 ingots.',
    why: 'The cart fills at the vein and stays there, so the furnace never receives ore.',
    quote: 'The mail horse throws a shoe on every hill.',
    change: 'The forge is lit. The mail horse has shoes.',
    item: 'ingot', qty: 4, pay: 80, xp: 20, needLevel: 1,
    tests: [
      { id: 'ore', text: 'Ore reaches the furnace', pass: world => world.furnace.input > 0 || world.furnace.output > 0 || world.ingotsMade > 0 || shipped(world, 'bram') > 0 },
      { id: 'ingot', text: 'The furnace makes an ingot', pass: world => world.ingotsMade > 0 || shipped(world, 'bram') > 0 },
      { id: 'done', text: 'Bram receives 4 ingots', pass: world => shipped(world, 'bram') >= 4 },
    ],
  },
  {
    id: 'odile', from: 'Mayor Odile', who: 'odile', role: 'Mayor', building: 'bridge',
    title: 'Steel for the bridge',
    goal: 'Bring Odile 4 steel.',
    why: 'Steel is ore and coal smelted together. Vein B is coal. Alloy is in the shop.',
    quote: 'Two banks, and no way across.',
    change: 'The bridge stands. Kettlewick can cross the river again.',
    item: 'steel', qty: 4, pay: 100, xp: 20, needLevel: 2,
    tests: [
      { id: 'coal', text: 'Coal reaches the furnace', pass: world => world.furnace.coal > 0 || world.steelMade > 0 || shipped(world, 'odile') > 0 },
      { id: 'steel', text: 'The furnace makes steel', pass: world => world.steelMade > 0 || shipped(world, 'odile') > 0 },
      { id: 'done', text: 'Odile receives 4 steel', pass: world => shipped(world, 'odile') >= 4 },
    ],
  },
  {
    id: 'elsie', from: 'Elsie', who: 'elsie', role: 'Baker', building: 'bakery',
    title: 'A grate for the oven',
    goal: 'Bring Elsie 6 steel before the ore cools.',
    why: 'One cart cannot fetch coal before the ore cools. A second drone is in the shop. Give each drone a job.',
    quote: 'The oven has been cold since dawn.',
    change: 'The bakery is warm again.',
    item: 'steel', qty: 6, pay: 140, xp: 25, needLevel: 3,
    prepare: world => {
      // Ore lasts 20 ticks, long enough for a drone that only hauls ore.
      // Coal lasts 8, shorter than a trip to the ore vein, so one drone cannot keep both.
      world.holdTicks = 20
      world.steelMark = world.steelMade
    },
    tests: [
      { id: 'drone', text: 'drone-2 leaves the depot', pass: world => {
        const drone = world.drones.find(item => item.name === 'drone-2')
        return !!drone && (drone.pos.x !== world.depot.pos.x || drone.pos.y !== world.depot.pos.y)
      } },
      { id: 'both', text: 'Ore and coal are in the furnace together', pass: world => world.steelMade > world.steelMark || (world.furnace.input >= 2 && world.furnace.coal >= 1) },
      { id: 'done', text: 'Elsie receives 6 steel', pass: world => shipped(world, 'elsie') >= 6 },
    ],
  },
  {
    id: 'tomas', from: 'Tomas', who: 'tomas', role: 'Miller', building: 'mill',
    title: 'Iron for the mill wheel',
    goal: 'Bring Tomas 4 ingots after vein A runs out.',
    why: 'Vein A is nearly spent. Mining an empty vein stops the tick. Prospect, in the shop, opens another ore vein.',
    quote: 'The wheel sits in the race and will not turn.',
    change: 'The mill wheel turns.',
    item: 'ingot', qty: 4, pay: 100, xp: 25, needLevel: 4,
    prepare: world => {
      const vein = world.veins.find(item => item.name === 'A')
      if (vein) vein.left = 2
      world.oreAfterDry = 0
    },
    tests: [
      { id: 'dry', text: 'Vein A is empty', pass: world => world.veins.find(item => item.name === 'A')?.left === 0 },
      { id: 'other', text: 'Ore arrives from another vein', pass: world => world.oreAfterDry > 0 },
      { id: 'done', text: 'Tomas receives 4 ingots', pass: world => shipped(world, 'tomas') >= 4 },
    ],
  },
  {
    id: 'pell', from: 'Pell', who: 'pell', role: 'Cooper', building: 'riverside',
    title: 'Hinges for the barrels',
    goal: 'Bring Pell 4 ingots.',
    why: 'Pell wants plain ingots. Steel will not do. Smelt ore on its own when the order asks for ingots.',
    quote: 'Rope will not hold a barrel of ale.',
    change: 'The barrels have hinges.',
    item: 'ingot', qty: 4, pay: 80, xp: 25, needLevel: 5,
    prepare: world => { world.ingotsMade = 0 },
    tests: [
      { id: 'smelt', text: 'An ingot is smelted this quest', pass: world => world.ingotsMade > 0 },
      { id: 'done', text: 'Pell receives 4 ingots', pass: world => shipped(world, 'pell') >= 4 && world.ingotsMade >= 4 },
    ],
  },
  {
    id: 'wen', from: 'Wen', who: 'wen', role: 'Lamplighter', building: 'lamp-street',
    title: 'Steel for the lamps',
    goal: 'Bring Wen 4 steel without spending the CPU on a fresh path every tick.',
    why: 'Calling findPath for every drone on every tick spends the CPU. Remember a route and reuse it.',
    quote: 'The street lamps have been dark a week.',
    change: 'The lamps are lit.',
    item: 'steel', qty: 4, pay: 120, xp: 30, needLevel: 6,
    prepare: world => {
      world.cpu.limit = world.bought.includes('cpu') ? 18 : 8
      world.pathWindow = []
    },
    tests: [
      { id: 'memory', text: 'The route is remembered', pass: world => world.pathWindow.length >= 8 && world.pathWindow.reduce((sum, calls) => sum + calls, 0) <= 4 },
      { id: 'done', text: 'Wen receives 4 steel', pass: world => shipped(world, 'wen') >= 4 },
    ],
  },
]

export const shop: ShopItem[] = [
  { id: 'alloy', name: 'Alloy', price: 50, detail: 'furnace.alloy() makes one steel from 2 ore and 1 coal.', apply: () => {} },
  { id: 'furnace', name: 'Hotter furnace', price: 60, detail: 'A batch finishes in 2 ticks instead of 4.', apply: world => { world.batchTicks = 2 } },
  { id: 'cart', name: 'Bigger cart', price: 40, detail: 'Every drone carries 2 more.', apply: world => { for (const drone of world.drones) drone.capacity += 2 } },
  {
    id: 'drone', name: 'Second drone', price: 120, detail: 'drone-2 waits at the depot.',
    apply: world => {
      if (world.drones.some(drone => drone.name === 'drone-2')) return
      world.drones.push({ name: 'drone-2', pos: { ...world.depot.pos }, cargo: 0, capacity: world.drones[0]?.capacity ?? 3, carrying: null, source: '' })
    },
  },
  { id: 'prospect', name: 'Prospect', price: 40, detail: 'prospect() reveals the next hidden vein.', apply: () => {} },
  { id: 'cpu', name: 'CPU +10', price: 80, detail: 'Raises the CPU limit by 10.', apply: world => { world.cpu.limit += 10 } },
]

/** Shop tiers open with the villager who needs them. The names are the shelf labels. */
export const shopTiers: { level: number; items: string[] }[] = [
  { level: 1, items: ['Bigger cart', 'Hotter furnace'] },
  { level: 2, items: ['Alloy'] },
  { level: 3, items: ['Second drone'] },
  { level: 4, items: ['Prospect'] },
  { level: 6, items: ['CPU +10'] },
]

export function nextUnlock(level: number) {
  return shopTiers.find(tier => tier.level > level)
}

export function upcomingQuests(id: string, count = 3) {
  const index = questList.findIndex(quest => quest.id === id)
  if (index < 0) return []
  return questList.slice(index + 1, index + 1 + count).map(quest => quest.title)
}

export function nextQuest(world: World, site: Site) {
  const quest = site.questList?.find(item => !world.cleared.includes(item.id))
  if (!quest || world.level < quest.needLevel) return undefined
  return quest
}

export function syncQuest(world: World, site: Site) {
  const quest = site.questList?.find(item => item.id === world.questId)
  if (!quest) {
    world.checks = []
    const offer = nextQuest(world, site)
    return offer ? offer.why : 'More is coming.'
  }
  world.checks = quest.tests.map(test => ({ id: test.id, text: test.text, status: test.pass(world) ? 'green' as const : 'open' as const }))
  return world.checks.find(check => check.status !== 'green')?.text ?? 'Every test passes. Complete the quest.'
}

export function acceptQuest(world: World, site: Site) {
  if (world.questId) return false
  const quest = nextQuest(world, site)
  if (!quest) return false
  world.questId = quest.id
  quest.prepare?.(world)
  world.orders.push({
    id: quest.id, at: world.tick, item: quest.item, qty: quest.qty, due: world.tick + 100000, pay: quest.pay,
    from: quest.from, who: quest.who, role: quest.role, title: quest.title, text: quest.goal,
    building: quest.building, change: quest.change, shipped: 0, status: 'open',
  })
  world.status = syncQuest(world, site)
  return true
}

export function completeQuest(world: World, site: Site) {
  const quest = site.questList?.find(item => item.id === world.questId)
  if (!quest || quest.tests.some(test => !test.pass(world))) return false
  world.credits += quest.pay
  world.ledger.income += quest.pay
  world.xp += quest.xp
  world.level = levelFor(world.xp)
  if (!world.cleared.includes(quest.id)) world.cleared.push(quest.id)
  if (!world.growth.includes(quest.change)) world.growth.push(quest.change)
  const order = world.orders.find(item => item.id === quest.id)
  if (order) order.status = 'on time'
  world.questId = undefined
  world.status = syncQuest(world, site)
  return true
}

export function buyUpgrade(world: World, id: string) {
  const item = shop.find(entry => entry.id === id)
  if (!item || world.bought.includes(id) || world.credits < item.price) return false
  world.credits -= item.price
  world.bought.push(id)
  item.apply(world)
  return true
}
