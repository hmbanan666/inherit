import { expect, test } from 'vitest'
import { startChapter, type Program } from '../../../../../sandbox/src'
import {
  advanceGame,
  continueStep,
  createCampaign,
  jumpToStep,
  loadSave,
  serializeSave,
  currentStep,
  type CallRecord,
  markMessageRead,
  payInstallment,
  TICK_MS,
} from '../../../index'
import { applyChapterHint } from './chapter-one'

test.each([1, 831, 19])(
  'the exact edits build the bridge and buy the deed (seed %i)',
  async (seed) => {
    let c = createCampaign(seed)
    let live: Program | undefined
    const elapsed: Record<string, number> = {}
    // Record inputs only. The development selector replays these through the sim on seed 1.
    const routes: string[] = []
    const recording: Record<string, [number, number][]> = {}
    function capture(id: string, calls: CallRecord[]) {
      if (seed !== 1) return
      const commands = calls
        .filter((r) => r.fn !== 'look')
        .map((r) => [r.fn, ...r.args].join(' '))
        .join('; ')
      if (!routes.includes(commands)) routes.push(commands)
      const route = routes.indexOf(commands)
      const frames = (recording[id] ??= [])
      const last = frames.at(-1)
      if (last && last[1] === route) last[0]++
      else frames.push([1, route])
    }
    try {
      while (currentStep(c)) {
        const { step } = currentStep(c)!
        expect(c.lesson.phase).toBe('brief')
        if (seed === 1) {
          expect(jumpToStep(c, step.id), step.id).toEqual(c)
          expect(loadSave(serializeSave(c)), step.id).toEqual(c)
        }
        // Reading the card and editing take time. The last deployment keeps running meanwhile.
        if (seed === 19) {
          const minutes = [
            0, 1, 2, 3, 4.5, 6.5, 9, 11, 13, 14, 15, 18, 20, 21, 23, 25, 26, 27, 29, 31, 32, 34, 35, 36, 38,
            39, 41, 44, 48, 50, 52, 55, 58,
          ]
          while (c.world.tick * TICK_MS < minutes[c.lesson.index] * 60000)
            advanceGame(c, live, live?.drainLogs)
        }
        const files = applyChapterHint(c.project.working, step)
        if (step.beat < 9) expect(Object.keys(files)).toEqual(['main.ts'])
        const start = c.world.tick
        if (step.id === 'harrow-tab') markMessageRead(c, 'tab')
        else if (step.id === 'harrow-deed') expect(payInstallment(c, true)).toBe(true)
        else if (step.button === 'run') {
          for (let i = 0; i < 16 && currentStep(c)?.phase !== 'solved'; i++) {
            const run = await startChapter(c, files, 'run')
            capture(step.id, run.calls)
            if (step.id === 'bram-cart' && i === 0 && seed !== 19)
              expect(run.calls[2]).toMatchObject({ ok: false, fn: 'take' })
          }
        } else {
          live?.dispose()
          const init = await startChapter(c, files, 'deploy')
          capture(step.id, init.calls)
          live = init.program
          for (let i = 0; i < 1200 && currentStep(c)?.phase !== 'solved'; i++)
            capture(step.id, advanceGame(c, live, live?.drainLogs).calls)
        }
        expect(
          currentStep(c)?.phase,
          step.id + ' ' + JSON.stringify(c.world.machines.map((m) => [m.id, m.queue, m.output, m.fault])),
        ).toBe('solved')
        elapsed[step.id] = c.world.tick - start
        c = continueStep(c)
        expect(currentStep(c)?.step.id).not.toBe(step.id)
      }
      if (seed === 1) {
        const text = [
          '// Recorded by playthrough.test.ts. Regenerate with vitest -u after changing the reference trip.',
          'export const routes = [',
          ...routes.map((command) => '  ' + JSON.stringify(command) + ','),
          ']',
          'export const recording: Record<string, [ticks: number, route: number][]> = {',
          ...Object.entries(recording).map(
            ([id, frames]) => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(frames) + ',',
          ),
          '}',
          '',
        ].join('\n')
        await expect(text).toMatchFileSnapshot('./recording.ts')
      }
      if (seed === 19) expect((c.world.tick * TICK_MS) / 60000).toBeCloseTo(58)
      expect(c.town.paid).toBe(600)
      expect(c.town.changes.map((row) => row.buildingId)).toContain('bridge')
      expect(((elapsed['bram-loop'] - 1) * TICK_MS) / 1000).toBeGreaterThanOrEqual(30)
      expect(((elapsed['bram-loop'] - 1) * TICK_MS) / 1000).toBeLessThanOrEqual(45)
    } finally {
      live?.dispose()
    }
  },
  60000,
)
