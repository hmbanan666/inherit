<script setup lang="ts">
import { Check } from '@lucide/vue'
const props = defineProps<{
  solved: { reaction: string; did: string; idea: string; reward?: string }
  focus?: string
  effect?: string
  busy: boolean
  noHints?: boolean
  streak?: number
  landmark?: string
}>()
const emit = defineEmits<{ advance: [] }>()
const button = ref<HTMLButtonElement>()
const card = ref<HTMLElement>()
const position = ref<Record<string, string>>({})
const result = ref('')
let observer: ResizeObserver | undefined
function place() {
  const shell = card.value?.parentElement
  if (!shell) return
  const focusElement = props.focus && shell.querySelector('[data-focus="' + CSS.escape(props.focus) + '"]')
  const effect = props.effect && shell.querySelector('[data-testid="' + CSS.escape(props.effect) + '"]')
  result.value = effect ? effect.textContent?.trim() ?? '' : ''
  const target = focusElement || effect
  if (!target) return
  const box = shell.getBoundingClientRect()
  const focus = target.getBoundingClientRect()
  const above = focus.top - box.top
  const below = box.bottom - focus.bottom
  position.value = {
    top: above >= below ? '4px' : 'auto', bottom: above >= below ? 'auto' : '4px',
    transform: 'translateX(-50%)', maxHeight: Math.max(1, Math.max(above, below) - 8) + 'px',
  }
}
function enter(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey ||
      (event.target instanceof HTMLElement && event.target.closest('a, dialog, [data-testid="drawer"]'))) return
  event.preventDefault()
  event.stopPropagation()
  if (!event.repeat && !props.busy) emit('advance')
}
onMounted(() => {
  place()
  observer = new ResizeObserver(place)
  if (card.value?.parentElement) observer.observe(card.value.parentElement)
  button.value?.focus({ preventScroll: true })
  window.addEventListener('keydown', enter, true)
})
onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('keydown', enter, true) })
watch(() => props.busy, busy => { if (!busy) button.value?.focus({ preventScroll: true }) })
</script>

<template>
  <section ref="card" :style="position" class="celebration" data-testid="solved-card" aria-labelledby="celebration-title">
    <div class="confetti" aria-hidden="true"><i v-for="n in 14" :key="n" :style="{ '--n': n }" /></div>
    <small><Check /> Done <span v-if="noHints"> · ★ No hints</span></small>
    <h2 id="celebration-title">{{ solved.reaction }}</h2>
    <blockquote v-if="result">“{{ result }}”</blockquote>
    <p>{{ solved.did }}</p>
    <p v-if="solved.reward">{{ solved.reward }}</p>
    <p v-if="landmark" class="landmark">Unit complete · {{ landmark }}</p>
    <strong v-if="streak && streak >= 3">{{ streak }} in a row on the first try</strong>
    <footer><button ref="button" class="gold" data-testid="continue" :disabled="busy" @click="emit('advance')">Continue</button>
    </footer>
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
.confetti { position: absolute; top: 24%; left: 50%; pointer-events: none }
.confetti i { position: absolute; width: 5px; height: 8px; opacity: 0; background: var(--gold); animation: burst 1s ease-out }
.confetti i:nth-child(even) { background: var(--mint) }
@keyframes burst {
  from { transform: rotate(calc(var(--n) * 26deg)) translateY(0); opacity: 1 }
  to { transform: rotate(calc(var(--n) * 26deg)) translateY(-85px) rotate(150deg); opacity: 0 }
}
@media (prefers-reduced-motion: reduce) { .confetti { display: none } .confetti i { animation: none } }
</style>
