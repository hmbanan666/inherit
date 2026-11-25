<script setup lang="ts">
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import type { questCard, questSummary } from '../lib/questNote'
import { villageLabels } from '../lib/village'

defineProps<{
  quest: QuestDef
  card: NonNullable<ReturnType<typeof questCard>>
  summary: NonNullable<ReturnType<typeof questSummary>>
  reading: boolean
  canTake: boolean
  hold?: string
  ready: boolean
  pulse: boolean
}>()
const emit = defineEmits<{
  take: []
  handOver: []
  showTest: []
  back: []
}>()
</script>

<template>
  <article class="quest">
    <button v-if="reading" type="button" class="hint" @click="emit('back')">All requests</button>
    <h2>{{ card.title }}</h2>
    <VillageAsk :who="quest.who" :name="card.from.replace(/^Mayor /, '')" :role="quest.role" :building-id="quest.building" :line="summary.quote" />
    <div class="need">
      <p><b>{{ villageLabels.goal }}</b> · {{ summary.goal }}</p>
      <span class="goal-line">{{ summary.quantity.text }}</span>
      <progress :value="summary.quantity.value" :max="summary.quantity.max" :aria-label="summary.quantity.text" />
    </div>
    <QuestRewards :quest="quest" />
  </article>
  <div class="quest-action">
    <template v-if="reading">
      <button class="gold" type="button" data-testid="take-quest" :disabled="!canTake" @click="emit('take')">Take quest</button>
      <p v-if="hold" class="calm">{{ hold }}</p>
    </template>
    <button v-else-if="card.remainingTest" type="button" class="calm link" @click="emit('showTest')">View remaining test</button>
    <p v-else-if="!ready" class="calm">In progress</p>
    <button v-else class="gold" :class="{ pulse }" type="button" @click="emit('handOver')">Hand over</button>
  </div>
</template>

<style scoped>
.quest { display: grid; gap: 12px; min-width: 0 }
.quest h2 {
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: -0.4px;
  margin: 0;
}
.quest-action {
  flex: none;
  margin-top: auto;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--line);
}
.need { display: grid; gap: 6px; min-width: 0 }
.need p { margin: 0; font-size: 13px; line-height: 1.4 }
.need progress { width: 100%; height: 4px; margin: 0; border: 0; background: var(--line); accent-color: var(--mint) }
.need progress::-webkit-progress-bar { background: var(--line) }
.quest-action .gold { width: 100%; height: 34px }
.quest-action .gold.pulse { animation: quest-ready 0.7s ease-out 1 }
.quest-action .calm {
  margin: 0;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--sub);
  font-size: 13px;
}
.quest-action .link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  background: transparent;
  border: 0;
  color: var(--text);
  text-decoration: underline;
  cursor: pointer;
}
@keyframes quest-ready {
  0% { transform: scale(1) }
  40% { transform: scale(1.04) }
  100% { transform: scale(1) }
}
.goal-line {
  min-width: 0;
  min-height: 1.3em;
  font-size: 13px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint { justify-self: start }
@media (prefers-reduced-motion: reduce) { .quest-action .gold.pulse { animation: none } }
</style>
