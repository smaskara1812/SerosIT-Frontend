import { useEffect, useRef, useState } from 'react'

// "Spud in": oil gushes up from the bottom centre in a tall plume, arcs over and rains back down. Any element
// marked `data-shelf` (the cards and the banner) catches it: drops land on the top edge, pool into glossy blobs,
// then creep to the nearest corner and drip off onto whatever is below. Plays on the `seros:gusher` event; with
// reduced motion only the message shows.
// Crude is nearly black; a few drops catch the brand teal and amber, the way a sheen does on oil.
const COLOURS = ['#05080f', '#070b18', '#0a1020', '#0b1226', '#0f1a33', '#0f2650', '#0f2650', '#16305f', '#0d3b3f', '#7a4a07']

// A glossy teardrop: round head leading in the direction of travel, tapering tail behind, a bright specular
// fleck and a faint rim light so it reads as liquid and not as a coloured dot.
function drawDrop(ctx, d, alpha, stretch) {
  const r = d.r
  const speed = Math.hypot(d.vx, d.vy)
  const L = r * (1.5 + Math.min(stretch, 3.2) * (speed > 0.5 ? 1 : 0.2))
  ctx.save()
  ctx.translate(d.x, d.y)
  ctx.rotate(Math.atan2(d.vy, d.vx))
  ctx.globalAlpha = alpha
  ctx.fillStyle = d.c
  ctx.beginPath()
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2)
  ctx.quadraticCurveTo(-L * 0.35, r * 0.62, -L, 0)
  ctx.quadraticCurveTo(-L * 0.35, -r * 0.62, 0, -r)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = Math.max(0.6, r * 0.14)
  ctx.strokeStyle = 'rgba(160,215,230,0.22)'
  ctx.stroke()
  ctx.globalAlpha = alpha * 0.75
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(r * 0.32, -r * 0.38, r * 0.3, r * 0.17, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
const DURATION = 6200
const FADE = 1100
const SPOUT = 3000 // how long the plume keeps feeding

export default function GusherLayer() {
  const canvas = useRef(null)
  const [message, setMessage] = useState(null)
  const raf = useRef(0)
  const timer = useRef(0)

  useEffect(() => {
    const play = (e) => {
      cancelAnimationFrame(raf.current)
      clearTimeout(timer.current)
      setMessage(e.detail?.message || 'Spud in!')
      timer.current = setTimeout(() => setMessage(null), DURATION)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const c = canvas.current
      if (!c) return
      const dpr = window.devicePixelRatio || 1
      const W = (c.width = Math.round(window.innerWidth * dpr))
      const H = (c.height = Math.round(window.innerHeight * dpr))
      const ctx = c.getContext('2d')

      // The shelves: visible, reasonably large cards, in canvas pixels.
      const shelves = [...document.querySelectorAll('[data-shelf]')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 90 && r.height > 30 && r.bottom > 0 && r.top < window.innerHeight)
        .map((r) => ({ l: r.left * dpr + 6 * dpr, r: r.right * dpr - 6 * dpr, top: r.top * dpr }))

      const g = H * 0.00042 // gravity per 16.7ms frame
      const originX = W / 2
      const drops = []
      const blobs = []
      const spawn = (t) => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55
        const speed = Math.sqrt(2 * g * H * (0.55 + Math.random() * 0.5)) // apex between 55% and 105% of screen height
        drops.push({
          x: originX + (Math.random() - 0.5) * 22 * dpr, y: H + 4,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          r: (2 + Math.random() * 4.2) * dpr, c: COLOURS[(Math.random() * COLOURS.length) | 0], born: t,
        })
      }

      let last = performance.now()
      const start = last
      const frame = (now) => {
        const t = now - start
        const k = Math.min(3, (now - last) / 16.67)
        last = now
        ctx.clearRect(0, 0, W, H)
        const fade = t > DURATION - FADE ? Math.max(0, (DURATION - t) / FADE) : 1

        if (t < SPOUT) for (let i = 0; i < 4; i++) spawn(t)

        // falling drops
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i]
          const prevY = d.y
          d.vy += g * k
          d.x += d.vx * k
          d.y += d.vy * k
          if (d.vy > 0) {
            const s = shelves.find((sh) => d.x > sh.l && d.x < sh.r && prevY + d.r <= sh.top && d.y + d.r >= sh.top)
            if (s) {
              blobs.push({ s, x: d.x, w: d.r * (1.5 + Math.random()), h: d.r * 0.55, c: d.c, landed: t, hold: 500 + Math.random() * 1400, vx: 0 })
              if (d.r > 3.5 * dpr) for (let n = 0; n < 2; n++) {
                drops.push({ x: d.x, y: s.top - 2, vx: (Math.random() - 0.5) * 2.6 * dpr, vy: -(1.5 + Math.random() * 2.2) * dpr, r: d.r * 0.32, c: d.c, born: t })
              }
              drops.splice(i, 1)
              continue
            }
          }
          if (d.y > H + 30 || d.x < -30 || d.x > W + 30) {
            drops.splice(i, 1)
            continue
          }
          drawDrop(ctx, d, fade, Math.abs(d.vy) / (H * 0.012))
        }

        // pooled blobs: sit, then creep toward the nearest edge and drip off
        for (let i = blobs.length - 1; i >= 0; i--) {
          const b = blobs[i]
          if (t - b.landed > b.hold) {
            const dir = b.x - (b.s.l + b.s.r) / 2 < 0 ? -1 : 1
            b.vx += dir * 0.012 * dpr * k
            b.x += b.vx * k
            b.h += 0.015 * dpr * k // the drip swells as it nears the edge
          }
          if (b.x < b.s.l - 2 || b.x > b.s.r + 2) {
            drops.push({ x: b.x, y: b.s.top + b.h, vx: 0, vy: 0.5 * dpr, r: Math.max(2 * dpr, b.h * 1.1), c: b.c, born: t })
            blobs.splice(i, 1)
            continue
          }
          ctx.globalAlpha = fade
          ctx.fillStyle = b.c
          ctx.beginPath()
          ctx.ellipse(b.x, b.s.top - b.h * 0.3, b.w, b.h, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.lineWidth = Math.max(0.6, dpr * 0.8)
          ctx.strokeStyle = 'rgba(160,215,230,0.25)'
          ctx.stroke()
          ctx.globalAlpha = fade * 0.35
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.ellipse(b.x - b.w * 0.3, b.s.top - b.h * 0.6, b.w * 0.25, b.h * 0.22, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.globalAlpha = 1
        if (t < DURATION) raf.current = requestAnimationFrame(frame)
        else ctx.clearRect(0, 0, W, H)
      }
      raf.current = requestAnimationFrame(frame)
    }
    window.addEventListener('seros:gusher', play)
    return () => {
      window.removeEventListener('seros:gusher', play)
      cancelAnimationFrame(raf.current)
      clearTimeout(timer.current)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden={!message}>
      <canvas ref={canvas} className="h-full w-full" />
      {message && (
        <div className="absolute inset-x-0 bottom-10 flex justify-center px-4" role="status">
          <p className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 rounded-2xl bg-[#0f2650] px-6 py-3.5 text-center text-lg font-bold tracking-tight text-white shadow-2xl shadow-black/30 duration-500 motion-reduce:animate-none">
            {message}
          </p>
        </div>
      )}
    </div>
  )
}
