<script setup lang="ts">
import type { TownSnapshot } from '@inherit/sim'
import TownPortrait from './town/TownPortrait.vue'
import { useGame } from '../lib/useGame'
const props = defineProps<{ person?: TownSnapshot['people'][number] }>()
const g = useGame()
const ask = computed(() => props.person?.ask)
const c = computed(() => g.campaign.value)
const hint = ref(0)
const lesson = g.lesson
watch(() => lesson.value?.id, () => {
  hint.value = 0
})
const units: Record<string, string> = {
  'iron-ingot': 'iron ingots',
  plate: 'plates',
  wire: 'coils of wire',
  gear: 'gears',
  bracket: 'brackets',
  coins: 'coins',
}
</script>
<template>
  <section class="objective request" aria-label="Current request">
    <div class="request-main">
      <TownPortrait v-if="person" class="objective-icon" :person="person" />
      <span v-else class="objective-icon portrait" aria-hidden="true">✉</span>
      <div class="goal-body">
        <small class="eyebrow">{{ person ? person.name + ' · ' + person.role : lesson?.who }}</small>
        <h2>{{ ask?.title ?? (c.town.beat === 11 ? 'The shed is yours.' : lesson?.title) }}</h2>
        <p>{{ ask?.text ?? lesson?.story }}</p>
      </div>
    </div>
    <div v-if="ask" class="request-count">
      <b v-for="(count, item) in ask.items" :key="item"
        >{{ ask.filled[item] ?? 0 }} / {{ count }} {{ units[item] ?? item }}</b
      >
    </div>
    <div v-if="lesson" class="lesson">
      <strong>{{ lesson.title }}</strong>
      <template v-if="g.view.value?.phase === 'solved'">
        <p>{{ lesson.solved.did }} {{ lesson.solved.idea }} {{ lesson.solved.reward }}</p>
        <button @click="g.act({ kind: 'continue' })">Continue</button>
      </template>
      <template v-else>
        <p>{{ lesson.task }}</p>
        <p>{{ lesson.idea?.explain }}</p>
        <button class="hint" @click="hint = (hint + 1) % 4">
          {{ ['Hint', 'Places and functions', 'Show me the lines', 'Hide hint'][hint] }}
        </button>
        <code v-if="hint" class="exact">{{ lesson.hints[hint - 1] }}</code>
      </template>
    </div>
    <button v-if="c.town.beat === 2" class="hint" @click="g.act({ kind: 'read', id: 'tab' })">Pay later</button>
  </section>
</template>
<style scoped>
.exact { max-height: 130px; overflow: auto; user-select: all; }
.request {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}
.request-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.portrait {
  font-size: 29px;
}
.goal-body p {
  font-size: 14px;
  line-height: 1.45;
}
.request-count {
  display: grid;
  gap: 6px;
  text-align: right;
  font: 12px var(--mono);
}
.lesson {
  grid-column: 1/-1;
  border-top: 1px solid var(--line);
  padding-top: 9px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.lesson strong {
  flex: 1;
}
.lesson p, .lesson code {
  flex-basis: 100%;
  margin: 0;
}
.lesson code {
  white-space: pre-wrap;
  color: var(--gold);
}
</style>
