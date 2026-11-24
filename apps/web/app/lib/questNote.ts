import { readChecks, type Item, type World } from '@inherit/sim/v8'
import { savedContract, type QuestDef } from '../../../../packages/sim/src/v8/quests'

/** A comment in the villager's voice. It names the problem and never the expression. */
export function questComment(from: string, nudge: string) {
  return `// ${from.replace(/^Mayor /, '')}: ${nudge}`
}

/**
 * Put the note on the first line once.
 * An id already in `remembered` is left alone, even when the player has deleted the line.
 */
export function insertQuestNote(source: string, note: string, id: string, remembered: readonly string[]) {
  if (remembered.includes(id)) return { source, remembered: [...remembered] }
  const next = [...remembered, id]
  if (source.split('\n').some(line => line.trim() === note)) return { source, remembered: next }
  return { source: source.length ? `${note}\n${source}` : `${note}\n`, remembered: next }
}

const goodName: Record<string, [string, string]> = {
  ingot: ['ingot', 'ingots'],
  steel: ['steel', 'steel'],
  ore: ['ore', 'ore'],
  grate: ['grate', 'grates'],
  plate: ['plate', 'plates'],
  blank: ['blank', 'blanks'],
  gear: ['gear', 'gears'],
  pin: ['pin', 'pins'],
  cut: ['cut plate', 'cut plates'],
  shutter: ['shutter', 'shutters'],
  hinge: ['hinge', 'hinges'],
  winch: ['winch crate', 'winch crates'],
  lamp: ['lamp crate', 'lamp crates'],
}

function named(item: string, qty: number) {
  const pair = goodName[item]
  if (!pair) return qty === 1 ? item : `${item}s`
  return qty === 1 ? pair[0] : pair[1]
}

type Shipment = Pick<World['orders'][number], 'from' | 'item' | 'qty' | 'lines' | 'shipped'>

export function orderGoods(order: Pick<QuestDef, 'item' | 'qty' | 'lines'>) {
  const lines = order.lines?.length ? order.lines : [order]
  return lines.map(line => `${line.qty} ${named(line.item, line.qty)}`).join(' and ')
}

/** The quantity on the quest rail. The count is what the villager has received. */
export function quantityLabel({ from, item, qty, shipped, lines }: Shipment) {
  const who = from.replace(/^Mayor /, '')
  if (lines?.length) {
    const done = lines.reduce((sum, line) => sum + Math.min(line.shipped, line.qty), 0)
    const total = lines.reduce((sum, line) => sum + line.qty, 0)
    const text = lines.map(line => `${Math.min(line.shipped, line.qty)}/${line.qty} ${named(line.item, line.qty)}`).join(', ')
    return { text, value: done, max: total }
  }
  const value = Math.min(shipped, qty)
  return { text: `Delivered to ${who} · ${value}/${qty} ${named(item, qty)}`, value, max: qty }
}

export function furnaceOutput(item: Item) {
  return item === 'ingot' || item === 'steel'
}

/** How finished goods leave the furnace. Shown on the need line. */
export function deliveryNote(need: string, order: Pick<World['orders'][number], 'item' | 'qty' | 'shipped'>) {
  if (!furnaceOutput(order.item) || order.shipped >= order.qty) return need
  return `${need} Collect sends a drone from the furnace to the depot.`
}

function shipmentLines(world: World, quest: QuestDef, order?: Shipment): Shipment['lines'] {
  const source = order ?? quest
  // The crew order records its two receipts in the manifest instead of order.lines.
  if (source.item === 'winch' && !source.lines?.length) {
    const checks = order ? world.checks : quest.tests
    return checks.flatMap(({ id }) => id === 'winch' || id === 'lamp'
      ? [{ item: id, qty: 1, shipped: order && world.manifest[id] ? 1 : 0 }]
      : [])
  }
  return order ? order.lines : quest.lines?.map(line => ({ ...line, shipped: 0 }))
}

type TestRow = ReturnType<typeof readChecks>[number] & { explain: string }

function questTests(world: World, quest: QuestDef, savedQuantity?: string): TestRow[] {
  if (savedQuantity) {
    return world.checks.map(check => ({
      id: check.id, text: check.text, explain: savedQuantity, state: check.status === 'green' ? 'passing' : 'pending',
    }))
  }
  const readings = world.questId === quest.id ? readChecks(world, quest) : []
  return quest.tests.map(test => ({
    id: test.id, text: test.text, state: 'pending', explain: test.explain,
    ...readings.find(row => row.id === test.id),
  }))
}

/** Describe the order the depot is filling, or the offer before Take. */
export function questCard(world: World, quest: QuestDef) {
  const active = world.questId === quest.id
  const legacy = savedContract(world, quest)
  const order = active ? legacy ?? world.orders.find(order => order.id === quest.id) : undefined
  if (active && !order) return
  const { from, item, qty } = order ?? quest
  const shipment: Shipment = { from, item, qty, shipped: order?.shipped ?? 0, lines: shipmentLines(world, quest, order) }
  const quantity = quantityLabel(shipment)
  const need = legacy ? `Need ${orderGoods(legacy)}.` : quest.need
  const ready = active && world.checks.length > 0 && world.checks.every(check => check.status === 'green')
  const tests = questTests(world, quest, legacy ? quantity.text : undefined)
  return {
    ...shipment,
    title: order?.title ?? quest.title,
    ask: legacy?.text ?? quest.ask,
    goal: order?.text ?? quest.goal,
    needText: deliveryNote(need, shipment),
    trigger: quest.trigger,
    batchCheck: active && quest.id === 'bram' ? world.checks.find(check => check.id === 'ingot')?.status : undefined,
    quantity, tests, ready,
    remainingTest: active && quantity.value === quantity.max && !ready ? firstOpenTest(tests) : undefined,
  }
}

/** The first test that is not passing. The footer uses it to open Tests. */
export function firstOpenTest(rows: readonly { id: string; state: string }[]) {
  return rows.find(row => row.state !== 'passing')?.id
}

/** One progress line. The delivery count is named by where the goods are handed over. */
export function goalLabel(checkId: string, item: string, qty: number, shipped: number, done: boolean, memory = 0) {
  if (checkId === 'done') {
    const name = item === 'steel' ? 'Steel' : item === 'ore' ? 'Ore' : item === 'grate' ? 'Grates' : item === 'ingot' ? 'Ingots' : named(item, qty)
    return { text: `${name} at the depot ${shipped}/${qty}`, value: Math.min(shipped, qty), max: qty }
  }
  if (checkId === 'memory') {
    const value = Math.min(memory, 8)
    return { text: `A remembered route ${value}/8`, value, max: 8 }
  }
  const places: Record<string, string> = {
    ore: 'Ore at the furnace',
    coal: 'Coal at the furnace',
    ingot: 'An ingot at the furnace',
    steel: 'Steel at the furnace',
    both: 'Ore and coal at the furnace',
    drone: 'drone-2 past the depot',
    smelt: 'An ingot smelted',
    vein: 'Vein D ore at the depot',
    haul: 'A haul of steel or a grate',
    plate: 'A plate at the depot',
    blank: 'A blank at the depot',
    winch: 'The winch crate at the depot',
    lamp: 'The lamp crate at the depot',
  }
  const value = done ? 1 : 0
  return { text: `${places[checkId] ?? checkId} ${value}/1`, value, max: 1 }
}
