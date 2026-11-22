<script setup lang="ts">
import { computed } from 'vue'
import type { Village } from '../world'
const props = defineProps<{ world: Village }>()
const widths = computed(() => props.world.lessonId === 'flower-row' ? [2, 4]
  : [props.world.lessonId === 'number-tag' ? 6 : 3])
</script>

<template>
  <g transform="translate(143 362)" aria-label="Marked planting beds">
    <g v-for="(width, box) in widths" :key="box" :transform="`translate(${box*103} 0)`">
      <path :d="`M-9 0h${width*14+12}l-4 12h-${width*14+4}z`" fill="#976e4e" stroke="#71553f" stroke-width="2"/>
      <ellipse v-for="hole in width" :key="hole" :cx="(hole-1)*14+4" cy="-1" rx="5.3" ry="2.5" fill="#645440"/>
      <use v-for="flower in world.beds[box] ?? 0" :key="flower" href="#flower"
        :x="(flower-1)*14+4" y="0" :color="box ? '#e2b966' : '#e294a1'"/>
    </g>
  </g>
</template>
