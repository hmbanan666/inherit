<script setup lang="ts">
defineProps<{coat:string; scarf?:string; hair?:string; waving?:boolean}>()
</script>
<template>
  <g>
    <ellipse cy="1" rx="18" ry="5" fill="#26362d" opacity=".37"/>
    <g stroke-linejoin="round" stroke="#403d39" stroke-width="2">
      <path d="M-8-12h6v13h-9v-4l3-1zm10 0h6v9l4 1v4H2z" fill="#514740"/>
      <path d="m-7-34-7 21 6 3 4-10h9l5 9 6-3-9-20z" :fill="coat"/>
      <path d="m-7-33 14-1 4 23H-12z" :fill="coat"/>
      <path d="m-8-34 16-1-1 5-5 1 1 10-5-1-1-9-4-2z" :fill="scarf || '#edc984'"/>
      <path d="m-8-47 3-5h10l6 5-1 10-5 4h-7l-6-6z" fill="#dbb18a"/>
      <path d="m-10-44 1-8 6-5 10 1 6 8-8-2-4 3-5-1-2 7z" :fill="hair || '#674c41'"/>
    </g><circle cx="5" cy="-42" r="1.4" fill="#44332f"/>
    <g v-if="waving" class="wave"><path d="m9-31 8-4 3-11" fill="none" :stroke="coat" stroke-width="6"/><circle cx="20" cy="-47" r="3.8" fill="#dbb18a"/></g>
  </g>
</template>
<style scoped>.wave {transform-origin:9px -31px;animation:wave .55s ease-in-out 2 alternate}@keyframes wave{to{transform:rotate(12deg)}}</style>
