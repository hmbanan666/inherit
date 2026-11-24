import type { Site, World } from './core/world'
import { noteCheckReset, readChecks } from './checkFacts'

export interface QuestTest {
  id: string
  text: string
  /** Plain sentence for the test list in the editor. What the check is looking at. */
  explain: string
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
  /** What the works must produce, and roughly how it is made. Shown on the rail. */
  need: string
  /** Inserted once at the top of the open file. A nudge, never a solution or a shop. */
  nudge: string
  change: string
  item: 'ingot' | 'steel'
  qty: number
  pay: number
  xp: number
  needLevel: number
  /** Another quest's gift. Take stays closed until that machine is in the world. */
  needs?: string
  /** A function this quest grants on Take. The signature is a recipe, not a solution. */
  unlock?: { brick: string; signature: string; legacy?: string }
  /** Run, on(), or onTick. Granted on Hand over, with the gift. */
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
    goal: 'Bring Bram 2 ingots.',
    why: 'The drone is empty at the depot. Buttons send it to a vein. Run calls a function once, and the drone keeps the task.',
    quote: 'The mail horse throws a shoe on every hill.',
    ask: 'The mail horse throws a shoe on every hill. I need two ingots.',
    need: 'Need 2 ingots. An ingot is smelted from ore.',
    nudge: 'the drone is empty at the depot, and the furnace is cold.',
    change: 'The forge is lit. The mail horse has shoes.',
    item: 'ingot', qty: 2, pay: 80, xp: 20, needLevel: 1,
    trigger: 'run',
    tests: [
      { id: 'ore', text: 'Ore reaches the furnace', explain: 'The furnace has taken in ore, or an ingot was already made from it.', pass: world => world.furnace.input > 0 || world.furnace.output > 0 || world.ingotsMade > 0 || shipped(world, 'bram') > 0 },
      { id: 'ingot', text: 'The furnace makes an ingot', explain: 'The furnace has finished at least one ingot.', pass: world => world.ingotsMade > 0 || shipped(world, 'bram') > 0 },
      { id: 'done', text: 'Bram receives 2 ingots', explain: 'Two ingots have been handed over from the depot.', pass: world => shipped(world, 'bram') >= 2 },
    ],
  },
  {
    id: 'ines', from: 'Ines', who: 'ines', role: 'Warden', building: 'town-hall',
    title: 'Ingots for the storehouse',
    goal: 'Bring Ines 16 ingots.',
    why: 'Sixteen ingots is a long shift of buttons. Loop calls a function every tick. onTick is that loop.',
    quote: 'The storehouse shelves have been bare all winter.',
    ask: 'The storehouse shelves have been bare all winter. I need sixteen ingots.',
    need: 'Need 16 ingots. An ingot is smelted from ore.',
    nudge: 'loop calls the function every tick. onTick is that loop.',
    change: 'The storehouse has iron again.',
    item: 'ingot', qty: 16, pay: 90, xp: 20, needLevel: 2,
    trigger: 'tick',
    tests: [
      { id: 'ore', text: 'Ore reaches the furnace', explain: 'The furnace has taken in ore, or an ingot was already made from it.', pass: world => world.furnace.input > 0 || world.furnace.output > 0 || world.ingotsMade > 0 || shipped(world, 'ines') > 0 },
      { id: 'ingot', text: 'The furnace makes an ingot', explain: 'The furnace has finished at least one ingot.', pass: world => world.ingotsMade > 0 || shipped(world, 'ines') > 0 },
      { id: 'done', text: 'Ines receives 16 ingots', explain: 'Sixteen ingots have been handed over from the depot.', pass: world => shipped(world, 'ines') >= 16 },
    ],
  },
  {
    id: 'odile', from: 'Mayor Odile', who: 'odile', role: 'Mayor', building: 'bridge',
    title: 'Steel for the bridge',
    goal: 'Bring Odile 4 steel.',
    why: 'Steel is 2 ore and 1 coal alloyed together. Vein B is coal. furnace.alloy() makes steel.',
    unlock: { brick: 'furnace.alloy', signature: 'furnace.alloy(): 2 ore + 1 coal -> 1 steel', legacy: 'alloy' },
    quote: 'Two banks, and no way across.',
    ask: 'Two banks, and no way across. I need steel for the bridge.',
    need: 'Need 4 steel. Steel is smelted from ore and coal.',
    nudge: 'steel is ore and coal together. Where would they meet?',
    change: 'The bridge stands. Kettlewick can cross the river again.',
    gift: 'drone-2',
    item: 'steel', qty: 4, pay: 100, xp: 20, needLevel: 2,
    tests: [
      { id: 'coal', text: 'Coal reaches the furnace', explain: 'The furnace hopper holds coal, or steel was already made.', pass: world => world.furnace.coal > 0 || world.steelMade > 0 || shipped(world, 'odile') > 0 },
      { id: 'steel', text: 'The furnace makes steel', explain: 'The furnace has finished at least one steel.', pass: world => world.steelMade > 0 || shipped(world, 'odile') > 0 },
      { id: 'done', text: 'Odile receives 4 steel', explain: 'Four steel have been handed over from the depot.', pass: world => shipped(world, 'odile') >= 4 },
    ],
  },
  {
    id: 'elsie', from: 'Elsie', who: 'elsie', role: 'Baker', building: 'bakery',
    title: 'A grate for the oven',
    goal: 'Bring Elsie 6 steel.',
    why: 'One cart cannot be in two places. on() runs a function once when the cart is idle or the furnace is ready.',
    quote: 'The oven has been cold since dawn.',
    ask: 'The oven has been cold since dawn. I need a grate.',
    need: 'Need 6 steel. Steel is smelted from ore and coal.',
    nudge: 'one cart cannot be in two places. on() can run a function when the cart is idle.',
    change: 'The bakery is warm again.',
    item: 'steel', qty: 6, pay: 140, xp: 25, needLevel: 3,
    needs: 'drone-2',
    trigger: 'events',
    prepare: world => { world.steelMark = world.steelMade },
    tests: [
      { id: 'drone', text: 'drone-2 leaves the depot', explain: 'The second cart has moved off the depot.', pass: world => {
        const drone = world.drones.find(item => item.name === 'drone-2')
        return !!drone && (drone.pos.x !== world.depot.pos.x || drone.pos.y !== world.depot.pos.y)
      } },
      { id: 'both', text: 'Ore and coal are in the furnace together', explain: 'The hopper holds 2 ore and 1 coal at the same time, or steel was made after this quest was taken.', pass: world => world.steelMade > world.steelMark || (world.furnace.input >= 2 && world.furnace.coal >= 1) },
      { id: 'done', text: 'Elsie receives 6 steel', explain: 'Six steel have been handed over from the depot.', pass: world => shipped(world, 'elsie') >= 6 },
    ],
  },
  {
    id: 'harrow', from: 'Harrow', who: 'harrow', role: 'Surveyor', building: 'town-hall',
    title: 'Iron from the hill',
    goal: 'Bring Harrow 60 ingots.',
    why: 'Vein A is poor: 5 ticks for 1 ore. A richer vein is hidden. prospect() reveals it.',
    quote: 'The stores want iron, and the old cut is a slow teacher.',
    ask: 'The stores want iron, and the old cut is a slow teacher. I need sixty ingots.',
    need: 'Need 60 ingots. A richer vein yields ore faster.',
    nudge: 'the old cut is slow. A richer vein is still hidden.',
    change: 'The hill is open.',
    item: 'ingot', qty: 60, pay: 80, xp: 0, needLevel: 4,
    unlock: { brick: 'prospect', signature: 'prospect(): reveals the next hidden vein', legacy: 'prospect' },
    tests: [
      { id: 'done', text: 'Harrow receives 60 ingots', explain: 'Sixty ingots have been handed over from the depot.', pass: world => shipped(world, 'harrow') >= 60 },
      { id: 'hands', text: 'Hand over stays open', explain: 'Sixty ingots open Hand over. A gutter Run does not lock the quest.', pass: world => shipped(world, 'harrow') >= 60 },
    ],
  },
  {
    id: 'tomas', from: 'Tomas', who: 'tomas', role: 'Miller', building: 'mill',
    title: 'Iron for the mill wheel',
    goal: 'Bring Tomas 8 ingots.',
    why: 'The mill wheel needs iron. Smelt ore into ingots.',
    quote: 'The wheel sits in the race and will not turn.',
    ask: 'The wheel sits in the race and will not turn. I need iron for it.',
    need: 'Need 8 ingots. An ingot is smelted from ore.',
    nudge: 'the wheel needs iron. Ore will not turn it.',
    change: 'The mill wheel turns.',
    item: 'ingot', qty: 8, pay: 100, xp: 25, needLevel: 4,
    prepare: world => { world.ingotsMade = 0 },
    tests: [
      { id: 'smelt', text: 'An ingot is smelted this quest', explain: 'An ingot was smelted after this quest was taken.', pass: world => world.ingotsMade > 0 },
      { id: 'done', text: 'Tomas receives 8 ingots', explain: 'Eight ingots have been handed over from the depot.', pass: world => shipped(world, 'tomas') >= 8 },
    ],
  },
  {
    id: 'pell', from: 'Pell', who: 'pell', role: 'Cooper', building: 'riverside',
    title: 'Hinges for the barrels',
    goal: 'Bring Pell 4 ingots.',
    why: 'Pell wants plain ingots. Steel will not do. Smelt ore on its own when the order asks for ingots.',
    quote: 'Rope will not hold a barrel of ale.',
    ask: 'Rope will not hold a barrel of ale. I need plain ingots.',
    need: 'Need 4 ingots. Plain ingots, not steel.',
    nudge: 'the barrels want plain ingots. Steel will not do.',
    change: 'The barrels have hinges.',
    item: 'ingot', qty: 4, pay: 80, xp: 25, needLevel: 5,
    prepare: world => { world.ingotsMade = 0 },
    tests: [
      { id: 'smelt', text: 'An ingot is smelted this quest', explain: 'An ingot was smelted after this quest was taken.', pass: world => world.ingotsMade > 0 },
      { id: 'done', text: 'Pell receives 4 ingots', explain: 'Four ingots have been handed over, and at least four were smelted this quest.', pass: world => shipped(world, 'pell') >= 4 && world.ingotsMade >= 4 },
    ],
  },
  {
    id: 'wen', from: 'Wen', who: 'wen', role: 'Lamplighter', building: 'lamp-street',
    title: 'Steel for the lamps',
    goal: 'Bring Wen 4 steel without spending the CPU on a fresh path every tick.',
    why: 'Calling findPath for every drone on every tick spends the CPU. Remember a route and reuse it.',
    quote: 'The street lamps have been dark a week.',
    ask: 'The street lamps have been dark a week. I need steel, and a path worth keeping.',
    need: 'Need 4 steel. Steel is smelted from ore and coal.',
    nudge: 'a fresh path every tick spends the oil. A road can be remembered.',
    change: 'The lamps are lit.',
    item: 'steel', qty: 4, pay: 120, xp: 30, needLevel: 6,
    prepare: world => {
      world.cpu.limit = world.bought.includes('cpu') ? 18 : 8
      world.pathWindow = []
    },
    tests: [
      { id: 'memory', text: 'The route is remembered', explain: 'findPath was not called on every tick. A remembered route stays at 4 calls or fewer across 8 ticks.', pass: world => world.pathWindow.length >= 8 && world.pathWindow.reduce((sum, calls) => sum + calls, 0) <= 4 },
      { id: 'done', text: 'Wen receives 4 steel', explain: 'Four steel have been handed over from the depot.', pass: world => shipped(world, 'wen') >= 4 },
    ],
  },
]

export const shop: ShopItem[] = [
  { id: 'cart', name: 'Bigger cart', price: 240, detail: 'Every drone carries 2 more.', apply: world => { for (const drone of world.drones) drone.capacity += 2 } },
  { id: 'hopper', name: 'Bigger hopper', price: 280, detail: 'The furnace holds 12 ore and 6 coal.', apply: world => { world.furnace.oreMax = 12; world.furnace.coalMax = 6 } },
  { id: 'furnace', name: 'Hotter furnace', price: 580, detail: 'A batch finishes in 2 ticks instead of 4.', apply: world => { world.batchTicks = 2 } },
  { id: 'cpu', name: 'CPU +10', price: 700, detail: 'Raises the CPU limit by 10.', apply: world => { world.cpu.limit += 10 } },
]

const secondDrone = 'drone-2'

/** Odile's hand-over, or a save that already bought the drone. Being on a later quest does not count. */
export function secondDroneUnlocked(world: Pick<World, 'cleared' | 'bought'>) {
  return !!world.cleared?.includes('odile') || !!world.bought?.includes('drone')
}

/** One drone-2 when the reward is granted, and none when it is not. Map, list, inspector, and API read `world.drones` after this. */
export function syncSecondDrone(world: World) {
  if (!secondDroneUnlocked(world)) {
    if (world.drones.some(drone => drone.name === secondDrone))
      world.drones = world.drones.filter(drone => drone.name !== secondDrone)
    if (world.signals?.drones) delete world.signals.drones[secondDrone]
    if (world.inbox?.drones) delete world.inbox.drones[secondDrone]
    if (world.jobs) delete world.jobs[secondDrone]
    return
  }
  const keep = world.drones.findIndex(drone => drone.name === secondDrone)
  if (keep >= 0)
    world.drones = world.drones.filter((drone, index) => drone.name !== secondDrone || index === keep)
  grantSecondDrone(world)
}

/** Odile's reward. A save that already bought drone-2 keeps that single drone. */
export function grantSecondDrone(world: World) {
  if (world.drones.some(drone => drone.name === secondDrone)) return
  const home = world.depot.pos
  const capacity = world.drones[0]?.capacity ?? 3
  world.drones.push({
    name: secondDrone, pos: { x: home.x, y: home.y }, cargo: 0,
    capacity, carrying: null, source: '', dig: null, task: null,
  })
  if (world.signals?.drones) world.signals.drones[secondDrone] = { cargo: 0, capacity, idle: true }
}

/** True once the quest is handed over, or a later quest is open or handed over. The open quest itself does not count. */
export function rewardGranted(world: Pick<World, 'questId' | 'cleared'>, id: string) {
  if (world.cleared.includes(id)) return true
  const index = questList.findIndex(item => item.id === id)
  if (index < 0) return false
  return questList.some((item, i) => i > index && (world.questId === item.id || world.cleared.includes(item.id)))
}

/** The reward tile stays marked new until a later quest is handed over. */
export function rewardFresh(world: Pick<World, 'cleared'>, id: string) {
  if (!world.cleared.includes(id)) return false
  const index = questList.findIndex(item => item.id === id)
  return !questList.some((item, i) => i > index && world.cleared.includes(item.id))
}

/** A Harrow save that already delivered 60 ingots is not locked by an earlier Run. Credits stay. */
export function repairHarrow(world: World) {
  if (world.questId !== 'harrow') return
  const shipped = world.orders?.find(order => order.id === 'harrow')?.shipped ?? 0
  if (shipped >= 60) world.manualRuns = 0
}

/** Why Take stays closed. The gift name lives on the quest that hands it over. */
export function questHold(world: Pick<World, 'drones'>, quest: QuestDef) {
  const gift = quest.needs
  if (!gift || world.drones.some(drone => drone.name === gift)) return
  const giver = questList.find(item => item.gift === gift)
  if (!giver) return
  const who = giver.from.replace(/^Mayor /, '')
  const place = giver.building.includes('-') ? giver.title : giver.building
  return `Finish ${who}'s ${place} for ${gift}`
}

/** The list and Accept share this. Level, an open chain, and a gift already in the world. */
export function canTake(world: Pick<World, 'cleared' | 'level' | 'drones'>, quest: QuestDef) {
  return !world.cleared.includes(quest.id) && world.level >= quest.needLevel && !questHold(world, quest)
}

export function nextQuest(world: World, site: Site) {
  return site.questList?.find(item => canTake(world, item))
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

/** A save from before the loop grant keeps the triggers that quest position used to give. */
export function pinLegacyTriggers(world: Pick<World, 'automation' | 'questId' | 'cleared'>) {
  const auto = world.automation
  if (!auto || auto.pinned) return
  const reached = (id: string) => {
    const index = questList.findIndex(item => item.id === id)
    if (index < 0) return false
    if (world.questId === id || world.cleared.includes(id)) return true
    return questList.some((item, i) => i > index && (world.questId === item.id || world.cleared.includes(item.id)))
  }
  if (reached('ines')) auto.run = true
  if (reached('odile')) auto.events = true
  if (reached('elsie')) auto.tick = true
  auto.pinned = true
}

export function acceptQuest(world: World, site: Site, id?: string) {
  if (world.questId) return false
  const quest = id
    ? site.questList?.find(item => item.id === id && canTake(world, item))
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
  const armLoop = quest.trigger === 'tick' && !triggerUnlocked(world, 'tick')
  if (!world.cleared.includes(quest.id)) world.cleared.push(quest.id)
  if (!world.growth.includes(quest.change)) world.growth.push(quest.change)
  syncSecondDrone(world)
  if (armLoop) {
    world.loop = true
    world.holding = false
  }
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

/** True when a save already had the trigger, or the quest that grants it has been handed over. */
export function triggerUnlocked(world: Pick<World, 'questId' | 'cleared' | 'automation'>, name: WorksTrigger) {
  if (world.automation?.[name]) return true
  const quest = questList.find(item => item.trigger === name)
  if (!quest) return false
  return rewardGranted(world, quest.id)
}

export function unlockError(brick: string) {
  const quest = questList.find(item => item.unlock?.brick === brick)
  const call = `${brick}()`
  if (!quest) return `${call} is not unlocked.`
  return `${call} unlocks with the quest ${quest.title} (level ${quest.needLevel}).`
}
