<script setup lang="ts">
import { computed, ref } from 'vue'
import { archivedFiles, archives, archiveTitle } from './archive'

const props = defineProps<{ recovery?: boolean }>()
const saved = computed(() => archives(localStorage, props.recovery))
const selected = ref(0)
const groups = computed(() => archivedFiles(saved.value[selected.value]?.raw ?? ''))
function download() {
  const url = URL.createObjectURL(new Blob([saved.value[selected.value].raw], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'v5-workshop.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
<template>
  <details v-if="saved.length" class="archive">
    <summary>{{ archiveTitle }}</summary>
    <select v-if="saved.length > 1" v-model="selected" aria-label="Saved archive">
      <option v-for="(entry, index) in saved" :key="entry.key" :value="index">Archive {{ index + 1 }}</option>
    </select>
    <button @click="download">Download original save</button>
    <details v-for="(group, index) in groups" :key="index">
      <summary>{{ group.name }}</summary>
      <section v-for="(source, file) in group.files" :key="file"><strong>{{ file }}</strong><pre>{{ source }}</pre></section>
    </details>
  </details>
</template>
<style scoped>
.archive { max-width: min(28rem, 88vw); max-height: 50vh; overflow: auto; padding: .65rem; }
summary { cursor: pointer; margin-block: .4rem; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
