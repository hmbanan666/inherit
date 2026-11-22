<script setup lang="ts">
import type { Village } from '../world'
import Villager from '../../../visuals/Villager.vue'
defineProps<{ world: Village }>()
</script>

<template>
  <g>
    <path d="M80 116v117m394-118v117" stroke="#7b5e45" stroke-width="10"/>
    <path d="m61 109 40-37h350l42 37v10H61z" fill="#b5745c"/>
    <path v-for="stripe in 6" :key="stripe" :d="`m${99 + (stripe-1)*61} 72h29l${(stripe-3)*3} 37h-35z`" fill="#efd8a4"/>
    <path d="M58 119h438" stroke="#8f634f" stroke-width="5"/>
    <path d="M67 204h418v10H67zM81 215h389v25H81z" fill="#b69973"/>
    <g v-if="world.scene === 'scale'">
      <path d="M219 200h115l-11-27h-93z" fill="#657d76" stroke="#4f655f" stroke-width="2"/>
      <rect x="221" y="165" width="112" height="9" rx="4" fill="#6a7368"/>
      <circle cx="275" cy="186" r="11" fill="#e7d8b3"/>
      <path d="M275 186l-6-6" stroke="#925e47" stroke-width="2" :transform="`rotate(${world.score ?? (world.slip ? 45 : 0)} 275 186)`"/>
      <g v-if="world.prop === 'slip'">
        <path d="M155 166q15-29 30 0m184 0q15-29 30 0" fill="none" stroke="#8a684b" stroke-width="4"/>
        <path d="M148 164h44l-5 27h-34zm213 0h44l-5 27h-34z" fill="#b99059"/>
        <text x="170" y="182">4</text><text x="383" y="182">6</text>
        <g v-if="world.slip"><path d="M298 193h27l16 18-31 3z" fill="#fff1ce"/><text x="319" y="207">{{ world.slip }}</text></g>
      </g>
      <g v-for="(weight, index) in world.tray" :key="index" :transform="`translate(${237+index*25} 164)`">
        <path d="m-10 0 2-18h16l3 18z" fill="#756d65"/><text y="-4" fill="white">{{ weight }}</text>
      </g>
    </g>
    <g v-else-if="world.scene === 'parade' || world.prop === 'rails'">
      <path d="M100 138q174 29 353-1" fill="none" stroke="#816c56" stroke-width="3"/>
      <path v-for="(flag,index) in world.flags" :key="index" :d="`M${148+88*index} 146h44l-22 45z`" :fill="flag === 'blue' ? '#5c869b' : '#e5b650'"/>
      <g v-for="(count,rail) in world.rails" :key="rail">
        <path v-for="ribbon in count" :key="ribbon" :d="`m${108+rail*184+ribbon*17} 149h9l3 36-6-5-5 6z`" :fill="rail ? '#7399a4' : '#d89869'"/>
      </g>
    </g>
    <g v-else-if="world.scene === 'scoreboard' || world.prop === 'score'">
      <g v-if="world.lessonId === 'score-maths'" transform="translate(98 146)">
        <g v-for="tile in 12" :key="tile" :transform="`translate(${(tile-1)%4*14} ${Math.floor((tile-1)/4)*14})`">
          <rect width="11" height="11" rx="2" :fill="tile === 12 ? '#9a8a79' : '#edd08c'"/>
          <path v-if="tile === 12" d="m8 0-5 5 4 2-5 4" fill="none" stroke="#58493e" stroke-width="1.5"/>
        </g>
      </g>
      <rect x="180" y="129" width="190" height="70" rx="5" fill="#4c635c" stroke="#907b57" stroke-width="5"/>
      <text x="275" y="175" class="chalk">{{ world.score ?? (world.sign || '—') }}</text>
    </g>
    <g v-else>
      <g v-for="(guest, index) in world.neighbours" :key="index" :transform="`translate(${260+index*56} 211)`">
        <Villager coat="#698c86" waving/>
        <text y="14">{{ guest }}</text>
      </g>
      <g v-for="(card, index) in world.cards" :key="index" :transform="`translate(${130 + index * 100} 145)`">
        <path d="m-28 0 63-2 3 47-64 2z" fill="#f1dfad" stroke="#a58861"/>
        <text x="4" y="19">{{ card.name }}</text><text x="4" y="36">{{ card.seats }} seats</text>
      </g>
      <g v-for="(name, index) in world.signs" :key="index" :transform="`translate(${120 + index * 100} 160)`">
        <rect width="77" height="30" rx="3" fill="#e6c592"/><text x="38" y="19">{{ name }}</text>
      </g>
      <g v-for="(name,index) in world.stalls" :key="index" :transform="`translate(${125 + index * 126} 148)`">
        <path d="m-21 9 15-19h68l16 19z" fill="#789593"/>
        <path d="M-12 10v41m81-41v41" stroke="#725f48" stroke-width="5"/>
        <text x="29" y="34">{{ name }}</text>
      </g>
      <path v-if="world.banner" d="M96 124q180 20 360 0v16q-180 22-360 0z" fill="#e9bf64"/>
    </g>
  </g>
</template>

<style scoped>
text { text-anchor: middle; font: 600 12px system-ui, sans-serif; fill: #483f32; }
text.chalk { fill: #fff0c6; font: 600 27px Georgia, serif; }
</style>
