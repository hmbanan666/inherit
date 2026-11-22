import type { MachineKind, MaterialId, Recipe, RecipeId } from './campaign-api'

export const MATERIALS: Readonly<Record<MaterialId, { name: string }>> = {
  'iron-ore': { name: 'Iron ore' },
  'copper-ore': { name: 'Copper ore' },
  coal: { name: 'Coal' },
  'iron-ingot': { name: 'Iron ingot' },
  'copper-ingot': { name: 'Copper ingot' },
  plate: { name: 'Plate' },
  gear: { name: 'Gear' },
  wire: { name: 'Wire' },
  bracket: { name: 'Bracket' },
  motor: { name: 'Motor' },
  part: { name: 'Pressed part' },
}
export type { Recipe } from './campaign-api'
export const RECIPES: Readonly<Record<RecipeId, Recipe>> = {
  'iron-ingot': { machine: 'furnace', inputs: { 'iron-ore': 1 }, output: 'iron-ingot', ticks: 1 },
  'copper-ingot': { machine: 'furnace', inputs: { 'copper-ore': 1 }, output: 'copper-ingot', ticks: 2 },
  part: { machine: 'press', inputs: { 'iron-ingot': 1, coal: 1 }, output: 'part', ticks: 5 },
  plate: { machine: 'press', inputs: { 'iron-ingot': 1 }, output: 'plate', ticks: 2 },
  gear: { machine: 'cutter', inputs: { plate: 2 }, output: 'gear', ticks: 3 },
  wire: { machine: 'cutter', inputs: { 'copper-ingot': 1 }, output: 'wire', ticks: 2 },
  bracket: { machine: 'assembler', inputs: { plate: 1, wire: 1 }, output: 'bracket', ticks: 3 },
  motor: { machine: 'assembler', inputs: { gear: 1, wire: 2, bracket: 1 }, output: 'motor', ticks: 6 },
  recycle: { machine: 'scrap', inputs: {}, defectiveInput: true, output: 'iron-ore', ticks: 2 },
}
export interface MachineSpec {
  name: string
  bin: number
  defaultRecipe?: RecipeId
  routes?: true
}
export const MACHINES: Readonly<Record<MachineKind, MachineSpec>> = {
  miner: { name: 'Miner', bin: 0 },
  furnace: { name: 'Furnace', bin: 3, defaultRecipe: 'iron-ingot' },
  press: { name: 'Press', bin: 3, defaultRecipe: 'part' },
  cutter: { name: 'Cutter', bin: 3, defaultRecipe: 'gear' },
  assembler: { name: 'Assembler', bin: 3, defaultRecipe: 'bracket' },
  scrap: { name: 'Recycler', bin: 3, defaultRecipe: 'recycle' },
  splitter: { name: 'Splitter', bin: 3, routes: true },
  merger: { name: 'Merger', bin: 3, routes: true },
  sorter: { name: 'Sorter', bin: 4, routes: true },
  storage: { name: 'Storage', bin: 32, routes: true },
  dock: { name: 'Loading dock', bin: 3 },
  depot: { name: 'Road depot', bin: 12, routes: true },
  truck: { name: 'Truck', bin: 0 },
}
export function machineRecipes(kind: MachineKind): RecipeId[] {
  return (Object.keys(RECIPES) as RecipeId[]).filter((id) => RECIPES[id].machine === kind)
}
