<script setup lang="ts">
import type { TownSnapshot } from '@inherit/sim'
type PersonId = TownSnapshot['people'][number]['id']
const props = defineProps<{ person: PersonId }>()

// Tiny woodcut heads for the correspondence desk. Each row is one pixel tall.
const hats: Record<PersonId, string[]> = {
  bram: ['   hhhhh    ', '  hhhhhhhh  ', '  hhhhhhha  '],
  elsie: ['  sss ss ss ', ' ssssssssss ', '  hssssssh  '],
  tomas: ['     aa     ', '   hhaahh   ', '  hhhsshhh  '],
  wen: ['     hhhh   ', '   ssssshh  ', ' hhhhhhhhhh '],
  odile: ['     hhhh   ', '   hhhahhh  ', '  hhahhhah  '],
  harrow: ['       sshs ', '   sssssss  ', '  sshhhsss  '],
  ines: ['   hhhhhh   ', '  hhhhhhhh  ', ' hhhhhaahhh '],
  pell: ['    hhh h   ', '  hhahhhhh  ', '  hhaaaahh  '],
}
const faces: Record<PersonId, string[]> = {
  bram: ['  hsssshhs  ', '  ssdsdsss  ', '   sssash   ', '   hhdhhh   ', '    hhhh    '],
  elsie: ['  hssssssh  ', '  hsdssdsh  ', '  hssssssh  ', '   ssddss   ', '    ssss    '],
  tomas: ['  hssaassh  ', '  hsdaads   ', '   aaaaas   ', '   haadha   ', '    hhhh    '],
  wen: ['  hssssssh  ', '  ssdsdsss  ', '   ssasss   ', '   hssssh   ', '    ssss    '],
  odile: ['  hhsssssh  ', '  hsdssdsh  ', '  hsssassh  ', '   ssddssh  ', '    ssssh   '],
  harrow: ['  sssssssh  ', '  hhshhhsh  ', '  hdshhdsh  ', '   sssass   ', '    ssds    '],
  ines: ['  hssssshh  ', '  hsdssdsh  ', '  hsssassh  ', '   ssddssh  ', '    ssssh   '],
  pell: ['  hhsssssh  ', '  haddaddh  ', '  haddaddh  ', '   sssass   ', '    hhhs    '],
}
const colors: Record<string, string> = {
  s: 'var(--text)',
  h: 'var(--sub)',
  d: 'var(--base)',
  a: 'var(--gold)',
}
const shadow = computed(() =>
  [...hats[props.person], ...faces[props.person], '   hhsshh   ', '  hhahhahh  ', ' hhhaaaahhh ']
    .flatMap((row, y) =>
      [...row].flatMap((pixel, x) => (colors[pixel] ? [x * 3 + 'px ' + y * 3 + 'px ' + colors[pixel]] : [])),
    )
    .join(','),
)
</script>
<template>
  <span class="objective-icon portrait" aria-hidden="true"><i :style="{ boxShadow: shadow }" /></span>
</template>
<style scoped>
.portrait {
  position: relative;
}
.portrait i {
  position: absolute;
  left: 3px;
  top: 5px;
  width: 3px;
  height: 3px;
}
</style>
