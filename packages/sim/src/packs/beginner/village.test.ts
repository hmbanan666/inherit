import { expect, test } from 'vitest'
import pack from './pack'
import { continueLesson, freshSave } from '../../framework/save'
import { runPack } from '../../../../sandbox/src/pack-run'

test('the fair keeps the sign, flowers, lamps and guests from earlier lessons', async () => {
  const save = freshSave(pack)
  for (const lesson of pack.lessons) {
    expect(save.lessonId).toBe(lesson.id)
    const starter = structuredClone(save)
    await runPack(pack, starter, starter.project.working)
    expect(starter.phase, lesson.id).toBe('working')
    const {moments} = await runPack(pack,save,lesson.referenceSolution)
    expect(moments.length,lesson.id).toBeGreaterThan(0)
    expect(save.phase,lesson.id).toBe('solved')
    continueLesson(pack,save)
  }
  expect(save.completed).toHaveLength(13)
  expect(save.world).toMatchObject({gateFlowers:3,houseFlowers:4,sign:'Mira',lamps:[1,2,3,4,5],stalls:['Mira','Pip','Ada'],banner:true})
})

test('unknown names, unmatched quotes and brackets point back to the draft', async () => {
  for (const [text,message] of [['sya("Hi")','Did you mean “say”'],['say("Hello!)','matching quote'],['say("Hi"','closing )']]) {
    await expect(runPack(pack,freshSave(pack),{'main.ts':text})).rejects.toThrow(message)
  }
})

test('the same decisions work in sunshine and with smaller harvests', async () => {
  for (const [id,raining,basket] of [['weather',false,5],['weather',true,5],['picnic',false,2],['picnic',false,3]] as const) {
    const save = freshSave(pack)
    save.lessonId = id
    Object.assign(save.entryWorld,{raining,basket})
    const lesson = pack.lessons.find(l=>l.id===id)!
    await runPack(pack,save,lesson.referenceSolution)
    expect(save.phase).toBe('solved')
    if (id==='weather') expect(save.world.canopy).toBe(raining)
    else expect(save.world.picnic).toBe(basket>=3)
  }
})

test('unrelated arithmetic and a constant choice leave their lessons open',async()=>{
  for (const [id,source] of [
    ['apple-basket','const a=2,b=3; const unused=a+b; fillBasket(5)'],
    ['weather','const weather=isRaining(); if(true){openCanopy()}else{foldCanopy()}'],
    ['picnic','const apples=basketCount(); if (8>=3) setPicnic()'],
  ]) {
    const save=freshSave(pack)
    save.lessonId=id
    Object.assign(save.entryWorld,{basket:5,raining:true})
    await runPack(pack,save,{'main.ts':source})
    expect(save.phase,id).toBe('working')
  }
})
