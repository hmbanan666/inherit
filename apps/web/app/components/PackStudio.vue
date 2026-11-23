<script setup lang="ts">
import type { Component } from 'vue'
import { Play, Settings2 } from '@lucide/vue'
import { readPackSlot } from '../lib/pack-storage'
import { packKey } from '@inherit/sim/save'
import type { PackManifest, Call, Files, Colour } from '@inherit/sim/pack'
import type { PackFrame, PackCommand, DrawerTab } from '../lib/packProtocol'
import { usePlaybackClock } from '../lib/playback-clock'
import { useContrast } from '../lib/contrast'
import { editorKey } from '../lib/editor'
const props = defineProps<{manifest: PackManifest; view: Component}>()
const frame = shallowRef<PackFrame>()
const displayWorld = shallowRef<unknown>()
const calls = shallowRef<Call[]>([])
const statuses = ref<Colour[]>([])
const files = shallowRef<Files>({})
const activeFile = ref('main.ts')
const error = ref(''), blocked = ref(false), busy = ref(true), watching = ref(false), saved = ref(true)
const settings = ref(false), contrast = useContrast(), width = ref(45)
const runMessage = ref('')
const activeCall = shallowRef<Call>()
const tickCalls = shallowRef<Call[]>([])
const tickCount = ref(0)
const stoppingLoop = ref(false)
const setupTried = ref(false)
const previewingTick = ref(false)
const nextCall = shallowRef<Call>()
const reach = ref(0)
let requested: PackCommand['kind'] = 'open'
const navigation = shallowRef({file:'main.ts',line:1})
const lastRun = shallowRef<Files>({})
const declarations = computed(() => frame.value?.declarations ?? '')
const complete = computed(() => frame.value?.save.lessonId === null)
const solved = computed(() => !busy.value && frame.value?.solved)
const checkRows = computed(() => frame.value?.labels.map((label,i) => ({...label,status:statuses.value[i] ?? 'red' as Colour})) ?? [])
const choice = computed(() => frame.value?.save.predictions[frame.value.save.lessonId!])
const currentStep = computed(() => {
  const data = frame.value
  if (!data?.starter || (data.prediction && !choice.value)) return 0
  if (data.solved) return data.steps.length
  const { file } = data.starter.edit
  const body = (code: string) => code.split('\n').filter(line => !line.trimStart().startsWith('//')).join('\n').trim()
  const code = body(files.value[file] ?? '')
  const edited = code && code !== body(data.starter.files[file])
  return data.steps.length - (edited ? 1 : 2)
})
const query = new URLSearchParams(location.search)
const local = import.meta.dev || ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
const lesson = query.get('lesson') ?? undefined
const clock = usePlaybackClock(local ? Math.min(32, Math.max(1, Number(query.get('speed')) || 1)) : 1)
const { paused, speed } = clock
const key = packKey(props.manifest.id)
const drawer = ref<DrawerTab>()
let opener: HTMLElement | null
function openDrawer(tab: DrawerTab) {
  opener = document.activeElement as HTMLElement
  drawer.value = tab
  nextTick(() => document.getElementById('tab-' + tab)?.focus({ preventScroll: true }))
}
function closeDrawer(edit = false) {
  drawer.value = undefined
  if (edit && frame.value) navigation.value = { ...frame.value.edit }
  else opener?.focus({ preventScroll: true })
}
const landmark = computed(() => {
  const data = frame.value
  const selected = data?.map[data.index]
  if (!data || !selected || selected.state === 'done') return
  if (data.map.every(l => l.unit !== selected.unit || l.id === selected.id || l.state === 'done'))
    return props.manifest.units?.find(unit => unit.id === selected.unit)?.landmark
})
function select(id: string) {
  if (!busy.value && frame.value?.save.lessonId !== id)
    send({ kind: 'select', id, files: files.value, activeFile: activeFile.value })
}
let timer: ReturnType<typeof setTimeout>
let tickStarted: number | undefined
let worker: Worker | undefined, alive = true
function write(save: PackFrame['save'], working: Files, file: string) {
  if (lesson !== undefined) return true
  try {
    localStorage.setItem(key, JSON.stringify({
      ...save,
      clockActive: save.clockActive && !stoppingLoop.value,
      project: { ...save.project, working, activeFile: file },
    }))
    saved.value = true
    return true
  } catch { saved.value = false; return false }
}
function persist() {
  if (frame.value && !blocked.value) write(frame.value.save, files.value, activeFile.value)
}
function send(command: PackCommand) {
  requested = command.kind
  clearTimeout(timer)
  tickStarted = command.kind === 'tick' ? clock.now() : undefined
  busy.value = true
  worker?.postMessage(command)
}
function scheduleTick() {
  clearTimeout(timer)
  const data = frame.value
  if (!busy.value && !previewingTick.value && !paused.value && data?.clockMs && data.save.clockActive && !data.solved && !complete.value) {
    const remaining = data.clockMs - (tickStarted === undefined ? 0 : clock.now() - tickStarted)
    timer = setTimeout(() => send({ kind: 'tick' }), Math.max(0, remaining / speed.value))
  }
}
watch([paused, speed], scheduleTick)
function run() {
  if (frame.value?.save.clockActive) { stopLoop(); return }
  runMessage.value = ''
  if (drawer.value && frame.value?.mode === 'deploy' && !setupTried.value) return
  if (busy.value || blocked.value || complete.value) return
  if (solved.value) return
  if (frame.value?.prediction && !frame.value.save.predictions[frame.value.save.lessonId!]) {
    runMessage.value = 'Pick a guess first. There is no wrong answer.'
    return
  }
  drawer.value = undefined
  lastRun.value = files.value
  paused.value = false
  previewingTick.value = false
  const setup = frame.value?.mode === 'deploy' && !setupTried.value
  send({ kind: setup ? 'trySetup' : 'run', files: files.value })
}
function stopLoop() {
  if (!frame.value?.save.clockActive || stoppingLoop.value) return
  stoppingLoop.value = true
  paused.value = false
  clock.cancel()
  persist()
  if (!busy.value) send({ kind: 'stopLoop', completedTicks: tickCount.value })
}
function runOnce() {
  if (busy.value) return
  if (previewingTick.value) {
    previewingTick.value = false
    displayWorld.value = frame.value?.save.world
    scheduleTick()
  } else {
    drawer.value = undefined
    send({ kind: 'runOnce', files: files.value })
  }
}
function advance() { if (solved.value && frame.value?.save.lessonId) send({kind:'continue', id: frame.value.save.lessonId}) }
function shortcut(e:KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run() }
}
function resize(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  el.setPointerCapture(event.pointerId)
  const move = (e:PointerEvent) => width.value = Math.min(62,Math.max(30,100 - e.clientX / innerWidth * 100))
  el.addEventListener('pointermove',move)
  el.addEventListener('lostpointercapture',() => el.removeEventListener('pointermove',move),{once:true})
}
provide(editorKey, {id:props.manifest.id, label:'Player TypeScript', files, activeFile, deployed:lastRun,
  api:declarations, dirty:computed(()=>false), multiFile:computed(()=>Object.keys(files.value).length>1),
  readOnly: computed(() => !!frame.value?.solved || busy.value),
  call:activeCall, tickCalls, watching, error, navigation,
  setFile(path,code) {files.value = {...files.value,[path]:code};persist()},
  openFile(path) {activeFile.value = path; persist()},
})
async function receive(data: PackFrame | {loadError:string}) {
  if ('loadError' in data) {error.value = data.loadError; blocked.value = true; busy.value = false;return}
  const changed = !frame.value || data.save.lessonId !== frame.value.save.lessonId
  if (changed && !write(data.save, data.save.project.working, data.save.project.activeFile)) {
    error.value = 'Could not save progress. Free space and try again.'
    const previous = frame.value
    if (previous) {
      worker?.postMessage({ kind: 'open', id: props.manifest.id, stored: JSON.stringify(previous.save) } satisfies PackCommand)
    } else blocked.value = true
    busy.value = false
    return
  }
  if (changed) {
    setupTried.value = false
    previewingTick.value = false
    drawer.value = data.showLearn ? 'learn' : undefined
    files.value = data.save.project.working
    activeFile.value = data.save.project.activeFile
    navigation.value = data.edit.file === activeFile.value ? data.edit : {file: activeFile.value, line: 1}
  }
  if (!frame.value && data.save.clockActive) paused.value = true
  if (requested === 'trySetup' && !data.error) setupTried.value = true
  if (!data.save.clockActive && requested !== 'tick') paused.value = false
  if (requested !== 'tick') frame.value = data
  runMessage.value = data.notice ?? (data.noCalls ? 'Your code ran. Check the TODO and try again.' : '')
  error.value = saved.value ? data.error : 'Could not save progress. Free space and try again.'

  calls.value = []
  if (data.moments.length && !(requested === 'runOnce' && paused.value)) {
    const interval = tickStarted !== undefined && data.clockMs ? data.clockMs / data.moments.length : 650
    let nextMoment = clock.now()
    watching.value = tickStarted === undefined
    displayWorld.value = data.start
    for (const moment of data.moments) {
      if (!alive) return
      if (stoppingLoop.value) break
      if (watching.value) activeCall.value = moment.call
      calls.value = [...calls.value, moment.call]
      if (data.task && (moment.call.name === 'take' || moment.call.name === 'put')) {
        nextCall.value = moment.call
        reach.value = 0
        const start = nextMoment
        await clock.waitUntil(start + interval * 0.55, time => {
          reach.value = Math.min(1, (time - start) / (interval * 0.55))
        })
        if (!alive || stoppingLoop.value) break
        nextCall.value = undefined
      }
      displayWorld.value = moment.world
      statuses.value = moment.checks
      nextMoment += interval
      await clock.waitUntil(nextMoment)
    }
  }
  if (!alive) return
  watching.value = false
  activeCall.value = undefined
  nextCall.value = undefined
  if (stoppingLoop.value && requested === 'tick') {
    send({ kind: 'stopLoop', completedTicks: tickCount.value })
    return
  }
  frame.value = data
  tickCount.value = data.tickCount
  if (!data.save.clockActive || changed) tickCalls.value = []
  else if (tickStarted !== undefined && calls.value.length) tickCalls.value = calls.value
  if (data.save.clockActive && data.save.project.deployed) lastRun.value = data.save.project.deployed
  previewingTick.value = data.previewWorld !== undefined
  displayWorld.value = data.previewWorld ?? data.save.world
  statuses.value = data.checks
  if (!changed && saved.value) persist()
  stoppingLoop.value = false
  busy.value = false
  scheduleTick()
}
async function start(reset = false) {
  if (reset) {
    frame.value = undefined
    drawer.value = undefined
    lastRun.value = {}
  }
  worker?.terminate()
  worker = new Worker(new URL('../lib/pack.worker.ts',import.meta.url),{type:'module'})
  const instance = worker
  worker.onmessage = ({data}) => {if (worker===instance && alive) void receive(data)}
  worker.onerror = () => {error.value = 'Could not load the game. Reload and try again.';busy.value = false}
  blocked.value = false
  let stored = null
  try {
    stored = lesson !== undefined ? null : await readPackSlot(props.manifest.id, reset)
  } catch {
    error.value='Could not read this pack’s save. Allow storage or start a fresh pack.'
    saved.value=false; blocked.value=true; busy.value=false; return
  }
  send({kind:'open',id:props.manifest.id,stored,lesson})
}
onMounted(()=>{start();window.addEventListener('keydown',shortcut,true);window.addEventListener('pagehide',persist)})
onBeforeUnmount(() => {
  alive = false
  clock.cancel()
  clearTimeout(timer)
  persist()
  worker?.terminate()
  window.removeEventListener('keydown', shortcut, true)
  window.removeEventListener('pagehide', persist)
})
</script>
<template>
  <div class="workshop pack-studio" :class="{'high-contrast': contrast}" :style="{'--dock-width': width+'%'}">
    <header class="hud">
      <PackNav :manifest="manifest" :lessons="frame?.map ?? []" :selected="frame?.save.lessonId" />
      <div class="settings pack-settings">
        <button aria-label="Settings" @click="settings = !settings"><Settings2 /></button>
        <aside v-if="settings" class="hud-menu">
          <button @click="contrast = !contrast">High contrast {{ contrast ? 'on' : 'off' }}</button>
          <SaveArchive v-if="lesson === undefined" :pack="manifest.id" />
        </aside>
      </div>
      <a v-if="complete" class="deploy primary-run" :href="manifest.next ? '?pack=' + manifest.next : '/'">{{ manifest.next ? 'Next pack →' : 'Showcase' }}</a>
      <button v-else class="deploy primary-run" data-testid="primary-button" :disabled="(busy && !frame?.save.clockActive) || blocked || !!solved || (!!drawer && frame?.mode === 'deploy' && !setupTried)" @click="run">
        <Play />{{ frame?.save.clockActive ? 'Stop loop' : watching ? 'Playing your run' : frame?.mode === 'deploy' && setupTried ? 'Deploy' : 'Run' }} <kbd>Ctrl+Enter</kbd>
      </button>
    </header>
    <main class="desk">
      <section class="world-shell pack-world" data-testid="world">
        <component :is="view" v-if="displayWorld" :world="displayWorld" :scene="frame?.scene" :inputs="frame?.inputs" :calls="calls" :next-call="nextCall" :reach="reach" />
        <div v-if="frame?.mode === 'deploy' && setupTried" class="world-controls">
          <PlaybackBar v-if="frame.save.clockActive || tickCount" :live="frame.save.clockActive" v-model:paused="paused" v-model:speed="speed" :inert="stoppingLoop" :tick-count="tickCount" @stop="stopLoop" />
          <button v-if="(!frame.save.clockActive || paused || previewingTick) && !solved" :disabled="busy" @click="runOnce">{{ previewingTick ? 'Return to paused floor' : 'Run once' }}</button>
        </div>
        <SideDrawer v-if="drawer && frame" :tab="drawer" :manifest="manifest" :lessons="frame.map" :selected="frame.save.lessonId"
          :clock="frame.mode === 'deploy'" :theory="frame.theory" :task="frame.task" :prediction="frame.prediction" :choice="frame.save.predictions[frame.save.lessonId!]"
          :hints="frame.hints" :rung="frame.save.hints[frame.save.lessonId!] ?? 0" :entries="frame.reference" :types="frame.types"
          :busy="busy" :logs="frame.logs" @tab="drawer = $event" @close="closeDrawer()" @edit="closeDrawer(true)"
          @predict="send({kind: 'predict', choice: $event})" @hint="send({kind: 'hint'})" @select="select">
          <template #learn>
            <div v-if="Object.keys(files).length > 1"><button v-for="(_, path) in files" :key="path" @click="activeFile = path; closeDrawer(); persist()">{{ path }}</button></div>
            <section v-for="p in frame.panels" :key="p.id"><h3>{{ p.label }}</h3>
              <p v-for="row in p.rows" :key="row.id"><button v-if="row.action" :disabled="busy" @click="send({kind:'action',panel:p.id,row:row.id})">{{ row.label }} · {{ row.value }}</button><template v-else>{{ row.label }} · {{ row.value }}</template></p>
            </section>
          </template>
        </SideDrawer>
        <CelebrationOverlay v-if="solved && frame" :solved="solved" :busy="busy" :landmark="landmark"
          :no-hints="!frame.save.hints[frame.save.lessonId!]"
          :streak="frame.save.attempts[frame.save.lessonId!] === 1 ? frame.save.firstTryStreak + 1 : 0" @advance="advance" />
      </section>
      <div class="resizer" role="separator" tabindex="0" aria-label="Resize editor" @pointerdown="resize" @keydown.left.prevent="width=Math.min(62,width+2)" @keydown.right.prevent="width=Math.max(30,width-2)" />
      <section class="editor-dock">
        <PackFinish v-if="complete && frame?.finishIdeas" :manifest="manifest" :ideas="frame.finishIdeas" :awards="Object.values(frame.save.awards)" @map="openDrawer('learn')" @replay="start(true)" />
        <template v-else-if="frame">
          <StepCard :goal="frame.goal" :steps="frame.steps" :current="currentStep" :prediction="frame.prediction" :choice="choice" :busy="busy" @predict="send({kind: 'predict', choice: $event})" @help="openDrawer('learn')" />
          <div class="editor-pane"><div class="editor-host"><LazyCodeEditor :error="error" @reference="openDrawer('api')" /></div></div>
          <ChecksPanel :key="frame.save.lessonId ?? ''" :checks="checkRows" :messages="runMessage ? [runMessage] : []" />
          <button v-if="frame.logs.length" class="console-count" @click="openDrawer('console')">Console · {{ frame.logs.length }} lines</button>
          <p v-if="frame.prediction && frame.save.phase !== 'brief'" class="prediction-result">Your prediction: {{ frame.save.predictions[frame.save.lessonId!] }} · Result: {{ frame.prediction.answer }}</p>
        </template>
        <p v-if="error" class="pack-error" role="alert">{{ error }}</p>
        <template v-if="blocked"><SaveArchive v-if="lesson === undefined" :pack="manifest.id" recovery /><button v-if="lesson === undefined" @click="start(true)">Start a fresh pack</button></template>
      </section>
    </main>
    <footer class="statusbar"><span>{{ lesson !== undefined ? 'Preview' : saved ? 'Saved on this device' : 'Save unavailable' }}</span></footer>
  </div>
</template>
