<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { Paint } from '../../lib/art/townPaint'
import { portrait } from '../../lib/art/townPortrait'
import type { Townsperson } from '../../lib/townTypes'

const props = defineProps<{ person: Townsperson }>()
const canvas = ref<HTMLCanvasElement>()
watchEffect(() => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  ctx.setTransform(2, 0, 0, 2, 0, 0)
  portrait(new Paint(ctx), props.person.id, props.person.mood)
})
</script>

<template><canvas ref="canvas" width="120" height="128" aria-hidden="true" /></template>
