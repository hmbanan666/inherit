<script setup lang="ts">
import {
  BookOpen,
  ChevronDown,
  Code2,
  Coins,
  Factory,
  FileCode2,
  Mail,
  Play,
  Radio,
  Settings2,
  X,
} from '@lucide/vue'
import type { TownSnapshot, Townsperson, WorkshopSection } from '@inherit/sim'
import { provideGame } from './lib/useGame'
import TownView from './components/town/TownView.vue'

const g = provideGame()
const { campaign, files, activeFile, dirty, ready, saved, error, surface, town, step, reveals, sections, letters } = g
const townPerson = ref<Townsperson['id']>()
const replay = shallowRef<TownSnapshot['changes']>([])
const highlighted = shallowRef<string[]>([])
const requester = computed(() => town.value.people.find((p) => p.ask))
const section = ref<WorkshopSection>('factory')
const unread = computed(() => letters.value.filter(m => m.unread).length)
const sectionNames: Record<WorkshopSection, string> = {
  code: 'Shed', factory: 'Shed', town: 'Town', inbox: 'Inbox', orders: 'Orders',
}
function sectionDescription(item: WorkshopSection) {
  const details = []
  if (!campaign.value.seenSections.includes(item)) details.push('New section')
  if (item === 'inbox' && unread.value) details.push(unread.value + ' unread letters')
  return details.join('. ') || undefined
}
const showMoney = computed(() => reveals.value.some(r => r.kind === 'coins'))
const showDebt = computed(() => reveals.value.some(r => r.kind === 'debt'))
const drawer = computed(() => section.value === 'inbox' || section.value === 'orders' ? sectionNames[section.value] : '')
const floorPane = ref<HTMLElement>()
const drawerPane = ref<HTMLElement>()
const editorStatus = computed(() => {
  if (error.value) return 'See Checks for the error'
  if (g.playback.watching.value) return 'Watching the arm'
  if (g.button.value === 'run') return 'Working copy · Run to watch your code'
  if (dirty.value) return 'Working copy · Deploy to run your edits'
  return g.active.value ? 'Deployed · the clock is running' : 'Ready to deploy'
})
const tab = ref<'controller' | 'api'>('controller')
const showFiles = ref(false)
const menu = ref<'' | 'history' | 'settings' | 'bank'>('')
const confirmNew = ref(false)
const swapped = ref(false)
const dockWidth = ref(43)
const panels = ['Checks', 'Console'] as const
type Panel = typeof panels[number]
const panel = ref<Panel>('Checks')
const panelOpen = ref(true)
function openPanel(next: Panel) {
  panel.value = next
  panelOpen.value = true
}
function focusPanel(next: Panel) {
  openPanel(next)
  document.getElementById('tab-' + next)?.focus()
}
function movePanel(event: KeyboardEvent) {
  let next: Panel
  switch (event.key) {
    case 'Home': next = 'Checks'; break
    case 'End': next = 'Console'; break
    case 'ArrowLeft':
    case 'ArrowRight': next = panel.value === 'Checks' ? 'Console' : 'Checks'; break
    default: return
  }
  event.preventDefault()
  focusPanel(next)
}
const editor = ref<{ focus(): void; revealLine(file: string, line: number): void }>()
const celebration = shallowRef<TownSnapshot['changes']>([])
const story = ref('')
const archives = computed(() =>
  campaign.value.project.snapshots.filter((r) => r.name.startsWith('v2') || r.name.startsWith('Chapter ') || r.name.startsWith('Previous')),
)
const coinPop = ref<{ tick: number; amount: number }>()
watch(
  () => campaign.value.economy.money,
  (value, before) => {
    if (ready.value && value > before)
      coinPop.value = { tick: campaign.value.world.tick, amount: value - before }
  },
)
let toastTimer: ReturnType<typeof setTimeout>
function toggleMenu(name: typeof menu.value) {
  menu.value = menu.value === name ? '' : name
}
function notify(value: string) {
  story.value = value
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    story.value = ''
  }, 12000)
}
watch(
  () => town.value.changes.length,
  (n, last) => {
    if (ready.value && n > last) celebration.value = town.value.changes.slice(last)
  },
)
watch(g.notice, (message) => {
  if (message) {
    notify(message)
    g.notice.value = ''
  }
})
watch(error, message => { if (message) openPanel('Checks') })
watch(g.navigation, async ({ file, line }) => {
  tab.value = 'controller'
  await nextTick()
  editor.value?.revealLine(file, line)
})
function payBank(inFull = false) {
  g.act({ type: 'pay', inFull })
  menu.value = ''
}
function restoreRevision(id: number) {
  g.rollback(id)
  menu.value = ''
}
function openArchive(id: number) {
  g.restoreSnapshot(id)
  menu.value = ''
}
function askNewGame() {
  confirmNew.value = true
  menu.value = ''
}
function openSection(next: WorkshopSection, person?: Townsperson['id']) {
  if (!sections.value.includes(next)) return
  section.value = next
  g.visitSection(next)
  menu.value = ''
  if (next === 'town') {
    replay.value = celebration.value
    const building = celebration.value[0]?.buildingId
    const residence = building === 'bridge' ? 'town-hall' : building
    townPerson.value = person ?? town.value.people.find(p => p.buildingId === residence)?.id
    celebration.value = []
    highlighted.value = []
  }
}
function navigateTo(next: WorkshopSection) {
  openSection(next)
  nextTick(() => (drawerPane.value ?? floorPane.value)?.focus())
}
function highlightMachines(ids: string[]) {
  highlighted.value = ids
  if (ids.length && section.value !== 'factory') openSection('factory')
}
function swap() {
  swapped.value = !swapped.value
  localStorage.setItem('inherit.workshop.editorLeft', String(swapped.value))
}
function hotkey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
    e.preventDefault()
    e.stopPropagation()
    g.submit()
  }
  if (e.key === 'Escape') {
    menu.value = ''
    if (drawer.value) openSection('factory')
    confirmNew.value = false
  }
}
function resize(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const change = (event: PointerEvent) => {
    const fraction = event.clientX / window.innerWidth
    dockWidth.value = Math.max(25, Math.min(62, 100 * (swapped.value ? fraction : 1 - fraction)))
  }
  el.addEventListener('pointermove', change)
  el.addEventListener('lostpointercapture', () => el.removeEventListener('pointermove', change), {
    once: true,
  })
}
function reset() {
  confirmNew.value = false
  showFiles.value = false
  menu.value = ''
  section.value = 'factory'
  celebration.value = []
  replay.value = []
  townPerson.value = undefined
  story.value = ''
  highlighted.value = []
  openPanel('Checks')
  g.newGame()
}
onMounted(() => {
  swapped.value = localStorage.getItem('inherit.workshop.editorLeft') === 'true'
  window.addEventListener('keydown', hotkey, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', hotkey, true)
  clearTimeout(toastTimer)
})
useHead({ title: () => (requester.value?.ask?.title ?? 'Kettlewick') + ' · inherit' })
</script>
<template>
  <div class="workshop" :style="{ '--dock-width': dockWidth + '%' }">
    <header class="hud">
      <div class="brand"><img src="/mark.svg" alt="" />inherit<span>.</span></div>
      <nav class="section-nav" aria-label="Workshop sections">
        <button v-for="item in sections" :data-testid="'nav-' + (item === 'factory' ? 'shed' : item)" :key="item" :aria-label="sectionNames[item]"
          :aria-description="sectionDescription(item)" :aria-pressed="section === item" @click="navigateTo(item)">
          {{ sectionNames[item] }}
          <small v-if="item === 'inbox' && unread" :title="unread + ' unread letters'">{{ unread }}</small>
          <small v-if="!campaign.seenSections.includes(item)" class="section-new">new</small>
        </button>
      </nav>
      <div v-if="showMoney" class="wallet" title="Workshop money">
        <Coins /><b>{{ campaign.economy.money.toLocaleString() }} coins</b
        ><small v-if="coinPop" :key="coinPop.tick" class="coin-pop" @animationend="coinPop = undefined"
          >+{{ coinPop.amount }}</small
        >
      </div>
      <div v-if="showDebt" class="settings bank-chip">
        <button aria-label="Pay debt" @click="toggleMenu('bank')">
          Debt {{ town.debt.owed }} <b v-if="town.debt.next">Pay</b>
        </button>
        <aside v-if="menu === 'bank'" class="hud-menu">
          <h3>Kettlewick Bank</h3>
          <p>{{ town.debt.paid }} paid · {{ town.debt.owed }} owed</p>
          <template v-if="town.debt.next">
            <button
              class="gold"
              :disabled="campaign.economy.money < town.debt.next.amount"
              @click="payBank()"
            >
              Pay {{ town.debt.next.amount }} coins
            </button>
            <button
              v-if="town.debt.owed > town.debt.next.amount && campaign.economy.money >= town.debt.owed"
              @click="payBank(true)"
            >
              Pay balance ({{ town.debt.owed }} coins)
            </button>
          </template>
        </aside>
      </div>
      <div class="settings">
        <button aria-label="Settings" @click="toggleMenu('settings')"><Settings2 /></button>
        <aside v-if="menu === 'settings'" class="hud-menu">
          <button :aria-pressed="swapped" @click="swap">Swap sides</button>
          <button v-if="surface.multiFile" @click="showFiles = !showFiles; menu = ''">Project files</button>
          <button @click="askNewGame">
            New game
          </button>
        </aside>
      </div>
    </header>
    <main class="desk" :class="{ swapped }">
      <section ref="floorPane" tabindex="-1" aria-label="Factory and town" class="world-shell">
        <header class="world-title">
          <div class="floor-heading">
            <small class="eyebrow"><Factory />Kettlewick · Chapter 1</small>
            <h1>{{ section === 'town' ? 'Kettlewick' : 'Uncle’s shed' }}</h1>
          </div>
          <div class="live" :class="{ off: !g.active.value }">
            <i />{{ !ready ? 'Starting' : g.active.value ? 'Live' : error ? 'Offline' : 'Ready' }}
          </div>
        </header>
        <div class="map-frame" :data-phase="section !== 'town' ? town.phase : undefined">
          <LazyFactoryFloor v-if="section !== 'town'" :highlighted="highlighted" @focusin="g.visitSection('factory')" />
          <TownView v-else v-model:selection="townPerson" :snapshot="town" :replay="replay" :show-debt="showDebt" />
          <aside v-if="drawer" ref="drawerPane" tabindex="-1" class="drawer" :aria-label="drawer">
            <header>
              <h2>{{ drawer }}</h2>
              <button aria-label="Close drawer" @click="openSection('factory')"><X /></button>
            </header>
            <div v-if="drawer === 'Inbox'" class="drawer-body">
              <article v-for="m in [...letters].reverse()" :key="m.id" class="ticket">
                <small>{{ m.from }}</small>
                <h3>{{ m.title }}</h3>
                <p>{{ m.body }}</p>
                <button v-if="m.unread" @click="g.act({ type: 'read', id: m.id })">Mark read</button>
              </article>
            </div>
            <div v-else class="drawer-body">
              <p v-if="!campaign.economy.orders.length">All current orders are filled.</p>
              <p v-if="Object.keys(campaign.town.waiting).length">Nobody ordered these yet:
                <span v-for="(n, item) in campaign.town.waiting" :key="item">{{ n }} {{ item }} </span>
              </p>
              <article v-for="o in campaign.economy.orders" :key="o.id" class="ticket">
                <h3>{{ town.people.find((p) => p.id === o.customer)?.name }}</h3>
                <p v-for="(n, item) in o.items" :key="item">{{ o.filled[item] ?? 0 }} / {{ n }} {{ item }}</p>
                <small>{{ o.pay }} coins</small>
              </article>
            </div>
          </aside>
        </div>
      </section>
      <div
        class="resizer"
        role="separator"
        tabindex="0"
        aria-label="Resize Code workshop"
        aria-orientation="vertical"
        @pointerdown="resize"
        @keydown.left.prevent="dockWidth = Math.min(62, dockWidth + 2)"
        @keydown.right.prevent="dockWidth = Math.max(25, dockWidth - 2)"
      ></div>
      <section class="editor-dock" aria-label="Code workshop">
        <header class="dock-header">
          <span class="eyebrow"><Code2 />Code workshop</span>
        </header>
        <SolvedCard v-if="step?.phase === 'solved'" :solved="step.step.solved" :busy="g.busy.value" @advance="g.advance" />
        <TaskCard v-else-if="step" :key="step.step.id" :step="step.step" />
        <FileTree v-if="showFiles && surface.multiFile" />
        <MyLibrary />
        <div class="file-tabs">
          <button :aria-pressed="tab === 'controller'" @click="tab = 'controller'">
            <FileCode2 />{{ activeFile }}<i v-if="dirty" class="dot" />
          </button>
          <button :aria-pressed="tab === 'api'" @click="tab = 'api'"><BookOpen />API reference</button>
        </div>
        <div class="editor-pane">
          <div v-show="tab === 'controller'" class="editor-host">
            <LazyCodeEditor ref="editor" :error="error" @reference="tab = 'api'" @focus-ids="highlightMachines" />
          </div>
          <ApiReference v-if="tab === 'api'" />
        </div>
        <div class="editor-foot" role="status">
          <span><i class="dot" :class="{ clean: !dirty }" />{{ editorStatus }}</span
          ><small>TypeScript</small>
        </div>
        <div class="panel-tabs">
          <div role="tablist" aria-label="Workshop tools" @keydown="movePanel">
            <button v-for="name in panels" :id="'tab-' + name" :key="name" role="tab"
              :aria-selected="panel === name" :aria-controls="'panel-' + name"
              :tabindex="panel === name ? 0 : -1" @click="openPanel(name)">{{ name }}</button>
          </div>
          <button class="panel-toggle" :aria-expanded="panelOpen" :aria-controls="'panel-' + panel"
            :aria-label="panelOpen ? 'Collapse workshop panel' : 'Expand workshop panel'"
            @click="panelOpen = !panelOpen"><ChevronDown /></button>
        </div>
        <div v-show="panelOpen" class="panel-slot" :class="{ compact: panel === 'Checks' }">
          <div v-show="panel === 'Checks'" id="panel-Checks" role="tabpanel" aria-labelledby="tab-Checks" tabindex="0">
            <ChecksPanel :key="step?.step.id" />
          </div>
          <div v-show="panel === 'Console'" id="panel-Console" role="tabpanel" aria-labelledby="tab-Console" tabindex="0">
            <ConsolePanel />
          </div>
        </div>
      </section>
    </main>
    <footer class="statusbar">
      <span><Radio />{{ saved ? 'Saved locally' : 'Save unavailable' }}</span>
      <div v-if="story" class="toast" role="status">
        <Mail />{{ story }}<button aria-label="Dismiss notification" @click="story = ''"><X /></button>
      </div>
      <span>{{ campaign.world.machines.length }} machines</span>
      <div class="deploy-group">
        <button class="deploy" data-testid="primary-button" :disabled="g.busy.value || (!ready && !error)" @click="g.submit()">
          <Play />{{ g.button.value === 'run' ? 'Run' : 'Deploy' }} <kbd>Ctrl+Enter</kbd>
        </button>
        <button class="revisions" :aria-label="g.button.value === 'deploy' ? 'Deploy history' : 'History'" @click="toggleMenu('history')">
          <ChevronDown />
        </button>
        <aside v-if="menu === 'history'" class="hud-menu">
          <button v-if="g.button.value === 'deploy'" :disabled="g.busy.value" @click="menu = ''; g.submit('run')">Run once</button>
          <h3>{{ g.button.value === 'deploy' ? 'Deploy history' : 'History' }}</h3>
          <button
            v-for="r in [...campaign.project.history].reverse()"
            :key="r.id"
            @click="restoreRevision(r.id)"
          >
            Restore #{{ r.id }} <small>tick {{ r.tick }}</small>
          </button>
          <button
            v-for="r in archives"
            :key="r.id"
            @click="openArchive(r.id)"
          >
            Open {{ r.name }}
          </button>
        </aside>
      </div>
    </footer>
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
<style scoped>
.wallet {
  position: relative;
}
.coin-pop {
  position: absolute;
  top: 100%;
  left: 40%;
  color: var(--gold);
  animation: rise 1.3s ease-out both;
  z-index: 4;
}
@keyframes rise {
  from {
    opacity: 1;
  }
  to {
    transform: translateY(-16px);
    opacity: 0;
  }
}
.map-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: transparent;
  transition: background 2s ease;
}
.map-frame[data-phase='evening']::after {
  background: color-mix(in srgb, var(--gold) 6%, transparent);
}
.map-frame[data-phase='night']::after {
  background: color-mix(in srgb, var(--base) 20%, transparent);
}

@media (min-width: 801px) {
  .panel-slot.compact { height: auto; min-height: 38px; max-height: 124px; overflow: auto; }
  .desk.swapped {
    grid-template-columns: var(--dock-width) 7px minmax(0, 1fr);
  }
  .swapped .editor-dock {
    grid-column: 1;
    grid-row: 1;
  }
  .swapped .resizer {
    grid-column: 2;
    grid-row: 1;
  }
  .swapped .world-shell {
    grid-column: 3;
    grid-row: 1;
  }
}
.section-nav {
  display: flex;
  align-items: center;
  gap: 7px;
}
.section-nav {
  margin-right: auto;
  flex-wrap: wrap;
}
.section-nav button[aria-pressed='true'] {
  color: var(--gold);
  border-color: var(--gold);
}
.section-new { color: var(--accent-soft); }
.statusbar { height: 36px; border-top: 0; box-shadow: inset 0 1px var(--line); }
.statusbar .deploy-group, .statusbar .deploy, .statusbar .revisions { height: 100%; }
.statusbar .deploy { font-size: 14px; gap: 10px; }
.statusbar .deploy svg, .statusbar .revisions svg { color: inherit; }
.statusbar kbd { font: 10px var(--mono); border: 1px solid currentColor; border-radius: 3px; padding: 2px 4px; }
.statusbar .deploy-group .hud-menu {
  top: auto;
  bottom: calc(100% + 4px);
  z-index: 10;
}
.statusbar { padding-block: 0; }
.bank-chip > button {
  gap: 8px;
  font: 12px var(--mono);
}
.bank-chip b {
  padding: 3px 7px;
  border: 1px solid var(--accent-line);
  border-radius: 4px;
  color: var(--gold);
}
.bank-chip .hud-menu {
  min-width: 200px;
  left: 0;
  right: auto;
}
.hud-menu {
  max-height: 65vh;
  overflow: auto;
}
.hud-menu p {
  font-size: 13px;
  margin: 4px 8px;
}
</style>
