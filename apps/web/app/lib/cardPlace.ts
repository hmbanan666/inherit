export function cardSide(machineCenterX: number | undefined, viewportWidth: number) {
  if (viewportWidth < 1100 || machineCenterX === undefined || !Number.isFinite(machineCenterX)) return 'center'
  return machineCenterX < viewportWidth / 2 ? 'right' : 'left'
}
