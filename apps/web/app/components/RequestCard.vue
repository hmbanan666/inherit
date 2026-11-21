<script setup lang="ts">
import { type TownSnapshot } from '@inherit/sim'
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
  ['Leave the controller running. The cart delivers each ingot.', 'ctx.stock("cart", "iron-ingot")'],
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
watch(step, () => {
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
      <RequestPortrait v-if="person" :person="person.id" />
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
      <small>{{ ask.late ? 'Late · ' : '' }}{{ ask.dueLabel }}</small>
    </div>
    <div v-if="c.town.beat === 1" class="lesson">
      <span>{{ step + 1 }}/6 · {{ lessons[step]![0] }}</span>
      <button class="hint" :aria-expanded="hint" @click="hint = !hint">Hint</button>
      <code v-if="hint">{{ lessons[step]![1] }}</code>
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
.request-count small {
  color: var(--sub);
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
