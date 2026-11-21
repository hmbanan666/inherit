import type { Townsperson } from '@inherit/sim'
import { Paint, grain } from './townPaint'

// Cameos use the same three-quarter pose as a printed town directory.
const colors = {
  bram: ['#a96e50', '#f0ba86', '#714735', '#465b60', '#b67c61'],
  elsie: ['#a58169', '#c68e64', '#473434', '#a75e50', '#f0d7af'],
  tomas: ['#738986', '#e0ad7a', '#69473c', '#465564', '#ccb06d'],
  wen: ['#8d9584', '#c19674', '#ddd6ba', '#6b6b58', '#9f825e'],
  odile: ['#9a7679', '#bc835d', '#5b403b', '#744c59', '#e8c487'],
  harrow: ['#878d9a', '#d6a17f', '#a7a397', '#4f5666', '#e3d3bd'],
  ines: ['#73948c', '#aa7354', '#443a38', '#476d74', '#c69a6b'],
  pell: ['#9e876b', '#e8b483', '#975e41', '#69725a', '#b68249'],
} as const
export function portrait(p: Paint, id: Townsperson['id'], mood: Townsperson['mood']) {
  const [bg, skin, hair, coat, accent] = colors[id]
  const ink = '#493d39'
  p.box(bg, 0, 0, 60, 64)
  p.oval('#fff0be3b', 32, 27, 24)
  for (let i = 0; i < 100; i++)
    p.line('#ffffff19', 0.6, grain(i) * 60, grain(i + 14) * 64, grain(i) * 60 + 2, grain(i + 14) * 64 - 1)
  // Shoulders, far collar, neck, and the edge of the near lapel.
  p.poly(coat, 1, 64, 5, 52, 19, 46, 25, 44, 34, 43, 47, 47, 55, 53, 60, 64)
  p.poly('#332f342e', 41, 47, 50, 50, 56, 55, 60, 64, 42, 64)
  p.poly(skin, 23, 37, 35, 36, 35, 46, 29, 50, 22, 45)
  p.poly('#794d3b66', 23, 37, 35, 36, 35, 41, 29, 45, 23, 43)
  p.poly(accent, 18, 45, 23, 44, 30, 49, 26, 54)
  p.poly(accent, 30, 49, 35, 44, 39, 46, 35, 53)
  p.line('#efe0b884', 1, 9, 54, 17, 50)
  p.oval(hair, 29, 26, 14, 17)
  p.poly(skin, 19, 21, 30, 16, 40, 20, 41, 27, 44, 32, 41, 33, 40, 38, 37, 42, 29, 43, 23, 39, 20, 33)
  p.poly('#8a573f48', 20, 28, 25, 30, 25, 37, 29, 42, 23, 39, 20, 34)
  p.oval(skin, 19.5, 29, 3.8, 4.4)
  p.line('#a06d51', 1, 18, 30, 20, 28, 21, 30)
  p.poly(hair, 16, 19, 21, 13, 32, 12, 42, 17, 39, 22, 32, 19, 24, 24, 22, 30, 18, 27)
  p.line(ink, 1.5, 27, 25, 30, 24.5)
  p.line(ink, 1.4, 36, 24, 39, 24.5)
  p.oval(ink, 29.5, 28, 1.05, 1.45)
  p.oval(ink, 38.5, 27.6, 0.9, 1.35)
  p.line('#9d6951', 1, 34, 28, 33, 32, 35, 32)
  p.line(ink, 1.2, 31, 36, 34, mood === 'worried' ? 34.4 : 36.6, 37, mood === 'happy' ? 34.5 : 36)
  switch (id) {
    case 'bram':
      p.poly(hair, 20, 31, 25, 34, 29, 37, 33, 35, 38, 34, 40, 33, 40, 39, 36, 44, 29, 46, 22, 41)
      p.line('#a67451', 1, 24, 37, 28, 42)
      p.line('#a67451', 1, 31, 40, 33, 42)
      p.poly(accent, 12, 52, 16, 49, 21, 59, 38, 58, 42, 49, 46, 51, 43, 64, 17, 64)
      p.poly('#495457', 15, 22, 17, 14, 24, 10, 36, 11, 42, 16, 43, 20, 34, 17, 20, 20)
      break
    case 'elsie':
      p.oval('#e7d7b4', 28, 14, 17, 8)
      for (const [x, y, r] of [
        [16, 14, 6],
        [21, 9, 7],
        [30, 8, 7],
        [38, 11, 7],
      ])
        p.oval('#f4e3c4', x, y, r)
      p.poly('#c8b899', 15, 16, 39, 15, 41, 19, 17, 21)
      p.poly(accent, 13, 52, 17, 49, 22, 58, 36, 58, 41, 49, 44, 51, 40, 64, 16, 64)
      break
    case 'tomas':
      p.poly('#58594b', 14, 18, 20, 8, 34, 7, 38, 12, 41, 17)
      p.poly('#797963', 12, 21, 16, 17, 36, 14, 45, 17, 40, 20, 19, 23)
      p.poly(hair, 28, 34, 31, 31.8, 34, 33, 36, 31.8, 40, 34, 36, 35, 33, 34.5)
      p.box(accent, 43, 54, 4, 8)
      break
    case 'wen':
      p.poly(hair, 19, 30, 25, 34, 30, 37, 35, 35, 40, 33, 40, 39, 32, 48, 24, 43)
      p.poly('#746c5b', 11, 19, 18, 11, 29, 8, 37, 11, 42, 17, 34, 18, 22, 22)
      p.poly('#aa987a', 12, 21, 26, 16, 43, 15, 47, 17, 34, 20, 16, 23)
      p.line('#eee8cd', 1.2, 24, 36, 30, 41)
      break
    case 'odile':
      p.oval(hair, 17, 20, 7, 7)
      p.poly('#d9bda1', 22, 17, 29, 13, 36, 14, 39, 17, 33, 16, 27, 19)
      p.poly(accent, 15, 48, 19, 46, 45, 62, 43, 64)
      p.oval('#e9be69', 39, 59, 2.5)
      p.oval('#eac887', 19, 32, 1.7)
      break
    case 'harrow':
      p.oval(hair, 14, 21, 5.7)
      p.poly(hair, 17, 22, 22, 14, 34, 13, 41, 17, 41, 20, 33, 17, 28, 20, 21, 22)
      for (const x of [28.5, 38.5]) {
        p.ctx.beginPath()
        p.ctx.arc(x, 28.7, 4, 0, Math.PI * 2)
        p.ctx.strokeStyle = ink
        p.ctx.lineWidth = 1.2
        p.ctx.stroke()
      }
      p.line(ink, 1, 32.5, 28, 34.5, 27.5)
      p.oval(accent, 30, 52, 1.8)
      break
    case 'ines':
      p.poly(accent, 13, 20, 19, 11, 29, 8, 37, 12, 41, 17, 35, 16, 21, 22, 16, 31, 14, 37, 12, 33)
      for (let i = 0; i < 3; i++) p.line('#e6ba89', 1, 18 + i * 5, 16 - i, 21 + i * 5, 13 - i)
      p.line('#e7c08a', 1.5, 19, 31, 19, 35)
      break
    case 'pell':
      p.poly('#66735b', 14, 20, 17, 12, 24, 8, 35, 9, 40, 15, 43, 17, 27, 18)
      p.line('#765241', 3.5, 16, 18, 39, 13)
      for (const x of [23, 33]) {
        p.oval('#604a3d', x, 15, 4.5)
        p.oval('#b4c8b9', x, 15, 2.8)
      }
      p.poly(accent, 12, 53, 16, 50, 39, 64, 32, 64)
      break
  }
}
