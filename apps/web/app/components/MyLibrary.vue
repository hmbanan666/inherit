<script setup lang="ts">
import { useGame } from '../lib/useGame'
const { files, openFile } = useGame()
const functions = computed(() => Object.entries(files.value).flatMap(([file, source]) =>
  [...source.matchAll(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+\s*\([^)]*\))/gm)].map(match => ({
    signature: match[1], file, line: source.slice(0, match.index! + match[0].indexOf('function')).split('\n').length,
  })),
))
</script>
<template>
  <details v-if="functions.length" class="my-library">
    <summary>My library</summary>
    <button v-for="fn in functions" :key="fn.file + fn.line" @click="openFile(fn.file, fn.line)">{{ fn.signature }}</button>
  </details>
</template>
<style scoped>
details { padding: 6px 14px; font: 12px var(--mono); color: var(--soft); max-height: 95px; overflow: auto; }
summary { cursor: pointer; }
button { margin: 4px 6px 0 0; }
</style>
