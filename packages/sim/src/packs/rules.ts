import type { Pack } from '../framework/pack'
// Discovery erases the world type. Each pack validates its world at this boundary.
export const packs = import.meta.glob<Pack<any, any>>('./*/pack.ts', { eager: true, import: 'default' })
export const playerSources = import.meta.glob<string>('./*/player.ts', { eager: true, query: '?raw', import: 'default' })
export function getPack(id: string) {
  const pack = packs['./' + id + '/pack.ts']
  if (!pack) throw new Error('Unknown pack.')
  return pack
}
