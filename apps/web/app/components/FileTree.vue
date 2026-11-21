<script setup lang="ts">
import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Pencil, Trash2 } from '@lucide/vue'
import { useGame } from '../lib/useGame'
import { checkPath, inside, movePaths, treeRows } from '../lib/devtools/tree'

const game = useGame()
const { files, surface, activeFile } = game
const collapsed = ref(new Set<string>())
const paths = computed(() => Object.keys(files.value))
const rows = computed(() => treeRows(paths.value, collapsed.value))
const folders = computed(() => rows.value.filter((row) => row.folder).map((row) => row.path))
const selected = ref('main.ts')
const action = ref<'file' | 'folder' | 'rename' | 'delete'>()
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
  if (!folder) return game.openFile(path)
  if (collapsed.value.has(path)) collapsed.value.delete(path)
  else collapsed.value.add(path)
}
function begin(kind: NonNullable<typeof action.value>) {
  action.value = kind
  problem.value = ''
  const path = selected.value
  const parent = folders.value.includes(path) ? path + '/' : path.slice(0, path.lastIndexOf('/') + 1)
  target.value = kind === 'rename' ? path : parent
  nextTick(() => {
    field.value?.focus()
    if (kind === 'rename') field.value?.select()
  })
}
function submit() {
  const path = target.value.trim()
  const from = selected.value
  try {
    if (action.value === 'delete') {
      for (const file of paths.value.filter((file) => inside(file, from))) {
        if (!game.deleteFile(file)) throw new Error('Could not delete ' + file)
      }
      selected.value = 'main.ts'
    } else if (action.value === 'rename') {
      const moves = movePaths(from, path, paths.value)
      const moved: (readonly [string, string])[] = []
      for (const [old, next] of moves) {
        if (!game.renameFile(old, next)) {
          for (const [a, b] of moved.reverse()) game.renameFile(b, a)
          throw new Error('Could not move ' + old)
        }
        moved.push([old, next])
      }
      selected.value = path
      if (Object.hasOwn(files.value, path)) game.openFile(path)
    } else {
      const folder = action.value === 'folder'
      checkPath(path, folder, paths.value)
      const file = folder ? path + '/index.ts' : path
      if (folder) checkPath(file, false, paths.value)
      if (!game.createFile(file)) throw new Error('Could not create ' + file + '. Check the 32-file limit.')
      if (!folder) game.openFile(file)
      selected.value = path
    }
    for (const dir of [...collapsed.value]) if (inside(path, dir)) collapsed.value.delete(dir)
    action.value = undefined
  } catch (error) {
    problem.value = error instanceof Error ? error.message : String(error)
  }
}
</script>
<template>
  <section v-if="surface.multiFile" class="bench tree" aria-label="Project files">
    <div class="bar">
      <h3>Files</h3>
      <div class="tools">
        <button title="New file" aria-label="New file" @click="begin('file')"><FilePlus :size="13" /></button>
        <button title="New folder" aria-label="New folder" @click="begin('folder')">
          <FolderPlus :size="13" />
        </button>
        <button
          title="Rename selected"
          aria-label="Rename selected"
          :disabled="selected === 'main.ts'"
          @click="begin('rename')"
        >
          <Pencil :size="13" />
        </button>
        <button
          title="Delete selected"
          aria-label="Delete selected"
          :disabled="selected === 'main.ts'"
          @click="begin('delete')"
        >
          <Trash2 :size="13" />
        </button>
      </div>
    </div>
    <form v-if="action" @submit.prevent="submit">
      <span v-if="action === 'delete'"
        >Delete {{ selected }}{{ folders.includes(selected) ? ' and its files' : '' }}?</span
      >
      <input
        v-else
        ref="field"
        v-model="target"
        aria-label="Project path"
        :placeholder="action === 'folder' ? 'lib' : 'lib/feed.ts'"
        @keydown.esc="action = undefined"
      />
      <small v-if="action === 'folder'" class="quiet">Starts with an empty index.ts.</small>
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
