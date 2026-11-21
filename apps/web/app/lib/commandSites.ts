import ts from 'typescript'
import type { GameFactory, ProjectFiles } from '@inherit/sim'
import type { CallSite } from './gameProtocol'

const operations = ['dig', 'work', 'route', 'dispatch'] as const
type Operation = typeof operations[number]
interface Candidate extends CallSite { op: string; target?: string }

// Match calls observed at the typed factory bridge to the deployed source, including helpers.
// If two source locations could explain the same call, leave its location unknown.
export function commandSites(files: ProjectFiles) {
  const candidates: Candidate[] = []
  for (const [file, source] of Object.entries(files)) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    function visit(node: ts.Node, fn: string) {
      if (ts.isFunctionLike(node)) {
        fn = node.name?.getText(tree) ?? (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(tree) : '(callback)')
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const op = node.expression.name.text
        const arg = node.arguments[0]
        if (arg && operations.includes(op as Operation)) {
          const line = tree.getLineAndCharacterOfPosition(node.expression.name.getStart(tree)).line + 1
          candidates.push({ op, file, line, fn, target: ts.isStringLiteralLike(arg) ? arg.text : undefined })
        }
      }
      ts.forEachChild(node, (child) => visit(child, fn))
    }
    visit(tree, '(module)')
  }
  const traces: Record<string, CallSite[]> = Object.create(null)
  function wrap(ctx: GameFactory): GameFactory {
    const traced = { ...ctx }
    for (const op of operations) {
      const method = ctx[op]
      if (!method) continue
      Object.assign(traced, { [op]: (id: string, ...args: unknown[]) => {
        const matches = candidates.filter(c => c.op === op && (c.target === undefined || c.target === id))
        if (matches.length === 1) {
          const {file, line, fn} = matches[0]!
          const sites = traces[id] ??= []
          if (!sites.some(s => s.file === file && s.line === line)) sites.push({file, line, fn})
        }
        return Reflect.apply(method, ctx, [id, ...args])
      } })
    }
    return traced
  }
  return { wrap, traces }
}
