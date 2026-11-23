declare module 'monaco-editor/esm/vs/basic-languages/typescript/typescript.js' {
  export const language: import('monaco-editor/esm/vs/editor/editor.api').languages.IMonarchLanguage
}

declare module 'monaco-editor/esm/vs/language/typescript/tsMode.js' {
  import type { languages } from 'monaco-editor/esm/vs/editor/editor.api'
  export const SuggestAdapter: new (
    worker: Awaited<ReturnType<typeof languages.typescript.getTypeScriptWorker>>,
  ) => languages.CompletionItemProvider
}
