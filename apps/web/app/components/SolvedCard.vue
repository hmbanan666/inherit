<script setup lang="ts">
import { Check } from '@lucide/vue'
defineProps<{ next?: string; solved: { reaction: string; did: string; idea: string; reward?: string }; busy: boolean }>()
defineEmits<{ advance: [] }>()
</script>
<template>
  <section class="lesson-card solved-card" data-testid="solved-card" aria-live="polite">
    <header><h2><Check /> Done</h2><button class="gold" data-testid="continue" :disabled="busy" @click="$emit('advance')">Continue</button></header>
    <p>{{ solved.reaction }}</p>
    <p><strong>{{ solved.did }}</strong> {{ solved.idea }}</p>
    <p v-if="solved.reward" class="reward">{{ solved.reward }}</p>
    <p v-if="next">{{ next }}</p>
  </section>
</template>
