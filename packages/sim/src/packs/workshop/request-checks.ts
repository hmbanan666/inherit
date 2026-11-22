export interface RequestCheck {
  id: string
  text: string
  state: 'todo' | 'close' | 'done'
  progress?: [number, number]
}
