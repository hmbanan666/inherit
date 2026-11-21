import type { TownSnapshot } from '../townTypes'
import { Paint, grain } from './townPaint'

const skies = {
  morning: ['#a2bfc3', '#f2d6a4', '#b9b5a0', '#829b92', '#587e76'],
  day: ['#84b9c4', '#e5d5aa', '#a4b5a4', '#739788', '#537d75'],
  evening: ['#947f98', '#fcc08d', '#c39a91', '#9d8384', '#736f78'],
  night: ['#222d47', '#76748b', '#606582', '#4b5972', '#35485e'],
} as const
const landColors = {
  morning: ['#b7ae78', '#dace9a', '#ab9d72', '#638e91', '#a8c7bd'],
  day: ['#a7ab76', '#d5c392', '#9a9266', '#528c92', '#a5c4b5'],
  evening: ['#b39a6d', '#d4b384', '#948368', '#757e89', '#c3ad9c'],
  night: ['#535b57', '#79786e', '#454d4d', '#414e66', '#85899a'],
} as const

export function fir(p: Paint, x: number, y: number, h: number, color: string, light?: string) {
  const w = h * 0.22
  p.box(color, x - h * 0.024, y - h * 0.26, h * 0.048, h * 0.27)
  for (let i = 0; i < 3; i++) {
    const top = y - h + i * h * 0.2,
      base = top + h * (0.43 + 0.02 * i),
      span = w * (0.53 + i * 0.24)
    p.poly(
      color,
      x,
      top,
      x + span,
      base - 1,
      x + span * 0.52,
      base - 2,
      x + span * 0.32,
      base + 1,
      x - span,
      base,
    )
    if (light) p.poly(light, x, top, x - 2, base - 3, x - span, base)
  }
}
function ridge(p: Paint, y: number, amplitude: number, seed: number, color: string) {
  const points: number[] = []
  for (let x = -24; x <= 1030; x += 24) {
    const h =
      Math.sin(x / 84 + seed) * 0.48 + Math.sin(x / 38 + seed) * 0.19 + Math.cos(x / 187 + seed) * 0.36
    points.push(x, y - amplitude * h - grain(x + seed) * 6)
  }
  p.poly(color, ...points, 1030, 250, -24, 250)
}

function orchard(p: Paint, x: number, y: number, h: number, night: boolean) {
  const bark = night ? '#423e40' : '#746554',
    leaf = night ? '#3a514f' : '#718674'
  p.oval('#303e3926', x + 4, y, 12, 2.5)
  p.line(bark, 2.7, x, y, x + 1, y - h * 0.59)
  p.line(bark, 1.8, x, y - h * 0.22, x - 7, y - h * 0.54)
  p.line(bark, 1.8, x, y - h * 0.36, x + 9, y - h * 0.59)
  for (const [dx, dy, r] of [
    [-6, 0, 0.22],
    [5, -3, 0.26],
    [0, -8, 0.21],
    [-2, 3, 0.18],
  ]) {
    p.oval(leaf, x + dx, y - h * 0.6 + dy, h * r, h * r * 1.12)
    p.oval(night ? '#53625b' : '#94a07c', x + dx - 2, y - h * 0.6 + dy - 1, h * r * 0.78, h * r * 0.85)
  }
}
function splitRail(p: Paint, x: number, y: number, length: number, slope: number) {
  for (const dy of [-5, -10]) {
    p.line('#685c4c', 3.6, x, y + dy, x + length, y + slope + dy)
    p.line('#bdac87', 1.1, x, y + dy - 1.4, x + length, y + slope + dy - 1.4)
  }
  const spans = Math.ceil(length / 22)
  for (let i = 0; i <= spans; i++) {
    const xx = x + (i * length) / spans,
      yy = y + (i * slope) / spans
    p.line('#776756', 3.7, xx, yy + 1, xx - 0.6, yy - 14)
    p.line('#d1bd93', 1, xx - 1.5, yy, xx - 1.9, yy - 13)
  }
}
function fields(p: Paint, x: number, y: number, w: number, h: number, night: boolean) {
  p.poly(night ? '#626456' : '#bba36c', x, y, x + w * 0.72, y - h, x + w, y - h + 3, x + w * 0.29, y + 5)
  for (let i = 0; i < 7; i++) {
    const sx = x + i * w * 0.038
    p.line(night ? '#7a7862' : '#d8c18a', 1.3, sx, y + i * 0.6, sx + w * 0.72, y - h + i * 0.6)
  }
}
export function landscape(p: Paint, phase: TownSnapshot['phase']) {
  const c = p.ctx
  const [zenith, horizon, far, mid, near] = skies[phase]
  const [grass, lane, earth, water, ripple] = landColors[phase]
  const sky = c.createLinearGradient(0, 0, 0, 180)
  sky.addColorStop(0, zenith)
  sky.addColorStop(1, horizon)
  c.fillStyle = sky
  c.fillRect(0, 0, 1000, 420)
  if (phase === 'night') {
    for (let i = 0; i < 80; i++)
      p.oval('#f6e5ba', grain(i) * 1000, grain(i + 84) * 120, 0.4 + grain(i + 30) * 0.7)
  } else {
    for (let i = 0; i < 12; i++) {
      const x = grain(i + 1) * 1050,
        y = 18 + grain(i + 8) * 63,
        w = 18 + grain(i + 20) * 60
      p.poly(
        '#fff3cf55',
        x - w,
        y + 3,
        x - w * 0.6,
        y - 1,
        x - w / 4,
        y - 2,
        x,
        y - 7,
        x + w * 0.4,
        y - 6,
        x + w * 0.6,
        y - 2,
        x + w,
        y,
        x + w + 9,
        y + 3,
      )
    }
  }
  ridge(p, 103, 49, 2, far)
  ridge(p, 126, 38, 6, mid)
  ridge(p, 158, 29, 3, near)
  for (let i = 0; i < 190; i++) {
    const x = i * 5.35,
      y = 175 + 8 * Math.sin(x / 88)
    fir(p, x, y, 13 + grain(i) * 22, near)
  }
  // The river snakes between the millrace and the opposite bank.
  p.poly(grass, 0, 175, 99, 167, 277, 178, 467, 162, 653, 175, 796, 168, 1000, 172, 1000, 420, 0, 420)
  p.poly(
    earth,
    -10,
    218,
    103,
    183,
    212,
    181,
    335,
    194,
    466,
    176,
    586,
    174,
    726,
    189,
    715,
    198,
    597,
    188,
    464,
    188,
    322,
    206,
    196,
    193,
    101,
    199,
  )
  p.poly(
    water,
    845,
    169,
    802,
    180,
    732,
    209,
    699,
    237,
    688,
    262,
    703,
    284,
    751,
    311,
    750,
    328,
    692,
    351,
    618,
    369,
    510,
    394,
    435,
    420,
    734,
    420,
    780,
    390,
    873,
    357,
    881,
    328,
    857,
    300,
    787,
    273,
    754,
    254,
    749,
    238,
    765,
    218,
    805,
    194,
    869,
    170,
  )
  p.line(earth, 4, 687, 250, 689, 265, 704, 283, 751, 311, 750, 328, 693, 351, 618, 369, 510, 394, 435, 420)
  p.line(ripple, 2, 754, 258, 779, 274, 853, 302, 875, 323)
  // Ripples are clipped to the river silhouette by following its centre and widths.
  const reach = [
    [177, 825, 8],
    [193, 787, 13],
    [210, 751, 14],
    [234, 724, 18],
    [254, 721, 22],
    [277, 751, 26],
    [298, 789, 27],
    [319, 813, 50],
    [338, 805, 56],
    [356, 753, 59],
    [377, 684, 67],
    [406, 613, 90],
  ]
  for (let row = 0; row < reach.length; row++) {
    const [y, x, w] = reach[row]
    for (let j = 0; j < 8; j++) {
      const xx = x + (grain(row * 8 + j) - 0.5) * w * 1.4,
        yy = y + grain(j + row * 11) * 6
      p.line(ripple, 0.8 + grain(j) * 0.8, xx, yy, xx + 4 + grain(j + 1) * 7, yy)
    }
  }
  // Main street and its upper switchback are cut into the slope.
  p.poly(
    lane,
    -10,
    309,
    104,
    280,
    259,
    286,
    380,
    302,
    486,
    307,
    624,
    291,
    707,
    302,
    752,
    319,
    753,
    332,
    688,
    317,
    619,
    308,
    488,
    331,
    371,
    328,
    251,
    307,
    109,
    301,
    -10,
    339,
  )
  p.poly(
    lane,
    279,
    292,
    331,
    262,
    449,
    230,
    601,
    215,
    673,
    220,
    684,
    227,
    611,
    225,
    459,
    241,
    350,
    269,
    318,
    298,
  )
  p.poly(lane, 863, 321, 911, 286, 978, 255, 1000, 251, 1000, 265, 935, 294, 875, 340)
  // Low field walls, orchard rows, and grass clumps give the empty land scale.
  for (let i = 0; i < 210; i++) {
    const x = grain(i + 9) * 1000,
      y = 190 + grain(i + 267) * 226
    // Keep the river clear; the far bank has fields as well.
    const r = reach.reduce((best, pt) => (Math.abs(pt[0] - y) < Math.abs(best[0] - y) ? pt : best))
    if (Math.abs(x - r[1]) < r[2] * 1.6 + 12) continue
    p.line(earth, 1, x, y, x + 4 + grain(i + 33) * 5, y - 0.8)
    if (i % 4 === 0) p.line(earth, 1, x + 2, y, x + 1, y - 2, x + 5, y - 1)
  }
  for (const [x, y, h] of [
    [12, 238, 67],
    [45, 216, 55],
    [72, 207, 38],
    [230, 225, 35],
    [260, 210, 47],
    [495, 194, 48],
    [526, 196, 36],
    [552, 189, 42],
    [969, 191, 52],
    [991, 213, 64],
    [7, 394, 103],
    [34, 398, 68],
    [69, 410, 56],
    [980, 402, 89],
    [1006, 409, 115],
  ]) {
    fir(p, x, y, h, phase === 'night' ? '#293d44' : '#3e625b', phase === 'night' ? '#425356' : '#628278')
  }
  const night = phase === 'night'
  fields(p, 38, 220, 79, 18, night)
  fields(p, 172, 233, 94, 17, night)
  fields(p, 455, 205, 42, 9, night)
  fields(p, 902, 286, 84, 17, night)
  for (const [x, y, h] of [
    [10, 260, 45],
    [46, 249, 31],
    [176, 230, 38],
    [198, 226, 32],
    [226, 222, 27],
    [335, 208, 34],
    [361, 199, 29],
    [762, 208, 23],
    [947, 197, 32],
    [974, 203, 38],
    [960, 311, 43],
    [984, 307, 41],
  ])
    orchard(p, x, y, h, night)
  splitRail(p, 12, 281, 61, -12)
  splitRail(p, 196, 274, 57, 7)
  splitRail(p, 472, 248, 66, -12)
  splitRail(p, 875, 297, 46, -19)
  splitRail(p, 20, 369, 98, 16)
  splitRail(p, 119, 385, 66, -10)
  // Fieldstone at the river bend, a line of rushes and the ferry tied up below the bridge.
  for (let i = 0; i < 17; i++) {
    const x = 661 + i * 3.2,
      y = 359 - i * 1.15
    p.oval(night ? '#6e7374' : '#9b9d8d', x, y, 3.6 + grain(i) * 3, 2.6)
    p.line(night ? '#93979a' : '#c5c6b0', 1.1, x - 2, y - 1, x + 1, y - 2)
  }
  for (let i = 0; i < 26; i++) {
    const x = 596 + i * 2.7,
      y = 379 - i * 0.7
    p.line(night ? '#586258' : '#777d56', 1.3, x, y, x - 1 + grain(i + 3) * 3, y - 4 - grain(i) * 10)
  }
  p.at(845, 357, 0.84, () => {
    p.line('#756750', 1, 0, 1, 19, -8, 26, -10)
    p.poly('#634f48', -19, -2, -13, 4, 4, 7, 15, 3, 19, -3, 6, 1, -11, -3)
    p.poly('#b39067', -19, -2, -10, -5, 9, -4, 19, -3, 10, 2, 0, 3)
    p.poly('#6b6255', -13, -2, -7, -3, 7, -2, 11, -1, 4, 1)
    p.line('#cfb78b', 2, -10, -5, 5, 4)
    p.line('#74624f', 2, 25, -11, 25, -18)
  })
  for (let i = 0; i < 32; i++) {
    const x = 130 + grain(i) * 380,
      y = 372 + grain(i + 44) * 48
    p.line(night ? '#525b52' : '#939369', 1.5, x, y, x - 2, y - 4, x, y - 2, x + 2, y - 7)
    if (i % 3 === 0) p.oval(night ? '#94918a' : '#ede0b3', x + 2, y - 7, 1.4)
  }
  for (const [x, y] of [
    [317, 69],
    [324, 67],
    [734, 76],
  ]) {
    p.line(near, 1, x - 2.8, y - 1.4, x, y, x + 2.7, y - 1.7)
  }
  for (let i = 0; i < 4800; i++) {
    const x = grain(i + 32) * 1000,
      y = grain(i + 325) * 420
    p.box(i % 2 ? '#3027230d' : '#fff0d515', x, y, grain(i + 61) * 1.6 + 0.3, 0.6)
  }
}
