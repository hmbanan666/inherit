<script setup lang="ts">
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import apiText from '@inherit/sim/api?raw'

const props = defineProps<{
  code: string
  selected: string
  error: string
  ids: string[]
  tab: 'controller' | 'api'
}>()
const emit = defineEmits<{ edit: [string]; focusIds: [string[]]; ready: [] }>()
const host = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor
let source: monaco.editor.ITextModel, library: monaco.editor.ITextModel
let highlights: monaco.editor.IEditorDecorationsCollection
let extra: monaco.IDisposable
const idPatterns = computed(
  () =>
    new Map(
      props.ids.map((id) => [
        id,
        new RegExp('(?<![\\w-])' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])'),
      ]),
    ),
)
function mentions(line: string, id: string) {
  return idPatterns.value.get(id)?.test(line)
}
function diagnostics() {
  if (!source) return
  const line = Number(/^controller\.ts:(\d+)/.exec(props.error)?.[1])
  monaco.editor.setModelMarkers(
    source,
    'factory-runtime',
    line && line <= source.getLineCount()
      ? [
          {
            severity: monaco.MarkerSeverity.Error,
            source: 'Factory runtime',
            message: props.error,
            startLineNumber: line,
            startColumn: source.getLineFirstNonWhitespaceColumn(line) || 1,
            endLineNumber: line,
            endColumn: source.getLineMaxColumn(line),
          },
        ]
      : [],
  )
}
function highlight() {
  if (!highlights || props.tab !== 'controller') return
  const ids = props.selected.split(' → ').filter(Boolean)
  highlights.set(
    source.getLinesContent().flatMap((line, i) =>
      ids.some((id) => mentions(line, id))
        ? [
            {
              range: new monaco.Range(i + 1, 1, i + 1, 1),
              options: { isWholeLine: true, className: 'machine-line' },
            },
          ]
        : [],
    ),
  )
}
onMounted(() => {
  self.MonacoEnvironment = {
    getWorker: (_, label) =>
      label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker(),
  }
  const ts = monaco.languages.typescript
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: true,
    noLib: false,
    lib: ['lib.es2020.d.ts'],
  })
  extra = ts.typescriptDefaults.addExtraLib(
    'declare module "inherit" {\n' + apiText + '\n}',
    'file:///inherit.d.ts',
  )
  monaco.editor.defineTheme('foundry', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '818982', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c99bd5' },
      { token: 'string', foreground: 'e2b879' },
      { token: 'type.identifier', foreground: '87bfb6' },
      { token: 'delimiter', foreground: '9da6a7' },
      { token: 'number', foreground: 'e7a675' },
      { token: 'identifier', foreground: 'd5d9d3' },
    ],
    colors: {
      'editor.background': '#1d2022',
      'editorLineNumber.foreground': '#737b7c',
      'editorLineNumber.activeForeground': '#d1d5cb',
      'editor.lineHighlightBackground': '#25292a',
      'editorCursor.foreground': '#efbf4d',
      'editor.selectionBackground': '#56533d',
      'editorIndentGuide.background1': '#343a3a',
      'editorWidget.background': '#24282a',
      'editorGutter.background': '#1d2022',
    },
  })
  source = monaco.editor.createModel(props.code, 'typescript', monaco.Uri.parse('file:///controller.ts'))
  library = monaco.editor.createModel(apiText, 'typescript', monaco.Uri.parse('file:///api.ts'))
  editor = monaco.editor.create(host.value!, {
    model: props.tab === 'controller' ? source : library,
    readOnly: props.tab === 'api',
    theme: 'foundry',
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
    renderLineHighlight: 'none',
    tabSize: 2,
    fixedOverflowWidgets: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    ariaLabel: 'Factory controller TypeScript editor',
  })
  highlights = editor.createDecorationsCollection()
  source.onDidChangeContent(() => {
    highlight()
    if (source.getValue() !== props.code) emit('edit', source.getValue())
  })
  let hovered: number | undefined
  function focusLine(line = editor.getPosition()?.lineNumber) {
    emit(
      'focusIds',
      props.tab === 'controller' && line
        ? props.ids.filter((id) => mentions(source.getLineContent(line), id))
        : [],
    )
  }
  editor.onMouseMove(({ target }) => {
    if (target.position?.lineNumber === hovered) return
    hovered = target.position?.lineNumber
    focusLine(hovered)
  })
  editor.onMouseLeave(() => {
    hovered = undefined
    focusLine()
  })
  editor.onDidChangeCursorPosition(({ position }) => focusLine(position.lineNumber))
  diagnostics()
  emit('ready')
  highlight()
})
watch(
  () => props.code,
  (v) => {
    if (source && source.getValue() !== v) source.setValue(v)
  },
)
watch(
  () => props.selected,
  () => {
    highlight()
    const first = highlights?.getRange(0)
    if (first && props.tab === 'controller') editor.revealLineInCenterIfOutsideViewport(first.startLineNumber)
  },
)
watch(() => props.error, diagnostics)
watch(
  () => props.tab,
  (v) => {
    if (!editor) return
    emit('focusIds', [])
    editor.setModel(v === 'controller' ? source : library)
    editor.updateOptions({ readOnly: v === 'api' })
    highlight()
  },
)
onBeforeUnmount(() => {
  editor?.dispose()
  source?.dispose()
  library?.dispose()
  extra?.dispose()
})
</script>
<template><div ref="host" class="code-editor" /></template>
