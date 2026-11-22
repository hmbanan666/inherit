<script setup lang="ts">
import type { Village } from '../world'
import FestivalStand from './FestivalStand.vue'
import Track from './Track.vue'
import Waterside from './Waterside.vue'
defineProps<{ world: Village }>()
</script>

<template>
  <svg viewBox="0 0 560 300" role="img" :aria-label="world.cue">
    <defs>
      <linearGradient id="festival-sky" x2="0" y2="1">
        <stop stop-color="#9397ab"/><stop offset="1" stop-color="#f2cea8"/>
      </linearGradient>
      <linearGradient id="festival-grass" x2=".2" y2="1">
        <stop stop-color="#a2ae82"/><stop offset="1" stop-color="#829373"/>
      </linearGradient>
    </defs>
    <rect width="560" height="300" fill="url(#festival-sky)"/>
    <circle cx="423" cy="62" r="27" fill="#f4d5a2"/>
    <path d="m0 130 87-47 35 13 42-33 87 68 54-27 56 23 82-64 117 57v65H0" fill="#98999c"/>
    <path d="M0 143q78-49 153-9 69 26 143-5t142-13 122 3v69H0" fill="#7e9083"/>
    <path d="M0 156q118-31 259-2 119 21 301-17v163H0" fill="url(#festival-grass)"/>
    <path d="M0 228q139-45 302 8t258 3v28q-108 26-263-8T0 256" fill="#ceba93"/>
    <Waterside v-if="world.scene === 'pier' || world.scene === 'pond'" :world="world"/>
    <Track v-else-if="world.scene === 'track' || world.scene === 'platform'" :world="world"/>
    <FestivalStand v-else :world="world"/>
    <g v-if="world.prop === 'signal'" transform="translate(64 170)">
      <path d="M-3 4v47h6V4" fill="#695c49"/>
      <rect x="-14" y="-27" width="28" height="42" rx="9" fill="#515f59" stroke="#394b48" stroke-width="3"/>
      <circle cy="-11" r="8" :fill="world.signal ? '#9bd692' : '#728377'"/>
      <circle cy="5" r="5" :fill="world.signal === false ? '#e8aa83' : '#758073'"/>
    </g>
  </svg>
</template>

<style scoped>
svg { width: 100%; height: 100%; }
text { font: 600 12px system-ui, sans-serif; fill: #3f483d; }
</style>
