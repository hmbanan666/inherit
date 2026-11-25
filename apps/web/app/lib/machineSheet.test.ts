import { expect, test } from 'vitest'
import { buyUpgrade, createWorld, inspectMachine, kettlewick, machineList, questList, shop } from '@inherit/sim/v8'
import { createBench, createLathe, createPress, createSpare, itemNames, port } from '../../../../packages/sim/src/v8/modules/stock'
import { fitBudget, footerHeight, headerHeight, lockedEntries, machineSheet, machineStatus, recipeCall, recipeChips, resourceColor, sheetColumns, sheetHeight, sheetLayout } from './machineSheet'

const furnace = inspectMachine(createWorld(kettlewick), kettlewick, 'furnace')!

test('status prefers progress, then the current task, then Idle', () => {
  const view = { ...furnace, lines: [{ label: 'Task', value: 'Hauling' }] }
  expect(machineStatus({ ...view, progress: { label: 'Smelting', pct: 0 } })).toEqual({ label: 'Smelting', tone: 'working' })
  expect(machineStatus(view)).toEqual({ label: 'Hauling', tone: 'working' })
  for (const value of ['idle', 'None']) expect(machineStatus({ ...view, lines: [{ label: 'Task', value }] })).toEqual({ label: 'Idle', tone: 'idle' })
  expect(machineStatus(furnace)).toEqual({ label: 'Idle', tone: 'idle' })
})

test.each([
  ['2 ore', [{ qty: 2, item: 'ore' }]],
  ['2 ore + 1 coal', [{ qty: 2, item: 'ore' }, { qty: 1, item: 'coal' }]],
  ['1 plate + 1 pin', [{ qty: 1, item: 'plate' }, { qty: 1, item: 'pin' }]],
  ['1 cut plate', [{ qty: 1, item: 'cut plate' }]],
  ['2 ore + something else', [{ item: '2 ore + something else' }]],
] as const)('recipe chips preserve %s', (text, chips) => expect(recipeChips(text)).toEqual(chips))

test('resource colours cover stock, multiword recipe items and the cart load', () => {
  const neutral = resourceColor('unknown')
  for (const item of [...itemNames, 'cargo', 'crate', 'cut plate']) expect(resourceColor(item), item).not.toBe(neutral)
  expect(resourceColor('Hopper ore')).toBe(resourceColor('ore'))
  expect(resourceColor('Hopper coal')).toBe(resourceColor('coal'))
  expect(resourceColor('Ingots')).toBe(resourceColor('ingot'))
  expect(resourceColor('Load')).toBe(resourceColor('cargo'))
})

function fittedWorld(era: 'early' | 'late') {
  // Expose every selectable kind even in the early fixture, keeping its quest locks and stock.
  const world = createWorld(kettlewick)
  for (const vein of world.veins) vein.hidden = false
  world.drones.push({ ...structuredClone(world.drones[0]!), name: 'drone-2' })
  world.press = createPress()
  world.spare = createSpare()
  world.lathe = createLathe()
  world.bench = createBench()
  const miner = world.drones[1]!
  miner.task = { kind: 'mine', vein: 'A', since: 0 }
  miner.dig = { vein: 'A', ticks: 2 }
  miner.pos = { ...world.veins[0]!.pos }
  if (era === 'late') {
    world.cleared = questList.map(quest => quest.id)
    world.credits = shop.reduce((sum, item) => sum + item.price, 0)
    for (const item of shop) expect(buyUpgrade(world, item.id)).toBe(true)
    world.automation = { run: true, events: true, tick: true, pinned: true }
    const depot = port(world, 'depot')!
    for (const item of itemNames) depot.add(item, 1)
    world.furnace.output = 1
    world.furnace.batch = 'steel'
    world.furnace.readyAt = 1
    for (const [station, recipe] of [[world.press, 'grate'], [world.spare, 'plate'], [world.lathe, 'gear'], [world.bench, 'hinge']] as const) {
      station.recipe = recipe
      station.readyAt = 1
    }
  }
  return world
}

const cases = [
  { id: 'furnace', kind: 'Machine', book: 'furnace', actions: ['smelt', 'collect', 'clear'] },
  { id: 'depot', kind: 'Machine', book: 'depot', actions: [] },
  { id: 'press', kind: 'Machine', book: 'press', actions: [] },
  { id: 'spare', kind: 'Machine', book: 'press', actions: [] },
  { id: 'lathe', kind: 'Machine', book: 'lathe', actions: [] },
  { id: 'bench', kind: 'Machine', book: 'bench', actions: [] },
  ...['drone-1', 'drone-2'].map(id => ({ id, kind: 'Cart', book: 'drone', actions: ['mine', 'unload', 'dump'] })),
  ...['A', 'B', 'C', 'D'].map(name => ({ id: 'Vein ' + name, kind: 'Vein', book: 'veins', actions: ['mine'] })),
]
// Expected [columns, tallest column in pixels] at 1280×720 for the Phase 7 fixtures.
const fit: Record<string, { early: [number, number]; late: [number, number] }> = {
  furnace: { early: [2, 296], late: [2, 284] },
  depot: { early: [1, 148], late: [2, 220] },
  press: { early: [2, 308], late: [2, 308] },
  spare: { early: [2, 308], late: [2, 308] },
  lathe: { early: [1, 330], late: [1, 358] },
  bench: { early: [1, 328], late: [1, 356] },
  'drone-1': { early: [1, 356], late: [1, 356] },
  'drone-2': { early: [1, 384], late: [1, 384] },
  vein: { early: [1, 216], late: [1, 216] },
}
const recipeCases = [
  ['furnace', 'ingot', 'furnace.smelt()'], ['furnace', 'steel', 'furnace.alloy()'],
  ['press', 'grate', 'press.start("grate")'], ['press', 'plate', undefined], ['press', 'blank', undefined], ['press', 'shutter', 'press.start("shutter")'],
  ['spare', 'grate', undefined], ['spare', 'plate', undefined], ['spare', 'blank', undefined], ['spare', 'shutter', undefined],
  ['lathe', 'gear', 'lathe.start("gear")'], ['lathe', 'pin', undefined], ['lathe', 'cut', undefined],
  ['bench', 'hinge', 'bench.start("hinge")'], ['bench', 'pack', 'bench.start("pack")'],
] as const
const early = fittedWorld('early')
test.each(recipeCases)('%s recipe %s shows %s', (id, recipeId, call) => {
  const view = inspectMachine(early, kettlewick, id)!
  expect(recipeCall(view, view.recipes.find(recipe => recipe.id === recipeId)!)).toBe(call)
})

test('Alloy has one unlock title, its signature and the complete recipe', () => {
  expect(lockedEntries(furnace)).toMatchObject([{
    label: 'Alloy', api: 'furnace.alloy()', input: [{ qty: 2, item: 'ore' }, { qty: 1, item: 'coal' }],
    output: [{ qty: 1, item: 'steel' }], unlock: 'Unlocks after: Steel for the bridge',
  }])
  const sheet = machineSheet(furnace)
  expect(JSON.stringify(sheet).match(/Steel for the bridge/g)).toHaveLength(1)
  expect(sheet.columns.flat().find(s => s.kind === 'recipes')?.rows).toHaveLength(1)
  const world = createWorld(kettlewick)
  world.questId = questList.find(quest => quest.unlock?.brick === 'furnace.alloy')!.id
  world.furnace.input = 2
  world.furnace.coal = 1
  const unlocked = inspectMachine(world, kettlewick, 'furnace')!
  expect(lockedEntries(unlocked)).toEqual([])
  const after = machineSheet(unlocked)
  expect(after.columns.flat().find(s => s.kind === 'api')?.rows).toContainEqual(expect.objectContaining({ api: 'furnace.alloy()', readiness: 'Ready' }))
  expect(after.actions).toContain(unlocked.actions[1])
})

test('locks also match by recipe call and keep unmatched recipes and actions', () => {
  const recipe = { ...furnace.recipes[1]!, locked: 'The order unlocks a new recipe' }
  const action = furnace.actions[1]!
  expect(lockedEntries({ ...furnace, recipes: [recipe], actions: [action] })).toMatchObject([{ label: 'Alloy', unlock: 'Unlocks after: The order' }])
  expect(lockedEntries({ ...furnace, recipes: [recipe], actions: [] })).toMatchObject([{ api: 'furnace.alloy()', output: [{ qty: 1, item: 'steel' }] }])
  expect(lockedEntries({ ...furnace, recipes: [], actions: [action] })).toMatchObject([{ label: 'Alloy', api: action.api, unlock: 'Unlocks after: Steel for the bridge' }])
})

test('Code API exposes documentation and readiness as plain display data', () => {
  const action = furnace.actions[0]!
  const view = { ...furnace, actions: [action, { ...action, id: 'clear' as const, api: 'unknown()', reason: 'Needs power' }] }
  const api = machineSheet(view).columns.flat().find(s => s.kind === 'api')!
  expect(api.rows).toEqual([
    { kind: 'api', key: 'smelt', api: 'furnace.smelt()', description: 'Start smelting 2 ore into 1 ingot.', ready: false, readiness: 'Needs 2 ore' },
    { kind: 'api', key: 'clear', api: 'unknown()', description: 'Needs power', ready: false, readiness: 'Needs power' },
  ])
})

test('a positive capacity must be exactly full for a gold count and glow', () => {
  const view = { ...furnace, lines: ['6/6', '2/6', '0/0'].map(value => ({ label: value, value })) }
  expect(machineSheet(view).columns[0]![0]!.rows.map(row => row.kind === 'meter' && row.full)).toEqual([true, false, false])
})

for (const era of ['early', 'late'] as const) {
  const world = era === 'early' ? early : fittedWorld(era)
  test(`${era} fit cases include every Machines row`, () => {
    expect(cases.map(c => c.id).sort()).toEqual(machineList(world).map(machine => machine.id).sort())
  })
  test.each(cases)(`${era} $id preserves state, recipes and Phase 7 manual actions and fits in 386px`, sample => {
    const view = inspectMachine(world, kettlewick, sample.id)!
    const sheet = machineSheet(view)
    expect([sheet.name, sheet.kind, sheet.description, sheet.apiSection]).toEqual([view.name, sample.kind, view.description, sample.book])
    const ids = era === 'late' && sample.id === 'furnace' ? ['smelt', 'alloy', 'collect', 'clear'] : sample.actions
    expect(sheet.actions.map(a => a.id)).toEqual(ids)
    for (const action of sheet.actions) expect(action).toBe(view.actions.find(a => a.id === action.id))
    const layout = sheetLayout(sheet)
    const sections = sheetColumns(sheet, layout).flat()
    const rows = sections.flatMap(section => section.rows)
    const lines = rows.flatMap(row => row.kind === 'fact' || row.kind === 'meter'
      ? [{ label: row.label, value: row.kind === 'meter' ? row.text : row.value }] : [])
    expect(lines).toHaveLength(view.lines.length)
    expect(lines).toEqual(expect.arrayContaining(view.lines))
    expect(rows.filter(r => r.kind === 'progress')).toMatchObject(view.progress ? [{
      label: view.progress.label, value: view.progress.pct, max: 100, text: `${Math.round(view.progress.pct)}%`,
    }] : [])
    expect(rows.filter(r => r.kind === 'api').map(r => [r.key, r.api, r.readiness])).toEqual(
      sheet.actions.map(a => [a.id, a.api, a.enabled ? 'Ready' : a.reason]))
    expect(rows.filter(r => r.kind === 'recipe').map(r => [r.key, r.input, r.output, r.missing])).toEqual(
      view.recipes.filter(r => !r.locked).map(r => [r.id, recipeChips(r.input), recipeChips(r.output), r.missing]))
    expect(recipeCases.filter(([id]) => id === sample.id).map(([, id]) => id)).toEqual(view.recipes.map(r => r.id))
    expect([layout, sheetHeight(sheet, layout)]).toEqual(fit[sample.kind === 'Vein' ? 'vein' : sample.id]![era])
    expect(sheetHeight(sheet, layout)).toBeLessThanOrEqual(fitBudget)
  })
}

test('the one-column depot grows to two State columns only when its stock would overflow', () => {
  expect([headerHeight, footerHeight, fitBudget]).toEqual([112, 48, 386])
  const depot = (world: typeof early) => machineSheet(inspectMachine(world, kettlewick, 'depot')!)
  expect(sheetLayout(depot(early))).toBe(1)
  const stocked = depot(fittedWorld('late'))
  expect(sheetHeight(stocked, 1)).toBe(388)
  expect(sheetLayout(stocked)).toBe(2)
  expect(sheetColumns(stocked, 2).map(c => c.map(s => s.kind))).toEqual([['state'], ['state']])
  expect(sheetLayout(machineSheet(furnace))).toBe(2)
})

test('columns within 1.6× can sit side by side, while uneven sections stack when they fit', () => {
  // State + Recipes is 160px (two facts and an unlocked recipe), API is 136px.
  const view = { ...furnace, lines: [{ label: 'A', value: 'one' }, { label: 'B', value: 'two' }],
    recipes: furnace.recipes.slice(0, 1), actions: [furnace.actions[0]!, furnace.actions[2]!] }
  expect(sheetLayout(machineSheet(view))).toBe(2)
  // Removing one API row gives 92px, less than 160 / 1.6.
  expect(sheetLayout(machineSheet({ ...view, actions: view.actions.slice(0, 1) }))).toBe(1)
  const empty = machineSheet({ ...view, lines: [], recipes: [], actions: [] })
  expect(sheetHeight(empty, sheetLayout(empty))).toBe(0)
})
