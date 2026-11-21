<script setup lang="ts">
import type { LessonStep } from '@inherit/sim'
defineProps<{ step: LessonStep }>()
const rung = ref(0)
const labels = ['Hint', 'Show places and functions', 'Show exact lines', 'Hide hint']
</script>
<template>
  <section class="lesson-card" data-testid="task-card" aria-label="Current task">
    <header><h2>{{ step.title }}</h2><button :aria-expanded="rung > 0" @click="rung = (rung + 1) % 4">{{ labels[rung] }}</button></header>
    <p>{{ step.task }}</p>
    <p v-if="step.idea" class="idea"><strong>{{ step.idea.name }}.</strong> {{ step.idea.explain }}</p>
    <pre v-if="rung === 3">{{ step.hints[2] }}</pre>
    <p v-else-if="rung" class="hint">{{ step.hints[rung - 1] }}</p>
  </section>
</template>
