<script setup lang="ts">
import { useGame } from '../lib/useGame'
const game = useGame()
const filter = ref('')
const entries = computed(() =>
  game.logs.value
    .filter((entry) =>
      (entry.text + ' ' + entry.level + ' ' + (entry.file ?? '') + ' ' + entry.tick)
        .toLowerCase()
        .includes(filter.value.toLowerCase()),
    )
    .slice()
    .reverse(),
)
</script>
<template>
  <section class="bench" aria-label="Program console">
    <div class="bar">
      <input v-model="filter" type="search" aria-label="Filter console" placeholder="Filter output…" /><button
        @click="game.clearLogs()"
      >
        Clear
      </button>
    </div>
    <p v-if="!entries.length" class="quiet">
      {{ filter ? 'No matching lines.' : 'Output from console.log appears here.' }}
    </p>
    <ol v-else class="rows mono">
      <li v-for="(entry, i) in entries" :key="i" class="row" :class="{ bad: entry.level === 'error' }">
        <span class="tick">t{{ entry.tick }}</span>
        <span v-if="entry.level === 'error'">Error · </span>{{ entry.text }}
        <span v-if="entry.count > 1" class="repeat">×{{ entry.count }}</span>
        <button
          v-if="entry.file && entry.line"
          :disabled="!Object.hasOwn(game.files.value, entry.file)"
          @click="game.openFile(entry.file, entry.line)"
        >
          {{ entry.file }}:{{ entry.line }}
        </button>
      </li>
    </ol>
  </section>
</template>
<style scoped src="../lib/devtools/panels.css"></style>
<style scoped>
.row { color: var(--soft); }
.row.bad { color: var(--alert); }
.repeat { color: var(--accent-soft); }
</style>
