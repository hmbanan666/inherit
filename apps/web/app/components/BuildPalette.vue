<script setup lang="ts">
import { Hammer, Milestone, Eraser, LockKeyhole, ChevronRight } from '@lucide/vue'
import { MACHINES, PRICES, RESEARCH, type MachineKind } from '@inherit/sim'
import { useGame } from '../lib/useGame'
import type { BuildTool, BuildGuide } from '../lib/buildGuide'
const props = defineProps<{ tool?: BuildTool; guide: BuildGuide }>()
const emit = defineEmits<{ pick: [BuildTool]; toggle: []; shop: [] }>()
const { surface, campaign } = useGame()
const all = Object.keys(MACHINES) as MachineKind[]
const kinds = computed(() => [
  ...surface.value.machines,
  ...all.filter((k) => !surface.value.machines.includes(k)),
])
const license = (k: MachineKind) => RESEARCH.find((n) => n.machines?.includes(k))?.title
const strip = ref<HTMLElement>()
const guided = computed(() => (props.guide?.[0] === 'machine' ? props.guide[1] : undefined))
watch(
  guided,
  async (kind) => {
    if (!kind) return
    await nextTick()
    const item = strip.value?.querySelector<HTMLElement>('[data-kind="' + kind + '"]')
    if (strip.value && item) {
      const left = item.offsetLeft,
        right = left + item.offsetWidth
      if (left < strip.value.scrollLeft || right > strip.value.scrollLeft + strip.value.clientWidth)
        strip.value.scrollLeft = Math.max(0, left - 8)
    }
  },
  { immediate: true },
)
let press: { kind: MachineKind; x: number; y: number } | undefined
function down(e: PointerEvent, kind: MachineKind) {
  if (e.button !== 0) return
  const button = e.currentTarget as HTMLElement
  button.setPointerCapture(e.pointerId)
  press = { kind, x: e.clientX, y: e.clientY }
}
function move(e: PointerEvent) {
  if (!press || Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return
  const button = e.currentTarget as HTMLElement
  if (button.hasPointerCapture(e.pointerId)) button.releasePointerCapture(e.pointerId)
  emit('pick', press.kind)
  press = undefined
}
</script>
<template>
  <section class="palette" role="toolbar" aria-label="Build palette">
    <header>
      <button class="build-toggle" :aria-pressed="!!tool" aria-label="Build mode" @click="emit('toggle')">
        <Hammer /> Build <kbd>B</kbd>
      </button>
      <button
        :class="{ 'guide-pulse': guide?.[0] === 'belt' && tool !== 'belt' }"
        :aria-pressed="tool === 'belt'"
        aria-label="Belt tool"
        @click="emit('pick', 'belt')"
      >
        <Milestone /> Belt <small>{{ PRICES.beltPerTile }}/tile</small>
      </button>
      <button
        :class="{ 'guide-pulse': guide?.[0] === 'unbelt' && tool !== 'remove' }"
        :aria-pressed="tool === 'remove'"
        aria-label="Remove tool"
        @click="emit('pick', 'remove')"
      >
        <Eraser /> Remove
      </button>
      <button class="shop-link" @click="emit('shop')">Shop <ChevronRight /></button>
    </header>
    <div ref="strip" class="machine-strip">
      <button
        v-for="k in kinds"
        :key="k"
        :data-kind="k"
        :class="{ 'guide-pulse': guided === k && tool !== k }"
        :aria-label="'Build ' + MACHINES[k].name"
        :aria-pressed="tool === k"
        :disabled="!surface.machines.includes(k) || campaign.economy.money < PRICES.machines[k]"
        @pointerdown="down($event, k)"
        @pointermove="move"
        @pointerup="press = undefined"
        @pointercancel="press = undefined"
        @click="emit('pick', k)"
      >
        <MachineThumb :kind="k" /><span
          ><b>{{ MACHINES[k].name }}</b
          ><small v-if="surface.machines.includes(k)">{{ PRICES.machines[k] }} coins</small
          ><small v-else><LockKeyhole />{{ license(k) }}</small></span
        >
      </button>
    </div>
  </section>
</template>
