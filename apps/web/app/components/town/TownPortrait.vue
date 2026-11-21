<script setup lang="ts">
import { ref, watch } from 'vue'
import { Paint } from '../../lib/art/townPaint'
import { portrait } from '../../lib/art/townPortrait'
import type { Townsperson } from '@inherit/sim'

const props = defineProps<{ person: Townsperson }>()
const canvas = ref<HTMLCanvasElement>()
watch([canvas, () => props.person.id, () => props.person.mood], ([element, id, mood]) => {
  const ctx = element?.getContext('2d')
  if (!ctx) return
  ctx.setTransform(2, 0, 0, 2, 0, 0)
  portrait(new Paint(ctx), id, mood)
})
</script>

<template><canvas ref="canvas" width="120" height="128" aria-hidden="true" /></template>
