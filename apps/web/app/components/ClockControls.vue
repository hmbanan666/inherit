<script setup lang="ts">
const paused = defineModel<boolean>('paused', { required: true })
const speed = defineModel<number>('speed', { required: true })
</script>

<template>
  <div class="clock-controls" role="group" aria-label="Clock controls">
    <button @click="paused = !paused">{{ paused ? 'Resume' : 'Pause' }}</button>
    <button v-for="rate in [1, 2, 4]" :key="rate" :aria-pressed="speed === rate" @click="speed = rate">
      {{ rate }}x
    </button>
  </div>
</template>

<style scoped>
.clock-controls {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
}
.clock-controls button {
  padding: 4px 6px;
  font: 12px var(--mono);
}
.clock-controls button[aria-pressed='true'] {
  color: var(--gold);
  border-color: var(--accent-line);
}
</style>
