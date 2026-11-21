<script setup lang="ts">
import { bramLessons, type TownSnapshot } from '@inherit/sim'
import TownPortrait from './town/TownPortrait.vue'
import { useGame } from '../lib/useGame'
const props = defineProps<{ person?: TownSnapshot['people'][number] }>()
const emit = defineEmits<{ checks: [] }>()
const g = useGame()
const ask = computed(() => props.person?.ask)
const c = computed(() => g.campaign.value)
const hint = ref(0)
const step = g.lessonStep
const lesson = computed(() => bramLessons[step.value])
// These examples follow the controller available at each request.
const instructions: Record<number, { task: string; code: string; hint: string }> = {
  2: {
    task: 'Keep sending ingots to the cart to earn the first bank payment.',
    code: 'furnace.smelt()',
    hint: 'Keep shipping ingots for Bram. When you have enough coins, open Pay debt at the top of the workshop.',
  },
  3: {
    task: 'Feed iron ingots into the press to make plates.',
    code: 'ctx.work("press", "plate")',
    hint: 'Build a press with ctx.build("press"). Connect furnace → press → cart and call ctx.work("press", "plate").',
  },
  4: {
    task: 'Look at the next rock before sending it to its furnace.',
    code: 'ctx.peek("splitter")?.kind',
    hint: 'Connect the mine to a splitter. Use ctx.peek("splitter")?.kind to send copper ore to a second furnace.',
  },
  5: {
    task: 'Feed copper ingots into a cutter named wire.',
    code: 'ctx.work("wire", "wire")',
    hint: 'Route copper ore from the splitter to a named furnace on the copper-ingot recipe. Feed its ingots to a cutter on wire, then connect the cutter to the cart.',
  },
  6: {
    task: 'Check each furnace and repair it when it breaks.',
    code: 'if (ctx.inspect(id)?.status === "broken") ctx.repair(id)',
    hint: 'Loop over ctx.machines("furnace"). If ctx.inspect(id)?.status is "broken", call ctx.repair(id).',
  },
  7: {
    task: 'Feed plates into a cutter named gears.',
    code: 'ctx.work("gears", "gear")',
    hint: 'Feed plates to a second cutter named "gears" and send its gears to the cart. If a furnace stops, check its status and repair it or wait for it to cool.',
  },
  8: {
    task: 'Check which regular still needs a delivery before routing the next plate.',
    code: 'ctx.orders()',
    hint: 'Connect a splitter after the press. Send plates to the cart for Elsie or the gear cutter for Wen. Use ctx.orders() to see who still needs a delivery.',
  },
  9: {
    task: 'Feed a plate and a wire into the assembler.',
    code: 'ctx.work("assembler", "bracket")',
    hint: 'Feed plates and wire into the assembler and call ctx.work("assembler", "bracket"). Connect the assembler to the cart.',
  },
  10: {
    task: 'Keep filling regular orders until you can pay the balance.',
    code: 'ctx.orders()',
    hint: 'Regular orders keep paying. Open Orders to see what the town still needs, then use Pay debt for the remaining installments.',
  },
}
const instruction = computed(() => instructions[c.value.town.beat])
watch([step, () => c.value.town.beat], () => {
  hint.value = 0
})
const units: Record<string, string> = {
  'iron-ingot': 'iron ingots',
  plate: 'plates',
  wire: 'coils of wire',
  gear: 'gears',
  bracket: 'brackets',
  coins: 'coins',
}
const interlude = computed(() => {
  const messages = c.value.progress.messages
  const id = ({ 4: 'vein', 6: 'heat', 8: 'competition', 11: 'slow' } as Record<number, string>)[
    c.value.town.beat
  ]
  return messages.find((m) => m.id === id)
})
</script>
<template>
  <section class="objective request" aria-label="Current request">
    <div class="request-main">
      <TownPortrait v-if="person" class="objective-icon" :person="person" />
      <span v-else class="objective-icon portrait" aria-hidden="true">✉</span>
      <div class="goal-body">
        <small class="eyebrow">{{ person ? person.name + ' · ' + person.role : interlude?.from }}</small>
        <h2>{{ ask?.title ?? (c.town.beat === 11 ? 'The shed is yours.' : interlude?.title) }}</h2>
        <p>{{ ask?.text ?? interlude?.body }}</p>
      </div>
    </div>
    <div v-if="ask" class="request-count">
      <b v-for="(count, item) in ask.items" :key="item"
        >{{ ask.filled[item] ?? 0 }} / {{ count }} {{ units[item] ?? item }}</b
      >
    </div>
    <div v-if="c.town.beat === 1" class="lesson">
      <strong>{{ step }}/7 · {{ lesson.title }}</strong>
      <button class="hint" :aria-expanded="hint > 0" @click="hint = (hint + 1) % 3">
        {{ ['Hint', 'Show exact step', 'Hide hint'][hint] }}
      </button>
      <p>{{ lesson.text }}</p>
      <button v-if="g.lessonCheck.value" class="lesson-check" @click="emit('checks')">
        Check · {{ g.lessonCheck.value.text }}
      </button>
      <code v-if="hint < 2">{{ lesson.blank }}</code>
      <p v-if="hint >= 1">{{ lesson.idea }}</p>
      <template v-if="hint === 2">
        <code v-if="lesson.importLine">{{ lesson.importLine }}</code>
        <code v-if="lesson.code">{{ lesson.code }}</code>
        <p v-if="lesson.action">{{ lesson.action }}</p>
      </template>
    </div>
    <template v-else-if="instruction">
      <div class="request-work">
        <p>{{ instruction.task }}</p>
        <code>{{ instruction.code }}</code>
      </div>
      <div class="request-hint">
        <button class="hint" :aria-expanded="hint > 0" @click="hint = hint ? 0 : 1">Hint</button>
        <button v-if="c.town.beat === 2" class="hint" @click="g.act({ kind: 'read', id: 'tab' })">
          Pay later
        </button>
        <p v-if="hint">{{ instruction.hint }}</p>
      </div>
    </template>
  </section>
</template>
<style scoped>
.request {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}
.request-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.portrait {
  font-size: 29px;
}
.goal-body p {
  font-size: 14px;
  line-height: 1.45;
}
.request-count {
  display: grid;
  gap: 6px;
  text-align: right;
  font: 12px var(--mono);
}
.request-hint {
  grid-column: 1/-1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}
.lesson {
  grid-column: 1/-1;
  border-top: 1px solid var(--line);
  padding-top: 9px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.lesson strong {
  flex: 1;
}
.lesson p, .lesson code {
  flex-basis: 100%;
  margin: 0;
}
.lesson-check {
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--soft);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.request-work { grid-column: 1/-1; }
.request-work p { margin: 0 0 4px; }
.request-work code, .lesson code {
  white-space: pre-wrap;
  color: var(--gold);
}
</style>
