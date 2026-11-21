<script setup lang="ts">
import { bankLesson, storyLetter, type TownSnapshot } from '@inherit/sim'
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
const interlude = computed(() => storyLetter(c.value))
const bank = computed(() => bankLesson(c.value))
</script>
<template>
  <section class="objective request" aria-label="Current request">
    <div class="request-main">
      <TownPortrait v-if="person" class="objective-icon" :person="person" />
      <span v-else class="objective-icon portrait" aria-hidden="true">✉</span>
      <div class="goal-body">
        <small class="eyebrow">{{ person ? person.name + ' · ' + person.role : interlude?.from }}</small>
        <h2>{{ ask?.title ?? (c.town.beat === 11 ? 'The shed is yours.' : interlude?.title) }}</h2>
        <p>{{ ask?.text ?? interlude?.body }}</p>
      </div>
    </div>
    <div v-if="ask" class="request-count">
      <b v-for="(count, item) in ask.items" :key="item"
        >{{ ask.filled[item] ?? 0 }} / {{ count }} {{ units[item] ?? item }}</b
      >
    </div>
    <div v-if="lesson" class="lesson">
      <strong>{{ lesson.title }}</strong>
      <button v-if="g.activeFile.value !== lesson.file" @click="g.openFile(lesson.file)">Open {{ lesson.file }}</button>
      <button class="hint" :aria-expanded="hint > 0" @click="hint = (hint + 1) % 3">
        {{ ['Hint', 'Show exact step', 'Hide hint'][hint] }}
      </button>
      <p v-if="lesson.cases.length"><b>{{ lesson.name }}</b> is your name for this job. {{ lesson.instruction }}</p>
      <p v-else>{{ lesson.instruction }}</p>
      <code v-if="hint < 2">{{ lesson.bricks.join('   ·   ') }}</code>
      <p v-if="hint === 1">{{ lesson.idea }}</p>
      <code v-if="hint === 2" class="exact">{{ lesson.exact }}</code>
    </div>
    <div v-if="bank" class="lesson">
      <strong>{{ bank.title }}</strong>
      <button class="hint" :aria-expanded="hint > 0" @click="hint = (hint + 1) % 3">
        {{ ['Hint', 'Show exact step', 'Hide hint'][hint] }}
      </button>
      <p v-if="hint">{{ hint === 1 ? bank.idea : bank.exact }}</p>
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
