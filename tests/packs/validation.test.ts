import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import ts from 'typescript'
import { manifests } from '../../packages/sim/src/packs/registry'
import { getPack, packs, playerSources } from '../../packages/sim/src/packs/rules'
import { readPlayerAPI } from '../../packages/sim/src/framework/declarations'
import { freshSave, continueLesson, decodeSave } from '../../packages/sim/src/framework/save'
import { declarations, runPack } from '../../packages/sandbox/src/pack-run'
import type { Files } from '../../packages/sim/src/framework/pack'
import { diagnostics } from './compiler'

type Checkpoint = {previous:Files;world:unknown;declarations:string;play(files:Files):Promise<boolean>}
const adapters = import.meta.glob<{checkpoint(id:string):Checkpoint}>('../../packages/sim/src/packs/*/validation.ts',{eager:true})
const forbidden = /\b(?:ctx|verbs?|katas?|bench(?:es)?|wire[- ]?up)\b/i
const unique = (ids:string[]) => expect(new Set(ids).size).toBe(ids.length)
function text(value: string) {
  expect(value.trim()).not.toBe('')
  expect(value).not.toMatch(forbidden)
}
test('pack folders, manifests, rules and public methods agree', () => {
  const ids = manifests.map(m=>m.id).sort()
  unique(ids)
  for (const paths of [packs,playerSources]) expect(Object.keys(paths).map(p=>p.split('/')[1]).sort()).toEqual(ids)
  for (const m of manifests) {
    expect(m.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
    expect(['Beginner','Basics','Game','Advanced']).toContain(m.level)
    expect(m.learningGoals.length).toBeGreaterThan(0)
    ;[m.title,m.genre,m.tagline,...m.learningGoals].forEach(text)
    expect(m.estimatedMinutes.min).toBeGreaterThan(0)
    expect(m.estimatedMinutes.max).toBeGreaterThanOrEqual(m.estimatedMinutes.min)
    for (const name of ['WorldView.vue',m.cover]) expect(existsSync(join('packages/sim/src/packs',m.id,name))).toBe(true)
    const pack = getPack(m.id)
    expect(pack.manifest).toEqual(m)
    expect(pack.lessons.length).toBeGreaterThan(0)
    unique(pack.lessons.map(l=>l.id))
    unique(pack.entities.map(e=>e.id))
    const world = pack.decodeWorld(structuredClone(pack.initialWorld(1)))
    for (const entity of [...pack.entities,...pack.panels]) {text(entity.label);unique(entity.rows(world).map(r=>r.id))}
    const schema = readPlayerAPI(playerSources['./'+m.id+'/player.ts'])
    expect(schema.methods.length).toBeGreaterThan(0)
    schema.methods.forEach(method=>text(method.description))
  }
})
for (const m of manifests) test(m.id+' starters and solutions play from the same lesson entry',async()=>{
  const pack = getPack(m.id)
  const adapter = adapters['../../packages/sim/src/packs/'+m.id+'/validation.ts']
  const save = freshSave(pack)
  const source = playerSources['./'+m.id+'/player.ts']
  for (const lesson of pack.lessons) {
    const label = m.id+'/'+lesson.id
    const checkpoint = adapter?.checkpoint(lesson.id)
    const starter = lesson.starter(checkpoint?.previous ?? save.project.working)
    const world = checkpoint?.world ?? save.world
    const methods = pack.available(world,lesson.id)
    const host = pack.beginAttempt(structuredClone(world),'run').api
    methods.forEach(name=>expect(typeof host[name],label+' '+name).toBe('function'))
    const api = checkpoint?.declarations ?? declarations(source,methods,pack.exposure)
    const note = starter.files[starter.edit.file].split('\n')[starter.edit.line-2] ?? ''
    expect(starter.edit.line,label).toBeLessThanOrEqual(starter.files[starter.edit.file].split('\n').length)
    expect(ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.Standard,note.trim()).scan(),label+' '+note).toBe(ts.SyntaxKind.SingleLineCommentTrivia)
    expect(note.trim().length,label).toBeGreaterThan(12)
    expect(lesson.goal.length,label).toBeLessThanOrEqual(70)
    expect(lesson.goal,label).not.toMatch(/\n/)
    expect(lesson.checks.length,label).toBeGreaterThan(0)
    unique(lesson.checks.map(c=>c.id))
    ;[lesson.goal,lesson.idea,...lesson.hints ?? [],...Object.values(lesson.solved),...Object.values(lesson.visibleEffect),...lesson.checks.map(c=>c.label),...Object.values(starter.files)].forEach(text)
    if (m.level==='Beginner') for (const files of [starter.files,lesson.referenceSolution]) {
      expect(Object.keys(files)).toEqual(['main.ts'])
      expect(files['main.ts'],label).not.toMatch(/\b(import|export|onTick)\b/)
    }
    for (const [files,solves] of [[starter.files,false],[lesson.referenceSolution,true]] as const) {
      expect(diagnostics(files,api),label+' '+(solves?'solution':'starter')).toEqual([])
      const trial = solves ? save : structuredClone(save)
      const solved = checkpoint ? await checkpoint.play(files) : (await runPack(pack,trial,files), trial.phase === 'solved')
      expect(solved,label+' '+(solves?'solution':'starter')+' '+lesson.checks.map(c=>c.label).join(', ')).toBe(solves)
    }
    if (!checkpoint) {
      expect(decodeSave(pack,JSON.stringify(save)).world).toEqual(save.world)
      do { continueLesson(pack,save) } while (save.lessonId===lesson.id)
    }
  }
},120000)
