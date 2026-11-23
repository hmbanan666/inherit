<script setup lang="ts">
import { computed } from 'vue'
import FloorArm from '../../../../../apps/web/app/components/FloorArm.vue'
import type { Call } from '../../framework/pack'
import { places, type Floor } from './floor'
import type { Place } from './player'

const props = defineProps<{ world: Floor; calls: Call[]; nextCall?: Call; reach?: number }>()
const stations = {
  belt: { x: 120, y: 232 },
  left: { x: 355, y: 116 },
  right: { x: 355, y: 338 },
  cart: { x: 606, y: 232 },
}
const arms = computed(() => {
  const from = stations[props.world.station]
  const destination = props.nextCall?.args[0] as Place
  const to = ['take', 'put'].includes(props.nextCall?.name ?? '') && places.includes(destination) ? stations[destination] : from
  const t = props.reach ?? 0
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - 37 }
})
const routes = computed(() => {
  switch (props.world.challenge) {
    case 'colour-bins': return ['belt-left', 'belt-right']
    case 'route-table': return ['belt-left', 'belt-right', 'belt-cart']
    case 'merge-bins':
    case 'alternate-bins': return ['left-cart', 'right-cart']
    case 'bin-dispatch':
    case 'relay-controller': return ['belt-right', 'right-cart']
    case 'clear-outlet': return ['left-cart']
    default: return ['belt-cart']
  }
})
const visibleStations = computed(() => places.filter(place => routes.value.some(route => route.split('-').includes(place))))
const paths: Record<string, string> = {
  'belt-left': 'M193 213 286 158',
  'belt-right': 'M194 258 283 306',
  'belt-cart': 'M198 232H526',
  'left-cart': 'M422 151 531 209',
  'right-cart': 'M427 317 527 257',
}
const counting = computed(() => ['heavy-tally', 'peak-weight'].includes(props.world.challenge))
const labels = computed(() => places.flatMap(place => props.world.queues[place]).concat(props.world.hand ?? []).sort((a,b) => a.id.localeCompare(b.id)))
</script>

<template>
  <div class="shed" aria-label="Parcel floor" data-testid="floor">
    <svg class="plan" viewBox="0 0 730 425" role="group" aria-label="Parcel stations and route arrows">
      <defs>
        <pattern id="tiles" width="42" height="42" patternUnits="userSpaceOnUse">
          <path d="M0 42V0H42" fill="none" stroke="#3c3c3d" stroke-width="1"/>
          <circle cx="3" cy="3" r="1" fill="#484747"/>
        </pattern>
        <pattern id="rollers" width="13" height="30" patternUnits="userSpaceOnUse" patternTransform="skewX(-16)">
          <rect width="11" height="30" rx="3" fill="#92948d"/><path d="M3 1v28" stroke="#beb9a8"/>
        </pattern>
        <marker id="route-tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0 0 10 5 0 10z" fill="#c3a46c"/>
        </marker>
      </defs>
      <rect width="730" height="425" fill="#292a2b"/><rect width="730" height="425" fill="url(#tiles)"/>
      <g stroke="#c3a46c" stroke-width="4" stroke-dasharray="9 7" fill="none" marker-end="url(#route-tip)">
        <path v-for="route in routes" :key="route" :d="paths[route]" :data-route="route"/>
      </g>
      <g v-for="place in visibleStations" :key="place" :data-focus="place" :transform="'translate(' + stations[place].x + ' ' + stations[place].y + ')'"
         :aria-label="place + ', ' + world.queues[place].length + ' parcels'">
        <ellipse cy="15" rx="68" ry="12" fill="#161719" opacity=".55"/>
        <g v-if="place === 'belt'">
          <path d="M-60 2v16h9V5m93-3v16h9V4" fill="#92938f"/>
          <path d="M-65-18h129l-8 24H-64q-12-10-1-24" fill="#4e5253" stroke="#141516" stroke-width="3"/>
          <path d="M-59-26H67l-10 21H-68z" fill="url(#rollers)" stroke="#a6a394" stroke-width="3"/>
          <circle v-for="x in [-58,-33,-8,17,42]" :key="x" :cx="x" cy="0" r="3" fill="#979788"/>
        </g>
        <g v-else-if="place === 'cart'">
          <path d="M-58-27v31h112v-44h14" fill="none" stroke="#c3b79d" stroke-linecap="round" stroke-width="6"/>
          <rect x="-59" y="-10" width="112" height="14" rx="3" fill="#ab9069" stroke="#564b3b" stroke-width="2"/>
          <path d="M-55-26H50m-81 0v18m48-18v18" stroke="#989589" stroke-width="3"/>
          <g v-for="x in [-42,36]" :key="x"><circle :cx="x" cy="13" r="10" fill="#1e2021" stroke="#8c8980" stroke-width="3"/><circle :cx="x" cy="13" r="3" fill="#bcb4a0"/></g>
        </g>
        <g v-else :class="place">
          <path d="M-57-23-43-37H55L46-20z" fill="#393737" stroke="currentColor" stroke-width="3"/>
          <path d="M-57-22H47l-5 35h-92z" fill="currentColor"/>
          <path d="m47-22 9-15-6 37-8 13z" fill="currentColor" opacity=".7"/>
          <path d="M-41-12h73m-67 13h62" stroke="#312d2d" stroke-width="3" opacity=".55"/>
          <text v-if="world.jammed && place === 'left'" y="-46" class="jam">◆ Jammed</text>
        </g>
        <g v-for="(parcel, index) in world.queues[place].slice(0, 5)" :key="parcel.id" :transform="'translate(' + (-44 + index * 19) + ' -30)'">
          <rect width="22" height="20" rx="2" :fill="parcel.colour === 'red' ? '#df9481' : '#92b1ca'" stroke="#433c37" stroke-width="2"/>
          <path d="M8 1v5h6V1" fill="#dbc9a1"/>
          <text x="11" y="16" class="parcel-id">{{ parcel.id }}</text>
        </g>
        <text y="42" class="name">{{ place }}</text>
        <text y="60" :data-testid="'result-' + place" class="queue">{{ world.queues[place].map(p => p.id).join(' ') || 'Empty' }}</text>
      </g>
      <foreignObject :x="arms.x - 100" :y="arms.y - 75" width="200" height="106" pointer-events="none">
        <div class="arm-mount"><FloorArm :x="100" :y="75" :hand="world.hand?.id ?? null" :colour="world.hand?.colour"/></div>
      </foreignObject>
    </svg>
    <div class="manifest-board">
      <div><h3>Parcel labels</h3><ul><li v-for="parcel in labels" :key="parcel.id">
        <strong :class="parcel.colour">{{ parcel.id }}</strong> {{ parcel.colour }} · {{ parcel.weight }} · {{ parcel.to }}
      </li></ul><p v-if="!labels.length">Waiting for arrivals</p></div>
      <output v-if="counting" class="scale" aria-label="Scale display">Scale <b data-testid="result-scale">{{ world.readings.at(-1) ?? '—' }}</b></output>
    </div>
  </div>
</template>
<style scoped>
.shed { display: flex; flex-direction: column; justify-content: center; align-items: stretch; min-height: 0; height: 100%; background: #232426; }
.plan { display: block; width: 100%; min-height: 0; max-height: 72%; }
.arm-mount { position: relative; width: 100%; height: 100%; }
.left { color: #ba7f70; } .right { color: #819cae; }
text { text-anchor: middle; font-family: var(--mono); }
.name { fill: #eeece5; font-size: 18px; font-weight: 600; }
.queue { fill: #d1c9b9; font-size: 14px; }
.parcel-id { fill: #251f1b; font-size: 12px; font-weight: bold; }
.jam { fill: #f6c259; font-size: 15px; }
.manifest-board { display: flex; justify-content: space-between; gap: 1rem; margin: 0 4%; padding: 14px 0; border-top: 1px solid #5c5850; }
h3 { margin: 0 0 8px; color: var(--soft); font-size: 13px; }
ul { display: flex; flex-wrap: wrap; gap: 7px 16px; list-style: none; padding: 0; margin: 0; }
li, p, .scale { font: 12px var(--mono); color: var(--soft); }
.red { color: #e6a48e; } .blue { color: #adcde5; }
.scale { flex: none; text-align: center; }
.scale b { background: #292d25; display: block; min-width: 65px; padding: 3px 10px; border: 2px solid #696861; border-radius: 4px; color: #dfd4aa; font-size: 22px; }
</style>
