export const controller = (body: string, beforeTick = '') =>
  `import type { Factory } from "inherit"
${beforeTick}
export function onTick(ctx: Factory) {
${body}
}`

const digAndSmelt = `  ctx.dig("mine")
  ctx.work("furnace-a")`
const routeToShorterQueue = `  const a = ctx.stock("furnace-a")
  const b = ctx.stock("furnace-b")
  ctx.route("splitter", a <= b ? "furnace-a" : "furnace-b")`
export const solutions = [
  controller(digAndSmelt),
  controller(`  ctx.dig("mine")
${routeToShorterQueue}
  ctx.work("furnace-a")
  ctx.work("furnace-b")`),
  controller(`${digAndSmelt}
  ctx.dig("coal-mine")
  ctx.work("press")`),
  controller(`  if (ctx.space("mine")) ctx.dig("mine")
  ctx.work("furnace-a")`),
  controller(
    `  if (ctx.space("mine")) ctx.dig("mine")
${routeToShorterQueue}
  ctx.work("furnace-a")
  ctx.work("furnace-b")
  if (sacks < 12 && ctx.space("coal-mine") && ctx.dig("coal-mine")) sacks++
  ctx.work("press")`,
    'let sacks = 0',
  ),
]
