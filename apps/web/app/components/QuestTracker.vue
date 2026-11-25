<script setup lang="ts">
import { overlayLabels } from '../lib/gameOverlay'
import { MoveRight } from '@lucide/vue'
import TownPortrait from './town/TownPortrait.vue'
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import type { questCard } from '../lib/questNote'
import type { GrantNote } from '../lib/questStep'
import { portraits, questLog, questTabHint, shellLabels } from '../lib/shellBar'

const props = defineProps<{
  quest?: QuestDef
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
  openTests: []
  openFile: [file: string]
}>()
const entries = computed(() => questLog(props.quest, props.card))
</script>

<template>
  <div class="tracker quest-log">
    <ol class="quest-entries">
      <li v-for="entry in entries" :key="entry.id" class="quest-entry" :data-expanded="entry.expanded">
        <header>
          <button type="button" class="villager" aria-haspopup="dialog" :disabled="!canVisit"
            @click="emit('visit', $event.currentTarget as HTMLButtonElement)">
            <TownPortrait class="cameo" :person="portraits.get(entry.who)!" />
            <span class="heading">
              <span class="byline">{{ entry.name }} · {{ entry.role }}</span>
              <b class="entry-title">{{ entry.title }}</b>
            </span>
          </button>
        </header>
        <template v-if="entry.expanded">
          <p class="goal quote">{{ entry.quote }}</p>
          <p class="goal">{{ entry.goal }}</p>
          <ul class="goals">
            <li v-for="row in entry.objectives" :key="row.id">
              <span class="box" :class="{ done: row.done }" aria-hidden="true">{{ row.done ? '✓' : '' }}</span>
              <span>{{ row.text }}</span>
              <span class="goal-line">{{ row.count }}</span>
            </li>
          </ul>
          <p class="goal step"><MoveRight :size="14" aria-hidden="true" />{{ step }}</p>
          <p v-if="granted" class="goal">
            {{ granted.text }}
            <button v-if="granted.file" type="button" class="hint" @click="emit('openFile', granted.file)">{{ granted.file }}</button>
          </p>
          <div class="quest-action">
            <button v-if="entry.ready" class="gold" :class="{ pulse }" type="button" data-testid="complete-quest" @click="emit('handOver')">Hand over</button>
            <button type="button" class="calm link" @click="card?.remainingTest ? emit('showTest') : emit('openTests')">{{ shellLabels.seeTests }}</button>
          </div>
        </template>
      </li>
    </ol>
    <div v-if="!entries.length" class="quest-empty">
      <button v-if="canVisit" type="button" class="villager" aria-haspopup="dialog"
        @click="emit('visit', $event.currentTarget as HTMLButtonElement)"><b>{{ step }}</b></button>
      <b v-else>{{ step }}</b>
      <p v-if="canVisit" class="goal">{{ questTabHint }}</p>
      <button type="button" class="hint" aria-haspopup="dialog" @click="emit('journal', $event.currentTarget as HTMLButtonElement)">{{ overlayLabels.journal }}</button>
    </div>
  </div>
</template>

<style scoped>
.tracker { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; font-size: 13px }
.quest-entries, .goals { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.quest-entry, .quest-empty {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--accent-line);
  border-radius: 7px;
  background: var(--accent-surface);
  box-shadow: inset 0 2px var(--accent-shadow);
}
.quest-empty { justify-items: start }
.villager { min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer }
header .villager { display: flex; width: 100%; justify-content: start; gap: 8px }
.cameo { width: 40px; height: 40px; flex: none }
.heading { display: grid; min-width: 0; gap: 2px }
.byline { color: var(--soft); font-size: 12px }
.entry-title { color: var(--accent-soft); font-size: 15px; font-weight: 700 }
.quest-entry[data-expanded="false"] .entry-title { overflow: hidden; white-space: nowrap; text-overflow: ellipsis }
.goal { margin: 0; font-size: 13px; line-height: 1.4 }
.quote { color: var(--soft); font-style: italic }
.step { display: flex; align-items: baseline; gap: 6px; color: var(--sub) }
.step svg { width: 14px; height: 14px; align-self: start; margin-top: 2px }
.goals li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 6px; min-width: 0 }
.box { display: grid; place-items: center; width: 14px; height: 14px; border: 1px solid var(--accent-line); border-radius: 2px; line-height: 1 }
.box.done { border-color: var(--gold); color: var(--gold) }
.goal-line { font-family: var(--mono); font-variant-numeric: tabular-nums }
.quest-action { display: grid; justify-items: start; gap: 4px; padding-top: 6px; border-top: 1px solid var(--accent-line) }
.quest-action .gold { width: 100%; height: 34px }
.quest-action .gold.pulse { animation: quest-ready 0.7s ease-out 1 }
.calm { margin: 0; color: var(--sub); font-size: 13px }
.link { padding: 2px 0; background: transparent; border: 0; text-decoration: underline }
@keyframes quest-ready {
  0% { transform: scale(1) }
  40% { transform: scale(1.04) }
  100% { transform: scale(1) }
}
@media (prefers-reduced-motion: reduce) { .quest-action .gold.pulse { animation: none } }
</style>
