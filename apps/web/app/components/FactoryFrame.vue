<script setup lang="ts">
import { declarations, kettlewick, factoryBricks, type World } from '@inherit/sim/v8'
import { Play } from '@lucide/vue'
import { editorKey } from '../lib/editor'
import type { FactoryCommand, FactoryFrame, FactorySave } from '../lib/factoryProtocol'

useHead({ title: 'Kettlewick Works · Inherit' })
const bricks = factoryBricks(kettlewick)
const api = ref(declarations(bricks))
const entries = bricks.map(b => ({
  name: b.name, signature: b.name.includes('.') ? b.name.split('.')[0] + '.' + b.signature.replace(/^readonly /, '') : b.signature,
  description: b.doc + ' CPU: ' + b.cost + '.', params: [], returns: '', example: b.example,
}))
const files = shallowRef({ ...kettlewick.files })
const deployed = shallowRef(kettlewick.files)
const dirty = computed(() => Object.keys(files.value).length !== Object.keys(deployed.value).length ||
  Object.entries(files.value).some(([path, source]) => source !== deployed.value[path]))
const activeFile = ref('main.ts')
const navigation = ref({ file: 'main.ts', line: 1 })
const world = shallowRef<World>()
const error = ref('')
const saveError = ref('')
const pending = ref(true)
const panels = ['Console', 'API', 'Charts'] as const
const panel = ref<typeof panels[number]>()
const order = computed(() => world.value?.orders.find(o => o.status === 'open' || o.status === 'overdue'))
const speaker = computed(() => order.value ?? world.value?.orders.at(-1))
const headline = computed(() => order.value?.title ?? world.value?.growth.at(-1) ?? (world.value ? 'Kettlewick is quiet' : 'Kettlewick Works'))
const bubble = computed(() => {
  const ask = speaker.value
  if (!ask) return ''
  return ask.status === 'open' || ask.status === 'overdue' ? ask.text : ask.change
})
const earlier = computed(() => world.value?.growth.filter(line => line !== bubble.value).at(-1))
const saveKey = 'inherit.v8.' + kettlewick.id
let worker: Worker | undefined
let resetting = false

provide(editorKey, {
  id: kettlewick.id, label: 'Player TypeScript', files, deployed, activeFile, api,
  apiNames: shallowRef(new Set(bricks.map(b => b.name.split('.').at(-1)!))),
  dirty, multiFile: ref(true), navigation, watching: ref(false), call: ref(), tickCalls: ref([]),
  setFile(file, code) { files.value = { ...files.value, [file]: code } },
  openFile(file) { activeFile.value = file },
})

function send(command: FactoryCommand) { worker?.postMessage(command) }
function visibility() { send({ kind: 'visibility', visible: !document.hidden }) }
function persist() {
  if (!world.value || resetting) return
  try {
    localStorage.setItem(saveKey, JSON.stringify({
      version: 2, world: world.value, deployed: deployed.value, files: files.value, activeFile: activeFile.value,
    } satisfies FactorySave))
    saveError.value = ''
  } catch { saveError.value = 'Could not save the works in this browser.' }
}
watch([files, activeFile, world, deployed], persist)

function deploy() {
  if (!world.value || pending.value || !dirty.value) return
  pending.value = true
  error.value = ''
  send({ kind: 'run', files: files.value })
}
function startOver() {
  if (!window.confirm('Start over at Kettlewick? This replaces your saved works and all project files.')) return
  resetting = true
  pending.value = true
  error.value = ''
  send({ kind: 'restart', files: kettlewick.files })
}
function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    if (!event.repeat) deploy()
  }
}

onMounted(() => {
  worker = new Worker(new URL('../lib/factory.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<FactoryFrame>) => {
    if ('error' in data) {
      error.value = data.error
      pending.value = resetting = false
      return
    }
    world.value = data.world
    if (data.deployed) {
      deployed.value = data.deployed
      if (resetting) {
        files.value = { ...data.deployed }
        activeFile.value = 'main.ts'
        panel.value = undefined
        resetting = false
      }
      pending.value = false
    }
  }
  worker.onerror = () => {
    pending.value = false
    error.value = 'Could not load the factory. Reload to try again.'
  }
  try {
    const stored = localStorage.getItem(saveKey)
    const save: FactorySave | undefined = stored === null ? undefined : JSON.parse(stored)
    const usable = !!save && save.version === 2 && Number.isSafeInteger(save.world.tick) &&
      Array.isArray(save.world.ledger?.payouts) && Array.isArray(save.world.growth) &&
      typeof save.files['main.ts'] === 'string' && typeof save.deployed['main.ts'] === 'string'
    if (!usable) send({ kind: 'restart', files: kettlewick.files })
    else {
      files.value = save.files
      deployed.value = save.deployed
      activeFile.value = Object.hasOwn(save.files, save.activeFile) ? save.activeFile : 'main.ts'
      navigation.value = { file: activeFile.value, line: 1 }
      send({ kind: 'restart', files: save.deployed, saved: save.world })
    }
  } catch {
    error.value = 'Could not restore the saved works. Use Start over in Settings to reset them.'
    pending.value = false
  }
  visibility()
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', persist)
  window.addEventListener('keydown', shortcut, true)
})
onBeforeUnmount(() => {
  persist()
  worker?.terminate()
  document.removeEventListener('visibilitychange', visibility)
  window.removeEventListener('pagehide', persist)
  window.removeEventListener('keydown', shortcut, true)
})
</script>

<template>
  <StudioShell class="factory" :dock="58">
    <template #nav>
      <PackNav>
        <strong class="pack-switch">Kettlewick Works</strong>
        <template #clock>
          <div v-if="world" class="clock">
            <p class="balance" data-testid="credits"><b>{{ world.credits }}</b><span>credits</span></p>
            <span class="tick">{{ Math.round(world.creditsPerMinute) }} / min</span>
            <span class="tick" data-testid="cpu">CPU <b>{{ world.cpu.used }}/{{ world.cpu.limit }}</b></span>
          </div>
        </template>
        <template #settings="{ close }">
          <button v-for="name in panels" :key="name" :aria-pressed="panel === name"
            @click="panel = panel === name ? undefined : name; close()">{{ name }}</button>
          <button :disabled="pending" @click="close(); startOver()">Start over</button>
        </template>
      </PackNav>
      <button v-if="dirty" class="deploy primary-run" aria-label="Deploy" :disabled="pending || !world" @click="deploy"><Play /> Deploy <kbd>Ctrl+Enter</kbd></button>
      <span v-else class="live" :class="{ off: !world }"><i />{{ world ? 'Running' : error ? 'Offline' : 'Starting' }}</span>
    </template>
    <template #floor>
      <section class="objective" aria-label="Current request">
        <div class="goal-body">
          <h2>{{ headline }}</h2>
          <p class="next" :class="{ bad: error || saveError }">{{ error || saveError || world?.status || 'Uncle Ambrose left you the works. Bram is waiting.' }}</p>
        </div>
        <div v-if="order" class="goal-aside"><b>{{ order.shipped }}/{{ order.qty }}</b><span>ingots</span></div>
      </section>
      <VillageAsk v-if="speaker" :who="speaker.who" :name="speaker.from" :role="speaker.role" :building-id="speaker.building" :text="bubble" :done="earlier" />
      <template v-if="world">
        <div class="map-frame"><LazyFactoryFloor :world="world" :paused="false" :interval="kettlewick.tickMs" /></div>
        <MetricsPanel v-show="panel === 'Charts'" :world="world" />
      </template>
    </template>
    <template #editor>
      <FileTree v-model:files="files" v-model:active-file="activeFile" />
      <div class="editor-pane"><div class="editor-host"><LazyCodeEditor @reference="panel = 'API'" /></div></div>
      <section v-if="panel === 'Console'" aria-label="Console" class="console">
        <h2>Console · Tick <b data-testid="tick">{{ world?.tick }}</b></h2>
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-for="msg in world?.messages.slice().reverse()" :key="msg.tick">Tick {{ msg.tick }} · {{ msg.text }}</p>
      </section>
      <ApiReference v-if="panel === 'API'" :entries="entries" />
    </template>
    <template #status>
      <template v-if="world">
        <span>Depot ore {{ world.depot.ore }}</span>
        <span data-testid="ore">Furnace ore {{ world.furnace.input }}</span>
        <span>Ingots {{ world.furnace.output }}</span>
        <span v-for="drone in world.drones" :key="drone.name">{{ drone.name }} · cargo {{ drone.cargo }}/{{ drone.capacity }}</span>
        <span>Income {{ world.ledger.income }} cr</span>
      </template>
    </template>
  </StudioShell>
</template>

<style scoped>
.map-frame { flex: 1; min-height: 150px; position: relative }
.factory :deep(.pack-settings) { z-index: 1 }
.factory :deep(.editor-dock) {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
}
.factory :deep(.editor-dock > .tree) { grid-column: 1; grid-row: 1 / -1 }
.factory :deep(.editor-dock > .editor-pane) { grid-column: 2; grid-row: 1; height: 100%; min-height: 0 }
.factory :deep(.editor-dock > .console),
.factory :deep(.editor-dock > .reference) { grid-column: 2 }
.objective { margin-bottom: 8px }
.balance { display: flex; align-items: baseline; gap: 6px; color: var(--text) }
.balance b { font-size: 22px; letter-spacing: -0.6px; line-height: 1 }
.balance span { font: 12px var(--mono); color: var(--soft) }
.bad { color: var(--alert) }
.console, .reference { border-top: 1px solid var(--line); padding: 6px 12px; overflow: auto; max-height: 30% }
.console { font: 12px var(--mono) }
.console h2 { font-size: 13px }
.factory :deep(.editor-dock > .editor-pane) { flex: 1 }
@media (prefers-reduced-motion: no-preference) { .live:not(.off) i { animation: guide 1.5s ease-in-out infinite } }
@media(max-width:800px) {
  .live { grid-column: 3; grid-row: 1; justify-self: end }
  .factory :deep(.editor-dock) { grid-template-columns: minmax(0, 1fr) }
  .factory :deep(.editor-dock > .tree) {
    grid-column: 1;
    grid-row: 1;
    max-height: 140px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .factory :deep(.editor-dock > .editor-pane) { grid-row: 2 }
}
</style>
