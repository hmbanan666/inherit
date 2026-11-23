<script setup lang="ts">
import { declarations, kettlewick, factoryBricks, type Message } from '@inherit/sim/v8'
import { Play } from '@lucide/vue'
import { editorKey } from '../lib/editor'
import type { FactoryCommand, FactoryFrame } from '../lib/factoryProtocol'

useHead({ title: 'Kettlewick Works · Inherit' })
const bricks = factoryBricks(kettlewick)
const api = ref(declarations(bricks))
const files = shallowRef({ ...kettlewick.files })
const deployed = shallowRef(kettlewick.files)
const activeFile = ref('main.ts')
const world = shallowRef<Extract<FactoryFrame, { world: unknown }>['world']>()
const messages = shallowRef<Message[]>([])
const error = ref('')
const pending = ref(true)
const paused = ref(false)
const speed = ref(kettlewick.speeds[0])
const reference = ref<HTMLDetailsElement>()
let worker: Worker | undefined

provide(editorKey, {
  id: kettlewick.id, label: 'Player TypeScript', files, deployed, activeFile, api,
  apiNames: shallowRef(new Set(bricks.map(b => b.name.split('.').at(-1)!))),
  dirty: computed(() => files.value !== deployed.value), multiFile: ref(false),
  navigation: ref({ file: 'main.ts', line: 1 }), watching: ref(false), call: ref(), tickCalls: ref([]),
  setFile(file, code) { files.value = { ...files.value, [file]: code } },
  openFile(file) { activeFile.value = file },
})

function send(command: FactoryCommand) { worker?.postMessage(command) }
function clock() { send({ kind: 'clock', speed: speed.value, paused: paused.value || document.hidden }) }
watch([paused, speed], clock, { flush: 'sync' })

function deploy(kind: 'run' | 'restart') {
  pending.value = true
  error.value = ''
  if (kind === 'restart') {
    files.value = { ...kettlewick.files }
    messages.value = []
  }
  send({ kind, files: files.value })
}

function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    if (!pending.value && !event.repeat) deploy('run')
  }
}

onMounted(() => {
  worker = new Worker(new URL('../lib/factory.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<FactoryFrame>) => {
    if ('error' in data) {
      error.value = data.error
      pending.value = false
      return
    }
    world.value = data.world
    if (data.deployed) {
      deployed.value = data.deployed
      pending.value = false
    }
    if (data.world.messages.length) messages.value = [...messages.value, ...data.world.messages].slice(-20)
  }
  worker.onerror = () => { error.value = 'Could not load the factory. Reload to try again.' }
  deploy('restart')
  clock()
  document.addEventListener('visibilitychange', clock)
  window.addEventListener('keydown', shortcut)
})
onBeforeUnmount(() => {
  worker?.terminate()
  document.removeEventListener('visibilitychange', clock)
  window.removeEventListener('keydown', shortcut)
})

</script>

<template>
  <StudioShell class="factory">
    <template #nav>
      <PackNav><strong class="pack-switch">Kettlewick Works</strong></PackNav>
      <div v-if="world" class="clock">
        <span class="tick" data-testid="tick">Tick <b>{{ world.tick }}</b></span>
        <span class="tick">Credits <b>{{ world.credits }}</b></span>
        <span class="tick" data-testid="cpu" :class="{ limit: world.cpu.used >= world.cpu.limit }">CPU <b>{{ world.cpu.used }}/{{ world.cpu.limit }}</b></span>
      </div>
      <button class="deploy primary-run" aria-label="Run" :disabled="pending" @click="deploy('run')"><Play /> Run <kbd>Ctrl+Enter</kbd></button>
    </template>
    <template #floor>
      <nav class="factory-clock" aria-label="Factory clock">
        <button @click="paused = !paused">{{ paused ? 'Resume' : 'Pause' }}</button>
        <div class="speeds"><button v-for="rate in kettlewick.speeds" :key="rate" :aria-pressed="speed === rate" @click="speed = rate">{{ rate }}x</button></div>
        <button :disabled="pending" @click="deploy('restart')">Restart</button>
      </nav>
      <template v-if="world">
        <div class="map-frame"><LazyFactoryFloor :world="world" :paused="paused" :interval="kettlewick.tickMs / speed" /></div>
        <MetricsPanel :world="world" />
      </template>
    </template>
    <template #editor>
      <div class="editor-pane"><div class="editor-host"><LazyCodeEditor @reference="reference && (reference.open = true)" /></div></div>
        <section aria-label="Console" class="console">
          <h2>Console</h2>
          <p v-if="error" role="alert">{{ error }}</p>
          <p v-for="msg in [...messages].reverse()" :key="msg.tick">Tick {{ msg.tick }} · {{ msg.text }}</p>
        </section>
        <details ref="reference" class="reference">
          <summary>API</summary>
          <article v-for="brick in bricks" :key="brick.name">
            <strong>{{ brick.name }}</strong> · {{ brick.cost }} CPU
            <p><code>{{ brick.signature }}</code></p>
            <p>{{ brick.doc }}</p><code>{{ brick.example }}</code>
          </article>
        </details>
    </template>
    <template #status><span v-if="world" data-testid="ore">Furnace ore {{ world.furnace.input }}</span></template>
  </StudioShell>
</template>

<style scoped>
.factory-clock { display: flex; gap: 6px; margin-bottom: 8px }
.map-frame { flex: 1; min-height: 150px; position: relative }
.limit b, [role=alert] { color: var(--alert) }
.console, .reference { border-top: 1px solid var(--line); padding: 6px 12px; overflow: auto }
.console { max-height: 7rem; font: 12px var(--mono) }
.console h2 { font-size: 13px }
.reference { max-height: 30% }
.factory :deep(.editor-dock > .editor-pane) { flex: 1 }
@media(max-width:800px) { .clock { grid-column: 1 / -1; grid-row: 3 } }
</style>
