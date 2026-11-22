<script setup lang="ts">
defineProps<{goal: string; hints: readonly string[]}>()
const rung = ref(0)
</script>
<template>
  <section class="lesson-card goal-bar" aria-label="Current goal" data-testid="task-card">
    <header><h2>{{ goal }}</h2><button v-if="hints.length" data-testid="hint" @click="rung = (rung + 1) % (hints.length + 1)">{{ !rung ? 'Hint' : rung === hints.length ? 'Hide hint' : rung + 1 === hints.length ? 'Show exact lines' : 'Show places and functions' }}</button></header>
    <pre v-if="rung" class="hint">{{ hints[rung-1] }}</pre>
  </section>
</template>
