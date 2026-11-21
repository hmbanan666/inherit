// Pigment, line and stipple shared by the town's printed scenery and portraits.
// All drawing coordinates are in illustration pixels.
export class Paint {
  constructor(readonly ctx: CanvasRenderingContext2D) {
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
  }
  poly(color: string, ...points: number[]) {
    const c = this.ctx
    c.beginPath()
    c.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1])
    c.closePath()
    c.fillStyle = color
    c.fill()
  }
  line(color: string, width: number, ...points: number[]) {
    const c = this.ctx
    c.beginPath()
    c.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1])
    c.strokeStyle = color
    c.lineWidth = width
    c.stroke()
  }
  box(color: string, x: number, y: number, w: number, h: number) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, w, h)
  }
  oval(color: string, x: number, y: number, rx: number, ry = rx) {
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    this.ctx.fill()
  }
  text(value: string, x: number, y: number, font: string, color: string) {
    const c = this.ctx
    c.font = font
    c.textAlign = 'center'
    c.fillStyle = color
    c.fillText(value, x, y)
  }
  at(x: number, y: number, scale: number, fn: () => void) {
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.scale(scale, scale)
    fn()
    this.ctx.restore()
  }
}

// Fixed variation for texture and foliage. Nothing depends on the game RNG.
export function grain(index: number) {
  const wave = Math.sin(index * 78.233 + 0.421) * 43758.5453
  return wave - Math.floor(wave)
}
export function illustration(w: number, h: number, draw: (p: Paint) => void, density = 2) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * density)
  canvas.height = Math.ceil(h * density)
  const ctx = canvas.getContext('2d')!
  ctx.scale(density, density)
  draw(new Paint(ctx))
  return canvas
}
