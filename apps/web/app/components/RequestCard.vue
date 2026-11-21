<script setup lang="ts">
import { type TownSnapshot } from '@inherit/sim'
import TownPortrait from './town/TownPortrait.vue'
import { useGame } from '../lib/useGame'
const props = defineProps<{ person?: TownSnapshot['people'][number] }>()
const g = useGame()
const ask = computed(() => props.person?.ask)
const c = computed(() => g.campaign.value)
const hint = ref(false)
const lessons = [
  ['Inside onTick, tell the mine to dig one rock.', 'ctx.dig("mine")'],
  ['Deploy your edit to run it every tick.', 'ctx.dig("mine")'],
  ['Add the mine’s belt above your dig call and deploy.', 'ctx.connect("mine", "furnace")'],
  ['Tell the furnace to smelt what arrives, then deploy.', 'ctx.work("furnace")'],
  ['Connect the furnace to the cart and deploy.', 'ctx.connect("furnace", "cart")'],
  ['Leave the controller running. The cart delivers each ingot.', 'Watch the ingot count on this card.'],
] as const
const step = computed(() => {
  if (c.value.town.beat !== 1) return 0
  const w = c.value.world
  if (!w.lost && !w.extracted['iron-ore']) return g.dirty.value ? 1 : 0
  if (!w.belts.some((b) => b.from === 'mine' && b.to === 'furnace')) return 2
  if (!w.machines.find((m) => m.id === 'furnace')?.stats.activeTicks) return 3
  if (!w.belts.some((b) => b.from === 'furnace' && b.to === 'cart')) return 4
  return 5
})
const clues: Record<number, string> = {
  2: 'Keep shipping ingots for Bram. When you have enough coins, open Pay debt at the top of the workshop.',
  3: 'Build a press with ctx.build("press"). Connect furnace → press → cart and call ctx.work("press", "plate").',
  4: 'Connect the mine to a splitter. Use ctx.peek("splitter")?.kind to send copper ore to a second furnace.',
  5: 'Route copper ore from the splitter to a named furnace on the copper-ingot recipe. Feed its ingots to a cutter on wire, then connect the cutter to the cart.',
  6: 'Loop over ctx.machines("furnace"). If ctx.inspect(id)?.status is "broken", call ctx.repair(id).',
  7: 'Feed plates to a second cutter named "gears" and send its gears to the cart. If a furnace stops, check its status and repair it or wait for it to cool.',
  8: 'Connect a splitter after the press. Send plates to the cart for Elsie or the gear cutter for Wen. Use ctx.orders() to see who still needs a delivery.',
  9: 'Feed plates and wire into the assembler and call ctx.work("assembler", "bracket"). Connect the assembler to the cart.',
  10: 'Regular orders keep paying. Open Orders to see what the town still needs, then use Pay debt for the remaining installments.',
}
watch([step, () => c.value.town.beat], () => {
  hint.value = false
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
      <span>{{ step + 1 }}/6 · {{ lessons[step]![0] }}</span>
      <button class="hint" :aria-expanded="hint" @click="hint = !hint">Hint</button>
      <code v-if="hint">{{ lessons[step]![1] }}</code>
    </div>
    <div v-else-if="clues[c.town.beat]" class="request-hint">
      <button class="hint" :aria-expanded="hint" @click="hint = !hint">Hint</button>
      <button v-if="c.town.beat === 2" class="hint" @click="g.act({ kind: 'read', id: 'tab' })">
        Pay later
      </button>
      <p v-if="hint">{{ clues[c.town.beat] }}</p>
    </div>
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
.lesson span {
  flex: 1;
}
.lesson code {
  flex-basis: 100%;
  color: var(--gold);
}
</style>
