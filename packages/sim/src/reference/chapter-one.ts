import type { ProjectFiles } from '../model'

/** Successive edits to the same player project, used by the chapter and browser playthroughs. */
export function chapterFiles(beat: number): ProjectFiles {
  const lines: string[] = []
  const files: ProjectFiles = {}
  if (beat >= 3) lines.push('ctx.build("press")')
  if (beat < 4) lines.push('ctx.connect("mine", "furnace")')
  else
    lines.push(
      'ctx.build("splitter")',
      'ctx.build("furnace", { name: "copper", recipe: "copper-ingot" })',
      'ctx.connect("mine", "splitter")',
      'ctx.connect("splitter", "furnace")',
      'ctx.connect("splitter", "copper")',
      'const ore = ctx.peek("splitter")?.kind',
      'ctx.route("splitter", ore === "copper-ore" ? "copper" : "furnace")',
      'ctx.clear("furnace")',
      'ctx.work("copper", "copper-ingot")',
      beat < 5 ? 'ctx.connect("copper", "cart")' : 'ctx.connect("copper", "wire")',
    )
  lines.push(
    'if (ctx.space("mine")) ctx.dig("mine")',
    'ctx.work("furnace")',
    beat >= 3 ? 'ctx.connect("furnace", "press")' : 'ctx.connect("furnace", "cart")',
  )
  if (beat >= 3)
    lines.push(
      'if (ctx.stock("press", "iron-ingot")) ctx.work("press", "plate")',
      beat < 7 ? 'ctx.connect("press", "cart")' : 'ctx.connect("press", "plates")',
    )
  if (beat >= 5) lines.unshift('ctx.build("cutter", { name: "wire" })')
  if (beat >= 5)
    lines.push(
      'ctx.work("wire", "wire")',
      beat < 9 ? 'ctx.connect("wire", "cart")' : 'ctx.connect("wire", "coils")',
    )
  if (beat >= 6)
    lines.push(
      'for (const id of ctx.machines("furnace")) {',
      '  if (ctx.inspect(id)?.status === "broken" && ctx.repair(id)) memory.repairs = Number(memory.repairs ?? 0) + 1',
      '}',
    )
  if (beat >= 7) {
    lines.unshift('ctx.build("splitter", {name: "plates"})', 'ctx.build("cutter", {name: "gears"})')
    lines.push(
      'ctx.connect("plates", "gears")',
      'ctx.connect("plates", "cart")',
      'ctx.connect("gears", "cart")',
      'ctx.work("gears", "gear")',
    )
    if (beat === 7) lines.push('ctx.route("plates", "gears")')
    if (beat === 8)
      lines.push(
        'const first = ctx.orders().sort((a,b) => a.due-b.due).find(o => o.who === "wen" || o.who === "elsie")',
        'ctx.route("plates", first?.who === "elsie" ? "cart" : "gears")',
      )
    if (beat >= 9) {
      lines.unshift('ctx.build("assembler")', 'ctx.build("splitter", {name:"coils"})')
      lines.push(
        'ctx.connect("coils", "assembler")',
        'ctx.connect("coils", "cart")',
        'if (ctx.stock("assembler", "wire") >= 2 || !ctx.route("coils", "assembler")) ctx.route("coils", "cart")',
      )
      lines.push(
        'ctx.connect("plates", "assembler")',
        'if (ctx.stock("assembler", "plate") >= 2 || !ctx.route("plates", "assembler")) ctx.route("plates", "cart")',
        'assemble(ctx)',
      )
      files['jobs.ts'] =
        'import type { Factory } from "inherit"\nexport function assemble(ctx: Factory) {\n  ctx.connect("assembler", "cart")\n  ctx.work("assembler", "bracket")\n}\n'
    }
  }
  files['main.ts'] =
    'import type { Factory } from "inherit"\n' +
    (beat >= 9 ? 'import { assemble } from "./jobs"\n' : '') +
    '\nexport function onTick(ctx: Factory) {\n' +
    lines.map((line) => '  ' + line).join('\n') +
    '\n}\n'
  return files
}
