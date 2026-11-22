<script setup lang="ts">
import { Check } from '@lucide/vue'
const props = defineProps<{
  solved: { reaction: string; did: string; idea: string; reward?: string }
  busy: boolean
  noHints?: boolean
  streak?: number
  landmark?: string
}>()
const emit = defineEmits<{ advance: [] }>()
const button = ref<HTMLButtonElement>()
function enter(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey ||
      (event.target instanceof HTMLElement && event.target.closest('a, dialog, [data-testid="drawer"]'))) return
  event.preventDefault()
  event.stopPropagation()
  if (!event.repeat && !props.busy) emit('advance')
}
onMounted(() => {
  button.value?.focus({ preventScroll: true })
  window.addEventListener('keydown', enter, true)
})
onBeforeUnmount(() => window.removeEventListener('keydown', enter, true))
watch(() => props.busy, busy => { if (!busy) button.value?.focus({ preventScroll: true }) })
</script>

<template>
  <section class="celebration" data-testid="solved-card" aria-labelledby="celebration-title">
    <div class="confetti" aria-hidden="true"><i v-for="n in 14" :key="n" :style="{ '--n': n }" /></div>
    <small><Check /> Done <span v-if="noHints"> · ★ No hints</span></small>
    <h2 id="celebration-title">{{ solved.reaction }}</h2>
    <p>{{ solved.did }} {{ solved.idea }}</p>
    <p v-if="solved.reward">{{ solved.reward }}</p>
    <p v-if="landmark" class="landmark">Unit complete · {{ landmark }}</p>
    <strong v-if="streak && streak >= 3">{{ streak }} in a row on the first try</strong>
    <footer><button ref="button" class="gold" data-testid="continue" :disabled="busy" @click="emit('advance')">Continue</button>
      <a v-if="landmark" href="/">Stop here</a></footer>
  </section>
</template>

<style scoped>
.celebration { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); z-index: 6; width: min(360px, 90%); max-height: 94%; overflow: auto; padding: 23px; border: 1px solid var(--accent-line); border-radius: 12px; background: var(--panel); box-shadow: 0 12px 46px var(--shadow) }
small { display: flex; align-items: center; gap: 5px; color: var(--mint) }
small svg { width: 16px }
h2 { margin: 9px 0; font-size: 22px }
p { margin: 6px 0; font-size: 14px; color: var(--soft) }
.landmark, strong { color: var(--gold) }
footer { display: flex; align-items: center; gap: 18px; margin-top: 18px }
a { color: var(--soft) }
.confetti { position: absolute; top: 24%; left: 50%; pointer-events: none }
.confetti i { position: absolute; width: 5px; height: 8px; opacity: 0; background: var(--gold); animation: burst 1s ease-out }
.confetti i:nth-child(even) { background: var(--mint) }
@keyframes burst {
  from { transform: rotate(calc(var(--n) * 26deg)) translateY(0); opacity: 1 }
  to { transform: rotate(calc(var(--n) * 26deg)) translateY(-85px) rotate(150deg); opacity: 0 }
}
@media (prefers-reduced-motion: reduce) { .confetti { display: none } .confetti i { animation: none } }
</style>
