<script setup lang="ts">
import { kettlewick } from '@inherit/sim/v8'
import { BellRing, Check, Cog, Coins, Sparkles, Truck, Unlock } from '@lucide/vue'
import TownPortrait from './town/TownPortrait.vue'
import type { Toast } from '../lib/toasts'
import { dismissToastLabel } from '../lib/worldEvents'

defineProps<{ toasts: readonly Toast[] }>()
const emit = defineEmits<{ dismiss: [id: number]; hover: [over: boolean] }>()
const icons = { check: Check, coins: Coins, level: Sparkles, unlock: Unlock, machine: Cog, drone: Truck, ready: BellRing }
const portraits = new Map(kettlewick.questList?.map(({ who, from, role, building }) => [
  who, { id: who, name: from, role, buildingId: building, mood: 'waiting' as const },
]))
</script>

<template>
  <TransitionGroup tag="div" name="toast" class="toast-stack" role="status" aria-live="polite" aria-atomic="false"
    @pointerenter="$event.pointerType !== 'touch' && emit('hover', true)"
    @pointerleave="$event.pointerType !== 'touch' && emit('hover', false)">
    <button v-for="toast in toasts" :key="toast.id" type="button" class="toast" :title="dismissToastLabel"
      @click="emit('dismiss', toast.id)">
      <template v-if="toast.kind === 'npc'">
        <TownPortrait class="cameo" :person="portraits.get(toast.who)!" />
        <span><b>{{ toast.name }}</b> {{ toast.text }}</span>
      </template>
      <template v-else>
        <component :is="icons[toast.icon]" :size="16" aria-hidden="true" />
        <span>{{ toast.text }}</span>
      </template>
    </button>
  </TransitionGroup>
</template>

<style scoped>
.toast-stack {
  position: absolute;
  z-index: 4;
  right: 12px;
  bottom: 52px;
  width: 300px;
  max-width: calc(100% - 24px);
  max-height: calc(45% - 64px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding: 5px 8px;
  background: var(--overlay);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 7px;
  text-align: left;
  font: inherit;
  font-size: 13px;
  line-height: 1.3;
  pointer-events: auto;
}
.toast svg { flex: none; color: var(--gold) }
.cameo { width: 32px; height: 32px; flex: none }
.toast-enter-active { transition: transform 160ms ease-out }
.toast-enter-from { transform: translateX(100%) }
@media (prefers-reduced-motion: reduce) { .toast-enter-active { transition: none } }
</style>
