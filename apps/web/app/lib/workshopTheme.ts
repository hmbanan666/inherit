import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { language } from 'monaco-editor/esm/vs/basic-languages/typescript/typescript.js'

// The bundled grammar classifies function names as ordinary identifiers.
monaco.languages.setMonarchTokensProvider('typescript', {
  ...language,
  tokenizer: {
    ...language.tokenizer,
    common: [
      [/#?[a-z_$][\w$]*(?=\s*\()/, { cases: { '@keywords': 'keyword', '@default': 'function' } }],
      ...language.tokenizer.common,
    ],
  },
})

export function defineWorkshopTheme(host: HTMLElement) {
  const palette = getComputedStyle(host)
  function hex(variable: string, fallback: string) {
    const value = palette.getPropertyValue(variable).trim()
    if (/^#[0-9a-f]{6}$/i.test(value)) return value
    if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + [...value.slice(1)].map(c => c + c).join('')
    return fallback
  }
  const foreground = hex('--text', '#eeece5')
  monaco.editor.defineTheme('foundry', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: foreground.slice(1) },
      { token: 'identifier', foreground: foreground.slice(1) },
      { token: 'comment', foreground: hex('--syntax-comment', '#969aa4').slice(1), fontStyle: 'italic' },
      { token: 'keyword', foreground: hex('--syntax-keyword', '#dea9ed').slice(1) },
      { token: 'string', foreground: hex('--syntax-string', '#a4d8b4').slice(1) },
      { token: 'type.identifier', foreground: hex('--syntax-type', '#8bc9f2').slice(1) },
      { token: 'number', foreground: hex('--syntax-number', '#f6ad8f').slice(1) },
      { token: 'function', foreground: hex('--accent-soft', '#f5d792').slice(1) },
      { token: 'delimiter', foreground: hex('--sub', '#a7a7ac').slice(1) },
    ],
    colors: {
      'editor.foreground': foreground,
      'editor.background': hex('--surface-low', '#16171a'),
      'editorLineNumber.foreground': hex('--editor-muted', '#84858e'),
      'editorLineNumber.activeForeground': hex('--soft', '#cdccd0'),
      'editor.lineHighlightBackground': hex('--panel', '#1c1d21'),
      'editorCursor.foreground': hex('--gold', '#eabe50'),
      'editor.selectionBackground': hex('--accent-shadow', '#443b2b'),
      'editorIndentGuide.background1': hex('--line', '#393a41'),
      'editorWidget.background': hex('--surface-raised', '#25262b'),
      'editorGutter.background': hex('--surface-low', '#16171a'),
    },
  })
}
