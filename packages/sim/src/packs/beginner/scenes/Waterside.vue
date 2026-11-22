<script setup lang="ts">
import { computed } from 'vue'
import type { Village } from '../world'

const props = defineProps<{ world: Village }>()
const ducks = computed(() => props.world.readings.queue ?? ['Dot', 'Fern', 'Pip'])
</script>

<template>
  <g>
    <path d="M0 191 Q100 155 224 181 T560 158 V300 H0Z" fill="#78a8a7" />
    <g stroke="#b5d4bc" fill="none" stroke-linecap="round">
      <path v-for="row in 5" :key="row" :d="`M${row * 21} ${194 + row * 16} q28 3 48 -1 m90 0 q35 3 58 -2 m68 1 q32 3 54 -2`" />
    </g>
    <g fill="#776040" stroke="#594b3b" stroke-width="3">
      <path d="M25 192v47h9v-47m62 0v37h9v-37m53 0v31h8v-31"/>
      <path d="M0 182l157-9 22 17L0 205z" fill="#b18c61"/>
      <path d="m29 182 15 17m19-18 16 16m19-17 14 15m17-17 13 14"/>
    </g>
    <template v-if="world.scene === 'pier'">
      <g transform="translate(293 183)">
        <path d="M-73 1 Q-51 27 55 21L79 -2Z" fill="#5e6f76" stroke="#3b5558" stroke-width="3"/>
        <path d="M-49 0l12-23h78l13 23z" fill="#efe0b5"/>
        <path d="M-38-24h82l-4-6h-73z" fill="#c67e62"/>
        <rect v-for="window in 5" :key="window" :x="window * 14 - 48" y="-20" width="9" height="11" rx="2" fill="#659295"/>
      </g>
      <g v-if="world.readings.waiting" fill="#555f60">
        <g v-for="(guest, index) in world.readings.waiting" :key="guest" :transform="`translate(${38 + index * 33} 176)`">
          <circle cy="-24" r="7" fill="#d7a87f"/><path d="M-8-16q8-6 16 0l3 18h-22z"/>
        </g>
      </g>
    </template>
    <g v-else>
      <g v-for="(duck, index) in ducks" :key="duck"
        :transform="`translate(${world.bubble === duck ? 148 : 245 + index * 75} ${world.bubble === duck ? 206 : 183 + index % 2 * 24})`">
        <ellipse cy="10" rx="22" ry="3" fill="#638d8d"/>
        <path d="M-13-2q10 0 29-7 1 16-18 16-15-1-11-9" fill="#efdcab"/>
        <circle cx="-12" cy="-7" r="7" fill="#ecd49a"/><path d="m-17-8-8 3 7 2" fill="#ba7953"/>
        <circle cx="-14" cy="-9" r="1.3" fill="#443832"/>
        <text y="26" text-anchor="middle">{{ duck }}</text>
      </g>
    </g>
  </g>
</template>
