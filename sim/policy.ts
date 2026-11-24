import { readFileSync } from 'node:fs'
import type { createSession } from '../packages/sandbox/src/v8'
import { kettlewick } from '../packages/sim/src/v8'

export type Session = Awaited<ReturnType<typeof createSession>>
export type Stage = 'manual' | 'run' | 'survey' | 'steel-loop' | 'grates' | 'two-drones' | 'press-line' | 'dies' | 'gears' | 'hinges' | 'shutters' | 'kits'
const source = (name: string) => readFileSync(new URL(`./players/${name}.ts`, import.meta.url), 'utf8')
const helpers = { 'lib/haul.ts': source('haul') }
const mill = { ...helpers, 'lib/mill.ts': source('mill') }
export const players: Record<Stage, Record<string, string>> = {
  manual: kettlewick.files,
  run: { 'main.ts': source('run') },
  survey: { 'main.ts': source('survey') },
  'steel-loop': { 'main.ts': source('steel-loop'), ...helpers },
  grates: { 'main.ts': source('grates'), ...helpers },
  'two-drones': { 'main.ts': source('two-drones'), ...helpers },
  // One cart on the press. Typechecked, and not a proposed edit.
  'press-line': { 'main.ts': source('press-line') },
  dies: { 'main.ts': source('dies'), ...mill },
  gears: { 'main.ts': source('gears'), ...mill },
  hinges: { 'main.ts': source('hinges'), ...mill },
  shutters: { 'main.ts': source('shutters'), ...mill },
  kits: { 'main.ts': source('kits'), ...mill },
}

// Unlisted quests keep the deployed files. A proposed edit is tried only
// when a replay of the previous program fails the new quest.
export const edits: Record<string, { to: Stage; reason: string; practice?: boolean } | undefined> = {
  bram: { to: 'run', reason: 'smeltOnce starts the batch. Buttons may fill the hopper and haul.' },
  ines: { to: 'survey', reason: 'Mine vein D and unload that ore at the depot.' },
  odile: { to: 'steel-loop', reason: 'Loop fetches coal and alloys steel.' },
  elsie: { to: 'grates', reason: 'Each cart hauls steel to the press or a grate to the depot.' },
  harrow: { to: 'dies', reason: 'The order names a plate and a blank, so the press die has to change.' },
  tomas: { to: 'gears', reason: 'A blank is cut into a gear on the lathe.' },
  pell: { to: 'hinges', reason: 'A hinge joins a plate from the press with a pin from the lathe.' },
  wen: { to: 'shutters', reason: 'A plate goes to the lathe, and the cut plate comes back to the press.' },
  crew: { to: 'kits', reason: 'Pack the winch crate, then the lamp crate.' },
}

export function act(session: Session, stage: Stage) {
  const { world } = session
  if (stage === 'survey') {
    const cart = world.drones[0]
    if (!cart || cart.task) return
    session.queue(cart.cargo ? 'bringHome' : 'mineVein')
    return
  }
  if (stage !== 'manual' && stage !== 'run') return
  const { furnace } = world
  if (furnace.readyAt === null && furnace.input >= kettlewick.recipe.ore && !furnace.output) {
    if (stage === 'run') session.queue('smeltOnce')
    else session.press('smelt')
  }
  const cart = world.drones[0]
  if (cart.task) return
  if (cart.cargo) session.press('unload', cart.name)
  else if (furnace.output) session.press('collect', cart.name)
  else if (furnace.readyAt === null && furnace.input < kettlewick.recipe.ore) session.press('mine', cart.name)
}

// The reference run saves. Affordability is the unspent purse at the planned
// hand-over, so this playthrough does not buy.
export function buyForGoal(_session: Session): { id: string; name: string; price: number } | undefined {
  return undefined
}
