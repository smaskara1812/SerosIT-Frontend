import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'

// "Welcome Bappa": an offering, with no figure in it. A warm maroon-and-saffron evening. A lotus, the seat the god is welcomed to, rises out of
// still water and opens, petal row by petal row. An arch of small lamps, like the arch of light behind a shrine, lights from both ends and
// meets at the top. A heap of modaks, his favourite sweet, pops one by one onto a banana leaf. Red hibiscus and blades of durva grass fall.
// Then the aarti: a flame is carried round the lotus three times, and every full circle rings a ripple of light like a temple bell. The lotus
// flares, a burst of gold goes up, and it settles. One canvas that exists only while the show plays; nothing is loaded until a button is
// pressed. Kind to slow machines: fewer flowers and sparks on a low-power device and when frames run slow, an early finish when very slow.
// With reduced motion the finished scene (open lotus, lit arch, modaks) simply fades in and out.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
const easeOut = (x) => 1 - (1 - x) ** 3
const easeOutBack = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2

function normHex(c) {
  const s = String(c).trim().toLowerCase()
  return /^#[0-9a-f]{3}$/.test(s) ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s
}

function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (v) => Math.round(v + (255 - v) * k)
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (v) => Math.round(v * (1 - k))
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`
}

function glow(colour, size = 64) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `${colour}ff`)
  grd.addColorStop(0.28, `${colour}aa`)
  grd.addColorStop(0.6, `${colour}33`)
  grd.addColorStop(1, `${colour}00`)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  return c
}

// a red hibiscus: five broad petals, a dark throat, a long stamen tipped with gold
function hibiscusSprite(colour, size = 84) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  g.translate(size / 2, size / 2)
  for (let k = 0; k < 5; k += 1) {
    g.save()
    g.rotate((k / 5) * TAU)
    const grd = g.createRadialGradient(0, -size * 0.05, 0, 0, -size * 0.22, size * 0.28)
    grd.addColorStop(0, shade(colour, 0.6))
    grd.addColorStop(0.35, shade(colour, 0.15))
    grd.addColorStop(1, tint(colour, 0.18))
    g.fillStyle = grd
    g.strokeStyle = 'rgba(70,0,10,0.3)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, 0)
    g.bezierCurveTo(size * 0.26, -size * 0.1, size * 0.28, -size * 0.42, size * 0.04, -size * 0.45)
    g.bezierCurveTo(-size * 0.04, -size * 0.47, -size * 0.28, -size * 0.42, -size * 0.26, -size * 0.1)
    g.closePath()
    g.fill()
    g.stroke()
    g.restore()
  }
  g.strokeStyle = '#f7d774'
  g.lineWidth = 2.4
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(size * 0.06, -size * 0.18, size * 0.02, -size * 0.34)
  g.stroke()
  g.fillStyle = '#fff3b0'
  for (let k = 0; k < 6; k += 1) {
    g.beginPath()
    g.arc(size * 0.02 + Math.cos(k) * size * 0.035, -size * 0.34 + Math.sin(k) * size * 0.03, size * 0.016, 0, TAU)
    g.fill()
  }
  return c
}

// a tuft of durva grass
function durvaSprite(w = 34, h = 76) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.lineCap = 'round'
  for (const [dx, bend, col, lw] of [[0, 0, '#4d9a3a', 2.4], [-6, -9, '#3f8a2f', 2], [6, 9, '#5aa844', 2]]) {
    g.strokeStyle = col
    g.lineWidth = lw
    g.beginPath()
    g.moveTo(w / 2 + dx * 0.3, h - 3)
    g.quadraticCurveTo(w / 2 + bend * 0.6, h * 0.5, w / 2 + bend, 4)
    g.stroke()
  }
  return c
}

// a modak: a pleated dumpling drawn to a point at the top
function modakSprite(size = 100) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = Math.round(size * 1.1)
  const g = c.getContext('2d')
  const w = size
  const h = size * 1.1
  const body = g.createRadialGradient(w * 0.4, h * 0.55, w * 0.05, w * 0.5, h * 0.62, w * 0.62)
  body.addColorStop(0, '#ffe3a6')
  body.addColorStop(0.5, '#eeaa3c')
  body.addColorStop(1, '#a8601a')
  g.fillStyle = body
  g.beginPath()
  g.moveTo(w * 0.5, h * 0.02)
  g.bezierCurveTo(w * 0.56, h * 0.2, w * 0.98, h * 0.3, w * 0.94, h * 0.66)
  g.bezierCurveTo(w * 0.9, h * 0.98, w * 0.1, h * 0.98, w * 0.06, h * 0.66)
  g.bezierCurveTo(w * 0.02, h * 0.3, w * 0.44, h * 0.2, w * 0.5, h * 0.02)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(140,80,20,0.4)'
  g.lineWidth = 1.6
  for (let k = -3; k <= 3; k += 1) {
    g.beginPath()
    g.moveTo(w * 0.5, h * 0.06)
    g.quadraticCurveTo(w * (0.5 + k * 0.17), h * 0.5, w * (0.5 + k * 0.12), h * 0.93)
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,0.4)'
  g.beginPath()
  g.ellipse(w * 0.34, h * 0.5, w * 0.06, h * 0.12, -0.4, 0, TAU)
  g.fill()
  return c
}

// a banana leaf laid flat: a long blade with a midrib and fine veins
function leafSprite(w = 640, h = 120) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  const grd = g.createLinearGradient(0, 0, 0, h)
  grd.addColorStop(0, '#6aa83a')
  grd.addColorStop(1, '#2f6a1c')
  g.fillStyle = grd
  g.beginPath()
  g.moveTo(4, h * 0.5)
  g.quadraticCurveTo(w * 0.12, h * 0.04, w * 0.5, h * 0.06)
  g.quadraticCurveTo(w * 0.88, h * 0.04, w - 4, h * 0.5)
  g.quadraticCurveTo(w * 0.88, h * 0.98, w * 0.5, h * 0.94)
  g.quadraticCurveTo(w * 0.12, h * 0.98, 4, h * 0.5)
  g.fill()
  g.strokeStyle = 'rgba(210,240,150,0.55)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(10, h * 0.5)
  g.lineTo(w - 10, h * 0.5)
  g.stroke()
  g.strokeStyle = 'rgba(210,240,150,0.18)'
  g.lineWidth = 1
  for (let x = 30; x < w - 20; x += 14) {
    g.beginPath()
    g.moveTo(x, h * 0.5)
    g.lineTo(x + 14, h * 0.1)
    g.moveTo(x, h * 0.5)
    g.lineTo(x + 14, h * 0.9)
    g.stroke()
  }
  return c
}

// the rows of the lotus, back to front: how many petals, how far they fan when open (radians either side), how long, how deep a pink
const ROWS = [
  { n: 7, fan: 1.0, len: 1.06, deep: 0.1 },
  { n: 6, fan: 1.28, len: 0.92, deep: 0.28 },
  { n: 5, fan: 1.52, len: 0.74, deep: 0.5 },
]

export function playGanesh({ colors, bursts }) {
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

  const palette = (colors?.length ? colors : ['#f59e0b', '#dc2626', '#fde68a', '#f472b6']).map(normHex)
  const col = (i) => palette[i % palette.length]
  const GOLD = col(0)
  const HIBISCUS = col(1)
  const LIGHT = col(2)
  const LOTUS = col(3)
  const sprites = {}
  for (const c of new Set([GOLD, LIGHT, LOTUS, HIBISCUS, '#ffffff', '#ffb347'])) sprites[c] = glow(c)
  const spr = (c) => sprites[c] || sprites[GOLD]
  const hibiscus = hibiscusSprite(HIBISCUS)
  const durva = durvaSprite()
  const modak = modakSprite()
  const leaf = leafSprite()

  const total = still ? 4.2 : 11.2
  const LOTUS_AT = 0.7
  const OPEN_AT = 1.3
  const ARCH_AT = 2.8
  const MODAK_AT = 3.8
  const FLOWERS_AT = 4.6
  const AARTI_AT = 5.6
  const CIRCLE = 1.15 // seconds for one turn of the flame
  const FINALE = AARTI_AT + 3 * CIRCLE + 0.1

  const cx = W / 2
  const L = R * 0.3 // petal length
  const baseY = H * 0.62 // where the lotus sits on the water
  const heartY = baseY - L * 0.5
  const archR = R * 0.46
  const archY = baseY - L * 0.1
  const aartiR = R * 0.17

  // the arch of lamps, lit from both ends toward the top
  const N = 23
  const arch = Array.from({ length: N }, (_, i) => {
    const th = Math.PI + (i / (N - 1)) * Math.PI
    const j = Math.min(i, N - 1 - i)
    return { x: cx + Math.cos(th) * archR, y: archY + Math.sin(th) * archR * 0.96, at: ARCH_AT + j * 0.11, ph: rnd(0, TAU), lit: still }
  })

  // the modaks: five on the leaf, three on them
  const ms = R * 0.092
  const leafW = ms * 5.8
  const leafY = H * 0.84
  const modaks = [
    ...Array.from({ length: 5 }, (_, i) => ({ x: cx + (i - 2) * ms * 0.98, y: leafY - ms * 0.35, at: MODAK_AT + i * 0.13 })),
    ...Array.from({ length: 3 }, (_, i) => ({ x: cx + (i - 1) * ms * 0.98, y: leafY - ms * 1.0, at: MODAK_AT + 0.7 + i * 0.13 })),
  ].map((m) => ({ ...m, done: still }))

  const guard = makeFrameGuard()
  let thin = false
  let flowers = []
  let sparks = []
  let waves = []
  let trail = []
  let bellsRung = 0
  let flared = false
  const motes = Array.from({ length: low ? 8 : 16 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(R * 0.04, R * 0.11), ph: rnd(0, TAU), f: rnd(0.4, 1) }))

  const end = () => {
    cancelAnimationFrame(raf)
    canvas.remove()
    endShow(end)
  }
  startShow(end)

  const spark = (x, y, n, colour, speed = 1) => {
    const count = thin ? Math.ceil(n / 2) : n
    for (let i = 0; i < count; i += 1) {
      const a = rnd(0, TAU)
      const sp = rnd(80, 340) * (R / 800) * speed
      sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: rnd(0.5, 1.1), r: rnd(3, 7), c: colour })
    }
  }

  const flame = (x, y, h, w, c, flick, sway) => {
    for (const [sc, c0, c1] of [[1, c, tint(c, 0.5)], [0.62, '#ffe9a8', '#fff6d8'], [0.32, '#ffffff', '#ffffff']]) {
      const top = y - h * sc * flick
      const grd = ctx.createLinearGradient(0, top, 0, y)
      grd.addColorStop(0, c0)
      grd.addColorStop(1, c1)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.moveTo(x + sway * sc, top)
      ctx.bezierCurveTo(x + w * sc * 1.2, y - h * sc * 0.45, x + w * sc * 0.9, y, x, y)
      ctx.bezierCurveTo(x - w * sc * 0.9, y, x - w * sc * 1.2, y - h * sc * 0.45, x + sway * sc, top)
      ctx.fill()
    }
  }

  const drawLotus = (open, rise, t, pulse, env) => {
    const by = baseY + L * 0.9 * (1 - rise)
    const k = easeInOut(open)
    // a warm glow behind it
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = env * rise * (0.5 + 0.4 * k + pulse * 0.4)
    const gs = L * 3.4
    ctx.drawImage(spr(GOLD), cx - gs / 2, by - L * 0.55 - gs / 2, gs, gs)
    ctx.globalCompositeOperation = 'source-over'
    ctx.save()
    ctx.translate(cx, by)
    ctx.globalAlpha = env * rise
    const breathe = still ? 0 : Math.sin(t * 1.3) * 0.012
    ROWS.forEach((row, ri) => {
      for (let i = 0; i < row.n; i += 1) {
        const u = row.n === 1 ? 0 : (i / (row.n - 1)) * 2 - 1
        const ang = u * row.fan * k + breathe * (ri + 1) * u
        const len = row.len * L * (0.72 + 0.28 * k)
        const w = L * 0.21 * row.len * (0.8 + 0.2 * k)
        ctx.save()
        ctx.rotate(ang)
        const grd = ctx.createLinearGradient(0, 0, 0, -len)
        grd.addColorStop(0, tint(LOTUS, 0.88 - row.deep * 0.4))
        grd.addColorStop(0.55, tint(LOTUS, 0.45 - row.deep * 0.4))
        grd.addColorStop(1, shade(LOTUS, row.deep * 0.25))
        ctx.fillStyle = grd
        ctx.strokeStyle = 'rgba(120,20,70,0.35)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(w * 1.1, -len * 0.25, w * 0.9, -len * 0.78, 0, -len)
        ctx.bezierCurveTo(-w * 0.9, -len * 0.78, -w * 1.1, -len * 0.25, 0, 0)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath()
        ctx.moveTo(0, -len * 0.1)
        ctx.lineTo(0, -len * 0.82)
        ctx.stroke()
        ctx.restore()
      }
    })
    // the golden heart appears as it opens
    if (k > 0.4) {
      ctx.globalAlpha = env * rise * clamp((k - 0.4) / 0.4)
      for (let i = 0; i < 9; i += 1) {
        const a = -Math.PI / 2 + (i - 4) * 0.2
        ctx.fillStyle = i % 2 ? '#ffd166' : '#f59e0b'
        ctx.beginPath()
        ctx.arc(Math.cos(a) * L * 0.2, -L * 0.18 + Math.sin(a) * L * 0.2, L * 0.03, 0, TAU)
        ctx.fill()
      }
    }
    ctx.restore()
    return by
  }

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

    const env = Math.max(0, Math.min(1, t / 0.8, (total - t) / 1.5))
    canvas.style.background = `linear-gradient(180deg, rgba(40,8,38,${0.78 * env}) 0%, rgba(96,20,44,${0.66 * env}) 55%, rgba(150,52,24,${0.56 * env}) 100%)`
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    let pulse = 0
    if (!still) for (let b = 0; b < 3; b += 1) {
      const tb = AARTI_AT + (b + 1) * CIRCLE
      if (t >= tb && t - tb < 0.6) pulse = Math.max(pulse, (1 - (t - tb) / 0.6) ** 2)
    }

    // soft lights hanging in the evening
    ctx.globalCompositeOperation = 'lighter'
    for (const m of motes) {
      ctx.globalAlpha = env * (0.07 + 0.06 * Math.sin(t * m.f + m.ph))
      const s = m.r * 2
      ctx.drawImage(spr('#ffb347'), m.x - s / 2, m.y - s / 2 + (still ? 0 : Math.sin(t * 0.3 + m.ph) * 8), s, s)
    }

    // still water under the lotus: rings that drift outward
    const rise = still ? 1 : easeOut(clamp((t - LOTUS_AT) / 1.3))
    if (rise > 0) {
      ctx.lineWidth = 1.5
      for (let i = 0; i < 4; i += 1) {
        const ph = still ? i / 4 + 0.3 : ((t * 0.18 + i / 4) % 1)
        ctx.globalAlpha = env * rise * (1 - ph) * 0.35
        ctx.strokeStyle = LIGHT
        ctx.beginPath()
        ctx.ellipse(cx, baseY + L * 0.05, L * (0.45 + ph * 1.6), L * (0.45 + ph * 1.6) * 0.2, 0, 0, TAU)
        ctx.stroke()
      }
    }
    ctx.globalCompositeOperation = 'source-over'

    // the lotus
    const open = still ? 1 : clamp((t - OPEN_AT) / 2.4)
    const lotusBottom = drawLotus(open, rise, t, pulse, env)

    // the arch of lamps
    ctx.globalCompositeOperation = 'lighter'
    for (const a of arch) {
      if (!a.lit && t >= a.at) {
        a.lit = true
        if (!still && !thin) spark(a.x, a.y, 3, GOLD, 0.5)
      }
      if (!a.lit) continue
      const age = still ? 9 : t - a.at
      const flare = 1 + 1.4 * Math.max(0, 1 - age / 0.5) ** 2 + pulse * 0.5
      const flick = still ? 1 : 1 + 0.08 * Math.sin(t * 9 + a.ph)
      ctx.globalAlpha = env * 0.8
      const gs = R * 0.07 * flare * flick
      ctx.drawImage(spr(GOLD), a.x - gs / 2, a.y - gs / 2, gs, gs)
      ctx.globalAlpha = env
      const cs = R * 0.014 * flare
      ctx.drawImage(spr('#ffffff'), a.x - cs / 2, a.y - cs / 2, cs, cs)
    }
    ctx.globalCompositeOperation = 'source-over'
    for (const a of arch) {
      if (!a.lit) continue
      const flick = still ? 1 : 1 + 0.08 * Math.sin(t * 9 + a.ph)
      ctx.globalAlpha = env
      flame(a.x, a.y + R * 0.008, R * 0.03, R * 0.007, GOLD, flick, still ? 0 : Math.sin(t * 6 + a.ph) * R * 0.0015)
    }

    // the banana leaf and the modaks
    const leafK = still ? 1 : easeOut(clamp((t - (MODAK_AT - 0.4)) / 0.7))
    if (leafK > 0) {
      ctx.globalAlpha = env * leafK
      ctx.drawImage(leaf, cx - leafW / 2, leafY - ms * 0.35, leafW, ms * 0.95)
    }
    for (const m of modaks) {
      const k = still ? 1 : easeOutBack(clamp((t - m.at) / 0.5))
      if (k <= 0) continue
      if (!m.done && t >= m.at + 0.3) {
        m.done = true
        if (!still && !thin) spark(m.x, m.y - ms * 0.3, 4, LIGHT, 0.5)
      }
      ctx.globalAlpha = env * clamp(k * 2)
      const w = ms * k
      ctx.drawImage(modak, m.x - w / 2, m.y - w * 0.55, w, w * 1.1)
    }
    // a soft glow settles over the offering once it is laid
    if (!still && t > MODAK_AT + 0.8) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = env * clamp((t - MODAK_AT - 0.8) / 1) * (0.2 + pulse * 0.25)
      const gs = ms * 6
      ctx.drawImage(spr('#ffb347'), cx - gs / 2, leafY - ms * 1.1 - gs * 0.25, gs, gs * 0.5)
      ctx.globalCompositeOperation = 'source-over'
    }

    // hibiscus and durva falling
    if (!still && t > FLOWERS_AT && t < total - 2.4) {
      let c = (thin || low ? 4 : 8) * (bursts / 8) * dt
      while (Math.random() < c) {
        if (flowers.length < (low ? 50 : 100)) flowers.push({ x: rnd(0, W), y: -30, vx: rnd(-14, 14), vy: rnd(36, 80), rot: rnd(0, TAU), spin: rnd(-1.6, 1.6), flip: rnd(0, TAU), fs: rnd(1.5, 4), s: rnd(0.8, 1.2), grass: Math.random() < 0.45, life: 0, max: rnd(5, 7.5), ph: rnd(0, TAU) })
        c -= 1
      }
    }
    flowers = flowers.filter((f) => {
      f.life += dt
      if (f.life > f.max || f.y > H + 40) return false
      f.vy = Math.min(f.vy + 40 * dt, 100)
      f.x += f.vx * dt + Math.sin(f.life * 1.8 + f.ph) * 30 * dt
      f.y += f.vy * dt
      f.rot += f.spin * dt
      f.flip += f.fs * dt
      ctx.save()
      ctx.globalAlpha = Math.min(1, (f.max - f.life) * 1.2) * env
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rot)
      ctx.scale(f.grass ? 1 : 0.4 + 0.6 * Math.abs(Math.cos(f.flip)), 1)
      if (f.grass) {
        const gw = R * 0.02 * f.s
        ctx.drawImage(durva, -gw / 2, -gw * 1.1, gw, gw * 2.2)
      } else {
        const fw = R * 0.05 * f.s
        ctx.drawImage(hibiscus, -fw / 2, -fw / 2, fw, fw)
      }
      ctx.restore()
      return true
    })

    // the aarti: a flame carried round the lotus, three times; each full circle rings the bell
    if (!still && t >= AARTI_AT - 0.4 && t < FINALE + 0.3) {
      const u = (t - AARTI_AT) / CIRCLE
      const ang = -Math.PI / 2 + u * TAU
      const grow = clamp((t - (AARTI_AT - 0.4)) / 0.4) * clamp((FINALE + 0.3 - t) / 0.4)
      const px = cx + Math.cos(ang) * aartiR * 1.25
      const py = heartY + Math.sin(ang) * aartiR * 0.8
      trail.push({ x: px, y: py, t })
      trail = trail.filter((p) => t - p.t < 0.7)
      ctx.globalCompositeOperation = 'lighter'
      for (const p of trail) {
        const k = 1 - (t - p.t) / 0.7
        ctx.globalAlpha = env * k * k * 0.8 * grow
        const s = R * 0.05 * (0.4 + k)
        ctx.drawImage(spr(LIGHT), p.x - s / 2, p.y - s / 2, s, s)
      }
      ctx.globalAlpha = env * grow
      const hs = R * 0.14
      ctx.drawImage(spr(GOLD), px - hs / 2, py - hs / 2, hs, hs)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = env * grow
      flame(px, py + R * 0.012, R * 0.05, R * 0.012, GOLD, 1 + 0.06 * Math.sin(t * 13), Math.sin(t * 7) * R * 0.002)
      // a tiny lamp plate under the flame
      ctx.fillStyle = '#e8b04a'
      ctx.beginPath()
      ctx.ellipse(px, py + R * 0.016, R * 0.022, R * 0.007, 0, 0, TAU)
      ctx.fill()
      while (bellsRung < 3 && t >= AARTI_AT + (bellsRung + 1) * CIRCLE) {
        bellsRung += 1
        waves.push({ age: 0, life: 1.4, c: LIGHT, r0: aartiR * 0.4, r1: R * 0.75 })
        waves.push({ age: 0, life: 1.8, c: GOLD, r0: aartiR * 0.2, r1: R * 0.95 })
        spark(cx, heartY, 8, GOLD, 0.9)
      }
    }

    // the finale: the lotus flares and a burst of gold goes up
    if (!still && !flared && t >= FINALE) {
      flared = true
      waves.push({ age: 0, life: 1.6, c: '#ffffff', r0: L * 0.3, r1: R * 1.0 })
      spark(cx, heartY, 36, GOLD, 1.5)
      spark(cx, heartY, 18, LOTUS, 1.3)
      spark(cx, heartY, 18, LIGHT, 1.1)
    }
    if (!still && t >= FINALE) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = env * 0.55 * Math.max(0, 1 - (t - FINALE) / 1.1) ** 2
      const gs = L * 5
      ctx.drawImage(spr(GOLD), cx - gs / 2, heartY - gs / 2, gs, gs)
      ctx.globalCompositeOperation = 'source-over'
    }

    // ripples of light: the bell
    ctx.globalCompositeOperation = 'lighter'
    waves = waves.filter((w) => {
      w.age += dt
      const k = w.age / w.life
      if (k >= 1) return false
      const e = 1 - (1 - k) ** 2
      ctx.globalAlpha = (1 - k) * 0.5 * env
      ctx.strokeStyle = w.c
      ctx.lineWidth = R * 0.005 * (1 - k) + 1
      ctx.beginPath()
      ctx.arc(cx, heartY, w.r0 + (w.r1 - w.r0) * e, 0, TAU)
      ctx.stroke()
      return true
    })

    // sparks
    sparks = sparks.filter((s) => {
      s.life += dt
      const k = s.life / s.max
      if (k >= 1) return false
      s.vx *= Math.exp(-2.4 * dt)
      s.vy = s.vy * Math.exp(-2.4 * dt) + 160 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      ctx.globalAlpha = (1 - k) * env
      ctx.strokeStyle = s.c
      ctx.lineWidth = Math.max(1, s.r * 0.35)
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(s.x - s.vx * 0.045, s.y - s.vy * 0.045)
      ctx.stroke()
      const r = s.r * (1 - k * 0.4)
      ctx.drawImage(spr(s.c), s.x - r, s.y - r, r * 2, r * 2)
      return true
    })

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    void lotusBottom
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
