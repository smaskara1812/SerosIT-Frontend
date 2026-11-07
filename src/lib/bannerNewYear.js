import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'
import { fireworksLength, playFireworks } from '@/lib/bannerFireworks'

// "Drop the ball": the page dims to a night sky and a glittering ball slides down a pole while a big number counts 5, 4, 3, 2, 1 inside a
// sweeping ring. At zero the ball flashes, a ring of light spreads out, the fireworks begin (the same engine as the Diwali show, in champagne
// colours), confetti shoots from both bottom corners and balloons float up. For the rest of the show the mouse leaves a sparkler trail.
// No year is written anywhere: the banner's own greeting says whatever it says.
// One canvas that exists only while the show plays (the fireworks run on a second one inside it). Nothing is loaded until a button is
// pressed. Kind to slow machines: less confetti and a thinner sparkler on a low-power device and when frames run slow, an early finish when
// they run very slow. With reduced motion the ball does not move, the numbers simply change, there is no confetti and no mouse trail.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const COUNT = 5 // seconds of countdown

function glow(colour, size = 64) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `${colour}ff`)
  grd.addColorStop(0.3, `${colour}aa`)
  grd.addColorStop(1, `${colour}00`)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  return c
}

// The ball: a silver sphere of small mirror tiles, some catching the light.
function ballSprite(r) {
  const size = Math.ceil(r * 2.4)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const m = size / 2
  g.save()
  g.beginPath()
  g.arc(m, m, r, 0, TAU)
  g.clip()
  const base = g.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r)
  base.addColorStop(0, '#ffffff')
  base.addColorStop(0.45, '#cfd8e8')
  base.addColorStop(1, '#6f7c96')
  g.fillStyle = base
  g.fillRect(0, 0, size, size)
  const tile = r / 5
  for (let y = -r; y < r; y += tile) {
    for (let x = -r; x < r; x += tile) {
      const shade = Math.random()
      g.fillStyle = shade > 0.8 ? 'rgba(255,255,255,0.65)' : shade < 0.3 ? 'rgba(40,52,82,0.28)' : 'rgba(255,255,255,0.08)'
      g.fillRect(m + x + 1, m + y + 1, tile - 2, tile - 2)
    }
  }
  g.restore()
  return c
}

// Confetti pieces and balloons are plain shapes drawn each frame, so there is nothing else to load.
export function playNewYear({ colors, bursts }) {
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

  const palette = (colors?.length ? colors : ['#ffd24a', '#dfe6f2', '#ffffff', '#5aa9ff']).map((c) => c.toLowerCase())
  const gold = palette[0]
  const party = [...palette, '#ff4d8d', '#4ade80']
  const sparkGlow = glow(gold)
  const whiteGlow = glow('#ffffff')
  const ballR = R * 0.085
  const ball = ballSprite(ballR)
  const poleX = W / 2
  const restY = H * 0.36 // where the ball stops
  const total = COUNT + fireworksLength(bursts, still) + 0.3

  const guard = makeFrameGuard()
  let thin = false
  let confetti = []
  let balloons = []
  let sparks = []
  let waves = []
  let fired = false
  let inner = null
  let px = -1
  let py = -1
  let pxPrev = -1
  let pyPrev = -1

  const onMove = (e) => {
    px = e.clientX
    py = e.clientY
  }
  if (!still) window.addEventListener('pointermove', onMove, { passive: true })

  const end = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    if (inner) inner()
    canvas.remove()
    endShow(end)
  }
  startShow(end)

  const popConfetti = () => {
    const per = (thin || low ? 45 : 80)
    for (const side of [0, 1]) {
      const x0 = side ? W + 6 : -6
      for (let i = 0; i < per; i += 1) {
        const a = -Math.PI / 2 + (side ? -1 : 1) * rnd(0.12, 0.85)
        const sp = rnd(0.7, 1.35) * R * 1.05
        confetti.push({ x: x0, y: H + 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rnd(0, TAU), spin: rnd(-9, 9), flip: rnd(0, TAU), flipSpeed: rnd(4, 12), w: rnd(6, 11), h: rnd(10, 18), c: pick(party), life: 0, max: rnd(3.4, 5.2) })
      }
    }
    for (let i = 0; i < (thin || low ? 4 : 7); i += 1) {
      balloons.push({ x: rnd(0.08, 0.92) * W, y: H + 40 + rnd(0, 120), vy: rnd(70, 120), ph: rnd(0, TAU), c: pick(party), r: rnd(R * 0.035, R * 0.05), delay: rnd(0, 1.4), life: 0 })
    }
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

    const env = Math.max(0, Math.min(1, t / 0.5, (total - t) / 1.4))
    canvas.style.background = `linear-gradient(180deg, rgba(5,9,34,${0.62 * env}) 0%, rgba(12,26,66,${0.55 * env}) 100%)`
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // ── the ball and the count ────────────────────────────────────────────────────────────────────────────────────────────────────
    const countdown = t < COUNT
    const fade = countdown ? 1 : Math.max(0, 1 - (t - COUNT - 1.2) / 0.9)
    if (fade > 0) {
      const u = Math.min(1, t / COUNT)
      const ease = still ? 1 : u * u * (3 - 2 * u) * 0.35 + u * 0.65 // slow start, a steady fall, a gentle stop
      const by = still ? restY : -ballR * 1.4 + (restY + ballR * 1.4) * ease
      ctx.globalAlpha = fade * env
      ctx.strokeStyle = 'rgba(210,220,240,0.9)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(poleX, 0)
      ctx.lineTo(poleX, by - ballR)
      ctx.stroke()
      ctx.globalCompositeOperation = 'lighter'
      const halo = ballR * (4.2 + (countdown ? 0 : Math.max(0, 1 - (t - COUNT) * 2)) * 4)
      ctx.globalAlpha = fade * env * 0.7
      ctx.drawImage(whiteGlow, poleX - halo / 2, by - halo / 2, halo, halo)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = fade * env
      ctx.drawImage(ball, poleX - ball.width / 2, by - ball.height / 2)
      // glints on the tiles
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 4; i += 1) {
        const a = (t * 0.7 + i * 1.7) % TAU
        const gx = poleX + Math.cos(a) * ballR * 0.7 * Math.abs(Math.sin(i * 2.3 + t))
        const gy = by + Math.sin(a * 1.3) * ballR * 0.7
        const tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 3)
        ctx.globalAlpha = fade * env * tw
        const q = ballR * 0.34 * tw
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(gx, gy - q)
        ctx.quadraticCurveTo(gx, gy, gx + q, gy)
        ctx.quadraticCurveTo(gx, gy, gx, gy + q)
        ctx.quadraticCurveTo(gx, gy, gx - q, gy)
        ctx.quadraticCurveTo(gx, gy, gx, gy - q)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      if (countdown) {
        // the number, popping in once a second, inside a ring that sweeps round
        const n = Math.max(1, Math.ceil(COUNT - t))
        const within = 1 - ((COUNT - t) - Math.floor(COUNT - t)) // 0 at the start of the second, 1 at its end
        const pop = still ? 1 : 1 + 0.45 * Math.max(0, 1 - within / 0.22) ** 2
        const cx = W / 2
        const cy = H * 0.7
        const ringR = R * 0.19
        ctx.globalAlpha = env
        ctx.lineWidth = Math.max(3, R * 0.008)
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, TAU)
        ctx.stroke()
        ctx.strokeStyle = gold
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + within * TAU)
        ctx.stroke()
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(pop, pop)
        ctx.font = `800 ${Math.round(R * 0.26)}px Poppins, "Segoe UI", system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = env * Math.min(1, (1 - within) * 6 + 0.35)
        const fill = ctx.createLinearGradient(0, -R * 0.13, 0, R * 0.13)
        fill.addColorStop(0, '#fff6cf')
        fill.addColorStop(1, gold)
        ctx.shadowColor = gold
        ctx.shadowBlur = R * 0.04
        ctx.fillStyle = fill
        ctx.fillText(String(n), 0, R * 0.01)
        ctx.restore()
      }
    }

    // ── midnight ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (!fired && t >= COUNT) {
      fired = true
      waves.push({ x: poleX, y: restY, age: 0 })
      inner = playFireworks({ colors: palette, bursts, chained: true, veil: false })
      if (!still) popConfetti()
    }
    ctx.globalCompositeOperation = 'lighter'
    waves = waves.filter((w) => {
      w.age += dt
      const k = w.age / 1.1
      if (k >= 1) return false
      const r = R * (0.05 + k * 0.9)
      ctx.globalAlpha = (1 - k) ** 1.5 * 0.85
      ctx.strokeStyle = gold
      ctx.lineWidth = 6 * (1 - k) + 1
      ctx.beginPath()
      ctx.arc(w.x, w.y, r, 0, TAU)
      ctx.stroke()
      return true
    })
    if (fired && t - COUNT < 0.5) {
      ctx.globalAlpha = (1 - (t - COUNT) / 0.5) * 0.6 // the flash of midnight
      ctx.fillStyle = '#fff8e0'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.globalCompositeOperation = 'source-over'

    // ── confetti and balloons ─────────────────────────────────────────────────────────────────────────────────────────────────────
    confetti = confetti.filter((c) => {
      c.life += dt
      if (c.life > c.max || c.y > H + 30) return false
      const d = Math.exp(-1.7 * dt)
      c.vx *= d
      c.vy = c.vy * d + 520 * dt * 0.55
      c.x += c.vx * dt + Math.sin(c.life * 3 + c.flip) * 22 * dt
      c.y += c.vy * dt
      c.rot += c.spin * dt
      c.flip += c.flipSpeed * dt
      ctx.save()
      ctx.globalAlpha = Math.min(1, (c.max - c.life) * 1.5) * env
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rot)
      ctx.scale(1, Math.cos(c.flip))
      ctx.fillStyle = c.c
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
      ctx.restore()
      return true
    })
    balloons = balloons.filter((b) => {
      b.life += dt
      if (b.life < b.delay) return true
      b.y -= b.vy * dt
      if (b.y < -b.r * 4) return false
      const x = b.x + Math.sin((b.life - b.delay) * 1.2 + b.ph) * 18
      ctx.globalAlpha = env
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(x, b.y + b.r * 1.15)
      ctx.quadraticCurveTo(x + 8, b.y + b.r * 2.2, x - 4, b.y + b.r * 3.4)
      ctx.stroke()
      ctx.fillStyle = b.c
      ctx.beginPath()
      ctx.ellipse(x, b.y, b.r, b.r * 1.2, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.beginPath()
      ctx.ellipse(x - b.r * 0.35, b.y - b.r * 0.45, b.r * 0.2, b.r * 0.34, -0.5, 0, TAU)
      ctx.fill()
      return true
    })

    // ── the sparkler: from midnight to the end, wherever the mouse goes ──────────────────────────────────────────────────────────
    if (!still && fired && px >= 0) {
      const dx = px - (pxPrev < 0 ? px : pxPrev)
      const dy = py - (pyPrev < 0 ? py : pyPrev)
      const dist = Math.hypot(dx, dy)
      const burn = Math.min(1, (total - t) / 1.2)
      const count = Math.min(thin || low ? 5 : 10, 3 + Math.floor(dist / 7))
      for (let i = 0; i < count && sparks.length < (low ? 160 : 340); i += 1) {
        const k = i / count
        const a = rnd(0, TAU)
        const sp = rnd(40, 190)
        sparks.push({ x: pxPrev < 0 ? px : pxPrev + dx * k, y: pyPrev < 0 ? py : pyPrev + dy * k, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0, max: rnd(0.5, 1.1), r: rnd(4, 9), c: Math.random() < 0.55 ? 0 : 1 })
      }
      pxPrev = px
      pyPrev = py
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.85 * burn // the hot tip of the sparkler
      const tip = R * 0.05 * (0.85 + 0.15 * Math.sin(t * 40))
      ctx.drawImage(whiteGlow, px - tip, py - tip, tip * 2, tip * 2)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.globalCompositeOperation = 'lighter'
    sparks = sparks.filter((s) => {
      s.life += dt
      const k = s.life / s.max
      if (k >= 1) return false
      s.vx *= Math.exp(-2.4 * dt)
      s.vy = s.vy * Math.exp(-2.4 * dt) + 260 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      ctx.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(s.life * 50))
      const r = s.r * (1 - k * 0.6)
      ctx.drawImage(s.c ? whiteGlow : sparkGlow, s.x - r, s.y - r, r * 2, r * 2)
      return true
    })
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
