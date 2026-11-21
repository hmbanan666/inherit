import type { ProjectFiles } from '../model'
import { OBJECTIVES } from '../objectives'
export * from './actions'

const ids = OBJECTIVES.map((o) => o.id)
const factoryImport = 'import type { Factory } from "inherit"'
const fork = ['ctx.route("splitter", "furnace-a")', 'ctx.route("splitter", "furnace-b")']

/** Plain player TypeScript. Each stage keeps the previous program and changes the affected station. */
export function referenceFiles(objectiveId: string): ProjectFiles {
  const index = ids.indexOf(objectiveId)
  if (index < 0) throw new Error('Unknown objective: ' + objectiveId)
  const at = (id: string) => index >= ids.indexOf(id)
  const files: ProjectFiles = {}
  const header = [factoryImport]
  const body: string[] = []
  const handlers: string[] = []
  if (at('arrival')) header.push('import type { FactoryEvent } from "inherit"')
  if (at('tally') && !at('chalk')) header.push('let rocks = 0')
  if (at('redeploy')) header.push('// The chalk ledger survives this deploy.')
  if (at('helper')) {
    files['lib/feed.ts'] =
      factoryImport + '\n\nexport function feed(ctx: Factory) {\n  ' + fork.join('\n  ') + '\n}\n'
    header.push('import { feed } from "./lib/feed"')
  }
  if (at('contract')) {
    files['lib/jobs.ts'] =
      'import type { Factory, RecipeId } from "inherit"\n\nexport function runJob(ctx: Factory, id: string, recipe: RecipeId) {\n  return ctx.work(id, recipe)\n}\n'
    if (at('recipe-table')) {
      files['lib/jobs.ts'] +=
        '\nexport const jobs: Record<string, RecipeId> = { jig: "bracket", motor: "motor" }\n'
      header.push('import { runJob, jobs } from "./lib/jobs"')
    } else header.push('import { runJob } from "./lib/jobs"')
  }
  if (at('chalk'))
    body.push('if (ctx.space("mine") && ctx.dig("mine")) memory.rocks = Number(memory.rocks ?? 0) + 1')
  else if (at('tally')) body.push('if (ctx.space("mine") && ctx.dig("mine")) rocks++')
  else if (at('belt-space')) body.push('if (ctx.space("mine")) ctx.dig("mine")')
  else body.push('ctx.dig("mine")')
  if (at('sorter')) body.push('ctx.route("sorter", ctx.peek("sorter")?.defect ? "scrap" : "splitter")')
  if (at('scrap') && !at('arrival')) body.push('ctx.work("scrap")')
  if (at('share-ore')) body.push(...(at('helper') ? ['feed(ctx)'] : fork))
  if (at('fire')) body.push('ctx.work("furnace-a")')
  if (at('balance')) body.push('ctx.work("furnace-b")')
  if (at('merge-out')) body.push('ctx.route("merge", "press")')
  if ((at('press-coal') && !at('plate')) || at('local-depot')) {
    body.push(
      at('coal-memory')
        ? 'if (ctx.space("coal-mine") && ctx.dig("coal-mine")) memory.coal = Number(memory.coal ?? 0) + 1'
        : 'if (ctx.space("coal-mine")) ctx.dig("coal-mine")',
    )
  }
  if (at('part')) body.push(at('plate') ? 'ctx.work("press", "plate")' : 'ctx.work("press", "part")')
  if (objectiveId === 'code-furnace')
    body.push(
      'if (!memory.oven) {',
      '  const id = ctx.build("furnace", 10, 2, { recipe: "copper-ingot" })',
      '  if (id) memory.oven = id',
      '}',
    )
  if (objectiveId === 'code-belt')
    body.push(
      'if (typeof memory.oven === "string" && !memory.wired) memory.wired = ctx.connect("copper", memory.oven)',
    )
  if (at('copper-ore')) body.push('if (ctx.space("copper")) ctx.dig("copper")')
  if (objectiveId === 'copper-bar')
    body.push(
      'if (typeof memory.oven === "string" && !memory.outlet) memory.outlet = ctx.connect(memory.oven, "dock")',
    )
  if (at('copper-bar')) body.push('if (typeof memory.oven === "string") ctx.work(memory.oven, "copper-ingot")')
  if (at('wire')) body.push('ctx.work("draw", "wire")')
  if (at('gear')) body.push('ctx.work("teeth", "gear")')
  if (at('jig'))
    body.push(
      at('recipe-table')
        ? 'runJob(ctx, "jig", jobs.jig)'
        : at('contract')
          ? 'runJob(ctx, "jig", "bracket")'
          : 'ctx.work("jig", "bracket")',
    )
  if (at('release'))
    body.push(at('motor-wire') ? 'ctx.route("buffer", "wire-fork")' : 'ctx.route("buffer", "jig")')
  if (at('arrival'))
    handlers.push(
      'export function onItemArrived(event: FactoryEvent, ctx: Factory) {\n  if (event.machineId === "scrap") ctx.work("scrap")\n}',
    )
  if (at('idle'))
    handlers.push(
      'export function onMachineIdle(event: FactoryEvent, ctx: Factory) {\n  memory.lastIdle = event.machineId\n  if (event.machineId === "scrap") ctx.work("scrap")\n}',
    )
  if (at('manifest')) {
    body.push('if (!memory.sent && ctx.dispatch("truck", "local", "remote", "island-1")) memory.sent = true')
    handlers.push(
      'export function onTruckReturned(event: FactoryEvent, ctx: Factory) {\n  if (event.type === "truckReturned") memory.lastReturn = event.outcome\n}',
    )
    if (at('breakdown'))
      body.push('if (memory.lastReturn === "breakdown") ctx.dispatch("truck", "local", "remote", "island-1")')
    if (at('ack'))
      body.push('if (memory.lastReturn === "lostAck") ctx.dispatch("truck", "local", "remote", "island-1")')
  }
  if (at('motor-bench')) body.push('runJob(ctx, "motor-jig", jobs.motor)')
  if (at('motor-gear'))
    body.push(
      'const plateTarget = ctx.stock("teeth", "plate") < 2 ? "teeth" : "jig"',
      'if (!ctx.route("plate-fork", plateTarget)) ctx.route("plate-fork", plateTarget === "teeth" ? "jig" : "teeth")',
    )
  if (at('motor-wire'))
    body.push(
      'const wireTarget = ctx.stock("motor-jig", "wire") < 2 ? "motor-jig" : "jig"',
      'if (!ctx.route("wire-fork", wireTarget)) ctx.route("wire-fork", wireTarget === "jig" ? "motor-jig" : "jig")',
    )
  files['main.ts'] =
    header.join('\n') +
    '\n\nexport function onTick(ctx: Factory) {\n' +
    body.map((line) => '  ' + line).join('\n') +
    '\n}\n' +
    handlers.map((h) => '\n' + h + '\n').join('')
  return files
}
