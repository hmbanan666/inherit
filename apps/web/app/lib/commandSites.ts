import ts from 'typescript'
import type { GameFactory, ProjectFiles } from '@inherit/sim'
import type { CallSite } from './gameProtocol'

const commands = ['take', 'put', 'look', 'repair', 'buy'] as const
type Command = (typeof commands)[number]
interface Candidate extends CallSite {
  op: Command
  target?: string
  start: number
  end: number
}
const marker = '\u0000inherit.call/'

function collect(files: ProjectFiles) {
  const candidates: Candidate[] = []
  for (const [file, source] of Object.entries(files)) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    function visit(node: ts.Node, fn: string) {
      if (ts.isFunctionLike(node)) {
        fn =
          node.name?.getText(tree) ??
          (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(tree) : '(callback)')
      }
      if (ts.isCallExpression(node)) {
        const member = node.expression
        const key = ts.isIdentifier(member) ? member : undefined
        const op = key?.text as Command
        const first = node.arguments[0]
        const tag = node.arguments.at(-1)
        if (key && tag && commands.includes(op) && !ts.isSpreadElement(tag)) {
          candidates.push({
            op,
            file,
            fn,
            line: tree.getLineAndCharacterOfPosition(key.getStart(tree)).line + 1,
            target: first && ts.isStringLiteralLike(first) ? first.text : undefined,
            start: tag.getStart(tree),
            end: tag.end,
          })
        }
      }
      ts.forEachChild(node, (child) => visit(child, fn))
    }
    visit(tree, '(module)')
  }
  return candidates
}

// The bridge sees real machine IDs after argument evaluation. For ambiguous direct calls,
// tag the last argument inside QuickJS. This preserves its value, evaluation order, receiver,
// and source line. No extra factory operation is charged and drafts/revisions stay verbatim.
export function commandSites(files: ProjectFiles) {
  const candidates = collect(files)
  const tagged = new Map<number, Candidate>()
  const edits = new Map<string, { pos: number; text: string }[]>()
  const totals = new Map<Command, number>()
  const targets = new Map<string, number>()
  const targetKey = (c: Candidate) => JSON.stringify([c.op, c.target])
  for (const c of candidates) {
    totals.set(c.op, (totals.get(c.op) ?? 0) + 1)
    targets.set(targetKey(c), (targets.get(targetKey(c)) ?? 0) + 1)
  }
  candidates.forEach((c, i) => {
    const possible =
      c.target === undefined
        ? totals.get(c.op)!
        : targets.get(targetKey(c))! + (targets.get(JSON.stringify([c.op, null])) ?? 0)
    if (possible === 1) return
    const list = edits.get(c.file) ?? []
    list.push(
      { pos: c.start, text: '((v)=>(globalThis.console.log(' + JSON.stringify(marker + i) + '),v))(' },
      { pos: c.end, text: ')' },
    )
    edits.set(c.file, list)
    tagged.set(i, c)
  })
  let compiledFiles = { ...files }
  for (const [file, list] of edits) {
    let source = files[file]!
    for (const edit of list.sort((a, b) => b.pos - a.pos))
      source = source.slice(0, edit.pos) + edit.text + source.slice(edit.pos)
    compiledFiles[file] = source
  }
  // A project at the sandbox size limit must still deploy.
  const sizes = Object.values(compiledFiles).map((s) => s.length)
  if (sizes.some((n) => n > 64000) || sizes.reduce((a, b) => a + b, 0) > 256000) {
    compiledFiles = files
    tagged.clear()
  }

  const traces: Record<string, CallSite[]> = Object.create(null)
  const output: string[] = []
  function consume(lines: string[]) {
    let site: Candidate | undefined
    for (const line of lines) {
      if (line.startsWith(marker) && tagged.has(Number(line.slice(marker.length))))
        site = tagged.get(Number(line.slice(marker.length)))
      else {
        output.push(line)
        if (output.length > 64) output.shift()
      }
    }
    return site
  }
  function wrap(ctx: GameFactory, drain: () => string[], machines: Set<string>): GameFactory {
    const traced = { ...ctx }
    for (const op of commands) {
      const method = ctx[op]
      if (!method) continue
      Object.assign(traced, {
        [op]: (id: string, ...args: unknown[]) => {
          const tag = consume(drain())
          const matches =
            tag?.op === op
              ? [tag]
              : candidates.filter((c) => c.op === op && (c.target === undefined || c.target === id))
          const result: unknown = Reflect.apply(method, ctx, [id, ...args])
          if (matches.length !== 1) return result
          const { file, line, fn } = matches[0]!
          const targets = [op === 'buy' ? args[0] ?? id : id]
          for (const target of targets) {
            if (typeof target !== 'string') continue
            if (op === 'buy') machines.add(target)
            if (!machines.has(target)) continue
            const sites = (traces[target] ??= [])
            if (!sites.some((s) => s.file === file && s.line === line && s.fn === fn))
              sites.push({ file, line, fn })
          }
          return result
        },
      })
    }
    return traced
  }
  function drainLogs(lines: string[]) {
    consume(lines)
    return output.splice(0)
  }
  return { compiledFiles, wrap, traces, drainLogs }
}
