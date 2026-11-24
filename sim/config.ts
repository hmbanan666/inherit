// Design targets in simulated minutes. Game data belongs to the site and quest catalog.
// Human play time lives in ./human.ts. Those warnings are not this gate.
export const balance = {
  duration: { min: 0.15, max: 4 },
  maxDeadMinutes: 3,
  maxXpPlateauMinutes: 5,
  maxHoardRatio: 2,
  maxRunMinutes: 120,
  previousPlayerMinutes: 8,
  exemptions: {} as Record<string, string | undefined>,
  expected: {} as Record<string, string>,
}
