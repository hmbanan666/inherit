<script setup lang="ts">
import { createBenchWorker } from '../lib/devtools/worker'
import { toRaw } from 'vue'
import type { PlayerTestResult } from '@inherit/sandbox'
import { useGame } from '../lib/useGame'
import type { BenchReply, BenchRequest } from '../lib/preview.worker'
import type { PreviewResult, PreviewTicks } from '../lib/devtools/preview'

const game = useGame()
const ticks = ref<PreviewTicks>(100)
const busy = ref<'preview' | 'tests'>()
const tests = ref<PlayerTestResult[]>()
const preview = ref<PreviewResult>()
const fault = ref('')
let worker: Worker | undefined
const fields = [
  ['shipped', 'Shipped'],
  ['money', 'Coins'],
  ['idle', 'Idle'],
  ['blocked', 'Blocked'],
  ['errors', 'Errors'],
  ['cpuPeak', 'Peak CPU'],
] as const
function delta(n: number) {
  return n > 0 ? '+' + n : String(n)
}
function stop() {
  worker?.terminate()
  worker = undefined
  busy.value = undefined
}
function run(kind: 'preview' | 'tests') {
  stop()
  fault.value = ''
  busy.value = kind
  if (kind === 'tests') tests.value = undefined
  else preview.value = undefined
  try {
    const campaign = {
      ...toRaw(game.campaign.value),
      project: {
        ...toRaw(game.campaign.value.project),
        working: { ...game.files.value },
      },
    }
    const instance = createBenchWorker()
    worker = instance
    instance.onmessage = ({ data }: MessageEvent<BenchReply>) => {
      if (instance !== worker) return
      if (data.kind === 'preview') preview.value = data.result
      else if (data.kind === 'tests') tests.value = data.result
      else if (data.kind === 'error') fault.value = data.message
      stop()
    }
    instance.onerror = () => {
      if (instance !== worker) return
      fault.value = 'Could not run this copy. Try again.'
      stop()
    }
    const request: BenchRequest =
      kind === 'preview' ? { kind, ticks: ticks.value, campaign } : { kind, campaign }
    worker.postMessage(request)
  } catch (error) {
    fault.value = error instanceof Error ? error.message : String(error)
    stop()
  }
}
function template() {
  if (Object.hasOwn(game.files.value, 'tests.ts')) return
  if (
    game.createFile(
      'tests.ts',
      'test("a fresh shift starts at tick zero", (ctx) => {\n  equal(ctx.tick, 0)\n})\n',
    )
  ) {
    game.openFile('tests.ts')
  } else fault.value = 'Could not create tests.ts.'
}
watch(game.files, () => {
  stop()
  tests.value = undefined
  preview.value = undefined
  fault.value = ''
})
onBeforeUnmount(stop)
</script>
<template>
  <section class="bench" aria-label="Draft workbench">
    <div class="bar">
      <h3>Preview draft</h3>
      <div class="tools">
        <select v-model="ticks" aria-label="Preview ticks">
          <option v-for="n in [100, 500, 2000]" :key="n" :value="n">{{ n }} ticks</option>
        </select>
        <button :disabled="!!busy" @click="run('preview')">
          {{ busy === 'preview' ? 'Simulating…' : 'Run preview' }}
        </button>
      </div>
    </div>
    <p v-if="!preview" class="quiet">Try your edits on a copy of the live floor.</p>
    <div v-if="preview" class="summary">
      <p class="quiet">From t{{ preview.startTick }} · {{ preview.ticks }} ticks</p>
      <table aria-label="Preview comparison">
        <thead>
          <tr>
            <th></th>
            <th
              v-for="[field, label] in fields"
              :key="field"
              scope="col"
              :title="field === 'idle' || field === 'blocked' ? 'Machines at the end of the run' : label"
            >
              {{ label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Deployed</th>
            <td v-for="[field] in fields" :key="field">{{ preview.baseline[field] }}</td>
          </tr>
          <tr>
            <th scope="row">Draft</th>
            <td v-for="[field] in fields" :key="field">{{ preview.draft[field] }}</td>
          </tr>
          <tr class="change">
            <th scope="row">Change</th>
            <td v-for="[field] in fields" :key="field">
              {{ delta(preview.draft[field] - preview.baseline[field]) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="preview.draft.firstError" class="bad">Draft · {{ preview.draft.firstError }}</p>
      <p v-if="preview.baseline.firstError" class="bad">Deployed · {{ preview.baseline.firstError }}</p>
    </div>
    <div class="bar test-bar">
      <h3>Player tests</h3>
      <button v-if="Object.hasOwn(game.files.value, 'tests.ts')" :disabled="!!busy" @click="run('tests')">
        {{ busy === 'tests' ? 'Testing…' : 'Run tests' }}
      </button>
      <button v-else-if="game.surface.value.multiFile" @click="template">Create tests.ts</button>
    </div>
    <p v-if="!Object.hasOwn(game.files.value, 'tests.ts')" class="quiet">
      {{
        game.surface.value.multiFile
          ? 'Try a tiny check with a mock factory.'
          : 'Workshop binder unlocks tests.ts.'
      }}
    </p>
    <ul v-if="tests?.length" class="rows">
      <li v-for="(result, i) in tests" :key="i" class="row" :class="result.passed ? 'good' : 'bad'">
        <b>{{ result.passed ? 'Pass' : 'Fail' }}</b> · {{ result.name }}
        <p v-if="result.error" class="mono">{{ result.error }}</p>
      </li>
    </ul>
    <p v-if="tests && !tests.length" class="quiet">No tests registered in tests.ts.</p>
    <button v-if="busy" @click="stop">Cancel run</button>
    <p v-if="fault" role="alert" class="bad">{{ fault }}</p>
  </section>
</template>
<style scoped src="../lib/devtools/panels.css"></style>
<style scoped>
.summary {
  overflow-x: auto;
  border-left: 2px solid var(--accent-line);
  padding-left: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
td,
th {
  text-align: right;
  padding: 2px 4px;
}
th:first-child {
  text-align: left;
}
tbody th {
  font-weight: normal;
}
.change {
  color: var(--accent-soft);
}
.test-bar {
  border-top: 1px solid var(--line);
  padding-top: 7px;
}
</style>
