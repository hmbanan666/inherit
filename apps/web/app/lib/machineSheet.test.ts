import { expect, test } from 'vitest'
import { Cog, Flame, Hammer, Mountain, Stamp, Truck, Warehouse } from '@lucide/vue'
import { buyUpgrade, createWorld, inspectMachine, kettlewick, machineList, questList, shop } from '@inherit/sim/v8'
import { createBench, createLathe, createPress, createSpare, itemNames, port } from '../../../../packages/sim/src/v8/modules/stock'
import { fitBudget, machineSheet, sheetHeight } from './machineSheet'

test('the furnace separates its four capacity meters, smelt recipe, manual buttons and alloy locks', () => {
  const view = inspectMachine(createWorld(kettlewick), kettlewick, 'furnace')!
  const sheet = machineSheet(view, 'furnace')
  const [[state, recipes], [api, locked]] = sheet.columns
  expect(state!.rows).toMatchObject([
    { kind: 'meter', label: 'Hopper ore', value: 0, max: 6, text: '0/6' },
    { kind: 'meter', label: 'Hopper coal', value: 0, max: 3, text: '0/3' },
    { kind: 'meter', label: 'Ingots', value: 0, max: 6, text: '0/6' },
    { kind: 'meter', label: 'Steel', value: 0, max: 6, text: '0/6' },
  ])
  expect(recipes!.rows).toMatchObject([{ kind: 'recipe', recipe: view.recipes[0] }])
  expect(api!.rows.map(row => row.kind === 'api' && row.action.id)).toEqual(['smelt', 'collect', 'clear'])
  expect(locked!.rows).toMatchObject([
    { kind: 'recipe', recipe: view.recipes[1] },
    { kind: 'api', action: view.actions[1], disabled: true },
  ])
})

test('taking Steel for the bridge moves alloy and its recipe into their working sections', () => {
  const world = createWorld(kettlewick)
  world.questId = questList.find(quest => quest.unlock?.brick === 'furnace.alloy')!.id
  world.furnace.input = 2
  world.furnace.coal = 1
  const view = inspectMachine(world, kettlewick, 'furnace')!
  const [[, recipes], [api, locked]] = machineSheet(view).columns
  expect(locked).toBeUndefined()
  expect(recipes!.rows.map(row => row.kind === 'recipe' && row.recipe.output)).toEqual(['1 ingot', '1 steel'])
  expect(api!.rows).toContainEqual(expect.objectContaining({ action: view.actions[1], disabled: false }))
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
  { id: 'furnace', icon: Flame, early: 236, late: 178 },
  { id: 'depot', icon: Warehouse, early: 118, late: 318 },
  { id: 'press', icon: Stamp, early: 228, late: 250 },
  { id: 'spare', icon: Stamp, early: 228, late: 250 },
  { id: 'lathe', icon: Cog, early: 186, late: 208 },
  { id: 'bench', icon: Hammer, early: 206, late: 228 },
  { id: 'drone-1', icon: Truck, early: 138, late: 138 },
  { id: 'drone-2', icon: Truck, early: 142, late: 142 },
  { id: 'Vein A', icon: Mountain, early: 78, late: 78 },
  { id: 'Vein B', icon: Mountain, early: 78, late: 78 },
  { id: 'Vein C', icon: Mountain, early: 78, late: 78 },
  { id: 'Vein D', icon: Mountain, early: 78, late: 78 },
]

for (const era of ['early', 'late'] as const) {
  const world = fittedWorld(era)
  test(`${era} fit cases include every Machines row`, () => {
    expect(cases.map(c => c.id).sort()).toEqual(machineList(world).map(machine => machine.id).sort())
  })

  test.each(cases)(`${era} $id preserves every inspection row and fits in 464px`, sample => {
    const view = inspectMachine(world, kettlewick, sample.id)!
    const sheet = machineSheet(view)
    expect(sheet.icon).toBe(sample.icon)
    expect([sheet.name, sheet.description]).toEqual([view.name, view.description])
    const sections = sheet.columns.flat()
    for (const section of sections) expect(section.rows.length).toBeGreaterThan(0)
    const rows = (title: string) => sections.find(section => section.title === title)?.rows ?? []
    const lines = rows('State').flatMap(row => {
      if (row.kind === 'fact') return [{ label: row.label, value: row.value }]
      if (row.kind === 'meter') {
        expect(row.text).toBe(`${row.value}/${row.max}`)
        return [{ label: row.label, value: row.text }]
      }
      return []
    })
    expect(lines).toHaveLength(view.lines.length)
    expect(lines).toEqual(expect.arrayContaining(view.lines))
    const meters = rows('State').flatMap(row => row.kind === 'meter' ? [row.label] : [])
    expect(meters).toEqual(view.lines.filter(line => /^\d+\/\d+$/.test(line.value)).map(line => line.label))
    const progress = rows('State').filter(row => row.kind === 'progress')
    expect(progress).toMatchObject(view.progress ? [{
      label: view.progress.label, value: view.progress.pct, max: 100, text: `${Math.round(view.progress.pct)}%`,
    }] : [])

    const recipes = rows('Recipes').map(row => row.kind === 'recipe' && row.recipe)
    expect(recipes).toEqual(view.recipes.filter(recipe => !recipe.locked))
    const locked = rows('Locked')
    expect(locked.flatMap(row => row.kind === 'recipe' ? [row.recipe] : [])).toEqual(view.recipes.filter(recipe => recipe.locked))
    const lockedActions = view.actions.filter(action => !action.enabled && action.reason?.startsWith('Unlocks'))
    expect(locked.flatMap(row => row.kind === 'api' ? [row.action] : [])).toEqual(lockedActions)
    expect(rows('Code API').map(row => row.kind === 'api' && row.action)).toEqual(view.actions.filter(action => !lockedActions.includes(action)))
    for (const row of [...rows('Code API'), ...locked]) {
      if (row.kind === 'api') {
        expect(row.disabled).toBe(!row.action.enabled)
        expect(view.actions).toContain(row.action)
      }
    }
    const height = sheetHeight(sheet, 2)
    expect(height).toBe(sample[era])
    expect(height).toBeLessThanOrEqual(fitBudget)
  })
}

test('one column stacks both sides with one gap between sections', () => {
  const view = inspectMachine(createWorld(kettlewick), kettlewick, 'furnace')!
  expect(sheetHeight(machineSheet(view), 1)).toBe(352)
  const empty = machineSheet({ ...view, lines: [], recipes: [], actions: [] })
  expect(empty.columns).toEqual([])
  expect(sheetHeight(empty, 1)).toBe(0)
  expect(sheetHeight(empty, 2)).toBe(0)
})
