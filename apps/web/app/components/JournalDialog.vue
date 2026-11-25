<script setup lang="ts">
import { overlayLabels } from '../lib/gameOverlay'
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import type { questCard, questSummary } from '../lib/questNote'
import type { questHistory } from '../lib/questJournal'

defineProps<{
  quest?: QuestDef
  card?: NonNullable<ReturnType<typeof questCard>>
  step: string
  summary?: NonNullable<ReturnType<typeof questSummary>>
  reading: boolean
  canTake: boolean
  hold?: string
  ready: boolean
  pulse: boolean
  active: boolean
  offers: { quest: QuestDef; hold?: string }[]
  history: ReturnType<typeof questHistory>
}>()
const emit = defineEmits<{
  close: []
  read: [who: QuestDef['who']]
  take: [id: string]
  handOver: []
  showTest: []
}>()
const requests = ref<HTMLHeadingElement>()
</script>

<template>
  <GameDialog :title="overlayLabels.journal" @close="emit('close')">
    <section>
      <h3>{{ overlayLabels.now }}</h3>
      <QuestCard v-if="quest && card && summary" :quest="quest" :card="card" :summary="summary"
        :reading="reading" :can-take="canTake" :hold="hold" :ready="ready" :pulse="pulse"
        @back="requests?.focus()" @take="emit('take', quest.id)" @hand-over="emit('handOver')"
        @show-test="emit('showTest')" />
      <p v-else class="goal">{{ step }}</p>
    </section>
    <section v-if="!active">
      <h3 ref="requests" tabindex="-1">{{ overlayLabels.requests }}</h3>
      <ul v-if="offers.length" class="requests">
        <li v-for="offer in offers" :key="offer.quest.id">
          <button type="button" aria-haspopup="dialog" @click="emit('read', offer.quest.who)">
            <span class="initial" aria-hidden="true">{{ offer.quest.from.replace(/^Mayor /, '').slice(0, 1) }}</span>
            <span>
              <b>{{ offer.quest.from.replace(/^Mayor /, '') }}</b>
              <small>{{ offer.quest.ask }}</small>
              <small v-if="offer.hold">{{ offer.hold }}</small>
            </span>
          </button>
        </li>
      </ul>
    </section>
    <section>
      <h3>{{ overlayLabels.done }}</h3>
      <ul v-if="history.length" class="history">
        <li v-for="row in history" :key="row.id">
          <b>{{ row.title }}</b> · {{ row.from }}
          <p>{{ row.change }}</p>
        </li>
      </ul>
      <p v-else>{{ overlayLabels.emptyHistory }}</p>
    </section>
  </GameDialog>
</template>

<style scoped>
.requests { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.requests button {
  width: 100%;
  display: flex;
  gap: 8px;
  align-items: center;
  text-align: left;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 8px;
  color: var(--text);
}
.requests b { display: block; font-size: 14px }
.requests small { display: block; color: var(--soft); font-size: 12px; line-height: 1.35 }
.initial {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-low);
  color: var(--gold);
  font: 700 13px var(--mono);
}
.goal { font-size: 13px; line-height: 1.4 }
section + section { margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--line) }
h3 { margin: 0 0 10px; font-size: 14px }
.history { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px }
p { margin: 0; font-size: 13px; line-height: 1.4 }
</style>
