<script setup lang="ts">
import { declarations, kettlewick, factoryBricks, shop, type World } from '@inherit/sim/v8'
import ChecksPanel from './ChecksPanel.vue'
import { Play } from '@lucide/vue'
import { editorKey } from '../lib/editor'
import { archiveFactorySave, recoverFactorySave, type FactoryCommand, type FactoryFrame, type FactorySave } from '../lib/factoryProtocol'

useHead({ title: 'Kettlewick Works · Inherit' })
const bricks = factoryBricks(kettlewick)
const locked: Record<string, string> = { 'furnace.alloy': 'alloy', prospect: 'prospect' }
const visibleBricks = computed(() => bricks.filter(brick => !locked[brick.name] || world.value?.bought.includes(locked[brick.name]!)))
const api = ref(declarations(bricks.filter(brick => !locked[brick.name])))
const entries = computed(() => visibleBricks.value.map(brick => ({
  name: brick.name, signature: brick.name.includes('.') ? brick.name.split('.')[0] + '.' + brick.signature.replace(/^readonly /, '') : brick.signature,
  description: brick.doc + ' CPU: ' + brick.cost + '.', params: [], returns: '', example: brick.example,
})))
const files = shallowRef({ ...kettlewick.files })
const deployed = shallowRef(kettlewick.files)
const dirty = computed(() => Object.keys(files.value).length !== Object.keys(deployed.value).length ||
  Object.entries(files.value).some(([path, source]) => source !== deployed.value[path]))
const activeFile = ref('main.ts')
const navigation = ref({ file: 'main.ts', line: 1 })
const world = shallowRef<World>()
watch(visibleBricks, list => { api.value = declarations(list) })
const error = ref('')
const saveError = ref('')
const pending = ref(true)
const panels = ['Console', 'API', 'Charts'] as const
const panel = ref<typeof panels[number] | 'Shop'>()
const activeQuest = computed(() => kettlewick.questList?.find(quest => quest.id === world.value?.questId))
const offer = computed(() => world.value && !world.value.questId
  ? kettlewick.questList?.find(quest => !world.value!.cleared.includes(quest.id) && world.value!.level >= quest.needLevel)
  : undefined)
const card = computed(() => activeQuest.value ?? offer.value)
const order = computed(() => world.value?.orders.find(item => item.id === world.value?.questId))
const ready = computed(() => !!activeQuest.value && !!world.value?.checks.length && world.value.checks.every(check => check.status === 'green'))
const checks = computed(() => (world.value?.checks ?? []).map(check => ({ ...check, status: check.status === 'green' ? 'green' as const : 'red' as const })))
const speaker = computed(() => card.value)
const headline = computed(() => card.value?.title ?? (world.value?.cleared.length ? 'More is coming' : 'Kettlewick Works'))
const bubble = computed(() => card.value?.goal ?? world.value?.growth.at(-1) ?? '')
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
let preserveSlot = false
function persist() {
  if (preserveSlot || !world.value || resetting) return
  try {
    localStorage.setItem(saveKey, JSON.stringify({
      version: 3, world: world.value, deployed: deployed.value, files: files.value, activeFile: activeFile.value,
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
  preserveSlot = false
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

onMounted(async () => {
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
    const recovery = recoverFactorySave(stored)
    if (recovery.kind === 'resume') {
      files.value = recovery.save.files
      deployed.value = recovery.save.deployed
      activeFile.value = Object.hasOwn(recovery.save.files, recovery.save.activeFile) ? recovery.save.activeFile : 'main.ts'
      navigation.value = { file: activeFile.value, line: 1 }
      send({ kind: 'restart', files: recovery.save.deployed, saved: recovery.save.world })
    } else if (recovery.kind === 'missing') send({ kind: 'restart', files: kettlewick.files })
    else {
      await archiveFactorySave(localStorage, stored!)
      if (recovery.kind === 'files') {
        files.value = recovery.files
        deployed.value = recovery.deployed
        activeFile.value = recovery.activeFile
        navigation.value = { file: activeFile.value, line: 1 }
        saveError.value = 'The saved works could not be restored. Your files are still here.'
        send({ kind: 'restart', files: recovery.deployed })
      } else {
        preserveSlot = true
        error.value = 'Could not restore the saved works. Use Start over in Settings to reset them.'
        pending.value = false
      }
    }
  } catch {
    preserveSlot = true
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
            <span class="tick" data-testid="level">Level <b>{{ world.level }}</b></span>
            <span class="tick" data-testid="cpu">CPU <b>{{ world.cpu.used }}/{{ world.cpu.limit }}</b></span>
          </div>
        </template>
        <template #settings="{ close }">
          <button v-for="name in panels" :key="name" :aria-pressed="panel === name"
            @click="panel = panel === name ? undefined : name; close()">{{ name }}</button>
          <button :disabled="pending" @click="close(); startOver()">Start over</button>
        </template>
      </PackNav>
      <button class="shop-open" type="button" :aria-pressed="panel === 'Shop'" @click="panel = panel === 'Shop' ? undefined : 'Shop'">Shop</button>
      <button v-if="dirty" class="deploy primary-run" aria-label="Deploy" :disabled="pending || !world" @click="deploy"><Play /> Deploy <kbd>Ctrl+Enter</kbd></button>
      <span v-else class="live" :class="{ off: !world }"><i />{{ world ? 'Running' : error ? 'Offline' : 'Starting' }}</span>
    </template>
    <template #floor>
      <section class="objective" aria-label="Current request">
        <div class="goal-body">
          <h2>{{ headline }}</h2>
          <p v-if="card" class="goal">{{ card.goal }}</p>
          <p v-if="saveError" class="next bad">{{ saveError }}</p>
          <p class="next" :class="{ bad: !!error }">{{ error || card?.why || world?.status || 'Uncle Ambrose left you the works.' }}</p>
        </div>
        <div class="goal-aside">
          <template v-if="order"><b>{{ order.shipped }}/{{ order.qty }}</b><span>{{ order.item }}s</span></template>
          <button v-if="offer" class="gold" type="button" data-testid="take-quest" @click="send({ kind: 'accept' })">Take quest</button>
          <button v-if="ready" class="gold" type="button" data-testid="complete-quest" @click="send({ kind: 'complete' })">Complete quest</button>
        </div>
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
      <ChecksPanel v-if="world?.questId" :tried="true" :checks="checks" />
      <section v-if="panel === 'Console'" aria-label="Console" class="console">
        <h2>Console · Tick <b data-testid="tick">{{ world?.tick }}</b></h2>
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-for="msg in world?.messages.slice().reverse()" :key="msg.tick">Tick {{ msg.tick }} · {{ msg.text }}</p>
      </section>
      <ApiReference v-if="panel === 'API'" :entries="entries" />
      <section v-if="panel === 'Shop'" aria-label="Shop" class="shop">
        <h2>Shop</h2>
        <button v-for="item in shop" :key="item.id" type="button" :disabled="world?.bought.includes(item.id) || (world?.credits ?? 0) < item.price"
          @click="send({ kind: 'buy', id: item.id })">
          <b>{{ item.name }}</b> · {{ item.price }} cr
          <span>{{ world?.bought.includes(item.id) ? 'Owned' : item.detail }}</span>
        </button>
      </section>
    </template>
    <template #status>
      <template v-if="world">
        <span>Depot ore {{ world.depot.ore }}</span>
        <span data-testid="ore">Furnace ore {{ world.furnace.input }}</span>
        <span>Ingots {{ world.furnace.output }}</span>
        <span>Coal {{ world.furnace.coal }}</span>
        <span>Steel {{ world.furnace.steel }}</span>
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
.factory :deep(.editor-dock > .checks) { grid-column: 2; grid-row: 2; border-top: 1px solid var(--line) }
.factory :deep(.editor-dock > .console),
.factory :deep(.editor-dock > .reference),
.factory :deep(.editor-dock > .shop) { grid-column: 2; grid-row: 3 }
.shop { border-top: 1px solid var(--line); padding: 8px 12px; display: grid; gap: 6px }
.shop button { text-align: left; background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px }
.shop button span { display: block; color: var(--soft); font-size: 12px }
.shop button:disabled { opacity: 0.55 }
.shop-open { background: transparent; color: var(--text); border: 1px solid var(--line); border-radius: 5px; height: 34px; padding: 0 12px }
.goal { margin: 2px 0 4px; color: var(--text) }
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
