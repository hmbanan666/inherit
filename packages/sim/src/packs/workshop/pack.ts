import { definePack, type Lesson, type Call } from '../../framework/pack'
import { createCampaign } from './campaign'
import { loadChapterSave } from './persistence'
import { lessons as chapter } from './chapter'
import { workshopReference } from './reference/chapter-one'
import { edits, workshopStarter } from './starter'
import { panels } from './panels'
import { observeLesson, revealsAfter, type CallRecord } from './lesson-flow'
import { getSurface } from './surface'
import { primitiveTick } from './primitives'
import type { Campaign } from './model'
import manifest from './manifest'
import type { PlayerAPI } from './player'

function chapterCall(call: Call): CallRecord {
  return {...call,fn:call.name as CallRecord['fn'],args:call.args.map(String),hand:null}
}
export const workshopLessons: Lesson<Campaign>[] = chapter.map(step=>{
  const bank = step.id==='harrow-tab'?'replyLater':step.id==='harrow-deed'?'payBalance':undefined
  const files = workshopReference(step)
  const hints = bank ? [step.hints[0], 'Add '+bank+' to the workshop import, then call it once.', 'import { '+bank+' } from "inherit"\n'+bank+'()'] : step.hints
  return { id:step.id, goal:edits[step.id].goal, idea:step.solved.idea, mode:step.button,
    reveals:(revealsAfter[step.id] ?? []).map(r=>'id' in r ? r.kind+'.'+r.id : r.kind),
    starter:previous=>workshopStarter(step.id,previous), hints, referenceSolution:files, solved:step.solved,
    visibleEffect:{description:step.solved.did,testId:'speech',text:step.solved.reaction},
    checks:step.checks.map(check=>({id:check.id,label:check.text,evaluate:e=>{
      const c = e.world
      const progress = observeLesson({...c, lesson:{...c.lesson,phase:'working'}},e.calls.map(chapterCall),[...e.console])
      return progress.passed.includes(check.id) ? 'green' : 'red'
    }})),
  }
})
export function workshopAttempt(c: Campaign,mode: 'run'|'setup'|'tick'|'idle') {
  return primitiveTick(c,mode==='setup'?'deploy':mode)
}
export default definePack<Campaign,PlayerAPI>({
  manifest,version:1,lessons:workshopLessons,initialWorld:createCampaign,decodeWorld:loadChapterSave,
  retry:'live',exposure:'module',panels,entities:panels,beginAttempt:workshopAttempt,
  available:c=>getSurface(c).exports,
})
