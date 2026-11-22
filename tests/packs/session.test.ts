import { expect, test } from 'vitest'
import { freshSave, decodeSave, continueLesson } from '../../packages/sim/src/framework/save'
import { createPackRunner } from '../../packages/sandbox/src/pack-run'
import beginner from '../../packages/sim/src/packs/beginner/pack'

test('a restored deployment starts its handler without replaying setup on the saved world',async()=>{
  const first = beginner.lessons[0]
  const pack = {...beginner, clock:{intervalMs:250,handler:'onTick' as const},
    lessons:[{...first, mode:'deploy' as const,reveals:['square','gate']}],
    available:()=>['say','ringBell'] as const}
  const save = freshSave(pack)
  const files = {'main.ts':'ringBell()\nexport function onTick(){say("Hello!")}'}
  const runner = createPackRunner(pack)
  await runner.play(save,files,'deploy')
  expect(save.world.bell).toBe(1)
  expect(save.phase).toBe('working')
  runner.dispose()
  const restored = decodeSave(pack,JSON.stringify(save))
  const next = createPackRunner(pack)
  try {
    await next.play(restored,restored.project.deployed!,'resume')
    await next.play(restored,files,'tick')
    expect(restored.world.bell).toBe(1)
    expect(restored.phase).toBe('solved')
    continueLesson(pack,restored)
    expect(restored.released).toEqual(['square'])
    continueLesson(pack,restored)
    expect(restored.released).toEqual(['square','gate'])
    continueLesson(pack,restored)
    expect(restored.lessonId).toBeNull()
  } finally { next.dispose() }
})
test('bad pack versions, archives and active file references cannot replace a good slot',()=>{
  const good = freshSave(beginner)
  for (const patch of [{packVersion:2},{lessonId:'missing'},{project:{...good.project,activeFile:'other.ts'}},
    {project:{...good.project,history:[{}]}},{world:{}}]) {
    expect(()=>decodeSave(beginner,JSON.stringify({...good,...patch}))).toThrow()
  }
  expect(decodeSave(beginner,JSON.stringify(good))).toEqual(good)
})
