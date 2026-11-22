<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Check, ChevronDown, CircleAlert, CircleHelp, Lightbulb, Play, Settings2, TriangleAlert } from '@lucide/vue'
import { manifests } from '@inherit/sim/registry'
import type { Call, Colour } from '@inherit/sim/pack'
import type { Village } from '../../../../../packages/sim/src/packs/beginner/world'
import type { PackCommand, PackFrame } from '../../lib/packProtocol'
import { useContrast } from '../../lib/contrast'
import { lessonV7, lessonsV7 } from './content'
import { plainError, type PlainError } from './plain-errors'
import CourseProgress from './CourseProgress.vue'
import HelpDrawer, { type HelpTab } from './HelpDrawer.vue'
import ProtoEditor from './ProtoEditor.vue'
import SceneFrame from './SceneFrame.vue'
import SolvedCard from './SolvedCard.vue'

/**
 * Lesson screen v7, as a prototype. It drives the shipped beginner pack through the
 * shipped pack worker, so checks, scenes and lesson text are the real ones. Nothing is
 * written to storage, and the game screens do not import this folder.
 */
const manifest = manifests.find(pack => pack.id === 'beginner')!
const contrast = useContrast()
const frame = shallowRef<PackFrame>()
const world = shallowRef<Village>()
const calls = shallowRef<Call[]>([])
const statuses = ref<Colour[]>([])
const code = ref('')
const busy = ref(true)
const playing = ref(false)
const ran = ref(false)
const failedCode = ref<string>()
const feedback = shallowRef<PlainError & { tone: 'error' | 'miss' }>()
const activeLine = ref<number>()
const celebrating = ref(false)
const ended = ref(false)
const drawer = ref<HelpTab>()
const loadError = ref('')
const nudgeGuess = ref(false)
const settings = ref(false)
const switcher = ref(false)
const width = ref(45)
const editor = ref<InstanceType<typeof ProtoEditor>>()

const lessonId = computed(() => frame.value?.save.lessonId ?? null)
const v7 = computed(() => lessonV7(lessonId.value))
const prediction = computed(() => frame.value?.prediction)
const choice = computed(() => lessonId.value ? frame.value?.save.predictions[lessonId.value] : undefined)
const solved = computed(() => frame.value?.solved)
const typed = computed(() => !!v7.value?.ready(code.value) && code.value !== failedCode.value)
const guessed = computed(() => !prediction.value || !!choice.value)
const runReady = computed(() => !busy.value && !solved.value && !ended.value && typed.value && guessed.value)
const theory = computed(() => frame.value?.theory && { ...frame.value.theory,
  body: frame.value.theory.body.map(line => (v7.value.reword ?? []).reduce((text, [from, to]) => text.replace(from, to), line)) })
const steps = computed(() => {
  const list = [{ label: v7.value?.write ?? '', done: typed.value || !!solved.value, run: false }]
  if (prediction.value) list.push({ label: 'Make a guess', done: guessed.value, run: false })
  list.push({ label: 'Press Run', done: !!solved.value, run: true })
  const next = list.findIndex(step => !step.done)
  return list.map((step, index) => ({ ...step, state: step.done ? 'done' : index === next ? 'current' : 'todo' }))
})
const unit = computed(() => {
  const lessons = frame.value?.map ?? []
  const selected = lessons.find(lesson => lesson.id === lessonId.value)
  const index = manifest.units?.findIndex(u => u.id === selected?.unit) ?? -1
  const members = lessons.filter(lesson => lesson.unit === selected?.unit)
  return {
    title: manifest.units?.[index]?.title ?? '',
    position: members.findIndex(lesson => lesson.id === lessonId.value) + 1,
    states: members.map(lesson => lesson.state === 'done' || lesson.id === lessonId.value ? 'done' as const : 'todo' as const),
  }
})
const checks = computed(() => (frame.value?.labels ?? []).map((label, index) => {
  const colour = statuses.value[index] ?? 'red'
  return {
    id: label.id,
    text: v7.value?.checks[index] ?? label.text,
    state: colour === 'green' ? 'pass' : ran.value && feedback.value?.tone !== 'error' && !playing.value ? 'miss' : 'pending',
  }
}))
const rich = (text: string) => text.split('`').map((part, index) => ({ part, code: index % 2 === 1 }))

let worker: Worker | undefined
let alive = true
let last: PackCommand['kind'] | undefined
let runCode = ''
let generation = 0
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function focusEditor(offset: number) {
  await nextTick()
  await editor.value?.focusAt(offset)
}
function send(command: PackCommand) {
  last = command.kind
  busy.value = true
  worker?.postMessage(command)
}
function boot(lesson?: string) {
  generation++
  worker?.terminate()
  frame.value = undefined
  ended.value = false
  celebrating.value = false
  settings.value = false
  loadError.value = ''
  worker = new Worker(new URL('../../lib/pack.worker.ts', import.meta.url), { type: 'module' })
  const instance = worker
  worker.onmessage = ({ data }) => { if (instance === worker && alive) void receive(data) }
  worker.onerror = () => { loadError.value = 'Could not load the prototype. Reload and try again.'; busy.value = false }
  send({ kind: 'open', id: manifest.id, stored: null, lesson: lesson && lessonV7(lesson) ? lesson : undefined })
}
function openLesson(data: PackFrame) {
  const next = lessonV7(data.save.lessonId)
  if (!next) { ended.value = true; return }
  const revisit = data.map.find(lesson => lesson.id === next.id)?.state === 'done'
  code.value = revisit ? data.save.project.working['main.ts'] ?? next.starter : next.starter
  world.value = data.save.world as Village
  calls.value = []
  statuses.value = data.checks
  ran.value = false
  failedCode.value = undefined
  feedback.value = undefined
  activeLine.value = undefined
  celebrating.value = false
  drawer.value = undefined
  void focusEditor(revisit ? code.value.length : next.caret)
}
async function receive(data: PackFrame | { loadError: string }) {
  if ('loadError' in data) { loadError.value = data.loadError; busy.value = false; return }
  const command = last, run = generation
  const changed = data.save.lessonId !== frame.value?.save.lessonId
  frame.value = data
  if (changed) openLesson(data)
  if (changed || command !== 'run') { busy.value = false; return }

  ran.value = true
  calls.value = []
  if (data.error) {
    world.value = data.save.entryWorld as Village
    statuses.value = data.checks
    failedCode.value = runCode
    const plain = plainError(data.error, runCode, {
      names: data.reference.map(method => method.name),
      example: data.theory?.example ?? '',
      needsWords: v7.value?.needsWords ?? '',
    })
    feedback.value = { ...plain, tone: 'error' }
    busy.value = false
    void focusEditor(plain.mark?.to ?? runCode.length)
    return
  }
  feedback.value = undefined
  playing.value = true
  world.value = (data.start ?? data.save.entryWorld) as Village
  for (const moment of data.moments) {
    activeLine.value = moment.call.line
    calls.value = [...calls.value, moment.call]
    world.value = moment.world as Village
    statuses.value = moment.checks
    await wait(700)
    if (!alive || run !== generation) return
  }
  activeLine.value = undefined
  playing.value = false
  world.value = data.save.world as Village
  statuses.value = data.checks
  if (data.solved) {
    // Let the scene finish its reaction before the card covers it.
    await wait(1200)
    if (!alive || run !== generation) return
    celebrating.value = true
  } else {
    failedCode.value = runCode
    feedback.value = { tone: 'miss', title: 'Not there yet', body: v7.value?.miss(world.value) ?? '', raw: '' }
    void focusEditor(runCode.length)
  }
  busy.value = false
}
function run() {
  if (busy.value || solved.value || ended.value || !frame.value) return
  if (prediction.value && !choice.value) {
    nudgeGuess.value = false
    requestAnimationFrame(() => nudgeGuess.value = true)
    return
  }
  drawer.value = undefined
  runCode = code.value
  send({ kind: 'run', files: { 'main.ts': runCode } })
}
function advance() {
  if (!celebrating.value || busy.value || !lessonId.value) return
  celebrating.value = false
  if (lessonsV7.at(-1)?.id === lessonId.value) { ended.value = true; return }
  send({ kind: 'continue', id: lessonId.value })
}
function select(id: string) {
  if (busy.value || !lessonV7(id)) return
  send({ kind: 'select', id, files: { 'main.ts': code.value }, activeFile: 'main.ts' })
}
function openDrawer(tab: HelpTab) { drawer.value = tab }
function closeDrawer() {
  drawer.value = undefined
  void focusEditor(code.value.length)
}
function shortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); run() }
}
function resize(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  el.setPointerCapture(event.pointerId)
  const move = (e: PointerEvent) => width.value = Math.min(62, Math.max(30, 100 - e.clientX / innerWidth * 100))
  el.addEventListener('pointermove', move)
  el.addEventListener('lostpointercapture', () => el.removeEventListener('pointermove', move), { once: true })
}
onMounted(() => {
  boot(new URLSearchParams(location.search).get('lesson') ?? undefined)
  window.addEventListener('keydown', shortcut, true)
})
onBeforeUnmount(() => {
  alive = false
  worker?.terminate()
  window.removeEventListener('keydown', shortcut, true)
})
useHead({ title: 'Lesson screen v7 prototype · Inherit' })
</script>

<template>
  <div class="workshop v7" :class="{ 'high-contrast': contrast }" :style="{ '--dock': width + '%' }">
    <header class="hud">
      <a class="pack-brand brand" href="/" aria-label="Inherit showcase"><img src="/mark.svg" alt="">Inherit<span>.</span></a>
      <div class="pack-switch" @keydown.esc="switcher = false">
        <button data-testid="pack-switcher" :aria-expanded="switcher" @click="switcher = !switcher">{{ manifest.title }} <ChevronDown /></button>
        <nav v-if="switcher" class="hud-menu" aria-label="Switch pack">
          <a :href="'/?pack=' + manifest.id">Open the shipped {{ manifest.title }}</a><a href="/">All game packs</a>
        </nav>
      </div>
      <CourseProgress v-if="frame" :manifest="manifest" :lessons="frame.map" :selected="lessonId"
        :solved="celebrating || ended" :busy="busy || celebrating" @select="select" />
      <div class="settings pack-settings">
        <button aria-label="Settings" :aria-expanded="settings" @click="settings = !settings"><Settings2 /></button>
        <aside v-if="settings" class="hud-menu">
          <button @click="contrast = !contrast">High contrast {{ contrast ? 'on' : 'off' }}</button>
          <button @click="boot()">Restart the prototype</button>
        </aside>
      </div>
      <button class="deploy primary-run run" :class="{ ready: runReady, calm: !runReady && !playing }" data-testid="primary-button"
        :disabled="busy || !!solved || ended" @click="run">
        <Play />{{ playing ? 'Playing' : 'Run' }} <kbd>Ctrl+Enter</kbd>
      </button>
    </header>

    <main class="desk">
      <section class="world" data-testid="world">
        <SceneFrame v-if="world" :world="world" :calls="calls" :covered="!!drawer"
          :confused="feedback?.tone === 'error' && code === failedCode" />
        <HelpDrawer v-if="drawer && frame && lessonId" :tab="drawer" :theory="theory" :condition="frame.task?.condition"
          :hints="frame.hints" :rung="frame.save.hints[lessonId] ?? 0" :entries="frame.reference" :busy="busy"
          @tab="drawer = $event" @close="closeDrawer" @hint="send({ kind: 'hint' })" />
        <SolvedCard v-if="celebrating && solved && v7 && lessonId" :solved="solved" :code="runCode" :learned="v7.learned"
          :states="unit.states" :position="unit.position" :unit="unit.title" :no-hints="!frame?.save.hints[lessonId]"
          :guess="prediction && choice ? { choice, answer: prediction.answer } : undefined" :busy="busy" @advance="advance" />
        <div v-if="ended" class="ending" data-testid="prototype-end">
          <section>
            <small>End of the prototype</small>
            <h2>That is the flow for lessons 1 to 3.</h2>
            <p>The shipped course continues with 49 more lessons on the same screen.</p>
            <button class="gold" @click="boot()">Play again from lesson 1</button>
          </section>
        </div>
        <p v-if="loadError" class="load-error" role="alert">{{ loadError }}</p>
      </section>

      <div class="resizer" role="separator" tabindex="0" aria-label="Resize editor" @pointerdown="resize"
        @keydown.left.prevent="width = Math.min(62, width + 2)" @keydown.right.prevent="width = Math.max(30, width - 2)" />

      <section v-if="frame && v7" class="dock">
        <header class="task" data-testid="task-card">
          <div class="where">
            <h2 :key="lessonId ?? ''">{{ frame.goal }}</h2>
            <button class="how" data-testid="hint" @click="openDrawer('learn')"><CircleHelp /> How it works</button>
          </div>
          <ol class="steps" aria-label="What to do next">
            <li v-for="(step, index) in steps" :key="step.label" :data-state="step.state"
              :aria-current="step.state === 'current' ? 'step' : undefined">
              <span class="n"><Check v-if="step.state === 'done'" /><template v-else>{{ index + 1 }}</template></span>
              <span v-if="step.run">Press <b class="key"><Play />Run</b></span>
              <span v-else>{{ step.label }}</span>
            </li>
          </ol>
        </header>

        <div class="editor" :style="{ '--lines': code.split('\n').length }">
          <ProtoEditor ref="editor" v-model="code" label="Player TypeScript" :read-only="busy || !!solved || ended"
            :ghost="v7.ghost(code)" :mark="feedback?.tone === 'error' && code === failedCode ? feedback.mark : undefined"
            :error-line="feedback?.tone === 'error' && code === failedCode ? feedback.line : undefined" :active-line="activeLine" />
        </div>

        <fieldset v-if="prediction" class="guess" :class="{ nudge: nudgeGuess && !choice }" data-testid="guess"
          @animationend="nudgeGuess = false">
          <legend>{{ choice ? 'Your guess for the top of the board' : v7.guess ?? prediction.question }}</legend>
          <button v-for="option in prediction.choices" :key="option" :aria-pressed="choice === option"
            :disabled="busy || !!choice" @click="send({ kind: 'predict', choice: option })">{{ option }}</button>
        </fieldset>

        <div class="result" aria-live="polite">
          <div v-if="feedback" class="feedback" :data-tone="feedback.tone" data-testid="feedback">
            <TriangleAlert v-if="feedback.tone === 'error'" /><CircleAlert v-else />
            <div>
              <strong>{{ feedback.title }}</strong>
              <p><template v-for="(piece, index) in rich(feedback.body)" :key="index"><code v-if="piece.code">{{ piece.part }}</code><template v-else>{{ piece.part }}</template></template></p>
              <details v-if="feedback.raw"><summary>Technical details</summary><code>{{ feedback.raw }}</code></details>
            </div>
            <button v-if="frame.hints.length" class="hint" @click="openDrawer('hints')"><Lightbulb /> Hint</button>
          </div>
          <div class="checks" data-testid="checks">
            <small>Done when</small>
            <ul>
              <li v-for="check in checks" :key="check.id" :data-state="check.state">
                <Check v-if="check.state === 'pass'" /><CircleAlert v-else-if="check.state === 'miss'" /><i v-else />
                {{ check.text }}
                <span class="sr-only">{{ check.state === 'pass' ? 'Done' : check.state === 'miss' ? 'Not yet' : 'Waiting for Run' }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
      <section v-else class="dock" />
    </main>

    <footer class="statusbar">
      <span>Prototype<span class="wide"> · lesson screen v7</span> · nothing is saved</span>
      <span class="jump"><span aria-hidden="true">Jump to lesson</span>
        <button v-for="(lesson, index) in lessonsV7" :key="lesson.id" :aria-pressed="lesson.id === lessonId"
          :aria-label="'Jump to lesson ' + (index + 1)" @click="boot(lesson.id)">{{ index + 1 }}</button>
      </span>
    </footer>
  </div>
</template>

<style scoped>
.desk { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 7px var(--dock); overflow: hidden }
.world { position: relative; min-width: 0; min-height: 0; overflow: hidden; isolation: isolate; background: #6a7856 }
.dock { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: auto; background: var(--surface-low) }

.run { transition: background .2s, color .2s, border-color .2s }
.run.calm:not(:disabled) { background: transparent; color: var(--gold); border-color: var(--accent-line) }
.run.calm:not(:disabled):hover { background: var(--accent-surface); border-color: var(--gold) }
.run.ready { animation: invite 1.5s ease-out 3 }

.task { flex: none; padding: 20px 22px 18px; border-bottom: 1px solid var(--line) }
.where { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px }
.how { flex: none; margin: 2px -6px 0 0; padding: 4px 9px; border-color: transparent; background: transparent; color: var(--sub); font-size: 13px }
.how svg { width: 15px; height: 15px }
h2 { margin: 0 0 14px; font-size: 25px; line-height: 1.15; letter-spacing: -.02em; text-wrap: balance; animation: arrive .4s ease-out }
.steps { display: flex; flex-wrap: wrap; gap: 8px 10px; margin: 0; padding: 0; list-style: none; font-size: 15px }
.steps li { display: flex; align-items: center; gap: 8px; padding: 5px 12px 5px 6px; border: 1px solid transparent; border-radius: 99px; color: var(--sub) }
.steps .n { display: grid; place-items: center; flex: none; width: 22px; height: 22px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--line-strong); font: 500 12px var(--mono) }
.steps .n svg { width: 13px; height: 13px; stroke-width: 3 }
.steps [data-state='current'] { border-color: var(--accent-line); background: var(--accent-surface); color: var(--text); font-weight: 700 }
.steps [data-state='current'] .n { background: var(--gold); color: var(--ink); box-shadow: none }
.steps [data-state='done'] { color: var(--soft) }
.steps [data-state='done'] .n { background: var(--ok-surface); color: var(--mint); box-shadow: inset 0 0 0 1.5px var(--ok-line) }
.key { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px 1px 5px; border-radius: 4px; background: var(--gold); color: var(--ink); font-size: 13px; font-weight: 700; vertical-align: 1px }
.key svg { width: 10px; height: 10px }
.steps li:not([data-state='current']) .key { background: transparent; color: inherit; box-shadow: inset 0 0 0 1px var(--line-strong) }

.editor { flex: none; height: calc(max(var(--lines) + 2, 5) * 27px + 24px); max-height: 52%; border-bottom: 1px solid var(--line) }

.guess { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 14px 22px 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px }
.guess legend { padding: 0 6px; margin-left: -6px; color: var(--soft); font-size: 14px }
.guess button { min-width: 110px; height: 36px }
.guess button[aria-pressed='true'] { border-color: var(--gold); background: var(--accent-surface); color: var(--accent-soft); opacity: 1 }
.guess.nudge { border-color: var(--gold); animation: nudge .4s ease-out }

.result { padding: 14px 22px 20px }
.feedback { display: grid; grid-template-columns: auto 1fr auto; gap: 4px 12px; align-items: start; margin-bottom: 14px; padding: 13px 14px; border-radius: 8px; background: var(--alert-surface); box-shadow: inset 3px 0 var(--alert); animation: arrive .25s ease-out }
.feedback > svg { margin-top: 2px; color: var(--alert) }
.feedback strong { color: var(--alert); font-size: 16px }
.feedback p { margin: 4px 0 0; color: var(--text); font-size: 15px; line-height: 1.45 }
.feedback code { padding: 1px 5px; border-radius: 3px; background: var(--base); font: 14px var(--mono); color: var(--accent-soft) }
.feedback details { margin-top: 8px; color: var(--sub); font-size: 12px }
.feedback summary { cursor: pointer; width: fit-content }
.feedback details code { display: block; margin-top: 5px; padding: 6px 8px; color: var(--sub); font-size: 12px; overflow-wrap: anywhere }
.feedback[data-tone='miss'] { background: var(--accent-surface); box-shadow: inset 3px 0 var(--gold) }
.feedback[data-tone='miss'] > svg, .feedback[data-tone='miss'] strong { color: var(--gold) }
.hint { padding: 4px 9px; background: transparent; border-color: var(--line-strong); font-size: 13px }
.hint svg { width: 14px; height: 14px }

.checks { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px }
.checks small { color: var(--editor-muted); text-transform: uppercase; letter-spacing: .08em }
.checks ul { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0; padding: 0; list-style: none; font-size: 14px }
.checks li { display: flex; align-items: center; gap: 7px; color: var(--sub) }
.checks li i { width: 13px; height: 13px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--line-strong) }
.checks li svg { width: 15px; height: 15px }
.checks [data-state='pass'] { color: var(--mint); font-weight: 500 }
.checks [data-state='pass'] svg { stroke-width: 3; animation: tick .3s cubic-bezier(.3, 1.8, .5, 1) }
.checks [data-state='miss'] { color: var(--gold) }

.ending { position: absolute; inset: 0; z-index: 7; display: grid; place-items: center; padding: 16px; background: var(--scrim) }
.ending section { width: min(380px, 100%); padding: 24px; border: 1px solid var(--line-strong); border-radius: 14px; background: var(--panel); box-shadow: 0 16px 50px var(--shadow) }
.ending small { color: var(--sub) }
.ending h2 { margin: 8px 0; font-size: 22px; animation: none }
.ending p { margin: 0 0 18px; color: var(--soft); font-size: 14px; line-height: 1.45 }
.ending button { width: 100%; height: 44px }
.load-error { position: absolute; inset: auto 16px 16px; padding: 10px 12px; border-radius: 6px; background: var(--alert-surface); color: var(--alert) }

.statusbar { gap: 16px }
.jump { gap: 6px }
.jump button { padding: 1px 7px; font: inherit; border-color: var(--line) }
.jump button[aria-pressed='true'] { border-color: var(--accent-line); color: var(--gold) }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%) }

@keyframes invite { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 70%, transparent) } 70%, 100% { box-shadow: 0 0 0 14px transparent } }
@keyframes arrive { from { opacity: 0; transform: translateY(4px) } }
@keyframes nudge { 30% { translate: -5px 0 } 60% { translate: 5px 0 } }
@keyframes tick { from { transform: scale(.3) } }

@media (max-width: 800px) {
  .desk { display: flex; flex-direction: column }
  .world { flex: 0 0 clamp(190px, 36dvh, 330px) }
  .resizer { display: none }
  .dock { flex: 1 }
  .pack-switch { display: none }
  .editor { height: calc((var(--lines) + 1) * 27px + 24px); max-height: 34dvh }
  .task { padding: 12px 14px 14px }
  h2 { font-size: 20px; margin: 4px 0 10px }
  .steps { font-size: 14px }
  .result { padding: 12px 14px 16px }
  .guess { margin: 12px 14px 0 }
  .feedback { grid-template-columns: auto 1fr }
  .feedback .hint { grid-column: 2; justify-self: start; margin-top: 6px }
  .jump { margin-left: auto }
  .wide { display: none }
}
@media (prefers-reduced-motion: reduce) {
  .run.ready, h2, .feedback, .guess.nudge, .checks [data-state='pass'] svg { animation: none }
}
</style>
