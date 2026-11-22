import type { Ref, InjectionKey } from 'vue'
import type { Files } from '@inherit/sim/pack'
type Read<T> = Readonly<Ref<T>>
export interface EditorSession {
  id: string
  label: string
  files: Read<Files>
  deployed: Read<Files>
  activeFile: Ref<string>
  api: Read<string>
  dirty: Read<boolean>
  multiFile: Read<boolean>
  navigation: Read<{file: string; line: number}>
  call: Read<{file: string; line: number} | undefined>
  tickCalls: Read<readonly { file: string; line: number }[]>
  watching: Read<boolean>
  error: Read<string>
  placeFunctions?: readonly string[]
  places?: Read<string[]>
  traces?: Read<Record<string, {file: string; line: number}[]>>
  callsToMove?: Read<{name: string; place?: string}[] | undefined>
  setFile(file: string, code: string): void
  openFile(file: string): void
}
export const editorKey: InjectionKey<EditorSession> = Symbol('editor')
