import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'

// "Garba night". The page falls into a deep indigo and plum dusk. Nine clay lamps stand in a ring on the floor, seen in perspective, and catch
// one by one, each flame in one of the nine colours and each casting a pool of its colour on the floor. As each lamp catches, one ring of a
// rangoli draws itself on the floor inside the circle: nine glowing lotus rings, one for each night. When the ninth closes, the rangoli
// blooms in a flash and a shockwave, marigold garlands drop in from the top, marigold petals drift down, and two pairs of painted dandiya
// sticks clack in the real three-beat rhythm (one, two, three, rest, one, two, three): every clap sends sparks off the sticks, a ring of light
// across the floor, and a pulse through the lamps and the rangoli. Golden embers rise at the end. No figures; only the things of the festival.
// One canvas that exists only while the show plays; nothing is loaded until a button is pressed. Kind to slow machines: fewer petals, embers
// and sparks on a low-power device and when frames run slow, an early finish when very slow. With reduced motion the lamps are lit, the
// rangoli is drawn and nothing moves: the scene fades in and out.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
const easeOutBack = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2

function normHex(c) {
  const s = String(c).trim().toLowerCase()
  return /^#[0-9a-f]{3}$/.test(s) ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s
}

// a colour pulled towards white
function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (v) => Math.round(v + (255 - v) * k)
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

const MARIGOLDS = [['#ffb703', '#e85d04'], ['#ffd166', '#fb8500'], ['#ff9f1c', '#c1440e'], ['#ffcb47', '#f77f00']]

// a marigold blossom seen from the front: two rings of petals around a dark heart
function blossomSprite([a, b], size = 72) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  g.translate(size / 2, size / 2)
  const ring = (n, r, rx, ry, from, to, off) => {
    for (let k = 0; k < n; k += 1) {
      g.save()
      g.rotate((k / n) * TAU + off)
      const grd = g.createLinearGradient(0, -r - ry, 0, -r + ry)
      grd.addColorStop(0, from)
      grd.addColorStop(1, to)
      g.fillStyle = grd
      g.strokeStyle = 'rgba(110,40,0,0.3)'
      g.lineWidth = 1
      g.beginPath()
      g.ellipse(0, -r, rx, ry, 0, 0, TAU)
      g.fill()
      g.stroke()
      g.restore()
    }
  }
  ring(12, size * 0.27, size * 0.115, size * 0.2, b, a, 0)
  ring(9, size * 0.17, size * 0.09, size * 0.15, a, tint(a, 0.35), 0.35)
  g.fillStyle = '#7a2e00'
  g.beginPath()
  g.arc(0, 0, size * 0.065, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,200,120,0.5)'
  g.beginPath()
  g.arc(-size * 0.015, -size * 0.015, size * 0.025, 0, TAU)
  g.fill()
  return c
}

// one loose marigold petal
function petalSprite([a, b], w = 24, h = 54) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.translate(w / 2, h / 2)
  const grd = g.createLinearGradient(0, -h / 2, 0, h / 2)
  grd.addColorStop(0, a)
  grd.addColorStop(1, b)
  g.fillStyle = grd
  g.beginPath()
  g.moveTo(0, -h / 2)
  g.bezierCurveTo(w * 0.75, -h * 0.2, w * 0.6, h * 0.35, 0, h / 2)
  g.bezierCurveTo(-w * 0.6, h * 0.35, -w * 0.75, -h * 0.2, 0, -h / 2)
  g.fill()
  g.strokeStyle = 'rgba(120,40,0,0.35)'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(0, -h * 0.4)
  g.lineTo(0, h * 0.42)
  g.stroke()
  return c
}

// a clay diya seen from a little above: rim, dark pool of oil, rounded body with a row of gilt dots. The rim's centre is at (100, 40).
function diyaSprite() {
  const c = document.createElement('canvas')
  c.width = 200
  c.height = 130
  const g = c.getContext('2d')
  const ox = 100
  const oy = 40
  const body = g.createLinearGradient(0, oy, 0, oy + 80)
  body.addColorStop(0, '#f6a24e')
  body.addColorStop(0.45, '#c9561d')
  body.addColorStop(1, '#5c1a0a')
  g.fillStyle = body
  g.beginPath()
  g.moveTo(ox - 80, oy)
  g.bezierCurveTo(ox - 78, oy + 62, ox - 40, oy + 80, ox, oy + 80)
  g.bezierCurveTo(ox + 40, oy + 80, ox + 78, oy + 62, ox + 80, oy)
  g.closePath()
  g.fill()
  // a soft highlight down the left, a shade down the right
  const side = g.createLinearGradient(ox - 80, 0, ox + 80, 0)
  side.addColorStop(0, 'rgba(255,225,170,0.38)')
  side.addColorStop(0.35, 'rgba(255,225,170,0)')
  side.addColorStop(0.7, 'rgba(0,0,0,0)')
  side.addColorStop(1, 'rgba(40,6,0,0.4)')
  g.fillStyle = side
  g.fill()
  g.strokeStyle = 'rgba(255,205,130,0.55)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(ox - 71, oy + 17)
  g.quadraticCurveTo(ox, oy + 58, ox + 71, oy + 17)
  g.stroke()
  g.fillStyle = 'rgba(255,226,160,0.9)'
  for (let k = -4; k <= 4; k += 1) {
    g.beginPath()
    g.arc(ox + k * 14, oy + 30 + k * k * 0.75, 2.6, 0, TAU)
    g.fill()
  }
  const rim = g.createLinearGradient(0, oy - 24, 0, oy + 24)
  rim.addColorStop(0, '#ffe3b0')
  rim.addColorStop(1, '#e8964a')
  g.fillStyle = rim
  g.strokeStyle = '#8a3a14'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(ox, oy, 80, 24, 0, 0, TAU)
  g.fill()
  g.stroke()
  g.fillStyle = '#2a0f06'
  g.beginPath()
  g.ellipse(ox, oy + 2, 66, 17, 0, 0, TAU)
  g.fill()
  return c
}

// a painted dandiya stick: coloured rod, gilt bands, brass knobs, a shade across its width. Drawn upright; `L` long, `wd` wide.
function stickSprite(colour, L, wd, px = 2) {
  const w = Math.ceil(wd * 1.7 * px)
  const h = Math.ceil(L * px)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  const rw = wd * px
  const x0 = (w - rw) / 2
  const k = rw * 0.78
  g.fillStyle = colour
  g.fillRect(x0, k, rw, h - 2 * k)
  g.fillStyle = '#ffd166'
  for (const [a, b] of [[0.14, 0.2], [0.22, 0.25], [0.46, 0.54], [0.75, 0.78], [0.8, 0.86]]) g.fillRect(x0, h * a, rw, h * (b - a))
  g.globalCompositeOperation = 'source-atop'
  const sh = g.createLinearGradient(x0, 0, x0 + rw, 0)
  sh.addColorStop(0, 'rgba(255,255,255,0.5)')
  sh.addColorStop(0.3, 'rgba(255,255,255,0)')
  sh.addColorStop(1, 'rgba(0,0,0,0.45)')
  g.fillStyle = sh
  g.fillRect(x0, 0, rw, h)
  g.globalCompositeOperation = 'source-over'
  for (const y of [k, h - k]) {
    const br = g.createRadialGradient(w / 2 - k * 0.25, y - k * 0.25, 0, w / 2, y, k)
    br.addColorStop(0, '#fff1c2')
    br.addColorStop(0.5, '#d9a441')
    br.addColorStop(1, '#8a5a12')
    g.fillStyle = br
    g.beginPath()
    g.arc(w / 2, y, k, 0, TAU)
    g.fill()
  }
  return c
}

const PERSP = 0.3 // how flat the floor is
const PTS = 200 // points along one ring
const PETALS = [6, 8, 10, 12, 14, 16, 18, 20, 24]
const CLAPS = [7.4, 7.9, 8.4, 9.3, 9.8, 10.3] // one, two, three, rest, one, two, three

export function playNavratri({ colors, bursts }) {
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

  const palette = (colors?.length ? colors : ['#f97316', '#f8fafc', '#dc2626', '#2563eb', '#facc15', '#16a34a', '#94a3b8', '#7e22ce', '#0d9488']).map(normHex)
  const nine = Array.from({ length: 9 }, (_, i) => palette[i % palette.length])
  const GOLD = '#ffd166'
  const sprites = {}
  for (const c of new Set([...nine, GOLD, '#ffb347', '#ffffff'])) sprites[c] = glow(c)
  const spr = (c) => sprites[c] || sprites[GOLD]
  const diya = diyaSprite()
  const blossoms = MARIGOLDS.map((m) => blossomSprite(m))
  const petalSprites = MARIGOLDS.map((m) => petalSprite(m))

  const total = still ? 4.2 : 12.2
  const LIGHT0 = 1.0
  const BEAT = 0.5
  const BLOOM = LIGHT0 + 8 * BEAT + 0.15 + 1.2 + 0.05
  const STICKS_IN = 6.9
  const STICKS_OUT = 11.3

  // the floor: a circle in perspective, the lamps round its edge, the rangoli inside
  const cx = W / 2
  const cy = H * 0.66
  const rx = Math.min(W * 0.36, R * 0.62)
  const rr = rx * 0.82 // the outermost rangoli ring
  const lampBase = R * 0.1

  const lamps = Array.from({ length: 9 }, (_, i) => {
    const th = Math.PI / 2 + (i / 9) * TAU
    const ds = 0.78 + 0.3 * Math.sin(th) // nearer lamps are bigger
    return { i, th, x: cx + Math.cos(th) * rx, y: cy + Math.sin(th) * rx * PERSP, w: lampBase * ds, c: nine[i], at: LIGHT0 + i * BEAT, ph: rnd(0, TAU), lit: still }
  })
  const behind = lamps.filter((l) => Math.sin(l.th) < 0)
  const front = lamps.filter((l) => Math.sin(l.th) >= 0)

  // rangoli rings: lotus shapes, every other ring offset by half a petal so they interlock
  const rings9 = nine.map((c, i) => {
    const k = PETALS[i]
    const rb = rr * (0.15 + 0.85 * (i / 8))
    const ph = (i % 2) * (Math.PI / k)
    const pts = []
    for (let j = 0; j <= PTS; j += 1) {
      const th = (j / PTS) * TAU
      const r = rb * (0.8 + 0.2 * Math.abs(Math.cos((k * th) / 2 + ph)) ** 1.4)
      pts.push([Math.cos(th) * r, Math.sin(th) * r])
    }
    const tips = []
    for (let n = 0; n < k; n += 1) {
      const th = ((n * Math.PI - ph) * 2) / k
      const idx = Math.round((((th % TAU) + TAU) % TAU) / TAU * PTS) % PTS
      tips.push({ idx, x: pts[idx][0], y: pts[idx][1], at: still ? -9 : -1 })
    }
    return { c, i, rb, pts, tips, core: tint(c, 0.6), start: LIGHT0 + i * BEAT + 0.15, dir: i % 2 ? -1 : 1, spin: 0.09 + 0.018 * i, ang: 0, expand: 0, done: still }
  })

  // marigold garlands: a swag along the top with strands of blossoms hanging from it
  const swag = (x0, x1, seed) => {
    const n = 15
    const strands = []
    for (let i = 1; i < n; i += 1) if (i % 3 === 1) strands.push({ u: i / n, len: rnd(0.07, 0.17) * H, ph: rnd(0, TAU), col: Math.floor(Math.random() * 4) })
    return { x0, x1, n, seed, strands, cols: Array.from({ length: n + 1 }, () => Math.floor(Math.random() * 4)) }
  }
  const garlands = [swag(-8, W * 0.44, 0), swag(W * 0.56, W + 8, 1.7)]

  // dandiya: two pairs, one each side
  const stickL = R * 0.24
  const stickW = R * 0.016
  const pairs = [
    { x: W * 0.13, y: H * 0.56, flip: 1, rods: [stickSprite(nine[2], stickL, stickW), stickSprite(nine[3], stickL, stickW)] },
    { x: W * 0.87, y: H * 0.56, flip: -1, rods: [stickSprite(nine[5], stickL, stickW), stickSprite(nine[7], stickL, stickW)] },
  ]
  const clacked = new Set()

  const guard = makeFrameGuard()
  let thin = false
  let petals = []
  let sparks = []
  let embers = []
  let waves = [] // rings of light spreading across the floor
  let flashed = false
  const motes = Array.from({ length: low ? 8 : 18 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(R * 0.04, R * 0.12), ph: rnd(0, TAU), f: rnd(0.4, 1.1) }))

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
      const sp = rnd(90, 380) * (R / 800) * speed
      sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: rnd(0.5, 1.1), r: rnd(3, 7), c: colour })
    }
  }
  // a point of a rangoli ring on the page
  const floorPt = (L, px, py) => {
    const ca = Math.cos(L.ang)
    const sa = Math.sin(L.ang)
    const sc = 1 + L.expand
    return [cx + (px * ca - py * sa) * sc, cy + (px * sa + py * ca) * sc * PERSP]
  }

  // a lamp and its flame; `flare` is the pop of the moment it catches and the pulse of a clap
  const drawLamp = (l, t, flare, env) => {
    const s = l.w / 160
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = env
    ctx.drawImage(diya, l.x - 100 * s, l.y - 40 * s, 200 * s, 130 * s)
    if (!l.lit) return
    const flick = still ? 1 : 1 + 0.06 * Math.sin(t * 11 + l.ph) + 0.04 * Math.sin(t * 17 + l.ph * 2)
    const k = flare * flick
    ctx.globalCompositeOperation = 'lighter'
    // the oil glows in the lamp's colour
    ctx.globalAlpha = 0.85 * env
    ctx.drawImage(spr(l.c), l.x - l.w * 0.55, l.y - l.w * 0.2, l.w * 1.1, l.w * 0.4)
    ctx.globalAlpha = 0.75 * env
    const gs = l.w * 3 * k
    ctx.drawImage(spr(l.c), l.x - gs / 2, l.y - l.w * 0.45 - gs / 2, gs, gs)
    ctx.globalAlpha = 0.45 * env
    const ws = l.w * 1.4
    ctx.drawImage(spr('#ffb347'), l.x - ws / 2, l.y - l.w * 0.3 - ws / 2, ws, ws)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = env
    const fh = l.w * 0.66 * k
    const fw = l.w * 0.15 * (0.92 + 0.08 * flick)
    const sway = still ? 0 : Math.sin(t * 7 + l.ph) * l.w * 0.03
    const by = l.y - l.w * 0.02
    for (const [sc, c0, c1] of [[1, l.c, tint(l.c, 0.5)], [0.66, '#ffe9a8', '#fff6d8'], [0.34, '#ffffff', '#ffffff']]) {
      const top = by - fh * sc
      const grd = ctx.createLinearGradient(0, top, 0, by)
      grd.addColorStop(0, c0)
      grd.addColorStop(1, c1)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.moveTo(l.x + sway * sc, top)
      ctx.bezierCurveTo(l.x + fw * sc * 1.2, by - fh * sc * 0.45, l.x + fw * sc * 0.9, by, l.x, by)
      ctx.bezierCurveTo(l.x - fw * sc * 0.9, by, l.x - fw * sc * 1.2, by - fh * sc * 0.45, l.x + sway * sc, top)
      ctx.fill()
    }
  }

  // a dandiya stick, held at a pivot, swung out by `open` radians
  const drawStick = (p, sprite, ang, alpha) => {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(p.x, p.y)
    ctx.rotate(ang)
    ctx.translate(0, -stickL * 0.58)
    ctx.drawImage(sprite, -stickW * 0.85, -stickL / 2, stickW * 1.7, stickL)
    ctx.restore()
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
    canvas.style.background = `linear-gradient(180deg, rgba(18,6,44,${0.8 * env}) 0%, rgba(54,12,60,${0.68 * env}) 55%, rgba(104,28,40,${0.56 * env}) 100%)`
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    const build = still ? 1 : clamp((t - LIGHT0) / (BLOOM - LIGHT0))
    const after = still ? 0 : clamp((t - BLOOM) / 1.6)
    const dissolve = still ? 0 : clamp((t - (total - 3.0)) / 2.4)
    let pulse = 0
    if (!still) for (const c of CLAPS) if (t >= c && t - c < 0.5) pulse = Math.max(pulse, (1 - (t - c) / 0.5) ** 2)

    // clap events: sparks off the sticks, a ring of light across the floor
    if (!still) {
      CLAPS.forEach((c, n) => {
        if (t >= c && !clacked.has(n)) {
          clacked.add(n)
          for (const p of pairs) spark(p.x, p.y - stickL * 0.62, 18, pick(nine), 1.1)
          waves.push({ age: 0, life: 1.1, c: GOLD, r0: rr * 0.25, r1: rx * 1.35 })
        }
      })
    }

    ctx.globalCompositeOperation = 'lighter'
    for (const m of motes) {
      ctx.globalAlpha = env * (0.06 + 0.05 * Math.sin(t * m.f + m.ph))
      const s = m.r * 2
      ctx.drawImage(spr(GOLD), m.x - s / 2, m.y - s / 2 + (still ? 0 : Math.sin(t * 0.3 + m.ph) * 8), s, s)
    }

    // the floor, faintly lit
    ctx.globalAlpha = 0.16 * env * (0.3 + 0.7 * build) * (1 + pulse * 0.5)
    const fs = rx * 2.5
    ctx.drawImage(spr('#ffb347'), cx - fs / 2, cy - fs * PERSP * 0.62, fs, fs * PERSP * 1.24)

    // pools of light under each lit lamp
    for (const l of lamps) {
      if (!l.lit) continue
      ctx.globalAlpha = 0.55 * env * (1 + pulse * 0.5)
      const ps = l.w * 3.4
      ctx.drawImage(spr(l.c), l.x - ps / 2, l.y + l.w * 0.1 - ps * PERSP, ps, ps * PERSP * 1.6)
    }

    // the rangoli, drawn on the floor
    for (const L of rings9) {
      const p = still ? 1 : easeInOut(clamp((t - L.start) / 1.2))
      if (p <= 0) continue
      if (!still) {
        L.ang += L.dir * L.spin * (1 + 1.8 * after) * dt
        L.expand = 0.3 * dissolve ** 1.6 * (0.4 + L.i / 12)
      }
      const n = Math.max(2, Math.floor(p * PTS))
      const fade = 1 - dissolve ** 1.4
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1 + L.expand, (1 + L.expand) * PERSP)
      ctx.rotate(L.ang)
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(L.pts[0][0], L.pts[0][1])
      for (let j = 1; j <= n; j += 1) ctx.lineTo(L.pts[j][0], L.pts[j][1])
      ctx.strokeStyle = L.c
      ctx.lineWidth = R * 0.016
      ctx.globalAlpha = 0.14 * env * fade * (1 + 0.7 * after + pulse * 0.8)
      ctx.stroke()
      ctx.lineWidth = R * 0.0065
      ctx.globalAlpha = 0.45 * env * fade * (1 + pulse * 0.4)
      ctx.stroke()
      ctx.strokeStyle = L.core
      ctx.lineWidth = R * 0.0024
      ctx.globalAlpha = 0.95 * env * fade
      ctx.stroke()
      ctx.restore()

      if (p < 1) {
        const [hx, hy] = floorPt(L, L.pts[n][0], L.pts[n][1])
        ctx.globalAlpha = env
        const hs = R * 0.06
        ctx.drawImage(spr(L.c), hx - hs / 2, hy - hs / 2, hs, hs)
        const ws = R * 0.024
        ctx.drawImage(spr('#ffffff'), hx - ws / 2, hy - ws / 2, ws, ws)
      } else if (!L.done) {
        L.done = true
        waves.push({ age: 0, life: 0.9, c: L.c, r0: L.rb * 0.9, r1: L.rb * 1.45 })
      }

      for (const tp of L.tips) {
        if (tp.at < 0 && tp.at > -5 && n >= tp.idx) tp.at = t
        if (tp.at < 0 && tp.at > -5) continue
        const age = still ? 9 : t - tp.at
        const flare = 1 + 1.4 * Math.max(0, 1 - age / 0.5) ** 2
        const [x, y] = floorPt(L, tp.x, tp.y)
        ctx.globalAlpha = env * fade * 0.8
        const ls = R * 0.02 * flare
        ctx.drawImage(spr(GOLD), x - ls / 2, y - ls / 2, ls, ls)
        ctx.globalAlpha = env * fade
        const cs = R * 0.006 * flare
        ctx.drawImage(spr('#ffffff'), x - cs / 2, y - cs / 2, cs, cs)
      }
    }

    // the heart of the rangoli
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = env * clamp((t - 0.6) / 0.6) * (0.85 + pulse * 0.4)
    const bs = R * 0.1
    ctx.drawImage(spr(GOLD), cx - bs / 2, cy - bs * PERSP, bs, bs * PERSP * 2)

    // the bloom
    if (!still && !flashed && t >= BLOOM) {
      flashed = true
      waves.push({ age: 0, life: 1.3, c: '#ffffff', r0: rr * 0.3, r1: rx * 1.7 })
      waves.push({ age: 0, life: 1.7, c: GOLD, r0: rr * 0.2, r1: rx * 2.1 })
      for (const c of nine) spark(cx, cy, 6, c, 1.3)
    }
    if (!still && t >= BLOOM) {
      const f = Math.max(0, 1 - (t - BLOOM) / 0.9) ** 2
      ctx.globalAlpha = 0.55 * f * env
      const bw = rx * 3.2
      ctx.drawImage(spr(GOLD), cx - bw / 2, cy - bw * PERSP * 0.8, bw, bw * PERSP * 1.6)
    }

    // spreading rings of light on the floor
    waves = waves.filter((w) => {
      w.age += dt
      const k = w.age / w.life
      if (k >= 1) return false
      const e = 1 - (1 - k) ** 2
      ctx.globalAlpha = (1 - k) * 0.65 * env
      ctx.strokeStyle = w.c
      ctx.lineWidth = R * 0.006 * (1 - k) + 1
      ctx.beginPath()
      ctx.ellipse(cx, cy, w.r0 + (w.r1 - w.r0) * e, (w.r0 + (w.r1 - w.r0) * e) * PERSP, 0, 0, TAU)
      ctx.stroke()
      return true
    })

    // the lamps, lighting one by one; the far ones first so the near ones stand in front
    for (const l of lamps) {
      if (!l.lit && t >= l.at) {
        l.lit = true
        if (!still) {
          spark(l.x, l.y - l.w * 0.4, 10, l.c)
          waves.push({ age: 0, life: 0.8, c: l.c, r0: l.w * 0.4, r1: l.w * 1.6 })
        }
      }
      l.flare = l.lit && !still ? 1 + 0.7 * Math.max(0, 1 - (t - l.at) / 0.45) ** 2 + pulse * 0.45 : 1
    }
    for (const l of behind) drawLamp(l, t, l.flare, env)
    for (const l of front) drawLamp(l, t, l.flare, env)
    ctx.globalCompositeOperation = 'source-over'

    // marigold petals drifting down
    if (!still && t > 4.6 && t < total - 2.4) {
      let c = (thin || low ? 6 : 14) * (bursts / 8) * dt
      while (Math.random() < c) {
        if (petals.length < (low ? 80 : 180)) petals.push({ x: rnd(0, W), y: -20, vx: rnd(-16, 16), vy: rnd(30, 70), rot: rnd(0, TAU), spin: rnd(-3, 3), flip: rnd(0, TAU), fs: rnd(2, 6), s: rnd(0.7, 1.15), spr: pick(petalSprites), life: 0, max: rnd(4.5, 7), ph: rnd(0, TAU) })
        c -= 1
      }
    }
    petals = petals.filter((p) => {
      p.life += dt
      if (p.life > p.max || p.y > H + 30) return false
      p.vy = Math.min(p.vy + 50 * dt, 110)
      p.x += p.vx * dt + Math.sin(p.life * 2 + p.ph) * 34 * dt
      p.y += p.vy * dt
      p.rot += p.spin * dt
      p.flip += p.fs * dt
      ctx.save()
      ctx.globalAlpha = Math.min(1, (p.max - p.life) * 1.4) * env
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(Math.cos(p.flip), 1)
      const pw = R * 0.015 * p.s
      ctx.drawImage(p.spr, -pw / 2, -pw * 1.1, pw, pw * 2.2)
      ctx.restore()
      return true
    })

    // garlands drop in from the top and sway
    if (!still && t > BLOOM - 0.4) {
      const k = easeOutBack(clamp((t - (BLOOM - 0.4)) / 1.2))
      const fade = clamp((total - 1.3 - t) / 0.9)
      ctx.save()
      ctx.globalAlpha = env * fade
      ctx.translate(0, -H * 0.22 * (1 - k))
      const bsz = R * 0.052
      for (const g of garlands) {
        const sag = H * 0.085 * (1 + 0.03 * Math.sin(t * 1.6 + g.seed))
        const at = (u) => [g.x0 + (g.x1 - g.x0) * u, -8 + sag * 4 * u * (1 - u)]
        ctx.strokeStyle = 'rgba(90,40,10,0.75)'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i <= 24; i += 1) {
          const [x, y] = at(i / 24)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        for (const s of g.strands) {
          const [sx, sy] = at(s.u)
          const sw = Math.sin(t * 1.4 + s.ph) * 0.045
          const m = Math.max(2, Math.round(s.len / (bsz * 0.78)))
          ctx.strokeStyle = 'rgba(90,40,10,0.6)'
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(sx + sw * s.len, sy + s.len)
          ctx.stroke()
          for (let j = 1; j <= m; j += 1) {
            const u = j / m
            const bz = bsz * (0.78 - 0.25 * u)
            ctx.drawImage(blossoms[(s.col + j) % 4], sx + sw * s.len * u - bz / 2, sy + s.len * u - bz / 2, bz, bz)
          }
        }
        for (let i = 0; i <= g.n; i += 1) {
          const [x, y] = at(i / g.n)
          ctx.drawImage(blossoms[g.cols[i]], x - bsz / 2, y - bsz / 2 + bsz * 0.15, bsz, bsz)
        }
      }
      ctx.restore()
    }

    // dandiya: each pair swings together and clacks on the beat
    if (!still && t > STICKS_IN - 0.2 && t < STICKS_OUT + 0.6) {
      const near = Math.min(...CLAPS.map((c) => Math.abs(t - c)))
      const apart = easeInOut(clamp(near / 0.26))
      const appear = clamp((t - STICKS_IN) / 0.5) * clamp((STICKS_OUT + 0.6 - t) / 0.6)
      for (const p of pairs) {
        const open = 0.06 + apart * 0.62
        drawStick(p, p.rods[0], p.flip * (-open - 0.08), env * appear)
        drawStick(p, p.rods[1], p.flip * (open - 0.08), env * appear)
      }
    }

    // golden embers rise from the rangoli once it is whole
    if (!still && t > BLOOM && t < total - 2) {
      let c = (thin || low ? 8 : 20) * (bursts / 8) * dt
      while (Math.random() < c) {
        const L = rings9[Math.floor(Math.random() * 9)]
        const [px, py] = L.pts[Math.floor(Math.random() * PTS)]
        const [x, y] = floorPt(L, px, py)
        if (embers.length < (low ? 70 : 150)) embers.push({ x, y, vx: rnd(-14, 14), vy: -rnd(30, 90), life: 0, max: rnd(1.8, 3.4), r: rnd(R * 0.006, R * 0.015), c: Math.random() < 0.6 ? GOLD : pick(nine), ph: rnd(0, TAU) })
        c -= 1
      }
    }
    ctx.globalCompositeOperation = 'lighter'
    embers = embers.filter((e) => {
      e.life += dt
      const k = e.life / e.max
      if (k >= 1) return false
      e.x += (e.vx + Math.sin(e.life * 2 + e.ph) * 12) * dt
      e.y += e.vy * dt
      ctx.globalAlpha = (1 - k) * (0.55 + 0.45 * Math.sin(e.life * 13 + e.ph)) * env
      const s = e.r * 2.6
      ctx.drawImage(spr(e.c), e.x - s / 2, e.y - s / 2, s, s)
      return true
    })

    // sparks, as short bright streaks with a soft head
    sparks = sparks.filter((s) => {
      s.life += dt
      const k = s.life / s.max
      if (k >= 1) return false
      s.vx *= Math.exp(-2.4 * dt)
      s.vy = s.vy * Math.exp(-2.4 * dt) + 180 * dt
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
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
