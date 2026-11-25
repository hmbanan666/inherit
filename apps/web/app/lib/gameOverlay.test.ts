import { expect, test } from 'vitest'
import { closeOverlay, openOverlay, type GameOverlay } from './gameOverlay'

test('opening a villager replaces the Journal', () => {
  const journal = openOverlay({ kind: 'none' }, { kind: 'journal' })
  expect(openOverlay(journal, { kind: 'npc', who: 'bram' })).toEqual({ kind: 'npc', who: 'bram' })
})

test('opening the API book replaces the Shop and closing leaves the field clear', () => {
  const shop = openOverlay({ kind: 'none' }, { kind: 'shop' })
  const api = openOverlay(shop, { kind: 'api' })
  expect(api).toEqual({ kind: 'api' })
  expect(closeOverlay(api)).toEqual({ kind: 'none' })
})

test('Machines replaces the Journal, stays single when reopened, and closes like Shop', () => {
  const machines = openOverlay({ kind: 'journal' }, { kind: 'machines' })
  expect(machines).toEqual({ kind: 'machines' })
  expect(openOverlay(machines, { kind: 'machines' })).toBe(machines)
  expect(openOverlay(machines, { kind: 'shop' })).toEqual({ kind: 'shop' })
  expect(closeOverlay(machines)).toEqual({ kind: 'none' })
})

test('the close transition used on restart clears every overlay', () => {
  const states: GameOverlay[] = [
    { kind: 'none' }, { kind: 'journal' }, { kind: 'shop' }, { kind: 'machines' }, { kind: 'npc', who: 'ines' }, { kind: 'api' },
  ]
  for (const state of states) expect(closeOverlay(state)).toEqual({ kind: 'none' })
})
