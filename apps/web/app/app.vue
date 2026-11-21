<script setup lang="ts">
const tallyDesk = new URLSearchParams(window.location.search).get('chapter') === 'tally-desk'
const FactoryWorkshop = defineAsyncComponent(() => import('./FactoryWorkshop.vue'))
</script>

<template>
  <LazyTallyDesk v-if="tallyDesk" />
  <FactoryWorkshop v-else />
</template>
