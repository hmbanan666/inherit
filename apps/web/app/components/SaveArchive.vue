<script setup lang="ts">
import { archivePrefix, type Archive } from '@inherit/sim/archive'
import { packKey } from '@inherit/sim/save'

const props = defineProps<{ pack: string; recovery?: boolean }>()
const archives = computed(() => {
  try {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(archivePrefix(props.pack)))
      .map(key => JSON.parse(localStorage.getItem(key)!) as Archive)
  } catch { return [] }
})
function download(raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = props.pack + '-save.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function exportSlot() {
  const raw = localStorage.getItem(packKey(props.pack)) ?? (props.pack === 'workshop' ? localStorage.getItem('inherit.workshop.v1') : null)
  if (raw) download(raw)
}
</script>

<template>
  <button v-if="recovery" @click="exportSlot">Export original save</button>
  <details v-for="archive in archives" :key="archive.raw">
    <summary>{{ archive.name }}</summary>
    <pre>{{ JSON.stringify(archive.project, null, 2) }}</pre>
    <button @click="download(archive.raw)">Download original save</button>
  </details>
</template>

<style scoped>
details { max-width: min(360px, 85vw); padding: 10px }
pre { max-height: 32vh; overflow: auto; font: 12px/1.5 var(--mono) }
</style>
