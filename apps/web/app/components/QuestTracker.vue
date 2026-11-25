<script setup lang="ts">
import { overlayLabels } from '../lib/gameOverlay'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import type { questCard } from '../lib/questNote'
import type { GrantNote } from '../lib/questStep'
import { readTrackerOpen, testLabel, testMark, trackerKey, trackerRows } from '../lib/questTracker'

const props = defineProps<{
  card?: NonNullable<ReturnType<typeof questCard>>
  canVisit: boolean
  step: string
  granted?: GrantNote
  pulse: boolean
}>()
const emit = defineEmits<{
  visit: [opener: HTMLButtonElement]
  journal: [opener: HTMLButtonElement]
  handOver: []
  showTest: []
  openFile: [file: string]
}>()
const open = ref(true)
const tests = computed(() => trackerRows(props.card?.tests ?? []))
onMounted(() => {
  try { open.value = readTrackerOpen(localStorage.getItem(trackerKey)) }
  catch { /* Use the default. */ }
})
function toggle() {
  open.value = !open.value
  try { localStorage.setItem(trackerKey, open.value ? 'open' : 'closed') }
  catch { /* Keep the choice for this session. */ }
}
</script>

<template>
  <aside class="tracker" :aria-label="overlayLabels.tracker">
    <header>
      <button v-if="canVisit" type="button" class="villager" :class="{ folded: card && !open }" aria-haspopup="dialog"
        @click="emit('visit', $event.currentTarget as HTMLButtonElement)">
        <b v-if="card">{{ card.from.replace(/^Mayor /, '') }} · {{ open ? card.title : step }}</b>
        <b v-else>{{ step }}</b>
      </button>
      <b v-else>{{ step }}</b>
      <button v-if="card" type="button" class="fold" :aria-expanded="open" :aria-label="open ? overlayLabels.collapse : overlayLabels.expand" @click="toggle">
        <ChevronUp v-if="open" :size="16" /><ChevronDown v-else :size="16" />
      </button>
      <button v-else type="button" class="hint" aria-haspopup="dialog" @click="emit('journal', $event.currentTarget as HTMLButtonElement)">{{ overlayLabels.journal }}</button>
    </header>
    <template v-if="card && open">
      <p class="goal step">{{ step }}</p>
      <p v-if="granted" class="goal">
        {{ granted.text }}
        <button v-if="granted.file" type="button" class="hint" @click="emit('openFile', granted.file)">{{ granted.file }}</button>
      </p>
      <ul class="goals">
        <li v-for="row in tests.rows" :key="row.id" :data-mark="row.state" :aria-label="testLabel(row.state, row.text)">
          <span><span aria-hidden="true">{{ testMark(row.state) }}</span> {{ row.text }}</span>
          <small v-if="row.reason">{{ row.reason }}</small>
        </li>
      </ul>
      <small v-if="tests.more">{{ overlayLabels.more(tests.more) }}</small>
      <div class="need">
        <span class="goal-line">{{ card.quantity.text }}</span>
        <progress :value="card.quantity.value" :max="card.quantity.max" :aria-label="card.quantity.text" />
      </div>
      <div class="quest-action">
        <button v-if="card.remainingTest" type="button" class="calm link" @click="emit('showTest')">View remaining test</button>
        <p v-else-if="!card.ready" class="calm">In progress</p>
        <button v-else class="gold" :class="{ pulse }" type="button" data-testid="complete-quest" @click="emit('handOver')">Hand over</button>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.tracker {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 280px;
  max-width: calc(100% - 24px);
  max-height: calc(50% - 12px);
  overflow: auto;
  z-index: 4;
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  background: var(--overlay);
  border: 1px solid var(--line);
  border-radius: 7px;
  font-size: 13px;
}
header { display: flex; align-items: center; justify-content: space-between; gap: 6px }
.villager { min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer }
.folded { overflow: hidden; white-space: nowrap; text-overflow: ellipsis }
.fold { flex: none; display: grid; place-items: center; padding: 2px; color: var(--soft); background: transparent; border: 0 }
.goal { margin: 0; font-size: 13px; line-height: 1.4 }
.step { font-weight: 700 }
.goals { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.goals li { display: grid; gap: 3px; min-width: 0 }
.goals [data-mark=passing] { color: var(--mint) }
.goals [data-mark=failed] { color: var(--alert) }
small { color: var(--soft); font-size: 12px; line-height: 1.35 }
.need { display: grid; gap: 6px; min-width: 0 }
.goal-line { font-variant-numeric: tabular-nums }
.need progress { width: 100%; height: 4px; margin: 0; border: 0; background: var(--line); accent-color: var(--mint) }
.need progress::-webkit-progress-bar { background: var(--line) }
.quest-action { padding-top: 6px; border-top: 1px solid var(--line); text-align: center }
.quest-action .gold { width: 100%; height: 34px }
.quest-action .gold.pulse { animation: quest-ready 0.7s ease-out 1 }
.calm { margin: 0; color: var(--sub); font-size: 13px }
.link { width: 100%; background: transparent; border: 0; color: var(--text); text-decoration: underline }
@keyframes quest-ready {
  0% { transform: scale(1) }
  40% { transform: scale(1.04) }
  100% { transform: scale(1) }
}
@media (prefers-reduced-motion: reduce) { .quest-action .gold.pulse { animation: none } }
</style>
