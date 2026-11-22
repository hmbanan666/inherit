<script setup lang="ts">
import { Play, Settings2 } from '@lucide/vue'
import { courseMap } from '../../framework/course'
import { readPlayerAPI } from '../../framework/declarations'
import { useContrast } from '../../../../../apps/web/app/lib/contrast'
import { provideGame } from '../../../../../apps/web/app/lib/useGame'
import { editorKey } from '../../../../../apps/web/app/lib/editor'
import type { DrawerTab } from '../../../../../apps/web/app/lib/packProtocol'
import manifest from './manifest'
import playerSource from './player.ts?raw'
import { workshopLessons } from './pack'

const WorkshopFloor = defineAsyncComponent(() => import('./WorldView.vue'))
const g = provideGame()
const { campaign, files, activeFile, ready, saved, error, surface, town, step } = g
const lesson = computed(() => workshopLessons[campaign.value.lesson.index])
const map = computed(() => courseMap(manifest, workshopLessons, g.completed.value))
const solved = computed(() => step.value?.phase === 'solved')
provide(editorKey, {
  ...g, placeFunctions: ['take', 'put', 'look'], id: manifest.id, label: 'Factory controller TypeScript',
  deployed: computed(() => campaign.value.project.deployed),
  multiFile: computed(() => surface.value.multiFile),
  watching: g.playback.watching,
  readOnly: solved,
  call: computed(() => g.playback.watching.value ? g.playback.call.value : undefined),
  callsToMove: computed(() => solved.value ? undefined : step.value?.step.callsToMove),
})
const drawer = ref<DrawerTab>()
const settings = ref(false)
const confirmNew = ref(false)
const showFiles = ref(false)
const contrast = useContrast()
const dockWidth = ref(43)
const highlighted = shallowRef<string[]>([])
const schema = readPlayerAPI(playerSource)
const entries = computed(() => schema.methods.filter(m => surface.value.exports.includes(m.name as never)))
const finishIdeas = workshopLessons.map(l => l.idea)
let opener: HTMLElement | null
function openDrawer(tab: DrawerTab) {
  opener = document.activeElement as HTMLElement
  drawer.value = tab
  nextTick(() => document.getElementById('tab-' + tab)?.focus({ preventScroll: true }))
}
function closeDrawer(edit = false) {
  drawer.value = undefined
  if (edit) g.openFile(g.navigation.value.file, g.navigation.value.line)
  else opener?.focus({ preventScroll: true })
}
watch([ready, () => lesson.value?.id], () => {
  if (ready.value) drawer.value = lesson.value?.theory && step.value?.phase === 'brief' ? 'learn' : undefined
  showFiles.value = lesson.value?.id === 'mayor-tools'
})
watch(solved, value => { if (value) drawer.value = undefined })
function submit() {
  if (solved.value) return
  drawer.value = undefined
  g.submit()
}
function hotkey(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && ['s', 'Enter'].includes(event.key)) {
    event.preventDefault()
    event.stopPropagation()
    submit()
  }
}
function resize(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  el.setPointerCapture(event.pointerId)
  const move = (e: PointerEvent) => { dockWidth.value = Math.max(25, Math.min(62, 100 * (1 - e.clientX / innerWidth))) }
  el.addEventListener('pointermove', move)
  el.addEventListener('lostpointercapture', () => el.removeEventListener('pointermove', move), { once: true })
}
const streak = computed(() => {
  let n = 0
  for (let i = campaign.value.lesson.index; i >= 0 && g.attempts.value[workshopLessons[i]?.id] === 1; i--) n++
  return n
})
function hint() {
  const id = lesson.value.id
  g.hints.value[id] = (g.hints.value[id] ?? 0) + 1
  g.persist()
}
function reset() {
  confirmNew.value = false
  showFiles.value = false
  g.newGame()
}
onMounted(() => window.addEventListener('keydown', hotkey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', hotkey, true))
</script>

<template>
  <div class="workshop" :class="{'high-contrast': contrast}" :style="{ '--dock-width': dockWidth + '%' }">
    <header class="hud">
      <PackNav :manifest="manifest" :lessons="map" :selected="lesson?.id" />
      <div class="settings pack-settings">
        <button aria-label="Settings" @click="settings = !settings"><Settings2 /></button>
        <aside v-if="settings" class="hud-menu">
          <button @click="contrast = !contrast">High contrast {{ contrast ? 'on' : 'off' }}</button>
          <button v-if="surface.multiFile" @click="showFiles = !showFiles; settings = false">Project files</button>
          <button @click="confirmNew = true; settings = false">New game</button>
          <SaveArchive v-if="g.preview === null" pack="workshop" />
        </aside>
      </div>
      <a v-if="!lesson" href="/" class="deploy primary-run">Showcase</a>
      <button v-else class="deploy primary-run" data-testid="primary-button"
        :disabled="g.busy.value || g.blockedSave.value || solved || (!ready && !error)" @click="submit">
        <Play />{{ g.playback.watching.value ? 'Playing your run' : g.button.value === 'run' ? 'Run' : 'Deploy' }} <kbd>Ctrl+Enter</kbd>
      </button>
    </header>
    <main class="desk">
      <section class="world-shell pack-world" data-testid="world" aria-label="Workshop floor">
        <div class="map-frame" :data-phase="town.phase"><WorkshopFloor :world="campaign.world" :highlighted="highlighted" /></div>
        <div v-if="lesson && g.active.value" class="world-controls">
          <PlaybackBar v-model:paused="g.paused.value" v-model:speed="g.speed.value" :inert="g.stoppingLoop.value" :tick-count="g.tickCount.value" @stop="g.stopLoop" />
        </div>
        <SideDrawer v-if="drawer" :manifest="manifest" :lessons="map" :selected="lesson?.id" :tab="drawer" :theory="lesson?.theory"
          :hints="lesson?.hints ?? []" :rung="g.hints.value[lesson?.id] ?? 0" :entries="entries" :busy="g.busy.value"
          @tab="drawer = $event" @select="g.selectLesson" @hint="hint" @close="closeDrawer()" @edit="closeDrawer(true)">
          <template #learn>
            <section v-if="lesson?.id === 'harrow-tab' || lesson?.id === 'harrow-deed'">
              <h3>Kettlewick Bank</h3>
              <p>{{ campaign.economy.money }} coins · Debt {{ town.debt.owed }}</p>
              <button v-if="lesson.id === 'harrow-tab' && !solved" @click="g.act({type: 'read', id: 'tab'})">Pay later</button>
              <button v-if="lesson.id === 'harrow-deed' && !solved" @click="g.act({type: 'pay', inFull: true})">Pay balance</button>
            </section>
          </template>
          <template #console><ConsolePanel /></template>
        </SideDrawer>
        <CelebrationOverlay v-if="solved && step" :solved="step.step.solved" :busy="g.busy.value" :streak="streak"
          :no-hints="!g.hints.value[lesson.id]" :landmark="step.index === step.total - 1 ? manifest.units[0].landmark : undefined" @advance="g.advance" />
      </section>
      <div class="resizer" role="separator" tabindex="0" aria-label="Resize code workshop" aria-orientation="vertical" @pointerdown="resize"
        @keydown.left.prevent="dockWidth = Math.min(62, dockWidth + 2)" @keydown.right.prevent="dockWidth = Math.max(25, dockWidth - 2)" />
      <section class="editor-dock" aria-label="Code workshop">
        <section v-if="g.blockedSave.value"><p role="alert">{{ error }}</p><template v-if="g.preview === null">
          <SaveArchive pack="workshop" recovery /><button @click="reset">Start a fresh pack</button></template></section>
        <PackFinish v-else-if="!lesson" :manifest="manifest" :ideas="finishIdeas" :awards="Object.values(g.awards.value)" @map="openDrawer('learn')" @replay="reset">The shed is yours. The bridge to Riverside stands and your family tab is paid.</PackFinish>
        <template v-else>
          <GoalBar :goal="lesson.goal" @help="openDrawer('learn')" />
          <FileTree v-if="showFiles && surface.multiFile" />
          <div v-if="surface.multiFile" class="file-tabs"><button aria-pressed="true" @click="g.openFile(activeFile)">{{ activeFile }}</button></div>
          <div class="editor-pane"><div class="editor-host">
            <LazyCodeEditor :error="error" @reference="openDrawer('api')" @focus-ids="highlighted = $event" />
          </div></div>
          <ChecksPanel :key="lesson.id" :checks="step?.checks ?? []" :error="error" :messages="step?.phase === 'working' || error ? g.playback.messages.value : []" />
          <button v-if="g.logs.value.length" class="console-count" @click="openDrawer('console')">Console · {{ g.logs.value.length }} lines</button>
        </template>
      </section>
    </main>
    <footer class="statusbar"><span v-if="g.notice.value" role="status">{{ g.notice.value }}</span><span>{{ g.preview !== null ? 'Preview' : saved ? 'Saved locally' : 'Save unavailable' }}</span></footer>
    <div v-if="confirmNew" class="scrim"><section class="confirm" role="dialog" aria-label="New game">
      <h2>Start a new factory?</h2><p>This replaces your saved floor, code and progress.</p>
      <button @click="confirmNew = false">Keep playing</button><button class="gold" @click="reset">New game</button>
    </section></div>
  </div>
</template>
