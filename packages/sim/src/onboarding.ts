import type { MaterialId } from './campaign-api'
import type { Campaign } from './model'

export interface BenchCase {
  from: string
  item: MaterialId
  to?: string
  args?: string[]
  jam?: boolean
  broken?: boolean
  wants?: MaterialId
}
export interface Lesson {
  id: string
  beat: number
  file: string
  name: string
  signature: string
  reuse?: string
  title: string
  instruction: string
  idea: string
  bricks: string[]
  exact: string
  stub: string
  cases: BenchCase[]
}
const imp = (names: string, module = 'inherit') => 'import { ' + names + ' } from "' + module + '"'
const own = (name: string) => imp(name, './' + name)
function verb(
  beat: number,
  id: string,
  signature: string,
  title: string,
  idea: string,
  imports: string[],
  body: string[],
  cases: BenchCase[],
  reuse?: string,
): Lesson {
  const name = signature.split('(')[0]
  const header = 'export function ' + signature
  const instruction =
    id === 'dig'
      ? 'Take a rock from the mine and return it so another function can use it.'
      : id === 'smelt'
        ? 'Give the rock from your dig function to the furnace.'
        : 'The bench tries your function as you type.'
  return {
    beat,
    id,
    name,
    signature,
    title,
    instruction,
    reuse,
    idea,
    bricks: [...imports, body.find((line) => line.includes('('))?.trim() ?? body[0]],
    file: 'verbs/' + name + '.ts',
    stub: '// ' + title + '\n' + header + ' {\n}\n',
    exact: [...imports, '', header + ' {', ...body.map((line) => '  ' + line), '}', ''].join('\n'),
    cases,
  }
}
const transfer = (from: string, item: MaterialId, to: string) => ({ from, item, to })
const haul = (from: string, to: string, variable: string) => [
  'const ' + variable + ' = take("' + from + '")',
  'put("' + to + '", ' + variable + ')',
]
const raw = [imp('take, put')]
const iron = transfer('mine', 'iron-ore', 'furnace')
const copper = transfer('mine', 'copper-ore', 'copper')
const press = transfer('furnace', 'iron-ingot', 'press')
const toCart = (from: string, item: MaterialId) => transfer(from, item, 'cart')
const route = [
  'const next = look("mine").ready',
  'const ore = dig()',
  'if (next === "copper-ore") put("copper", ore)',
  'else put("furnace", ore)',
]
function wiring(beat: number, names: string[], purchases: string[], title: string, idea: string): Lesson {
  const imports = [...(purchases.length ? [imp('buy')] : []), ...names.map((n) => imp(n, './verbs/' + n))]
  const body = [...purchases, ...names.map((n) => n + '()'), ...(beat === 1 ? ['console.log("tick")'] : [])]
  return {
    beat,
    id: 'wire-' + beat,
    name: 'onTick',
    signature: 'onTick()',
    file: 'main.ts',
    stub: '',
    title,
    idea,
    instruction: 'You named these verbs. Call them from onTick() and deploy to run them every tick.',
    bricks: [...purchases, ...names.map((n) => n + '()')],
    cases: [],
    exact: [...imports, '', 'export function onTick() {', ...body.map((s) => '  ' + s), '}', ''].join('\n'),
  }
}
const buys = [
  'buy("press")',
  'buy("furnace", "copper")',
  'buy("cutter")',
  'buy("cutter", "gears")',
  'buy("assembler")',
]
export const lessons: Lesson[] = [
  verb(
    1,
    'dig',
    'dig()',
    'Pick up a rock for Bram',
    'Import take from the workshop. Save the rock in a variable and return it to the caller.',
    [imp('take')],
    ['const rock = take("mine")', 'return rock'],
    [{ from: 'mine', item: 'iron-ore' }],
  ),
  verb(
    1,
    'smelt',
    'smelt()',
    'Feed the furnace for Bram',
    'Import your dig from the file beside this one. Give its rock to the furnace, which smelts on its own.',
    [own('dig'), imp('put')],
    ['const ore = dig()', 'put("furnace", ore)'],
    [iron],
  ),
  verb(
    1,
    'ship',
    'ship()',
    'Load an ingot into Bram’s cart',
    'Take the finished ingot from the furnace. Put that same ingot in the cart.',
    raw,
    haul('furnace', 'cart', 'ingot'),
    [toCart('furnace', 'iron-ingot')],
  ),
  wiring(
    1,
    ['smelt', 'ship'],
    [],
    'Wire up Bram’s delivery',
    'Import your two verbs. Export onTick so the factory can call it every tick, print a message, then Deploy to run your draft.',
  ),
  verb(
    3,
    'stamp',
    'stamp()',
    'Feed the press for Elsie',
    'Move an iron ingot to the press. The die flattens it into a plate.',
    raw,
    haul('furnace', 'press', 'ingot'),
    [press],
  ),
  verb(
    3,
    'ship-plates',
    'ship()',
    'Change ship to collect plates',
    'Keep your ship function. Change its source to the press so Elsie gets plates.',
    raw,
    haul('press', 'cart', 'plate'),
    [toCart('press', 'plate')],
  ),
  wiring(
    3,
    ['smelt', 'stamp', 'ship'],
    buys.slice(0, 1),
    'Wire up the oven grate',
    'Buy Bram’s press once by name and call stamp between smelt and ship. Deploy your edits.',
  ),
  verb(
    4,
    'sort',
    'smelt()',
    'Sort the mixed vein',
    'Look at the ready rock before digging. Branch on its name so the two ores have separate furnaces.',
    [own('dig'), imp('put, look')],
    route,
    [iron, copper],
  ),
  verb(
    4,
    'unjam',
    'unjam()',
    'Rescue the stray copper',
    'When the iron furnace is jammed, take the stray ore out and give it to copper.',
    [imp('look, take, put')],
    [
      'if (look("furnace").status === "jammed") {',
      '  const ore = take("furnace")',
      '  put("copper", ore)',
      '}',
    ],
    [{ ...transfer('furnace', 'copper-ore', 'copper'), jam: true }],
  ),
  wiring(
    4,
    ['unjam', 'smelt', 'stamp', 'ship'],
    buys.slice(0, 2),
    'Wire up the second furnace',
    'Buy the furnace named copper. Deploy your sorting and recovery code.',
  ),
  verb(
    5,
    'cutWire',
    'cutWire()',
    'Draw wire for Tomas',
    'Feed a copper ingot to the cutter. It draws the metal into wire.',
    raw,
    haul('copper', 'cutter', 'ingot'),
    [transfer('copper', 'copper-ingot', 'cutter')],
  ),
  verb(
    5,
    'ship-wire',
    'ship()',
    'Send Tomas the finished wire',
    'Keep shipping the press’s plates so iron keeps moving. Add a second pickup for the cutter’s wire.',
    raw,
    [...haul('press', 'cart', 'plate'), ...haul('cutter', 'cart', 'wire')],
    [toCart('press', 'plate'), toCart('cutter', 'wire')],
  ),
  wiring(
    5,
    ['unjam', 'smelt', 'stamp', 'cutWire', 'ship'],
    buys.slice(0, 3),
    'Wire up Lamp Street',
    'Buy the cutter. Call your wire and shipping verbs each tick and deploy.',
  ),
  verb(
    6,
    'fixBroken',
    'fixBroken()',
    'Restart the worn furnaces',
    'Loop over your two furnace names. Read each status and repair a broken furnace.',
    [imp('look, repair')],
    ['for (const m of ["furnace", "copper"]) {', '  if (look(m).status === "broken") repair(m)', '}'],
    ['furnace', 'copper'].map((from) => ({ from, item: 'iron-ore', broken: true })),
  ),
  wiring(
    6,
    ['fixBroken', 'unjam', 'smelt', 'stamp', 'cutWire', 'ship'],
    buys.slice(0, 3),
    'Wire up repairs',
    'Import fixBroken and call it every tick. Deploy to restart the hot furnace.',
  ),
  verb(
    7,
    'move',
    'move(from: string, to: string)',
    'Carry an item between two places',
    'Use the parameter names as the pickup point and destination.',
    raw,
    ['const item = take(from)', 'put(to, item)'],
    [iron, press].map((c) => ({ ...c, args: [c.from, c.to] })),
  ),
  verb(
    7,
    'move-smelt',
    'smelt()',
    'Use move in your sorting function',
    'Choose the destination before moving the rock.',
    [own('move'), imp('look')],
    [
      'const next = look("mine").ready',
      'if (next === "copper-ore") move("mine", "copper")',
      'else move("mine", "furnace")',
    ],
    [iron, copper],
    'move',
  ),
  verb(
    7,
    'move-stamp',
    'stamp()',
    'Use move to feed the press',
    'Replace the two repeated lines in stamp with a call to your move.',
    [own('move')],
    ['move("furnace", "press")'],
    [press],
    'move',
  ),
  verb(
    7,
    'gear',
    'cutGear()',
    'Cut gear teeth for Wen',
    'Feed plates to the gear cutter. Its die needs two plates for each gear.',
    [own('move')],
    ['move("press", "gears")'],
    [transfer('press', 'plate', 'gears')],
  ),
  verb(
    7,
    'move-ship',
    'ship()',
    'Collect gears with move',
    'Send gears to Wen and store spare copper ingots in the cart so the mine keeps moving.',
    [own('move')],
    ['move("gears", "cart")', 'move("copper", "cart")'],
    [toCart('gears', 'gear'), toCart('copper', 'copper-ingot')],
    'move',
  ),
  wiring(
    7,
    ['fixBroken', 'unjam', 'smelt', 'stamp', 'cutGear', 'ship'],
    buys.slice(0, 4),
    'Wire up the mill',
    'Buy a cutter named gears and deploy your refactored verbs.',
  ),
  verb(
    8,
    'choose',
    'choose()',
    'Share the press between two regulars',
    'Read the wanted list. Give Elsie plates while she needs them, then send plates to Wen’s gear cutter.',
    [own('move'), own('cutGear'), imp('look')],
    [
      'const wanted = look("cart").wanted',
      'if (wanted?.includes("plate")) move("press", "cart")',
      'else cutGear()',
    ],
    [
      { ...toCart('press', 'plate'), wants: 'plate' },
      { ...transfer('press', 'plate', 'gears'), wants: 'gear' },
    ],
  ),
  wiring(
    8,
    ['fixBroken', 'unjam', 'smelt', 'stamp', 'choose', 'ship'],
    buys.slice(0, 4),
    'Wire up the two orders',
    'Have choose direct the plates and ship collect the gears. Deploy to fill both orders.',
  ),
  verb(
    9,
    'assemble',
    'assemble()',
    'Fit brackets for the bridge',
    'Look inside the assembler. Use your move to supply each missing ingredient and leave the extras for ship.',
    [own('move'), imp('look')],
    [
      'const inside = look("assembler").inside',
      'if (!inside.includes("plate")) move("press", "assembler")',
      'if (!inside.includes("wire")) move("cutter", "assembler")',
    ],
    [transfer('press', 'plate', 'assembler'), transfer('cutter', 'wire', 'assembler')],
  ),
  verb(
    9,
    'ship-brackets',
    'ship()',
    'Send brackets to Riverside',
    'Ship each bracket. After assemble takes what fits, store spare plates and wire in the cart.',
    [own('move')],
    ['move("assembler", "cart")', 'move("press", "cart")', 'move("cutter", "cart")'],
    [toCart('assembler', 'bracket'), toCart('press', 'plate'), toCart('cutter', 'wire')],
  ),
  wiring(
    9,
    ['fixBroken', 'unjam', 'smelt', 'stamp', 'cutWire', 'assemble', 'ship'],
    buys,
    'Import your bridge crew',
    'Import your library’s assemble and cutWire. Buy the assembler and deploy to supply six brackets.',
  ),
]
export function currentLesson(c: Campaign) {
  return lessons.find((l) => l.beat === c.town.beat && !c.town.solved.includes(l.id))
}
export function libraryVerbs(c: Campaign) {
  return [
    ...new Map(
      lessons.filter((l) => l.cases.length && c.town.solved.includes(l.id)).map((l) => [l.file, l]),
    ).values(),
  ]
}

export function bankLesson(c: Campaign) {
  if (c.town.beat === 2) return {
    title:'Read the family tab',
    idea:'Mrs Harrow can wait while your factory buys the press.',
    exact:'Choose Pay later to acknowledge her letter and open Elsie’s request.',
  }
  if (c.town.beat === 10) return {
    title:'Settle the family tab',
    idea:'The bridge crew has paid. Use the workshop coins to settle what remains of Uncle’s debt.',
    exact:'Open Pay debt in the top bar. Choose Pay balance, or make the remaining installment payments.',
  }
}
export function storyLetter(c: Campaign) {
  const id = ({4:'vein',6:'heat',8:'competition',11:'slow'} as Record<number,string>)[c.town.beat]
  return c.progress.messages.find(message => message.id === id)
}
