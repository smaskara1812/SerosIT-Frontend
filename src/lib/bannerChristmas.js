import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, startShow } from '@/lib/bannerShow'

// The Christmas show: the page dims to a winter night, stars come out, snow falls (soft flakes at different depths and a few crystals), and
// Santa's sleigh climbs the sky from the bottom left to the top right behind a team of four reindeer, the lead one with a glowing red nose,
// trailing gold sparkle and dropping gifts that tumble down and settle on the ground. A second, smaller pass follows on a longer show.
// One canvas that exists only while the show plays. Nothing is loaded until a button is pressed. Kind to slow machines: less snow on a
// low-power device, less again when frames run slow, an early finish when they run very slow, and with reduced motion nothing travels: the
// snow hangs and twinkles and the sleigh fades in and out in place.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

function glow(colour, size = 64) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `${colour}ff`)
  grd.addColorStop(0.35, `${colour}99`)
  grd.addColorStop(1, `${colour}00`)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  return c
}

const line = (g, pts) => {
  g.beginPath()
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1])
  g.stroke()
}

// One reindeer, facing right, its centre at the origin. `ph` is the gallop phase, `lead` gives it the red nose.
function reindeer(g, ph, lead, noseGlow) {
  const s = Math.sin(ph)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  // legs: front pair reaches out as the hind pair tucks back
  g.strokeStyle = '#6b3f1d'
  g.lineWidth = 5
  for (const [x, a] of [[18, s], [12, -s], [-16, -s], [-22, s]]) {
    line(g, [[x, 8], [x + a * 14, 24], [x + a * 22 - 4, 34 + Math.abs(a) * -4]])
  }
  g.fillStyle = '#8a5426'
  g.beginPath()
  g.ellipse(0, 0, 32, 14, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#d9a46b'
  g.beginPath()
  g.ellipse(2, 6, 24, 7, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#f4efe6' // the white tail
  g.beginPath()
  g.arc(-33, -4, 5, 0, TAU)
  g.fill()
  // neck and head
  g.strokeStyle = '#8a5426'
  g.lineWidth = 12
  line(g, [[22, -4], [36, -22]])
  g.fillStyle = '#8a5426'
  g.beginPath()
  g.ellipse(42, -27, 10, 7, -0.4, 0, TAU)
  g.fill()
  g.beginPath()
  g.ellipse(52, -24, 7, 4.5, -0.15, 0, TAU)
  g.fill()
  g.fillStyle = lead ? '#ff3b30' : '#2b1a0c'
  g.beginPath()
  g.arc(58, -24, lead ? 3.6 : 2.4, 0, TAU)
  g.fill()
  if (lead && noseGlow) g.drawImage(noseGlow, 58 - 18, -24 - 18, 36, 36)
  g.fillStyle = '#1b1208'
  g.beginPath()
  g.arc(45, -29, 1.6, 0, TAU)
  g.fill()
  // collar and bell
  g.strokeStyle = '#d62839'
  g.lineWidth = 4.2
  line(g, [[27, -9], [33, -17]])
  g.fillStyle = '#ffd24a'
  g.beginPath()
  g.arc(31, -11, 3.4, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(255,236,190,0.55)' // a rim of light along the back
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(0, -1, 30, 12.5, 0, Math.PI * 1.1, Math.PI * 1.9)
  g.stroke()
  // antlers
  g.strokeStyle = '#e8cfa6'
  g.lineWidth = 2.6
  line(g, [[40, -33], [36, -48], [30, -58]])
  line(g, [[36, -48], [43, -56]])
  line(g, [[38, -41], [30, -45]])
  line(g, [[44, -33], [44, -47], [50, -57]])
  line(g, [[44, -47], [37, -54]])
}

function sleigh(g, giftColours, lampGlow) {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  // the sack of gifts at the back
  g.fillStyle = '#7a4b2a'
  g.beginPath()
  g.ellipse(-52, -26, 24, 21, 0.2, 0, TAU)
  g.fill()
  giftColours.slice(0, 3).forEach((c, i) => {
    g.fillStyle = c
    g.fillRect(-66 + i * 15, -52 - (i % 2) * 5, 14, 14)
    g.fillStyle = 'rgba(255,255,255,0.8)'
    g.fillRect(-60 + i * 15, -52 - (i % 2) * 5, 2.4, 14)
  })
  // the body of the sleigh, shaded from a bright top to a deep red below
  const body = g.createLinearGradient(0, -34, 0, 22)
  body.addColorStop(0, '#ef4351')
  body.addColorStop(0.55, '#c81e2e')
  body.addColorStop(1, '#8f1220')
  g.fillStyle = body
  g.beginPath()
  g.moveTo(-76, 2)
  g.bezierCurveTo(-82, -22, -66, -34, -44, -30)
  g.lineTo(46, -22)
  g.bezierCurveTo(70, -20, 84, -4, 74, 14)
  g.lineTo(-62, 20)
  g.bezierCurveTo(-72, 20, -78, 14, -76, 2)
  g.closePath()
  g.fill()
  g.strokeStyle = '#f5c542'
  g.lineWidth = 3.4
  line(g, [[-70, 8], [66, 4]])
  // runner, curled up at the front
  g.lineWidth = 4.4
  g.beginPath()
  g.moveTo(-86, 36)
  g.lineTo(70, 36)
  g.quadraticCurveTo(100, 36, 98, 12)
  g.stroke()
  g.lineWidth = 3
  line(g, [[-50, 20], [-50, 36]])
  line(g, [[34, 18], [34, 36]])
  // a lantern on a pole at the front, lighting the way
  g.strokeStyle = '#6b4a2a'
  g.lineWidth = 2.6
  line(g, [[62, -20], [62, -50]])
  line(g, [[62, -50], [70, -50]])
  g.drawImage(lampGlow, 70 - 22, -42 - 22, 44, 44)
  g.fillStyle = '#ffe9a8'
  g.beginPath()
  g.rect(66, -46, 8, 10)
  g.fill()
  // Santa
  g.fillStyle = '#d62839'
  g.beginPath()
  g.arc(8, -32, 18, 0, TAU)
  g.fill()
  g.fillStyle = '#f2c9a5'
  g.beginPath()
  g.arc(12, -56, 9, 0, TAU)
  g.fill()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.ellipse(15, -50, 9, 7, 0.2, 0, TAU)
  g.fill()
  g.fillStyle = '#d62839'
  g.beginPath()
  g.moveTo(3, -61)
  g.quadraticCurveTo(10, -86, -6, -84)
  g.quadraticCurveTo(14, -78, 22, -61)
  g.closePath()
  g.fill()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(-6, -84, 4.4, 0, TAU)
  g.fill()
  g.fillRect(2, -63, 20, 5)
  g.strokeStyle = '#7a4b2a'
  g.lineWidth = 3
  line(g, [[22, -30], [46, -22]]) // his arm to the reins
}

export function playChristmas({ colors, bursts }) {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const low = lowPowerDevice()
  const scale = canvasScale()
  const W = window.innerWidth
  const H = window.innerHeight
  const R = Math.min(W, H)
  const unit = Math.max(0.55, Math.min(1.5, R / 700))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const palette = (colors?.length ? colors : ['#ffffff', '#ffd24a', '#e63946', '#2a9d8f']).map((c) => c.toLowerCase())
  const snowColour = palette[0]
  const dustColour = palette[1] || '#ffd24a'
  const wraps = palette.slice(2).length ? palette.slice(2) : ['#e63946', '#2a9d8f', '#ffd24a']
  const soft = glow(snowColour)
  const dustGlow = glow(dustColour)
  const noseGlow = glow('#ff3b30')
  const sunGlow = glow('#ffcf70', 128)
  // the moon, drawn once: a halo, a pale disc and a few soft craters
  const moon = (() => {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 160
    const g = c.getContext('2d')
    const halo = g.createRadialGradient(80, 80, 20, 80, 80, 80)
    halo.addColorStop(0, 'rgba(255,246,214,0.5)')
    halo.addColorStop(1, 'rgba(255,246,214,0)')
    g.fillStyle = halo
    g.fillRect(0, 0, 160, 160)
    const disc = g.createRadialGradient(72, 72, 4, 80, 80, 34)
    disc.addColorStop(0, '#fffdf2')
    disc.addColorStop(1, '#f3e7bd')
    g.fillStyle = disc
    g.beginPath()
    g.arc(80, 80, 32, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(190,170,120,0.28)'
    for (const [x, y, r] of [[70, 72, 7], [90, 88, 5], [82, 66, 3.5], [72, 92, 4]]) {
      g.beginPath()
      g.arc(x, y, r, 0, TAU)
      g.fill()
    }
    return c
  })()
  const bankH = 30 * unit

  // the sleigh and its team are drawn once into a sprite sheet per gallop frame, so the show only moves bitmaps
  const FRAMES = 8
  const SW = Math.round(760 * unit)
  const SH = Math.round(190 * unit)
  const sheet = Array.from({ length: still ? 1 : FRAMES }, (_, f) => {
    const c = document.createElement('canvas')
    c.width = SW
    c.height = SH
    const g = c.getContext('2d')
    g.translate(Math.round(120 * unit), Math.round(120 * unit))
    g.scale(unit, unit)
    sleigh(g, wraps, dustGlow)
    for (let i = 0; i < 4; i += 1) {
      g.save()
      g.translate(140 + i * 104, -4 + (i % 2) * 5)
      g.strokeStyle = '#f5c542'
      g.lineWidth = 1.6
      reindeer(g, (f / FRAMES) * TAU + i * 0.9, i === 3, noseGlow)
      g.restore()
    }
    // reins from the sleigh to each reindeer
    g.strokeStyle = '#f5c542'
    g.lineWidth = 1.4
    for (let i = 0; i < 4; i += 1) line(g, [[44, -22 + i * 3], [130 + i * 104, -10]])
    return c
  })
  const anchor = [Math.round(120 * unit), Math.round(120 * unit)]

  const guard = makeFrameGuard()
  let thin = false
  const density = (still ? 0.6 : 1) * (low ? 0.55 : 1) * (bursts * 30)
  const total = still ? 4.2 : bursts >= 10 ? 14.2 : 10.8
  let flakes = []
  let dust = []
  let gifts = []
  let puffs = []
  const stars = Array.from({ length: low ? 30 : 60 }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.65), r: rnd(0.8, 2.2), ph: rnd(0, TAU), f: rnd(1.5, 4) }))

  const flake = (anywhere) => {
    const depth = Math.random()
    const crystal = Math.random() < 0.12
    return {
      x: rnd(-20, W + 20), y: anywhere ? rnd(-20, H) : rnd(-40, -4), depth, crystal,
      r: crystal ? rnd(5, 9) * (0.6 + depth) : 1.2 + depth * 3.6,
      vy: 28 + depth * 90, sway: rnd(8, 26), ph: rnd(0, TAU), spin: rnd(-1, 1), a: 0.35 + depth * 0.6,
    }
  }
  for (let i = 0; i < density * 0.55; i += 1) flakes.push(flake(true))

  // a sleigh pass: where it starts and ends, how big, and when
  // the main pass climbs from the bottom left to the top right; the second, smaller one climbs the other way
  const passes = [{ at: 1.0, dir: 1, from: [-0.06, 0.8], to: [1.06, 0.12], size: 1, dur: 6.4, gifts: 1, dropped: 0 }]
  if (bursts >= 10) passes.push({ at: 6.2, dir: -1, from: [1.06, 0.86], to: [-0.06, 0.3], size: 0.62, dur: 5.6, gifts: 0, dropped: 0 })
  let active = null

  const end = () => {
    cancelAnimationFrame(raf)
    canvas.remove()
    endShow(end)
  }
  startShow(end)

  let raf = 0
  let t = 0
  let last = 0

  const drawFlake = (f) => {
    ctx.globalAlpha = f.a * env
    if (f.crystal) {
      ctx.strokeStyle = snowColour
      ctx.lineWidth = 1.2
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.ph * f.spin)
      for (let k = 0; k < 3; k += 1) {
        ctx.rotate(Math.PI / 3)
        ctx.beginPath()
        ctx.moveTo(-f.r, 0)
        ctx.lineTo(f.r, 0)
        ctx.stroke()
      }
      ctx.restore()
    } else {
      const d = f.r * 2.6
      ctx.drawImage(soft, f.x - d / 2, f.y - d / 2, d, d)
    }
  }

  let env = 0
  const frame = (now) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016)
    last = now
    t += dt
    const mode = guard(now)
    thin = mode !== 'full'
    if (mode === 'stop' || t > total) return end()

    env = Math.max(0, Math.min(1, t / 0.7, (total - t) / 1.2))
    const night = 0.56 * env
    canvas.style.background = `linear-gradient(180deg, rgba(6,12,42,${night}) 0%, rgba(13,34,76,${night * 0.9}) 62%, rgba(30,62,108,${night * 0.72}) 100%)` // a winter night, deepest at the top
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'

    // the moon and, when the machine is not struggling, a slow ribbon of northern light
    ctx.globalAlpha = env
    const md = R * 0.3
    ctx.drawImage(moon, W * 0.13 - md / 2, H * 0.17 - md / 2, md, md)
    if (!low && !thin && !still) {
      ctx.globalCompositeOperation = 'lighter'
      const band = ctx.createLinearGradient(0, H * 0.06, 0, H * 0.46)
      band.addColorStop(0, 'rgba(70,240,180,0)')
      band.addColorStop(0.5, 'rgba(70,240,180,1)')
      band.addColorStop(1, 'rgba(110,150,255,0)')
      ctx.fillStyle = band
      for (let x = 0; x < W; x += 14) {
        const y = Math.sin(x * 0.005 + t * 0.35) * H * 0.05 + Math.sin(x * 0.013 - t * 0.2) * H * 0.02
        ctx.globalAlpha = env * 0.11 * (0.55 + 0.45 * Math.sin(x * 0.011 + t * 0.6))
        ctx.save()
        ctx.translate(0, y)
        ctx.fillRect(x, H * 0.06, 14, H * 0.4)
        ctx.restore()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    // stars
    for (const s of stars) {
      ctx.globalAlpha = env * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.f * t + s.ph)))
      ctx.fillStyle = '#fff6d8'
      ctx.fillRect(s.x - s.r / 2, s.y - s.r / 2, s.r, s.r)
    }

    // snow, topped up so the density stays
    const want = density * Math.min(1, t / 1.2) * (thin ? 0.6 : 1)
    while (!still && flakes.length < want) flakes.push(flake(false))
    flakes = flakes.filter((f) => {
      if (!still) {
        f.y += f.vy * dt
        f.x += Math.sin(t * 0.9 + f.ph) * f.sway * dt
        f.ph += dt * 0.6
      } else {
        f.a = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.4 + f.ph))
      }
      if (f.y > H + 20) return false
      drawFlake(f)
      return true
    })

    // a bank of snow along the bottom edge, where the gift will land
    ctx.globalAlpha = env * 0.95
    const bankTop = H - bankH
    const bankFill = ctx.createLinearGradient(0, bankTop - 8, 0, H)
    bankFill.addColorStop(0, '#f2f8ff')
    bankFill.addColorStop(1, '#b4cdea')
    ctx.fillStyle = bankFill
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, bankTop + Math.sin(x * 0.011) * 6 + Math.sin(x * 0.029 + 1.3) * 3.5)
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()

    // the sleigh
    if (!active) {
      const next = passes.find((p) => !p.started && t >= p.at)
      if (next) {
        next.started = true
        active = next
      }
    }
    if (active) {
      const u = (t - active.at) / active.dur
      if (u > 1) {
        active = null
      } else {
        const { dir, size, from, to } = active
        const ux = (to[0] - from[0]) * W
        const uy = (to[1] - from[1]) * H
        const len = Math.hypot(ux, uy)
        const fx = ux / len // the way it is heading
        const fy = uy / len
        const bob = still ? 0 : Math.sin(u * TAU * 2.2) * 9 * unit
        const x = still ? W * 0.5 : (from[0] + (to[0] - from[0]) * u) * W - fy * bob
        const y = still ? H * 0.3 : (from[1] + (to[1] - from[1]) * u) * H + fx * bob * dir
        const tilt = still ? 0 : Math.atan2(fy, fx * dir)
        const frameIx = still ? 0 : Math.floor(t * 12) % FRAMES
        const vis = still ? Math.min(1, u * 5, (1 - u) * 5) : 1
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(dir * size, size)
        ctx.rotate(tilt)
        ctx.globalCompositeOperation = 'lighter' // the warm light the sleigh throws on the clouds
        ctx.globalAlpha = vis * 0.55
        ctx.drawImage(sunGlow, -SW * 0.35, -SH * 0.55, SW * 0.9, SH * 1.3)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = vis
        ctx.drawImage(sheet[frameIx], -anchor[0], -anchor[1])
        ctx.restore()
        if (!still) {
          // the trail of sparkle, from behind the sleigh
          const bx = x - fx * 95 * unit * size
          const by = y - fy * 95 * unit * size
          for (let i = 0; i < (thin ? 1 : 3); i += 1) dust.push({ x: bx + rnd(-8, 8), y: by + rnd(-6, 22) * unit * size, vx: -fx * rnd(10, 60), vy: rnd(-10, 36), life: 0, max: rnd(0.9, 1.7), r: rnd(3, 9), star: Math.random() < 0.35, rot: rnd(0, 1) })
          // a gift, let go from under the sleigh
          if (active.dropped < active.gifts && u > 0.34) {
            active.dropped += 1
            gifts.push({ x: x - fx * 20 * unit * size, y: y + 30 * unit * size, vx: fx * 70, vy: 30, rot: rnd(-0.4, 0.4), spin: rnd(-2.6, 2.6), age: 0, landed: 0, bounced: false, c: pick(wraps), s: 24 * unit * (0.8 + size * 0.3) })
          }
        }
      }
    }

    // sparkle trail
    ctx.globalCompositeOperation = 'lighter'
    dust = dust.filter((d) => {
      d.life += dt
      const k = d.life / d.max
      if (k >= 1) return false
      d.x += d.vx * dt
      d.y += d.vy * dt
      ctx.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(d.life * 30))
      const s = d.r * (1 - k * 0.5)
      ctx.drawImage(dustGlow, d.x - s, d.y - s, s * 2, s * 2)
      if (d.star) {
        // a four-point twinkle
        const q = s * 1.7
        ctx.fillStyle = '#fff4c8'
        ctx.beginPath()
        ctx.moveTo(d.x, d.y - q)
        ctx.quadraticCurveTo(d.x, d.y, d.x + q, d.y)
        ctx.quadraticCurveTo(d.x, d.y, d.x, d.y + q)
        ctx.quadraticCurveTo(d.x, d.y, d.x - q, d.y)
        ctx.quadraticCurveTo(d.x, d.y, d.x, d.y - q)
        ctx.fill()
      }
      return true
    })
    ctx.globalCompositeOperation = 'source-over'

    // snow kicked up by the landing
    puffs = puffs.filter((p) => {
      p.life += dt
      const k = p.life / p.max
      if (k >= 1) return false
      p.vy += 160 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      ctx.globalAlpha = (1 - k) * 0.7 * env
      ctx.drawImage(soft, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
      return true
    })

    // gifts: let go from under the sleigh, they tumble down, land on the ground with one small bounce, rest a while and fade
    const ground = H - bankH * 0.62
    gifts = gifts.filter((gf) => {
      gf.age += dt
      if (gf.landed === 0) {
        gf.vy += 760 * unit * dt
        gf.x += gf.vx * dt
        gf.y += gf.vy * dt
        gf.rot += gf.spin * dt
        if (gf.y >= ground - gf.s / 2) {
          gf.y = ground - gf.s / 2
          if (gf.bounced) {
            gf.landed = gf.age
            gf.rot = Math.round(gf.rot / (Math.PI / 2)) * (Math.PI / 2) + rnd(-0.12, 0.12) // it settles flat, a little askew
          } else {
            gf.bounced = true
            gf.vy = -gf.vy * 0.28
            gf.vx *= 0.4
            gf.spin *= 0.4
          }
        }
      }
      const rest = gf.landed ? gf.age - gf.landed : 0
      if (rest > 2.6) return false
      if (gf.landed && !gf.puffed) {
        gf.puffed = true // a puff of snow and a little burst of sparkle where it lands
        for (let i = 0; i < 12; i += 1) puffs.push({ x: gf.x + rnd(-gf.s, gf.s), y: gf.y + gf.s * 0.4, vx: rnd(-70, 70), vy: rnd(-90, -20), life: 0, max: rnd(0.6, 1.1), r: rnd(5, 11) })
        for (let i = 0; i < 12; i += 1) dust.push({ x: gf.x, y: gf.y, vx: rnd(-110, 110), vy: rnd(-150, -20), life: 0, max: rnd(0.7, 1.3), r: rnd(3, 7), star: Math.random() < 0.5, rot: 0 })
      }
      const alpha = Math.min(1, env * 2, (2.6 - rest) / 0.9)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(gf.x, gf.y)
      if (gf.landed) {
        ctx.globalCompositeOperation = 'lighter' // it glows softly as it rests
        ctx.globalAlpha = alpha * (0.35 + 0.15 * Math.sin(rest * 5))
        ctx.drawImage(dustGlow, -gf.s * 2, -gf.s * 2, gf.s * 4, gf.s * 4)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = alpha
      }
      ctx.rotate(gf.rot)
      const box = ctx.createLinearGradient(-gf.s / 2, -gf.s / 2, gf.s / 2, gf.s / 2)
      box.addColorStop(0, gf.c)
      box.addColorStop(1, 'rgba(0,0,0,0.35)')
      ctx.fillStyle = gf.c
      ctx.fillRect(-gf.s / 2, -gf.s / 2, gf.s, gf.s)
      ctx.fillStyle = box
      ctx.fillRect(-gf.s / 2, -gf.s / 2, gf.s, gf.s)
      ctx.fillStyle = '#ffd24a' // gold ribbon and a bow
      ctx.fillRect(-gf.s / 2, -gf.s * 0.09, gf.s, gf.s * 0.18)
      ctx.fillRect(-gf.s * 0.09, -gf.s / 2, gf.s * 0.18, gf.s)
      ctx.beginPath()
      ctx.ellipse(-gf.s * 0.22, -gf.s / 2 - gf.s * 0.1, gf.s * 0.2, gf.s * 0.12, -0.5, 0, TAU)
      ctx.ellipse(gf.s * 0.22, -gf.s / 2 - gf.s * 0.1, gf.s * 0.2, gf.s * 0.12, 0.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, -gf.s / 2 - gf.s * 0.04, gf.s * 0.08, 0, TAU)
      ctx.fill()
      ctx.restore()
      return true
    })
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
