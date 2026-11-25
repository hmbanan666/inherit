<script setup lang="ts">
import { overlayLabels } from '../lib/gameOverlay'
import type { machineList } from '@inherit/sim/v8'

defineProps<{ machines: ReturnType<typeof machineList> }>()
const emit = defineEmits<{ close: []; openMachine: [id: string] }>()
</script>

<template>
  <GameDialog :title="overlayLabels.machines" @close="emit('close')">
    <ul class="shop-list">
      <li v-for="row in machines" :key="row.id">
        <button type="button" @click="emit('openMachine', row.id)">
          <b>{{ row.name }}</b>
          <small>{{ row.detail }}</small>
        </button>
      </li>
    </ul>
  </GameDialog>
</template>

<style scoped>
.shop-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.shop-list button {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  justify-content: stretch;
  justify-items: start;
  gap: 2px 8px;
  text-align: left;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 8px;
}
.shop-list button small { grid-column: 1 / -1; color: var(--soft); font-size: 12px; font-weight: 400 }
</style>
