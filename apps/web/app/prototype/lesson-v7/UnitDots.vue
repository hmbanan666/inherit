<script setup lang="ts">
defineProps<{ states: ('done' | 'current' | 'todo')[]; fresh?: number }>()
</script>

<template>
  <span class="unit-dots" aria-hidden="true">
    <i v-for="(state, index) in states" :key="index" :data-state="state" :class="{ fresh: fresh === index }" />
  </span>
</template>

<style scoped>
.unit-dots { display: inline-flex; align-items: center; gap: 5px }
i { width: 9px; height: 9px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--line-strong) }
i[data-state='done'] { background: var(--mint); box-shadow: none }
i[data-state='current'] { box-shadow: inset 0 0 0 2px var(--gold) }
i.fresh { animation: fill .5s .25s cubic-bezier(.3, 1.6, .5, 1) backwards }
@keyframes fill { from { transform: scale(.2); background: var(--gold) } }
@media (prefers-reduced-motion: reduce) { i.fresh { animation: none } }
</style>
