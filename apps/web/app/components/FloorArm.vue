<script setup lang="ts">
import type { CallRecord, CampaignWorld } from '@inherit/sim'
defineProps<{ x: number; y: number; hand: string | null; call?: CallRecord; returning?: CampaignWorld['hand'] }>()
</script>
<template>
  <div class="arm" data-testid="arm" :class="{ carrying: hand }" :style="{ left: x + 'px', top: y + 'px' }">
    <span class="carriage"></span><span class="boom"></span><span class="elbow"></span>
    <span class="forearm"></span><span class="claw"></span>
    <i v-if="hand" class="item" :class="{ ingot: hand.includes('ingot') }"></i>
    <div class="caption" data-testid="hand">{{ hand ? hand.replaceAll('-', ' ') : 'empty hand' }}</div>
    <span v-if="returning" class="function">Putting {{ returning.item.replaceAll('-', ' ') }} back at "{{ returning.origin }}"</span>
    <code v-else-if="call?.within" class="function">{{ call.within }}()</code>
    <span v-if="call?.message" class="call-message">{{ call.message }}</span>
  </div>
</template>
<style scoped>
.arm { position: absolute; width: 0; height: 0; z-index: 1; }
.arm > span, .arm > i { position: absolute; }
.carriage { bottom: 0; left: -19px; width: 40px; height: 15px; border: 3px solid #39393b; border-radius: 6px; background: linear-gradient(#c6b898, #796b55); box-shadow: 0 4px 3px #232323a8; }
.boom, .forearm { background: linear-gradient(90deg,#746855,#e3c889 30%,#ae8f5d 72%,#6d6355); border: 2px solid #403e3a; border-radius: 5px; transform-origin: bottom; }
.boom { width: 14px; height: 44px; bottom: 8px; left: -6px; transform: rotate(-32deg); }
.elbow { width: 16px; height: 16px; border: 4px solid #c2ae84; border-radius: 50%; background: #555657; bottom: 36px; left: -28px; }
.forearm { width: 12px; height: 36px; bottom: 22px; left: 1px; transform: rotate(-54deg); }
.claw { width: 21px; height: 18px; border: solid #beb7a5; border-width: 5px 4px 0; border-radius: 5px 5px 9px 9px; left: -2px; bottom: 8px; }
.item { width: 19px; height: 15px; left: -1px; bottom: 3px; background: linear-gradient(150deg,#f4d2a6 0 28%,#ad8969 29% 62%,#796558 63%); clip-path: polygon(0 55%,35% 0,80% 10%,100% 60%,75% 100%,14% 90%); }
.carrying .claw { transform: rotate(-8deg); }
.item.ingot { clip-path: polygon(15% 0,88% 0,100% 75%,78% 100%,0 100%); background: #b7b8bc; }
.caption, .function, .call-message { position: absolute; transform: translateX(-50%); white-space: nowrap; text-align: center; }
.caption { top: 5px; padding: 4px 7px; color: var(--accent-soft); background: var(--overlay); border-radius: 3px; font: 12px var(--mono); }
.function, .call-message { bottom: 55px; color: var(--ink); background: var(--gold); border-radius: 5px; padding: 4px 8px; }
.call-message { bottom: 78px; white-space: normal; width: 145px; font: 13px/1.3 var(--mono); }
</style>
