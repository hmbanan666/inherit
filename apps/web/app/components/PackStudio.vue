<script setup lang="ts">
import type { Component } from 'vue'
import { Play, Settings2 } from '@lucide/vue'
import { packKey } from '@inherit/sim/save'
import type { PackManifest, Call, Files, Colour } from '@inherit/sim/pack'
import type { PackFrame, PackCommand } from '../lib/packProtocol'
import { editorKey } from '../lib/editor'
const props = defineProps<{manifest: PackManifest; view: Component}>()
const frame = shallowRef<PackFrame>()
const displayWorld = shallowRef<unknown>()
const calls = shallowRef<Call[]>([])
const statuses = ref<Colour[]>([])
const files = shallowRef<Files>({})
const activeFile = ref('main.ts')
const error = ref(''), blocked = ref(false), busy = ref(true), watching = ref(false), saved = ref(true)
const settings = ref(false), panel = ref(''), dark = ref(true), width = ref(45)
const activeCall = shallowRef<Call>()
const navigation = shallowRef({file:'main.ts',line:1})
const editor = ref<{revealLine(file:string,line:number):void}>()
const declarations = computed(() => frame.value?.declarations ?? '')
const complete = computed(() => frame.value?.save.lessonId === null)
const solved = computed(() => !busy.value && frame.value?.solved)
const checkRows = computed(() => frame.value?.labels.map((text,i) => ({id:text,text,status:statuses.value[i] ?? 'red' as Colour})) ?? [])
const query = new URLSearchParams(location.search)
const local = import.meta.dev || ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
const lesson = local ? query.get('lesson') ?? undefined : undefined
const speed = local ? Math.min(32, Math.max(1, Number(query.get('speed')) || 1)) : 1
const key = packKey(props.manifest.id) + (lesson ? '.preview.' + lesson : '')
let worker: Worker | undefined, alive = true
function persist() {
  if (!frame.value || blocked.value) return
  const save = frame.value.save
  try {
    localStorage.setItem(key, JSON.stringify({...save, project:{...save.project, working: files.value, activeFile:activeFile.value}}))
    saved.value = true
  } catch { saved.value = false }
}
function send(command: PackCommand) { busy.value = true; worker?.postMessage(command) }
function run() {
  if (!busy.value && !blocked.value && !complete.value) send({kind:'run',files:files.value})
}
function advance() { if (solved.value) send({kind:'continue'}) }
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
provide(editorKey, {id:props.manifest.id, label:'Player TypeScript', files, activeFile, deployed:computed(()=>({})),
  api:declarations, dirty:computed(()=>false), multiFile:computed(()=>Object.keys(files.value).length>1),
  call:activeCall, watching, error, navigation,
  setFile(path,code) {files.value = {...files.value,[path]:code};persist()},
  openFile(path) {activeFile.value = path},
})
async function receive(data: PackFrame | {loadError:string}) {
  if ('loadError' in data) {error.value = data.loadError; blocked.value = true; busy.value = false;return}
  const changed = !frame.value || data.save.lessonId !== frame.value.save.lessonId
  if (changed) {
    files.value = data.save.project.working
    activeFile.value = data.save.project.activeFile
    navigation.value = data.edit
  }
  frame.value = data
  error.value = data.error
  persist()
  calls.value = []
  if (data.moments.length) {
    watching.value = true
    displayWorld.value = data.start
    for (const moment of data.moments) {
      if (!alive) return
      activeCall.value = moment.call
      calls.value = [...calls.value, moment.call]
      displayWorld.value = moment.world
      statuses.value = moment.checks
      await new Promise(resolve => setTimeout(resolve, 650 / speed))
    }
  }
  if (!alive) return
  watching.value = false
  activeCall.value = undefined
  displayWorld.value = data.save.world
  statuses.value = data.checks
  busy.value = false
  if (changed && !complete.value) {await nextTick();editor.value?.revealLine(data.edit.file,data.edit.line)}
}
function start(reset = false) {
  worker?.terminate()
  worker = new Worker(new URL('../lib/pack.worker.ts',import.meta.url),{type:'module'})
  worker.onmessage = ({data}) => receive(data)
  worker.onerror = () => {error.value = 'Could not load the game. Reload and try again.';busy.value = false}
  blocked.value = false
  let stored = null
  try {stored = reset ? null : localStorage.getItem(key)} catch {saved.value = false}
  send({kind:'open',id:props.manifest.id,stored,lesson})
}
onMounted(()=>{start();window.addEventListener('keydown',shortcut,true);window.addEventListener('pagehide',persist)})
onBeforeUnmount(()=>{alive = false;persist();worker?.terminate();window.removeEventListener('keydown',shortcut,true);window.removeEventListener('pagehide',persist)})
</script>
<template>
  <div class="workshop pack-studio" :class="{'high-contrast':!dark}" :style="{'--dock-width': width+'%'}">
    <header class="hud"><PackNav :manifest="manifest"/><nav v-if="frame?.panels.some(p=>p.placement==='nav')"><button v-for="p in frame.panels.filter(p=>p.placement==='nav')" :key="p.id" @click="panel = panel === p.id ? '' : p.id">{{ p.label }}</button></nav>
      <div class="settings pack-settings"><button aria-label="Settings" @click="settings=!settings"><Settings2/></button><aside v-if="settings" class="hud-menu"><button @click="dark=!dark">High contrast {{ dark ? 'off' : 'on' }}</button></aside></div>
      <button v-if="!complete" class="deploy primary-run" data-testid="primary-button" :disabled="busy || blocked" @click="run"><Play/>{{ watching ? 'Playing your run' : 'Run' }} <kbd>Ctrl+Enter</kbd></button>
    </header>
    <main class="desk"><section class="world-shell pack-world" data-testid="world">
      <header class="world-title"><div><small class="eyebrow">{{ manifest.genre }}</small><h1>{{ manifest.title }}</h1></div></header>
      <component :is="view" v-if="displayWorld" :world="displayWorld" :calls="calls"/>
      <aside v-for="p in frame?.panels.filter(p=>p.id===panel || p.placement==='panel')" :key="p.id" class="entity-panel"><h2>{{ p.label }}</h2><p v-for="row in p.rows" :key="row.id">{{ row.label }} · {{ row.value }}</p></aside>
      <SolvedCard v-if="solved" class="solved-overlay" :solved="solved" :busy="busy" @advance="advance"/>
    </section><div class="resizer" role="separator" tabindex="0" aria-label="Resize editor" @pointerdown="resize" @keydown.left.prevent="width=Math.min(62,width+2)" @keydown.right.prevent="width=Math.max(30,width-2)"/>
    <section class="editor-dock"><template v-if="complete"><div class="pack-ending"><small>Pack complete</small><h2>{{ manifest.title }}</h2><p>You used {{ manifest.learningGoals.join(', ').toLowerCase() }}.</p><a href="/">Back to game packs</a></div></template>
      <template v-else-if="frame"><header class="dock-header"><small>Lesson {{ frame.index+1 }} of {{ frame.total }}</small></header>
      <GoalBar :key="frame.save.lessonId ?? ''" :goal="frame.goal" :hints="frame.hints"/>
      <div class="file-tabs"><button aria-pressed="true">{{ activeFile }}</button></div>
      <div class="editor-pane"><div class="editor-host"><LazyCodeEditor ref="editor" :error="error"/></div></div>
      <ChecksPanel :key="frame.save.lessonId ?? ''" :checks="checkRows"/>
      <section v-if="frame.logs.length" class="pack-checks"><small>Console</small><p v-for="(line,i) in frame.logs" :key="i">{{ line }}</p></section></template>
      <p v-if="error" class="pack-error" role="alert">{{ error }}</p><button v-if="blocked" @click="start(true)">Start a fresh pack</button>
    </section></main><footer class="statusbar"><span>{{ saved ? 'Saved on this device' : 'Save unavailable' }}</span><span>TypeScript</span></footer>
  </div>
</template>
