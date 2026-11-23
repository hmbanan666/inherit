<script setup lang="ts">
import { Check, LockKeyhole } from '@lucide/vue'
import type { PackManifest } from '@inherit/sim/pack'
import type { MapLesson } from '@inherit/sim/course'
const props = defineProps<{ manifest: PackManifest; lessons: MapLesson[]; busy: boolean; selected?: string | null }>()
const current = computed(() => props.lessons.find(l => l.id === props.selected) ?? props.lessons.find(l => l.state === 'current'))
const done = computed(() => props.lessons.filter(l => l.state === 'done').length)
const unit = computed(() => props.manifest.units?.findIndex(u => u.id === current.value?.unit) ?? -1)
const groups = computed(() => props.manifest.units?.map(unit => ({
  title: unit.title, lessons: props.lessons.filter(l => l.unit === unit.id),
})) ?? [{ title: 'Challenges', lessons: props.lessons }])
const emit = defineEmits<{ select: [id: string] }>()
const map = ref<HTMLElement>()
function select(id: string) {
  map.value?.hidePopover()
  emit('select', id)
}
</script>

<template>
  <button v-if="lessons.length" class="progress-strip" popovertarget="lesson-map" data-testid="progress-chip">
    <span v-if="current"><template v-if="unit >= 0">Unit {{ unit + 1 }} · </template>{{ manifest.track === 'course' ? 'Lesson' : 'Challenge' }} {{ lessons.indexOf(current) + 1 }} of {{ lessons.length }}</span>
    <span v-else>{{ done }} of {{ lessons.length }} complete</span>
    <progress :value="done" :max="lessons.length" aria-label="Pack progress" />
  </button>
        <nav ref="map" id="lesson-map" popover :aria-label="manifest.track === 'course' ? 'Course map' : 'Challenge picker'">
          <h3>{{ manifest.track === 'course' ? 'Course map' : 'Challenge picker' }}</h3>
          <details v-for="group in groups" :key="group.title" :open="groups.length === 1 || group.lessons.some(l => l.id === selected)">
            <summary>{{ group.title }} <small>{{ group.lessons.filter(l => l.state === 'done').length }}/{{ group.lessons.length }}</small></summary>
            <button v-for="item in group.lessons" :key="item.id" :data-state="item.state"
              :aria-current="selected === item.id ? 'step' : undefined" :disabled="busy || item.state === 'locked'"
              @click="select(item.id)">
              <Check v-if="item.state === 'done'" /><LockKeyhole v-else-if="item.state === 'locked'" /><span v-else>○</span>
              {{ item.goal }}<span class="sr-only"> · {{ item.state }}</span>
            </button>
          </details>
        </nav>
</template>
<style scoped>
.progress-strip { display: grid; align-content: center; gap: 5px; padding-inline: 10px; color: var(--soft); font: 12px var(--mono); white-space: nowrap }
progress { height: 3px; width: 100%; border: 0; background: var(--line); accent-color: var(--gold) }
progress::-webkit-progress-bar { background: var(--line) }
progress::-webkit-progress-value { background: var(--gold) }
@media (max-width: 600px) { .progress-strip { order: 5; padding: 2px; width: 100% } }
#lesson-map { inset: 62px auto auto 10px; margin: 0; width: min(340px, 90vw); max-height: 65vh; overflow: auto; background: var(--panel); color: var(--text); padding: 12px; border: 1px solid var(--line) }
summary { cursor: pointer; padding: 7px 0; font-weight: 600 }
summary small { color: var(--sub); font: 11px var(--mono) }
details button { display: flex; gap: 8px; align-items: center; text-align: left; width: 100%; background: transparent; padding: 7px; border: 0; font-size: 12px }
details button svg { width: 13px; height: 13px; flex: none }
details [aria-current=step] { color: var(--gold); background: var(--surface-raised) }
details [data-state=done] svg { color: var(--mint) }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%) }
</style>
