<script setup lang="ts">
defineProps<{ x: number; y: number; hand: string | null; colour?: string }>()
</script>
<template>
  <div class="arm" data-testid="arm" :class="{ carrying: hand }" :style="{ left: x + 'px', top: y + 'px' }">
    <span class="carriage"></span><span class="boom"></span><span class="elbow"></span>
    <span class="forearm"></span><span class="claw"></span>
    <i v-if="hand" class="item" :class="colour">{{ hand }}</i>
    <div class="caption" data-testid="hand">{{ hand ? 'Holding ' + hand : 'Empty hand' }}</div>
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
.item { width: 22px; height: 17px; left: -2px; bottom: 2px; color: #24211c; background: #e3a08f; border: 2px solid #493e38; font: bold 11px/14px var(--mono); text-align: center; }
.item.blue { background: #96b6d4; }
.carrying .claw { transform: rotate(-8deg); }
.caption { position: absolute; transform: translateX(-50%); white-space: nowrap; top: 7px; padding: 2px 6px; color: var(--accent-soft); background: var(--overlay); border-radius: 3px; font: 12px var(--mono); }
</style>
