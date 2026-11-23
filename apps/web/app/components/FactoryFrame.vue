<script setup lang="ts">
import { declarations, kettlewick, mining, type Cell, type Message } from '@inherit/sim/v8'
import { editorKey } from '../lib/editor'
import type { FactoryCommand, FactoryFrame } from '../lib/factoryProtocol'

useHead({ title: 'Kettlewick Works · Inherit' })
const bricks = mining(kettlewick)
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

const cells = computed(() => {
  const site = world.value
  if (!site) return []
  const cells = Array.from({ length: site.grid.width * site.grid.height }, () => [] as string[])
  const at = (pos: Cell) => cells[pos.y * site.grid.width + pos.x]
  at(site.depot.pos).push('Depot')
  for (const vein of site.veins) at(vein.pos).push(vein.name)
  for (const drone of site.drones) at(drone.pos).push(drone.name.replace('drone-', ''))
  return cells
})
</script>

<template>
  <main class="factory">
    <header class="hud">
      <h1>Kettlewick Works</h1>
      <template v-if="world">
        <span data-testid="tick">Tick {{ world.tick }}</span>
        <span>Credits {{ world.credits }}</span>
        <span data-testid="cpu" :class="{ limit: world.cpu.used >= world.cpu.limit }">CPU {{ world.cpu.used }}/{{ world.cpu.limit }}</span>
      </template>
      <button class="deploy primary-run" :disabled="pending" @click="deploy('run')">Run</button>
    </header>
    <div class="benches">
      <section aria-label="Factory floor">
        <nav aria-label="Factory clock">
          <button @click="paused = !paused">{{ paused ? 'Resume' : 'Pause' }}</button>
          <button v-for="rate in kettlewick.speeds" :key="rate" :aria-pressed="speed === rate" @click="speed = rate">{{ rate }}x</button>
          <button :disabled="pending" @click="deploy('restart')">Restart</button>
        </nav>
        <template v-if="world">
          <div class="grid" :style="{ gridTemplateColumns: 'repeat(' + world.grid.width + ', 1fr)' }" aria-label="Factory map">
            <div v-for="(labels, i) in cells" :key="i" class="cell" :class="{ occupied: labels.length }">{{ labels.join(' ') }}</div>
          </div>
          <p data-testid="ore">Depot ore {{ world.depot.ore }}</p>
          <p v-for="drone in world.drones" :key="drone.name">{{ drone.name }} · cargo {{ drone.cargo }}/{{ drone.capacity }}</p>
        </template>
      </section>
      <section class="controller" aria-label="Controller">
        <h2>main.ts</h2>
        <div class="editor"><LazyCodeEditor @reference="reference && (reference.open = true)" /></div>
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
      </section>
    </div>
  </main>
</template>

<style scoped>
.factory .hud { display: flex; height: auto; min-height: 64px; flex-wrap: wrap; padding: 10px 16px }
h1 { font-size: 1.2rem }
h2 { font-size: 1rem }
.primary-run { margin-left: auto }
.limit, [role=alert] { color: #ff8888 }
.benches { display: grid; grid-template-columns: 1fr 1fr }
.benches > section { min-width: 0; padding: 12px }
nav { display: flex; flex-wrap: wrap; gap: 4px }
[aria-pressed=true] { border-color: var(--gold); color: var(--gold) }
.grid { display: grid; margin: 1rem 0 }
.cell { min-width: 0; min-height: 34px; padding: 2px; border: 1px solid var(--line); font: 11px var(--mono); overflow-wrap: anywhere }
.occupied { background: var(--accent-surface); color: var(--accent-soft) }
.controller { background: var(--panel) }
.editor { height: 58vh; margin-top: 8px }
.console, .reference { border-top: 1px solid var(--line); padding: 8px 0 }
.console { max-height: 7rem; overflow: auto; font: 12px var(--mono) }
summary { cursor: pointer }
article { padding: 6px 0 }
@media (max-width: 720px) { .benches { grid-template-columns: 1fr } }
</style>
