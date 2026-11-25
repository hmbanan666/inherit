export type GameOverlay =
  | { kind: 'none' }
  | { kind: 'journal' }
  | { kind: 'machines' }
  | { kind: 'shop' }
  | { kind: 'npc'; who: string }
  | { kind: 'api' }

export function openOverlay(current: GameOverlay, next: Exclude<GameOverlay, { kind: 'none' }>): GameOverlay {
  if (current.kind === next.kind && next.kind !== 'npc') return current
  return next
}

export function closeOverlay(current: GameOverlay): GameOverlay {
  return current.kind === 'none' ? current : { kind: 'none' }
}

export const overlayLabels = {
  journal: 'Journal',
  newRequest: 'Journal, new request',
  shop: 'Shop',
  now: 'Now',
  requests: 'Requests',
  done: 'Done',
  machines: 'Machines',
  emptyHistory: 'Nothing handed over yet.',
  tracker: 'Quest tracker',
  collapse: 'Collapse quest tracker',
  expand: 'Expand quest tracker',
  close: (title: string) => `Close ${title}`,
  more: (count: number) => `+${count} more`,
}
