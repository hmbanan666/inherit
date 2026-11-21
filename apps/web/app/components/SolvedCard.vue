<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { LessonStep, Reveal } from '@inherit/sim'
const props = defineProps<{ nextReveal?: Reveal; solved: LessonStep['solved']; busy: boolean }>()
const next = computed(() => {
  const reveal = props.nextReveal
  if (!reveal) return ''
  if (reveal.kind === 'section') return 'Continue to unlock ' + reveal.id[0]!.toUpperCase() + reveal.id.slice(1) + '.'
  if (reveal.kind === 'letter') return 'Continue to receive a letter.'
  if (reveal.kind === 'coins') return 'Continue to collect your coins.'
  return 'Continue to see the family tab.'
})
defineEmits<{ advance: [] }>()
</script>
<template>
  <section class="lesson-card solved-card" data-testid="solved-card" aria-live="polite">
    <header><h2><Check /> Done</h2><button class="gold" data-testid="continue" :disabled="busy" @click="$emit('advance')">Continue</button></header>
    <p><strong>{{ solved.did }}</strong> {{ solved.idea }}</p>
    <p v-if="solved.reward" class="reward">{{ solved.reward }}</p>
    <p v-if="next">{{ next }}</p>
  </section>
</template>
