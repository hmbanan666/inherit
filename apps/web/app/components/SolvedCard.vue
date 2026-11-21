<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { LessonStep } from '@inherit/sim'
defineProps<{ solved: LessonStep['solved']; busy: boolean }>()
defineEmits<{ advance: [] }>()
</script>
<template>
  <section class="lesson-card solved-card" data-testid="solved-card" aria-live="polite">
    <header><h2><Check /> Done</h2><button class="gold" data-testid="continue" :disabled="busy" @click="$emit('advance')">Continue</button></header>
    <p><strong>{{ solved.did }}</strong> {{ solved.idea }}</p>
    <p v-if="solved.reward" class="reward">{{ solved.reward }}</p>
  </section>
</template>
