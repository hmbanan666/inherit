<script setup lang="ts">
import type { PackManifest } from '@inherit/sim/pack'
import type { MapLesson } from '@inherit/sim/course'
const props = defineProps<{ manifest: PackManifest; lessons: MapLesson[]; selected?: string | null }>()
const current = computed(() => props.lessons.find(l => l.id === props.selected) ?? props.lessons.find(l => l.state === 'current'))
const done = computed(() => props.lessons.filter(l => l.state === 'done').length)
const unit = computed(() => props.manifest.units?.findIndex(u => u.id === current.value?.unit) ?? -1)
</script>

<template>
  <div v-if="lessons.length" class="progress-strip">
    <span v-if="current"><template v-if="unit >= 0">Unit {{ unit + 1 }} · </template>{{ manifest.track === 'course' ? 'Lesson' : 'Challenge' }} {{ lessons.indexOf(current) + 1 }} of {{ lessons.length }}</span>
    <span v-else>{{ done }} of {{ lessons.length }} complete</span>
    <progress :value="done" :max="lessons.length" aria-label="Pack progress" />
  </div>
</template>
<style scoped>
.progress-strip { display: grid; align-content: center; gap: 5px; padding-inline: 10px; color: var(--soft); font: 12px var(--mono); white-space: nowrap }
progress { height: 3px; width: 100%; border: 0; background: var(--line); accent-color: var(--gold) }
progress::-webkit-progress-bar { background: var(--line) }
progress::-webkit-progress-value { background: var(--gold) }
@media (max-width: 600px) { .progress-strip { order: 5; padding: 2px; width: 100% } }
</style>
