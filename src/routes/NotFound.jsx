import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home as HomeIcon, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageSearch from '@/components/PageSearch'

// A page that does not exist: a dry well. Seros runs mobile onshore land rigs, so this is one of those: a lattice
// mast on its substructure, the doghouse with the company name, ramps down either side. The rig crew are still
// working, the block still travels, but nothing is coming up.
const MAST_BASE = 190
const MAST_TOP = 28
const legX = (y) => (MAST_BASE - y) / (MAST_BASE - MAST_TOP) * 8 // how far each leg leans in at height y

function DryWell({ tipped, onLettering }) {
  const rungs = Array.from({ length: 10 }, (_, i) => MAST_BASE - 8 - i * 16)
  return (
    <svg viewBox="0 0 600 300" className="w-full" role="img" aria-label="A Seros land rig at dusk: a lattice mast over the rig floor, its block still travelling, on dry cracked ground with a tumbleweed rolling by">
      <defs>
        <linearGradient id="dry-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2c78" /><stop offset="48%" stopColor="#b8548f" /><stop offset="82%" stopColor="#f0966f" /><stop offset="100%" stopColor="#f7c98f" />
        </linearGradient>
      </defs>
      <rect width="600" height="300" fill="url(#dry-sky)" />
      <path d="M-20,92 Q120,60 250,84 T520,70 T640,90 L640,150 L-20,150 Z" fill="#fff" fillOpacity="0.07" />
      <circle cx="478" cy="196" r="42" fill="#fde68a" fillOpacity="0.95" />
      <circle cx="478" cy="196" r="66" fill="#fde68a" fillOpacity="0.16" />
      {/* ground, cracked */}
      <path d="M0,238 Q150,228 300,236 T600,230 L600,300 L0,300 Z" fill="#a9724a" />
      <path d="M0,262 Q160,254 300,262 T600,258 L600,300 L0,300 Z" fill="#8c5c3a" />
      <g stroke="#5e3b22" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeOpacity="0.7">
        <path d="M40,262 l14,-8 l10,6 l12,-10" /><path d="M110,278 l10,-7 l14,4" /><path d="M200,272 l12,-6 l8,8 l14,-6" />
        <path d="M430,268 l12,-8 l10,6 l14,-9" /><path d="M510,280 l10,-6 l12,5" /><path d="M340,282 l9,-6 l10,6" />
      </g>

      {/* guy lines */}
      <g stroke="#f4e9ff" strokeOpacity="0.5" strokeWidth="1">
        <line x1="254" y1="34" x2="120" y2="240" /><line x1="254" y1="34" x2="404" y2="240" /><line x1="254" y1="60" x2="170" y2="240" />
      </g>

      {/* substructure, the rig floor, ramps */}
      <g stroke="#0e1f48" fill="none">
        <g strokeWidth="2.2"><line x1="196" y1="196" x2="196" y2="238" /><line x1="232" y1="196" x2="232" y2="238" /><line x1="278" y1="196" x2="278" y2="238" /><line x1="314" y1="196" x2="314" y2="238" /></g>
        <g strokeWidth="1.3"><line x1="196" y1="198" x2="232" y2="236" /><line x1="232" y1="198" x2="196" y2="236" /><line x1="278" y1="198" x2="314" y2="236" /><line x1="314" y1="198" x2="278" y2="236" /></g>
        <g strokeWidth="3"><line x1="190" y1="192" x2="118" y2="238" /><line x1="320" y1="192" x2="392" y2="238" /></g>
        <g strokeWidth="1.4"><line x1="190" y1="172" x2="124" y2="214" /><line x1="320" y1="172" x2="386" y2="214" /></g>
        <g strokeWidth="1" strokeOpacity="0.7">{[0, 1, 2, 3, 4].map((i) => <line key={i} x1={186 - i * 14} y1={174 + i * 11} x2={186 - i * 14} y2={192 + i * 11 - 0} />)}</g>
      </g>
      <rect x="186" y="188" width="138" height="9" rx="1.5" fill="#0e1f48" />

      {/* mast: two leaning legs, zigzag bracing, monkey board, crown */}
      <g stroke="#14285a" strokeLinecap="round">
        <line x1={238} y1={MAST_BASE} x2={238 + 8} y2={MAST_TOP} strokeWidth="3.2" />
        <line x1={270} y1={MAST_BASE} x2={270 - 8} y2={MAST_TOP} strokeWidth="3.2" />
        {rungs.map((y, i) => (
          <g key={y} strokeWidth="1.4">
            <line x1={238 + legX(y)} y1={y} x2={270 - legX(y)} y2={y} />
            <line x1={i % 2 ? 238 + legX(y) : 270 - legX(y)} y1={y} x2={i % 2 ? 270 - legX(y + 16) : 238 + legX(y + 16)} y2={y + 16} />
          </g>
        ))}
      </g>
      <rect x="268" y="82" width="34" height="9" rx="1.5" fill="#14285a" />
      <g stroke="#14285a" strokeWidth="1.4"><line x1="270" y1="82" x2="270" y2="70" /><line x1="300" y1="82" x2="300" y2="70" /><line x1="270" y1="70" x2="300" y2="70" /></g>
      <rect x="246" y="22" width="16" height="9" rx="1.5" fill="#14285a" />
      <circle className="rig-light" cx="254" cy="18" r="3.2" fill="#ff5a4f" />
      <circle className="rig-light rig-light-b" cx="254" cy="120" r="3" fill="#7dffb2" />

      {/* doghouse with the company name */}
      <rect x="200" y="160" width="64" height="29" fill="#f4f8fd" />
      <rect x="196" y="156" width="72" height="6" fill="#14285a" />
      <text x="232" y="180" textAnchor="middle" fontSize="11.5" fontWeight="800" letterSpacing="1.4" fill="#17356f" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">SEROS</text>
      <rect x="204" y="164" width="56" height="22" fill="transparent" onClick={onLettering} />
      <circle className="rig-light" cx="196" cy="186" r="2.6" fill="#f59e0b" />

      {/* the travelling block and its line: it runs the full height of the mast, down through the floor to the hole */}
      <line className="rig-line" x1="254" y1="31" x2="254" y2="101" stroke="#f4e9ff" strokeOpacity="0.8" strokeWidth="1.2" />
      <g className="rig-block"><rect x="247" y="101" width="14" height="12" rx="2" fill="#f5c21b" stroke="#14285a" strokeWidth="1.2" /><rect x="251" y="113" width="6" height="6" fill="#14285a" /></g>

      {/* mud tank, and the empty bucket */}
      <rect x="348" y="214" width="56" height="26" rx="2" fill="#9db7d6" />
      <g stroke="#6f89ad" strokeWidth="1.2"><line x1="362" y1="214" x2="362" y2="240" /><line x1="376" y1="214" x2="376" y2="240" /><line x1="390" y1="214" x2="390" y2="240" /></g>
      <g className={tipped ? 'bucket-tip' : ''}>
        <path d="M70,238 h34 l-4,22 h-26 Z" fill="#6b7280" />
        <ellipse cx="87" cy="238" rx="17" ry="3.6" fill="#374151" />
      </g>
      {tipped && <ellipse className="bucket-drop" cx="50" cy="242" rx="2.6" ry="3.6" fill="#0b1226" />}
      <g className="tumbleweed">
        <g transform="translate(0 248)">
          <circle r="13" fill="none" stroke="#7a4d24" strokeWidth="2" />
          <path d="M-13,0 H13 M0,-13 V13 M-9,-9 L9,9 M9,-9 L-9,9" stroke="#7a4d24" strokeWidth="1.4" />
        </g>
      </g>
    </svg>
  )
}

export default function NotFound() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // Hidden: five quick clicks on the SEROS lettering on the doghouse tip the empty bucket. One drop falls, the
  // caption flickers, and the well goes back to being dry.
  const [tipped, setTipped] = useState(false)
  const count = useRef({ n: 0, timer: 0 })
  const resetTimer = useRef(0)
  useEffect(() => () => { clearTimeout(count.current.timer); clearTimeout(resetTimer.current) }, [])
  function onLettering() {
    if (tipped) return
    const c = count.current
    clearTimeout(c.timer)
    c.n += 1
    if (c.n < 5) {
      c.timer = setTimeout(() => (c.n = 0), 2000)
      return
    }
    c.n = 0
    setTipped(true)
    resetTimer.current = setTimeout(() => setTipped(false), 3600)
  }
  return (
    <div className="mx-auto max-w-3xl pb-72 pt-4">
      <div className="rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative overflow-hidden rounded-t-3xl">
          <DryWell tipped={tipped} onLettering={onLettering} />
          {tipped && (
            <p role="status" className="bucket-caption absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#14285a]/90 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
              One drop… and it's dry again.
            </p>
          )}
        </div>
        <div className="px-8 pb-9 pt-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Error 404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">This well is dry</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            We drilled all the way down and found nothing at{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">{pathname}</code>. The page may have moved, or it was never there.
          </p>
          <div className="relative z-10 mx-auto mt-6 max-w-md text-left">
            <PageSearch />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => navigate('/')}>
              <HomeIcon className="h-4 w-4" /> Back to the rig floor
            </Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Go back
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
