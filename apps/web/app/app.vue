<script setup lang="ts">
import {
  Cog,
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Factory,
  FileCode2,
  Hammer,
  Layers3,
  Lightbulb,
  LockKeyhole,
  MousePointer2,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Terminal,
  Trash2,
  TriangleAlert,
  X,
} from '@lucide/vue'
import { levels, metrics } from '@inherit/sim'
import { useWorkshop } from './lib/useWorkshop'

const {
  index,
  level,
  completed,
  code,
  layout,
  world,
  checks,
  hints,
  speed,
  running,
  loading,
  dirty,
  error,
  selected,
  placing,
  notice,
  stamped,
  saved,
  removable,
  run,
  pause,
  oneStep,
  open,
  edit,
  place,
  connect,
  remove,
  hint,
  reset,
} = useWorkshop()
const stats = computed(() => metrics(world.value))
const passed = computed(() => checks.value.filter((c) => c.status === 'pass').length)
const tab = ref<'controller' | 'api'>('controller')
const log = ref(false),
  confirmReset = ref(false),
  hintOpen = ref(false)
const pad = (n: number) => String(n).padStart(2, '0')
const material = computed(() => (level.value.product === 'ingot' ? 'iron ingots' : 'pressed parts'))
const stockItems = computed(() =>
  level.value.product === 'part' ? ['ore', 'ingot', 'coal', 'part'] : ['ore', 'ingot'],
)
const canAdd = computed(() =>
  level.value.additions.some((s) => !layout.value.stations.some((m) => m.id === s.id)),
)
const phase = computed(() =>
  loading.value ? 'Starting' : error.value ? 'Stopped' : running.value ? 'Running' : 'Paused',
)
function enter(i: number) {
  log.value = false
  hintOpen.value = false
  tab.value = 'controller'
  open(i)
}
function showHint() {
  if (!hintOpen.value && hints.value) hintOpen.value = true
  else {
    hint()
    hintOpen.value = true
  }
}
function resetLevel() {
  confirmReset.value = false
  hintOpen.value = false
  reset()
}
function keys(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    log.value = false
    confirmReset.value = false
    placing.value = false
    hintOpen.value = false
  }
  if (!(e.ctrlKey || e.metaKey)) return
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    run()
  }
  if (e.key === '.') {
    e.preventDefault()
    e.stopPropagation()
    pause()
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    e.stopPropagation()
    oneStep()
  }
}
onMounted(() => window.addEventListener('keydown', keys, true))
onBeforeUnmount(() => window.removeEventListener('keydown', keys, true))
</script>
<template>
  <header class="mast">
    <div class="mast-inner">
      <div class="brand"><img src="/mark.svg" alt="" width="33" height="33" />inherit</div>
      <div class="mast-divider" />
      <button class="nav-tab active" @click="log = false"><Factory :size="15" />Workshop</button>
      <div class="log-anchor">
        <button class="nav-tab" :aria-expanded="log" @click="log = !log">
          <BookOpen :size="15" />Chapter log<ChevronDown :size="12" />
        </button>
        <section v-if="log" class="log-card">
          <div class="eyebrow">CHAPTER 01</div>
          <strong>Uncle’s shed</strong>
          <button
            v-for="(l, i) in levels"
            :key="l.title"
            :disabled="i > 0 && !completed.includes(i - 1)"
            @click="enter(i)"
          >
            <span>{{ pad(i + 1) }} &nbsp; {{ l.title }}</span
            ><Check v-if="completed.includes(i)" :size="14" /><LockKeyhole
              v-else-if="i > 0 && !completed.includes(i - 1)"
              :size="13"
            /><ArrowRight v-else :size="14" />
          </button>
        </section>
      </div>
      <span class="save-state"
        ><i class="dot" :class="{ green: saved }" />{{
          saved ? 'Saved locally' : 'Storage unavailable'
        }}</span
      >
    </div>
  </header>
  <main>
    <div class="breadcrumb">
      <Factory :size="13" /> Chapter 01 <span>/</span> Uncle’s shed <span class="chapter-rule" />
      <span class="chapter-count">{{ completed.length }} / {{ levels.length }} complete</span>
      <span class="chapter-meter"
        ><i
          v-for="(_, i) in levels"
          :key="i"
          :class="{ complete: completed.includes(i), current: index === i }"
      /></span>
    </div>
    <section class="brief">
      <div class="brief-copy">
        <div class="eyebrow"><span class="short-rule" />LEVEL {{ pad(index + 1) }}</div>
        <h1>{{ level.title }}</h1>
        <p>{{ level.brief }}</p>
      </div>
      <div class="order-ticket">
        <div class="order-glyph">
          <Cog v-if="level.product === 'part'" :size="44" :stroke-width="1.3" color="#d8b477" /><svg
            v-else
            viewBox="0 0 54 54"
            fill="none"
            aria-hidden="true"
          >
            <g stroke="#f0be5a" stroke-width="1.5" stroke-linejoin="round">
              <path d="m4 32 16-8 11 5-16 8z" fill="#ac8443" />
              <path d="m4 32 11 5v6L3 38z" fill="#725a35" />
              <path d="m15 37 16-8 1 6-17 8z" fill="#454234" />
              <path d="m22 34 16-8 11 5-16 8z" fill="#ac8443" />
              <path d="m22 34 11 5v6l-12-5z" fill="#725a35" />
              <path d="m33 39 16-8 1 6-17 8z" fill="#454234" />
              <path d="m13 23 16-8 11 5-16 8z" fill="#d6af64" />
              <path d="m13 23 11 5v6l-12-5z" fill="#8a693c" />
              <path d="m24 28 16-8 1 6-17 8z" fill="#56503a" />
            </g>
          </svg>
        </div>
        <div class="order-info">
          <div class="tiny">
            WORK ORDER <span>#00{{ index + 1 }}</span>
          </div>
          <strong>{{ level.order }} {{ material }}</strong
          ><small>{{ level.customer }}</small>
        </div>
        <div class="order-total">
          <strong
            >{{ Math.min(world.shipped, level.order) }}<small>/{{ level.order }}</small></strong
          ><span>shipped</span>
        </div>
        <div class="order-progress" :style="{ width: stats.progress * 100 + '%' }" />
      </div>
    </section>
    <div class="controlbar">
      <div class="section-label">
        <span class="signal"><i /><i /><i /></span>Simulation<span
          class="phase"
          :class="{ live: running && !loading }"
          ><i />{{ phase }}</span
        >
      </div>
      <div class="transport">
        <div class="speed-group" aria-label="Simulation speed">
          <button
            v-for="s in [0.5, 1, 2, 4]"
            :key="s"
            :class="{ on: speed === s }"
            :aria-pressed="speed === s"
            @click="speed = s"
          >
            {{ s }}×
          </button>
        </div>
        <span class="divider" />
        <button class="run" @click="run()"><Play :size="12" fill="currentColor" />Run</button>
        <button :disabled="!!error || loading" @click="pause">
          <component :is="running ? Pause : Play" :size="13" />{{ running ? 'Pause' : 'Resume' }}
        </button>
        <button :disabled="loading" @click="oneStep"><SkipForward :size="14" />Step</button>
      </div>
    </div>
    <div class="workspace">
      <section class="panel ide">
        <div class="panel-heading">
          <div><Code2 />Code editor</div>
          <span class="tiny">TYPESCRIPT</span>
        </div>
        <div class="file-tabs">
          <button :class="{ active: tab === 'controller' }" @click="tab = 'controller'">
            <b>TS</b>controller.ts<i v-if="dirty" title="Run to apply edits" />
          </button>
          <button :class="{ active: tab === 'api' }" @click="tab = 'api'">
            <FileCode2 :size="13" />api.d.ts
          </button>
        </div>
        <LazyCodeEditor
          :code="code"
          :ids="layout.stations.map((s) => s.id)"
          :selected="selected"
          :tab="tab"
          @edit="edit"
          @select="selected = $event"
        />
        <div class="tests">
          <div class="tests-heading">
            <span><Terminal :size="15" />Test bench</span
            ><small>{{ passed }} / {{ checks.length }} passing</small>
          </div>
          <div v-if="error" class="runtime" role="alert"><TriangleAlert :size="14" />{{ error }}</div>
          <div v-for="c in checks" :key="c.label" class="check-row">
            <b :class="c.status">{{ c.status }}</b
            ><span>{{ c.label }}</span
            ><small>{{ c.value }}</small>
          </div>
        </div>
      </section>
      <section class="panel factory">
        <div class="panel-heading">
          <div><Layers3 />Factory floor</div>
          <span class="tiny"
            ><i class="dot" :class="{ green: running }" />{{ running ? 'LIVE VIEW' : 'PLAN VIEW' }}</span
          >
        </div>
        <div class="metrics">
          <div class="rate">
            <div class="tiny"><Activity :size="13" />THROUGHPUT</div>
            <strong>{{ stats.rate }}</strong
            ><span>/ min</span>
          </div>
          <dl>
            <div>
              <dt>Furnace idle</dt>
              <dd :class="{ warm: stats.idle > 50 }">{{ stats.idle }}<small>%</small></dd>
            </div>
            <div>
              <dt>Tick</dt>
              <dd>{{ String(world.tick).padStart(4, '0') }}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd>{{ stats.stock }}</dd>
            </div>
          </dl>
        </div>
        <div class="floor-wrap">
          <LazyFactoryFloor
            :world="world"
            :selected="selected"
            :placing="placing"
            :running="running"
            :speed="speed"
            @place="place"
            @connect="connect"
            @select="selected = $event"
          />
          <div v-if="stamped" class="shipped" role="status">
            <PackageCheck :size="23" />
            <div>
              <strong>Order shipped</strong><small>{{ level.concept }}</small>
            </div>
            <button v-if="index < levels.length - 1" @click="enter(index + 1)">
              Next level <ArrowRight :size="14" /></button
            ><button v-else @click="log = true">Chapter log</button>
          </div>
        </div>
        <div class="floor-tools">
          <div class="legend">
            <span v-for="item in stockItems" :key="item"><i :class="item" />{{ item }}</span>
          </div>
          <div class="tool-set">
            <button
              aria-label="Select machine"
              title="Select machine"
              :class="{ active: !placing }"
              @click="placing = false"
            >
              <MousePointer2 :size="15" />
            </button>
            <button
              v-if="canAdd"
              draggable="true"
              :class="{ active: placing }"
              @dragstart="placing = true"
              @click="placing = !placing"
            >
              <Hammer :size="14" /> Coal mine
            </button>
            <button v-if="removable" title="Remove selected equipment" @click="remove">
              <Trash2 :size="14" /> Remove
            </button>
          </div>
        </div>
      </section>
    </div>
    <section class="notebook">
      <div class="note-icon"><BookOpen :size="21" /></div>
      <div class="note-copy">
        <div class="tiny">{{ hintOpen ? 'WORKSHOP HINT ' + hints + ' / 3' : 'UNCLE’S NOTEBOOK' }}</div>
        <p>{{ hintOpen ? level.hints[hints - 1] : level.note }}</p>
      </div>
      <button v-if="hintOpen" class="dismiss" aria-label="Close hint" @click="hintOpen = false">
        <X :size="14" />
      </button>
      <button :disabled="hintOpen && hints >= 3" class="hint-button" @click="showHint">
        <Lightbulb :size="15" />{{ hintOpen ? 'Next hint' : 'Hint' }} <span>{{ hints }}/3</span>
      </button>
    </section>
    <div v-if="notice" class="notice" role="status">
      {{ notice }}<button @click="notice = ''"><X :size="14" /></button>
    </div>
    <footer>
      <div class="shortcuts">
        <span><kbd>Ctrl</kbd> <kbd>↵</kbd> Run</span><span><kbd>Ctrl</kbd> <kbd>.</kbd> Pause</span
        ><span><kbd>Ctrl</kbd> <kbd>→</kbd> Step</span>
      </div>
      <button @click="confirmReset = true"><RotateCcw :size="12" /> Reset level</button>
    </footer>
    <div v-if="confirmReset" class="veil">
      <section role="dialog" aria-modal="true" aria-label="Reset level" class="dialog">
        <RotateCcw :size="22" />
        <h2>Reset {{ level.title }}?</h2>
        <p>This restores the starter controller and floor plan for this level.</p>
        <div>
          <button @click="confirmReset = false">Cancel</button
          ><button class="run" @click="resetLevel">Reset level</button>
        </div>
      </section>
    </div>
  </main>
</template>
