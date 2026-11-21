<script setup lang="ts">
import { useGame, type CallSite } from '../lib/useGame'
const game = useGame()
const groups = computed(() => {
  const bySite = new Map<string, { site: CallSite; machines: Set<string> }>()
  for (const [id, sites] of Object.entries(game.traces.value)) {
    for (const site of sites) {
      const key = JSON.stringify([site.file, site.fn, site.line])
      const group = bySite.get(key) ?? { site, machines: new Set<string>() }
      group.machines.add(id)
      bySite.set(key, group)
    }
  }
  return [...bySite.values()].sort(
    (a, b) => a.site.file.localeCompare(b.site.file) || a.site.line - b.site.line,
  )
})
</script>
<template>
  <section class="bench" aria-label="Machine drivers">
    <p v-if="!groups.length" class="quiet">Run a machine to see which line drives it.</p>
    <ul class="rows">
      <li
        v-for="{ site, machines } in groups"
        :key="site.file + ':' + site.line + ':' + site.fn"
        class="tools row"
      >
        <button
          class="mono"
          :disabled="!Object.hasOwn(game.files.value, site.file)"
          @click="game.openFile(site.file, site.line)"
        >
          {{ site.fn }} · {{ site.file }}:{{ site.line }}
        </button>
        <span class="quiet">→</span
        ><button
          v-for="id in machines"
          :key="id"
          :aria-pressed="game.selected.value === id"
          @click="game.selectMachine(id)"
        >
          {{ id }}
        </button>
      </li>
    </ul>
  </section>
</template>
<style scoped src="../lib/devtools/panels.css"></style>
<style scoped>
button[aria-pressed='true'] {
  border-color: #dfba78;
}
</style>
