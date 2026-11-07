import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'

// "Break the handi" (Dahi Handi), with no figures in it. A midnight-blue night under a large pale moon, a peacock feather swaying at each edge and
// a few notes of a flute drifting up. A clay pot of butter hangs from a rope high above. Below it a pyramid builds out of glowing orbs, tier by
// tier, five then four then three then two, each tier rising to stand on the one beneath, the way the teams stack. Then the last orb leaps,
// strikes the pot, and it breaks: shards fly, butter sprays and rains down, petals shower, and every orb in the pyramid flares and throws sparks.
// One canvas that exists only while the show plays; nothing is loaded until a button is pressed. Kind to slow machines: fewer drops, petals and
// stars on a low-power device and when frames run slow, an early finish when very slow. With reduced motion the scene simply stands, pot hung
// and pyramid built, and fades in and out.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
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

// a peacock feather: a curved quill, fine barbs shading gold to green to teal, and the eye near the top
function featherSprite() {
  const w = 150
  const h = 380
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  const P0 = [74, 372]
  const P1 = [58, 250]
  const P2 = [86, 150]
  const P3 = [76, 40]
  const at = (u) => {
    const v = 1 - u
    return [v * v * v * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u * u * u * P3[0], v * v * v * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u * u * u * P3[1]]
  }
  g.lineCap = 'round'
  const lerp = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k))
  const gold = [201, 162, 39]
  const green = [60, 150, 70]
  const teal = [20, 140, 140]
  for (let i = 0; i <= 150; i += 1) {
    const u = 0.1 + (i / 150) * 0.88
    const [x, y] = at(u)
    const [x2, y2] = at(Math.min(1, u + 0.01))
    const along = Math.atan2(y2 - y, x2 - x)
    const col = u < 0.55 ? lerp(gold, green, u / 0.55) : lerp(green, teal, (u - 0.55) / 0.45)
    const env = Math.sin(Math.PI * clamp((u - 0.05) / 0.95)) ** 0.6
    for (const s of [-1, 1]) {
      const len = (16 + 40 * env) * (0.85 + Math.random() * 0.3)
      const ang = along + s * (Math.PI / 2 - 0.55 - 0.15 * u)
      g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.78)`
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
      g.stroke()
    }
  }
  g.strokeStyle = '#6f7d2e'
  g.lineWidth = 2.4
  g.beginPath()
  g.moveTo(P0[0], P0[1])
  g.bezierCurveTo(P1[0], P1[1], P2[0], P2[1], P3[0], P3[1])
  g.stroke()
  // the eye
  const [ex, ey] = at(0.8)
  for (const [rx, ry, col] of [[27, 40, '#d4a72c'], [22, 33, '#3f9a4a'], [17, 26, '#0f8aa0'], [11, 17, '#1d4ed8'], [5, 8, '#0b1a4a']]) {
    g.fillStyle = col
    g.beginPath()
    g.ellipse(ex, ey, rx, ry, 0.08, 0, TAU)
    g.fill()
  }
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.ellipse(ex - 4, ey - 8, 2.5, 4, 0, 0, TAU)
  g.fill()
  return c
}

// a clay pot of butter: round body with a painted band, a narrow neck, a rim, and a yellow cloth tied over the mouth. The neck's top is at (110, 24).
function potSprite() {
  const c = document.createElement('canvas')
  c.width = 220
  c.height = 250
  const g = c.getContext('2d')
  const body = g.createRadialGradient(80, 120, 10, 110, 150, 110)
  body.addColorStop(0, '#f0a05a')
  body.addColorStop(0.5, '#cf6a2e')
  body.addColorStop(1, '#7a2c10')
  g.fillStyle = body
  g.beginPath()
  g.moveTo(88, 40)
  g.bezierCurveTo(90, 70, 24, 80, 24, 150)
  g.bezierCurveTo(24, 215, 70, 238, 110, 238)
  g.bezierCurveTo(150, 238, 196, 215, 196, 150)
  g.bezierCurveTo(196, 80, 130, 70, 132, 40)
  g.closePath()
  g.fill()
  // a painted band of white dots between two red lines
  g.strokeStyle = '#8f1d14'
  g.lineWidth = 4
  for (const y of [128, 164]) {
    g.beginPath()
    g.ellipse(110, y, y === 128 ? 80 : 84, 12, 0, 0.05 * Math.PI, 0.95 * Math.PI)
    g.stroke()
  }
  g.fillStyle = '#fff1cf'
  for (let i = 0; i < 12; i += 1) {
    const a = 0.1 * Math.PI + (i / 11) * 0.8 * Math.PI
    g.beginPath()
    g.arc(110 + Math.cos(a) * 80, 146 + Math.sin(a) * 15, 4.2, 0, TAU)
    g.fill()
  }
  // zigzag below
  g.strokeStyle = '#fff1cf'
  g.lineWidth = 3
  g.beginPath()
  for (let i = 0; i <= 14; i += 1) {
    const a = 0.1 * Math.PI + (i / 14) * 0.8 * Math.PI
    const x = 110 + Math.cos(a) * 86
    const y = 188 + Math.sin(a) * 14 + (i % 2 ? 6 : -4)
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.stroke()
  // highlight and shade
  const side = g.createLinearGradient(24, 0, 196, 0)
  side.addColorStop(0, 'rgba(255,230,190,0.35)')
  side.addColorStop(0.35, 'rgba(255,230,190,0)')
  side.addColorStop(0.7, 'rgba(0,0,0,0)')
  side.addColorStop(1, 'rgba(30,5,0,0.4)')
  g.fillStyle = side
  g.beginPath()
  g.moveTo(88, 40)
  g.bezierCurveTo(90, 70, 24, 80, 24, 150)
  g.bezierCurveTo(24, 215, 70, 238, 110, 238)
  g.bezierCurveTo(150, 238, 196, 215, 196, 150)
  g.bezierCurveTo(196, 80, 130, 70, 132, 40)
  g.closePath()
  g.fill()
  // rim, neck and cloth
  const rim = g.createLinearGradient(0, 28, 0, 56)
  rim.addColorStop(0, '#f0a05a')
  rim.addColorStop(1, '#a8481c')
  g.fillStyle = rim
  g.beginPath()
  g.ellipse(110, 42, 30, 12, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#ffd34d'
  g.beginPath()
  g.moveTo(80, 36)
  g.quadraticCurveTo(110, 4, 140, 36)
  g.quadraticCurveTo(110, 48, 80, 36)
  g.fill()
  g.fillStyle = '#e6a800'
  g.beginPath()
  g.arc(110, 26, 6, 0, TAU)
  g.fill()
  return c
}

const MOON = (() => {
  const c = document.createElement('canvas')
  c.width = 220
  c.height = 220
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(95, 90, 10, 110, 110, 100)
  grd.addColorStop(0, '#fffdf0')
  grd.addColorStop(1, '#e6dfc3')
  g.fillStyle = grd
  g.beginPath()
  g.arc(110, 110, 100, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(160,155,130,0.22)'
  for (const [x, y, r] of [[80, 85, 22], [140, 130, 28], [100, 150, 14], [145, 75, 12]]) {
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
    g.fill()
  }
  return c
})()

export function playJanmashtami({ colors, bursts }) {
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

  const palette = (colors?.length ? colors : ['#ffd166', '#fdf6e3', '#38bdf8', '#f472b6']).map(normHex)
  const col = (i) => palette[i % palette.length]
  const sprites = {}
  for (const c of new Set([...palette, '#ffffff', '#ffd166'])) sprites[c] = glow(c)
  const spr = (c) => sprites[c] || sprites['#ffd166']
  const feather = featherSprite()
  const pot = potSprite()
  const BUTTER = col(1)
  const PETALS = [col(3), col(0), '#fb7185', '#ffd166']

  const total = still ? 4.2 : 10.8
  const POT_IN = 0.9
  const PYR0 = 2.0
  const TIER = 0.55
  const LEAP = PYR0 + 4 * TIER + 0.9 // the top orb leaps
  const HIT = LEAP + 0.5 // and strikes

  const cx = W / 2
  const potW = R * 0.22
  const potY = H * 0.3
  const ropeTop = -20
  const ropeLen = potY - potW * 0.5 - ropeTop
  const orbR = R * 0.032
  const baseY = H * 0.86
  const apexY = potY + potW * 0.62 + R * 0.07
  const dy = (baseY - apexY) / 4
  const dx = dy * 0.95

  // the pyramid: five, four, three, two, one; each tier is on the one beneath
  const orbs = []
  for (let ti = 0; ti < 5; ti += 1) {
    const n = 5 - ti
    for (let i = 0; i < n; i += 1) {
      orbs.push({ tx: cx + (i - (n - 1) / 2) * dx, ty: baseY - ti * dy, at: PYR0 + ti * TIER + i * 0.06, c: col(i + ti), ph: rnd(0, TAU), tier: ti, apex: ti === 4, x: 0, y: 0, k: 0 })
    }
  }
  const apex = orbs[orbs.length - 1]

  const stars = Array.from({ length: low ? 36 : 80 }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.7), r: rnd(0.6, 2), ph: rnd(0, TAU), f: rnd(0.8, 2.4) }))

  const guard = makeFrameGuard()
  let thin = false
  let sparks = []
  let drops = []
  let shards = []
  let petals = []
  let notes = []
  let waves = []
  let broken = false
  let trail = []
  let noteClock = 0

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

  const drawOrb = (o, t, env, flare) => {
    const bob = still ? 0 : Math.sin(t * 2 + o.ph) * R * 0.002
    const x = o.x
    const y = o.y + bob
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = env * 0.8
    const gs = orbR * 5 * flare
    ctx.drawImage(spr(o.c), x - gs / 2, y - gs / 2, gs, gs)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = env
    const body = ctx.createRadialGradient(x - orbR * 0.3, y - orbR * 0.35, orbR * 0.1, x, y, orbR)
    body.addColorStop(0, '#ffffff')
    body.addColorStop(0.45, tint(o.c, 0.35))
    body.addColorStop(1, o.c)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(x, y, orbR, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x, y, orbR * 1.18, 0, TAU)
    ctx.stroke()
  }

  const note = (x, y, s, c) => {
    ctx.fillStyle = c
    ctx.strokeStyle = c
    ctx.lineWidth = Math.max(1.2, s * 0.12)
    ctx.beginPath()
    ctx.ellipse(x, y, s * 0.5, s * 0.36, -0.45, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + s * 0.42, y - s * 0.1)
    ctx.lineTo(x + s * 0.42, y - s * 1.7)
    ctx.quadraticCurveTo(x + s * 1.1, y - s * 1.4, x + s * 0.95, y - s * 0.8)
    ctx.stroke()
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
    canvas.style.background = `linear-gradient(180deg, rgba(6,10,40,${0.84 * env}) 0%, rgba(16,22,66,${0.74 * env}) 55%, rgba(40,26,70,${0.6 * env}) 100%)`
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // the sky: stars and a large moon
    for (const s of stars) {
      ctx.globalAlpha = env * (0.45 + 0.45 * Math.sin(t * s.f + s.ph))
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, TAU)
      ctx.fill()
    }
    const mk = still ? 1 : easeOut(clamp((t - 0.2) / 1.2))
    const mx = W * 0.8
    const my = H * 0.2 + (1 - mk) * H * 0.06
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = env * mk * 0.5
    const hs = R * 0.7
    ctx.drawImage(spr('#fdf6e3'), mx - hs / 2, my - hs / 2, hs, hs)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = env * mk
    ctx.drawImage(MOON, mx - R * 0.09, my - R * 0.09, R * 0.18, R * 0.18)

    // a peacock feather at each edge, swaying
    const fk = still ? 1 : easeOut(clamp((t - 0.5) / 1.2))
    for (const s of [-1, 1]) {
      const fx = s < 0 ? R * 0.05 : W - R * 0.05
      const fh = R * 0.5 * fk
      ctx.save()
      ctx.globalAlpha = env * fk
      ctx.translate(fx, H + 6)
      ctx.rotate(s * -0.22 + (still ? 0 : Math.sin(t * 0.9 + s) * 0.04))
      ctx.scale(s, 1)
      ctx.drawImage(feather, -fh * 0.2, -fh, fh * 0.4, fh)
      ctx.restore()
    }

    // the rope and the pot, swinging a little
    const potK = still ? 1 : easeOutBack(clamp((t - POT_IN) / 0.9))
    if (!broken && potK > 0) {
      const a = still ? 0 : Math.sin(t * 1.5) * 0.045 * (0.5 + Math.min(1, Math.max(0, t - PYR0) / 3))
      const len = ropeLen * potK
      const px = cx + Math.sin(a) * len
      const py = ropeTop + Math.cos(a) * len + potW * 0.5
      ctx.globalAlpha = env
      ctx.strokeStyle = '#d9b77a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx, ropeTop)
      ctx.lineTo(px, py - potW * 0.5)
      ctx.stroke()
      ctx.save()
      ctx.translate(px, py - potW * 0.5)
      ctx.rotate(a)
      ctx.drawImage(pot, -potW / 2, -potW * 0.1, potW, potW * (250 / 220))
      ctx.restore()
      apex.potX = px
      apex.potY = py + potW * 0.1
    } else if (!broken) {
      apex.potX = cx
      apex.potY = potY
    }

    // the pyramid builds, tier by tier
    for (const o of orbs) {
      let k = still ? 1 : easeOutBack(clamp((t - o.at) / 0.7))
      if (o.apex && !still && t >= LEAP) {
        const u = easeInOut(clamp((t - LEAP) / (HIT - LEAP)))
        o.x = o.tx + (cx - o.tx) * u
        o.y = o.ty + ((apex.potY || potY) + potW * 0.4 - o.ty) * u - Math.sin(u * Math.PI) * R * 0.05
        k = 1
        if (t < HIT) trail.push({ x: o.x, y: o.y, t })
      } else {
        o.x = o.tx
        o.y = baseY + R * 0.4 + (o.ty - baseY - R * 0.4) * clamp(k, 0, 1.15)
      }
      if (k <= 0) continue
      if (o.apex && broken) continue
      const flare = !still && t >= HIT ? 1 + 0.8 * Math.max(0, 1 - (t - HIT) / 0.6) ** 2 : 1
      drawOrb(o, t, env * clamp(k * 2), flare)
    }
    // a bright trail behind the leaping orb
    trail = trail.filter((p) => t - p.t < 0.45)
    ctx.globalCompositeOperation = 'lighter'
    for (const p of trail) {
      const k = 1 - (t - p.t) / 0.45
      ctx.globalAlpha = env * k * 0.7
      const s = orbR * 3 * k
      ctx.drawImage(spr(apex.c), p.x - s / 2, p.y - s / 2, s, s)
    }
    ctx.globalCompositeOperation = 'source-over'

    // the break
    if (!still && !broken && t >= HIT) {
      broken = true
      const bx = apex.potX ?? cx
      const by = (apex.potY ?? potY) + potW * 0.4
      waves.push({ x: bx, y: by, age: 0, life: 0.9, c: '#ffffff', r1: R * 0.45 })
      waves.push({ x: bx, y: by, age: 0, life: 1.3, c: col(0), r1: R * 0.7 })
      spark(bx, by, 30, col(0), 1.6)
      spark(bx, by, 14, '#ffffff', 1.3)
      const n = low ? 14 : 24
      for (let i = 0; i < n; i += 1) {
        const a = rnd(0, TAU)
        const sp = rnd(120, 520) * (R / 800)
        const corners = pick([3, 4, 4, 5])
        const pts = Array.from({ length: corners }, (_, j) => {
          const aa = (j / corners) * TAU + rnd(-0.4, 0.4)
          const rr = R * rnd(0.01, 0.034)
          return [Math.cos(aa) * rr, Math.sin(aa) * rr]
        })
        shards.push({ x: bx + rnd(-potW * 0.3, potW * 0.3), y: by + rnd(-potW * 0.3, potW * 0.2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140, rot: rnd(0, TAU), spin: rnd(-8, 8), pts, c: pick(['#d9783a', '#b9542a', '#8c3a14', '#f0a05a']), band: Math.random() < 0.3 })
      }
      const dn = low ? 36 : 70
      for (let i = 0; i < dn; i += 1) {
        const a = rnd(-Math.PI, 0) + rnd(-0.8, 0.8)
        const sp = rnd(100, 460) * (R / 800)
        drops.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: rnd(R * 0.004, R * 0.014), life: 0, max: rnd(2.4, 4.4) })
      }
      for (const o of orbs) if (!o.apex) spark(o.x, o.y, 8, o.c, 1.1)
    }
    // butter keeps falling for a while after
    if (!still && broken && t < HIT + 1.8) {
      let c = (thin ? 14 : 30) * dt
      while (Math.random() < c) {
        drops.push({ x: cx + rnd(-potW * 0.9, potW * 0.9), y: potY + rnd(-potW * 0.2, potW * 0.2), vx: rnd(-30, 30), vy: rnd(20, 80), r: rnd(R * 0.004, R * 0.011), life: 0, max: rnd(2, 3.4) })
        c -= 1
      }
    }
    // the rope end, left swinging
    if (broken && !still) {
      const k = clamp(1 - (t - HIT) / 1.6)
      if (k > 0) {
        ctx.globalAlpha = env * k
        ctx.strokeStyle = '#d9b77a'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(cx, ropeTop)
        ctx.lineTo(cx + Math.sin(t * 5) * 6 * k, ropeTop + ropeLen * 0.7)
        ctx.stroke()
      }
    }

    // shards
    shards = shards.filter((s) => {
      s.vy += 900 * (R / 800) * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.rot += s.spin * dt
      if (s.y > H + 60) return false
      ctx.save()
      ctx.globalAlpha = env
      ctx.translate(s.x, s.y)
      ctx.rotate(s.rot)
      ctx.fillStyle = s.c
      ctx.beginPath()
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = s.band ? '#fff1cf' : 'rgba(255,220,170,0.4)'
      ctx.lineWidth = s.band ? 2 : 1
      ctx.stroke()
      ctx.restore()
      return true
    })

    // butter: cream drops with a bright edge
    drops = drops.filter((d) => {
      d.life += dt
      if (d.life > d.max || d.y > H + 20) return false
      d.vy += 700 * (R / 800) * dt
      d.vx *= Math.exp(-0.8 * dt)
      d.x += d.vx * dt
      d.y += d.vy * dt
      const k = clamp((d.max - d.life) / 0.6)
      ctx.globalAlpha = env * k
      const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(1, BUTTER)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(d.x, d.y, d.r * 0.85, d.r * (1 + Math.min(0.6, Math.abs(d.vy) / 900)), 0, 0, TAU)
      ctx.fill()
      return true
    })

    // petals showering
    if (!still && broken && t < total - 2.5) {
      let c = (thin || low ? 8 : 18) * (bursts / 8) * dt
      while (Math.random() < c) {
        if (petals.length < (low ? 70 : 150)) petals.push({ x: rnd(0, W), y: -20, vx: rnd(-14, 14), vy: rnd(40, 90), rot: rnd(0, TAU), spin: rnd(-3, 3), flip: rnd(0, TAU), fs: rnd(2, 6), w: rnd(R * 0.01, R * 0.017), c: pick(PETALS), life: 0, max: rnd(4, 6.5), ph: rnd(0, TAU) })
        c -= 1
      }
    }
    petals = petals.filter((p) => {
      p.life += dt
      if (p.life > p.max || p.y > H + 30) return false
      p.vy = Math.min(p.vy + 50 * dt, 120)
      p.x += p.vx * dt + Math.sin(p.life * 2 + p.ph) * 32 * dt
      p.y += p.vy * dt
      p.rot += p.spin * dt
      p.flip += p.fs * dt
      ctx.save()
      ctx.globalAlpha = Math.min(1, (p.max - p.life) * 1.4) * env
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(Math.cos(p.flip), 1)
      ctx.fillStyle = p.c
      ctx.beginPath()
      ctx.moveTo(0, -p.w * 1.1)
      ctx.bezierCurveTo(p.w * 0.8, -p.w * 0.4, p.w * 0.6, p.w * 0.7, 0, p.w * 1.1)
      ctx.bezierCurveTo(-p.w * 0.6, p.w * 0.7, -p.w * 0.8, -p.w * 0.4, 0, -p.w * 1.1)
      ctx.fill()
      ctx.restore()
      return true
    })

    // notes of a flute rising from the left feather
    if (!still && t > 1.4 && t < total - 2.4) {
      noteClock += dt
      if (noteClock > (thin ? 1.1 : 0.7)) {
        noteClock = 0
        notes.push({ x: R * 0.09, y: H * 0.7, life: 0, max: rnd(3.2, 4.4), s: rnd(R * 0.014, R * 0.022), ph: rnd(0, TAU), c: pick([col(0), col(2), col(1)]) })
      }
    }
    notes = notes.filter((n) => {
      n.life += dt
      if (n.life > n.max) return false
      const k = n.life / n.max
      const x = n.x + k * R * 0.18 + Math.sin(n.life * 2 + n.ph) * R * 0.02
      const y = n.y - k * H * 0.4
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = env * Math.sin(Math.PI * k) * 0.5
      const gs = n.s * 5
      ctx.drawImage(spr(n.c), x - gs / 2, y - gs / 2, gs, gs)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = env * Math.sin(Math.PI * k)
      note(x, y, n.s, n.c)
      return true
    })

    // rings and sparks
    ctx.globalCompositeOperation = 'lighter'
    waves = waves.filter((w) => {
      w.age += dt
      const k = w.age / w.life
      if (k >= 1) return false
      const e = 1 - (1 - k) ** 2
      ctx.globalAlpha = (1 - k) * 0.6 * env
      ctx.strokeStyle = w.c
      ctx.lineWidth = R * 0.006 * (1 - k) + 1
      ctx.beginPath()
      ctx.arc(w.x, w.y, w.r1 * e, 0, TAU)
      ctx.stroke()
      return true
    })
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
