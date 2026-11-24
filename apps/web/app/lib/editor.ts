import type { Ref, InjectionKey } from 'vue'
export type Files = Record<string, string>
export interface Starter {
  placeholder?: string
  files: Files
  edit: { file: string; line: number; column?: number }
}
export interface PlainError {
  file: string
  line: number
  title: string
  body: string
  raw: string
  mark: { from: number; to: number }
}
type Read<T> = Readonly<Ref<T>>
export interface EditorSession {
  id: string
  label: string
  files: Read<Files>
  deployed: Read<Files>
  activeFile: Ref<string>
  api: Read<string>
  apiNames: Read<ReadonlySet<string>>
  dirty: Read<boolean>
  multiFile: Read<boolean>
  navigation: Read<Starter['edit']>
  call: Read<{file: string; line: number} | undefined>
  tickCalls: Read<readonly { file: string; line: number }[]>
  readOnly?: Read<boolean>
  canRun?: Read<boolean>
  runAt?(name: string, file: string, line: number): void
  watching: Read<boolean>
  placeFunctions?: readonly string[]
  places?: Read<string[]>
  traces?: Read<Record<string, {file: string; line: number}[]>>
  setFile(file: string, code: string): void
  openFile(file: string): void
  /** The factory footer reads the caret. Packs leave it unset. */
  cursor?: Ref<{ line: number; column: number }>
}
export const editorKey: InjectionKey<EditorSession> = Symbol('editor')

/** Keep the language service's candidates and resolution data, boosting in-scope game names. */
export function rankApiSuggestions(items: {label: string | {label: string}; sortText?: string}[], names: ReadonlySet<string>) {
  for (const item of items) {
    const label = typeof item.label === 'string' ? item.label : item.label.label
    if (names.has(label)) item.sortText = '0' + (item.sortText ?? label)
  }
}
