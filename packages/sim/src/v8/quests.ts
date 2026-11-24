import type { Site, World } from './core/world'
import { noteCheckReset, readChecks } from './checkFacts'
import { createBench, createLathe, createPress, createSpare, hotFurnaceTicks, machineSlot, normalizeBench, normalizeLathe, normalizePress, normalizeSpare, smeltRecipe, type Item } from './modules/stock'

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
  item: Item
  qty: number
  /** Extra goods on the same order. The depot fills each line. `item` and `qty` stay the rail. */
  lines?: { item: Item; qty: number }[]
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
  /** A machine installed on Hand over. Not sold. */
  install?: string
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

const steps = [10, 20, 40, 85, 140, 170]
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
const lineShipped = (world: World, id: string, item: Item) =>
  world.orders.find(order => order.id === id)?.lines?.find(line => line.item === item)?.shipped ?? 0

export const questList: QuestDef[] = [
  {
    id: 'bram', from: 'Bram', who: 'bram', role: 'Blacksmith', building: 'forge',
    title: 'Horseshoes for the mail horse',
    goal: 'Bring Bram 1 ingot from a batch smeltOnce started.',
    why: 'Buttons can fill the hopper and haul. smeltOnce has to start the batch. The furnace finishes it after the function returns.',
    quote: 'The mail horse throws a shoe on every hill.',
    ask: 'The mail horse throws a shoe on every hill. I need one ingot, from your own batch.',
    need: 'Need 1 ingot. smeltOnce starts the batch. Buttons may fill the hopper and haul.',
    nudge: 'smeltOnce is empty. The furnace finishes the batch after it returns.',
    change: 'The forge is lit. The mail horse has shoes.',
    item: 'ingot', qty: 1, pay: 40, xp: 10, needLevel: 1,
    prepare: world => { world.codedBatch = false },
    tests: [
      { id: 'ore', text: 'Ore reaches the furnace', explain: 'The furnace has taken in ore, or an ingot was already made from it.', pass: world => world.furnace.input > 0 || world.furnace.output > 0 || world.ingotsMade > 0 || shipped(world, 'bram') > 0 },
      { id: 'ingot', text: 'smeltOnce starts a batch', explain: 'A function called smelt() or furnace.start("smelt"). The Smelt button does not count.', pass: world => world.codedBatch },
      { id: 'done', text: 'Bram receives 1 ingot', explain: 'One ingot from that batch has been handed over from the depot.', pass: world => world.codedBatch && shipped(world, 'bram') >= 1 },
    ],
  },
  {
    id: 'ines', from: 'Ines', who: 'ines', role: 'Warden', building: 'town-hall',
    title: 'Ore from the normal cut',
    goal: 'Bring Ines 3 ore from vein D.',
    why: 'Vein D is the normal ore. One Run sends the empty cart to mine. The next Run unloads that ore at the depot. Loop is the hand-over, not this job.',
    quote: 'The old cut is a poor teacher. I want the new one counted.',
    ask: 'The old cut is a poor teacher. I want three rocks from the normal cut, at the depot.',
    need: 'Need 3 ore from vein D, unloaded at the depot.',
    nudge: 'vein D is the normal ore. Unload it at the depot.',
    change: 'The new cut is on the map.',
    item: 'ore', qty: 3, pay: 60, xp: 10, needLevel: 2,
    trigger: 'tick',
    tests: [
      { id: 'vein', text: 'Vein D ore reaches the depot', explain: 'Ore mined at vein D was unloaded at the depot. Ore from another vein does not count.', pass: world => shipped(world, 'ines') > 0 },
      { id: 'done', text: 'Ines receives 3 ore from vein D', explain: 'Three rocks from vein D have been unloaded at the depot.', pass: world => shipped(world, 'ines') >= 3 },
    ],
  },
  {
    id: 'odile', from: 'Mayor Odile', who: 'odile', role: 'Mayor', building: 'bridge',
    title: 'Steel for the bridge',
    goal: 'Bring Odile 2 steel.',
    why: 'Steel is 2 ore and 1 coal alloyed together. Vein B is coal. furnace.alloy() makes steel.',
    unlock: { brick: 'furnace.alloy', signature: 'furnace.alloy(): 2 ore + 1 coal -> 1 steel', legacy: 'alloy' },
    quote: 'Two banks, and no way across.',
    ask: 'Two banks, and no way across. I need steel for the bridge.',
    need: 'Need 2 steel. Steel is smelted from ore and coal.',
    nudge: 'steel is ore and coal together. Where would they meet?',
    change: 'The bridge stands. Kettlewick can cross the river again.',
    gift: 'drone-2',
    install: 'press',
    item: 'steel', qty: 2, pay: 80, xp: 20, needLevel: 3,
    tests: [
      { id: 'coal', text: 'Coal reaches the furnace', explain: 'The furnace hopper holds coal, or steel was already made.', pass: world => world.furnace.coal > 0 || world.steelMade > 0 || shipped(world, 'odile') > 0 },
      { id: 'steel', text: 'The furnace makes steel', explain: 'The furnace has finished at least one steel.', pass: world => world.steelMade > 0 || shipped(world, 'odile') > 0 },
      { id: 'done', text: 'Odile receives 2 steel', explain: 'Two steel have been handed over from the depot.', pass: world => shipped(world, 'odile') >= 2 },
    ],
  },
  {
    id: 'elsie', from: 'Elsie', who: 'elsie', role: 'Baker', building: 'bakery',
    title: 'A grate for the oven',
    goal: 'Bring Elsie 2 grates. Each cart hauls steel or a grate.',
    why: 'The press turns 2 steel into a grate. One cart carries steel to the press. The other carries the grate to the depot. A cart that never hauls does not count. on() is the hand-over, not this job.',
    quote: 'The oven has been cold since dawn.',
    ask: 'The oven has been cold since dawn. I need two grates, and both carts have to carry something.',
    need: 'Need 2 grates. The press makes a grate from 2 steel. Each cart hauls steel or a grate.',
    nudge: 'one cart carries steel to the press. The other carries the grate to the depot.',
    change: 'The bakery is warm again.',
    item: 'grate', qty: 2, pay: 100, xp: 20, needLevel: 4,
    needs: 'drone-2',
    unlock: { brick: 'press.grate', signature: 'press.start("grate"): 2 steel -> 1 grate' },
    trigger: 'events',
    prepare: world => { world.hauled = {} },
    tests: [
      { id: 'haul', text: 'Each cart hauls steel or a grate', explain: 'Every cart finished a haul of steel or a grate during this quest. Leaving the depot is not a haul.', pass: world => world.drones.length >= 2 && world.drones.every(drone => world.hauled?.[drone.name]) },
      { id: 'done', text: 'Elsie receives 2 grates', explain: 'Two grates have been handed over from the depot.', pass: world => shipped(world, 'elsie') >= 2 },
    ],
  },
  {
    id: 'harrow', from: 'Harrow', who: 'harrow', role: 'Surveyor', building: 'town-hall',
    title: 'Iron from the hill',
    goal: 'Bring Harrow 1 plate and 1 blank.',
    why: 'The press can form a plate from an ingot or a blank from steel. The die has to match the order. prospect() still reveals the rich vein.',
    quote: 'The stores want a plate and a blank, and the press still wears the grate die.',
    ask: 'The stores want a plate and a blank, and the press still wears the grate die.',
    need: 'Need 1 plate and 1 blank. A plate is an ingot. A blank is steel.',
    nudge: 'the press is still on the grate die. The order names a plate and a blank.',
    change: 'The hill stores have a plate and a blank.',
    item: 'plate', qty: 2, lines: [{ item: 'plate', qty: 1 }, { item: 'blank', qty: 1 }],
    pay: 110, xp: 25, needLevel: 4,
    unlock: { brick: 'prospect', signature: 'prospect(): reveals the next hidden vein', legacy: 'prospect' },
    install: 'lathe',
    tests: [
      { id: 'plate', text: 'Harrow receives 1 plate', explain: 'One plate has been handed over from the depot.', pass: world => lineShipped(world, 'harrow', 'plate') >= 1 },
      { id: 'blank', text: 'Harrow receives 1 blank', explain: 'One blank has been handed over from the depot.', pass: world => lineShipped(world, 'harrow', 'blank') >= 1 },
    ],
  },
  {
    id: 'tomas', from: 'Tomas', who: 'tomas', role: 'Miller', building: 'mill',
    title: 'Gears for the mill wheel',
    goal: 'Bring Tomas 2 gears.',
    why: 'A blank is not a gear until the lathe cuts it.',
    quote: 'The wheel sits in the race and will not turn.',
    ask: 'The wheel sits in the race and will not turn. I need gears, not blanks.',
    need: 'Need 2 gears. The lathe cuts a blank into a gear.',
    nudge: 'a blank will not turn the wheel. The lathe cuts it.',
    change: 'The mill wheel turns.',
    item: 'gear', qty: 2, pay: 130, xp: 25, needLevel: 5,
    unlock: { brick: 'lathe.gear', signature: 'lathe.start("gear"): 1 blank -> 1 gear' },
    install: 'assembly table',
    tests: [
      { id: 'done', text: 'Tomas receives 2 gears', explain: 'Two gears have been handed over from the depot.', pass: world => shipped(world, 'tomas') >= 2 },
    ],
  },
  {
    id: 'pell', from: 'Pell', who: 'pell', role: 'Cooper', building: 'riverside',
    title: 'Hinges for the barrels',
    goal: 'Bring Pell 2 hinges.',
    why: 'A hinge is a plate from the press and a pin from the lathe.',
    quote: 'Rope will not hold a barrel of ale.',
    ask: 'Rope will not hold a barrel of ale. I need hinges, and a hinge is two parts.',
    need: 'Need 2 hinges. Each hinge is 1 plate and 1 pin.',
    nudge: 'a hinge is a plate and a pin. One of them will not do.',
    change: 'The barrels have hinges.',
    item: 'hinge', qty: 2, pay: 150, xp: 30, needLevel: 5,
    unlock: { brick: 'bench.hinge', signature: 'bench.start("hinge"): 1 plate + 1 pin -> 1 hinge' },
    tests: [
      { id: 'done', text: 'Pell receives 2 hinges', explain: 'Two hinges have been handed over from the depot.', pass: world => shipped(world, 'pell') >= 2 },
    ],
  },
  {
    id: 'wen', from: 'Wen', who: 'wen', role: 'Lamplighter', building: 'lamp-street',
    title: 'Shutters for the lamps',
    goal: 'Bring Wen 2 folding shutters.',
    why: 'A plate goes to the lathe to be cut, then back to the press to be folded. The next stop depends on the part in the cart.',
    quote: 'The street lamps have been dark a week.',
    ask: 'The street lamps have been dark a week. I need folding shutters, and a shutter comes back through the press.',
    need: 'Need 2 shutters. Cut a plate, then fold it.',
    nudge: 'a cut plate is not a shutter until it goes back through the press.',
    change: 'The lamps have shutters.',
    item: 'shutter', qty: 2, pay: 170, xp: 30, needLevel: 6,
    unlock: { brick: 'press.shutter', signature: 'press.start("shutter"): 1 cut plate -> 1 shutter' },
    tests: [
      { id: 'done', text: 'Wen receives 2 shutters', explain: 'Two shutters have been handed over from the depot.', pass: world => shipped(world, 'wen') >= 2 },
    ],
  },
  {
    id: 'crew', from: 'Mayor Odile', who: 'odile', role: 'Mayor', building: 'bridge',
    title: 'Kits for the bridge crew',
    goal: 'Pack a winch crate, then a lamp crate, and hand both over.',
    why: 'The winch crate is 1 gear and 2 hinges. The lamp crate is 2 shutters and 1 hinge. The second crate waits until the first is received.',
    quote: 'The crew cannot raise the span with loose parts.',
    ask: 'The crew cannot raise the span with loose parts. Pack the winch crate first, then the lamp crate.',
    need: 'Need 2 labeled crates, in order. The winch crate is first.',
    nudge: 'the winch crate is first. The lamp crate waits.',
    change: 'The bridge crew is equipped.',
    item: 'winch', qty: 2, pay: 200, xp: 40, needLevel: 7,
    unlock: { brick: 'bench.pack', signature: 'bench.start("pack"): the active kit -> 1 labeled crate' },
    prepare: world => { world.manifest = { active: 'winch', staged: {}, winch: false, lamp: false } },
    tests: [
      { id: 'winch', text: 'The winch crate is received', explain: 'The depot received the winch crate. The lamp crate waits.', pass: world => world.manifest.winch },
      { id: 'lamp', text: 'The lamp crate is received', explain: 'The depot received the lamp crate after the winch crate.', pass: world => world.manifest.winch && world.manifest.lamp },
    ],
  },
]

export const shop: ShopItem[] = [
  { id: 'cart', name: 'Bigger cart', price: 150, detail: 'Every drone carries 2 more.', apply: world => { for (const drone of world.drones) drone.capacity += 2 } },
  { id: 'hopper', name: 'Bigger hopper', price: 240, detail: 'The furnace holds 12 ore and 6 coal.', apply: world => { world.furnace.oreMax = 12; world.furnace.coalMax = 6 } },
  { id: 'furnace', name: 'Hotter furnace', price: 350, detail: `A batch finishes in ${hotFurnaceTicks} ticks instead of ${smeltRecipe.ticks}.`, apply: world => { world.batchTicks = hotFurnaceTicks } },
  { id: 'racks', name: 'Output racks', price: 450, detail: `Each later machine holds ${machineSlot * 2} finished parts.`, apply: world => { world.outputRacks = true } },
  { id: 'cpu', name: 'CPU +10', price: 580, detail: 'Raises the CPU limit by 10.', apply: world => { world.cpu.limit += 10 } },
  { id: 'spare', name: 'Spare press', price: 720, detail: 'A second press at (5, 4).', apply: world => { world.spare = world.spare ? normalizeSpare(world.spare) : createSpare() } },
]

const secondDrone = 'drone-2'

/** Hand-over grants. A bought drone is only the cart. Being on a later quest adds none of these. */
export function worksGrants(world: Pick<World, 'cleared' | 'bought'>) {
  const cleared = world.cleared ?? []
  const odile = cleared.includes('odile')
  return {
    'drone-2': odile || !!world.bought?.includes('drone'),
    press: odile,
    lathe: cleared.includes('harrow'),
    bench: cleared.includes('tomas'),
  }
}

/** Odile's hand-over, or a save that already bought the drone. Being on a later quest does not count. */
export function secondDroneUnlocked(world: Pick<World, 'cleared' | 'bought'>) {
  return worksGrants(world)['drone-2']
}

/** Racks and the spare press wait until the base press is installed. The other four are listed from the start. */
export function shopFor(world: Pick<World, 'cleared' | 'bought'>) {
  const press = worksGrants(world).press
  return shop.filter(item => (item.id !== 'racks' && item.id !== 'spare') || press)
}

/** A finished haul of steel or a grate during Elsie's job. */
export function notePartHaul(world: World, name: string) {
  if (world.questId !== 'elsie') return
  world.hauled ??= {}
  world.hauled[name] = true
}

/** An open order saved before this contract. Delivery still uses the saved item and quantity. */
export function savedContract(world: World, quest: QuestDef) {
  if (world.questId !== quest.id) return
  const order = world.orders.find(item => item.id === quest.id && item.status !== 'on time')
  if (!order || (order.item === quest.item && order.qty === quest.qty)) return
  return order
}

/** The press is on the floor only when Odile's Hand over granted it. */
export function syncPress(world: World) {
  if (!worksGrants(world).press) {
    world.press = null
    return
  }
  world.press = world.press ? normalizePress(world.press) : createPress()
}

/** The lathe is on the floor only when Harrow's Hand over granted it. */
export function syncLathe(world: World) {
  if (!worksGrants(world).lathe) {
    world.lathe = null
    return
  }
  world.lathe = world.lathe ? normalizeLathe(world.lathe) : createLathe()
}

/** The assembly table is on the floor only when Tomas's Hand over granted it. */
export function syncBench(world: World) {
  if (!worksGrants(world).bench) {
    world.bench = null
    return
  }
  world.bench = world.bench ? normalizeBench(world.bench) : createBench()
}

/** The spare press is on the floor only after it is bought, and only while the base press stands. */
export function syncSpare(world: World) {
  if (!world.bought.includes('spare') || !worksGrants(world).press) {
    world.spare = null
    return
  }
  world.spare = world.spare ? normalizeSpare(world.spare) : createSpare()
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

/** The previous quest in the list has been handed over. The first quest has no predecessor. */
export function chainReady(world: Pick<World, 'cleared'>, quest: QuestDef) {
  const index = questList.findIndex(item => item.id === quest.id)
  const prev = index > 0 ? questList[index - 1] : undefined
  return !prev || world.cleared.includes(prev.id)
}

/** The list and Accept share this. Level, the previous hand-over, and a gift already in the world. */
export function canTake(world: Pick<World, 'cleared' | 'level' | 'drones'>, quest: QuestDef) {
  return chainReady(world, quest) && !world.cleared.includes(quest.id) && world.level >= quest.needLevel && !questHold(world, quest)
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
  const saved = savedContract(world, quest)
  if (saved) {
    const text = `${quest.from} receives the saved order`
    world.checks = [{ id: 'done', text, status: saved.shipped >= saved.qty ? 'green' as const : 'open' as const }]
    readChecks(world, quest)
    return world.checks.find(check => check.status !== 'green')?.text ?? 'Every test passes. Complete the quest.'
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
    lines: quest.lines?.map(line => ({ item: line.item, qty: line.qty, shipped: 0 })),
  })
  world.status = syncQuest(world, site)
  return true
}

export function completeQuest(world: World, site: Site) {
  const quest = site.questList?.find(item => item.id === world.questId)
  if (!quest) return false
  const saved = savedContract(world, quest)
  if (saved ? saved.shipped < saved.qty : quest.tests.some(test => !test.pass(world))) return false
  world.credits += quest.pay
  world.ledger.income += quest.pay
  world.xp += quest.xp
  world.level = levelFor(world.xp)
  const armLoop = quest.trigger === 'tick' && !triggerUnlocked(world, 'tick')
  if (!world.cleared.includes(quest.id)) world.cleared.push(quest.id)
  if (!world.growth.includes(quest.change)) world.growth.push(quest.change)
  syncSecondDrone(world)
  syncPress(world)
  syncSpare(world)
  syncLathe(world)
  syncBench(world)
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
  const item = shopFor(world).find(entry => entry.id === id)
  if (!item || world.bought.includes(id) || world.credits < item.price) return false
  world.credits -= item.price
  world.bought.push(id)
  item.apply(world)
  return true
}

/** True when no quest owns the brick, the player already bought it, or they have reached the quest that grants it. */
export function functionUnlocked(world: Pick<World, 'questId' | 'cleared' | 'bought'>, brick: string) {
  if (brick === 'spare' || brick.startsWith('spare.')) return !!world.bought?.includes('spare')
  if (brick === 'press.grate' || brick === 'press.shutter' || brick === 'lathe.gear' || brick === 'lathe.pin' || brick === 'lathe.cut' || brick === 'bench.hinge' || brick === 'bench.pack') {
    const quest = questList.find(item => item.unlock?.brick === brick)
    if (!quest) return false
    if (world.questId === quest.id || world.cleared.includes(quest.id)) return true
    const index = questList.findIndex(item => item.id === quest.id)
    return questList.some((item, i) => i > index && (world.questId === item.id || world.cleared.includes(item.id)))
  }
  if (brick === 'press' || brick.startsWith('press.')) return worksGrants(world).press
  if (brick === 'lathe' || brick.startsWith('lathe.')) return worksGrants(world).lathe
  if (brick === 'bench' || brick.startsWith('bench.')) return worksGrants(world).bench
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
