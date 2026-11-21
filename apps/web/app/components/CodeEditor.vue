<script setup lang="ts">
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { defineWorkshopTheme } from '../lib/workshopTheme'
import { useGame } from '../lib/useGame'
import { FileSearch, FolderSearch, X } from '@lucide/vue'

const game = useGame()
const { files, activeFile, campaign, surface, api, dirty } = game
const props = defineProps<{
  ids?: string[]
  selected?: string
  error?: string
  code?: string
}>()
const emit = defineEmits<{ reference: []; ready: []; focusIds: [string[]]; edit: [string] }>()
const host = ref<HTMLElement>()
const shellTabs = shallowRef<HTMLElement>()
const input = ref<HTMLInputElement>()
const tabs = ref(['main.ts'])
const otherTabs = computed(() =>
  shellTabs.value ? tabs.value.filter((file) => file !== activeFile.value) : tabs.value,
)
const mode = ref<'open' | 'search'>()
const query = ref('')
const models = new Map<string, monaco.editor.ITextModel>()
const views = new Map<string, monaco.editor.ICodeEditorViewState | null>()
let editor: monaco.editor.IStandaloneCodeEditor | undefined
let opener: monaco.IDisposable
const libraryUri = monaco.Uri.file('/api.d.ts')
let library: monaco.IDisposable
let settingSource = false

function syncFiles() {
  if (!editor) return
  for (const [file, code] of Object.entries(files.value)) {
    const model = models.get(file)
    if (model) {
      if (model.getValue() !== code) {
        settingSource = true
        try {
          model.setValue(code)
        } finally {
          settingSource = false
        }
      }
    } else {
      const next = monaco.editor.createModel(code, 'typescript', monaco.Uri.file('/' + file))
      models.set(file, next)
      next.onDidChangeContent(() => {
        if (!settingSource) game.setFile(file, next.getValue())
      })
    }
  }
  for (const [file, model] of models) {
    if (Object.hasOwn(files.value, file)) continue
    if (editor.getModel() === model) editor.setModel(null)
    models.delete(file)
    views.delete(file)
    model.dispose()
  }
  tabs.value = tabs.value.filter((file) => models.has(file))
  if (!models.has(activeFile.value)) activeFile.value = 'main.ts'
  display()
}
function display() {
  if (!editor) return
  const file = activeFile.value
  const model = models.get(file)
  if (!model || editor.getModel() === model) return
  const old = editor.getModel()
  if (old) views.set(old.uri.path.slice(1), editor.saveViewState())
  if (!tabs.value.includes(file)) tabs.value.push(file)
  editor.setModel(model)
  editor.restoreViewState(views.get(file) ?? null)
}
function open(file: string) {
  activeFile.value = file
  display()
}
function close(file: string) {
  const index = tabs.value.indexOf(file)
  tabs.value.splice(index, 1)
  if (activeFile.value === file) open(tabs.value[Math.max(0, index - 1)] ?? 'main.ts')
}
function revealLine(file: string, line: number, column = 1) {
  if (!Object.hasOwn(files.value, file)) return
  if (!models.has(file)) syncFiles()
  open(file)
  mode.value = undefined
  editor?.setPosition({ lineNumber: line, column })
  editor?.revealLineInCenterIfOutsideViewport(line)
  editor?.focus()
}
defineExpose({ revealLine })

const results = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const hits: { file: string; line: number; text?: string; column: number }[] = []
  for (const file of Object.keys(files.value).sort()) {
    if (!surface.value.multiFile && file !== 'main.ts') continue
    if (mode.value === 'open') {
      if (file.toLowerCase().includes(needle)) hits.push({ file, line: 1, column: 1 })
    } else if (needle) {
      for (const [i, text] of files.value[file]!.split('\n').entries()) {
        const offset = text.toLowerCase().indexOf(needle)
        if (offset >= 0) hits.push({ file, line: i + 1, text: text.trim(), column: offset + 1 })
      }
    }
  }
  return hits
})
function choose(hit = results.value[0]) {
  if (hit) revealLine(hit.file, hit.line, hit.column)
}
function dismissSearch() {
  mode.value = undefined
  editor?.focus()
}
function find(next: 'open' | 'search') {
  function showFinder() {
    mode.value = next
    query.value = ''
    nextTick(() => input.value?.focus())
  }
  if (shellTabs.value && !host.value?.getClientRects().length) {
    game.openFile(activeFile.value)
    // The dock reveals the requested line on its next render.
    requestAnimationFrame(showFinder)
  } else showFinder()
}
function keys(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return
  const key = e.key.toLowerCase()
  if (!(key === 'p' && !e.shiftKey) && !(key === 'f' && e.shiftKey)) return
  e.preventDefault()
  e.stopPropagation()
  find(key === 'p' ? 'open' : 'search')
}
function runtimeMarker() {
  const message = props.error ?? game.error.value
  const match = /([\w./-]+\.ts):(\d+)/.exec(message)
  for (const [file, model] of models) {
    const line = Number(match?.[2])
    const live = files.value[file] === campaign.value.project.deployed[file]
    monaco.editor.setModelMarkers(
      model,
      'factory-runtime',
      live && match?.[1] === file && line > 0 && line <= model.getLineCount()
        ? [
            {
              severity: monaco.MarkerSeverity.Error,
              message,
              source: 'Factory runtime',
              startLineNumber: line,
              endLineNumber: line,
              startColumn: 1,
              endColumn: model.getLineMaxColumn(line),
            },
          ]
        : [],
    )
  }
}
function updateLibrary(text: string) {
  library?.dispose()
  library = monaco.languages.typescript.typescriptDefaults.addExtraLib(text, libraryUri.toString())
  // A definition lookup can also materialize a model from the extra library.
  monaco.editor.getModel(libraryUri)?.setValue(text)
}

onMounted(() => {
  // The shell already shows the active file and API. Add the other open files to that strip.
  shellTabs.value = host.value?.closest('.editor-dock')?.querySelector<HTMLElement>('.file-tabs') ?? undefined
  self.MonacoEnvironment = {
    getWorker: (_, label) =>
      label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker(),
  }
  const ts = monaco.languages.typescript
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    strict: true,
    lib: ['lib.es2020.d.ts'],
    noEmit: true,
    allowImportingTsExtensions: true,
  })
  ts.typescriptDefaults.setEagerModelSync(true)
  updateLibrary(api.value)
  defineWorkshopTheme(host.value!)
  editor = monaco.editor.create(host.value!, {
    model: null,
    theme: 'foundry',
    gotoLocation: { multipleReferences: 'peek' },
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 13,
    lineHeight: 23,
    padding: { top: 16, bottom: 12 },
    scrollBeyondLastLine: false,
    lineNumbersMinChars: 3,
    folding: false,
    glyphMargin: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: 'line',
    tabSize: 2,
    fixedOverflowWidgets: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    ariaLabel: 'Factory controller TypeScript',
  })
  editor.onMouseDown(({ target }) => {
    if (!target.position || target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) return
    const file = activeFile.value
    if (files.value[file] !== campaign.value.project.deployed[file]) return
    const line = target.position.lineNumber
    emit('focusIds', Object.keys(game.traces.value).filter(id =>
      game.traces.value[id]?.some(site => site.file === file && site.line === line),
    ))
  })
  syncFiles()
  // Ask the same compiler that checks the player's editor whether main.ts exports a callable onTick.
  const probe = monaco.Uri.file('/.onboarding/check.ts')
  const main = monaco.Uri.file('/main.ts')
  watch([files, () => campaign.value.town.beat === 1 && game.lessonStep.value <= 2], ([, needed], _, onCleanup) => {
    if (!needed) {
      game.draftExportsOnTick.value = false
      return
    }
    const check = ts.typescriptDefaults.addExtraLib(
      'import { onTick } from "../main"; const handler: (...args: never[]) => unknown = onTick', probe.toString(),
    )
    let stale = false
    const timer = setTimeout(async () => {
      try {
        const getWorker = await ts.getTypeScriptWorker()
        const worker = await getWorker(main, probe)
        const diagnostics = await Promise.all([
          worker.getSyntacticDiagnostics(main.toString()),
          worker.getSemanticDiagnostics(main.toString()),
          worker.getSemanticDiagnostics(probe.toString()),
        ])
        if (!stale) game.draftExportsOnTick.value = diagnostics.every(list => list.length === 0)
      } catch {
        // The language worker may be restarting as the editor closes.
        if (!stale) game.draftExportsOnTick.value = false
      }
    }, 150)
    onCleanup(() => {
      stale = true
      clearTimeout(timer)
      check.dispose()
    })
  }, { immediate: true })
  runtimeMarker()
  opener = monaco.editor.registerEditorOpener({
    openCodeEditor(source, resource, pos) {
      if (source !== editor) return false
      if (resource.toString() === libraryUri.toString()) {
        emit('reference')
        return true
      }
      const file = resource.path.slice(1)
      if (!models.has(file)) return false
      revealLine(
        file,
        pos && 'lineNumber' in pos ? pos.lineNumber : (pos?.startLineNumber ?? 1),
        pos && 'column' in pos ? pos.column : (pos?.startColumn ?? 1),
      )
      return true
    },
  })
  window.addEventListener('keydown', keys, true)
  emit('ready')
})
watch(files, syncFiles)
watch(activeFile, display)
watch(api, updateLibrary)
watch([() => props.error ?? game.error.value, files], runtimeMarker)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', keys, true)
  opener?.dispose()
  editor?.dispose()
  for (const model of models.values()) model.dispose()
  library?.dispose()
  monaco.editor.getModel(libraryUri)?.dispose()
})
</script>
<template>
  <section class="project-editor" aria-label="Controller files">
    <Teleport :to="shellTabs ?? 'body'" :disabled="!shellTabs">
      <nav v-if="!shellTabs || surface.multiFile" class="project-tabs" aria-label="Open files">
        <span v-for="file in otherTabs" :key="file" class="tab" :class="{ chosen: activeFile === file }">
          <button
            :aria-label="file"
            :aria-current="activeFile === file ? 'page' : undefined"
            @click="shellTabs ? game.openFile(file) : open(file)"
          >
            {{ file
            }}<i v-if="files[file] !== campaign.project.deployed[file]" title="Undeployed edits"> ●</i>
          </button>
          <button v-if="file !== 'main.ts'" :aria-label="'Close ' + file" @click="close(file)">
            <X :size="11" />
          </button>
        </span>
        <span class="space" />
        <span v-if="dirty && !shellTabs" class="draft" title="Working copy differs from the live program"
          >Draft</span
        >
        <template v-if="surface.multiFile">
          <button title="Quick open (Ctrl/Cmd+P)" aria-label="Quick open" @click="find('open')">
            <FolderSearch :size="14" />
          </button>
          <button title="Search files (Ctrl/Cmd+Shift+F)" aria-label="Search files" @click="find('search')">
            <FileSearch :size="14" />
          </button>
        </template>
        <button
          v-if="shellTabs && activeFile !== 'main.ts'"
          :aria-label="'Close ' + activeFile"
          @click="close(activeFile)"
        >
          <X :size="11" />
        </button>
      </nav>
    </Teleport>
    <div
      v-if="mode"
      class="finder bench"
      :class="{ docked: shellTabs }"
      @keydown.esc.stop="dismissSearch"
    >
      <div class="tools">
        <input
          ref="input"
          v-model="query"
          :aria-label="mode === 'open' ? 'Find file' : 'Search project'"
          :placeholder="mode === 'open' ? 'Find a file…' : 'Search all files…'"
          @keydown.enter.prevent="choose()"
        /><button
          aria-label="Close search"
          @click="dismissSearch"
        >
          ×
        </button>
      </div>
      <ul v-if="results.length" class="rows">
        <li v-for="hit in results.slice(0, 80)" :key="hit.file + ':' + hit.line">
          <button @click="choose(hit)">
            {{ hit.file }}<template v-if="hit.text !== undefined">:{{ hit.line }} · {{ hit.text }}</template>
          </button>
        </li>
      </ul>
      <p v-else-if="query" class="quiet">No matches.</p>
      <small v-if="results.length > 80">First 80 of {{ results.length }} matches</small>
    </div>
    <div ref="host" class="code-editor" />
  </section>
</template>
<style scoped src="../lib/devtools/panels.css"></style>
<style scoped>
.project-editor {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.project-tabs {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  flex: none;
  min-height: 29px;
  border-bottom: 1px solid var(--line);
  background: var(--base);
}
.project-tabs button {
  padding: 3px 7px;
  color: var(--sub);
  font:
    11px 'IBM Plex Mono',
    monospace;
  background: transparent;
  border: 0;
  cursor: pointer;
  white-space: nowrap;
}
.tab {
  display: flex;
}
.chosen {
  box-shadow: inset 0 -2px var(--gold);
  background: var(--surface-raised);
}
.tab i,
.draft {
  color: var(--gold);
  font-style: normal;
}
.space {
  flex: 1;
}
.draft {
  align-self: center;
  padding: 0 8px;
  font-size: 10px;
}
.finder {
  position: absolute;
  z-index: 3;
  top: 30px;
  left: 4px;
  right: 4px;
  max-height: 65%;
  border: 1px solid var(--line-strong);
  background: var(--panel);
  box-shadow: 0 4px 12px var(--shadow);
}
.finder.docked {
  top: 3px;
}
.finder input {
  flex: 1;
}
.finder .rows button {
  display: block;
  width: 100%;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.code-editor {
  position: relative;
  inset: auto;
  height: auto;
  min-height: 0;
  flex: 1;
}
</style>
