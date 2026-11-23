<script setup lang="ts">
import { ChevronDown, ChevronRight, FilePlus, Pencil, Trash2 } from '@lucide/vue'
import { checkPath, treeRows } from '../lib/devtools/tree'

const files = defineModel<Record<string, string>>('files', { required: true })
const activeFile = defineModel<string>('activeFile', { required: true })
const collapsed = ref(new Set<string>())
const paths = computed(() => Object.keys(files.value))
const rows = computed(() => treeRows(paths.value, collapsed.value))
const selected = ref(activeFile.value)
const action = ref<'file' | 'rename' | 'delete'>()
const target = ref('')
const field = ref<HTMLInputElement>()
const problem = ref('')
watch(activeFile, (file) => {
  selected.value = file
  action.value = undefined
})
function pick(path: string, folder: boolean) {
  selected.value = path
  action.value = undefined
  if (!folder) { activeFile.value = path; return }
  if (collapsed.value.has(path)) collapsed.value.delete(path)
  else collapsed.value.add(path)
}
function begin(kind: NonNullable<typeof action.value>) {
  action.value = kind
  problem.value = ''
  target.value = kind === 'rename' ? selected.value : 'lib/'
  nextTick(() => {
    field.value?.focus()
    if (kind === 'rename') field.value?.select()
  })
}
function submit() {
  const path = target.value.trim()
  const from = selected.value
  try {
    const next = { ...files.value }
    if (action.value === 'delete') {
      delete next[from]
      activeFile.value = 'main.ts'
    } else {
      if (!/^lib\/[^/]+$/.test(path)) throw new Error('Choose a file directly in lib/, like lib/helpers.ts.')
      checkPath(path, false, paths.value)
      if (action.value === 'file' && paths.value.length >= 32) throw new Error('The project has reached its 32-file limit.')
      next[path] = action.value === 'rename' ? next[from] : ''
      if (action.value === 'rename') delete next[from]
      activeFile.value = path
      collapsed.value.delete('lib')
    }
    files.value = next
    selected.value = activeFile.value
    action.value = undefined
  } catch (error) {
    problem.value = error instanceof Error ? error.message : String(error)
  }
}
</script>
<template>
  <section class="bench tree" aria-label="Project files">
    <div class="bar">
      <h3>Files</h3>
      <div class="tools">
        <button title="New file" aria-label="New file" @click="begin('file')"><FilePlus :size="13" /></button>
        <button
          title="Rename selected"
          aria-label="Rename selected"
          :disabled="!selected.startsWith('lib/')"
          @click="begin('rename')"
        >
          <Pencil :size="13" />
        </button>
        <button
          title="Delete selected"
          aria-label="Delete selected"
          :disabled="!selected.startsWith('lib/')"
          @click="begin('delete')"
        >
          <Trash2 :size="13" />
        </button>
      </div>
    </div>
    <form v-if="action" @submit.prevent="submit">
      <span v-if="action === 'delete'"
        >Delete {{ selected }}?</span
      >
      <input
        v-else
        ref="field"
        v-model="target"
        aria-label="Project path"
        placeholder="lib/helpers.ts"
        @keydown.esc="action = undefined"
      />
      <div class="tools">
        <button type="submit">
          {{ action === 'delete' ? 'Delete' : action === 'rename' ? 'Rename' : 'Create' }}</button
        ><button type="button" @click="action = undefined">Cancel</button>
      </div>
      <p v-if="problem" role="alert" class="bad">{{ problem }}</p>
    </form>
    <ul class="rows">
      <li v-for="row in rows" :key="row.path">
        <button
          :class="{ chosen: selected === row.path }"
          :style="{ paddingLeft: 4 + row.depth * 12 + 'px' }"
          :aria-expanded="row.folder ? !collapsed.has(row.path) : undefined"
          :aria-label="row.path"
          @click="pick(row.path, row.folder)"
        >
          <component
            :is="collapsed.has(row.path) ? ChevronRight : ChevronDown"
            v-if="row.folder"
            :size="12"
          /><small v-else>TS</small> {{ row.name }}
        </button>
      </li>
    </ul>
  </section>
</template>
<style scoped src="../lib/devtools/panels.css"></style>
<style scoped>
.tree {
  padding: 6px 8px;
  max-height: clamp(95px, 20vh, 180px);
}
.tree .rows {
  gap: 0;
}
.tree .rows button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  width: 100%;
  text-align: left;
  color: var(--soft);
  background: transparent;
  border: none;
  font:
    11px 'IBM Plex Mono',
    monospace;
  overflow-wrap: anywhere;
}
.tree .rows button.chosen {
  background: var(--accent-surface);
  color: var(--accent-soft);
}
.tree form {
  display: grid;
  gap: 5px;
}
.tree small {
  color: var(--accent-line);
}
</style>
