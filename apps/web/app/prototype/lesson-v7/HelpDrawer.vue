<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { X } from '@lucide/vue'
import type { Theory } from '@inherit/sim/pack'
import type { ApiMethod } from '@inherit/sim/declarations'

/** Help the player asked for. It never opens by itself and holds no navigation. */
export type HelpTab = 'learn' | 'hints' | 'api'
const props = defineProps<{
  tab: HelpTab
  theory?: Theory
  condition?: string
  hints: readonly string[]
  rung: number
  entries: ApiMethod[]
  busy?: boolean
}>()
const emit = defineEmits<{ tab: [tab: HelpTab]; close: []; hint: [] }>()
const labels: Record<HelpTab, string> = { learn: 'How it works', hints: 'Hints', api: 'Functions' }
const tabs = computed(() => (['learn', 'hints', 'api'] as const).filter(name =>
  name === 'learn' ? !!props.theory : name === 'hints' ? props.hints.length > 0 : props.entries.length > 0))
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close') }
}
onMounted(() => window.addEventListener('keydown', escape))
onBeforeUnmount(() => window.removeEventListener('keydown', escape))
</script>

<template>
  <aside class="help" data-testid="drawer" aria-label="Lesson help">
    <header>
      <div role="tablist" aria-label="Lesson help">
        <button v-for="name in tabs" :key="name" role="tab" :aria-selected="tab === name" :data-testid="'drawer-' + name"
          @click="emit('tab', name)">{{ labels[name] }}</button>
      </div>
      <button class="close" aria-label="Close help" @click="emit('close')"><X /></button>
    </header>
    <section :key="tab" class="content" role="tabpanel">
      <template v-if="tab === 'learn' && theory">
        <h2>{{ theory.title }}</h2>
        <p v-for="line in theory.body" :key="line">{{ line }}</p>
        <pre>{{ theory.example }}</pre>
        <template v-if="condition"><h3>In this scene</h3><p>{{ condition }}</p></template>
        <button class="gold back" @click="emit('close')">Back to the code</button>
      </template>
      <template v-else-if="tab === 'hints'">
        <h2>Hints</h2>
        <p v-if="!rung" class="quiet">Hints go from a nudge to nearly the answer. Take one at a time.</p>
        <ol><li v-for="(hint, index) in hints.slice(0, rung)" :key="index">{{ hint }}</li></ol>
        <button v-if="rung < hints.length" :disabled="busy" data-testid="next-hint" @click="emit('hint')">
          Show hint {{ rung + 1 }} of {{ hints.length }}
        </button>
      </template>
      <ApiReference v-else :entries="entries" />
    </section>
  </aside>
</template>

<style scoped>
.help { position: absolute; inset: 0 0 0 auto; z-index: 5; display: flex; flex-direction: column; width: min(340px, 46%); border-left: 1px solid var(--line-strong); background: var(--panel); box-shadow: -8px 0 22px var(--shadow); animation: slide .2s ease-out; user-select: text }
header { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--line) }
[role='tablist'] { display: flex }
header button { padding: 7px 9px; border: 0; border-radius: 0; background: transparent; color: var(--sub); font-size: 13px }
[aria-selected='true'] { color: var(--gold); box-shadow: inset 0 -2px var(--gold) }
.close { border-radius: 5px }
.content { flex: 1; min-height: 0; overflow: auto; padding: 18px; font-size: 15px }
h2 { margin: 0 0 10px; font-size: 20px }
h3 { margin: 16px 0 6px; font-size: 14px; color: var(--sub) }
p, li { margin: 8px 0; color: var(--soft); line-height: 1.5 }
.quiet { color: var(--sub) }
ol { margin: 0 0 12px; padding-left: 20px }
li { padding: 2px 0 }
pre { margin: 12px 0; padding: 10px 12px; white-space: pre-wrap; overflow-wrap: anywhere; background: var(--base); border-left: 2px solid var(--accent-line); font: 14px/1.5 var(--mono); color: var(--accent-soft) }
.back { margin-top: 12px }
@keyframes slide { from { transform: translateX(24px); opacity: 0 } }
@media (max-width: 800px) {
  .help { position: fixed; inset: auto 0 0; z-index: 20; width: 100%; max-height: 62dvh; border-left: 0; border-top: 1px solid var(--line-strong); border-radius: 12px 12px 0 0; box-shadow: 0 -10px 30px var(--shadow); animation-name: rise }
}
@keyframes rise { from { transform: translateY(24px); opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .help { animation: none } }
</style>
