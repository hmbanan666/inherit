<script setup lang="ts">
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { defineWorkshopTheme } from '../lib/workshopTheme'
import { createLineHighlight } from '../lib/line-highlight'
import type { PlainError } from '@inherit/sandbox/pack'
import type { Starter } from '@inherit/sim/pack'
import { SuggestAdapter } from 'monaco-editor/esm/vs/language/typescript/tsMode.js'
import { editorKey, rankApiSuggestions } from '../lib/editor'
import { FileSearch, FolderSearch, X } from '@lucide/vue'

const game = inject(editorKey)!
const { files, activeFile, deployed, multiFile, api, dirty } = game
const props = defineProps<{
  diagnostic?: PlainError
  starter?: Starter
  ids?: string[]
  selected?: string
  code?: string
}>()
const emit = defineEmits<{ hint: []; reference: []; ready: []; focusIds: [string[]]; edit: [string] }>()
const host = ref<HTMLElement>()
const shellTabs = shallowRef<HTMLElement>()
const input = ref<HTMLInputElement>()
const tabs = ref<string[]>([])
const otherTabs = computed(() =>
  shellTabs.value ? tabs.value.filter((file) => file !== activeFile.value) : tabs.value,
)
const mode = ref<'open' | 'search'>()
const query = ref('')
const models = new Map<string, monaco.editor.ITextModel>()
const views = new Map<string, monaco.editor.ICodeEditorViewState | null>()
let editor: monaco.editor.IStandaloneCodeEditor | undefined
let opener: monaco.IDisposable
const prefix = '/packs/' + game.id + '/'
const libraryUri = monaco.Uri.file(prefix + 'api.d.ts')
let library: monaco.IDisposable
let settingSource = false
let rankedSuggestions: monaco.IDisposable
let suggestions: monaco.IDisposable
let lineLight: monaco.editor.IEditorDecorationsCollection | undefined
let tickMarks: monaco.editor.IEditorDecorationsCollection | undefined
const highlight = createLineHighlight(line => {
  if (!line || !editor) {
    lineLight?.clear()
    return
  }
  if (game.watching.value) open(line.file)
  lineLight?.set([{
    range: new monaco.Range(line.line, 1, line.line, 1),
    options: { isWholeLine: true, className: 'machine-line' },
  }])
  if (game.watching.value) editor.revealLineInCenterIfOutsideViewport(line.line)
})

let placeholder: monaco.editor.IEditorDecorationsCollection | undefined
function showPlaceholder() {
  const starter = props.starter
  const model = editor?.getModel()
  const isStarter = !!starter?.placeholder && files.value[activeFile.value] === starter.files[activeFile.value]
  editor?.updateOptions({ renderValidationDecorations: isStarter ? 'off' : 'on' })
  if (!starter?.placeholder || !model || props.diagnostic || activeFile.value !== starter.edit.file) {
    placeholder?.clear()
    return
  }
  const { file, line, column = 1 } = starter.edit
  const untouched = line <= model.getLineCount() && model.getLineContent(line) === starter.files[file].split('\n')[line - 1]
  placeholder?.set(untouched ? [{
    range: new monaco.Range(line, column, line, column),
    options: { showIfCollapsed: true, after: { content: starter.placeholder, inlineClassName: 'edit-placeholder' } },
  }] : [])
}

function markTickLines() {
  if (!tickMarks) return
  const file = activeFile.value
  const lines = new Set<number>()
  if (!game.watching.value && files.value[file] === deployed.value[file]) {
    for (const call of game.tickCalls.value) {
      if (call.file === file) lines.add(call.line)
    }
  }
  const ranges = tickMarks.getRanges()
  if (ranges.length === lines.size && ranges.every(range => lines.has(range.startLineNumber))) return
  tickMarks.set(Array.from(lines, line => ({
    range: new monaco.Range(line, 1, line, 1),
    options: { linesDecorationsClassName: 'live-tick-line' },
  })))
}

function lightCall() {
  const call = game.call.value
  if (call) {
    const matchesDraft = activeFile.value === call.file && files.value[call.file] === deployed.value[call.file]
    if (!models.has(call.file) || (!game.watching.value && !matchesDraft)) {
      highlight.reset()
      return
    }
  }
  highlight.show(call)
}

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
      const next = monaco.editor.createModel(code, 'typescript', monaco.Uri.file(prefix + file))
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
  if (old) views.set(old.uri.path.slice(prefix.length), editor.saveViewState())
  tabs.value = [file]
  highlight.reset()
  tickMarks?.clear()
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

const results = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const hits: { file: string; line: number; text?: string; column: number }[] = []
  for (const file of Object.keys(files.value).sort()) {
    if (!multiFile.value && file !== 'main.ts') continue
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
let errorZone: string | undefined
let errorMarks: monaco.editor.IEditorDecorationsCollection | undefined
const feedback = ref<HTMLElement>()
const feedbackTop = ref(0)
let zoneResize: ResizeObserver | undefined
function runtimeMarker() {
  if (!editor) return
  zoneResize?.disconnect()
  errorMarks?.clear()
  const issue = props.diagnostic
  if (issue && models.has(issue.file)) open(issue.file)
  const model = editor.getModel()
  editor.changeViewZones(access => {
    if (errorZone) access.removeZone(errorZone)
    errorZone = undefined
    if (!issue || !model || !feedback.value) return
    const from = model.getPositionAt(issue.mark.from)
    const to = model.getPositionAt(issue.mark.to)
    errorMarks?.set([
      { range: monaco.Range.fromPositions(from, to), options: { inlineClassName: 'error-token', hoverMessage: { value: issue.body } } },
      { range: new monaco.Range(issue.line, 1, issue.line, 1), options: { isWholeLine: true, className: 'error-line' } },
    ])
    // Reserve space in Monaco and keep the interactive feedback in the accessible editor shell.
    const zone = {
      afterLineNumber: issue.line, heightInPx: feedback.value.offsetHeight,
      domNode: document.createElement('div'),
      onDomNodeTop(top: number) { feedbackTop.value = top },
    }
    errorZone = access.addZone(zone)
    zoneResize = new ResizeObserver(() => {
      if (!errorZone || !feedback.value) return
      zone.heightInPx = feedback.value.offsetHeight
      editor?.changeViewZones(update => update.layoutZone(errorZone!))
    })
    zoneResize.observe(feedback.value)
  })
  if (issue) editor.revealLineInCenter(issue.line)
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
  ts.typescriptDefaults.setModeConfiguration({ ...ts.typescriptDefaults.modeConfiguration, completionItems: false })
  const adapter = new SuggestAdapter(async (...uris) => (await ts.getTypeScriptWorker())(...uris))
  rankedSuggestions = monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: adapter.triggerCharacters,
    async provideCompletionItems(...args) {
      const result = await adapter.provideCompletionItems(...args)
      if (result) rankApiSuggestions(result.suggestions, game.apiNames.value)
      return result
    },
    resolveCompletionItem: adapter.resolveCompletionItem!.bind(adapter),
  })
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
    readOnly: game.readOnly?.value ?? false,
    wordBasedSuggestions: 'off',
    autoClosingBrackets: 'never',
    acceptSuggestionOnEnter: 'on',
    suggestSelection: 'first',
    theme: 'foundry',
    gotoLocation: { multipleReferences: 'peek' },
    automaticLayout: true,
    wordWrap: 'on',
    wrappingIndent: 'same',
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
    ariaLabel: game.label,
  })
  errorMarks = editor.createDecorationsCollection()
  placeholder = editor.createDecorationsCollection()
  lineLight = editor.createDecorationsCollection()
  tickMarks = editor.createDecorationsCollection()
  suggestions = monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['"', "'"],
    provideCompletionItems(model, pos) {
      const prefix = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1)
      const match = /\b([a-zA-Z_$][\w$]*)\s*\(\s*(["'])([^"']*)$/.exec(prefix)
      if (!match || !game.placeFunctions?.includes(match[1]!)) return { suggestions: [] }
      const suffix = model.getLineContent(pos.lineNumber).slice(pos.column - 1)
      const end = suffix.indexOf(match[2]!)
      const range = new monaco.Range(pos.lineNumber, pos.column - match[3]!.length, pos.lineNumber, pos.column + Math.max(0, end))
      return { suggestions: (game.places?.value ?? []).map(name => ({
        label: name, insertText: name, kind: monaco.languages.CompletionItemKind.Value, range,
      })) }
    },
  })
  editor.onMouseMove(({ target }) => {
    const pos = target.position
    const line = pos && editor?.getModel()?.getLineContent(pos.lineNumber)
    const place = line && [...line.matchAll(/(["'])([^"']+)\1/g)].find(m =>
      pos!.column > m.index! && pos!.column <= m.index! + m[0].length && game.places?.value.includes(m[2]!))
    emit('focusIds', place ? [place[2]!] : [])
  })
  editor.onMouseLeave(() => emit('focusIds', []))
  editor.onMouseDown(({ target }) => {
    if (!target.position || target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) return
    const file = activeFile.value
    if (files.value[file] !== deployed.value[file]) return
    const line = target.position.lineNumber
    emit('focusIds', Object.keys(game.traces?.value ?? {}).filter(id =>
      game.traces?.value[id]?.some(site => site.file === file && site.line === line),
    ))
  })
  const dock = host.value?.closest<HTMLElement>('.editor-dock')
  const fitContent = () => dock?.style.setProperty('--source-height', Math.max(115, editor!.getContentHeight()) + 'px')
  editor.onDidChangeCursorPosition(event => {
    if (!game.cursor) return
    game.cursor.value = { line: event.position.lineNumber, column: event.position.column }
  })
  const caret = editor.getPosition()
  if (game.cursor && caret) game.cursor.value = { line: caret.lineNumber, column: caret.column }
  editor.onDidContentSizeChange(fitContent)
  fitContent()
  syncFiles()
  runtimeMarker()
  // Navigation can arrive before the lazy editor mounts.
  const initial = game.navigation.value
  revealLine(initial.file, initial.line, initial.column)
  showPlaceholder()
  lightCall()
  markTickLines()
  opener = monaco.editor.registerEditorOpener({
    openCodeEditor(source, resource, pos) {
      if (source !== editor) return false
      if (resource.toString() === libraryUri.toString()) {
        emit('reference')
        return true
      }
      const file = resource.path.slice(prefix.length)
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
watch([game.tickCalls, game.watching, activeFile, files, deployed], markTickLines, { flush: 'post' })
watch([game.call, activeFile, files, deployed], lightCall, { flush: 'post' })
watch(files, syncFiles)
watch(activeFile, display)
watch([files, activeFile, () => props.starter, () => props.diagnostic], showPlaceholder, { flush: 'post' })
watch(game.navigation, ({ file, line, column }) => revealLine(file, line, column), { flush: 'post' })
watch(() => game.readOnly?.value, value => editor?.updateOptions({ readOnly: !!value }))
watch(api, updateLibrary)
watch(() => props.diagnostic, runtimeMarker, { flush: 'post' })
onBeforeUnmount(() => {
  window.removeEventListener('keydown', keys, true)
  zoneResize?.disconnect()
  rankedSuggestions?.dispose()
  suggestions?.dispose()
  highlight.reset()
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
      <nav v-if="multiFile" class="project-tabs" aria-label="Open files">
        <span v-for="file in otherTabs" :key="file" class="tab" :class="{ chosen: activeFile === file }">
          <button
            :aria-label="file"
            :aria-current="activeFile === file ? 'page' : undefined"
            @click="shellTabs ? game.openFile(file) : open(file)"
          >
            {{ file
            }}<i v-if="files[file] !== deployed[file]" title="Undeployed edits"> ●</i>
          </button>
          <button v-if="file !== 'main.ts'" :aria-label="'Close ' + file" @click="close(file)">
            <X :size="11" />
          </button>
        </span>
        <span class="space" />
        <slot name="actions" />
        <template v-if="multiFile">
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
    <div class="code-viewport">
      <div ref="host" class="code-editor" />
      <aside v-if="diagnostic" ref="feedback" class="line-feedback" role="alert" :style="{ top: feedbackTop + 'px' }">
        <strong>{{ diagnostic.title }}</strong><p>{{ diagnostic.body }}</p>
        <button @click="emit('hint')">Hint</button>
        <details><summary>Technical details</summary>{{ diagnostic.raw }}</details>
      </aside>
    </div>
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
  top: var(--editor-header, 30px);
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
.code-viewport { position: relative; display: flex; flex: 1; min-height: 0; overflow: hidden }
.line-feedback { position: absolute; z-index: 3; left: 0; right: 0 }
.code-editor {
  position: relative;
  inset: auto;
  height: auto;
  min-height: 0;
  flex: 1;
}
</style>
