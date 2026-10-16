import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'

// The spud-in: a drill string drops in from the top of the screen with a tricone bit spinning at its tip, hits the
// ground at the bottom of the window and starts to drill. Sand and dust blow out of the hole, the whole page
// vibrates, and then the string is pulled back up out of the hole and off the top of the screen. Plays on the
// `seros:spud` event.
//
// The dust reacts to the page. Cards (anything marked `data-shelf`) are solid to it: sand that lands on them is caught,
// rising dust is stopped by their undersides and spreads along them, and the spoil from the hole builds up into a
// mound beside it. Nothing is ever drawn on the cards themselves. A light wind drifts everything a little to the right.
//
// Like the gusher it exists only while it plays: a transparent canvas over the page, removed when it finishes. On
// weak machines there are fewer particles and no page shake; with reduced motion only the message shows.
const DROP = 1500 // ms for the bit to fall from the top to the ground
const DRILL = 3300 // ms of drilling after contact
const HOLD = 200
const RETRACT = 1700 // ms to pull the string back up out of the screen
const TOTAL = 8000 // ms the whole thing lasts
const FADE = 900
const T_R = DROP + DRILL + HOLD
const GRAINS = ['#c9a56e', '#a67c4a', '#8a5f35', '#d8bd8a', '#6d4a2a', '#e6d3a8', '#b48a55']
const MAX_DEPTH = 210 // local units the bit works down

const rand = (a, b) => a + Math.random() * (b - a)
const ease = (q) => q * q * (3 - 2 * q)
const edge = (x, s) => 10 * s * Math.sin(x / (80 * s)) + 6 * s * Math.sin(x / (24 * s) + 1.7)

// A billowing cloud sprite: many overlapping soft lobes, lit from the upper left (lighter) and shaded below (darker),
// with a ragged edge and a little grit, so no two puffs are alike and none is a flat disc.
function makeSprite() {
  const N = 192
  const c = document.createElement('canvas')
  c.width = c.height = N
  const x = c.getContext('2d')
  const mid = N / 2
  for (let i = 0; i < 34; i++) {
    const a = rand(0, Math.PI * 2)
    const d = rand(0, 46)
    const px = mid + Math.cos(a) * d
    const py = mid + Math.sin(a) * d * 0.85
    const r = rand(20, 46)
    const lit = (-Math.cos(a) - Math.sin(a)) * 0.5 // +1 toward the upper left
    const tone = lit > 0.25 ? '236,214,176' : lit < -0.25 ? '176,142,98' : '208,180,136'
    const g = x.createRadialGradient(px, py, 2, px, py, r)
    g.addColorStop(0, `rgba(${tone},${rand(0.26, 0.42)})`)
    g.addColorStop(0.6, `rgba(${tone},${rand(0.12, 0.2)})`)
    g.addColorStop(1, `rgba(${tone},0)`)
    x.fillStyle = g
    x.fillRect(0, 0, N, N)
  }
  for (let i = 0; i < 110; i++) {
    const a = rand(0, Math.PI * 2)
    const d = rand(22, 74)
    x.fillStyle = `rgba(190,158,112,${rand(0.1, 0.3)})`
    x.fillRect(mid + Math.cos(a) * d, mid + Math.sin(a) * d * 0.88, rand(1, 3.5), rand(1, 3.5))
  }
  return c
}

// One cone of the bit, with rows of teeth that appear to roll as the bit turns.
function cone(ctx, path, rows, phase, dir) {
  ctx.fillStyle = '#7b8494'
  ctx.fill(path)
  ctx.strokeStyle = '#3a414d'
  ctx.lineWidth = 1.6
  ctx.stroke(path)
  for (const { y, hw, n } of rows) {
    for (let i = 0; i < n; i++) {
      const a = phase * dir + (i / n) * Math.PI * 2
      const c = Math.cos(a)
      if (c <= 0) continue // on the far side of the cone
      const x = rows.cx + Math.sin(a) * hw
      ctx.fillStyle = '#e3e8f1'
      ctx.fillRect(x - 3 * c, y - 4, 6 * c, 7)
      ctx.fillStyle = '#4a5260'
      ctx.fillRect(x - 3 * c, y + 3, 6 * c, 2)
    }
  }
}

// The string and bit, drawn in local units with the tip of the bit at (0, 0) and "up" negative.
function drawString(ctx, tipY, s, phase, vib, clipY) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, ctx.canvas.width, clipY)
  ctx.clip()
  ctx.translate(ctx.canvas.width / 2 + vib, tipY)
  ctx.scale(s, s)
  const reach = tipY / s + 80 // how far up the string must go to leave the top of the screen

  const g = ctx.createLinearGradient(-18, 0, 18, 0)
  g.addColorStop(0, '#2c323c'); g.addColorStop(0.4, '#aab3c2'); g.addColorStop(0.7, '#6a7382'); g.addColorStop(1, '#262b34')
  ctx.fillStyle = g
  ctx.fillRect(-18, -100 - reach, 36, reach)
  ctx.fillStyle = 'rgba(255,255,255,.45)'
  ctx.fillRect(Math.sin(phase * 0.7) * 11 - 2, -100 - reach, 4, reach)
  for (let y = -190; y > -100 - reach; y -= 260) {
    const bg = ctx.createLinearGradient(-26, 0, 26, 0)
    bg.addColorStop(0, '#3a414d'); bg.addColorStop(0.45, '#c3ccda'); bg.addColorStop(1, '#2c323c')
    ctx.fillStyle = bg
    ctx.fillRect(-26, y, 52, 24)
  }

  const bodyG = ctx.createLinearGradient(-36, 0, 36, 0)
  bodyG.addColorStop(0, '#363c47'); bodyG.addColorStop(0.5, '#8d96a6'); bodyG.addColorStop(1, '#2f353f')
  ctx.fillStyle = bodyG
  ctx.beginPath()
  ctx.moveTo(-18, -100); ctx.lineTo(18, -100); ctx.lineTo(38, -58); ctx.lineTo(-38, -58); ctx.closePath()
  ctx.fill()
  const left = new Path2D('M-46,-54 L-14,-60 L-3,-12 Q-12,2 -32,-8 Z')
  const right = new Path2D('M46,-54 L14,-60 L3,-12 Q12,2 32,-8 Z')
  const mid = new Path2D('M-20,-60 L20,-60 L11,-8 Q0,5 -11,-8 Z')
  const rows = (cx, hw) => Object.assign([{ y: -46, hw, n: 6 }, { y: -32, hw: hw * 0.85, n: 6 }, { y: -18, hw: hw * 0.6, n: 5 }], { cx })
  cone(ctx, left, rows(-25, 9), phase, -1)
  cone(ctx, right, rows(25, 9), phase, 1)
  cone(ctx, mid, rows(0, 10), phase * 1.1, 1)
  ctx.restore()
}

function Spud({ message, onDone }) {
  const canvas = useRef(null)

  useEffect(() => {
    const done = setTimeout(onDone, TOTAL)
    let raf = 0
    let shake = null
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const c = canvas.current
    if (reduced || !c) return () => clearTimeout(done)

    const dpr = canvasScale()
    const W = (c.width = Math.round(window.innerWidth * dpr))
    const H = (c.height = Math.round(window.innerHeight * dpr))
    const ctx = c.getContext('2d')
    const low = lowPowerDevice()
    const s = Math.min(W, H) / 900
    const cx = W / 2
    const gh = Math.round(H * 0.17)
    const base = 24 * s
    const wind = 0.22 * s

    // the ground, drawn once
    const gc = document.createElement('canvas')
    gc.width = W
    gc.height = gh + base + 30 * s
    const gx = gc.getContext('2d')
    const gg = gx.createLinearGradient(0, 0, 0, gc.height)
    gg.addColorStop(0, '#b98c57'); gg.addColorStop(0.35, '#8d5d35'); gg.addColorStop(1, '#4a2f1b')
    gx.fillStyle = gg
    gx.beginPath()
    gx.moveTo(0, gc.height)
    for (let x = 0; x <= W; x += 6) gx.lineTo(x, base + edge(x, s))
    gx.lineTo(W, gc.height)
    gx.closePath()
    gx.fill()
    gx.strokeStyle = 'rgba(0,0,0,.18)'
    gx.lineWidth = 3 * s
    gx.stroke()
    for (let i = 0; i < (low ? 300 : 900); i++) {
      gx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.14)'
      gx.fillRect(Math.random() * W, base + 14 * s + Math.random() * (gh - 10 * s), rand(1, 3.4) * s, rand(1, 2.4) * s)
    }
    gx.strokeStyle = 'rgba(0,0,0,.14)'
    for (const f of [0.38, 0.62]) {
      gx.beginPath()
      for (let x = 0; x <= W; x += 10) gx.lineTo(x, base + gh * f + 7 * s * Math.sin(x / (110 * s) + f * 9))
      gx.stroke()
    }

    const sprites = [makeSprite(), makeSprite(), makeSprite(), makeSprite()]
    const surf = H - gh - base // where the ground picture lands
    const groundY = (x) => surf + base + edge(x, s)
    const surfY = groundY(cx)
    const holeRy = 11 * s

    // what the dust can land on or be stopped by: the cards on the page, each with a pile of settled sand on top
    const binW = 4 * s
    const shelves = [...document.querySelectorAll('[data-shelf]')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 90 && r.height > 30 && r.bottom > 0 && r.top < window.innerHeight)
      .map((r) => {
        const l = r.left * dpr
        const w = r.width * dpr
        return { l, r: l + w, t: r.top * dpr, b: r.bottom * dpr }
      })
    // the spoil heap around the hole
    const heap = new Float32Array(Math.ceil(W / binW) + 2)
    const pile = (arr, x0, x, add, cap) => {
      const i = Math.round((x - x0) / binW)
      for (let k = -2; k <= 2; k++) {
        const j = i + k
        if (j >= 0 && j < arr.length) arr[j] = Math.min(cap, arr[j] + add * (1 - Math.abs(k) * 0.3))
      }
    }

    const puffs = []
    const grains = []
    const guard = makeFrameGuard()
    const maxGrains = low ? 220 : 440
    const maxPuffs = low ? 50 : 115
    let phase = 0
    let last = performance.now()
    const start = last
    let burst = false
    let exited = false

    const root = document.getElementById('root')
    if (root && !low) {
      const steps = 110
      const frames = Array.from({ length: steps + 1 }, (_, i) => {
        const p = i / steps
        const amp = p < 0.07 ? 1 - (p / 0.07) * 0.55 : p < 0.82 ? 0.45 : Math.max(0, 0.45 * (1 - (p - 0.82) / 0.18))
        return { transform: `translate(${rand(-1, 1) * 9 * amp}px, ${rand(-1, 1) * 7 * amp}px)`, offset: p }
      })
      shake = root.animate(frames, { duration: DRILL + 500, delay: DROP, easing: 'linear', fill: 'none' })
    }

    const addGrain = (x, y, vx, vy, r, chunk = false) => {
      grains.push({ x, y, px: x, py: y, vx, vy, r, c: GRAINS[(Math.random() * GRAINS.length) | 0], chunk, bounced: false, rot: rand(0, 6) })
    }
    // sand thrown up out of the hole in a cone, a few bigger chunks among it
    const spawnSand = (n, power, from) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + rand(-1.2, 1.2) * (Math.random() < 0.25 ? 1.2 : 0.8)
        const v = rand(5, 19) * s * power
        const chunk = Math.random() < 0.06
        addGrain(cx + rand(-26, 26) * s, from, Math.cos(a) * v, Math.sin(a) * v, chunk ? rand(3, 5.5) * s : rand(0.8, 2.4) * s, chunk)
      }
    }
    // dust: a rising plume (buoyant, wandering) and a low cloud that rolls out along the ground
    const addPuff = (x, y, vx, vy, r, life, a, flat, t) => {
      puffs.push({ x, y, vx, vy, r, life, born: t, a, flat, spr: sprites[(Math.random() * 4) | 0], rot: rand(0, 6.28), spin: rand(-0.0008, 0.0008), wob: rand(0, 6.28) })
    }
    const spawnPlume = (t, sy) => {
      if (puffs.length >= maxPuffs) return
      addPuff(cx + rand(-40, 40) * s, sy - 4 * s, rand(-2.2, 2.2) * s, rand(-5.2, -1.8) * s, rand(32, 62) * s, rand(1900, 3300), 0.62, 1, t)
    }
    const spawnGroundCloud = (t, sy, n) => {
      for (let i = 0; i < n && puffs.length < maxPuffs + 20; i++) {
        const dir = i % 2 ? 1 : -1
        addPuff(cx + dir * rand(10, 50) * s, sy - 2 * s, dir * rand(2.6, 8.5) * s, rand(-0.6, 0.1) * s, rand(32, 60) * s, rand(1700, 3000), 0.58, 0.6, t)
      }
    }

    const frame = (now) => {
      const mode = guard(now)
      if (mode === 'stop') {
        ctx.clearRect(0, 0, W, H)
        return
      }
      const t = now - start
      const dt = now - last
      const k = Math.min(3, dt / 16.67)
      last = now
      phase += 0.014 * dt * (t < DROP ? 0.55 + 0.45 * (t / DROP) : 1)
      ctx.clearRect(0, 0, W, H)
      const fade = t > TOTAL - FADE ? Math.max(0, (TOTAL - t) / FADE) : 1
      ctx.globalAlpha = fade

      // the ground rises from below the edge of the window, and stays
      const rise = ease(Math.min(1, Math.max(0, (t - 300) / 800)))
      const off = (1 - rise) * (gh + 70 * s)
      ctx.drawImage(gc, 0, surf + off)
      const sy = surfY + off

      // the spoil heap, built from sand that has landed on the ground
      ctx.fillStyle = '#a97c4c'
      ctx.beginPath()
      ctx.moveTo(0, groundY(0) + off + 2 * s)
      for (let i = 0; i < heap.length; i++) ctx.lineTo(i * binW, groundY(i * binW) + off - heap[i])
      ctx.lineTo(W, groundY(W) + off + 2 * s)
      ctx.closePath()
      ctx.fill()

      if (t >= DROP) {
        ctx.fillStyle = '#2a1a0e'
        ctx.beginPath(); ctx.ellipse(cx, sy + 2 * s, 46 * s, holeRy, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(214,170,110,.7)'; ctx.lineWidth = 3 * s
        ctx.beginPath(); ctx.ellipse(cx, sy + 2 * s, 46 * s, holeRy, 0, Math.PI, Math.PI * 2); ctx.stroke()
      }

      // the string: falling, drilling, then pulled back up and out of the screen
      let tip
      if (t < DROP) {
        const u = t / DROP
        tip = -220 * s + (surfY + 220 * s) * u * u
      } else if (t < T_R) {
        tip = surfY + ease(Math.min(1, (t - DROP) / DRILL)) * MAX_DEPTH * s + Math.sin(t / 17) * 1.4 * s
      } else {
        const u = Math.min(1, (t - T_R) / RETRACT)
        const deep = surfY + MAX_DEPTH * s
        tip = deep - (deep + 330 * s) * u * u
      }
      const working = t >= DROP && t < T_R
      const vib = working ? Math.sin(t / 11) * 2.2 * s : 0
      drawString(ctx, tip, s, phase, vib, t < DROP ? H : sy + holeRy * 0.7)

      // contact: a jet of sand, a rolling ground cloud and a plume
      if (t >= DROP && !burst) {
        burst = true
        spawnSand(low ? 80 : 170, 1.3, surfY)
        spawnGroundCloud(t, surfY, low ? 14 : 30)
        for (let i = 0; i < (low ? 12 : 26); i++) spawnPlume(t, surfY)
      }
      if (working && mode === 'full') {
        if (grains.length < maxGrains) spawnSand(low ? 3 : 7, 0.9, sy)
        for (let i = 0; i < (low ? 1 : 3); i++) spawnPlume(t, sy)
        if (Math.random() < 0.6) spawnGroundCloud(t, sy, 2)
      }
      // as the bit comes up out of the hole it brings a last puff, and soil falls off it
      if (t >= T_R + 0.22 * RETRACT && !exited) {
        exited = true
        spawnGroundCloud(t, sy, low ? 4 : 8)
        for (let i = 0; i < (low ? 20 : 45); i++) addGrain(cx + rand(-30, 30) * s, sy - rand(0, 60) * s, rand(-1.2, 1.2) * s, rand(0, 2) * s, rand(0.9, 2.6) * s)
      }

      // dust: drifts on the wind, wobbles, rises on its own heat, and cannot pass through the cards
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]
        const age = (t - p.born) / p.life
        if (age >= 1) { puffs.splice(i, 1); continue }
        p.vx += (wind * 0.06 + Math.sin(t / 380 + p.wob + p.y / (90 * s)) * 0.07 * s) * k
        p.vy += Math.cos(t / 450 + p.wob + p.x / (110 * s)) * 0.035 * s * k
        p.vy += -0.02 * s * k * (p.flat < 1 ? 0.3 : 1) // buoyancy
        const drag = p.flat < 1 ? 0.955 : 0.99
        p.vx *= drag
        p.vy *= drag
        p.x += p.vx * k
        p.y += p.vy * k
        const r = p.r * (1 + age * 1.9)
        for (const sh of shelves) {
          if (p.x > sh.l - r * 0.2 && p.x < sh.r + r * 0.2 && p.y > sh.t - r * 0.3 && p.y < sh.b + r * 0.3) {
            const dTop = p.y - (sh.t - r * 0.3)
            const dBot = sh.b + r * 0.3 - p.y
            if (dBot < dTop) { // rising into the underside: stop, and spread along it
              p.y = sh.b + r * 0.3
              p.vy = Math.abs(p.vy) * 0.1
              p.vx += (p.x < (sh.l + sh.r) / 2 ? -1 : 1) * 0.5 * s
            } else { // settling onto a top: slow down, and give the card a dusting
              p.y = sh.t - r * 0.3
              p.vy *= 0.2
              p.vx *= 0.9
              p.life *= 0.995
            }
          }
        }
        const ramp = Math.min(1, age / 0.1)
        ctx.globalAlpha = fade * p.a * ramp * Math.pow(1 - age, 1.25)
        ctx.drawImage(p.spr, p.x - r, p.y - r * p.flat, r * 2, r * 2 * p.flat)
      }

      // sand: blown about by drag and the wind, lands on cards and on the ground, and piles up
      ctx.globalAlpha = fade
      ctx.lineCap = 'round'
      for (let i = grains.length - 1; i >= 0; i--) {
        const g = grains[i]
        g.px = g.x
        g.py = g.y
        g.vy += 0.4 * s * k
        g.vx = g.vx * (1 - 0.004 * k) + wind * 0.02 * k
        g.x += g.vx * k
        g.y += g.vy * k
        let gone = false
        for (const sh of shelves) {
          if (g.x > sh.l && g.x < sh.r && g.y > sh.t && g.y < sh.b) {
            if (g.py <= sh.t) { // landed on top of a card
              gone = true // it lands on the card and is gone: nothing is drawn on the card itself
            } else if (g.py >= sh.b) { // hit the underside: drop away
              g.y = sh.b
              g.vy = -g.vy * 0.2
            } else { // hit a side
              g.x = g.px
              g.vx = -g.vx * 0.3
            }
            break
          }
        }
        if (gone) { grains.splice(i, 1); continue }
        const gy = groundY(g.x) + off
        if (g.vy > 0 && g.y >= gy - heap[Math.max(0, Math.min(heap.length - 1, Math.round(g.x / binW)))]) {
          if (!g.bounced && Math.abs(g.vy) > 4 * s && Math.random() < 0.55) { // a short skip along the ground
            g.bounced = true
            g.y = gy - 1
            g.vy *= -0.3
            g.vx *= 0.6
          } else {
            pile(heap, 0, g.x, g.chunk ? 1.8 * s : 0.55 * s, 15 * s)
            grains.splice(i, 1)
          }
          continue
        }
        if (g.x < -40 || g.x > W + 40 || g.y < -200) { grains.splice(i, 1); continue }
        ctx.strokeStyle = g.c
        if (g.chunk) {
          ctx.save()
          ctx.translate(g.x, g.y)
          ctx.rotate(g.rot += 0.18)
          ctx.fillStyle = g.c
          ctx.fillRect(-g.r / 2, -g.r / 2, g.r, g.r * 0.8)
          ctx.restore()
        } else {
          ctx.lineWidth = g.r
          ctx.beginPath()
          ctx.moveTo(g.x, g.y)
          ctx.lineTo(g.x - g.vx * 0.4, g.y - g.vy * 0.4) // a short streak, so fast sand blurs
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      if (t < TOTAL) raf = requestAnimationFrame(safe)
      else ctx.clearRect(0, 0, W, H)
    }
    const safe = (now) => {
      try {
        frame(now)
      } catch (err) {
        console.warn('The spud-in stopped early:', err)
        onDone()
      }
    }
    raf = requestAnimationFrame(safe)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
      shake?.cancel()
    }
  }, [onDone])

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <canvas ref={canvas} className="h-full w-full" />
      <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: '12%' }} role="status">
        <p
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-4 rounded-2xl bg-[#0f2650] px-6 py-3.5 text-center text-lg font-bold tracking-tight text-white shadow-2xl shadow-black/30 duration-500 motion-reduce:animate-none"
          style={{ animationDelay: `${DROP + 1400}ms`, animationFillMode: 'both' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

export default function SpudLayer() {
  const [run, setRun] = useState(null)
  useEffect(() => {
    const play = (e) => setRun({ id: performance.now(), message: e.detail?.message || 'Spud in. The first hole is made.' })
    window.addEventListener('seros:spud', play)
    return () => window.removeEventListener('seros:spud', play)
  }, [])
  const done = useCallback(() => setRun(null), [])
  return run ? <Spud key={run.id} message={run.message} onDone={done} /> : null
}
