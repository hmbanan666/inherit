<script setup lang="ts">
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Code2,
  Coins,
  Cpu,
  Factory,
  FileCode2,
  FlaskConical,
  Mail,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Radio,
  Settings2,
  Star,
  Target,
  TriangleAlert,
  X,
} from '@lucide/vue'
import { OBJECTIVES, objectiveTrack, RESEARCH, MACHINES } from '@inherit/sim'
import { buildGuide, type BuildTool } from './lib/buildGuide'
import { provideGame } from './lib/useGame'
import ConsolePanel from './components/ConsolePanel.vue'
import TestsPanel from './components/TestsPanel.vue'
import MetricsPanel from './components/MetricsPanel.vue'
import SnapshotsPanel from './components/SnapshotsPanel.vue'
import DriversPanel from './components/DriversPanel.vue'

const g = provideGame()
const { campaign, activeFile, files, paused, speed, cpu, error, dirty, ready, saved, selected, surface } = g
const track = computed(() => objectiveTrack(campaign.value)),
  objective = computed(() => track.value.active)
const completed = computed(() => campaign.value.progress.completedObjectives)
const progress = computed(() => track.value.progress)
const unread = computed(() => campaign.value.progress.messages.filter((m) => m.unread).length)
const retryable = computed(() => ['breakdown', 'ack'].includes(objective.value?.id ?? ''))
const objectiveNumber = computed(() => OBJECTIVES.findIndex((o) => o.id === objective.value?.id) + 1)
const progressText = computed(
  () => `${progress.value.current} / ${progress.value.target} ${objective.value?.progressUnit ?? ''}`,
)
const ids = computed(() => campaign.value.world.machines.map((m) => m.id))
const stableIds = computed((previous: string[] | undefined) =>
  ids.value.length === previous?.length && ids.value.every((id, i) => id === previous[i])
    ? previous
    : ids.value,
)
const editor = ref<{ revealLine?: (file: string, line: number) => void }>(),
  editorReady = ref(false)
const tab = ref<'controller' | 'api'>('controller'),
  dock = ref(true),
  dockWidth = ref(36)
const panels = {
  Console: ConsolePanel,
  Tests: TestsPanel,
  Metrics: MetricsPanel,
  Snapshots: SnapshotsPanel,
  Drivers: DriversPanel,
}
const panel = ref<keyof typeof panels | undefined>('Console')
const menu = ref<'' | 'history' | 'settings'>(''),
  confirmNew = ref(false)
const drawer = ref<'Orders' | 'Research' | 'Shop' | 'Inbox'>()
const buttons = { Orders: ClipboardList, Research: FlaskConical, Inbox: Mail }
const tool = ref<BuildTool>()
const placing = computed(() =>
  tool.value && tool.value !== 'belt' && tool.value !== 'remove' ? tool.value : undefined,
)
const example = computed(() => objective.value?.hints.slice(1).join('\n'))
const hints = ref(false),
  toast = ref(''),
  stamp = ref<(typeof OBJECTIVES)[number]>()
let toastTimer: ReturnType<typeof setTimeout>,
  stampTimer: ReturnType<typeof setTimeout>,
  moneyFrame = 0
const money = ref(campaign.value.economy.money)
function notify(text: string) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 4200)
}
watch(
  () => campaign.value.economy.money,
  (value) => {
    cancelAnimationFrame(moneyFrame)
    const start = performance.now(),
      from = money.value
    function count(now: number) {
      const p = Math.min(1, (now - start) / 360)
      money.value = Math.round(from + (value - from) * (1 - (1 - p) ** 3))
      if (p < 1) moneyFrame = requestAnimationFrame(count)
    }
    moneyFrame = requestAnimationFrame(count)
  },
)
watch(
  () => completed.value.length,
  (n, last) => {
    if (n <= last || !g.metrics.value.length) return
    stamp.value = OBJECTIVES.find((o) => o.id === completed.value.at(-1))
    clearTimeout(stampTimer)
    stampTimer = setTimeout(() => (stamp.value = undefined), 3500)
    hints.value = false
  },
)
watch(
  () => campaign.value.progress.messages.length,
  (n, last) => {
    if (n > last && g.metrics.value.length)
      notify(campaign.value.progress.messages.at(-1)!.title + ' · Inbox')
  },
)
watch(g.notice, (msg) => {
  if (msg) {
    notify(msg)
    g.notice.value = ''
  }
})
watch(g.navigation, async ({ file, line }) => {
  dock.value = true
  tab.value = 'controller'
  await nextTick()
  if (editor.value?.revealLine) editor.value.revealLine(file, line)
  else if (editorReady.value) {
    // The single-file editor predates revealLine. Both use the same Monaco instance.
    const monaco = await import('monaco-editor/esm/vs/editor/editor.api')
    const live = monaco.editor.getEditors().find((e) => e.getDomNode()?.closest('.editor-host'))
    if (live) {
      live.setPosition({ lineNumber: line, column: 1 })
      live.revealLineInCenterIfOutsideViewport(line)
    }
  }
})
function toggleDrawer(name: NonNullable<typeof drawer.value>) {
  drawer.value = drawer.value === name ? undefined : name
  menu.value = ''
  tool.value = undefined
}
const guide = computed(() => buildGuide(campaign.value, objective.value))
const guidedButton = computed(() => (guide.value?.[0] === 'button' ? guide.value[1] : undefined))
const buttonLabels = {
  editor: 'Open controller',
  deploy: 'Find Deploy',
  files: 'Open project files',
  memory: 'Show memory',
  inbox: 'Open inbox',
}
const guideKey = computed(() => JSON.stringify(guide.value))
const floor = ref<{ revealGuide: () => void }>()
const tutorial = ref(false)
watch([ready, guideKey, tool], () => {
  if (
    ready.value &&
    !g.buildTutorialSeen.value &&
    (tool.value ||
      (guide.value && ['shop', 'machine', 'plot', 'research', 'belt', 'unbelt'].includes(guide.value[0])))
  ) {
    tutorial.value = true
    g.markBuildTutorialSeen()
  }
})
const guideLabel = computed(() => {
  const a = guide.value
  if (!a) return ''
  switch (a[0]) {
    case 'button':
      return buttonLabels[a[1]]
    case 'focus':
      return 'Find ' + a[1]
    case 'tile':
      return (a[4] ? 'Place ' + MACHINES[a[4]].name + ' at (' : 'Find tile (') + a[2] + ', ' + a[3] + ')'
    case 'belt-tool':
      return 'Choose belt tool'
    case 'research':
      return 'Research ' + RESEARCH.find((n) => n.id === a[1])?.title
    case 'plot':
      return 'Find ' + a[2].replaceAll('-', ' ')
    case 'shop':
    case 'machine':
      return 'Place ' + MACHINES[a[1]].name
    case 'belt':
      return 'Connect ' + a[1] + ' → ' + a[2]
    case 'unbelt':
      return 'Remove ' + a[1] + ' → ' + a[2]
    case 'road':
      return 'Open road shop'
  }
})
function build(kind: BuildTool) {
  tool.value = kind
  drawer.value = undefined
  selected.value = ''
  menu.value = ''
}
function toggleBuild() {
  if (tool.value) {
    tool.value = undefined
    return
  }
  const a = guide.value
  build(
    a?.[0] === 'machine' || a?.[0] === 'shop'
      ? a[1]
      : a?.[0] === 'belt' || a?.[0] === 'belt-tool'
        ? 'belt'
        : a?.[0] === 'unbelt'
          ? 'remove'
          : 'furnace',
  )
}
async function followGuide() {
  const a = guide.value
  if (!a) return
  drawer.value = undefined
  menu.value = ''
  selected.value = ''
  tool.value = undefined
  if (a[0] === 'button') {
    if (a[1] === 'inbox') drawer.value = 'Inbox'
    else if (a[1] === 'memory') hints.value = true
    else if (a[1] === 'deploy') document.querySelector<HTMLButtonElement>('.deploy')?.focus()
    else {
      dock.value = true
      tab.value = 'controller'
      await nextTick()
      document
        .querySelector<HTMLButtonElement>(
          a[1] === 'files' ? '[aria-label="Project files"] button' : '.file-tabs button',
        )
        ?.focus()
    }
    return
  }
  if (a[0] === 'research') {
    drawer.value = 'Research'
    return
  }
  if (a[0] === 'road') {
    drawer.value = 'Shop'
    return
  }
  if (a[0] === 'tile' && a[4]) build(a[4])
  if (a[0] === 'machine' || a[0] === 'shop') build(a[1])
  if (a[0] === 'belt' || a[0] === 'belt-tool') build('belt')
  if (a[0] === 'unbelt') {
    build('remove')
    selected.value = a[1] + ' → ' + a[2]
  }
  await nextTick()
  floor.value?.revealGuide()
}
function hotkey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
    e.preventDefault()
    g.deploy()
  }
  if (
    e.key.toLowerCase() === 'b' &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.repeat &&
    !(e.target as HTMLElement)?.closest('input,textarea,[contenteditable=true],.monaco-editor')
  ) {
    e.preventDefault()
    toggleBuild()
  }
  if (e.key === 'Escape') {
    menu.value = ''
    drawer.value = undefined
    confirmNew.value = false
    tool.value = undefined
    selected.value = ''
    hints.value = false
  }
}
function resize(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const change = (event: PointerEvent) =>
    (dockWidth.value = Math.max(25, Math.min(62, 100 * (1 - event.clientX / window.innerWidth))))
  const stop = () => {
    el.removeEventListener('pointermove', change)
    el.removeEventListener('lostpointercapture', stop)
  }
  el.addEventListener('pointermove', change)
  el.addEventListener('lostpointercapture', stop)
}
function reset() {
  confirmNew.value = false
  menu.value = ''
  drawer.value = undefined
  stamp.value = undefined
  hints.value = false
  tool.value = undefined
  tutorial.value = false
  g.newGame()
}
function openError() {
  const pos = /^(.+\.ts):(\d+)/.exec(error.value)
  if (pos) g.openFile(pos[1]!, Number(pos[2]))
}
const objectiveCard = ref<HTMLElement>()
const goalAbove = ref(false)
let observer: IntersectionObserver | undefined
function returnToGoal() {
  objectiveCard.value?.scrollIntoView({ block: 'center' })
}
onMounted(() => {
  window.addEventListener('keydown', hotkey, true)
  observer = new IntersectionObserver(
    ([entry]) => {
      goalAbove.value = !!entry && !entry.isIntersecting && entry.boundingClientRect.top < 95
    },
    { rootMargin: '-95px 0px 0px 0px' },
  )
  if (objectiveCard.value) observer.observe(objectiveCard.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', hotkey, true)
  cancelAnimationFrame(moneyFrame)
  clearTimeout(stampTimer)
  clearTimeout(toastTimer)
})
useHead({ title: () => (objective.value?.title ?? 'Free play') + ' · inherit' })
function setSpeed(value: number) {
  speed.value = value
  paused.value = false
}
function restoreRevision(id: number) {
  g.rollback(id)
  menu.value = ''
}
function askNewGame() {
  confirmNew.value = true
  menu.value = ''
}
</script>
<template>
  <div class="workshop" :style="{ '--dock-width': dockWidth + '%' }">
    <header class="hud">
      <div class="brand"><img src="/mark.svg" alt="" />inherit<span>.</span></div>
      <div class="wallet" title="Workshop money">
        <Coins /><b>{{ money.toLocaleString() }}</b>
      </div>
      <div class="rep" title="Reputation">
        <Star /><b>{{ campaign.economy.reputation }}</b
        ><small>REP</small>
      </div>
      <div class="clock">
        <span class="tick"
          >TICK <b>{{ String(campaign.world.tick).padStart(5, '0') }}</b></span
        >
        <div class="speeds">
          <button :aria-label="paused ? 'Resume' : 'Pause'" :aria-pressed="paused" @click="paused = !paused">
            <Play v-if="paused" /><Pause v-else />
          </button>
          <button
            v-for="s in [1, 2, 4, 8]"
            :key="s"
            :aria-pressed="!paused && speed === s"
            @click="setSpeed(s)"
          >
            {{ s }}×
          </button>
        </div>
      </div>
      <div class="cpu" :title="cpu.used + ' / ' + cpu.budget + ' operations'">
        <Cpu /><span
          >CPU <b>{{ cpu.used }}/{{ cpu.budget }}</b
          ><i><i :style="{ width: Math.min(100, (100 * cpu.used) / cpu.budget) + '%' }"></i></i
        ></span>
      </div>
      <div class="deploy-group">
        <button
          class="deploy"
          :class="{ 'guide-pulse': guidedButton === 'deploy' }"
          :disabled="!ready && !error"
          @click="g.deploy"
        >
          <Play fill="currentColor" />{{ error ? 'Run' : 'Deploy' }}</button
        ><button
          class="revisions"
          aria-label="Deploy history"
          @click="menu = menu === 'history' ? '' : 'history'"
        >
          <ChevronDown />
        </button>
        <aside v-if="menu === 'history'" class="hud-menu">
          <h3>Deploy history</h3>
          <button
            v-for="r in [...campaign.project.history].reverse()"
            :key="r.id"
            @click="restoreRevision(r.id)"
          >
            Restore #{{ r.id }} <small>tick {{ r.tick }}</small>
          </button>
        </aside>
      </div>
      <div class="settings">
        <button aria-label="Settings" @click="menu = menu === 'settings' ? '' : 'settings'">
          <Settings2 />
        </button>
        <aside v-if="menu === 'settings'" class="hud-menu">
          <button @click="askNewGame">New game</button>
        </aside>
      </div>
      <button v-if="goalAbove && objective" class="mobile-goal" @click="returnToGoal">
        <Target />{{ objective.title }} <b>{{ progress.current }} / {{ progress.target }}</b>
      </button>
    </header>
    <main class="desk" :class="{ collapsed: !dock }">
      <section class="world-shell">
        <header class="world-title">
          <div>
            <span class="eyebrow"><Factory /> Factory floor</span>
            <h1>Uncle’s shed</h1>
          </div>
          <nav class="world-actions" aria-label="Workshop">
            <button
              v-for="(icon, name) in buttons"
              :key="name"
              :class="{
                'guide-pulse':
                  ((name === 'Research' && guide?.[0] === 'research') ||
                    (name === 'Inbox' && guidedButton === 'inbox')) &&
                  drawer !== name,
              }"
              :aria-pressed="drawer === name"
              @click="toggleDrawer(name)"
            >
              <component :is="icon" />{{ name }}<i v-if="name === 'Inbox' && unread" class="dot"></i>
            </button>
          </nav>
          <div class="live" :class="{ off: paused || !g.active.value }">
            <i></i
            >{{
              !ready && !error
                ? 'Starting'
                : paused
                  ? 'Paused'
                  : !g.active.value
                    ? 'Controller offline'
                    : 'Live'
            }}
          </div>
          <button
            v-if="!dock"
            :class="{ 'guide-pulse': guidedButton === 'editor' || guidedButton === 'files' }"
            aria-label="Open editor"
            @click="dock = true"
          >
            <PanelRightOpen />
          </button>
        </header>
        <section ref="objectiveCard" class="objective" aria-label="Objective track">
          <div class="objective-icon"><Target /></div>
          <div class="goal-body">
            <small v-if="objective" class="eyebrow"
              >Objective {{ objectiveNumber }} / {{ OBJECTIVES.length }}</small
            >
            <h2>{{ objective?.title ?? 'Free play' }}</h2>
            <div class="next">
              <ArrowRight /> {{ track.next ? 'Next · ' + track.next.title : 'Keep the order board moving.' }}
            </div>
          </div>
          <button
            v-if="guideLabel"
            class="guide-link"
            :class="{ 'guide-pulse': guidedButton === 'memory' }"
            :aria-label="'Guide: ' + guideLabel"
            @click="followGuide"
          >
            {{ guideLabel }} <ArrowRight />
          </button>
          <div v-if="objective" class="goal-aside">
            <button class="hint" :aria-expanded="hints" @click="hints = !hints"><CircleHelp /> Hint</button>
            <b>{{ progressText }}</b>
          </div>
          <div
            v-if="objective"
            class="goal-progress"
            :aria-valuetext="progressText"
            role="progressbar"
            :aria-label="objective?.title ?? 'Free play'"
            :aria-valuemin="0"
            :aria-valuemax="progress.target"
            :aria-valuenow="progress.current"
          >
            <i
              :style="{ width: Math.min(100, (100 * progress.current) / Math.max(1, progress.target)) + '%' }"
            ></i>
          </div>
          <div v-if="hints && objective" class="hint-note">
            <p>{{ objective.hints[0] }}</p>
            <code v-if="example">{{ example }}</code>
            <details v-if="guidedButton === 'memory'" open>
              <summary>Saved memory</summary>
              <pre>{{ JSON.stringify(campaign.memory, null, 2) }}</pre>
            </details>
            <button v-if="retryable" @click="g.act({ kind: 'retry' })">Retry objective</button>
          </div>
        </section>
        <div class="map-frame">
          <LazyFactoryFloor
            ref="floor"
            :tool="tool"
            :guide="guide"
            :placing="placing"
            @placed="tool = undefined"
          />
          <aside v-if="tutorial" class="build-lesson" aria-label="Building tutorial">
            <div>
              <b>Your first build</b>
              <ol>
                <li>Pick equipment below.</li>
                <li>Click a green tile or drop it there.</li>
                <li>Pick Belt, then click both machines in order.</li>
              </ol>
            </div>
            <button aria-label="Dismiss build tutorial" @click="tutorial = false"><X /></button>
          </aside>
          <Transition name="stamp"
            ><div v-if="stamp" :key="stamp.id" class="receipt" role="status">
              <span class="stamp-mark"><Check /></span>
              <div>
                <small>Objective complete</small><b>{{ stamp.title }}</b
                ><span>+{{ stamp.reward.money }} coins · +{{ stamp.reward.researchPoints }} RP</span>
              </div>
              <i v-for="i in 12" :key="i" :style="{ '--i': i }"></i></div
          ></Transition>
          <WorkshopDrawer
            v-if="drawer"
            :name="drawer"
            :guide="guide"
            @close="drawer = undefined"
            @build="build"
          />
        </div>

        <BuildPalette
          :tool="tool"
          :guide="guide"
          @pick="build"
          @toggle="toggleBuild"
          @shop="toggleDrawer('Shop')"
        />
      </section>
      <div
        v-show="dock"
        class="resizer"
        role="separator"
        tabindex="0"
        aria-label="Resize editor"
        aria-orientation="vertical"
        @pointerdown="resize"
        @keydown.left.prevent="dockWidth = Math.min(62, dockWidth + 2)"
        @keydown.right.prevent="dockWidth = Math.max(25, dockWidth - 2)"
      ></div>
      <section v-show="dock" class="editor-dock" aria-label="Editor dock">
        <header class="dock-header">
          <span class="eyebrow"><Code2 /> Code workshop</span
          ><button aria-label="Collapse editor" @click="dock = false"><PanelRightClose /></button>
        </header>
        <FileTree v-if="surface.multiFile" :class="{ 'guide-pulse': guidedButton === 'files' }" />
        <div class="file-tabs">
          <button
            :class="{ 'guide-pulse': guidedButton === 'editor' }"
            :aria-pressed="tab === 'controller'"
            @click="tab = 'controller'"
          >
            <FileCode2 />{{ activeFile }}<i v-if="dirty" class="dot"></i></button
          ><button :aria-pressed="tab === 'api'" @click="tab = 'api'"><BookOpen /> api.d.ts</button>
        </div>
        <div v-if="error" class="runtime" role="alert">
          <TriangleAlert /><button @click="openError">{{ error }}</button>
        </div>
        <div class="editor-host" v-show="tab === 'controller'">
          <LazyCodeEditor
            ref="editor"
            :code="files[activeFile] ?? ''"
            :selected="selected"
            :error="error"
            :ids="stableIds"
            tab="controller"
            @edit="g.setFile(activeFile, $event)"
            @ready="editorReady = true"
          />
        </div>
        <pre v-if="tab === 'api'" class="api-source">{{ g.api.value }}</pre>
        <div class="editor-foot">
          <span><i class="dot" :class="{ clean: !dirty }"></i>{{ dirty ? 'Working copy' : 'Deployed' }}</span
          ><small>TypeScript</small>
        </div>
        <nav class="panel-tabs" aria-label="Editor tools">
          <button
            v-for="(_, name) in panels"
            :key="name"
            :aria-pressed="name === panel"
            @click="panel = panel === name ? undefined : name"
          >
            {{ name }}
          </button>
        </nav>
        <div v-if="panel" class="panel-slot"><component :is="panels[panel]" /></div>
      </section>
    </main>
    <footer class="statusbar">
      <span><Radio /> {{ saved ? 'Saved locally' : 'Save unavailable' }}</span
      ><span
        >{{ campaign.world.machines.length }} machines <i>/</i> {{ campaign.world.belts.length }} belts</span
      >
    </footer>
    <div v-if="toast" class="toast" role="status">
      <Mail />{{ toast }}<button aria-label="Dismiss notification" @click="toast = ''"><X /></button>
    </div>
    <div v-if="confirmNew" class="scrim">
      <section class="confirm" role="dialog" aria-label="New game">
        <h2>Start a new factory?</h2>
        <p>This replaces your saved floor, code and progress.</p>
        <button @click="confirmNew = false">Keep playing</button
        ><button class="gold" @click="reset">New game</button>
      </section>
    </div>
  </div>
</template>
