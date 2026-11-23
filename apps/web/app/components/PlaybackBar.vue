<script setup lang="ts">
defineProps<{ tickCount: number; live?: boolean }>()
defineEmits<{ stop: [] }>()
const paused = defineModel<boolean>('paused', { required: true })
const speed = defineModel<number>('speed', { required: true })
</script>

<template>
  <div class="playback-bar" role="group" aria-label="Clock controls">
    <output aria-live="off">onTick #{{ tickCount }}</output>
    <button v-if="live !== false" @click="paused = !paused">{{ paused ? 'Play' : 'Pause' }}</button>
    <button v-for="rate in [1, 2, 4]" :key="rate" :aria-pressed="speed === rate" @click="speed = rate">
      {{ rate }}x
    </button>
    <button v-if="live !== false" @click="$emit('stop')">Stop loop</button>
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
  padding: 4px 6px;
  font: 12px var(--mono);
}
.playback-bar button[aria-pressed='true'] {
  color: var(--gold);
  border-color: var(--accent-line);
}
</style>
