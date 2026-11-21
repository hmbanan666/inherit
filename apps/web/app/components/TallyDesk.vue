<script setup lang="ts">
import { actionNames, deskChallenges, starter, type DeskAction } from '@inherit/sim/tally-desk'
import type { DeskResult } from '../lib/tally/run'

useHead({ title: 'The tally desk · inherit' })
const stage = ref(0)
const chapter = computed(() => deskChallenges[stage.value])
const code = ref(starter)
const actions = shallowRef<DeskAction[]>([])
const result = shallowRef<DeskResult>()
const error = ref('')
const busy = ref(false)
const passed = ref(false)
const hints = ref(0)
const frame = computed(() => result.value?.rows.at(-1))
const mismatch = computed(() => result.value?.rows[result.value.difference])
let worker: Worker | undefined

function discardRun() {
  worker?.terminate()
  worker = undefined
  busy.value = false
  result.value = undefined
  error.value = ''
}
function run(sequence: DeskAction[], check = false) {
  if (busy.value) return
  error.value = ''
  actions.value = [...sequence]
  busy.value = true
  const runner = worker ?? new Worker(new URL('../lib/tally/desk.worker.ts', import.meta.url), { type: 'module' })
  worker = runner
  runner.onmessage = ({ data }: MessageEvent<{ result?: DeskResult; error?: string }>) => {
    if (runner !== worker) return
    result.value = data.result
    error.value = data.error ?? ''
    if (check) passed.value = data.result?.difference === -1
    busy.value = false
  }
  runner.onerror = event => {
    if (runner !== worker) return
    error.value = event.message || 'The experiment worker could not start.'
    runner.terminate()
    worker = undefined
    busy.value = false
  }
  runner.postMessage({ source: code.value, actions: sequence })
}
watch(code, () => {
  discardRun()
  passed.value = false
}, { flush: 'sync' })
function nextShift() {
  stage.value = 1
  hints.value = 0
  passed.value = false
  run([])
}
onMounted(() => run([]))
onBeforeUnmount(discardRun)
</script>

<template>
  <main class="desk">
    <header><a href="./">inherit / workshop</a><span>Component state · React 18.2.0</span></header>
    <h1>The tally desk</h1>
    <section :aria-label="chapter.title">
      <h2>{{ stage + 1 }} / {{ chapter.title }}</h2>
      <p>{{ chapter.question }}</p>
      <div class="bench">
        <article v-for="side in (['reference', 'player'] as const)" :key="side" :class="frame?.paint">
          <h3>{{ side === 'reference' ? 'React reference' : 'Your desk' }}</h3>
          <strong>{{ frame?.[side] ?? '—' }}</strong>
          <span>{{ frame?.shift ?? 'Day' }} shift · parcels stamped · {{ frame?.paint ?? 'chalk' }} sign</span>
        </article>
      </div>
      <div class="tools">
        <button v-for="action in (['stamp', 'repaint', 'handover'] as const)" :key="action"
          :hidden="action === 'handover' && stage === 0" :disabled="busy || actions.length >= 64"
          @click="run([...actions, action])">{{ actionNames[action] }}</button>
        <button :disabled="busy" @click="run([])">Clear sequence</button>
      </div>
    </section>
    <div class="work">
      <section>
        <h2><label for="desk-code">desk.ts</label></h2>
        <p>Implement a single state slot. Each render calls <code>tallyFor(shift)</code> for the current key. Return the displayed number and a setter. A stamp sets the number to its displayed value plus one and triggers a render.</p>
        <textarea id="desk-code" v-model="code" spellcheck="false" autocapitalize="off" maxlength="64000" />
        <div class="tools">
          <button class="check" :disabled="busy" @click="run(chapter.experiment, true)">Check challenge</button>
          <button :disabled="busy" @click="run(actions)">Replay sequence</button>
        </div>
      </section>
      <section>
        <h2>Experiment log</h2>
        <p role="status">
          <template v-if="busy">Running both desks…</template>
          <template v-else-if="error">{{ error }}</template>
          <template v-else-if="mismatch">First difference at step {{ result?.difference }} · {{ actionNames[mismatch.action] }}. React shows {{ mismatch.reference }}, your desk shows {{ mismatch.player }}.</template>
          <template v-else-if="passed">Challenge complete.</template>
          <template v-else-if="result">Both desks agree. Try an action or check the challenge.</template>
          <template v-else>Code changed. Replay to see the result.</template>
        </p>
        <div class="trace" v-if="result"><table>
          <thead><tr><th>Step</th><th>Action</th><th>React</th><th>Yours</th></tr></thead>
          <tbody><tr v-for="(row, index) in result.rows" :key="index" :class="{ diff: index === result.difference }">
            <td>{{ index }}</td><td>{{ actionNames[row.action] }}</td><td>{{ row.reference }}</td><td>{{ row.player }}</td>
          </tr></tbody>
        </table></div>
        <button v-if="passed && stage === 0" :disabled="busy" @click="nextShift">Investigate the night shift →</button>
        <p v-if="passed && stage === 1">Both shifts are open for further experiments. <a href="?chapter=tally-desk">Start a fresh chapter</a></p>
      </section>
    </div>
    <aside>
      <h2>Clerk’s notebook</h2>
      <button v-if="hints === 0" @click="hints = 1">Suggest an experiment</button>
      <p v-if="hints >= 1">{{ chapter.hint }}</p>
      <button v-if="hints === 1" @click="hints = 2">Explain the behavior</button>
      <p v-if="hints >= 2">{{ chapter.explanation }}</p>
      <button v-if="hints === 2" @click="hints = 3">Show worked solution</button>
      <template v-if="hints >= 3"><pre>{{ chapter.solution }}</pre><button @click="code = chapter.solution">Use this solution</button></template>
      <details :key="stage"><summary>How React does it</summary><p>{{ chapter.internals }}</p>
        <a :href="chapter.source" target="_blank" rel="noopener">Read the reconciler source ↗</a>
      </details>
    </aside>
  </main>
</template>

<style scoped>
.desk { max-width: 1050px; margin: auto; padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem; }
header, .tools { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; }
header { justify-content: space-between; color: var(--sub); border-bottom: 1px solid var(--line); padding-bottom: 1rem; }
a { color: var(--mint); }
h1 { margin: 2rem 0 1rem; font-size: clamp(2rem, 6vw, 4rem); letter-spacing: -.05em; }
h2 { margin-bottom: .55rem; font-size: 1.25rem; }
p { line-height: 1.5; margin: .55rem 0 1rem; max-width: 76ch; }
.bench, .work { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
article { background: #293c35; border: 2px solid #778575; padding: 1rem; border-radius: 4px; }
article.ink { background: #2c3447; border-color: #818ea4; }
article h3, header, td, th, textarea, pre { font-family: var(--mono); }
article strong { display: block; font: 3.5rem var(--mono); }
article span { color: #d5ded6; }
.work, aside { border-top: 1px solid var(--line); padding-top: 1.25rem; margin-top: 1.5rem; }
textarea, pre { width: 100%; padding: .8rem; border: 1px solid var(--line); background: #121714; color: var(--text); line-height: 1.5; font-size: .9rem; }
textarea { min-height: 13rem; resize: vertical; }
.check { background: var(--gold); color: #211a0d; }
button[hidden] { display: none; }
.trace { max-height: 17rem; overflow: auto; margin: .5rem 0; }
table { width: 100%; border-collapse: collapse; font-size: .86rem; }
td, th { text-align: left; padding: .3rem; border-bottom: 1px solid var(--line); }
.diff { color: var(--gold); }
details { margin-top: 1rem; }
summary { cursor: pointer; }
pre { overflow-x: auto; }
@media (max-width: 680px) { .work { grid-template-columns: 1fr; } .bench { gap: .4rem; } article { padding: .7rem; } }
</style>
