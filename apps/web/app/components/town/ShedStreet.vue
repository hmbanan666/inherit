<script setup lang="ts">
import type { TownSnapshot } from '@inherit/sim'
import { drawBuilding } from '../../lib/art/townBuildings'
import { Paint } from '../../lib/art/townPaint'

const props = defineProps<{ town: TownSnapshot }>()
const canvas = ref<HTMLCanvasElement>()
const neighbors = [
  { id: 'forge', x: 105 },
  { id: 'lamp-street', x: 245 },
] as const
const states = computed(() => neighbors.map(({ id }) => props.town.buildings.find(b => b.id === id)?.state))
watch([canvas, () => props.town.phase, () => states.value.join()], () => {
  const context = canvas.value?.getContext('2d')
  if (!context) return
  context.setTransform(2, 0, 0, 2, 0, 0)
  context.clearRect(0, 0, 340, 130)
  const paint = new Paint(context)
  paint.poly('#635d51', 4, 112, 303, 103, 336, 120, 30, 130)
  paint.line('#898273', 2, 17, 116, 311, 107)
  neighbors.forEach(({ id, x }, i) => {
    const state = states.value[i]
    if (state) paint.at(x, 108, 1, () => drawBuilding(paint, id, state, props.town.phase, undefined))
  })
})
</script>

<template>
  <canvas ref="canvas" width="680" height="260" role="img" aria-label="Bram’s forge and the lamps beside the shed" />
</template>
