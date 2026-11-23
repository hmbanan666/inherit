<script setup lang="ts">
import type { Townsperson } from '../lib/townTypes'
import TownPortrait from './town/TownPortrait.vue'

const props = defineProps<{
  who: Townsperson['id']
  name: string
  role: string
  buildingId: Townsperson['buildingId']
  text: string
  done?: string
}>()
const person = computed<Townsperson>(() => ({
  id: props.who,
  name: props.name,
  role: props.role,
  buildingId: props.buildingId,
  mood: 'waiting',
}))
</script>

<template>
  <section class="ask" aria-label="Village">
    <TownPortrait :person="person" />
    <div class="speech">
      <strong>{{ name }}</strong>
      <span>{{ role }}</span>
      <p data-testid="ask">{{ text }}</p>
      <p v-if="done" class="done">{{ done }}</p>
    </div>
  </section>
</template>

<style scoped>
.ask {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: none;
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--panel);
}
.ask :deep(canvas) {
  height: 76px;
  width: auto;
  flex: none;
  border-radius: 4px;
}
.speech { min-width: 0 }
.speech span {
  display: block;
  color: var(--sub);
  font: 10px var(--mono);
  letter-spacing: 1px;
  text-transform: uppercase;
}
.speech p {
  margin-top: 4px;
  padding: 6px 10px;
  border: 1px solid var(--accent-line);
  border-radius: 8px;
  background: var(--accent-surface);
  font-size: 14px;
  line-height: 1.35;
}
.done { color: var(--mint) }
</style>
