<script setup lang="ts">
import { kettlewick } from '@inherit/sim/v8'
import { BellRing, Check, Cog, Coins, MessageCircle, Sparkles, Truck, Unlock } from '@lucide/vue'
import TownPortrait from './town/TownPortrait.vue'
import type { Toast } from '../lib/toasts'
import { dismissToastLabel } from '../lib/worldEvents'

defineProps<{ toasts: readonly Toast[] }>()
const emit = defineEmits<{ dismiss: [id: number]; hover: [over: boolean] }>()
const icons = { check: Check, coins: Coins, level: Sparkles, unlock: Unlock, machine: Cog, drone: Truck, ready: BellRing, talk: MessageCircle }
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
        <component :is="icons[toast.icon]" :size="18" aria-hidden="true" />
        <span>{{ toast.text }}</span>
      </template>
    </button>
  </TransitionGroup>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  z-index: 20;
  right: 16px;
  bottom: 37px;
  width: 340px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 65px - 25px - 32px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
  background: var(--overlay);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 16px var(--shadow-light);
  text-align: left;
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  pointer-events: auto;
}
.toast svg { width: 18px; height: 18px; flex: none; color: var(--gold) }
.cameo { width: 40px; height: 40px; flex: none }
.toast-enter-active { transition: transform 160ms ease-out }
.toast-enter-from { transform: translateX(100%) }
@media (prefers-reduced-motion: reduce) { .toast-enter-active { transition: none } }
</style>
