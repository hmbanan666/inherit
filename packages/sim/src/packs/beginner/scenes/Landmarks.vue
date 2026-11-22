<script setup lang="ts">
import { computed } from 'vue'
import type { Village } from '../world'
const props = defineProps<{ world: Village }>()
const earned = computed(() => {
  const world = props.world
  if (world.lessonId === 'fair-opening' && world.banner &&
    world.unit.lessonIds.every(id => id === world.lessonId || Object.hasOwn(world.album, id)) &&
    !world.landmarks.some(site => site.id === world.unit.id)) {
    return [...world.landmarks, { id: world.unit.id, title: world.unit.landmark }]
  }
  return world.landmarks
})
</script>

<template>
  <ul v-if="earned.length" class="landmarks" aria-label="Village landmarks">
    <li v-for="site in earned" :key="site.id" :title="site.title" :aria-label="site.title">
      <svg viewBox="0 0 32 26" role="img" :aria-label="site.title">
        <template v-if="site.id === 'calls-and-strings'">
          <path d="M4 24V9q12-12 24 0v15h-5V11q-7-6-14 0v13z" fill="#e9c486"/>
          <path d="m6 8 5 1-2 6zm8-3h5l-3 6zm8 3 5-1-2 7z" fill="#d58469"/>
        </template>
        <template v-else-if="site.id === 'numbers-and-output'">
          <path d="M2 17h28l-2 8H5z" fill="#b48962"/>
          <g v-for="x in [8,16,24]" :key="x"><path :d="`M${x} 18v-8`" stroke="#b0c58e"/><circle :cx="x" cy="9" r="4" fill="#e9ad9f"/></g>
        </template>
        <template v-else-if="site.id === 'variables-and-names'">
          <path d="M15 24V4" stroke="#9d795a" stroke-width="4"/><rect x="2" y="4" width="28" height="13" rx="2" fill="#e4bd85"/><path d="M8 10h16" stroke="#80664f"/>
        </template>
        <template v-else-if="site.id === 'return-values' || site.id === 'choices'">
          <path d="M4 15h24v4H4zm3 4h3v6H7zm15 0h3v6h-3z" fill="#d0a47a"/>
          <path v-if="site.id === 'choices'" d="M16 15V4m-13 5q12-17 26 0z" fill="#da9f78" stroke="#ca986d"/>
          <g v-else fill="#dc8f72"><circle cx="10" cy="11" r="4"/><circle cx="18" cy="11" r="4"/></g>
        </template>
        <template v-else-if="site.id === 'arrays' || site.id === 'your-own-functions'">
          <path d="M3 3v21m26-21v21M3 6q13 5 26 0" fill="none" stroke="#e5c48f" stroke-width="2"/>
          <path v-for="(x,i) in [5,13,21]" :key="x" :d="`M${x} 8h6l-2 12z`" :fill="i===1 ? '#89b5c5' : '#e5b967'"/>
        </template>
        <template v-else-if="site.id === 'loops'">
          <path d="M16 24V8" stroke="#b49872" stroke-width="3"/><circle cx="16" cy="8" r="7" fill="#f3d487"/><path d="m7 6 9-6 9 6z" fill="#a5ab91"/>
        </template>
        <template v-else>
          <path d="M5 11v13m22-13v13M3 21h26" fill="none" stroke="#dfc293" stroke-width="3"/>
          <path d="M2 11 7 3h18l5 8z" fill="#d59374"/><path d="m11 4-2 7h5l1-7zm7 0 1 7h5l-3-7z" fill="#efdaab"/>
        </template>
      </svg>
    </li>
  </ul>
</template>

<style scoped>
.landmarks { position: absolute; bottom: 5px; left: 8px; display: flex; flex-wrap: wrap; gap: 2px; list-style: none; margin: 0; padding: 3px 6px; background: #35483fe6; border-radius: 4px; }
.landmarks svg { display: block; width: clamp(18px, 2vw, 28px); }
</style>
