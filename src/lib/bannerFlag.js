import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'

// "Hoist the flag": the sky takes a faint wash of saffron, white and green, a flagpole stands up from the bottom edge and the tricolour is run
// up it, rippling in the wind (the Ashoka Chakra on the white band ripples with it). At the top a shower of petals bursts from the flag and keeps
// falling, and doves leave the top of the pole and fly off. One canvas that exists only while the show plays. Nothing is loaded until a button
// is pressed. Kind to slow machines: fewer petals on a low-power device and when frames run slow, an early finish when they run very slow. With
// reduced motion the flag simply appears at the top, still, and fades: no hoisting, ripple, petals or doves.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const HOIST = 3.3 // seconds to run the flag up

export function playFlag({ colors, bursts }) {
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

  const palette = (colors?.length ? colors : ['#ff9933', '#ffffff', '#138808', '#000080']).map((c) => c.toLowerCase())
  const [top, mid, bottom, wheel] = [palette[0], palette[1] || '#ffffff', palette[2] || palette[0], palette[3] || '#000080']
  const petalColours = [top, mid, bottom, '#ffc107', '#ffb347']
  const total = still ? 3.4 : HOIST + 5.2
  const poleX = W * 0.5
  const poleTop = H * 0.1
  const fh = R * 0.3
  const fw = fh * 1.5
  const topY = poleTop + R * 0.035
  const startY = H - fh - R * 0.03
  const strip = 4

  const guard = makeFrameGuard()
  let thin = false
  let petals = []
  let doves = []
  let launched = false

  const end = () => {
    cancelAnimationFrame(raf)
    canvas.remove()
    endShow(end)
  }
  startShow(end)

  const petal = (x, y, vx, vy, big) => {
    if (petals.length > (low ? 140 : 320)) return
    petals.push({ x, y, vx, vy, rot: rnd(0, TAU), spin: rnd(-4, 4), flip: rnd(0, TAU), fs: rnd(3, 8), w: rnd(6, 11) * (big ? 1.2 : 1), h: rnd(11, 18) * (big ? 1.2 : 1), c: pick(petalColours), life: 0, max: rnd(3.4, 5.6), ph: rnd(0, TAU) })
  }

  // a dove, drawn each frame: a soft body, a tail, and two wings that beat
  const drawDove = (size, flap) => {
    ctx.fillStyle = '#fbfdff'
    ctx.beginPath()
    ctx.ellipse(0, 0, size * 0.5, size * 0.18, 0, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(size * 0.5, -size * 0.06, size * 0.14, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#ffb347'
    ctx.beginPath()
    ctx.moveTo(size * 0.62, -size * 0.07)
    ctx.lineTo(size * 0.76, -size * 0.03)
    ctx.lineTo(size * 0.62, -size * 0.02)
    ctx.fill()
    ctx.fillStyle = '#e9eef7'
    ctx.beginPath()
    ctx.moveTo(-size * 0.45, 0)
    ctx.lineTo(-size * 0.85, -size * 0.1)
    ctx.lineTo(-size * 0.8, size * 0.1)
    ctx.closePath()
    ctx.fill()
    for (const s of [-1, 1]) {
      ctx.save()
      ctx.translate(size * 0.05, -size * 0.04)
      ctx.rotate(s * (-0.35 + flap * 0.9))
      ctx.fillStyle = s > 0 ? '#ffffff' : '#dfe6f2'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(-size * 0.2, -s * size * 0.55, size * 0.25, -s * size * 0.75, size * 0.4, -s * size * 0.52)
      ctx.bezierCurveTo(size * 0.2, -s * size * 0.32, size * 0.1, -s * size * 0.1, 0, 0)
      ctx.fill()
      ctx.restore()
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

    const env = Math.max(0, Math.min(1, t / 0.5, (total - t) / 1.2))
    canvas.style.background = `linear-gradient(180deg, ${top}${Math.round(env * 46).toString(16).padStart(2, '0')} 0%, ${mid}${Math.round(env * 26).toString(16).padStart(2, '0')} 50%, ${bottom}${Math.round(env * 46).toString(16).padStart(2, '0')} 100%)`
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = env

    // ── the pole ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const pw = Math.max(6, R * 0.011)
    const rise = still ? 1 : Math.min(1, t / 0.6)
    const poleFrom = H - (H - poleTop) * (1 - (1 - rise) ** 2)
    const shade = ctx.createLinearGradient(poleX - pw, 0, poleX + pw, 0)
    shade.addColorStop(0, '#8d97a8')
    shade.addColorStop(0.45, '#f4f7fb')
    shade.addColorStop(1, '#7c8698')
    ctx.fillStyle = shade
    ctx.fillRect(poleX - pw / 2, poleFrom, pw, H - poleFrom)
    ctx.fillStyle = '#9aa4b5' // the stepped base
    ctx.fillRect(poleX - pw * 3, H - R * 0.02, pw * 6, R * 0.02)
    ctx.fillRect(poleX - pw * 2, H - R * 0.035, pw * 4, R * 0.016)
    const fin = ctx.createRadialGradient(poleX - pw * 0.3, poleFrom - pw * 0.6, 1, poleX, poleFrom - pw * 0.4, pw * 1.5)
    fin.addColorStop(0, '#fff3b0')
    fin.addColorStop(1, '#d99a1b')
    ctx.fillStyle = fin
    ctx.beginPath()
    ctx.arc(poleX, poleFrom - pw * 0.4, pw * 1.35, 0, TAU)
    ctx.fill()

    // ── the flag ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const u = still ? 1 : Math.min(1, Math.max(0, (t - 0.5) / HOIST))
    const climb = 1 - (1 - u) ** 1.7
    const fy = startY + (topY - startY) * climb
    const moving = u > 0 && u < 1
    const wind = still ? 0 : fh * (moving ? 0.075 : 0.06)
    const wave = (x, k) => (still ? 0 : Math.sin(x * 0.034 - t * 6.2 + k) * wind * (x / fw) ** 1.15)
    if (u > 0) {
      const x0 = poleX + pw / 2
      const band = fh / 3
      for (let x = 0; x < fw; x += strip) {
        const dy = wave(x, 0)
        const slope = still ? 0 : Math.cos(x * 0.034 - t * 6.2) // facing the light, or turned from it
        const y = fy + dy
        ctx.fillStyle = top
        ctx.fillRect(x0 + x, y, strip + 1, band + 1)
        ctx.fillStyle = mid
        ctx.fillRect(x0 + x, y + band, strip + 1, band + 1)
        ctx.fillStyle = bottom
        ctx.fillRect(x0 + x, y + band * 2, strip + 1, band + 1)
        ctx.fillStyle = slope > 0 ? `rgba(255,255,255,${0.16 * slope})` : `rgba(0,0,0,${-0.2 * slope})`
        ctx.fillRect(x0 + x, y, strip + 1, fh + 1)
      }
      // the wheel, riding the ripple at the middle of the flag
      const cx = x0 + fw / 2
      const cy = fy + fh / 2 + wave(fw / 2, 0)
      const wr = band * 0.43
      ctx.strokeStyle = wheel
      ctx.fillStyle = wheel
      ctx.lineWidth = Math.max(1.5, wr * 0.1)
      ctx.beginPath()
      ctx.arc(cx, cy, wr, 0, TAU)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, wr * 0.14, 0, TAU)
      ctx.fill()
      ctx.lineWidth = Math.max(1, wr * 0.045)
      for (let i = 0; i < 24; i += 1) {
        const a = (i / 24) * TAU
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * wr * 0.14, cy + Math.sin(a) * wr * 0.14)
        ctx.lineTo(cx + Math.cos(a) * wr * 0.96, cy + Math.sin(a) * wr * 0.96)
        ctx.stroke()
      }
      // two rings on the pole holding it
      ctx.fillStyle = '#d99a1b'
      for (const k of [0.15, 0.85]) ctx.fillRect(x0 - pw * 0.8, fy + fh * k - 2, pw * 1.6, 4)
    }

    // ── at the top: petals and doves ──────────────────────────────────────────────────────────────────────────────────────────────
    if (!still && !launched && u >= 1) {
      launched = true
      const cx = poleX + fw / 2 + pw / 2
      const cy = fy + fh / 2
      const n = Math.round(bursts * (thin || low ? 6 : 11))
      for (let i = 0; i < n; i += 1) {
        const a = rnd(0, TAU)
        const sp = rnd(120, 520) * (R / 800)
        petal(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp - 80, true)
      }
      const birds = 2 + Math.round(bursts / 3)
      for (let i = 0; i < birds; i += 1) doves.push({ at: t + i * 0.28, dir: i % 2 ? -1 : 1, rise: rnd(0.14, 0.3), reach: rnd(0.35, 0.6), size: R * rnd(0.04, 0.06), age: -1, ph: rnd(0, TAU) })
    }
    if (!still && launched && t < total - 2.2) {
      const rate = (thin || low ? 9 : 18) * (bursts / 8)
      let c = rate * dt
      while (Math.random() < c) {
        petal(rnd(0, W), -14, rnd(-20, 20), rnd(30, 70), false)
        c -= 1
      }
    }
    petals = petals.filter((p) => {
      p.life += dt
      if (p.life > p.max || p.y > H + 30) return false
      const d = Math.exp(-1.6 * dt)
      p.vx *= d
      p.vy = p.vy * d + 150 * dt * 0.4
      p.x += p.vx * dt + Math.sin(p.life * 2.2 + p.ph) * 26 * dt
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
      ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
      return true
    })
    doves = doves.filter((d) => {
      if (t < d.at) return true
      d.age = t - d.at
      const k = d.age / 3.4
      if (k >= 1) return false
      const x = poleX + d.dir * k * W * d.reach
      const y = poleTop + R * 0.02 - k * H * d.rise + Math.sin(k * 7 + d.ph) * H * 0.02 + k * k * H * 0.04
      const flap = Math.sin(d.age * 13 + d.ph)
      ctx.save()
      ctx.globalAlpha = Math.min(1, (1 - k) * 3, d.age * 4) * env
      ctx.translate(x, y)
      ctx.scale(d.dir, 1)
      ctx.rotate(-0.25)
      drawDove(d.size, flap)
      ctx.restore()
      return true
    })

    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
