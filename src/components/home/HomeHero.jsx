import { useMemo } from 'react'
import PageSearch from '@/components/PageSearch'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Quiet contour lines and sonar rings, drawn once from a formula: a nod to charts and offshore survey work
// without competing with the greeting. Pure decoration, hidden from assistive technology.
function Contours() {
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
        <circle key={r.r} cx="1040" cy="60" r={r.r} fill="none" stroke="#7fe3d6" strokeOpacity={Math.max(r.o, 0.03)} strokeWidth="1" />
      ))}
      {lines.map((l, i) => (
        <path key={i} d={l.d} fill="none" stroke="#ffffff" strokeOpacity={Math.max(l.o, 0.03)} strokeWidth="1" />
      ))}
    </svg>
  )
}

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// The welcome: who and when, and a search that can take you anywhere.
export default function HomeHero({ firstName, info }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <section className="relative rounded-3xl" style={{ background: 'linear-gradient(118deg, #1c448a 0%, #17356f 48%, #0f2650 100%)' }}>
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <Contours />
      </div>
      <div className="relative z-10 px-8 pb-8 pt-9 text-white sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#8fe6da]">{today}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/70">
              Here is what needs you today, and a quick way to everything else.
            </p>
          </div>
        </div>

        <div className="mt-7 max-w-2xl">
          <PageSearch variant="hero" />
        </div>

        {info?.last_login && <p className="mt-4 text-xs text-white/45">Last signed in {formatTime(info.last_login)}</p>}
      </div>
    </section>
  )
}
