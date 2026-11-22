<script setup lang="ts">
defineProps<{apples:number}>()
const fruit = [[-18,-52],[14,-66],[31,-47]]
</script>
<template><g>
  <ellipse cx="8" cy="4" rx="46" ry="9" fill="#394d39" opacity=".3"/>
  <path d="m-9 0 3-44-19-18 4-4 18 15 5-35 5 2-2 34 17-13 3 4-16 17 3 42z" fill="#69503d"/>
  <path d="m-4-3 4-42 4 7-1 38z" fill="#936b46"/>
  <path d="m-44-49-3-12 9-18 14-4 8-14 18-4 13 7 16-1 14 16 3 12 10 8-5 20-18 8-20-4-14 8-22-5-9-11z" fill="#536443"/>
  <path d="m-41-64 9-13 13-2 9-14 13-4 12 6 15-1 12 13-8 11-14 2-6 9-17-3-9 6-18-5z" fill="#76804f"/>
  <path d="m-32-70 10-5 7 2-6 5zm29-14 9-5 10 4-5 4zm18 16 7-6 9 2-5 6z" fill="#a0a462"/>
  <g v-for="(f,i) in fruit.slice(0,apples)" :key="i" :transform="'translate('+f.join(' ')+')'"><circle r="5" fill="#bb6354"/><path d="m0-4 2-4" stroke="#4a5040" stroke-width="2"/><circle cx="-1.4" cy="-1.5" r="1.4" fill="#e29568"/></g>
</g></template>
