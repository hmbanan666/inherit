export interface Village { bubble: string }
export function initialWorld(): Village { return { bubble: '' } }
export function decodeWorld(value: unknown): Village {
  if (!value || typeof value !== 'object' || !('bubble' in value) || typeof value.bubble !== 'string') throw new Error('Invalid village save.')
  return { bubble: value.bubble }
}
