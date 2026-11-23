<script setup lang="ts">
import { computed } from 'vue'
import AppleTree from '../../../visuals/AppleTree.vue'
import GardenBeds from './GardenBeds.vue'
import Villager from '../../../visuals/Villager.vue'
import type { Village } from '../world'
import type { Call } from '../../../framework/pack'
const props = defineProps<{world:Village; calls:Call[]}>()
const last = computed(()=>props.calls.at(-1)?.name)
const lamps = [[154,407],[253,421],[377,440],[504,451],[635,465]]
const coats = ['#627d84','#aa7458','#8a7691']
const bell = computed(()=>props.world.bell>0)
const boundedName = (value:string) => value.length>15 ? value.slice(0,14)+'…' : value
</script>
<template><div class="village-scene" aria-label="Dawn village">
  <svg viewBox="0 0 760 555" role="group" aria-label="Mila’s cottage, orchard and village path">
    <defs>
      <linearGradient id="dawn" x2="0" y2="1"><stop stop-color="#69697c"/><stop offset=".52" stop-color="#c4948b"/><stop offset="1" stop-color="#f0c992"/></linearGradient>
      <linearGradient id="meadow" x2=".2" y2="1"><stop stop-color="#98a075"/><stop offset="1" stop-color="#6a7856"/></linearGradient>
      <linearGradient id="plaster" x2=".3" y2="1"><stop stop-color="#ead2a0"/><stop offset="1" stop-color="#ccab7f"/></linearGradient>
      <linearGradient id="stream"><stop stop-color="#81969a"/><stop offset="1" stop-color="#a9b0a0"/></linearGradient>
      <pattern id="grass" width="40" height="33" patternUnits="userSpaceOnUse"><path d="m5 17 4-1m11 11 3-3m9-18 2 1" stroke="#505d49" stroke-width="1.5" opacity=".32"/></pattern>
      <g id="pine"><path fill="currentColor" d="M-2 0v-12h-12l8-13h-6l10-17-5 1L0-58l8 17-5-1 10 18H7l8 12H3V0z"/></g>
      <g id="flower"><path d="m0 0 0-10m0 7-4-4m4 2 4-4" stroke="#455e43" stroke-width="2"/><path d="m-5-12 2-3 3 2 3-2 3 3-2 5h-7z" fill="currentColor"/><circle cy="-11" r="2" fill="#ecca71"/></g>
      <g id="window"><path d="M-17 0v-29q17-12 34 0V0z" fill="#634d40"/><path d="M-13-3v-23q13-9 26 0v23z" fill="#8eaaa3"/><path d="M0-33v32m-14-16h28" stroke="#59483d" stroke-width="3"/><path d="M-20 0h40v5h-40z" fill="#896648"/></g>
      <g id="stall"><path d="M-28-45v47m55-47v47" stroke="#614e3d" stroke-width="4"/><path d="M-31-49h60l7 17h-75z" fill="currentColor"/><path d="m-20-49-4 17h10l2-17zm22 0-1 17h10l-2-17z" fill="#ecdbb5"/><path d="M-32-33h63v5h-63z" fill="#725344"/><path d="M-31-10h61V0h-61z" fill="#907351"/></g>
    </defs>
    <rect width="760" height="285" fill="url(#dawn)"/>
    <circle cx="568" cy="109" r="55" fill="#f2d79f" opacity=".22"/><circle cx="568" cy="109" r="39" fill="#f6d8a2"/>
    <g fill="#e5c4b2" opacity=".66"><path d="M47 87q28-12 49-9 12-11 33-5 15-1 31 7l39 4z"/><path d="M371 61q23-8 42-5 18-9 34-2l29 5z"/></g>
    <path d="m0 169 96-48 42 7 72-45 31 14 81 58 72-34 32-30 23 9 52 51 82-27 67-52 42 15 68 49v105H0" fill="#8b8790"/>
    <path d="m0 191 109-60 35 15 51-23 114 62 58-14 91-49 28 10 86 40 46-15 68-38 74 24v96H0" fill="#797f79"/>
    <path d="M0 192q165-76 307-4 101 45 183-9t270-28v131H0" fill="#667768"/>
    <g color="#546b5e"><use v-for="i in 31" :key="i" href="#pine" :transform="'translate('+((i*79)%775-9)+' '+(194+(i*17)%32)+') scale('+(0.38+(i%4)*.09)+')'"/></g>
    <path d="M0 213q183-38 338 13 116 26 228-17t194-15v361H0" fill="url(#meadow)"/>
    <path d="M0 213q183-38 338 13 116 26 228-17t194-15v361H0" fill="url(#grass)"/>
    <path d="M760 217q-230 18-150 61t-51 51q-48 10-60 22 42-14 93-17 133-9 37-58-68-34 131-39z" fill="url(#stream)"/>
    <path d="M0 442q116-59 261-40 163 23 264 30t235 40v49q-135-38-244-46-107-8-272-37T0 481z" fill="#c2ac86"/>
    <path d="M340 323q-20 37-62 61t-22 39l39 2q-19-15 14-37t55-63z" fill="#c2ac86"/>
    <g fill="#a29376"><ellipse v-for="i in 38" :key="i" :cx="(i*67)%760" :cy="418+Math.abs(((i*67)%760)-161)*.105+(i%4)*3" :rx="2+i%3" ry="1.5"/></g>
    <g stroke="#645c43" stroke-width="4"><path d="m5 330 124-33m-124 47 124-33m383-11 144-29m-144 44 144-29"/></g>
    <g fill="#95805d"><path v-for="i in 9" :key="i" :d="'M'+(i*15-10)+' '+(323-i*4)+'l3-5 3 4v36h-6z'"/><path v-for="i in 10" :key="'r'+i" :d="'M'+(507+i*14)+' '+(291-i*2.8)+'l3-5 3 4v35h-6z'"/></g>
    <AppleTree transform="translate(83 317) scale(1.16)" :apples="Math.max(0,2-world.basket)"/>
    <AppleTree transform="translate(630 285) scale(1.07)" :apples="Math.max(0, Math.min(3, 5-world.basket))"/>
    <ellipse cx="307" cy="335" rx="140" ry="15" fill="#515e45" opacity=".35"/>
    <path d="M179 247 270 170l120 52v108l-211 6z" fill="url(#plaster)"/><path d="m390 222 46-29v123l-46 14z" fill="#ac8e6a"/>
    <path d="m179 317 211-4v17l-211 6z" fill="#9d927c"/><path d="m390 313 46-15v18l-46 14z" fill="#7b7665"/>
    <g stroke="#76634e" stroke-width="5" fill="none"><path d="M186 243v74m12-69 63-61 0 125m-75-57 203-4m-3-22v84m11-81 29-20v87"/></g>
    <path d="m157 253 98-108 128-12 69 68-62 34-132-67-82 89z" fill="#5c4944"/>
    <path d="m157 247 96-108 130-13 68 69-64 31-128-74-90 99z" fill="#a26150"/>
    <path d="m261 147 119-13 60 59-52 24z" fill="#926054"/>
    <g stroke="#724f48" stroke-width="2" opacity=".8"><path d="m284 159 107-14m-87 25 97-14m-80 27 92-16m-72 28 80-16m-63 26 74-18"/><path d="m303 139 17 16m12-19 16 17m12-20 14 14m-49 18 15 12m17-15 13 10m-3 13 11 10"/></g>
    <path d="m328 143-2-42 20-4 7 41z" fill="#956e5c"/><path d="m321 101 27-6 3 8-28 7z" fill="#70544c"/>
    <g fill="#d6c1ad" opacity=".55" class="smoke"><ellipse cx="331" cy="80" rx="8" ry="6"/><ellipse cx="321" cy="67" rx="13" ry="7"/><ellipse cx="309" cy="55" rx="15" ry="5"/></g>
    <path d="M288 326v-48q18-21 38-4v51z" fill="#5f5550"/><path d="M292 325v-45q14-15 29-4v49z" fill="#697f73"/><circle cx="315" cy="305" r="2.4" fill="#e7c381"/>
    <g data-testid="cottage-windows" role="img" :aria-label="world.shutters?'Shutters open':'Shutters closed'">
      <g v-for="x in [214,259,357]" :key="x" :transform="'translate('+x+' 294)'"><use href="#window"/>
        <path v-if="!world.shutters" d="M-15-27h13v23h-13zm17 0h13v23H2z" fill="#758373"/>
        <path v-else d="M-25-29l7 3v24l-8-2zm43 3 8-4v25l-8 2z" fill="#516c62"/>
      </g>
    </g>
    <g data-testid="ribbons" role="img" :aria-label="world.ribbons+' ribbons'"><path v-for="i in world.ribbons" :key="i" :d="'M'+([214,259,357][Math.floor((i-1)/2)%3]+(i%2?8:-8))+' 298q5 7 0 16l-3-3-2 2q5-10 0-15z'" :fill="i%2?'#c67e6d':'#dbb465'"/></g>
    <g transform="translate(367 235)" :class="{ring: last==='ringBell'}"><path d="M-8-1q0-14 8-16 8 3 8 16l3 4h-22z" :fill="bell?'#edc66f':'#ac955d'"/><circle cy="4" r="2" fill="#72583e"/></g>
    <g data-testid="flagpole" role="img" :aria-label="world.flag==='gold'?'Gold flag':'Flag pole'"><path d="M156 337V219" stroke="#726549" stroke-width="4"/><path v-if="world.flag" d="M158 222q18-9 35-1l-8 9 6 8q-16-8-33 0z" :fill="world.flag==='gold'?'#efc462':'#759aa6'"/></g>
    <g transform="translate(136 335)" data-testid="house-sign" role="img" :aria-label="world.sign?'Sign painted':'Blank sign'"><path d="M-3 0V-34h6V0z" fill="#6a5948"/><rect x="-32" y="-45" width="64" height="21" rx="3" fill="#d8b784" stroke="#816749"/><text text-anchor="middle" y="-30" class="sign">{{ boundedName(world.sign) }}</text></g>
    <GardenBeds v-if="world.scene === 'garden' && world.prop === 'beds'" :world="world"/>
    <g v-else transform="translate(114 360)" data-testid="gate-bed" role="img" :aria-label="world.gateFlowers+' flowers'"><ellipse rx="36" ry="7" fill="#807558"/><use v-for="i in world.gateFlowers" :key="i" href="#flower" :transform="'translate('+((i-1)%8*10-19)+' '+(Math.floor((i-1)/8)*4)+')'" :color="i%2?'#d8919d':'#dbc174'"/></g>
    <g v-if="world.prop !== 'beds'" transform="translate(222 332)" data-testid="house-bed" role="img" :aria-label="world.houseFlowers+' flowers'"><use v-for="i in world.houseFlowers" :key="i" href="#flower" :x="(i-1)%8*10" :y="Math.floor((i-1)/8)*4" color="#edc587"/></g>
    <g transform="translate(492 348)" data-testid="orchard-basket" role="img" :aria-label="world.basket+' apples'"><path d="M-17-8q1-28 22-16l8 15" fill="none" stroke="#71593f" stroke-width="3"/><circle v-for="i in world.basket" :key="i" :cx="(i-1)%3*10-10" :cy="-9-Math.floor((i-1)/3)*6" r="5.4" fill="#b85f50"/><path d="M-19-9h36l-5 15h-27z" fill="#ac8659" stroke="#71593f" stroke-width="2"/></g>
    <g transform="translate(552 383)" data-testid="picnic" role="img" :aria-label="world.picnic?'Table set':'Bare table'"><path d="M-24-9v12m44-12v12" stroke="#635540" stroke-width="5"/><path d="m-34-19 54-3 13 10-63 3z" :fill="world.picnic?'#c68b78':'#987e5a'"/><g v-if="world.picnic || world.scene === 'picnic'" fill="#f0dabb"><ellipse v-for="i in 3" :key="i" :cx="i*14-33" cy="-15" rx="6" ry="3"/></g></g>
    <g data-testid="path-canopy" role="img" :aria-label="world.canopy?'Canopy open':'Canopy folded'"><g v-if="world.canopy" transform="translate(552 362)"><path d="M0 9v-77" stroke="#6e5843" stroke-width="4"/><path d="M-47-49q9-22 47-23 33 2 45 23z" fill="#c17a66"/><path d="m0-72-15 23h-15q10-16 30-23zm3 1q15 4 25 22H14z" fill="#e2c395"/></g></g>
    <g v-for="(p,i) in lamps" :key="i" :transform="'translate('+p.join(' ')+')'" role="img" :data-testid="'lamp-'+(i+1)" :aria-label="'Lamp '+(i+1)+(world.lamps.includes(i+1)?' lit':' unlit')">
      <ellipse v-if="world.lamps.includes(i+1)" rx="25" ry="6" fill="#efc574" opacity=".35"/><path d="M-2 0v-37h4V0z" fill="#655a47"/>
      <circle v-if="world.lamps.includes(i+1)" cy="-39" r="17" fill="#f9d378" opacity=".24"/><path d="m-6-46 12 0-2 14h-8z" :fill="world.lamps.includes(i+1)?'#ffdc86':'#9c9b7b'" stroke="#595948" stroke-width="2"/><path d="m-8-46 8-6 8 6z" fill="#575a4c"/>
    </g>
    <g data-focus="mila-greeting">
    <g transform="translate(405 389)"><Villager :class="{sniff:last==='plant'}" :key="calls.length" coat="#567b78" :waving="!!world.bubble"/><rect x="-22" y="8" width="44" height="17" rx="8" fill="#36473e"/><text y="20" class="name" text-anchor="middle">Mila</text></g>
    <g v-if="world.bubble" transform="translate(407 306)" data-testid="mila-bubble" role="img" :aria-label="world.bubble"><rect :x="-Math.min(world.bubble.length*4+12,95)" y="-14" :width="Math.min(world.bubble.length*8+24,190)" height="28" rx="8" fill="#f6e8ca"/><path d="m-6 13 5 7 6-7" fill="#f6e8ca"/><text text-anchor="middle" y="5" class="bubble">{{ boundedName(world.bubble) }}</text></g>
    </g>
    <g data-testid="guests" role="img" :aria-label="world.neighbours.length+' neighbours'"><g v-for="(name,i) in world.neighbours" :key="name" :transform="'translate('+(242+i*116)+' '+(479+i%2*13)+')'"><Villager :coat="coats[i%3]" :hair="['#714d3b','#4a4140','#9b7953'][i%3]"/><text text-anchor="middle" y="16" class="guest-name">{{ boundedName(name) }}</text></g></g>
    <g data-testid="fair" role="img" :aria-label="world.banner?'Fair open':'Village green'"><use v-for="(name,i) in world.stalls" :key="name" href="#stall" :transform="'translate('+(192+i*116)+' '+(513+i%2*9)+')'" :color="coats[i%3]"/>
      <g v-if="world.banner"><path d="m157 446 0-18q137 30 302 0v18q-155 28-302 0z" fill="#ecd298"/><text x="307" y="451" text-anchor="middle" class="sign">Welcome to the fair</text></g></g>
    <g v-if="world.raining" opacity=".45" stroke="#e0ece5" stroke-width="2"><path v-for="i in 38" :key="i" :d="'m'+((i*47)%760)+' '+((i*61)%490)+' -4 12'"/></g>
  </svg>
</div></template>
<style scoped>
.village-scene{flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(#69697c 0 35%,#8c956c 62%,#6a7856 70% 100%)}
svg{width:100%;max-height:100%;display:block}.sign,.bubble,.guest-name,.name{font:600 13px 'Space Grotesk',sans-serif;fill:#463e31}.name{fill:#f2e1b8;font-size:11px}.guest-name{fill:#293a2f;paint-order:stroke;stroke:#b7bf94;stroke-width:3px}.bubble{font-size:15px}.smoke{animation:smoke 5s ease-in-out infinite alternate}.ring{transform-box:fill-box;transform-origin:top center;animation:ring .23s ease 2 alternate}@keyframes smoke{to{opacity:.4;translate:-3px -3px}}@keyframes ring{to{rotate:12deg}}
.sniff{transform-origin:center bottom;transform-box:fill-box;animation:sniff .7s ease-in-out}@keyframes sniff{50%{transform:rotate(-12deg)}}
@media(prefers-reduced-motion:reduce){.smoke,.ring,.sniff{animation:none}}
</style>
