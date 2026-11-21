import type { BuildingId, BuildingState, TownSnapshot } from '@inherit/sim'
import { Paint } from './townPaint'
import { fir } from './townLandscape'

export const sites: Record<BuildingId, { x: number; y: number; scale: number }> = {
  'town-hall': { x: 412, y: 213, scale: 0.87 },
  bank: { x: 585, y: 222, scale: 0.88 },
  riverside: { x: 899, y: 257, scale: 0.9 },
  forge: { x: 119, y: 293, scale: 1.03 },
  mill: { x: 656, y: 289, scale: 0.99 },
  bakery: { x: 313, y: 312, scale: 1.02 },
  'lamp-street': { x: 489, y: 320, scale: 1 },
  bridge: { x: 808, y: 330, scale: 1.02 },
}
const ink = '#343c3d',
  wood = '#674d43',
  light = '#edd6a4',
  shade = '#685f57'
const slate = ['#475962', '#64757b', '#87918a'] as const
const tile = ['#895549', '#ad6852', '#d68c69'] as const
type Roof = readonly [string, string, string]

function stone(p: Paint, x: number, y: number, w: number, h: number) {
  p.box('#827c6e', x, y, w, h)
  for (let yy = 0; yy < h; yy += 5)
    for (let xx = 0; xx < w; xx += 11) {
      const a = xx + (yy % 2 ? 4 : 0)
      if (a < w - 3) p.line('#aaa18a', 1, x + a, y + yy + 1, x + Math.min(a + 8, w), y + yy + 1)
    }
}
function window(p: Paint, x: number, y: number, w: number, h: number, lit: boolean) {
  p.box(wood, x - 1.5, y - 1.5, w + 3, h + 4)
  p.box(lit ? '#ffc77b' : '#637c82', x, y, w, h)
  p.poly(lit ? '#ffe2a1' : '#96adb0', x, y, x + w * 0.6, y, x, y + h * 0.7)
  p.box(wood, x + w / 2 - 0.75, y, 1.5, h)
  p.box(wood, x, y + h * 0.48, w, 1.5)
  p.box(light, x - 3, y + h + 1, w + 6, 2)
}
function chimney(p: Paint, x: number, y: number, h: number) {
  p.box('#b88267', x, y, 11, h)
  p.box('#735c54', x + 7, y, 5, h)
  for (let dy = 3; dy < h; dy += 6) p.line('#d1a085', 1, x + 1, y + dy, x + 6, y + dy)
  p.box(wood, x - 2, y - 2, 16, 4)
  p.box('#bc9580', x - 2, y - 2, 15, 1.3)
}
// A long ridged roof with a gable facing left and a slate or clay-tiled sunward pitch.
function house(
  p: Paint,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch: number,
  wall: string,
  roof: Roof,
) {
  const eave = y - h,
    gable = x + w * 0.27
  p.poly(shade, x + w, y, x + w + 9, y - 5, x + w + 9, eave - 5, x + w, eave)
  p.box(wall, x, eave, w, h)
  p.poly(wall, x - 2, eave, gable, eave - pitch, x + w * 0.5, eave)
  p.poly(
    roof[0],
    gable,
    eave - pitch,
    x + w * 0.78,
    eave - pitch - 3,
    x + w + 12,
    eave - 5,
    x + w + 2,
    eave + 2,
    x + w * 0.52,
    eave + 2,
  )
  p.poly(
    roof[1],
    gable,
    eave - pitch + 1,
    x + w * 0.78,
    eave - pitch - 2,
    x + w + 8,
    eave - 6,
    x + w * 0.53,
    eave,
  )
  for (let i = 1; i < 5; i++) {
    const f = i / 5,
      xx = gable + w * 0.26 * f,
      yy = eave - pitch + pitch * f
    p.line(roof[0], 1, xx + 1, yy, xx + w * 0.5, yy - 3)
    for (let j = 1; j < 6; j++) {
      const sx = xx + (j + (i % 2) * 0.4) * w * 0.071
      p.line(roof[2], 0.8, sx, yy - 2, sx + 1.2, yy - 0.5)
    }
  }
  p.line(roof[2], 2, gable, eave - pitch, x + w * 0.78, eave - pitch - 3)
  p.line(wood, 3.6, x - 4, eave + 2, gable, eave - pitch, x + w * 0.52, eave + 1, x + w + 3, eave + 1)
  p.line(light, 1.1, x - 4, eave, gable, eave - pitch - 2)
  p.box(wood, x, eave + 4, 3, h - 4)
  p.box(wood, x + w - 4, eave + 3, 4, h - 3)
  stone(p, x, y - 5, w, 5)
}
function plaque(p: Paint, label: string, x: number, y: number, w: number, color = ink) {
  p.box(wood, x - w / 2 - 1, y - 10, w + 2, 14)
  p.box(color, x - w / 2, y - 9, w, 11)
  p.text(label, x, y, 'bold 8px monospace', '#ffdf9e')
}
function barrel(p: Paint, x: number, y: number) {
  p.oval(wood, x, y - 6, 6.8, 8)
  p.box('#957454', x - 5, y - 12, 10, 11)
  for (const yy of [-10, -4]) p.box(ink, x - 6, y + yy, 12, 1.5)
  p.oval('#c6a47a', x, y - 13, 5.5, 1.8)
}
function boards(p: Paint, x: number, y: number, w: number, h: number) {
  p.line(wood, 5, x, y, x + w, y + h)
  p.line('#bc9a72', 2, x, y - 1, x + w, y + h - 1)
  p.line('#9a7959', 4, x + w, y + 1, x, y + h)
  p.oval(ink, x + 2, y + 2, 0.9)
  p.oval(ink, x + w - 2, y + h - 2, 0.9)
}
function forge(p: Paint, live: boolean) {
  stone(p, 24, -100, 15, 70)
  p.box(ink, 22, -103, 19, 5)
  p.box('#a3725b', 25, -100, 5, 48)
  for (let y = -97; y < -59; y += 6) p.line('#cab098', 1, 25, y, 32, y)

  house(p, -55, 0, 95, 45, 25, '#b89878', slate)
  p.box('#5d504a', -50, -39, 35, 34)
  p.oval('#5d504a', -32.5, -39, 17.5, 13)
  p.box('#392f30', -46, -38, 27, 33)
  p.oval('#392f30', -32.5, -38, 13.5, 9)
  if (!live) boards(p, -44, -29, 24, 18)
  p.line(wood, 4, -4, -39, -4, -5)
  window(p, 5, -32, 17, 13, live)
  plaque(p, 'FORGE', -4, -47, 39)
  // Anvil horn, heel, foot and stump.
  p.box('#846044', -71, -10, 13, 10)
  p.poly(
    ink,
    -76,
    -22,
    -57,
    -22,
    -52,
    -19,
    -44,
    -20,
    -50,
    -15,
    -57,
    -14,
    -60,
    -10,
    -56,
    -9,
    -57,
    -7,
    -71,
    -7,
    -72,
    -9,
    -67,
    -11,
    -69,
    -16,
    -75,
    -17,
  )
  p.line('#a2a7a0', 1.6, -75, -22, -57, -22)
  // Open shoeing bay with a rack of fresh blanks.
  p.poly('#657278', 37, -40, 59, -35, 69, -26, 40, -28)
  p.line('#88908b', 1.5, 38, -40, 61, -35)
  p.line(wood, 3, 63, -27, 63, -2)
  p.box(wood, 40, -13, 23, 4)
  for (const x of [45, 52, 58]) {
    p.ctx.beginPath()
    p.ctx.arc(x, -16, 2.6, -0.25, Math.PI + 0.25)
    p.ctx.strokeStyle = live ? '#a7aa9c' : '#655e56'
    p.ctx.lineWidth = 1.6
    p.ctx.stroke()
  }
  barrel(p, 48, 0)
  for (let i = 0; i < 9; i++) p.oval('#494a48', -50 + i * 2.3, -3 - (i % 3), 3.8, 3.2)
}
function bakery(p: Paint, live: boolean, lit: boolean) {
  chimney(p, 16, -85, 32)
  house(p, -53, 0, 89, 55, 29, '#e1bc91', tile)
  p.line(wood, 3, -51, -37, 32, -37)
  window(p, -39, -46, 12, 14, lit)
  window(p, 8, -46, 13, 14, lit)
  p.box(wood, -36, -25, 19, 25)
  p.box('#a17760', -33, -22, 13, 20)
  p.oval(light, -22, -11, 1.1)
  p.box(wood, -5, -24, 35, 19)
  if (live) {
    p.box('#94644e', -10, -9, 49, 9)
    for (let j = 0; j < 7; j++) {
      p.poly(
        j % 2 ? '#ebd1a4' : '#ae604f',
        -11 + j * 7,
        -31,
        -4 + j * 7,
        -31,
        -1 + j * 7,
        -22,
        -8 + j * 7,
        -22,
      )
      p.box(j % 2 ? '#cbb58d' : '#925349', -8 + j * 7, -22, 7, 4)
    }
    for (let j = 0; j < 5; j++) {
      p.oval('#e6a355', -3 + j * 8, -11 - (j % 2), 4.8, 2.9)
      p.line('#ffda93', 1, -5 + j * 8, -12 - (j % 2), -3 + j * 8, -13 - (j % 2))
    }
  } else boards(p, -3, -21, 30, 14)
  // Projecting shop sign above the door, painted with a scored loaf.
  p.line(wood, 2.2, -53, -44, -66, -45, -66, -37)
  p.oval('#79523f', -65, -30, 9, 7)
  p.oval('#ecc380', -65, -30, 6, 3)
  p.line('#a6764b', 1, -66, -32, -68, -29)
  p.line('#a6764b', 1, -63, -32, -65, -29)
  plaque(p, 'BAKERY', -7, -57, 46, '#875244')
  barrel(p, 45, -1)
}
function civic(p: Paint, bank: boolean, lit: boolean, owed: number | undefined) {
  const wall = bank ? '#c7b697' : '#d4be99'
  if (!bank) {
    p.box(wood, -14, -118, 3, 28)
    p.poly('#bd6552', -12, -118, 7, -114, -2, -112, -12, -109)
  }
  house(p, -64, 0, 120, 50, 25, wall, bank ? slate : tile)
  for (const x of [-54, -32, 21, 41]) window(p, x, -35, 10, 19, lit)
  if (bank) {
    p.box(shade, -20, -43, 40, 39)
    p.poly('#d9c7a4', -27, -41, 0, -57, 29, -42, 26, -38, -25, -38)
    p.poly('#afa086', -17, -44, 0, -52, 16, -44)
    for (const x of [-20, 14]) {
      p.box('#9f9783', x, -38, 6, 34)
      p.box(light, x, -38, 2, 34)
    }
    for (const x of [-56, 48]) {
      p.box('#a29680', x, -41, 4, 37)
      p.box(light, x, -41, 1.3, 37)
      p.box('#b2a48a', x - 2, -41, 8, 2)
    }
    p.line('#a89a84', 1, -60, -7, 49, -7)
    plaque(p, 'BANK', 0, -30, 34)
    if (owed !== undefined) plaque(p, owed ? owed + ' OWED' : 'PAID', 0, -12, 52, '#513d32')
    p.box('#9e927d', -24, -3, 48, 3)
  } else {
    p.box('#dac19f', -26, -83, 26, 58)
    p.poly('#ae9b84', 0, -82, 8, -87, 8, -32, 0, -25)
    p.poly('#495c61', -32, -82, -12, -106, 10, -85, 4, -80)
    p.line('#bfc2ab', 2, -32, -83, -12, -105)
    p.oval(wood, -13, -69, 9.1)
    p.oval('#f0d89c', -13, -69, 7.6)
    p.line(ink, 1.5, -13, -75, -13, -69, -8, -68)
    plaque(p, 'TOWN HALL', -10, -30, 61)
    p.box(wood, -20, -25, 19, 24)
    p.line('#a38a70', 1, -10, -24, -10, -2)
  }
}
function mill(p: Paint, live: boolean, lit: boolean) {
  house(p, -46, 0, 75, 71, 32, '#d3ba8d', slate)
  for (const x of [-43, -18, 8]) {
    p.line(wood, 3, x, -64, x, -9)
    p.line(wood, 2, x, -48, x + 19, -65)
  }
  p.line(wood, 3, -45, -46, 26, -46)
  window(p, -34, -40, 13, 20, lit)
  window(p, -30, -84, 10, 10, lit)
  p.box(wood, -8, -27, 14, 26)
  plaque(p, 'MILL', 2, -49, 34)
  p.poly('#796954', 17, -4, 67, -20, 67, -15, 18, 2)
  for (const [x, y] of [
    [-52, -4],
    [-59, -2],
    [-56, -10],
  ]) {
    p.oval('#ae9572', x, y, 5.5, 5.4)
    p.oval('#d0bc99', x - 1, y - 1, 4, 4.2)
    p.line('#8e775b', 1.3, x - 2, y - 5, x + 2, y - 5)
  }
  if (!live) boards(p, 23, -22, 24, 16)
}
export function wheel(p: Paint, live: boolean) {
  p.oval('#454b47', 0, 0, 23, 23)
  p.oval('#a4815c', 0, 0, 20, 20)
  p.oval('#4d5550', 0, 0, 17, 17)
  for (let i = 0; i < 10; i++) {
    if (!live && (i === 2 || i === 3)) continue
    const a = (i * Math.PI) / 5,
      x = Math.cos(a),
      y = Math.sin(a)
    p.line('#bd966b', 3, 0, 0, x * 19, y * 19)
    p.line(wood, 4, x * 21 - y * 3, y * 21 + x * 3, x * 21 + y * 3, y * 21 - x * 3)
  }
  p.oval(ink, 0, 0, 5)
  p.oval('#d3ad76', -1, -1, 2)
}
export const lamps = [
  [-49, 0, 37],
  [-2, -5, 34],
  [40, -10, 31],
]
function street(p: Paint, live: boolean, dark: boolean) {
  p.oval('#71665052', -2, 3, 57, 5)
  for (const [x, y, h] of lamps) {
    p.box(ink, x - 3, y - 3, 7, 3)
    p.line(ink, 2.8, x, y - 2, x, y - h)
    p.line(light, 0.8, x - 1, y - 5, x - 1, y - h + 6)
    p.line(ink, 1.6, x, y - h + 4, x + 3, y - h + 8, x + 8, y - h + 2, x + 13, y - h + 2)
    p.poly(ink, x + 7, y - h + 2, x + 17, y - h + 2, x + 15, y - h + 11, x + 9, y - h + 11)
    p.poly(
      live && dark ? '#ffe4a0' : '#919285',
      x + 9,
      y - h + 4,
      x + 15,
      y - h + 4,
      x + 14,
      y - h + 9,
      x + 10,
      y - h + 9,
    )
    p.poly(ink, x + 6, y - h + 2, x + 12, y - h - 2, x + 18, y - h + 2)
    if (!live) p.line('#64594d', 1, x, y - h + 1, x + 3, y - h + 9, x + 1, y - h + 14)
  }
  p.box(wood, 3, -12, 38, 3)
  p.line(wood, 2.6, 8, -10, 7, -4)
  p.line(wood, 2.6, 35, -10, 36, -5)
}
function bridge(p: Paint, live: boolean) {
  const span = 60
  for (const x of [-52, 42]) {
    stone(p, x, -5, 10, 24)
    p.poly('#5f625a', x + 10, -5, x + 15, -9, x + 15, 14, x + 10, 19)
  }
  for (let x = -span; x < span; x += 6) {
    if (!live && x > -28 && x < 24) continue
    const y = -6 * Math.sin(((x + span) / (2 * span)) * Math.PI)
    p.poly('#d3a979', x, y, x + 6, y - 0.3, x + 12, y - 6, x + 6, y - 6)
    p.box('#80604a', x, y + 0.2, 6, 4)
    p.line('#9d7a5a', 0.8, x, y, x + 5, y - 5)
  }
  for (const x of [-57, -30, 0, 30, 57]) {
    if (!live && x === 0) continue
    const y = -6 * Math.cos((x / 120) * Math.PI)
    p.box('#685444', x, y - 16, 3.5, 19)
    p.box('#cfad83', x, y - 17, 3.5, 2)
  }
  for (const [a, b] of live
    ? [
        [-57, -30],
        [-30, 0],
        [0, 30],
        [30, 57],
      ]
    : [
        [-57, -30],
        [30, 57],
      ]) {
    p.line(
      '#84634d',
      3,
      a,
      -15 - 6 * Math.cos((a / 120) * Math.PI),
      b,
      -15 - 6 * Math.cos((b / 120) * Math.PI),
    )
  }
  if (!live) {
    p.line(wood, 3, -28, -3, -17, 10)
    p.line(wood, 2, 24, -4, 13, 5)
  }
}
function district(p: Paint, live: boolean, lit: boolean) {
  for (const [x, y, s] of [
    [-48, -16, 0.78],
    [12, -19, 0.93],
    [-12, 1, 0.93],
    [53, 0, 0.65],
  ]) {
    p.at(x, y, s, () => {
      chimney(p, 5, -53, 25)
      house(p, -23, 0, 44, 36, 22, live ? '#d6b991' : '#9f9f93', live ? tile : slate)
      window(p, -16, -25, 8, 12, lit && live)
      p.box(wood, 3, -18, 10, 16)
    })
  }
  fir(p, 70, -15, 44, '#47665d')
  if (!live) {
    const fog = p.ctx.createRadialGradient(0, -28, 6, 0, -28, 97)
    fog.addColorStop(0, '#bac1b5eb')
    fog.addColorStop(0.57, '#b9c1b4c4')
    fog.addColorStop(1, '#c1c6b900')
    p.ctx.fillStyle = fog
    p.ctx.fillRect(-98, -126, 196, 196)
  }
  p.box(wood, -2, -3, 3, 14)
  plaque(p, 'RIVERSIDE', 0, -2, 68)
}

export function drawBuilding(
  p: Paint,
  id: BuildingId,
  state: BuildingState,
  phase: TownSnapshot['phase'],
  owed: number | undefined,
) {
  const live = state === 'working',
    lit = phase === 'night' || phase === 'evening'
  if (id !== 'bridge') p.oval('#313d3938', 2, 1, id === 'riverside' ? 69 : 53, 6.5)
  switch (id) {
    case 'forge':
      forge(p, live)
      break
    case 'bakery':
      bakery(p, live, lit)
      break
    case 'town-hall':
      civic(p, false, lit, owed)
      break
    case 'bank':
      civic(p, true, lit, owed)
      break
    case 'mill':
      mill(p, live, lit)
      break
    case 'bridge':
      bridge(p, live)
      break
    case 'riverside':
      district(p, live, lit)
      break
    case 'lamp-street':
      street(p, live, lit)
      break
  }
  // Boarded entrances also work for snapshots with a closed civic building.
  if (state === 'broken' && (id === 'bank' || id === 'town-hall' || id === 'riverside'))
    boards(p, -16, -25, 24, 18)
  if (state === 'locked') {
    p.box(ink, -13, 1, 26, 14)
    p.ctx.beginPath()
    p.ctx.arc(0, 6, 3, Math.PI, 0)
    p.ctx.strokeStyle = light
    p.ctx.lineWidth = 1.7
    p.ctx.stroke()
    p.box(light, -4, 6, 8, 6)
  }
}

export function horse(p: Paint) {
  const brown = '#985d43',
    mane = '#513d36'
  p.oval(brown, 0, 0, 13, 6)
  p.poly(brown, 7, 2, 10, -13, 16, -15, 21, -9, 21, -6, 16, -6, 13, -8, 12, 1)
  p.poly(mane, 9, -5, 9, -12, 13, -17, 15, -17, 13, -11)
  p.poly(brown, 15, -13, 14, -19, 18, -14)
  p.poly(mane, -11, -2, -17, -2, -20, 6, -17, 9, -14, 3)
  p.box('#ddbd7e', -6, -6, 10, 9)
  p.box('#80614e', -4, -6, 2, 9)
  p.oval(ink, 16, -12, 1)
  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 5
    p.line(i % 2 ? mane : brown, 2.8, x, 2, x + (i % 2 ? 3 : -2), 8, x + (i % 2 ? 2 : -4), 12)
  }
}
