<script setup lang="ts">
import type { MachineKind } from '@inherit/sim'
import sheet from '../lib/art/contact-sheet.png'
const props = defineProps<{ kind: MachineKind }>()
const index: Record<MachineKind, number> = {
  miner: 0,
  furnace: 3,
  press: 4,
  cutter: 5,
  assembler: 6,
  splitter: 7,
  merger: 8,
  sorter: 9,
  storage: 10,
  scrap: 11,
  dock: 12,
  depot: 13,
  truck: 14,
}
const art = computed(() => {
  const i = index[props.kind]
  return {
    backgroundImage: 'url(' + sheet + ')',
    backgroundPosition: '-' + (15 + (i % 5) * 98.5) + 'px -' + (36 + Math.floor(i / 5) * 84.5) + 'px',
  }
})
</script>
<template>
  <span class="machine-thumb" aria-hidden="true"><span class="shop-art" :style="art"></span></span>
</template>
