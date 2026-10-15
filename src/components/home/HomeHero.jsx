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
        <circle key={r.r} className="sonar-ring" style={{ animationDelay: `${r.r * 3}ms` }} cx="1040" cy="60" r={r.r} fill="none" stroke="#7fe3d6" strokeOpacity={Math.max(r.o, 0.03)} strokeWidth="1" />
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

// The hidden "drill-down": an offshore jack-up rig (flare flickering, deck lights blinking) stands in the swell
// while a Seros bulk carrier sails the whole width of the banner. Decoration only; shown for a few seconds.
function OffshoreScene() {
  const wave = (y, amp, len) => {
    let d = `M0,${y}`
    for (let x = 0; x <= 2400; x += 20) d += ` L${x},${(y + amp * Math.sin((x / len) * Math.PI * 2)).toFixed(1)}`
    return `${d} L2400,400 L0,400 Z`
  }
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* jack-up rig */}
      <g transform="translate(985 352) scale(0.62) translate(-985 -352)">
      <g className="rig-rise">
        <g stroke="#dbe9f7" strokeWidth="3" strokeOpacity="0.9" fill="none">
          <line x1="905" y1="238" x2="905" y2="352" />
          <line x1="985" y1="238" x2="985" y2="352" />
          <line x1="1065" y1="238" x2="1065" y2="352" />
          <line x1="905" y1="262" x2="985" y2="290" strokeWidth="1.5" /><line x1="985" y1="262" x2="905" y2="290" strokeWidth="1.5" />
          <line x1="985" y1="262" x2="1065" y2="290" strokeWidth="1.5" /><line x1="1065" y1="262" x2="985" y2="290" strokeWidth="1.5" />
        </g>
        <rect x="880" y="222" width="210" height="18" rx="3" fill="#dbe9f7" fillOpacity="0.95" />
        <rect x="898" y="204" width="60" height="18" fill="#c3d8ec" fillOpacity="0.95" />
        <rect x="1030" y="196" width="46" height="26" fill="#c3d8ec" fillOpacity="0.95" />
        <rect x="1038" y="186" width="30" height="10" rx="2" fill="#f59e0b" fillOpacity="0.9" />
        {/* derrick */}
        <polygon points="972,222 1000,222 992,112 980,112" fill="none" stroke="#dbe9f7" strokeWidth="2.5" strokeOpacity="0.95" />
        <g stroke="#dbe9f7" strokeWidth="1.2" strokeOpacity="0.8">
          <line x1="975" y1="195" x2="997" y2="195" /><line x1="977" y1="165" x2="995" y2="165" /><line x1="979" y1="138" x2="993" y2="138" />
          <line x1="972" y1="222" x2="992" y2="165" /><line x1="1000" y1="222" x2="980" y2="165" />
        </g>
        <rect x="978" y="104" width="16" height="8" fill="#dbe9f7" />
        <circle className="rig-light" cx="986" cy="100" r="3.5" fill="#ff5a4f" />
        <circle className="rig-light rig-light-b" cx="885" cy="219" r="3" fill="#7fe3d6" />
        <circle className="rig-light" cx="1088" cy="219" r="3" fill="#f59e0b" />
        {/* flare boom and flame */}
        <line x1="1090" y1="226" x2="1128" y2="196" stroke="#dbe9f7" strokeWidth="3" strokeOpacity="0.9" />
        <path className="rig-flare" d="M1128,196 C1118,184 1124,172 1128,160 C1132,172 1140,184 1128,196 Z" fill="#f59e0b" />
        <path className="rig-flare rig-flare-b" d="M1128,196 C1123,188 1126,181 1128,174 C1130,181 1134,188 1128,196 Z" fill="#fde68a" />
      </g>
      </g>

      {/* Seros bulk carrier, sailing left to right (stern and accommodation on the left, as in the fleet photo) */}
      <g className="boat-sail">
        <g transform="translate(0 316) scale(0.55) translate(0 -326)">
          <g className="boat-bob">
            {/* hull: blue topsides, red below the waterline stripe */}
            <path d="M24,328 L430,328 L452,300 L12,300 Z" fill="#d8574a" />
            <path d="M10,284 L440,284 L458,276 L446,300 L14,300 Z" fill="#1d4fa3" stroke="#9cc0ef" strokeWidth="1.5" strokeOpacity="0.6" />
            <text x="232" y="297" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="4" fill="#ffffff" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">SEROS</text>
            {/* cargo hatches and cranes */}
            <g fill="#e07a6b" fillOpacity="0.95">
              <rect x="108" y="276" width="60" height="8" /><rect x="188" y="276" width="60" height="8" /><rect x="268" y="276" width="60" height="8" /><rect x="348" y="276" width="60" height="8" />
            </g>
            <g stroke="#f4f8fd" strokeOpacity="0.95" strokeWidth="2.5" fill="none">
              <line x1="146" y1="276" x2="146" y2="244" /><line x1="226" y1="276" x2="226" y2="244" /><line x1="306" y1="276" x2="306" y2="244" /><line x1="386" y1="276" x2="386" y2="244" />
            </g>
            <g stroke="#f4f8fd" strokeOpacity="0.7" strokeWidth="1.5">
              <line x1="146" y1="244" x2="188" y2="236" /><line x1="226" y1="244" x2="268" y2="236" /><line x1="306" y1="244" x2="348" y2="236" />
            </g>
            <g fill="#d8574a"><rect x="142" y="242" width="8" height="8" /><rect x="222" y="242" width="8" height="8" /><rect x="302" y="242" width="8" height="8" /><rect x="382" y="242" width="8" height="8" /></g>
            {/* accommodation block, bridge, funnel and mast */}
            <rect x="22" y="246" width="70" height="38" fill="#f4f8fd" />
            <rect x="30" y="226" width="54" height="20" fill="#f4f8fd" />
            <rect x="38" y="212" width="38" height="14" fill="#f4f8fd" />
            <g fill="#17356f"><rect x="32" y="232" width="50" height="6" /><rect x="40" y="216" width="34" height="5" /><rect x="30" y="256" width="8" height="6" /><rect x="44" y="256" width="8" height="6" /><rect x="58" y="256" width="8" height="6" /><rect x="72" y="256" width="8" height="6" /></g>
            <rect x="78" y="226" width="9" height="20" fill="#1d4fa3" />
            <line x1="57" y1="212" x2="57" y2="188" stroke="#f4f8fd" strokeWidth="2" /><circle cx="57" cy="186" r="3" fill="#3dbdb0" />
          </g>
        </g>
      </g>

      {/* swell in front of both */}
      <g className="swell swell-a"><path d={wave(318, 7, 220)} fill="#3dbdb0" fillOpacity="0.2" /></g>
      <g className="swell swell-b"><path d={wave(332, 6, 160)} fill="#1a3f7a" fillOpacity="0.55" /></g>
    </svg>
  )
}

// The welcome: who and when, and a search that can take you anywhere.
export default function HomeHero({ firstName, info, drilling = false }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <section data-shelf className={`relative rounded-3xl ${drilling ? 'hero-drill' : ''}`} style={{ background: 'linear-gradient(118deg, #1c448a 0%, #17356f 48%, #0f2650 100%)' }}>
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <Contours />
        {drilling && <OffshoreScene />}
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
              {drilling ? 'Seros vessel inbound… permission to come aboard?' : 'Here is what needs you today, and a quick way to everything else.'}
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
