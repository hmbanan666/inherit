import type { Ref, InjectionKey } from 'vue'
import type { Files, Starter } from '@inherit/sim/pack'
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
  watching: Read<boolean>
  placeFunctions?: readonly string[]
  places?: Read<string[]>
  traces?: Read<Record<string, {file: string; line: number}[]>>
  setFile(file: string, code: string): void
  openFile(file: string): void
}
export const editorKey: InjectionKey<EditorSession> = Symbol('editor')

/** Keep the language service's candidates and resolution data, boosting in-scope game names. */
export function rankApiSuggestions(items: {label: string | {label: string}; sortText?: string}[], names: ReadonlySet<string>) {
  for (const item of items) {
    const label = typeof item.label === 'string' ? item.label : item.label.label
    if (names.has(label)) item.sortText = '0' + (item.sortText ?? label)
  }
}
