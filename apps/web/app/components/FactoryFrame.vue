<script setup lang="ts">
import { declarations, kettlewick, factoryBricks, shop, levelSpan, readChecks, nextUnlock, repeatedLabel, type World } from '@inherit/sim/v8'
import ChecksPanel from './ChecksPanel.vue'
import { Play } from '@lucide/vue'
import { editorKey } from '../lib/editor'
import { archiveFactorySave, recoverFactorySave, type FactoryCommand, type FactoryFrame, type FactorySave } from '../lib/factoryProtocol'
import {
  checksPanePx, clampMapHeight, creditSuffix, defaultMapHeight, editorHeaderPx, filesStorageKey, fileTreePx, mapHeightKey,
  questRailPx, readFilesOpen, readMapHeight, readSideTab, sideTabKey, treeRailPx, worldGapPx, worldInsetPx,
} from '../lib/factoryLayout'

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
const floorError = ref('')
const pending = ref(true)
const panels = ['API', 'Charts'] as const
const tool = ref<typeof panels[number]>()
const side = ref<'checks' | 'console'>('checks')
const seenSeq = ref(0)
const blankConsole = ref(false)
const zone = ref<'quests' | 'shop'>('quests')
const questRailCss = questRailPx + 'px'
const worldGapCss = worldGapPx + 'px'
const worldInsetCss = worldInsetPx + 'px'
const headerCss = editorHeaderPx + 'px'
const checksPaneCss = checksPanePx + 'px'
const filesOpen = ref(false)
const mapHeight = ref(defaultMapHeight())
const treeColumnCss = computed(() => (filesOpen.value ? fileTreePx : treeRailPx) + 'px')
const mapRowCss = computed(() => mapHeight.value + '%')
let filesReady = false
let sideReady = false
watch(filesOpen, (open) => {
  if (!filesReady) return
  try { localStorage.setItem(filesStorageKey, open ? 'open' : 'closed') }
  catch { /* Keep the choice for this session. */ }
})
watch(side, (tab) => {
  if (!sideReady) return
  try { localStorage.setItem(sideTabKey, tab) }
  catch { /* Keep the choice for this session. */ }
})
function setMapHeight(value: number) {
  mapHeight.value = clampMapHeight(value)
  try { localStorage.setItem(mapHeightKey, String(Math.round(mapHeight.value * 10) / 10)) }
  catch { /* Keep the height for this session. */ }
}
function resizeMap(event: PointerEvent) {
  const stage = (event.currentTarget as HTMLElement).parentElement
  if (!stage) return
  const el = event.currentTarget as HTMLElement
  el.setPointerCapture(event.pointerId)
  const move = (e: PointerEvent) => {
    const rect = stage.getBoundingClientRect()
    if (rect.height < 1) return
    setMapHeight(((e.clientY - rect.top) / rect.height) * 100)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('lostpointercapture', () => el.removeEventListener('pointermove', move), { once: true })
}
const hintOpen = ref(true)
const activeQuest = computed(() => kettlewick.questList?.find(quest => quest.id === world.value?.questId))
const offers = computed(() => {
  const current = world.value
  if (!current || current.questId) return []
  return (kettlewick.questList ?? []).filter(quest => !current.cleared.includes(quest.id) && current.level >= quest.needLevel)
})
const shown = computed(() => activeQuest.value ? [activeQuest.value] : offers.value)
const order = computed(() => world.value?.orders.find(item => item.id === world.value?.questId))
const ready = computed(() => !!activeQuest.value && !!world.value?.checks.length && world.value.checks.every(check => check.status === 'green'))
const passedChecks = computed(() => world.value?.checks.filter(check => check.status === 'green').length ?? 0)
const readings = computed(() => {
  const quest = activeQuest.value
  const current = world.value
  if (!quest || !current?.questId) return []
  return readChecks(current, quest)
})
const checks = computed(() => readings.value.map(check => ({
  id: check.id,
  text: check.text,
  status: check.state === 'passing' ? 'green' as const : 'red' as const,
  mark: check.state,
  reason: check.reason,
})))
const upcoming = computed(() => {
  const id = shown.value[0]?.id
  if (!id || !kettlewick.questList) return []
  const index = kettlewick.questList.findIndex(quest => quest.id === id)
  return kettlewick.questList.slice(index + 1, index + 4)
})
const unlock = computed(() => nextUnlock(world.value?.level ?? 1))
const pulse = ref(false)
let pulseTimer = 0
watch(ready, (value, previous) => {
  if (!value || previous) return
  pulse.value = true
  window.clearTimeout(pulseTimer)
  pulseTimer = window.setTimeout(() => { pulse.value = false }, 700)
})
const gains = ref<{ id: number; text: string; kind: 'credits' | 'xp' }[]>([])
let gainSerial = 0
let gainTimer = 0
watch(world, (next, previous) => {
  if (!next || !previous || !previous.questId || next.questId) return
  const earned = next.credits - previous.credits
  const xpGain = next.xp - previous.xp
  if (earned <= 0 && xpGain <= 0) return
  const batch: { id: number; text: string; kind: 'credits' | 'xp' }[] = []
  if (earned > 0) batch.push({ id: ++gainSerial, text: `+${earned} credits`, kind: 'credits' })
  if (xpGain > 0) batch.push({ id: ++gainSerial, text: `+${xpGain} XP`, kind: 'xp' })
  gains.value = batch
  window.clearTimeout(gainTimer)
  gainTimer = window.setTimeout(() => { gains.value = [] }, 1200)
})
const log = computed(() => {
  const lines: { text: string; file?: string; line?: number; bad?: boolean }[] = []
  if (error.value) lines.push({ text: error.value, bad: true })
  if (saveError.value) lines.push({ text: saveError.value, bad: true })
  if (floorError.value) lines.push({ text: floorError.value, bad: true })
  const current = world.value
  if (current?.status.startsWith('CPU')) lines.push({ text: current.status, bad: true })
  for (const message of [...(current?.messages ?? [])].reverse()) {
    lines.push({ text: repeatedLabel(message.text, message.count), file: message.file, line: message.line, bad: true })
  }
  return lines
})
const consoleLines = computed(() => blankConsole.value ? [] : (world.value?.console ?? []))
const unseen = computed(() => {
  if (side.value === 'console') return { count: 0, error: false }
  const fresh = (world.value?.console ?? []).filter(line => line.seq > seenSeq.value)
  return { count: fresh.length, error: fresh.some(line => line.level === 'error') }
})
watch([side, world], () => {
  if (blankConsole.value && (world.value?.console.length ?? 0) === 0) blankConsole.value = false
  if (side.value !== 'console') return
  const last = world.value?.console?.at(-1)?.seq ?? 0
  if (last > seenSeq.value) seenSeq.value = last
})
function clearLog() {
  blankConsole.value = true
  seenSeq.value = 0
  send({ kind: 'clear-console' })
}
function openLine(entry: { file: string; line: number }) {
  activeFile.value = entry.file
  navigation.value = { file: entry.file, line: entry.line }
}
const xp = computed(() => {
  const value = world.value?.xp ?? 0
  const span = levelSpan(value)
  if (span.next === null) return { width: '100%', label: `XP ${value}`, title: `Level ${span.level}` }
  const into = value - span.start
  const size = span.next - span.start
  return { width: `${Math.min(100, (into / size) * 100)}%`, label: `XP ${into}/${size}`, title: `${into} / ${size} XP` }
})
function hintSteps(why: string) {
  return why.split(/(?<=\.)\s+/).map(step => step.trim()).filter(Boolean)
}
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
  let storedFiles: string | null = null
  let storedMap: string | null = null
  let storedSide: string | null = null
  try {
    storedFiles = localStorage.getItem(filesStorageKey)
    storedMap = localStorage.getItem(mapHeightKey)
    storedSide = localStorage.getItem(sideTabKey)
  } catch { /* Use the defaults. */ }
  filesOpen.value = readFilesOpen(storedFiles, window.innerWidth)
  mapHeight.value = readMapHeight(storedMap)
  side.value = readSideTab(storedSide)
  filesReady = true
  sideReady = true
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
        tool.value = undefined
        zone.value = 'quests'
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
  <StudioShell class="factory">
    <template #nav>
      <PackNav>
        <strong class="pack-switch">Kettlewick Works</strong>
        <template #clock>
          <div v-if="world" class="clock">
            <p class="balance" data-testid="credits"><b>{{ world.credits }}</b>{{ creditSuffix }}</p>
            <div class="xp" data-testid="level">
              <span class="tick">Level <b>{{ world.level }}</b></span>
              <span class="xp-bar" :title="xp.title"><i :style="{ width: xp.width }" /></span>
              <span class="tick">{{ xp.label }}</span>
            </div>
            <span class="tick" data-testid="cpu">CPU <b>{{ world.cpu.used }}/{{ world.cpu.limit }}</b></span>
            <span class="live"><i />Running</span>
            <span v-for="gain in gains" :key="gain.id" class="gain" :class="gain.kind">{{ gain.text }}</span>
          </div>
          <span v-else class="live off"><i />{{ error ? 'Offline' : 'Starting' }}</span>
        </template>
        <template #settings="{ close }">
          <button v-for="name in panels" :key="name" :aria-pressed="tool === name"
            @click="tool = tool === name ? undefined : name; close()">{{ name }}</button>
          <button :disabled="pending" @click="close(); startOver()">Start over</button>
        </template>
      </PackNav>
    </template>
    <template #floor>
      <section class="quest-zone" aria-label="Current request">
        <nav class="zone-tabs" aria-label="Quest and shop">
          <button type="button" :aria-pressed="zone === 'quests'" @click="zone = 'quests'">Quests</button>
          <button type="button" :aria-pressed="zone === 'shop'" @click="zone = 'shop'">Shop</button>
        </nav>
        <div class="quest-scroll">
          <template v-if="zone === 'quests'">
            <article v-for="quest in shown" :key="quest.id" class="quest">
              <VillageAsk :who="quest.who" :name="quest.from" :role="quest.role" :building-id="quest.building" />
              <div class="goal-body">
                <h2>{{ quest.title }}</h2>
                <p class="goal">{{ quest.goal }}</p>
              </div>
              <div class="lesson">
                <button class="hint" type="button" :aria-expanded="hintOpen" @click="hintOpen = !hintOpen">Hint</button>
                <ol v-if="hintOpen">
                  <li v-for="step in hintSteps(quest.why)" :key="step">{{ step }}</li>
                </ol>
              </div>
              <p class="reward"><b>{{ quest.pay }}</b> credits · <b>{{ quest.xp }}</b> XP</p>
              <p class="quote">{{ quest.quote }}</p>
              <p v-if="order && quest.id === world?.questId" class="progress"><b>{{ order.shipped }}/{{ order.qty }}</b> {{ order.item }}</p>
              <div v-if="upcoming.length" class="next">
                <span>Next</span>
                <ol>
                  <li v-for="item in upcoming" :key="item.id">{{ item.title }}</li>
                </ol>
              </div>
              <p v-if="unlock" class="unlock">Level {{ unlock.level }} unlocks: {{ unlock.items.join(', ') }}</p>
            </article>
            <div v-if="!shown.length" class="quest">
              <h2>{{ world?.cleared.length ? 'More is coming' : 'Kettlewick Works' }}</h2>
              <p v-if="!world" class="goal">Uncle Ambrose left you the works.</p>
            </div>
          </template>
          <ul v-else class="shop-list">
            <li v-for="item in shop" :key="item.id">
              <button type="button" :disabled="!world || world.bought.includes(item.id) || world.credits < item.price"
                @click="send({ kind: 'buy', id: item.id })">
                <b>{{ item.name }}</b>
                <span>{{ world?.bought.includes(item.id) ? 'Owned' : item.price + ' credits' }}</span>
                <small>{{ item.detail }}</small>
              </button>
            </li>
          </ul>
        </div>
        <div v-if="zone === 'quests' && (activeQuest || offers.length)" class="quest-action">
          <button v-if="offers.length" class="gold" type="button" data-testid="take-quest" @click="send({ kind: 'accept' })">Take quest</button>
          <button v-else class="gold" :class="{ pulse }" type="button" data-testid="complete-quest" :disabled="!ready" @click="send({ kind: 'complete' })">{{ ready ? 'Complete quest' : `Complete · ${passedChecks}/${world?.checks.length ?? 0}` }}</button>
        </div>
      </section>
      <div class="stage">
        <div class="map-frame">
          <LazyFactoryFloor v-if="world" :world="world" :paused="false" :interval="kettlewick.tickMs" @error="floorError = $event" />
        </div>
        <div class="row-split" role="separator" tabindex="0" aria-orientation="horizontal" aria-label="Resize map" @pointerdown="resizeMap" @keydown.up.prevent="setMapHeight(mapHeight - 2)" @keydown.down.prevent="setMapHeight(mapHeight + 2)" />
        <div class="editor-bay">
          <FileTree id="project-files" v-model:open="filesOpen" v-model:files="files" v-model:active-file="activeFile" />
          <div class="editor-column">
            <div class="editor-pane"><div class="editor-host">
              <LazyCodeEditor @reference="tool = 'API'">
                <template #actions>
                  <button class="deploy" type="button" aria-label="Deploy" :data-dirty="dirty ? 'true' : 'false'" :disabled="pending || !world" @click="deploy">
                    <Play /> Deploy <kbd>Ctrl+Enter</kbd>
                  </button>
                </template>
              </LazyCodeEditor>
            </div></div>
            <div v-if="tool" class="tool-slot">
              <ApiReference v-if="tool === 'API'" :entries="entries" />
              <MetricsPanel v-else-if="world" :world="world" />
            </div>
          </div>
          <aside class="checks-pane" :aria-label="side === 'checks' ? 'Quest checks' : 'Console'">
            <div class="checks-head" role="tablist" aria-label="Checks and console">
              <button type="button" role="tab" :aria-selected="side === 'checks'" @click="side = 'checks'">Checks</button>
              <button type="button" role="tab" :aria-selected="side === 'console'" @click="side = 'console'">
                Console
                <span v-if="unseen.count" class="badge" :class="{ bad: unseen.error }">{{ unseen.count }}</span>
              </button>
              <template v-if="side === 'console'">
                <button type="button" class="clear" @click="clearLog">Clear</button>
                <span class="tick-now">Tick <b data-testid="tick">{{ world?.tick ?? 0 }}</b></span>
              </template>
            </div>
            <ChecksPanel v-if="side === 'checks'" :tried="!!world?.questId" :checks="world?.questId ? checks : []" :log="log" empty="Take a quest to see checks" @open="openLine" />
            <section v-else class="console" aria-label="Console">
              <p v-if="!consoleLines.length" class="empty">Nothing logged yet.</p>
              <template v-for="line in consoleLines" :key="line.seq">
                <button v-if="line.file && line.line" type="button" class="line" :class="line.level" @click="openLine({ file: line.file, line: line.line })">
                  <span class="when">{{ line.tick }}</span>
                  <span class="text">{{ repeatedLabel(line.text, line.count) }}</span>
                  <span class="where">{{ line.file }}:{{ line.line }}</span>
                </button>
                <p v-else class="line" :class="line.level">
                  <span class="when">{{ line.tick }}</span>
                  <span class="text">{{ repeatedLabel(line.text, line.count) }}</span>
                </p>
              </template>
            </section>
          </aside>
        </div>
      </div>
    </template>
    <template #status>
      <span v-if="world" class="meters">
        <span>Depot ore {{ world.depot.ore }}</span>
        <span>Depot coal {{ world.depot.coal ?? 0 }}</span>
        <span data-testid="ore">Furnace ore {{ world.furnace.input }}</span>
        <span>Furnace coal {{ world.furnace.coal }}</span>
        <span>Ingots {{ world.furnace.output }}</span>
        <span>Steel {{ world.furnace.steel }}</span>
        <span v-for="drone in world.drones" :key="drone.name">{{ drone.name }} {{ drone.carrying ?? 'empty' }} {{ drone.cargo }}/{{ drone.capacity }}</span>
      </span>
    </template>
  </StudioShell>
</template>

<style scoped>
.factory :deep(.desk) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.factory :deep(.desk > .resizer),
.factory :deep(.desk > .editor-dock) {
  display: none;
}
.factory :deep(.world-shell) {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 1 1 auto;
  gap: v-bind(worldGapCss);
  padding: v-bind(worldInsetCss);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.stage {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.map-frame {
  position: relative;
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: v-bind(mapRowCss);
  min-width: 0;
  min-height: 0;
  border-radius: 7px;
  overflow: hidden;
}
.row-split {
  flex: 0 0 7px;
  cursor: row-resize;
  background: var(--base);
  touch-action: none;
  border: 1px solid var(--line);
}
.row-split:hover { background: var(--accent-line); }
.editor-bay {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: v-bind(treeColumnCss) minmax(0, 1fr) v-bind(checksPaneCss);
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  background: var(--surface-low);
  border: 1px solid var(--line);
  border-radius: 7px;
}
.editor-bay :deep(.tree) { grid-column: 1; grid-row: 1; height: 100%; min-height: 0 }
.quest-zone {
  width: v-bind(questRailCss);
  flex: 0 0 v-bind(questRailCss);
  align-self: stretch;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(102deg, var(--accent-surface), var(--accent-surface) 70%);
  border: 1px solid var(--accent-line);
  border-radius: 7px;
  box-shadow: 0 3px 7px var(--shadow-light);
}
.zone-tabs {
  display: flex;
  gap: 4px;
  flex: none;
  padding: 12px 12px 0;
}
.zone-tabs button {
  flex: 1;
  min-height: 28px;
  background: transparent;
  color: var(--soft);
  border-color: var(--accent-line);
  font: 12px var(--mono);
}
.zone-tabs button[aria-pressed='true'] {
  background: var(--accent-shadow);
  color: var(--accent-soft);
  border-color: var(--gold);
}
.quest-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 10px 12px;
}
.quest { display: grid; gap: 12px; min-width: 0 }
.quest-zone h2 {
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: -0.4px;
  margin: 0;
}
.goal { font-size: 13px; line-height: 1.4 }
.lesson {
  border-top: 1px solid var(--accent-line);
  padding-top: 9px;
  display: grid;
  gap: 8px;
  justify-items: start;
}
.lesson ol {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: 13px;
  line-height: 1.45;
}
.reward, .progress { margin: 0; font: 13px var(--mono); color: var(--accent-soft) }
.reward b, .progress b { color: var(--text); letter-spacing: 0.5px }
.quest-action {
  flex: none;
  margin-top: auto;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--accent-line);
}
.quest-action .gold { width: 100%; height: 34px }
.quest-action .gold:disabled { opacity: 0.45 }
.quest-action .gold.pulse { animation: quest-ready 0.7s ease-out 1 }
@keyframes quest-ready {
  0% { transform: scale(1) }
  40% { transform: scale(1.04) }
  100% { transform: scale(1) }
}
.quote { margin: 0; color: var(--soft); font-size: 13px; line-height: 1.4 }
.next { display: grid; gap: 4px }
.next > span { font: 11px var(--mono); color: var(--sub); letter-spacing: 0.4px }
.next ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px }
.next li {
  color: var(--sub);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 12px;
}
.unlock { margin: 0; font: 12px var(--mono); color: var(--sub) }
.clock { position: relative }
.gain {
  position: absolute;
  top: 0;
  z-index: 2;
  color: var(--gold);
  font: 700 12px var(--mono);
  pointer-events: none;
  animation: rise 1.1s ease-out;
}
.gain.credits { left: 0 }
.gain.xp { left: 112px }
@keyframes rise { to { transform: translateY(-14px) } }
.shop-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.shop-list button {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  justify-content: stretch;
  justify-items: start;
  gap: 2px 8px;
  text-align: left;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 8px;
}
.shop-list button span { justify-self: end; color: var(--accent-soft); font: 13px var(--mono) }
.shop-list button small { grid-column: 1 / -1; color: var(--soft); font-size: 12px; font-weight: 400 }
.balance b { font-variant-numeric: tabular-nums }
.xp { display: grid; gap: 4px; min-width: 92px }
.xp-bar {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: var(--accent-shadow);
  overflow: hidden;
}
.xp-bar i { display: block; height: 100%; background: var(--gold) }
.editor-column {
  --editor-header: v-bind(headerCss);
  grid-column: 2;
  grid-row: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.editor-column :deep(.project-tabs) {
  height: v-bind(headerCss);
  min-height: v-bind(headerCss);
  align-items: center;
  padding: 0 6px 0 0;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  flex-wrap: nowrap;
}
.editor-column :deep(.project-tabs .tab) { min-width: 0 }
.editor-column :deep(.project-tabs .tab button) {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.editor-column :deep(.deploy) {
  height: 26px;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  padding: 0 10px;
  border-radius: 5px;
  white-space: nowrap;
}
.editor-column :deep(.deploy kbd) {
  font: 10px var(--mono);
  padding: 1px 4px;
  border: 1px solid currentColor;
  border-radius: 3px;
}
.editor-column :deep(.finder) { top: v-bind(headerCss) }
.checks-pane {
  grid-column: 3;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--line);
  background: var(--panel);
}
.checks-head {
  flex: none;
  height: v-bind(headerCss);
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--line);
  font: 700 12px var(--mono);
  color: var(--text);
}
.checks-head button[role="tab"] {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--sub);
  font: inherit;
  padding: 0 10px;
}
.checks-head button[aria-selected="true"] {
  color: var(--text);
  border-bottom-color: var(--gold);
}
.checks-head .badge {
  margin-left: 4px;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--sub);
  color: var(--panel);
  font: 700 10px var(--mono);
}
.checks-head .badge.bad { background: var(--alert); color: #fff }
.checks-head .clear {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--sub);
  font: 11px var(--mono);
  padding: 0 8px;
}
.checks-head .tick-now {
  display: flex;
  align-items: center;
  margin-right: 8px;
  color: var(--sub);
  font: 11px var(--mono);
  font-weight: 500;
}
.checks-pane :deep(.checks) {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 10px;
}
.tool-slot {
  flex: none;
  max-height: 30%;
  overflow: auto;
  border-top: 1px solid var(--line);
  background: var(--surface-low);
  padding: 6px 12px;
}
.tool-slot :deep(.bench) { padding: 0; max-height: none }
.console {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 8px;
  font: 12px var(--mono);
}
.console .empty { margin: 0; color: var(--sub) }
.console .line {
  display: grid;
  grid-template-columns: 2.4em minmax(0, 1fr) auto;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
}
.console .line.error, .console .line.warn { color: var(--alert) }
.console .text { min-width: 0; white-space: normal }
.console .where { color: var(--sub) }
.notice { display: block; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.notice.bad { color: var(--alert) }
.meters { margin-left: auto }
@media (max-width: 800px) {
  .factory :deep(.hud) {
    display: flex;
    flex-wrap: wrap;
    height: auto;
    gap: 8px 12px;
  }
  .factory :deep(.world-shell) {
    flex-direction: column;
    height: auto;
    min-height: clamp(480px, 66dvh, 720px);
  }
  .quest-zone { flex: none; width: auto; max-height: 42% }
  .stage { width: 100%; min-height: 320px; flex: 1 1 auto; }
  .map-frame { min-height: 140px; }
  .editor-bay {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) minmax(72px, 28%);
  }
  .editor-bay :deep(.tree) {
    grid-column: 1;
    grid-row: 1;
    max-height: 140px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .editor-bay :deep(.tree.shut) { max-height: none; }
  .editor-column { grid-column: 1; grid-row: 2 }
  .checks-pane {
    grid-column: 1;
    grid-row: 3;
    border-left: 0;
    border-top: 1px solid var(--line);
  }
}
</style>
