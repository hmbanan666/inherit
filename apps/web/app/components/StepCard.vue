<script setup lang="ts">
import type { Lesson } from '@inherit/sim/pack'
defineProps<{ goal: string; steps: readonly string[]; current: number; prediction?: Lesson<unknown>['prediction']; choice?: string; busy: boolean }>()
defineEmits<{ help: []; predict: [choice: string] }>()
</script>

<template>
  <section class="step-card" aria-label="Current goal" data-testid="task-card">
    <header><h2>{{ goal }}</h2>
      <button aria-label="Open lesson drawer" data-testid="hint" @click="$emit('help')">?</button>
    </header>
    <ol><li v-for="(step, i) in steps" :key="i" :aria-current="current === i ? 'step' : undefined"
      :class="{ current: current === i && i < steps.length - 1, done: i < current }">
      <span>{{ i < current ? '✓' : i + 1 }}</span> {{ step }}
    </li></ol>
    <fieldset v-if="prediction"><legend>{{ prediction.question }}</legend>
      <button v-for="option in prediction.choices" :key="option" :aria-pressed="choice === option"
        :disabled="busy || !!choice" @click="$emit('predict', option)">{{ option }}</button>
    </fieldset>
  </section>
</template>

<style scoped>
.step-card { padding: 8px 14px; border-bottom: 1px solid var(--line) }
header, ol { display: flex; align-items: center; gap: 8px }
h2 { flex: 1; font-size: 16px; margin: 0 }
ol { list-style: none; flex-wrap: wrap; margin: 6px 0 0; padding: 0 }
li { border: 1px solid var(--line); border-radius: 5px; padding: 3px 6px; font-size: 13px; color: var(--sub) }
.current { color: var(--gold); border-color: currentColor }
.done span { color: var(--mint) }
fieldset { border: 0; padding: 4px 0 }
</style>
