import { parser } from '@lezer/javascript'
import type { LessonStep } from '@inherit/sim'

const typescript = parser.configure({ dialect: 'ts' })

/** Only mark calls that the player still needs to move inside a function. */
export function standaloneJobCalls(source: string, targets: NonNullable<LessonStep['callsToMove']>) {
  const calls: { from: number; to: number }[] = []
  for (const statement of typescript.parse(source).topNode.getChildren('ExpressionStatement')) {
    const call = statement.firstChild
    if (call?.name !== 'CallExpression') continue
    const match = /^(\w+)\s*\(\s*(?:(["'])(\w+)\2\s*)?\)$/.exec(source.slice(call.from, call.to))
    if (match && targets.some(target => target.name === match[1] && target.place === match[3]))
      calls.push({ from: call.from, to: call.to })
  }
  return calls
}
