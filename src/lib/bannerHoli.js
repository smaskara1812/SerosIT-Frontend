import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'

// The Holi show, a play of colour over the page. Handfuls of gulal are thrown in from the sides, the corners and the top and burst into
// soft clouds of powder; pichkari streams of coloured water arc across; water balloons drop and burst into splashes; every hit leaves a
// splat of colour that stays a moment; and a finale of throws and a drift of powder from the top closes it.
// One canvas that exists only while the show plays. Nothing is loaded until a button is pressed. Kind to slow machines: fewer particles on a
// low-power device, fewer again when frames run slow, an early finish when they run very slow, and with reduced motion nothing travels:
// splats and soft clouds simply appear and fade.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

function cloudSprite(colour) {
  const c = document.createElement('canvas')
  c.width = 96
  c.height = 96
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(48, 48, 0, 48, 48, 48)
  grd.addColorStop(0, `${colour}e6`)
  grd.addColorStop(0.5, `${colour}88`)
  grd.addColorStop(1, `${colour}00`)
  g.fillStyle = grd
  g.fillRect(0, 0, 96, 96)
  return c
}

// A splat of wet colour: a bumpy blot made of overlapping lobes, a few thick drips with rounded ends, and loose droplets. Drawn once and reused.
function splatSprite(colour, r) {
  const size = Math.ceil(r * 3.2)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const m = size / 2
  g.fillStyle = colour
  g.strokeStyle = colour
  g.globalAlpha = 0.86
  g.beginPath()
  g.arc(m, m, r * 0.62, 0, TAU)
  g.fill()
  const lobes = Math.round(rnd(7, 10))
  for (let i = 0; i < lobes; i += 1) {
    const a = (i / lobes) * TAU + rnd(-0.3, 0.3)
    const d = r * rnd(0.45, 0.82)
    g.beginPath()
    g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, r * rnd(0.17, 0.34), 0, TAU)
    g.fill()
  }
  g.lineCap = 'round'
  const drips = Math.round(rnd(2, 4))
  for (let i = 0; i < drips; i += 1) {
    const a = rnd(0, TAU)
    g.lineWidth = r * rnd(0.12, 0.22)
    g.beginPath()
    g.moveTo(m + Math.cos(a) * r * 0.7, m + Math.sin(a) * r * 0.7)
    g.lineTo(m + Math.cos(a) * r * rnd(1.05, 1.35), m + Math.sin(a) * r * rnd(1.05, 1.35))
    g.stroke()
  }
  for (let i = 0; i < 10; i += 1) {
    const a = rnd(0, TAU)
    const d = r * rnd(1.15, 1.5)
    g.beginPath()
    g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, r * rnd(0.02, 0.06), 0, TAU)
    g.fill()
  }
  g.globalAlpha = 0.26 // a soft highlight so it reads as wet colour
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.ellipse(m - r * 0.2, m - r * 0.22, r * 0.2, r * 0.12, -0.6, 0, TAU)
  g.fill()
  return c
}

export function playHoli({ colors, bursts }) {
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

  const palette = (colors?.length ? colors : ['#ff2d95', '#ffd600', '#00b8ff', '#6fd400', '#ff6a00', '#8e44ff']).map((c) => c.toLowerCase())
  const clouds = {}
  for (const c of palette) clouds[c] = cloudSprite(c)

  const guard = makeFrameGuard()
  let thin = false
  const cap = low ? 380 : 900
  let powder = []
  let drops = []
  let puffs = []
  let splats = []
  let flying = []
  let streams = []
  let balloons = []
  const plan = []

  // ── the programme ───────────────────────────────────────────────────────────────────────────────────────────────────────
  const n = still ? Math.min(bursts, 5) : bursts
  const gap = 0.38
  const SIDES = ['left', 'right', 'cornerL', 'cornerR', 'top', 'left', 'right']
  for (let i = 0; i < n; i += 1) plan.push({ at: 0.3 + i * gap + (i % 2 ? 0.1 : 0), type: 'throw', from: SIDES[i % SIDES.length] })
  const finaleAt = 0.3 + n * gap + 0.7
  if (!still) {
    const jets = 2 + Math.round(n / 5)
    for (let j = 0; j < jets; j += 1) plan.push({ at: 0.9 + j * 1.1, type: 'stream', from: j % 2 ? 'right' : 'left' })
    const pops = 2 + Math.round(n / 3)
    for (let j = 0; j < pops; j += 1) plan.push({ at: 1.4 + j * 0.55, type: 'balloon' })
    for (let j = 0; j < 8; j += 1) plan.push({ at: finaleAt + j * 0.07, type: 'throw', from: SIDES[j % SIDES.length], big: true })
    plan.push({ at: finaleAt + 0.4, type: 'drift' })
  }
  const total = still ? finaleAt + 0.5 : finaleAt + 3.4

  // ── effects ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const addPowder = (p) => {
    if (powder.length < cap) powder.push(p)
  }
  const addSplat = (x, y, colour, size, delay = 0) => splats.push({ x, y, size, sprite: splatSprite(colour, size), age: -delay })
  const addPuff = (x, y, colour, r1, dur) => puffs.push({ x, y, c: colour, r0: r1 * 0.25, r1, dur, age: 0, dx: rnd(-14, 14), dy: rnd(-22, -4) })
  const spray = (x, y, colour, count, power, k = 1.5, g = 40, size = [2, 5]) => {
    const m = thin ? Math.ceil(count * 0.55) : count
    for (let i = 0; i < m; i += 1) {
      const a = rnd(0, TAU)
      const sp = power * rnd(0.3, 1)
      addPowder({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, k, g, life: 0, max: rnd(1.1, 2.1), c: Math.random() < 0.25 ? pick(palette) : colour, size: rnd(size[0], size[1]) })
    }
  }
  const splash = (x, y, colour, count) => {
    for (let i = 0; i < (thin ? Math.ceil(count / 2) : count); i += 1) {
      const a = rnd(-Math.PI, 0) + rnd(-0.4, 0.4)
      const sp = rnd(120, 420) * (R / 800)
      drops.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900, life: 0, max: rnd(0.5, 0.9), c: colour, w: rnd(2, 4.5) })
    }
  }
  const explode = (x, y, colour, big) => {
    addPuff(x, y, colour, R * (big ? rnd(0.2, 0.3) : rnd(0.13, 0.22)), rnd(1.4, 2.1))
    if (!still) addPuff(x + rnd(-30, 30), y + rnd(-30, 30), pick(palette), R * rnd(0.08, 0.15), rnd(1.2, 1.8))
    spray(x, y, colour, big ? 70 : 46, R * 0.5)
    addSplat(x + rnd(-14, 14), y + rnd(-14, 14), colour, R * rnd(big ? 0.07 : 0.045, big ? 0.11 : 0.075), 0.04)
  }

  const startPoint = (from) => ({
    left: [-14, rnd(0.45, 0.95) * H], right: [W + 14, rnd(0.45, 0.95) * H], cornerL: [-10, H + 10], cornerR: [W + 10, H + 10], top: [rnd(0.2, 0.8) * W, -14],
  }[from])

  const run = (ev) => {
    if (ev.type === 'throw') {
      const [sx, sy] = startPoint(ev.from)
      const colour = pick(palette)
      if (still) return explode(rnd(0.15, 0.85) * W, rnd(0.15, 0.7) * H, colour, false)
      flying.push({ sx, sy, tx: rnd(0.1, 0.9) * W, ty: rnd(0.12, 0.7) * H, arc: rnd(0.05, 0.16) * H * (ev.from === 'top' ? 0.2 : 1), age: 0, dur: ev.big ? rnd(0.45, 0.6) : rnd(0.55, 0.8), c: colour, big: !!ev.big })
    } else if (ev.type === 'stream') {
      const left = ev.from === 'left'
      streams.push({ x: left ? -8 : W + 8, y: rnd(0.62, 0.9) * H, dir: left ? 1 : -1, ang: rnd(0.5, 0.95), sp: rnd(0.8, 1.0) * R * 1.0, c: pick(palette), age: 0, dur: 0.85, acc: 0, land: rnd(0.6, 0.92) * H })
    } else if (ev.type === 'balloon') {
      balloons.push({ x: rnd(0.12, 0.88) * W, y: -30, ty: rnd(0.3, 0.7) * H, age: 0, dur: rnd(0.8, 1.05), c: pick(palette), sway: rnd(-1, 1) })
    } else if (ev.type === 'drift') {
      for (let i = 0; i < (thin ? 70 : 140); i += 1) addPowder({ x: rnd(0, W), y: rnd(-60, 0), vx: rnd(-12, 12), vy: rnd(40, 120), k: 0.3, g: 14, life: 0, max: rnd(2.0, 3.0), c: pick(palette), size: rnd(2, 4.5) })
    }
  }

  const end = () => {
    cancelAnimationFrame(raf)
    canvas.remove()
    endShow(end)
  }
  startShow(end)

  let raf = 0
  let t = 0
  let last = 0
  let next = 0
  plan.sort((a, b) => a.at - b.at)

  const frame = (now) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016)
    last = now
    t += dt
    const mode = guard(now)
    thin = mode !== 'full'
    if (mode === 'stop' || t > total) return end()
    while (next < plan.length && plan[next].at <= t) run(plan[next++])

    ctx.clearRect(0, 0, W, H)
    const env = Math.max(0, Math.min(1, t / 0.4, (total - t) / 1.2)) // the whole show eases in and out
    canvas.style.background = `rgba(255,248,240,${0.12 * env})` // a faint haze of powder in the air

    // splats first, so everything else lands on top of them
    ctx.globalCompositeOperation = 'source-over'
    splats = splats.filter((s) => {
      s.age += dt
      if (s.age < 0) return true
      const life = still ? 1.6 : 3.2
      if (s.age > life || t > total - 0.05) return false
      const pop = Math.min(1, s.age / 0.14)
      const sc = 0.6 + 0.4 * (1 - (1 - pop) ** 3) + (pop >= 1 ? Math.min(0.06, (s.age - 0.14) * 0.05) : 0)
      const fade = Math.min(1, (life - s.age) / 1.0, env * 1.4)
      const w = s.sprite.width * sc
      ctx.globalAlpha = Math.max(0, fade) * 0.92
      ctx.drawImage(s.sprite, s.x - w / 2, s.y - w / 2, w, w)
      return true
    })

    puffs = puffs.filter((p) => {
      p.age += dt
      const k = p.age / p.dur
      if (k >= 1) return false
      const e = 1 - (1 - k) ** 2
      const r = (p.r0 + (p.r1 - p.r0) * e) * 2
      p.x += p.dx * dt
      p.y += p.dy * dt
      ctx.globalAlpha = (1 - k) ** 1.3 * 0.8
      ctx.drawImage(clouds[p.c] || clouds[palette[0]], p.x - r / 2, p.y - r / 2, r, r)
      return true
    })

    // handfuls in the air
    flying = flying.filter((f) => {
      f.age += dt
      const u = Math.min(1, f.age / f.dur)
      const x = f.sx + (f.tx - f.sx) * u
      const y = f.sy + (f.ty - f.sy) * u - f.arc * 4 * u * (1 - u)
      ctx.globalAlpha = 1
      ctx.fillStyle = f.c
      ctx.beginPath()
      ctx.arc(x, y, f.big ? 7 : 5.5, 0, TAU)
      ctx.fill()
      for (let i = 0; i < (thin ? 1 : 3); i += 1) addPowder({ x, y, vx: rnd(-40, 40), vy: rnd(-30, 30), k: 2, g: 30, life: 0, max: rnd(0.4, 0.8), c: f.c, size: rnd(2, 4) })
      if (u >= 1) {
        explode(f.tx, f.ty, f.c, f.big)
        return false
      }
      return true
    })

    // water from the pichkaris
    streams = streams.filter((s) => {
      s.age += dt
      if (s.age > s.dur) return false
      s.acc += dt * (thin ? 80 : 150)
      while (s.acc >= 1) {
        s.acc -= 1
        const a = s.ang + rnd(-0.06, 0.06)
        const sp = s.sp * rnd(0.9, 1.05)
        drops.push({ x: s.x, y: s.y, px: s.x, py: s.y, vx: Math.cos(a) * sp * s.dir, vy: -Math.sin(a) * sp, g: 950, life: 0, max: 2, c: s.c, w: rnd(2.5, 4.5), land: s.land })
      }
      return true
    })
    drops = drops.filter((d) => {
      d.life += dt
      if (d.life > d.max) return false
      d.px = d.x
      d.py = d.y
      d.vy += d.g * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      if (d.land && d.vy > 0 && d.y > d.land) {
        splash(d.x, d.y, d.c, 3)
        if (Math.random() < 0.1) addSplat(d.x, d.y, d.c, R * rnd(0.035, 0.06))
        return false
      }
      if (d.x < -40 || d.x > W + 40 || d.y > H + 40) return false
      ctx.globalAlpha = d.max < 1 ? 1 - d.life / d.max : 0.95
      ctx.strokeStyle = d.c
      ctx.lineCap = 'round'
      ctx.lineWidth = d.w
      ctx.beginPath()
      ctx.moveTo(d.px, d.py)
      ctx.lineTo(d.x + 0.01, d.y)
      ctx.stroke()
      return true
    })

    // water balloons
    balloons = balloons.filter((b) => {
      b.age += dt
      const u = Math.min(1, b.age / b.dur)
      const y = -30 + (b.ty + 30) * u * u
      const x = b.x + Math.sin(u * 6) * 14 * b.sway
      ctx.globalAlpha = 1
      ctx.fillStyle = b.c
      ctx.beginPath()
      ctx.ellipse(x, y, 13, 16, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.ellipse(x - 4, y - 6, 3.5, 5.5, -0.5, 0, TAU)
      ctx.fill()
      if (u >= 1) {
        splash(x, y, b.c, 30)
        for (let i = 0; i < (thin ? 10 : 22); i += 1) {
          const a = rnd(0, TAU)
          const sp = rnd(80, 380) * (R / 800)
          drops.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 700, life: 0, max: rnd(0.45, 0.9), c: b.c, w: rnd(2, 4) })
        }
        addPuff(x, y, b.c, R * rnd(0.09, 0.15), 1.3)
        addSplat(x, y, b.c, R * rnd(0.07, 0.11), 0.03)
        return false
      }
      return true
    })

    // powder
    powder = powder.filter((p) => {
      p.life += dt
      const k = p.life / p.max
      if (k >= 1) return false
      const d = Math.exp(-p.k * dt)
      p.vx *= d
      p.vy = p.vy * d + p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      ctx.globalAlpha = (1 - k) * 0.9
      ctx.fillStyle = p.c
      ctx.fillRect(p.x, p.y, p.size, p.size)
      return true
    })
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
