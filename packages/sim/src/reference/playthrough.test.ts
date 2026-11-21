import { expect, test } from 'vitest'
import ts from 'typescript'
import { runInNewContext } from 'node:vm'
import { posix } from 'node:path'
import {
  createCampaign,
  deployGameProject,
  advanceGame,
  townSnapshot,
  payInstallment,
  loadSave,
  serializeSave,
  type Campaign,
  type ProjectFiles,
  type GameProgram,
} from '../index'
import { chapterFiles } from './chapter-one'

// Only the fixtures authored in this directory enter this test evaluator.
// The application executes player projects in QuickJS.
function referenceController(files: ProjectFiles, campaign: Campaign): GameProgram {
  const memory = structuredClone(campaign.memory)
  type Handlers = Record<string, (...args: unknown[]) => void>
  const modules = new Map<string, Handlers>()
  function compile(path: string): Handlers {
    const cached = modules.get(path)
    if (cached) return cached
    const exports: Handlers = {}
    modules.set(path, exports)
    const text = ts.transpileModule(files[path], {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    runInNewContext(
      text,
      { exports, memory, require: (name: string) => compile(posix.join(posix.dirname(path), name) + '.ts') },
      { filename: path },
    )
    return exports
  }
  const handlers = compile('main.ts')
  return {
    deliverEvent(name, event, ctx) {
      handlers[name]?.(event, ctx)
    },
    onTick(ctx) {
      handlers.onTick(ctx)
    },
    exportMemory() {
      return structuredClone(memory)
    },
  }
}

test.each(['immediate edits', 'beginner pace', 'missed deadlines'])(
  'every chapter request on one growing controller with %s',
  (pace) => {
    const lazy = pace === 'missed deadlines'
    // At beginner pace the current deployment keeps running while the player edits the next one.
    const editAtMinute: Record<number, number> = { 1: 2.5, 3: 18, 5: 29, 7: 40, 8: 44, 9: 56 }
    let c = createCampaign(831)
    const deployed = (beat: number) => {
      c.project.working = chapterFiles(beat)
      deployGameProject(c)
      return referenceController(c.project.deployed, c)
    }
    let run = referenceController(c.project.deployed, c)
    const requests: string[] = []
    const beats: number[] = []
    const advance = () => advanceGame(c, run)
    const until = (condition: () => boolean, budget: number) => {
      const end = c.world.tick + budget
      while (!condition() && c.world.tick < end) advance()
      expect(condition(), 'beat ' + c.town.beat + ' tick ' + c.world.tick + ' cash ' + c.economy.money).toBe(
        true,
      )
    }
    for (let beat = 1; beat <= 10; beat++) {
      expect(c.town.beat).toBe(beat)
      beats.push(beat)
      const person = townSnapshot(c).people.find((p) => p.ask)
      if (person?.ask) requests.push(person.ask.requestId)
      if (pace === 'beginner pace' && editAtMinute[beat]) {
        const editTick = editAtMinute[beat] * 240
        while (c.world.tick < editTick) {
          advance()
          if (c.town.payments === 1 && c.world.tick >= 5 * 1200 && c.economy.money >= 250) payInstallment(c)
        }
      }
      if (lazy && person?.ask) {
        // Leave the controller off through every deadline, then finish the same request.
        run = referenceController({ 'main.ts': 'export function onTick(){}' }, c)
        const due = person.id === 'harrow' ? townSnapshot(c).debt.next!.dueDay * 1200 : c.town.due
        until(() => c.world.tick > due, 15000)
        expect(townSnapshot(c).people.find((p) => p.id === person.id)).toMatchObject({
          mood: 'worried',
          ask: { late: true },
        })
      }
      if (beat === 2 || beat === 10) {
        run = deployed(beat === 2 ? 1 : 9)
        while (c.town.beat === beat) {
          const payment = townSnapshot(c).debt.next!
          if (lazy) until(() => c.world.tick > payment.dueDay * 1200, 15000)
          until(() => c.economy.money >= townSnapshot(c).debt.next!.amount, 10000)
          expect(payInstallment(c)).toBe(true)
        }
      } else {
        run = deployed(beat)
        until(() => c.town.beat !== beat, beat === 1 ? 1920 : 2000)
      }
      if (beat === 5) c = loadSave(serializeSave(c))
    }
    expect(beats).toHaveLength(10)
    expect(requests).toEqual([
      'horseshoes',
      'installment-0',
      'oven-grate',
      'lamp-wire',
      'wheel-teeth',
      'bridge-brackets',
      pace === 'beginner pace' ? 'installment-2' : 'installment-1',
    ])
    expect(c.town.changes.map((change) => change.buildingId)).toEqual([
      'forge',
      'bank',
      'bakery',
      'lamp-street',
      'mill',
      'bridge',
      'riverside',
      'bank',
    ])
    expect(c.town.beat).toBe(11)
    expect(c.town.paid).toBe(lazy ? 660 : c.town.installments.reduce((a, b) => a + b))
    expect(townSnapshot(c).debt.owed).toBe(0)
    expect(townSnapshot(c).people.map((p) => p.name)).toEqual(expect.arrayContaining(['Ines', 'Pell']))
    expect(c.progress.messages.map((m) => m.id)).toEqual(
      expect.arrayContaining(['vein', 'heat', 'competition', 'slow']),
    )
    if (process.env.INHERIT_TIMINGS)
      console.log({
        pace,
        tick: c.world.tick,
        changes: c.town.changes.map((change) => [change.buildingId, change.tick]),
      })
    if (!lazy) expect(c.world.tick).toBeLessThanOrEqual(14400)
    const deliveries = c.world.delivered.bracket!
    for (let i = 0; i < 100; i++) advance()
    expect(c.world.delivered.bracket).toBeGreaterThan(deliveries)
    expect(c.economy.orders.some((o) => o.customer === 'bram')).toBe(true)
  },
  30000,
)
