import { parser } from '@lezer/javascript'

const typescript = parser.configure({ dialect: 'ts' })

/** Only calls at the top of the file move. Leave comments and calls inside jobs alone. */
export function standaloneJobCalls(source: string) {
  const calls: { from: number; to: number }[] = []
  for (const statement of typescript.parse(source).topNode.getChildren('ExpressionStatement')) {
    const call = statement.firstChild
    if (call?.name === 'CallExpression' && /^(smelt|ship)\s*\(\s*\)$/.test(source.slice(call.from, call.to)))
      calls.push({ from: call.from, to: call.to })
  }
  return calls
}
