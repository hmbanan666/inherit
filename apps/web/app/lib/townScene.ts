import { Application, CanvasSource, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { illustration, Paint } from './art/townPaint'
import { landscape } from './art/townLandscape'
import { drawBuilding, horse, lamps, sites, wheel } from './art/townBuildings'
import type { BuildingId, TownSnapshot } from './townTypes'

const W = 1000,
  H = 420
type Change = TownSnapshot['changes'][number]

function print(w: number, h: number, draw: (p: Paint) => void, density = 2) {
  const source = new CanvasSource({ resource: illustration(w, h, draw, density), resolution: density })
  return new Sprite(new Texture({ source }))
}

function clear(layer: Container) {
  for (const child of layer.removeChildren())
    child.destroy({ children: true, texture: true, textureSource: true })
}

export class TownScene {
  private stage = new Container()
  private terrain = new Container()
  private buildings = new Container()
  private moving = new Graphics()
  private celestial = new Graphics()
  private sparks = new Graphics()
  private wheel?: Sprite
  private horse?: Sprite
  private snapshot!: TownSnapshot
  private artKey = ''
  private phase?: TownSnapshot['phase']
  private pending: Change[] = []
  private active?: { change: Change; start: number }
  private reduced = matchMedia('(prefers-reduced-motion: reduce)')
  private recent: TownSnapshot['changes'] = []
  private observer: ResizeObserver
  constructor(
    private app: Application,
    private host: HTMLElement,
    snapshot: TownSnapshot,
    private announce: (text: string) => void,
  ) {
    host.appendChild(app.canvas)
    app.stage.addChild(this.stage)
    this.stage.addChild(this.terrain, this.celestial, this.buildings, this.moving, this.sparks)
    this.update(snapshot)
    this.resize()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(host)
    app.ticker.maxFPS = 30
    app.ticker.add(this.frame)
  }
  private resize() {
    const w = Math.max(1, this.host.clientWidth),
      h = Math.max(1, this.host.clientHeight)
    this.app.renderer.resize(w, h)
    this.stage.scale.set(Math.min(w / W, h / H))
    this.center()
  }
  private center(dx = 0, dy = 0) {
    this.stage.position.set(
      (this.app.screen.width - W * this.stage.scale.x) / 2 + dx,
      (this.app.screen.height - H * this.stage.scale.y) / 2 + dy,
    )
  }
  update(s: TownSnapshot) {
    // A rolling changes array may be cloned on every tick. A bridge and district
    // can also arrive on the same tick, so a tick alone is not a unique change.
    if (this.snapshot) {
      const previousTick = this.recent.at(-1)?.tick ?? -1
      const latest = s.changes.at(-1)?.tick ?? -1
      if (latest < previousTick || s.day < this.snapshot.day) {
        this.pending = []
        this.active = undefined
        this.announce('')
        this.center()
      } else {
        for (const change of s.changes) {
          if (
            change.tick >= previousTick &&
            !this.recent.some(
              (c) => c.tick === change.tick && c.buildingId === change.buildingId && c.text === change.text,
            )
          )
            this.pending.push(change)
        }
      }
    }
    this.recent = s.changes.map((c) => ({ ...c }))
    this.snapshot = s
    if (this.phase !== s.phase) {
      clear(this.terrain)
      this.terrain.addChild(print(W, H, (p) => landscape(p, s.phase), 1.5))
      this.phase = s.phase
    }
    const key = JSON.stringify([s.phase, s.debt.owed, s.buildings.map((b) => [b.id, b.state])])
    if (key !== this.artKey) {
      this.artKey = key
      clear(this.buildings)
      this.wheel = undefined
      this.horse = undefined
      const tint = s.phase === 'night' ? 0xa1a7c3 : s.phase === 'evening' ? 0xffe3c9 : 0xffffff
      for (const id of Object.keys(sites) as BuildingId[]) {
        const b = s.buildings.find((b) => b.id === id)
        if (!b) continue
        const site = sites[id]
        const sprite = print(210, 176, (p) =>
          p.at(105, 138, 1, () => drawBuilding(p, id, b.state, s.phase, s.debt.owed)),
        )
        sprite.tint = tint
        sprite.scale.set(site.scale)
        sprite.position.set(site.x - 105 * site.scale, site.y - 138 * site.scale)
        this.buildings.addChild(sprite)
        if (id === 'mill') {
          this.wheel = print(52, 52, (p) => p.at(26, 26, 1, () => wheel(p, b.state === 'working')))
          this.wheel.anchor.set(0.5)
          this.wheel.tint = tint
          this.wheel.position.set(site.x + 28, site.y - 15)
          this.buildings.addChild(this.wheel)
        }
      }
      if (this.working('forge')) {
        this.horse = print(52, 44, (p) => p.at(25, 25, 1, () => horse(p)))
        this.horse.anchor.set(0.5)
        this.horse.tint = tint
        this.buildings.addChild(this.horse)
      }
    }
    const night = s.phase === 'night'
    const x = 95 + Math.max(0, Math.min(s.clock, 1)) * 810
    const y = 68 - 32 * Math.sin(Math.PI * s.clock)
    this.celestial
      .clear()
      .circle(x, y, 25)
      .fill({ color: night ? 0xe5e2cf : 0xffe7b0, alpha: 0.13 })
      .circle(x, y, 16)
      .fill(night ? 0xe5e2cf : 0xffe7b0)
    this.frame()
  }
  private working(id: BuildingId) {
    return this.snapshot.buildings.some((b) => b.id === id && b.state === 'working')
  }
  private smoke(x: number, y: number, t: number) {
    for (let i = 0; i < 5; i++) {
      const age = (t / 2800 + i / 5) % 1
      this.moving
        .ellipse(x + age * 15 + Math.sin(age * 7) * 2, y - age * 40, 2 + age * 7, 2 + age * 4)
        .fill({ color: 0xe7d5b9, alpha: (1 - age) * 0.56 })
    }
  }
  private frame = () => {
    const reduced = this.reduced.matches
    const now = performance.now(),
      t = reduced ? 1100 : now
    const g = this.moving.clear()
    if (this.working('forge')) {
      const site = sites.forge
      const x = site.x - 32 * site.scale,
        y = site.y - 22
      g.ellipse(x, y + 6, 14, 10).fill({ color: 0xf5994b, alpha: 0.24 })
      for (let i = 0; i < 4; i++) {
        const xx = x - 8 + i * 4,
          tip = y - 7 - Math.sin(t / 180 + i * 2) * 4
        g.poly([xx - 3, y + 9, xx - 4, y + 1, xx + 1, tip, xx + 3, y, xx + 4, y + 8]).fill(
          i % 2 ? 0xffcf73 : 0xed904e,
        )
      }
      this.smoke(site.x + 30, site.y - 108, t)
      if (this.horse) {
        const travel = t / 3400
        this.horse.x = 192 + Math.sin(travel) * 44
        this.horse.y = 302 + Math.sin(t / 90) * 1.1
        this.horse.scale.x = Math.cos(travel) >= 0 ? 1 : -1
      }
    }
    if (this.working('bakery')) this.smoke(sites.bakery.x + 21, sites.bakery.y - 89, t + 900)
    if (this.wheel) this.wheel.rotation = this.working('mill') ? t / 2900 : 0.25
    if (this.working('lamp-street') && ['evening', 'night'].includes(this.snapshot.phase)) {
      for (const [xx, yy, h] of lamps) {
        const x = sites['lamp-street'].x + xx + 12,
          y = sites['lamp-street'].y + yy - h + 6
        for (const [r, alpha] of [
          [17, 0.07],
          [10, 0.13],
          [5, 0.38],
          [2.5, 0.95],
        ])
          g.circle(x, y, r).fill({ color: 0xffcd79, alpha })
        g.ellipse(x, y + h - 4, 14, 2.5).fill({ color: 0xffda9a, alpha: 0.2 })
      }
    }
    this.sparks.clear()
    if (!this.active && this.pending.length) {
      const change = this.pending.shift()!
      this.active = { change, start: now }
      this.announce(change.text)
    }
    if (this.active) {
      const age = (now - this.active.start) / 1700
      const site = sites[this.active.change.buildingId]
      if (age >= 1) {
        this.active = undefined
        this.announce('')
        this.center()
      } else if (!reduced) {
        const wave = Math.sin(age * Math.PI)
        this.center((W / 2 - site.x) * 0.018 * wave, (H / 2 - site.y) * 0.04 * wave)
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6,
            r = 14 + 39 * age
          const x = site.x + Math.cos(a) * r,
            y = site.y - 33 + Math.sin(a) * r - age * 12
          const d = (1 - age) * 3.8
          this.sparks
            .poly([
              x,
              y - d * 1.7,
              x + d * 0.45,
              y - d * 0.35,
              x + d,
              y,
              x + d * 0.45,
              y + d * 0.35,
              x,
              y + d * 1.7,
              x - d * 0.45,
              y + d * 0.35,
              x - d,
              y,
              x - d * 0.45,
              y - d * 0.35,
            ])
            .fill(0xffe6a1)
        }
      }
    }
  }
  destroy() {
    this.observer.disconnect()
    this.app.ticker.remove(this.frame)
    this.app.destroy(true, { children: true, texture: true, textureSource: true })
  }
}
