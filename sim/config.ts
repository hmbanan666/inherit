// Design targets in simulated minutes. Game data belongs to the site and quest catalog.
export const balance = {
  duration: { min: 0.15, max: 4 },
  maxDeadMinutes: 3,
  maxXpPlateauMinutes: 5,
  maxHoardRatio: 2,
  maxRunMinutes: 120,
  previousPlayerMinutes: 8,
  exemptions: {
    bram: 'Manual controls introduce mining, smelting and depot delivery.',
    ines: 'The tutorial practices Run. The same ingots can still be made by hand.',
  } as Record<string, string | undefined>,
  expected: {
    'shop/shortfall/furnace': 'The whole catalog opens on arrival. The starting purse cannot cover the hotter furnace.',
    'shop/shortfall/cpu': 'CPU is listed on arrival above the starting balance.',
    'shop/shortfall/cart+cpu+furnace+hopper': 'The starting purse covers one of the four conveniences on simultaneous offer.',
    'duration/harrow': 'The long ingot order keeps the pair hauling past the quest duration target.',
    'milestone/harrow': 'After prospect opens on Take, deliveries fill the order without another milestone.',
    'xp/tomas': 'Harrow pays no XP. Progress resumes when Tomas is paid.',
    'code/harrow': 'The hauler can fill the order from a visible vein without calling prospect().',
    'code/tomas': 'The pair already smelts and delivers ingots.',
    'code/pell': 'The same smelting loop makes the required fresh ingots.',
    'code/wen': 'Persistent machine tasks use no findPath calls and meet the path check unchanged.',
  } as Record<string, string>,
}
