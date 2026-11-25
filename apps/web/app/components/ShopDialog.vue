<script setup lang="ts">
import { overlayLabels } from '../lib/gameOverlay'
import type { shopFor } from '@inherit/sim/v8'

defineProps<{ catalog: ReturnType<typeof shopFor>; credits: number; bought: string[] }>()
const emit = defineEmits<{ close: []; buy: [id: string] }>()
</script>

<template>
  <GameDialog :title="overlayLabels.shop" @close="emit('close')">
    <ul class="shop-list purchases">
      <li v-for="item in catalog" :key="item.id">
        <button type="button" :disabled="bought.includes(item.id) || credits < item.price"
          @click="emit('buy', item.id)">
          <b>{{ item.name }}</b>
          <span v-if="bought.includes(item.id)" class="owned">Owned</span>
          <span v-else>{{ item.price }} credits</span>
          <small>{{ item.detail }}</small>
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
.shop-list button span { justify-self: end; color: var(--accent-soft); font: 13px var(--mono) }
.shop-list button small { grid-column: 1 / -1; color: var(--soft); font-size: 12px; font-weight: 400 }
.shop-list button:disabled, .shop-list button.locked { opacity: 0.45 }
.purchases button:enabled { border-color: var(--gold); background: var(--accent-surface) }
.purchases button:enabled:hover { background: var(--hover) }
.purchases button:disabled { opacity: 1 }
.purchases button .owned { color: var(--sub) }
</style>
