import { useEffect, useMemo, useState } from 'react'
import { pickGreeting } from '@/lib/greeting'
import OffshoreScene from '@/components/home/OffshoreScene'
import { lowPowerDevice } from '@/lib/perf'
import PageSearch from '@/components/PageSearch'

// Quiet contour lines and sonar rings, drawn once from a formula: a nod to charts and offshore survey work
// without competing with the greeting. Pure decoration, hidden from assistive technology. The arrow keys make the
// sonar ping: a ring sweeps out from its centre, the way a sonar answers a pulse. (They are ignored while typing in a
// field, and never stop the page from scrolling.)
const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const PING_MS = 1300
const PING_GAP = 20 // a press within this long of the last ping is ignored, so tapping or holding a key stays calm
const SONAR = { x: 1040, y: 60 }

function Contours() {
  const [pings, setPings] = useState([])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timers = new Set()
    let n = 0
    let lastAt = 0
    const onKey = (e) => {
      const t = e.target
      if (!ARROWS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return
      const now = performance.now()
      if (now - lastAt < PING_GAP) return
      lastAt = now
      const id = ++n
      setPings((p) => [...p.slice(-1), id]) // at most two at once
      const timer = setTimeout(() => {
        timers.delete(timer)
        setPings((p) => p.filter((x) => x !== id))
      }, PING_MS)
      timers.add(timer)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      timers.forEach(clearTimeout)
    }
  }, [])
  const { lines, rings } = useMemo(() => {
    const W = 1200
    const lines = Array.from({ length: 13 }, (_, i) => {
      const y0 = 40 + i * 24
      const pts = []
      for (let x = 0; x <= W; x += 20) {
        const y = y0 + 16 * Math.sin(x / 170 + i * 0.55) + 7 * Math.sin(x / 63 + i * 1.3)
        pts.push(`${x},${y.toFixed(1)}`)
      }
      return { d: `M${pts.join(' L')}`, o: 0.13 - i * 0.007 }
    })
    const rings = Array.from({ length: 7 }, (_, i) => ({ r: 80 + i * 52, o: 0.2 - i * 0.025 }))
    return { lines, rings }
  }, [])
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="home-glow" cx="86%" cy="18%" r="55%">
          <stop offset="0%" stopColor="#3dbdb0" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3dbdb0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="360" fill="url(#home-glow)" />
      {rings.map((r) => (
        <circle key={r.r} className="sonar-ring" style={{ animationDelay: `${r.r * 3}ms` }} cx={SONAR.x} cy={SONAR.y} r={r.r} fill="none" stroke="#7fe3d6" strokeOpacity={Math.max(r.o, 0.03)} strokeWidth="1" />
      ))}
      {pings.map((id) => (
        <g key={id}>
          <circle className="sonar-ping" cx={SONAR.x} cy={SONAR.y} r="350" fill="none" stroke="#9ff0e4" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <circle className="sonar-blip" cx={SONAR.x} cy={SONAR.y} r="16" fill="#8fe6da" />
        </g>
      ))}
      {lines.map((l, i) => (
        <path key={i} className="contour-line" style={{ animationDelay: `${i * 70}ms` }} d={l.d} fill="none" stroke="#ffffff" strokeOpacity={Math.max(l.o, 0.03)} strokeWidth="1" />
      ))}
    </svg>
  )
}

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// The welcome: who and when, and a search that can take you anywhere.
export default function HomeHero({ firstName, info, drilling = false, hint = null }) {
  // Chosen once per visit (re-chosen only if the name arrives late), so it does not change while the page is open.
  const greeting = useMemo(() => pickGreeting(firstName), [firstName])
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <section data-shelf className={`relative rounded-3xl ${drilling ? `hero-drill ${lowPowerDevice() ? 'hero-drill-lite' : ''}` : ''}`} style={{ background: 'linear-gradient(118deg, #1c448a 0%, #17356f 48%, #0f2650 100%)' }}>
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <Contours />
        {drilling && <OffshoreScene />}
      </div>
      <div className="relative z-10 px-8 pb-8 pt-9 text-white sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#8fe6da]">{today}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {greeting.title}
            </h1>
            <p key={hint ?? 'sub'} style={{ minHeight: '3.05rem', textWrap: 'balance' }} className={`mt-2 max-w-md text-[15px] leading-relaxed text-white/70 ${hint ? 'animate-in fade-in-0 duration-1000 italic text-white/60' : ''}`}>
              {drilling ? 'Seros vessel alongside the Wildcat… permission to come aboard?' : hint ?? greeting.sub}
            </p>
          </div>
        </div>

        <div
          className={`mt-7 max-w-2xl transition-opacity duration-500 ${drilling ? 'pointer-events-none opacity-0' : ''}`}
          inert={drilling}
        >
          <PageSearch variant="hero" />
        </div>

        {info?.last_login && <p className="mt-4 text-xs text-white/45">Last signed in {formatTime(info.last_login)}</p>}
      </div>
    </section>
  )
}
