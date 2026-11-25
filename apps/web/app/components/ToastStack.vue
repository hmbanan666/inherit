<script setup lang="ts">
import { portraits } from '../lib/shellBar'
import { BellRing, Check, Cog, Coins, MessageCircle, Sparkles, Truck, Unlock } from '@lucide/vue'
import TownPortrait from './town/TownPortrait.vue'
import type { Toast } from '../lib/toasts'
import { dismissToastLabel } from '../lib/worldEvents'

defineProps<{ toasts: readonly Toast[] }>()
const emit = defineEmits<{ dismiss: [id: number]; hover: [over: boolean] }>()
const icons = { check: Check, coins: Coins, level: Sparkles, unlock: Unlock, machine: Cog, drone: Truck, ready: BellRing, talk: MessageCircle }
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
        <component :is="icons[toast.icon]" :size="20" aria-hidden="true" />
        <span>{{ toast.text }}</span>
      </template>
    </button>
  </TransitionGroup>
</template>

<style scoped>
.toast-stack {
  position: absolute;
  z-index: 20;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: min(400px, 100% - 24px);
  max-height: calc(100% - 24px);
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 16px 48px var(--shadow-light);
  text-align: left;
  font: inherit;
  font-size: 15px;
  line-height: 1.4;
  pointer-events: auto;
}
.toast svg { width: 20px; height: 20px; flex: none; color: var(--gold) }
.cameo { width: 40px; height: 40px; flex: none }
.toast-enter-active { transition: opacity 240ms ease-out, transform 240ms ease-out }
.toast-leave-active { transition: opacity 180ms ease-in, transform 180ms ease-in }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px) }
@media (prefers-reduced-motion: reduce) {
  .toast-enter-from, .toast-leave-to { transform: none }
  .toast-enter-active { transition: opacity 240ms ease-out !important }
  .toast-leave-active { transition: opacity 180ms ease-in !important }
}
</style>
