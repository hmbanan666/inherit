<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, CornerDownLeft, Star } from '@lucide/vue'
import { body, type LearnedPart } from './content'
import UnitDots from './UnitDots.vue'

/** One centred card: what happened, what the player's own line is called, one Continue. */
const props = defineProps<{
  solved: { reaction: string; did: string; idea: string }
  code: string
  learned: readonly LearnedPart[]
  states: ('done' | 'current' | 'todo')[]
  position: number
  unit: string
  noHints?: boolean
  guess?: { choice: string; answer: string }
  busy: boolean
}>()
const emit = defineEmits<{ advance: [] }>()
const button = ref<HTMLButtonElement>()
const source = computed(() => body(props.code).trim().split('\n').slice(0, 4).join('\n'))
const spans = computed(() => {
  const text = source.value
  const tones = new Array<string>(text.length).fill('')
  const legend: LearnedPart[] = []
  for (const part of props.learned) {
    const match = part.find.exec(text)
    if (!match || tones.slice(match.index, match.index + match[0].length).some(Boolean)) continue
    tones.fill(part.tone, match.index, match.index + match[0].length)
    legend.push(part)
  }
  const out: { text: string; tone: string }[] = []
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1]
    if (last && last.tone === tones[i] && text[i] !== '\n' && !last.text.endsWith('\n')) last.text += text[i]
    else out.push({ text: text[i], tone: tones[i] })
  }
  return { out, legend }
})
const confetti = Array.from({ length: 30 }, (_, n) => ({
  '--a': (n * 37) % 150 - 75 + 'deg', '--d': 90 + (n * 53) % 130, '--t': (n % 5) * 40 + 'ms',
  '--c': ['var(--gold)', 'var(--mint)', 'var(--accent-soft)', 'var(--alert)'][n % 4],
}))
function enter(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey ||
    (event.target instanceof HTMLElement && event.target.closest('a, [role=dialog], [data-testid="drawer"]'))) return
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
  <div class="veil">
    <section class="solved" data-testid="solved-card" role="status" aria-labelledby="solved-title">
      <div class="confetti" aria-hidden="true"><i v-for="(style, n) in confetti" :key="n" :style="style" /></div>
      <p class="badge"><span class="tick"><Check /></span> Solved<span v-if="noHints" class="star"><Star /> No hints</span></p>
      <h2 id="solved-title">{{ solved.reaction }}</h2>
      <p class="did">{{ solved.did }}</p>
      <div v-if="spans.legend.length" class="learned">
        <pre><span v-for="(span, i) in spans.out" :key="i" :data-tone="span.tone || undefined">{{ span.text }}</span></pre>
        <ul>
          <li v-for="part in spans.legend" :key="part.label" :data-tone="part.tone"><i />{{ part.label }}</li>
        </ul>
      </div>
      <p v-if="guess" class="guess" :data-right="guess.choice === guess.answer">
        Your guess: {{ guess.choice }}. {{ guess.choice === guess.answer ? 'You called it.' : 'The board showed ' + guess.answer + ' first.' }}
      </p>
      <p class="progress"><UnitDots :states="states" :fresh="position - 1" /> Lesson {{ position }} of {{ states.length }} done <span>· {{ unit }}</span></p>
      <button ref="button" class="gold" data-testid="continue" :disabled="busy" @click="emit('advance')">
        Continue <kbd><CornerDownLeft /> Enter</kbd>
      </button>
    </section>
  </div>
</template>

<style scoped>
.veil { position: absolute; inset: 0; z-index: 6; display: grid; place-items: center; padding: 16px; background: radial-gradient(closest-side, #0a0b0d8c, #0a0b0d40 70%, transparent); animation: veil .3s ease-out }
.solved { position: relative; width: min(400px, 100%); max-height: 100%; overflow: visible; padding: 22px 24px 24px; border: 1px solid var(--accent-line); border-radius: 14px; background: var(--panel); box-shadow: 0 16px 50px var(--shadow); animation: rise .38s cubic-bezier(.3, 1.4, .5, 1) }
.badge { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--mint); font: 12px var(--mono) }
.tick { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--mint); color: var(--ink) }
.tick svg { width: 14px; height: 14px; stroke-width: 3 }
.star { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; color: var(--gold) }
.star svg { width: 13px; height: 13px }
h2 { margin: 12px 0 4px; font-size: 26px; letter-spacing: -.02em }
.did { margin: 0; color: var(--soft); font-size: 15px; line-height: 1.4 }
.learned { margin-top: 14px; padding: 12px 14px; border-radius: 8px; background: var(--base) }
pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 15px/1.9 var(--mono); color: var(--text) }
pre [data-tone] { padding-bottom: 2px; border-bottom: 2px solid }
[data-tone='gold'] { border-color: var(--gold); color: var(--accent-soft) }
[data-tone='mint'] { border-color: var(--mint); color: var(--syntax-string) }
ul { display: grid; gap: 4px; margin: 10px 0 0; padding: 0; list-style: none; font-size: 13px; color: var(--soft) }
li { display: flex; align-items: center; gap: 8px; border: 0; color: var(--soft) }
li i { flex: none; width: 14px; height: 3px; border-radius: 2px; background: var(--gold) }
li[data-tone='mint'] i { background: var(--mint) }
.guess { margin: 12px 0 0; font-size: 13px; color: var(--sub) }
.guess[data-right='true'] { color: var(--mint) }
.progress { display: flex; align-items: center; gap: 9px; margin: 16px 0 14px; color: var(--soft); font: 12px var(--mono) }
.progress span:last-child { color: var(--sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
button { width: 100%; height: 46px; font-size: 16px; border-radius: 7px }
kbd { display: inline-flex; align-items: center; gap: 4px; padding: 2px 5px; border: 1px solid currentColor; border-radius: 3px; font: 10px var(--mono); opacity: .75 }
kbd svg { width: 10px; height: 10px }
.confetti { position: absolute; top: 28px; left: 50%; pointer-events: none }
.confetti i { position: absolute; width: 6px; height: 10px; border-radius: 1px; opacity: 0; background: var(--c); animation: burst 1.25s var(--t) cubic-bezier(.2, .7, .3, 1) }
.confetti i:nth-child(3n) { width: 8px; height: 5px }
@keyframes burst {
  from { transform: rotate(var(--a)) translateY(0) rotate(0); opacity: 1 }
  70% { opacity: 1 }
  to { transform: rotate(var(--a)) translateY(calc(var(--d) * -1px)) rotate(210deg); opacity: 0 }
}
@keyframes rise { from { transform: translateY(18px) scale(.94); opacity: 0 } }
@keyframes veil { from { opacity: 0 } }
@media (max-width: 800px) { .veil { position: fixed; z-index: 15; background: var(--scrim) } }
@media (prefers-reduced-motion: reduce) { .confetti { display: none } .solved, .veil { animation: none } }
</style>
