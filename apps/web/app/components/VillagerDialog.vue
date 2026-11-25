<script setup lang="ts">
import { isCodeJob, shellLabels } from '../lib/shellBar'
import { villageLabels, type villagerDialog, type villagers } from '../lib/village'

defineProps<{
  person: ReturnType<typeof villagers>[number]
  request: ReturnType<typeof villagerDialog>
}>()
const emit = defineEmits<{ take: [id: string]; handOver: []; close: [] }>()
</script>

<template>
  <GameDialog :title="person.name" @close="emit('close')">
    <article class="quest">
      <VillageAsk class="villager" :who="person.who" :name="person.name" :role="person.role" :building-id="person.building" />
      <p v-if="request.state === 'none'">{{ request.line }}</p>
      <template v-else>
        <p v-if="request.state !== 'ready'">{{ request.summary.quote }}</p>
        <p><b>{{ villageLabels.goal }}</b> · {{ request.summary.goal }} <span v-if="request.state === 'ready'">✓</span></p>
        <p v-if="isCodeJob(request.quest.id)" class="calm">{{ shellLabels.codeJob }}</p>
        <QuestRewards :quest="request.quest" />
        <template v-if="request.state === 'offer'">
          <p v-if="request.hold" class="calm">{{ request.hold }}</p>
          <button class="gold" type="button" data-testid="npc-take" :disabled="!request.canTake" @click="emit('take', request.quest.id)">{{ villageLabels.take }}</button>
        </template>
        <template v-else-if="request.state === 'active'">
          <div class="need">
            <span class="goal-line">{{ request.summary.quantity.text }}</span>
            <progress :value="request.summary.quantity.value" :max="request.summary.quantity.max" :aria-label="request.summary.quantity.text" />
          </div>
          <button type="button" class="hint" @click="emit('close')">{{ villageLabels.close }}</button>
        </template>
        <button v-else class="gold" type="button" data-testid="npc-hand-over" @click="emit('handOver')">{{ villageLabels.handOver }}</button>
      </template>
    </article>
  </GameDialog>
</template>

<style scoped>
.quest { display: grid; gap: 12px; min-width: 0; font-size: 13px; line-height: 1.4 }
.quest p { margin: 0 }
.quest .villager :deep(canvas) { height: 64px }
.calm { color: var(--sub) }
.need { display: grid; gap: 6px; min-width: 0 }
.goal-line { font-variant-numeric: tabular-nums }
.need progress { width: 100%; height: 4px; margin: 0; border: 0; background: var(--line); accent-color: var(--mint) }
.need progress::-webkit-progress-bar { background: var(--line) }
.gold { height: 34px }
.hint { justify-self: start }
</style>
