<script setup lang="ts">
import {
  BookOpen,
  ChevronDown,
  Code2,
  Coins,
  Factory,
  FileCode2,
  Mail,
  Pause,
  Play,
  Radio,
  Settings2,
  X,
} from '@lucide/vue'
import type { TownSnapshot, Townsperson } from '@inherit/sim'
import { provideGame } from './lib/useGame'
import TownView from './components/town/TownView.vue'
import TownPortrait from './components/town/TownPortrait.vue'

const g = provideGame()
const { campaign, files, activeFile, dirty, ready, paused, speed, saved, error, surface, town } = g
const townPerson = ref<Townsperson['id']>()
const replay = shallowRef<TownSnapshot['changes']>([])
const highlighted = shallowRef<string[]>([])
const requester = computed(() => town.value.people.find((p) => p.ask))
const area = ref<'Factory' | 'Town'>('Factory')
const tab = ref<'controller' | 'api'>('controller')
const menu = ref<'' | 'history' | 'settings' | 'bank'>('')
const drawer = ref<'' | 'Inbox' | 'Orders'>('')
const confirmNew = ref(false)
const swapped = ref(false)
const dockWidth = ref(40)
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
const editor = ref<{ revealLine(file: string, line: number): void }>()
const celebration = shallowRef<TownSnapshot['changes']>([])
const story = ref('')
const unread = computed(() => campaign.value.progress.messages.filter((m) => m.unread).length)
const latest = computed(() => campaign.value.progress.messages.at(-1))
const archives = computed(() =>
  campaign.value.project.snapshots.filter((r) => r.name.startsWith('v2') || r.name.startsWith('Chapter ')),
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
function toggleDrawer(name: typeof drawer.value) {
  drawer.value = drawer.value === name ? '' : name
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
    if (ready.value && area.value === 'Factory' && n > last) celebration.value = town.value.changes.slice(last)
  },
)
watch(
  () => latest.value?.id,
  (id) => {
    if (ready.value && id && latest.value) notify(latest.value.title + ' · ' + latest.value.body)
  },
)
watch(g.notice, (message) => {
  if (message) {
    notify(message)
    g.notice.value = ''
  }
})
watch(g.navigation, async ({ file, line }) => {
  tab.value = 'controller'
  await nextTick()
  editor.value?.revealLine(file, line)
})
function payBank(inFull = false) {
  g.act({ kind: 'pay', inFull })
  menu.value = ''
}
function setSpeed(value: number) {
  speed.value = value
  paused.value = false
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
function highlightMachines(ids: string[]) {
  if (!ids.length) return
  highlighted.value = ids
  drawer.value = ''
  area.value = 'Factory'
}
function openTown(person?: Townsperson['id']) {
  replay.value = celebration.value
  const building = celebration.value[0]?.buildingId
  const residence = building === 'bridge' ? 'town-hall' : building
  townPerson.value = person ?? town.value.people.find((p) => p.buildingId === residence)?.id
  celebration.value = []
  highlighted.value = []
  drawer.value = ''
  area.value = 'Town'
}
function swap() {
  swapped.value = !swapped.value
  localStorage.setItem('inherit.workshop.editorLeft', String(swapped.value))
}
function hotkey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
    e.preventDefault()
    g.deploy()
  }
  if (e.key === 'Escape') {
    menu.value = ''
    drawer.value = ''
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
  menu.value = ''
  area.value = 'Factory'
  drawer.value = ''
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
      <div class="wallet" title="Workshop money">
        <Coins /><b>{{ campaign.economy.money.toLocaleString() }}</b
        ><small v-if="coinPop" :key="coinPop.tick" class="coin-pop" @animationend="coinPop = undefined"
          >+{{ coinPop.amount }}</small
        >
      </div>
      <div v-if="campaign.town.beat >= 2" class="settings bank-chip">
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
      <div class="clock">
        <div class="speeds">
          <button :aria-label="paused ? 'Resume' : 'Pause'" @click="paused = !paused">
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
      <div class="deploy-group">
        <button class="deploy" :disabled="!ready && !error" @click="g.deploy">
          <Play />{{ error ? 'Run' : 'Deploy' }}
        </button>
        <button class="revisions" aria-label="Deploy history" @click="toggleMenu('history')">
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
          <button
            v-for="r in archives"
            :key="r.id"
            @click="openArchive(r.id)"
          >
            Open {{ r.name }}
          </button>
        </aside>
      </div>
      <div class="settings">
        <button aria-label="Settings" @click="toggleMenu('settings')"><Settings2 /></button>
        <aside v-if="menu === 'settings'" class="hud-menu">
          <button :aria-pressed="swapped" @click="swap">Swap sides</button>
          <button
            @click="askNewGame"
          >
            New game
          </button>
        </aside>
      </div>
    </header>
    <main class="desk" :class="{ swapped }">
      <section class="world-shell">
        <header class="world-title">
          <div class="floor-heading">
            <small class="eyebrow"><Factory />Kettlewick · Chapter 1</small>
            <h1>{{ area === 'Factory' ? 'Uncle’s shed' : 'Kettlewick' }}</h1>
          </div>
          <nav class="world-actions">
            <button v-if="campaign.town.beat > 1" @click="toggleDrawer('Orders')">Orders</button>
            <button @click="toggleDrawer('Inbox')"><Mail />Inbox<i v-if="unread" class="dot" /></button>
          </nav>
          <div class="live" :class="{ off: paused || !g.active.value }">
            <i />{{ !ready ? 'Starting' : paused ? 'Paused' : g.active.value ? 'Live' : error ? 'Offline' : 'Ready' }}
          </div>
        </header>
        <RequestCard :person="requester" @checks="focusPanel('Checks')" />
        <div class="town-ribbon">
          <nav aria-label="Game view">
            <button
              v-for="view in ['Factory', 'Town'] as const"
              :key="view"
              :aria-pressed="area === view"
              @click="view === 'Town' ? openTown() : (area = view)"
            >
              {{ view }}
            </button>
          </nav>
          <button v-if="requester" class="bubble" @click="openTown(requester.id)">
            <TownPortrait :person="requester" />
            {{ requester.name }} · {{ requester.ask?.title }}
          </button>
          <button v-else-if="campaign.economy.orders.length" class="bubble" @click="toggleDrawer('Orders')">
            {{ campaign.economy.orders.length }} open orders
          </button>
        </div>
        <div class="map-frame" :data-phase="area === 'Factory' ? town.phase : undefined">
          <LazyFactoryFloor v-if="area === 'Factory'" :highlighted="highlighted" />
          <TownView v-else v-model:selection="townPerson" :snapshot="town" :replay="replay" />
          <aside v-if="celebration.length" class="town-change" role="status">
            <div>
              <small class="eyebrow">Town change</small>
              <b>{{ celebration.map((change) => change.text).join(' ') }}</b>
            </div>
            <button @click="openTown()">See it</button>
            <button aria-label="Dismiss celebration" @click="celebration = []"><X /></button>
          </aside>
          <aside v-if="drawer" class="drawer" :aria-label="drawer">
            <header>
              <h2>{{ drawer }}</h2>
              <button aria-label="Close drawer" @click="drawer = ''"><X /></button>
            </header>
            <div v-if="drawer === 'Inbox'" class="drawer-body">
              <article v-for="m in [...campaign.progress.messages].reverse()" :key="m.id" class="ticket">
                <small>{{ m.from }}</small>
                <h3>{{ m.title }}</h3>
                <p>{{ m.body }}</p>
                <button v-if="m.unread" @click="g.act({ kind: 'read', id: m.id })">Mark read</button>
              </article>
            </div>
            <div v-else class="drawer-body">
              <p v-if="!campaign.economy.orders.length">Your regulars will write again soon.</p>
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
        <FileTree v-if="surface.multiFile" />
        <div class="file-tabs">
          <button :aria-pressed="tab === 'controller'" @click="tab = 'controller'">
            <FileCode2 />{{ activeFile }}<i v-if="dirty" class="dot" />
          </button>
          <button :aria-pressed="tab === 'api'" @click="tab = 'api'"><BookOpen />API reference</button>
        </div>
        <div v-if="error" class="runtime" role="alert">{{ error }}</div>
        <div class="editor-pane">
          <div v-show="tab === 'controller'" class="editor-host">
            <LazyCodeEditor ref="editor" :error="error" @reference="tab = 'api'" @focus-ids="highlightMachines" />
          </div>
          <ApiReference v-if="tab === 'api'" />
        </div>
        <div v-if="tab === 'controller'" class="editor-foot">
          <span><i class="dot" :class="{ clean: !dirty }" />{{ dirty ? 'Working copy' : 'Deployed' }}</span
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
        <div v-show="panelOpen" class="panel-slot">
          <div v-show="panel === 'Checks'" id="panel-Checks" role="tabpanel" aria-labelledby="tab-Checks" tabindex="0">
            <ChecksPanel :key="campaign.town.beat" />
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
      <span>{{ campaign.world.machines.length }} machines · {{ campaign.world.belts.length }} belts</span>
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
.town-ribbon,
.town-ribbon nav,
.town-change {
  display: flex;
  align-items: center;
  gap: 7px;
}
.town-ribbon {
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.town-ribbon nav button[aria-pressed='true'] {
  color: var(--gold);
  border-color: var(--gold);
}
.bubble canvas {
  width: 20px;
  border-radius: 3px;
}
.bubble {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 16px 16px 16px 3px;
  font-size: 12px;
  color: var(--sub);
}
.town-change {
  position: absolute;
  z-index: 2;
  left: 12px;
  top: 12px;
  max-width: calc(100% - 24px);
  background: var(--panel);
  border: 1px solid var(--gold);
  border-radius: 6px;
  padding: 10px;
}
.town-change b {
  font-size: 14px;
}
.town-change button {
  flex: none;
}
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
