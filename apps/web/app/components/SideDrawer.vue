<script setup lang="ts">
import { X, Check, LockKeyhole } from '@lucide/vue'
import type { Lesson, PackManifest, Theory, Task } from '@inherit/sim/pack'
import type { MapLesson } from '@inherit/sim/course'
import type { ApiMethod } from '@inherit/sim/declarations'
import type { DrawerTab } from '../lib/packProtocol'

const props = defineProps<{
  tab: DrawerTab
  manifest: PackManifest
  lessons: MapLesson[]
  selected?: string | null
  theory?: Theory
  clock?: boolean
  task?: Task
  hints: readonly string[]
  rung: number
  entries: ApiMethod[]
  types?: string[]
  logs?: string[]
  busy?: boolean
  prediction?: Lesson<unknown>['prediction']
  choice?: string
}>()
const emit = defineEmits<{
  close: []
  select: [id: string]
  tab: [tab: DrawerTab]
  hint: []
  predict: [choice: string]
  edit: []
}>()
const tabs: DrawerTab[] = ['learn', 'hints', 'api', 'console']
const labels = { learn: 'Learn', hints: 'Hints', api: 'API', console: 'Console' }
const groups = computed(() => props.manifest.units?.map(unit => ({
  title: unit.title, lessons: props.lessons.filter(l => l.unit === unit.id),
})) ?? [{ title: 'Challenges', lessons: props.lessons }])
function tabKey(event: KeyboardEvent) {
  const index = tabs.indexOf(props.tab)
  const next = event.key === 'ArrowLeft' ? tabs[(index + 3) % 4]
    : event.key === 'ArrowRight' ? tabs[(index + 1) % 4] : undefined
  if (next) {
    event.preventDefault()
    emit('tab', next)
    document.getElementById('tab-' + next)?.focus()
  }
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close') }
}
onMounted(() => window.addEventListener('keydown', escape))
onBeforeUnmount(() => window.removeEventListener('keydown', escape))
</script>

<template>
  <aside class="drawer side-drawer" data-testid="drawer" aria-label="Lesson drawer">
    <header>
      <div role="tablist" aria-label="Lesson tools" @keydown="tabKey">
        <button v-for="name in tabs" :id="'tab-' + name" :key="name" :data-testid="'drawer-' + name"
          role="tab" :aria-selected="tab === name" :tabindex="tab === name ? 0 : -1" aria-controls="drawer-panel"
          @click="emit('tab', name)">{{ labels[name] }}</button>
      </div>
      <button aria-label="Close drawer" @click="emit('close')"><X /></button>
    </header>
    <section :key="tab" id="drawer-panel" class="sheet-content" role="tabpanel" :aria-labelledby="'tab-' + tab">
      <template v-if="tab === 'learn'">
        <ol v-if="clock" class="clock-strip" aria-label="The floor clock">
          <li><b>Run</b>Read your file once.</li>
          <li><b>Deploy</b>Call your exported onTick each tick.</li>
          <li><b>Stop loop</b>Keep the last completed tick.</li>
        </ol>
        <template v-if="theory"><h2>{{ theory.title }}</h2><p v-for="line in theory.body" :key="line">{{ line }}</p><pre>{{ theory.example }}</pre></template>
        <template v-if="task"><h3>Condition</h3><p>{{ task.condition }}</p><ul><li v-for="example in task.examples" :key="example">{{ example }}</li></ul></template>
        <p v-if="clock">Pause holds the current reach. Choose 1×, 2× or 4× to change speed. Run once tries one tick on a copy.</p>
        <fieldset v-if="prediction"><legend>{{ prediction.question }}</legend>
          <button v-for="option in prediction.choices" :key="option" :aria-pressed="choice === option" :disabled="busy || !!choice" @click="emit('predict', option)">{{ option }}</button>
        </fieldset>
        <button v-if="theory || task" class="got-it" @click="emit('edit')">Got it</button>
        <slot name="learn" />
        <nav aria-label="Course map">
          <h3>{{ manifest.track === 'course' ? 'Course map' : 'Challenge picker' }}</h3>
          <details v-for="group in groups" :key="group.title" :open="groups.length === 1 || group.lessons.some(l => l.id === selected)">
            <summary>{{ group.title }} <small>{{ group.lessons.filter(l => l.state === 'done').length }}/{{ group.lessons.length }}</small></summary>
            <button v-for="item in group.lessons" :key="item.id" :data-state="item.state"
              :aria-current="selected === item.id ? 'step' : undefined" :disabled="busy || item.state === 'locked'"
              @click="emit('select', item.id)">
              <Check v-if="item.state === 'done'" /><LockKeyhole v-else-if="item.state === 'locked'" /><span v-else>○</span>
              {{ item.goal }}<span class="sr-only"> · {{ item.state }}</span>
            </button>
          </details>
        </nav>
      </template>
      <template v-else-if="tab === 'hints'">
        <h2>Hints</h2><pre v-for="(hint, i) in hints.slice(0, rung)" :key="i">{{ hint }}</pre>
        <button v-if="rung < hints.length" :disabled="busy" @click="emit('hint')">Show hint {{ rung + 1 }} of {{ hints.length }}</button>
        <p v-if="!hints.length">This lesson has no hints.</p>
      </template>
      <ApiReference v-else-if="tab === 'api'" :entries="entries" :types="types" />
      <slot v-else name="console"><pre v-if="logs?.length">{{ logs.join('\n') }}</pre><p v-else>No output yet.</p></slot>
    </section>
  </aside>
</template>

<style scoped>
.clock-strip { display: flex; list-style: none; padding: 0; gap: 4px; }
.clock-strip li { flex: 1; font-size: 12px; background: var(--surface-raised); padding: 5px; }
.clock-strip b { display: block; color: var(--gold); }
.side-drawer { inset: 0 0 0 auto; width: min(360px, 40%); max-height: 100%; z-index: 5; border: 0; border-left: 1px solid var(--line-strong); border-radius: 0; background: var(--panel); box-shadow: -8px 0 22px var(--shadow); user-select: text }
header { display: flex; justify-content: space-between; gap: 2px; padding: 6px !important; flex-wrap: wrap }
[role=tablist] { flex-wrap: wrap; gap: 0 }
header button { font-size: 12px; padding: 5px; background: transparent; border: none }
[aria-selected=true] { color: var(--gold); box-shadow: inset 0 -2px var(--gold) }
.sheet-content { min-height: 0; overflow: auto; padding: 16px; font-size: 14px }
h2, h3 { margin: 0 0 10px }
p, li { color: var(--soft); margin: 6px 0; line-height: 1.45 }
:deep(pre) { white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; background: var(--base); border-left: 2px solid var(--accent-line); font: 12px/1.5 var(--mono) }
.got-it { margin: 3px 0 12px }
nav { padding-top: 12px; border-top: 1px solid var(--line) }
summary { cursor: pointer; padding: 7px 0; font-weight: 600 }
summary small { color: var(--sub); font: 11px var(--mono) }
details button { display: flex; gap: 8px; align-items: center; text-align: left; width: 100%; background: transparent; padding: 7px; border: 0; font-size: 12px }
details button svg { width: 13px; height: 13px; flex: none }
details [aria-current=step] { color: var(--gold); background: var(--surface-raised) }
details [data-state=done] svg { color: var(--mint) }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%) }
@media (max-width: 780px) { .side-drawer { inset: auto 0 0; width: 100%; max-height: 75%; border-top: 1px solid var(--line-strong) } }
</style>
