import type { Site, World } from './core/world'
import { noteCheckReset, readChecks } from './checkFacts'

export interface QuestTest {
  id: string
  text: string
  pass(world: World): boolean
}

export interface QuestDef {
  id: string
  from: string
  who: 'bram' | 'ines' | 'odile' | 'elsie' | 'tomas' | 'pell' | 'wen' | 'harrow'
  role: string
  building: 'forge' | 'bridge' | 'bakery' | 'mill' | 'riverside' | 'lamp-street' | 'town-hall'
  title: string
  goal: string
  why: string
  /** One line in the villager's voice. It is not a hint and not a solution. */
  quote: string
  /** One line under the name. The quote and the need, and nothing else. */
  ask: string
  /** Inserted once at the top of the open file. A nudge, never a solution or a shop. */
  nudge: string
  change: string
  item: 'ingot' | 'steel'
  qty: number
  pay: number
  xp: number
  needLevel: number
  /** A function this quest grants on Take. The signature is a recipe, not a solution. */
  unlock?: { brick: string; signature: string; legacy?: string }
  /** Run, on(), or onTick. Granted on Take, by the same rule as unlock. */
  trigger?: 'run' | 'events' | 'tick'
  /** Named on the reward tiles. Granted on Hand over, not sold. */
  gift?: string
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
    why: 'The cart fills at the vein and stays there, so the furnace never receives ore. The furnace and the drone have buttons. Bram takes ingots from the depot.',
    quote: 'The mail horse throws a shoe on every hill.',
    ask: 'The mail horse throws a shoe on every hill. I need four ingots.',
    nudge: 'the cart sits full at the vein, and the furnace is still cold.',
    change: 'The forge is lit. The mail horse has shoes.',
    item: 'ingot', qty: 4, pay: 80, xp: 20, needLevel: 1,
    tests: [
      { id: 'ore', text: 'Ore reaches the furnace', pass: world => world.furnace.input > 0 || world.furnace.output > 0 || world.ingotsMade > 0 || shipped(world, 'bram') > 0 },
      { id: 'ingot', text: 'The furnace makes an ingot', pass: world => world.ingotsMade > 0 || shipped(world, 'bram') > 0 },
      { id: 'done', text: 'Bram receives 4 ingots', pass: world => shipped(world, 'bram') >= 4 },
    ],
  },
  {
    id: 'ines', from: 'Ines', who: 'ines', role: 'Warden', building: 'town-hall',
    title: 'Ingots for the storehouse',
    goal: 'Bring Ines 16 ingots.',
    why: 'Sixteen ingots is a long time on the Smelt button. A function can call furnace.smelt. Run, beside the function, plays it once.',
    quote: 'The storehouse shelves have been bare all winter.',
    ask: 'The storehouse shelves have been bare all winter. I need sixteen ingots.',
    nudge: 'a function can call furnace.smelt. Run, beside it, plays that function once.',
    change: 'The storehouse has iron again.',
    item: 'ingot', qty: 16, pay: 90, xp: 20, needLevel: 2,
    trigger: 'run',
    tests: [
      { id: 'ore', text: 'Ore reaches the furnace', pass: world => world.furnace.input > 0 || world.furnace.output > 0 || world.ingotsMade > 0 || shipped(world, 'ines') > 0 },
      { id: 'ingot', text: 'The furnace makes an ingot', pass: world => world.ingotsMade > 0 || shipped(world, 'ines') > 0 },
      { id: 'done', text: 'Ines receives 16 ingots', pass: world => shipped(world, 'ines') >= 16 },
    ],
  },
  {
    id: 'odile', from: 'Mayor Odile', who: 'odile', role: 'Mayor', building: 'bridge',
    title: 'Steel for the bridge',
    goal: 'Bring Odile 4 steel.',
    why: 'Steel is 2 ore and 1 coal alloyed together. Vein B is coal. furnace.alloy() makes steel.',
    unlock: { brick: 'furnace.alloy', signature: 'furnace.alloy(): 2 ore + 1 coal -> 1 steel', legacy: 'alloy' },
    trigger: 'events',
    quote: 'Two banks, and no way across.',
    ask: 'Two banks, and no way across. I need steel for the bridge.',
    nudge: 'steel is ore and coal together. Where would they meet?',
    change: 'The bridge stands. Kettlewick can cross the river again.',
    gift: 'drone-2',
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
    goal: 'Bring Elsie 6 steel.',
    why: 'One cart cannot be in two places.',
    quote: 'The oven has been cold since dawn.',
    ask: 'The oven has been cold since dawn. I need a grate.',
    nudge: 'one cart cannot be in two places.',
    change: 'The bakery is warm again.',
    item: 'steel', qty: 6, pay: 140, xp: 25, needLevel: 3,
    trigger: 'tick',
    prepare: world => { world.steelMark = world.steelMade },
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
    id: 'harrow', from: 'Harrow', who: 'harrow', role: 'Surveyor', building: 'town-hall',
    title: 'Iron from the hill',
    goal: 'Bring Harrow 60 ingots.',
    why: 'Vein A is poor: 5 ticks for 1 ore. A richer vein is hidden. prospect() reveals it.',
    quote: 'The stores want iron, and the old cut is a slow teacher.',
    ask: 'The stores want iron, and the old cut is a slow teacher. I need sixty ingots.',
    nudge: 'the old cut is slow. A richer vein is still hidden.',
    change: 'The hill is open.',
    item: 'ingot', qty: 60, pay: 80, xp: 0, needLevel: 4,
    unlock: { brick: 'prospect', signature: 'prospect(): reveals the next hidden vein', legacy: 'prospect' },
    tests: [
      { id: 'hands', text: 'Done with no manual runs', pass: world => world.manualRuns === 0 && shipped(world, 'harrow') >= 60 },
      { id: 'done', text: 'Harrow receives 60 ingots', pass: world => shipped(world, 'harrow') >= 60 },
    ],
  },
  {
    id: 'tomas', from: 'Tomas', who: 'tomas', role: 'Miller', building: 'mill',
    title: 'Iron for the mill wheel',
    goal: 'Bring Tomas 8 ingots.',
    why: 'The mill wheel needs iron. Smelt ore into ingots.',
    quote: 'The wheel sits in the race and will not turn.',
    ask: 'The wheel sits in the race and will not turn. I need iron for it.',
    nudge: 'the wheel needs iron. Ore will not turn it.',
    change: 'The mill wheel turns.',
    item: 'ingot', qty: 8, pay: 100, xp: 25, needLevel: 4,
    prepare: world => { world.ingotsMade = 0 },
    tests: [
      { id: 'smelt', text: 'An ingot is smelted this quest', pass: world => world.ingotsMade > 0 },
      { id: 'done', text: 'Tomas receives 8 ingots', pass: world => shipped(world, 'tomas') >= 8 },
    ],
  },
  {
    id: 'pell', from: 'Pell', who: 'pell', role: 'Cooper', building: 'riverside',
    title: 'Hinges for the barrels',
    goal: 'Bring Pell 4 ingots.',
    why: 'Pell wants plain ingots. Steel will not do. Smelt ore on its own when the order asks for ingots.',
    quote: 'Rope will not hold a barrel of ale.',
    ask: 'Rope will not hold a barrel of ale. I need plain ingots.',
    nudge: 'the barrels want plain ingots. Steel will not do.',
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
    ask: 'The street lamps have been dark a week. I need steel, and a path worth keeping.',
    nudge: 'a fresh path every tick spends the oil. A road can be remembered.',
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
  { id: 'furnace', name: 'Hotter furnace', price: 60, detail: 'A batch finishes in 2 ticks instead of 4.', apply: world => { world.batchTicks = 2 } },
  { id: 'cart', name: 'Bigger cart', price: 40, detail: 'Every drone carries 2 more.', apply: world => { for (const drone of world.drones) drone.capacity += 2 } },
  { id: 'hopper', name: 'Bigger hopper', price: 50, detail: 'The furnace holds 12 ore and 6 coal.', apply: world => { world.furnace.oreMax = 12; world.furnace.coalMax = 6 } },
  { id: 'cpu', name: 'CPU +10', price: 80, detail: 'Raises the CPU limit by 10.', apply: world => { world.cpu.limit += 10 } },
]

/** Odile's reward. A save that already bought drone-2, or has passed Odile, keeps a single drone-2. */
export function grantSecondDrone(world: World) {
  if (world.drones.some(drone => drone.name === 'drone-2')) return
  const home = world.depot.pos
  const capacity = world.drones[0]?.capacity ?? 3
  world.drones.push({
    name: 'drone-2', pos: { x: home.x, y: home.y }, cargo: 0,
    capacity, carrying: null, source: '', dig: null,
  })
  if (world.signals?.drones) world.signals.drones['drone-2'] = { cargo: 0, capacity, idle: true }
}

export function nextQuest(world: World, site: Site) {
  const quest = site.questList?.find(item => !world.cleared.includes(item.id) && world.level >= item.needLevel)
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
  readChecks(world, quest)
  return world.checks.find(check => check.status !== 'green')?.text ?? 'Every test passes. Complete the quest.'
}

export function acceptQuest(world: World, site: Site, id?: string) {
  if (world.questId) return false
  const quest = id
    ? site.questList?.find(item => item.id === id && !world.cleared.includes(item.id) && world.level >= item.needLevel)
    : nextQuest(world, site)
  if (!quest) return false
  world.questId = quest.id
  world.manualRuns = 0
  quest.prepare?.(world)
  noteCheckReset(world)
  world.orders.push({
    id: quest.id, at: world.tick, item: quest.item, qty: quest.qty, pay: quest.pay,
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
  if (quest.gift === 'drone-2') grantSecondDrone(world)
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

/** True when no quest owns the brick, the player already bought it, or they have reached the quest that grants it. */
export function functionUnlocked(world: Pick<World, 'questId' | 'cleared' | 'bought'>, brick: string) {
  const quest = questList.find(item => item.unlock?.brick === brick)
  if (!quest?.unlock) return true
  if (quest.unlock.legacy && world.bought.includes(quest.unlock.legacy)) return true
  if (world.questId === quest.id || world.cleared.includes(quest.id)) return true
  const index = questList.findIndex(item => item.id === quest.id)
  return questList.some((item, i) => i > index && (world.questId === item.id || world.cleared.includes(item.id)))
}

/** The brick the active quest just granted. It clears when that quest is completed. */
export function freshBrick(world: Pick<World, 'questId'> | undefined, brick: string) {
  if (!world?.questId) return false
  return questList.find(item => item.id === world.questId)?.unlock?.brick === brick
}

export type WorksTrigger = 'run' | 'events' | 'tick'

/** True when a save already had the trigger, or the player has reached the quest that grants it. */
export function triggerUnlocked(world: Pick<World, 'questId' | 'cleared' | 'automation'>, name: WorksTrigger) {
  if (world.automation?.[name]) return true
  const quest = questList.find(item => item.trigger === name)
  if (!quest) return false
  if (world.questId === quest.id || world.cleared.includes(quest.id)) return true
  const index = questList.findIndex(item => item.id === quest.id)
  return questList.some((item, i) => i > index && (world.questId === item.id || world.cleared.includes(item.id)))
}

export function unlockError(brick: string) {
  const quest = questList.find(item => item.unlock?.brick === brick)
  const call = `${brick}()`
  if (!quest) return `${call} is not unlocked.`
  return `${call} unlocks with the quest ${quest.title} (level ${quest.needLevel}).`
}
