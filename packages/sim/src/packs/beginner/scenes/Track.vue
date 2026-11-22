<script setup lang="ts">
import type { Village } from '../world'
defineProps<{ world: Village }>()
</script>

<template>
  <g v-if="world.scene === 'platform'">
    <path d="M0 217h560m-560 12h560" stroke="#675d4f" stroke-width="5"/>
    <path d="M0 238h560v62H0z" fill="#b0a186"/>
    <g :transform="`translate(${world.announcements.length >= 2 ? 75 : 0} 0)`">
      <rect x="114" y="146" width="263" height="59" rx="10" fill="#527778"/>
      <path d="M108 150q0-9 12-9h250q12 0 12 9z" fill="#455958"/>
      <rect v-for="window in 7" :key="window" :x="94 + window * 34" y="154" width="25" height="24" rx="3" fill="#c3d4be"/>
      <path d="M115 188h262" stroke="#e0b775" stroke-width="4"/>
      <circle v-for="wheel in [146,185,305,345]" :key="wheel" :cx="wheel" cy="207" r="9" fill="#504b43"/>
    </g>
  </g>
  <g v-else>
    <path d="M23 231l58-62h420l38 62z" fill="#beb79b" stroke="#756f5d" stroke-width="3"/>
    <g stroke="#eee4c4" stroke-width="2">
      <path v-for="tile in 7" :key="tile" :d="`M${22 + tile * 64} 231l${40 - tile * 8} -62`"/>
      <path d="M50 201h472" stroke-dasharray="12 9"/>
    </g>
    <path :d="`M${86 + (world.readings.distance ?? 4) * 68} 194v-64l24 5-24 12`" fill="#d8aa5c" stroke="#5d6355" stroke-width="3"/>
    <g :transform="`translate(${84 + Math.min(world.steps, 6) * 68} 197)`">
      <ellipse cy="10" rx="28" ry="5" fill="#888a77"/>
      <rect x="-23" y="-31" width="46" height="34" rx="8" fill="#658a8b" stroke="#435b58" stroke-width="3"/>
      <rect x="-14" y="-24" width="29" height="14" rx="4" fill="#354e50"/>
      <circle cx="-6" cy="-17" r="3" fill="#dfce93"/><circle cx="7" cy="-17" r="3" fill="#dfce93"/>
      <path d="M0-31v-9" stroke="#4d5d59" stroke-width="3"/><circle cy="-41" r="3" fill="#dca45b"/>
      <circle cx="-13" cy="4" r="6" fill="#4c5049"/><circle cx="14" cy="4" r="6" fill="#4c5049"/>
    </g>
  </g>
</template>
