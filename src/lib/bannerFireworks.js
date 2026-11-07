import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'

// The "Light it up" show, a choreographed Diwali display on one canvas that exists only while it plays:
//   - ground fountains (anar) spit gold from the bottom edge for the whole show,
//   - shells climb from the bottom, from the corners and from both sides, then burst into different shapes: peony, chrysanthemum
//     with long trails, tilted rings, a heart, a star, a lotus, a spiral, a palm, a weeping willow, crossettes that split in four,
//   - every burst flashes, every spark glows white-hot and cools to ember, and trails linger on the screen,
//   - a volley and a curtain of golden rain close it.
// Nothing is loaded until a button is pressed (BannerView imports this file on demand). Kind to slow machines: fewer sparks on a
// low-power device, fewer again when frames run slow, an early finish when they run very slow, and with reduced motion the bursts do not
// travel: they appear in place and fade. Click again and the show starts over.
const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// ── shapes: a list of where each spark should end up, relative to the burst, as a fraction of the burst's radius ──────────────
const sphere = (n) => Array.from({ length: n }, () => {
  const a = rnd(0, TAU)
  const r = Math.sqrt(Math.random()) * 0.35 + 0.65
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r }
})
const ring = (n, tilt = 1, rot = 0, r = 1) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * TAU
  const x = Math.cos(a) * r
  const y = Math.sin(a) * r * tilt
  return { dx: x * Math.cos(rot) - y * Math.sin(rot), dy: x * Math.sin(rot) + y * Math.cos(rot) }
})
const heart = (n) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * TAU
  return { dx: (16 * Math.sin(t) ** 3) / 17, dy: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) - 2) / 17 }
})
const star = (n, points = 5) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * TAU
  const seg = (t / TAU) * points * 2
  const f = seg - Math.floor(seg)
  const outer = Math.floor(seg) % 2 === 0
  const r0 = outer ? 1 : 0.42
  const r1 = outer ? 0.42 : 1
  const r = r0 + (r1 - r0) * f
  return { dx: Math.cos(t - Math.PI / 2) * r, dy: Math.sin(t - Math.PI / 2) * r }
})
const lotus = (n) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * TAU
  const r = Math.abs(Math.cos(2.5 * t)) * 0.75 + 0.25
  return { dx: Math.cos(t) * r, dy: Math.sin(t) * r }
})
const spiral = (n) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * TAU * 2.4
  const r = (i / n) * 0.95 + 0.08
  return { dx: Math.cos(t) * r, dy: Math.sin(t) * r }
})
const palm = (arms, per) => Array.from({ length: arms * per }, (_, i) => {
  const arm = Math.floor(i / per)
  const j = (i % per) + 1
  const a = (arm / arms) * TAU + rnd(-0.03, 0.03)
  return { dx: Math.cos(a) * (j / per), dy: Math.sin(a) * (j / per) }
})

// kind -> how it is built. `life` is seconds, `k` the air drag (the end radius is velocity / k), `g` gravity in px/s², `big` how large it bursts.
const KINDS = {
  peony: { pts: () => [...sphere(70), ...sphere(24).map((p) => ({ dx: p.dx * 0.4, dy: p.dy * 0.4, inner: true }))], life: [1.5, 2.1], g: 70, k: 1.5, big: 1, trail: false, twinkle: true },
  chrysanthemum: { pts: () => sphere(64), life: [1.9, 2.5], g: 80, k: 1.4, big: 1.05, trail: true, twinkle: true },
  ring: { pts: () => ring(54, rnd(0.3, 1), rnd(0, Math.PI)), life: [1.5, 1.9], g: 40, k: 1.6, big: 0.9, trail: false, twinkle: false },
  doublering: { pts: () => [...ring(46, 1, 0, 1), ...ring(30, 1, 0, 0.55).map((p) => ({ ...p, inner: true }))], life: [1.5, 1.9], g: 40, k: 1.6, big: 0.95, trail: false, twinkle: false },
  heart: { pts: () => heart(64), life: [1.7, 2.1], g: 25, k: 1.8, big: 0.85, trail: false, twinkle: false },
  star: { pts: () => star(70), life: [1.6, 2.0], g: 25, k: 1.8, big: 0.95, trail: false, twinkle: false },
  lotus: { pts: () => lotus(84), life: [1.7, 2.1], g: 30, k: 1.7, big: 0.9, trail: false, twinkle: false },
  spiral: { pts: () => spiral(76), life: [1.7, 2.2], g: 30, k: 1.6, big: 0.9, trail: true, twinkle: false },
  palm: { pts: () => palm(9, 7), life: [2.0, 2.5], g: 150, k: 1.2, big: 1.1, trail: true, twinkle: false },
  willow: { pts: () => sphere(52), life: [2.8, 3.5], g: 170, k: 1.0, big: 1.15, trail: true, twinkle: true, gold: true },
  crossette: { pts: () => Array.from({ length: 11 }, (_, i) => ({ dx: Math.cos((i / 11) * TAU) * 0.8, dy: Math.sin((i / 11) * TAU) * 0.8, split: true })), life: [1.5, 1.8], g: 60, k: 1.4, big: 1, trail: true, twinkle: false },
}
const ORDER = ['peony', 'ring', 'chrysanthemum', 'heart', 'crossette', 'star', 'doublering', 'willow', 'lotus', 'spiral', 'palm', 'peony', 'chrysanthemum', 'ring']

// ── the glow every spark is drawn with: white-hot core, the colour, a soft halo ───────────────────────────────────────────────
function makeSprite(colour) {
  const c = document.createElement('canvas')
  c.width = 48
  c.height = 48
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(24, 24, 0, 24, 24, 24)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.16, 'rgba(255,255,255,0.95)')
  grd.addColorStop(0.36, colour)
  grd.addColorStop(0.62, `${colour}55`)
  grd.addColorStop(1, `${colour}00`)
  g.fillStyle = grd
  g.fillRect(0, 0, 48, 48)
  return c
}

// The soft wash of light a burst throws across the sky: colour only, no hot centre.
function makeFlash(colour) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, `${colour}aa`)
  grd.addColorStop(0.45, `${colour}33`)
  grd.addColorStop(1, `${colour}00`)
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return c
}

// How long the show lasts, so another show can be timed around it.
export function fireworksLength(bursts, still = false) {
  const n = still ? Math.min(bursts, 5) : bursts
  const finaleAt = 0.45 + n * (still ? 0.3 : 0.55) + 0.5
  return still ? finaleAt + 0.6 : finaleAt + 0.75 + 3.4
}

// `chained` lets another show run this one inside it (the other show ends it); `veil: false` leaves the dimming of the sky to that show.
export function playFireworks({ colors, bursts, chained = false, veil: dim = true }) {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const low = lowPowerDevice()
  const scale = canvasScale()
  const W = window.innerWidth
  const H = window.innerHeight
  const R = Math.min(W, H)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const palette = (colors?.length ? colors : ['#ffc83d', '#ff6a1a', '#ff2d7a', '#ffffff']).map((c) => c.toLowerCase())
  const gold = '#ffc83d'
  const sprites = {}
  for (const c of new Set([...palette, gold, '#ffffff', '#ff7a1a'])) sprites[c] = makeSprite(c)
  const ember = sprites['#ff7a1a']
  const washes = {}
  for (const c of palette) washes[c] = makeFlash(c)

  const cap = low ? 480 : 1100
  const guard = makeFrameGuard()
  let thin = false
  let sparks = []
  let flashes = []
  let rockets = []
  const shells = []
  const emitters = []

  // ── the programme ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const n = still ? Math.min(bursts, 5) : bursts
  const gap = still ? 0.3 : 0.55
  const startAt = 0.45
  const kindAt = Math.floor(Math.random() * 3)
  const launch = (at, kind, big, from) => {
    const colour = pick(palette)
    const second = pick(palette.filter((c) => c !== colour).concat(colour))
    shells.push({ at, kind, big, colour, second, from, mode: pick(['one', 'two', 'multi']), done: false })
  }
  const FROMS = ['bottom', 'left', 'right', 'cornerL', 'cornerR', 'bottom']
  for (let i = 0; i < n; i += 1) {
    const kind = ORDER[(kindAt + i) % ORDER.length]
    launch(startAt + i * gap + (i % 3 === 1 ? 0.12 : 0), kind, rnd(0.75, 1.1), FROMS[(i + Math.floor(rnd(0, 3))) % FROMS.length])
  }
  const finaleAt = startAt + n * gap + 0.5
  const volley = still ? 0 : Math.min(8, 4 + Math.round(n / 3))
  for (let i = 0; i < volley; i += 1) launch(finaleAt + Math.random() * 0.25, i % 3 === 0 ? 'willow' : pick(['peony', 'chrysanthemum', 'ring', 'palm']), rnd(1, 1.25), FROMS[i % FROMS.length])
  const rainAt = finaleAt + 0.75
  const total = still ? finaleAt + 0.6 : rainAt + 3.4
  const fountains = still ? 0 : low ? 2 : 3
  for (let i = 0; i < fountains; i += 1) emitters.push({ x: W * (fountains === 2 ? 0.3 + i * 0.4 : 0.18 + i * 0.32), from: 0.3 + i * 0.12, to: total - 1.9, acc: 0 })
  let rained = false

  // ── spawning ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const spawn = (s) => {
    if (sparks.length < cap) sparks.push(s)
  }
  const flash = (x, y, colour, size) => flashes.push({ x, y, colour, size, age: 0 })

  const explode = (sh, x, y) => {
    const def = KINDS[sh.kind]
    const radius = R * 0.3 * def.big * sh.big
    const pts = def.pts()
    const keep = thin ? Math.ceil(pts.length * 0.6) : pts.length
    const life = rnd(def.life[0], def.life[1])
    flash(x, y, sh.colour, radius * 2.2)
    for (let i = 0; i < keep; i += 1) {
      const p = pts[thin ? Math.floor((i / keep) * pts.length) : i]
      const colour = def.gold ? gold : sh.mode === 'two' ? (i % 2 ? sh.colour : sh.second) : sh.mode === 'multi' ? palette[i % palette.length] : p.inner ? sh.second : sh.colour
      const tx = p.dx * radius
      const ty = p.dy * radius
      const spark = {
        x, y, px: x, py: y, c: colour, life: 0, max: life * rnd(0.88, 1.08), k: def.k, g: def.g,
        size: def.trail ? rnd(10, 15) : rnd(11, 18), trail: def.trail, twinkle: def.twinkle ? rnd(14, 28) : 0, ph: rnd(0, TAU), split: !!p.split, vx: tx * def.k, vy: ty * def.k,
      }
      if (still) { spark.x = x + tx; spark.y = y + ty; spark.vx = 0; spark.vy = 0; spark.max = 0.9 }
      spawn(spark)
    }
  }

  const crossetteSplit = (s) => {
    for (let q = 0; q < 4; q += 1) {
      const a = (q / 4) * TAU + Math.PI / 4 + rnd(-0.2, 0.2)
      spawn({ x: s.x, y: s.y, px: s.x, py: s.y, c: s.c, life: 0, max: 0.85, k: 1.8, g: 60, size: 11, trail: true, twinkle: 0, ph: 0, split: false, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 })
    }
  }

  const newRocket = (sh) => {
    const ty = rnd(0.12, 0.5) * H
    const tx = (sh.from === 'left' ? rnd(0.2, 0.55) : sh.from === 'right' ? rnd(0.45, 0.8) : rnd(0.12, 0.88)) * W
    const start = {
      bottom: [rnd(0.2, 0.8) * W, H + 12],
      cornerL: [-8, H + 8],
      cornerR: [W + 8, H + 8],
      left: [-12, rnd(0.55, 0.95) * H],
      right: [W + 12, rnd(0.55, 0.95) * H],
    }[sh.from]
    rockets.push({ sh, sx: start[0], sy: start[1], tx, ty, age: 0, dur: rnd(0.7, 1.0), wob: rnd(-1, 1) })
  }

  const end = () => {
    cancelAnimationFrame(raf)
    canvas.remove()
    endShow(end)
  }
  if (!chained) startShow(end)

  let raf = 0
  let t = 0
  let last = 0

  const frame = (now) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016)
    last = now
    t += dt
    const mode = guard(now)
    thin = mode !== 'full'
    if (mode === 'stop' || t > total) return end()

    // the night comes down, then lifts
    const veil = Math.max(0, Math.min(1, t / 0.5, (total - t) / 0.9))
    if (dim) canvas.style.background = `rgba(9,4,28,${0.5 * veil})`

    // old light fades slowly, which is what leaves the trails
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = `rgba(0,0,0,${still ? 0.25 : 0.16})`
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'

    // shells leave the ground, burst when they arrive
    for (const sh of shells) {
      if (!sh.done && t >= sh.at) {
        sh.done = true
        if (still) explode(sh, rnd(0.15, 0.85) * W, rnd(0.15, 0.55) * H)
        else newRocket(sh)
      }
    }
    rockets = rockets.filter((r) => {
      r.age += dt
      const u = Math.min(1, r.age / r.dur)
      const ease = 1 - (1 - u) ** 2
      const x = r.sx + (r.tx - r.sx) * u + Math.sin(u * 9) * 5 * r.wob
      const y = r.sy + (r.ty - r.sy) * ease
      ctx.globalAlpha = 1
      ctx.drawImage(sprites['#ffffff'], x - 9, y - 9, 18, 18)
      for (let i = 0; i < (thin ? 1 : 2); i += 1) spawn({ x, y, px: x, py: y, c: '#ff7a1a', life: 0, max: rnd(0.35, 0.6), k: 2, g: 120, size: rnd(5, 9), trail: false, twinkle: 0, ph: 0, split: false, vx: rnd(-30, 30), vy: rnd(10, 60) })
      if (u >= 1) {
        explode(r.sh, x, y)
        return false
      }
      return true
    })

    // fountains
    for (const e of emitters) {
      if (t < e.from || t > e.to) continue
      e.acc += dt * (low ? 80 : 130)
      while (e.acc >= 1) {
        e.acc -= 1
        const a = -Math.PI / 2 + rnd(-0.32, 0.32)
        const sp = rnd(300, 560) * (R / 800)
        spawn({ x: e.x, y: H + 4, px: e.x, py: H + 4, c: Math.random() < 0.6 ? gold : '#ff7a1a', life: 0, max: rnd(0.8, 1.3), k: 0.5, g: 620, size: rnd(5, 9), trail: false, twinkle: 0, ph: 0, split: false, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp })
      }
    }

    // golden rain from the top, to close
    if (!rained && t >= rainAt && !still) {
      rained = true
      const count = thin ? 34 : 64
      for (let i = 0; i < count; i += 1) {
        const x = (i / count) * W + rnd(-12, 12)
        spawn({ x, y: rnd(-30, 10), px: x, py: 0, c: gold, life: 0, max: rnd(1.9, 2.8), k: 0.35, g: 55, size: rnd(9, 14), trail: true, twinkle: rnd(14, 26), ph: rnd(0, TAU), split: false, vx: rnd(-14, 14), vy: rnd(70, 150) })
      }
    }

    // flashes of the bursts
    flashes = flashes.filter((f) => {
      f.age += dt
      const k = f.age / 0.32
      if (k >= 1) return false
      const s = f.size * (0.7 + k * 0.8)
      ctx.globalAlpha = (1 - k) * 0.5
      ctx.drawImage(washes[f.colour] || washes[palette[0]], f.x - s / 2, f.y - s / 2, s, s)
      return true
    })

    // the sparks
    const next = []
    for (const s of sparks) {
      s.life += dt
      const k = s.life / s.max
      if (k >= 1) continue
      s.px = s.x
      s.py = s.y
      const d = Math.exp(-s.k * dt)
      s.vx *= d
      s.vy = s.vy * d + s.g * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (s.split && k > 0.5) {
        s.split = false
        crossetteSplit(s)
        continue
      }
      let a = (1 - k) ** 1.15
      if (s.twinkle) a *= 0.55 + 0.45 * Math.sin(s.twinkle * s.life + s.ph)
      const size = s.size * (1 - k * 0.45)
      if (s.trail && !still) {
        ctx.globalAlpha = a * 0.7
        ctx.strokeStyle = k > 0.65 ? '#ff7a1a' : s.c
        ctx.lineWidth = Math.max(1, size * 0.17)
        ctx.beginPath()
        ctx.moveTo(s.px, s.py)
        ctx.lineTo(s.x, s.y)
        ctx.stroke()
      }
      ctx.globalAlpha = a
      ctx.drawImage(k > 0.7 ? ember : sprites[s.c] || sprites['#ffffff'], s.x - size / 2, s.y - size / 2, size, size)
      next.push(s)
    }
    sparks = next
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
