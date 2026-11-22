import { expect, test } from 'vitest'
import { startChapter } from '../../../../sandbox/src'
import { createCampaign } from './campaign'
import { jumpToStep } from './lesson-flow'
import { advanceGame } from './game'
import { workshopLessons } from './pack'
import { workshopSave, restoreWorkshop } from './save'

test('all chapter saves resume at the same job, including pending reveals and the ending', () => {
  for (const step of workshopLessons) {
    const c = jumpToStep(createCampaign(),step.id)
    const restored = restoreWorkshop(JSON.stringify(workshopSave(c)))
    expect(restored.campaign,step.id).toMatchObject(c)
  }
  const c = createCampaign()
  c.lesson.index = workshopLessons.length
  expect(workshopSave(c).lessonId).toBe(null)
})

test('the empty clock leaves the cart waiting and the bank calls answer the two letters', async () => {
  for (const id of ['bram-loop','harrow-tab','harrow-deed']) {
    for (const solved of [false,true]) {
      const c = jumpToStep(createCampaign(),id)
      const step = workshopLessons[c.lesson.index]
      const files = solved ? step.referenceSolution : step.starter(c.project.working).files
      const {program} = await startChapter(c,files,'deploy')
      try {
        for (let i=0;i<280 && c.lesson.phase!=='solved';i++) advanceGame(c,program,program?.drainLogs)
        expect(c.lesson.phase==='solved',id+' '+solved).toBe(solved)
      } finally {program?.dispose()}
    }
  }
})


test('the chapter slot keeps a solved card between reveals, drafts, archives and payments', () => {
  const c = jumpToStep(createCampaign(),'harrow-tab')
  c.lesson.phase = 'solved'
  c.lesson.queue = [{kind:'section',id:'orders'}]
  c.project.working['scratch.ts'] = '// unfinished notes'
  c.town.paid = 100
  c.town.payments = 1
  const save = workshopSave(c)
  expect(save.pendingReveals).toEqual(['section.orders'])
  const restored = restoreWorkshop(JSON.stringify(save)).campaign
  expect(restored.lesson).toEqual(c.lesson)
  expect(restored.town.paid).toBe(100)
  expect(restored.project).toEqual(c.project)
  expect(()=>restoreWorkshop(JSON.stringify({...save,entryWorld:{}}))).toThrow()
})
