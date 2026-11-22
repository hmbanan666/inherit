import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import ts from 'typescript'
import { manifests } from '../../packages/sim/src/packs/registry'
import { getPack, packs, playerSources } from '../../packages/sim/src/packs/rules'
import { readPlayerAPI } from '../../packages/sim/src/framework/declarations'
import { freshSave, continueLesson, decodeSave } from '../../packages/sim/src/framework/save'
import { declarations, createPackRunner } from '../../packages/sandbox/src/pack-run'
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
    if (m.next !== undefined) {
      expect(ids).toContain(m.next)
      expect(m.next).not.toBe(m.id)
    }
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
    if (m.track === 'course') {
      expect(m.units.length).toBeGreaterThan(0)
      unique(m.units.map(unit => unit.id))
      for (const unit of m.units) {
        text(unit.title)
        text(unit.landmark)
        expect(pack.lessons.some(l => l.unit === unit.id)).toBe(true)
      }
      const order = pack.lessons.map(l => m.units.findIndex(u => u.id === l.unit))
      expect(order).not.toContain(-1)
      expect(order).toEqual([...order].sort((a, b) => a - b))
    }
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
  const schemaNames = readPlayerAPI(source).methods.map(method => method.name)
  for (const lesson of pack.lessons) {
    const label = m.id+'/'+lesson.id
    const checkpoint = adapter?.checkpoint(lesson.id)
    const starter = lesson.starter(checkpoint?.previous ?? save.project.working)
    const world = checkpoint?.world ?? save.world
    const methods = pack.available(world,lesson.id)
    const host = pack.beginAttempt(structuredClone(world),'run').api
    methods.forEach(name=>expect(typeof host[name],label+' '+name).toBe('function'))
    const inputs = lesson.inputs?.(world) ?? {}
    const inputTypes = Object.entries(inputs).map(([name, binding]) => {
      expect(schemaNames, label).not.toContain(name)
      return 'declare const ' + name + ': ' + binding.type
    })
    const api = checkpoint?.declarations ?? (declarations(source,methods,pack.exposure,pack.typeAliases?.(world))+'\n'+Object.values(pack.guestModules ?? {}).map(module=>module.declarations).join('\n'))
    expect(['write', 'fill', 'fix', 'predict']).toContain(lesson.kind)
    expect(pack.scenes, label).toContain(lesson.scene)
    if (m.track === 'course') expect(lesson.theory, label).toBeDefined()
    if (lesson.theory) {
      const { title, body, example } = lesson.theory
      expect(body.length, label).toBeGreaterThanOrEqual(3)
      expect(body.length, label).toBeLessThanOrEqual(8)
      ;[title, ...body, example].forEach(text)
      expect(Object.values(lesson.referenceSolution).map(s => s.trim()), label).not.toContain(example.trim())
    }
    unique((lesson.variants ?? []).map(v => v.input))
    for (const variant of lesson.variants ?? []) {
      text(variant.input)
      expect(lesson.checks.some(c => !c.input || c.input === variant.input), label).toBe(true)
      if (variant.maxTicks !== undefined) {
        expect(Number.isSafeInteger(variant.maxTicks)).toBe(true)
        expect(variant.maxTicks).toBeGreaterThan(0)
        expect(variant.maxTicks).toBeLessThanOrEqual(1200)
      }
    }
    if (lesson.kind === 'predict') {
      expect(lesson.prediction?.choices, label).toContain(lesson.prediction?.answer)
      expect(lesson.prediction!.choices.length).toBeGreaterThan(1)
    }
    const lines = starter.files[starter.edit.file].split('\n')
    const nearby = lines.slice(Math.max(0, starter.edit.line - 2), starter.edit.line)
    const comments = nearby.filter(line => /^\s*\/\//.test(line))
    expect(starter.edit.line, label).toBeGreaterThan(0)
    expect(starter.edit.line, label).toBeLessThanOrEqual(lines.length)
    expect(comments.some(line => line.trim().length > 12), label).toBe(true)
    const normalize = (line: string) => line.trim().replace(/;$/, '').replace(/\s+/g, ' ')
    const answers = Object.values(lesson.referenceSolution).flatMap(source => source.split('\n')).map(normalize)
      .filter(line => line && !/^[{}]+$/.test(line) && !line.startsWith('//'))
    for (const source of Object.values(starter.files)) {
      const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source)
      for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
        if (token !== ts.SyntaxKind.SingleLineCommentTrivia && token !== ts.SyntaxKind.MultiLineCommentTrivia) continue
        for (const line of scanner.getTokenText().split('\n')) {
          const todo = /\bTODO\b\s*:?[ \t]*(.*?)(?:\*\/)?$/i.exec(line)
          if (todo) expect(answers, label + ' TODO gives the answer').not.toContain(normalize(todo[1]))
        }
      }
    }
    if (m.level === 'Game' || m.level === 'Advanced') {
      expect(comments.some(line => /\bTODO\b/.test(line)), label).toBe(true)
      for (const hint of lesson.hints ?? []) {
        for (const line of hint.split('\n')) {
          const words = normalize(line)
          expect(answers.some(answer => words === answer || (answer.includes('(') && words.includes(answer))),
            label + ' hint gives the answer').toBe(false)
        }
      }
    }
    if (m.track === 'challenges') {
      expect(lesson.unit, label).toBeUndefined()
      text(lesson.task!.condition)
      expect(lesson.task!.examples.length, label).toBeGreaterThanOrEqual(2)
      lesson.task!.examples.forEach(text)
      for (const check of lesson.checks) {
        if (check.input !== undefined) text(check.input)
        else expect(lesson.variants?.length ?? 0, label + ' needs named inputs').toBeGreaterThan(0)
      }
      for (const code of Object.values(starter.files)) {
        const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, code)
        expect(scanner.scan(), label).toBe(ts.SyntaxKind.EndOfFileToken)
      }
    }
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
      expect(diagnostics(files, [api, ...inputTypes].join('\n')),label+' '+(solves?'solution':'starter')).toEqual([])
      const trial = solves ? save : structuredClone(save)
      let solved: boolean
      if (checkpoint) solved = await checkpoint.play(files)
      else {
        const runner = createPackRunner(pack)
        try {
          const mode = !solves && m.track === 'challenges' ? 'run' : lesson.mode
          await runner.play(trial,files,mode)
          if (mode==='deploy') for (let tick=0; tick<1200 && trial.phase!=='solved';tick++) await runner.play(trial,files,'tick')
          solved = trial.phase==='solved'
        } finally {runner.dispose()}
      }
      expect(solved,label+' '+(solves?'solution':'starter')+' '+lesson.checks.map(c=>c.label).join(', ')).toBe(solves)
    }
    if (!checkpoint) {
      expect(decodeSave(pack,JSON.stringify(save)).world).toEqual(save.world)
      continueLesson(pack, save)
    }
  }
},120000)
