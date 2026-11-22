<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { Ghost } from './content'

/**
 * A small code field for the prototype. It draws what the production Monaco editor
 * would draw with injected text and decorations: a placeholder at the edit point,
 * a squiggle under the reported token and the line a watched call came from.
 */
const props = defineProps<{
  modelValue: string
  label: string
  readOnly?: boolean
  ghost?: Ghost
  mark?: { from: number; to: number }
  errorLine?: number
  activeLine?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const area = ref<HTMLTextAreaElement>()
const caret = ref(0)
const selecting = ref(false)
const focused = ref(false)

const keywords = new Set(['const', 'let', 'if', 'else', 'for', 'of', 'function', 'return', 'true', 'false', 'interface'])
const token = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([()[\]{};,.:=+\-*/<>!&|?])/g

function classes(code: string) {
  const kinds = new Array<string>(code.length).fill('')
  for (const match of code.matchAll(token)) {
    const [text, comment, string, number, word] = match
    const kind = comment ? 'comment' : string ? 'string' : number ? 'number'
      : word ? keywords.has(word) ? 'keyword' : /^\s*\(/.test(code.slice(match.index + text.length)) ? 'function' : 'name'
      : 'delimiter'
    kinds.fill(kind, match.index, match.index + text.length)
  }
  return kinds
}
const lineOf = (offset: number) => props.modelValue.slice(0, offset).split('\n').length
const ghostShown = computed(() => {
  const ghost = props.ghost
  if (!ghost || props.readOnly || selecting.value) return
  return !focused.value || lineOf(caret.value) !== lineOf(ghost.offset) || caret.value === ghost.offset ? ghost : undefined
})
const lines = computed(() => {
  const code = props.modelValue
  const kinds = classes(code)
  const ghost = ghostShown.value
  const rows: { spans: { text: string; kind: string; marked: boolean; ghost?: boolean }[] }[] = [{ spans: [] }]
  for (let i = 0; i <= code.length; i++) {
    const row = rows[rows.length - 1].spans
    if (ghost?.offset === i) row.push({ text: ghost.text, kind: 'ghost', marked: false, ghost: true })
    if (i === code.length) break
    if (code[i] === '\n') { rows.push({ spans: [] }); continue }
    const marked = !!props.mark && i >= props.mark.from && i < props.mark.to
    const last = row[row.length - 1]
    if (last && !last.ghost && last.kind === kinds[i] && last.marked === marked) last.text += code[i]
    else row.push({ text: code[i], kind: kinds[i], marked })
  }
  return rows
})
const caretLine = computed(() => focused.value && !props.readOnly ? lineOf(caret.value) : 0)

function track() {
  const el = area.value
  if (!el) return
  caret.value = el.selectionStart
  selecting.value = el.selectionStart !== el.selectionEnd
}
function insert(text: string, move = text.length, replaceFrom?: number, replaceTo?: number) {
  const el = area.value!
  const from = replaceFrom ?? el.selectionStart, to = replaceTo ?? el.selectionEnd
  el.setSelectionRange(from, to)
  // Keep the browser's undo stack where it is available.
  if (!document.execCommand('insertText', false, text)) el.setRangeText(text, from, to, 'end')
  el.setSelectionRange(from + move, from + move)
  emit('update:modelValue', el.value)
  track()
}
const pairs: Record<string, string> = { '(': ')', '"': '"' }
function key(event: KeyboardEvent) {
  const el = area.value!
  if (props.readOnly || event.ctrlKey || event.metaKey || event.altKey) return
  const at = el.selectionStart, collapsed = at === el.selectionEnd
  const before = el.value[at - 1] ?? '', after = el.value[at] ?? ''
  if (event.key === 'Tab') { event.preventDefault(); insert('  ') }
  else if (collapsed && (event.key === ')' || event.key === '"') && after === event.key) {
    event.preventDefault()
    el.setSelectionRange(at + 1, at + 1)
    track()
  } else if (collapsed && pairs[event.key] && (!after || /[\s)\]},;]/.test(after)) &&
    (event.key !== '"' || !/[\w"]/.test(before))) {
    event.preventDefault()
    insert(event.key + pairs[event.key], 1)
  } else if (collapsed && event.key === 'Backspace' && pairs[before] === after && after) {
    event.preventDefault()
    insert('', 0, at - 1, at + 1)
  }
}
function input() {
  emit('update:modelValue', area.value!.value)
  track()
}
async function focusAt(offset: number) {
  await nextTick()
  const el = area.value
  if (!el) return
  el.focus({ preventScroll: true })
  el.setSelectionRange(offset, offset)
  track()
}
defineExpose({ focusAt })
</script>

<template>
  <div class="proto-editor" :class="{ focused, locked: readOnly }" @click="area?.focus()">
    <div class="sheet">
      <div class="paint" aria-hidden="true">
        <div v-for="(row, index) in lines" :key="index" class="line"
          :class="{ error: errorLine === index + 1, active: activeLine === index + 1, current: caretLine === index + 1 }">
          <span v-for="(span, i) in row.spans" :key="i" :class="[span.kind, { marked: span.marked }]">{{ span.text }}</span>
          <br v-if="!row.spans.length">
        </div>
      </div>
      <textarea ref="area" :value="modelValue" :readonly="readOnly" :aria-label="label" data-testid="code"
        spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"
        @input="input" @keydown="key" @keyup="track" @click="track" @select="track"
        @focus="focused = true; track()" @blur="focused = false" />
    </div>
  </div>
</template>

<style scoped>
.proto-editor { height: 100%; overflow: auto; background: var(--surface-low); cursor: text; font: 16px/27px var(--mono); tab-size: 2 }
.sheet { position: relative; min-width: 100%; width: max-content; min-height: 100%; padding: 12px 0 }
.paint, textarea { margin: 0; font: inherit; letter-spacing: 0; white-space: pre; tab-size: 2 }
.paint { counter-reset: line; color: var(--text) }
.line, textarea { padding: 0 20px 0 58px }
.line { position: relative; min-height: 27px; counter-increment: line }
.line::before { content: counter(line); position: absolute; left: 0; width: 38px; text-align: right; color: var(--editor-muted); font-size: 13px }
.line.current { background: var(--panel) }
.line.current::before { color: var(--soft) }
.line.active { background: color-mix(in srgb, var(--gold) 13%, transparent); box-shadow: inset 2px 0 var(--gold) }
.line.error { background: var(--alert-surface); box-shadow: inset 2px 0 var(--alert) }
.line.error::before { color: var(--alert) }
textarea { position: absolute; inset: 12px 0; width: 100%; height: calc(100% - 24px); overflow: hidden; resize: none; border: 0; outline: 0; background: transparent; color: transparent; caret-color: var(--gold) }
textarea::selection { background: var(--accent-shadow); color: transparent }
.comment { color: var(--syntax-comment); font-style: italic }
.string { color: var(--syntax-string) }
.number { color: var(--syntax-number) }
.keyword { color: var(--syntax-keyword) }
.function { color: var(--accent-soft) }
.delimiter { color: var(--sub) }
.marked { text-decoration: underline wavy var(--alert); text-decoration-thickness: 1.5px; text-underline-offset: 5px }
.ghost { color: var(--editor-muted); font-style: italic; border-radius: 3px; background: color-mix(in srgb, var(--gold) 11%, transparent); box-shadow: 0 1px color-mix(in srgb, var(--gold) 55%, transparent) }
.locked { cursor: default }
</style>
