import { expect, test } from 'vitest'
import { createProgram, type Program } from '../../../sandbox/src'
import {
  advanceGame,
  createCampaign,
  currentLesson,
  deployGameProject,
  getSurface,
  loadSave,
  markMessageRead,
  payInstallment,
  requestChecks,
  serializeSave,
} from '../index'
import { chapterFiles } from '../../../../tests/chapter-controllers'

test.each([
  ['immediate', 831],
  ['beginner', 831],
  ['long breaks', 1],
  ['long breaks', 2],
  ['long breaks', 3],
  ['long breaks', 4],
  ['long breaks', 5],
] as const)(
  'one growing project rebuilds Riverside at %s pace (mine %i)',
  async (pace, seed) => {
    let c = createCampaign(seed)
    let live: Program | undefined
    const tick = () => {
      advanceGame(c, live ?? (() => {}))
      if (live?.drainLogs().length) c.progress.signals.printedTick = true
    }
    const minutes = [0, 3, 8, 15, 22, 29, 34, 40, 46, 56]
    try {
      for (let beat = 1; beat <= 9; beat++) {
        expect(c.town.beat).toBe(beat)
        if (pace === 'beginner') while (c.world.tick < minutes[beat] * 240) tick()
        if (pace === 'long breaks') {
          for (let i = 0; i < 500; i++) tick()
          while (payInstallment(c)) {
            /* Pay as soon as the next installment is affordable. */
          }
        }
        if (beat === 2) {
          markMessageRead(c, 'tab')
          continue
        }
        let task = currentLesson(c)!
        while (task.cases.length) {
          c.project.working = chapterFiles(beat, task.id)
          c.town.solved.push(task.id)
          task = currentLesson(c)!
        }
        c.project.working = chapterFiles(beat)
        deployGameProject(c)
        live?.dispose()
        live = undefined
        live = await createProgram({ files: c.project.deployed, chapterExports: getSurface(c).exports })
        const start = c.world.tick
        const states = new Set<string>()
        while (c.town.beat === beat && c.world.tick - start < 1000) {
          tick()
          for (const check of requestChecks(c)) states.add(check.state)
        }
        expect(
          c.town.beat,
          'beat ' +
            beat +
            ' got stuck: ' +
            JSON.stringify(c.world.machines.map((m) => [m.id, m.fault, m.output, m.queue])),
        ).toBe(beat + 1)
        if (beat === 1) expect([...states].sort()).toEqual(['close', 'done', 'todo'])
        if (beat === 5) c = loadSave(serializeSave(c))
      }
      expect(c.world.machines.map((m) => m.id)).toEqual([
        'mine',
        'furnace',
        'cart',
        'press',
        'copper',
        'cutter',
        'gears',
        'assembler',
      ])
      expect(c.town.changes.map((x) => x.buildingId)).toContain('bridge')
      expect(payInstallment(c, true)).toBe(true)
      expect(c.town.beat).toBe(11)
      expect(c.town.paid).toBe(600)
      expect(c.economy.money).toBeLessThan(100)
      if (pace === 'beginner') expect(c.world.tick / 240).toBeGreaterThanOrEqual(56)
      expect(c.world.tick / 240).toBeLessThan(60)
    } finally {
      live?.dispose()
    }
  },
  30000,
)
