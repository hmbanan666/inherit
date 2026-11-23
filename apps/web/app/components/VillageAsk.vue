<script setup lang="ts">
import type { Townsperson } from '../lib/townTypes'
import TownPortrait from './town/TownPortrait.vue'

const props = defineProps<{
  who: Townsperson['id']
  name: string
  role: string
  buildingId: Townsperson['buildingId']
  line?: string
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
  <section class="who" aria-label="Village">
    <TownPortrait :person="person" />
    <div>
      <strong>{{ name }}</strong>
      <span v-if="line" class="ask">{{ line }}</span>
      <span v-else>{{ role }}</span>
    </div>
  </section>
</template>

<style scoped>
.who {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.who :deep(canvas) {
  height: 48px;
  width: auto;
  flex: none;
  border-radius: 4px;
}
.who strong { font-size: 14px }
.who span {
  display: block;
  color: var(--sub);
  font: 10px var(--mono);
  letter-spacing: 1px;
  text-transform: uppercase;
}
.who span.ask {
  color: var(--soft);
  font: 13px/1.35 inherit;
  letter-spacing: 0;
  text-transform: none;
}
</style>
