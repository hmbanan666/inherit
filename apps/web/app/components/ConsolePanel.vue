<script setup lang="ts">
import { useGame } from '../lib/useGame'
const { logs } = useGame()
</script>
<template>
  <div class="panel-content">
    <div v-for="(entry, i) in logs" :key="i">{{ entry.tick }} · {{ entry.text }}</div>
    <span v-if="!logs.length">Output from console.log appears here.</span>
  </div>
</template>
