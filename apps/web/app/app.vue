<script setup lang="ts">
const query = new URLSearchParams(location.search)
const packs = ['packs', 'pack', 'lesson'].some(key => query.has(key))
</script>

<template>
  <LazyPackShowcase v-if="packs" />
  <FactoryFrame v-else />
</template>
