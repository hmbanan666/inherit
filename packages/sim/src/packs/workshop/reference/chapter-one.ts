import { lessons, starter } from '../chapter'
import type { LessonStep } from '../lesson-flow'
import type { ProjectFiles } from '../model'

const indent = (source: string, spaces = 2) =>
  source
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n')

/** Carry out the card's edit using its actual third hint. All other player lines survive. */
export function applyChapterHint(files: ProjectFiles, step: LessonStep): ProjectFiles {
  const next = { ...files }
  const file = step.id === 'bridge-fit' || step.id === 'bridge-span' ? 'tools.ts' : 'main.ts'
  let source = next[file]
  const lines = step.hints[2]
  const [first, second] = lines.split('\n\n')
  function replace(before: string | RegExp, after: string) {
    if (typeof before === 'string' ? !source.includes(before) : !before.test(source))
      throw new Error('Missing edit location for ' + step.id)
    source = source.replace(before, () => after)
  }
  function inFunction(name: string, code: string, first = false) {
    const start = source.indexOf('function ' + name + '(')
    const point = first ? source.indexOf('\n', start) : source.indexOf('\n}', start)
    if (start < 0 || point < 0) throw new Error('Missing function ' + name)
    source = source.slice(0, point) + '\n' + indent(code) + source.slice(point)
  }
  const importLine = /^import .* from "inherit"$/m
  const buy = (code: string) =>
    replace(/^(?:buy\([^\n]+\n)+/m, source.match(/^(?:buy\([^\n]+\n)+/m)![0] + code + '\n')
  switch (step.id) {
    case 'bram-take':
    case 'bram-feed':
    case 'bram-cart':
      source += lines + '\n'
      break
    case 'bram-smelt':
      replace('take("mine")\nput("furnace")', lines)
      break
    case 'bram-ship':
      replace('take("furnace")\nput("cart")', lines)
      break
    case 'bram-loop':
      replace(/^smelt\(\)\n/m, '')
      replace(/^ship\(\)$/m, lines)
      break
    case 'elsie-press':
      replace(importLine, lines)
      break
    case 'elsie-stamp':
      replace(/function ship\(\) \{[^}]+\}/, first)
      replace('  ship()', indent(second))
      break
    case 'elsie-load':
      inFunction('stamp', lines)
      break
    case 'elsie-grate':
      replace('  take("press")\n  put("cart")\n', '')
      replace('export function onTick', first + '\n\nexport function onTick')
      inFunction('onTick', second)
      break
    case 'vein-sample':
      replace('  take("mine")', indent(lines))
      break
    case 'vein-furnace':
    case 'tomas-cutter':
    case 'wen-cutter':
    case 'bridge-jig':
      buy(lines)
      break
    case 'vein-sort':
      replace('  console.log(rock)\n  put("furnace")', indent(lines))
      break
    case 'vein-clear':
      buy(lines)
      break
    case 'heat-inspect':
      replace(importLine, first)
      inFunction('smelt', second, true)
      break
    case 'heat-restart':
      replace(importLine, first)
      replace(indent('const status = look("furnace").status\nconsole.log(status)'), indent(second))
      break
    case 'tomas-lamps':
      replace('  take("copper")\n  put("cutter")\n', '')
      replace('function ship', first + '\n\nfunction ship')
      replace('  ship()', indent(second) + '\n  ship()')
      break
    case 'heat-crew':
      replace(/  for \(const oven[^}]+\}\n/, '')
      replace('function smelt', first + '\n\nfunction smelt')
      inFunction('onTick', second, true)
      break
    case 'tomas-draw':
      inFunction('stamp', lines)
      break
    case 'tomas-collect':
    case 'wen-wheel':
    case 'bridge-span':
      inFunction('ship', lines)
      break
    case 'heat-rounds':
      replace('  if (look("furnace").status === "broken") repair("furnace")', indent(lines))
      break
    case 'wen-move':
      replace('function stamp', first + '\n\nfunction stamp')
      replace('  take("furnace")\n  put("press")', indent(second))
      break
    case 'wen-gears':
      replace('  take("press")\n  put("cart")', indent(lines))
      break
    case 'orders-share':
      replace('  move("press", "gears")', indent(lines))
      break
    case 'mayor-tools': {
      const helpers = /^function [^\n]+\n[\s\S]*?^\}/gm
      const functions = source.match(helpers)!
      const [kit, exports] = first.split('\n')
      next['tools.ts'] = [kit, ...functions, exports, ''].join('\n\n')
      source = source.replace(helpers, '').replace(/\n{3,}/g, '\n\n')
      replace(importLine, source.match(importLine)![0] + '\n' + second)
      break
    }
    case 'bridge-fit':
      inFunction('ship', lines, true)
      break
  }
  next[file] = source
  return next
}

export function chapterFiles(beat: number, through?: string) {
  let files: ProjectFiles = { 'main.ts': starter }
  for (const step of lessons) {
    if (step.beat > beat) break
    files = applyChapterHint(files, step)
    if (step.id === through) break
  }
  return files
}
