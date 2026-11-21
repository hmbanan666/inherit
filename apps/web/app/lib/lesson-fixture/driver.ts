// TEMPORARY bridge for #49. Player code still executes in QuickJS. The old
// sandbox can dispatch onTick but cannot dispatch top-level calls or record a hand.
import ts from 'typescript'
import { createProgram } from '@inherit/sandbox'
import { advanceGame, type Campaign, type ProjectFiles, type GameFactory } from '@inherit/sim'
import { commandSites } from '../commandSites'
import { currentStep, finishCalls, heldItem, placeNames, setHand } from './flow'
import type { CallRecord } from './types'

export async function compileController(c: Campaign, files: ProjectFiles, mode: 'watched' | 'once' | 'deploy' | 'resume') {
  const sites = commandSites(files)
  const compiled = { ...sites.compiledFiles }
  if (mode === 'watched') {
    const source = compiled['main.ts']!
    const tree = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
    // Keep imports outside the dispatch function, preserving source line numbers.
    const imports = tree.statements.filter(ts.isImportDeclaration)
    const body = [...imports].reverse().reduce((text, node) =>
      text.slice(0, node.getStart(tree)) + text.slice(node.getStart(tree), node.end).replace(/[^\n]/g, ' ') + text.slice(node.end), source)
    compiled['main.ts'] = imports.map(n => n.getText(tree).replace(/\s+/g, ' ')).join(';') +
      ';export function onTick(){' + body + '\n}'
  }
  const program = await createProgram({ files: compiled, memory: c.memory, chapterExports: ['take', 'put'], budget: 1024 })
  if (mode === 'deploy') setHand(c, null)
  return {
    initialCalls: [] as CallRecord[],
    stats: () => program.stats,
    drainLogs: () => sites.drainLogs(program.drainLogs()),
    dispose: () => program.dispose(),
    traces: sites.traces,
    step: (world: Campaign, mode: PlaybackMode) => execute(world, mode, { program, sites }),
  }
}
type PlaybackMode = 'watched' | 'once' | 'tick'
type FixtureController = { program: Awaited<ReturnType<typeof createProgram>>; sites: ReturnType<typeof commandSites> }
export function idleTick(c: Campaign) {
  return advanceGame(c, () => {})
}
function execute(c: Campaign, mode: PlaybackMode, controller: FixtureController) {
  const calls: CallRecord[] = []
  let error: string | undefined
  if (mode !== 'tick') {
    setHand(c, null)
    c.world.machines.find(m => m.id === 'mine')!.output = { kind: 'iron-ore' }
  }
  const previousIngots = c.world.delivered['iron-ingot'] ?? 0
  const feedback = advanceGame(c, factory => {
    const { program, sites } = controller
    let message: string | undefined
    const places = placeNames(c)
    const unknown = (place: string) => 'There is no place called "' + place + '". Places: ' + places.join(', ') + '.'
    const arm: GameFactory = {
      ...factory,
      take(place) {
        const hand = heldItem(c)
        const waiting = currentStep(c)?.step.id === 'bram-cart' && currentStep(c)?.phase === 'brief' && place === 'furnace'
        const furnace = c.world.machines.find(m => m.id === 'furnace')!
        const batchInFlight = mode === 'tick' && place === 'mine' && furnace.remaining > 0
        const item = !hand && !waiting && !batchInFlight ? factory.take(place) : undefined
        if (item) setHand(c, item)
        else message = !places.includes(place) ? unknown(place) : hand ? 'The hand is full.' : 'Nothing ready yet.'
        return item
      },
      put(place) {
        const hand = heldItem(c) as ReturnType<GameFactory['take']>
        const ok = factory.put(place, hand)
        if (ok) setHand(c, null)
        else message = !places.includes(place) ? unknown(place) : !hand ? 'The hand is empty.' : 'This place cannot take that item.'
        return ok
      },
    }
    const traced = sites.wrap(arm, program.drainLogs, new Set(places), (fn, args, result, site) => {
      calls.push({
        fn, args, file: site?.file ?? 'main.ts', line: site?.line ?? 1,
        within: site?.fn === '(module)' ? undefined : site?.fn, result, message, ok: !message, hand: heldItem(c),
      })
      message = undefined
    })
    try { program.onTick(traced) } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Controller stopped.'
    }
  })
  const deliveredIngots = (c.world.delivered['iron-ingot'] ?? 0) - previousIngots
  if (!error) finishCalls(c, calls, deliveredIngots, mode === 'tick')
  return { calls, feedback, error }
}
