<script setup lang="ts">
import { Pause, Play } from '@lucide/vue'
withDefaults(defineProps<{ tickCount?: number; live?: boolean; stoppable?: boolean; rates?: readonly number[] }>(), {
  live: true, stoppable: true, rates: () => [1, 2, 4],
})
defineEmits<{ stop: [] }>()
const paused = defineModel<boolean>('paused', { required: true })
const speed = defineModel<number>('speed', { required: true })
</script>

<template>
  <div class="playback-bar speeds" role="group" aria-label="Clock controls">
    <output v-if="tickCount !== undefined" aria-live="off">onTick #{{ tickCount }}</output>
    <button v-if="live" :aria-label="paused ? 'Resume' : 'Pause'" @click="paused = !paused"><Play v-if="paused" /><Pause v-else /></button>
    <button v-for="rate in rates" :key="rate" :aria-pressed="speed === rate" @click="speed = rate">
      {{ rate }}x
    </button>
    <button v-if="live && stoppable" @click="$emit('stop')">Stop loop</button>
  </div>
</template>

<style scoped>
.playback-bar {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
}
.playback-bar output {
  padding-inline: 4px;
  font: 12px var(--mono);
  font-variant-numeric: tabular-nums;
}
.playback-bar button {
  width: auto;
  min-width: 30px;
  padding: 4px 6px;
  font: 12px var(--mono);
}
.playback-bar button[aria-pressed='true'] {
  color: var(--gold);
  border-color: var(--accent-line);
}
</style>
