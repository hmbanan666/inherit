<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronDown, ChevronRight, LockKeyhole } from '@lucide/vue'
import type { PackManifest } from '@inherit/sim/pack'
import type { MapLesson } from '@inherit/sim/course'
import UnitDots from './UnitDots.vue'

/** The nav progress chip. The course map lives in its popover and opens only on request. */
const props = defineProps<{
  manifest: PackManifest
  lessons: MapLesson[]
  selected?: string | null
  /** The selected lesson is solved and waiting for Continue. */
  solved?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{ select: [id: string] }>()
const open = ref(false)
const expanded = ref<string>()
const root = ref<HTMLElement>()
const units = computed(() => (props.manifest.units ?? []).map((unit, index) => {
  const lessons = props.lessons.filter(lesson => lesson.unit === unit.id)
  return { ...unit, index, lessons, done: lessons.filter(lesson => lesson.state === 'done').length }
}))
const current = computed(() => props.lessons.find(lesson => lesson.id === props.selected))
const unit = computed(() => units.value.find(u => u.id === current.value?.unit))
const position = computed(() => (unit.value?.lessons.findIndex(lesson => lesson.id === props.selected) ?? 0) + 1)
const states = computed(() => unit.value?.lessons.map(lesson =>
  lesson.state === 'done' || props.solved && lesson.id === props.selected ? 'done' as const
    : lesson.id === props.selected ? 'current' as const : 'todo' as const) ?? [])
const done = computed(() => props.lessons.filter(lesson => lesson.state === 'done').length)
watch(open, value => { if (value) expanded.value = unit.value?.id })
function outside(event: Event) {
  if (open.value && !root.value?.contains(event.target as Node)) open.value = false
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) { event.stopPropagation(); open.value = false }
}
function pick(lesson: MapLesson) {
  open.value = false
  if (lesson.id !== props.selected) emit('select', lesson.id)
}
onMounted(() => { document.addEventListener('pointerdown', outside); window.addEventListener('keydown', escape, true) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', escape, true) })
</script>

<template>
  <div v-if="unit" ref="root" class="course-progress">
    <button class="chip" data-testid="progress" :aria-expanded="open" aria-haspopup="dialog" @click="open = !open">
      <UnitDots :states="states" :fresh="solved ? position - 1 : undefined" />
      <span class="label">Unit {{ unit.index + 1 }} <i>·</i> Lesson {{ position }} of {{ unit.lessons.length }}</span>
      <ChevronDown />
    </button>
    <section v-if="open" class="map" role="dialog" aria-label="Course map" data-testid="course-map">
      <header>
        <strong>{{ manifest.title }}</strong>
        <small>{{ done }} of {{ lessons.length }} lessons done</small>
        <progress :value="done" :max="lessons.length" aria-label="Course progress" />
      </header>
      <div v-for="group in units" :key="group.id" class="unit" :class="{ open: expanded === group.id }">
        <button class="unit-row" :aria-expanded="expanded === group.id" @click="expanded = expanded === group.id ? undefined : group.id">
          <component :is="expanded === group.id ? ChevronDown : ChevronRight" />
          <span>{{ group.index + 1 }} <i>·</i> {{ group.title }}</span>
          <small>{{ group.done }}/{{ group.lessons.length }}</small>
        </button>
        <ol v-if="expanded === group.id">
          <li v-for="lesson in group.lessons" :key="lesson.id">
            <button :data-state="lesson.state" :aria-current="lesson.id === selected ? 'step' : undefined"
              :disabled="busy || lesson.state === 'locked'" @click="pick(lesson)">
              <Check v-if="lesson.state === 'done'" /><LockKeyhole v-else-if="lesson.state === 'locked'" /><b v-else />
              {{ lesson.goal }}
            </button>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<style scoped>
.course-progress { position: relative }
.chip { height: 36px; gap: 10px; padding: 0 10px 0 12px; border-color: transparent; background: transparent; color: var(--soft); font: 12px var(--mono); white-space: nowrap }
.chip:hover:not(:disabled), .chip[aria-expanded='true'] { border-color: var(--line); background: var(--surface-raised) }
.chip i { color: var(--editor-muted); font-style: normal }
.chip svg { width: 14px; height: 14px; color: var(--sub) }
.map { position: absolute; top: calc(100% + 14px); right: 0; z-index: 12; width: min(390px, calc(100vw - 24px)); max-height: min(560px, calc(100dvh - 110px)); overflow: auto; padding: 8px; border: 1px solid var(--line-strong); border-radius: 10px; background: var(--panel); box-shadow: 0 14px 40px var(--shadow); animation: drop .16s ease-out }
header { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 6px 10px; padding: 8px 8px 12px }
header strong { font-size: 15px }
header small { color: var(--sub) }
progress { grid-column: 1 / -1; width: 100%; height: 4px; border: 0; border-radius: 2px; background: var(--line); overflow: hidden }
progress::-webkit-progress-bar { background: var(--line) }
progress::-webkit-progress-value { background: var(--mint) }
progress::-moz-progress-bar { background: var(--mint) }
.unit-row { width: 100%; justify-content: flex-start; gap: 8px; padding: 7px 8px; border: 0; background: transparent; color: var(--sub); font-size: 13px; text-align: left }
.unit-row span { flex: 1 }
.unit-row i { font-style: normal; color: var(--editor-muted) }
.unit-row small { font: 11px var(--mono) }
.unit-row svg { width: 14px; height: 14px }
.unit.open .unit-row { color: var(--text); font-weight: 700 }
ol { margin: 0 0 6px; padding: 0 0 0 22px; list-style: none }
ol button { width: 100%; justify-content: flex-start; gap: 9px; padding: 7px 8px; border: 0; background: transparent; color: var(--soft); font-size: 13px; line-height: 1.3; text-align: left }
ol button svg, ol button b { flex: none; width: 14px; height: 14px }
ol button b { border-radius: 50%; box-shadow: inset 0 0 0 2px currentColor }
ol [data-state='done'] svg { color: var(--mint) }
ol [aria-current='step'] { color: var(--gold); background: var(--surface-raised) }
ol button:disabled { opacity: .55 }
@keyframes drop { from { opacity: 0; transform: translateY(-6px) } }
@media (max-width: 800px) {
  .chip .label, .chip svg { display: none }
  .map { position: fixed; top: 58px; left: 8px; right: auto }
}
@media (prefers-reduced-motion: reduce) { .map { animation: none } }
</style>
