import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'

// Rendered in place of a page's real content when the signed-in user lacks
// view rights on it — used instead of silently redirecting to "/", which
// just looks like the click did nothing. Deliberately does not touch the
// URL: whoever typed/bookmarked the link can see plainly why nothing loaded
// rather than landing back on the Dashboard wondering what happened.
//
// The picture is a lease-gate sign with the gate under it. Press "Unlock access" (or click the Seros gate-box in the picture) and the barrier lifts, strains, and drops back, with a line of rig-floor humour. It never unlocks
// anything: access is only ever granted by an admin under User Rights.
const JOKES = [
  'Nice try. The gate stays shut.',
  'Locked. The key is with an admin, not with us.',
  'Tried the lock, tried the barrier. Still shut.',
  'Wrong crew badge. An admin can sort you the right one.',
  'The barrier went up. The lock did not.',
  'Badge didn’t scan. An admin can grant this page.',
  'The gate knows you. It still will not open.',
  'Stop-work on this door. An admin lifts it.',
  'Right uniform, wrong permit. Ask an admin.',
  'We checked the lock twice. Still an admin’s key.',
]
const RED = '#d9221c'
const INK = '#17181d'
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

function Hand() {
  return (
    <g fill={INK}>
      <rect x="-19" y="-4" width="38" height="36" rx="13" />
      <rect x="-19" y="-30" width="8" height="34" rx="4" />
      <rect x="-9" y="-37" width="8" height="40" rx="4" />
      <rect x="1" y="-39" width="8" height="42" rx="4" />
      <rect x="11" y="-32" width="8" height="35" rx="4" />
      <rect x="-31" y="-2" width="9" height="26" rx="4.5" transform="rotate(-32 -26 -2)" />
    </g>
  )
}

function Gate({ trying, onTry }) {
  return (
    <svg viewBox="0 0 600 310" className="w-full" role="img" aria-label="A restricted area sign reading authorised personnel only, above a closed lease gate with a striped barrier arm and a flashing beacon">
      <defs>
        <linearGradient id="gate-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14295e" /><stop offset="60%" stopColor="#5d5a9a" /><stop offset="100%" stopColor="#e7a37c" />
        </linearGradient>
        <pattern id="gate-stripes" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="15" height="30" fill="#f5c21b" /><rect x="15" width="15" height="30" fill="#17203d" />
        </pattern>
      </defs>
      <rect width="600" height="310" fill="url(#gate-sky)" />
      <path d="M0,262 L600,262 L600,310 L0,310 Z" fill="#7b4f31" />
      <path d="M0,282 L600,282 L600,310 L0,310 Z" fill="#5f3d25" />

      {/* sign posts and the sign */}
      <rect x="148" y="170" width="10" height="94" fill="#20253a" />
      <rect x="442" y="170" width="10" height="94" fill="#20253a" />
      <rect x="86" y="22" width="428" height="160" rx="16" fill="#ffffff" stroke={RED} strokeWidth="8" />
      <path d="M94,30 H506 a8,8 0 0 1 8,8 V66 H86 V38 a8,8 0 0 1 8,-8 Z" fill={RED} />
      <text x="300" y="60" textAnchor="middle" fontSize="31" fontWeight="800" letterSpacing="1" fill="#fff" fontFamily={FONT}>RESTRICTED AREA</text>
      {/* prohibition symbol with the stop hand */}
      <g transform="translate(168 124)">
        <circle r="42" fill="none" stroke={RED} strokeWidth="8" />
        <line x1="-30" y1="-30" x2="30" y2="30" stroke={RED} strokeWidth="8" />
        <g transform="scale(0.78) translate(0 4)"><Hand /></g>
      </g>
      <line x1="232" y1="80" x2="232" y2="168" stroke={INK} strokeWidth="3" />
      <g fill={INK} fontFamily={FONT} fontWeight="800" fontSize="26" letterSpacing="0.5">
        <text x="248" y="106">AUTHORISED</text>
        <text x="248" y="138">PERSONNEL</text>
        <text x="248" y="170">ONLY</text>
      </g>

      {/* gate: control box with the Seros logo (click it), barrier arm, catch post */}
      <rect x="522" y="208" width="16" height="56" rx="3" fill="#17203d" />
      <g className={`gate-arm ${trying ? 'trying' : ''}`}>
        <rect x="62" y="226" width="474" height="15" rx="3" fill="url(#gate-stripes)" stroke="#17203d" strokeWidth="2" />
        <rect x="34" y="224" width="40" height="19" rx="3" fill="#17203d" />
      </g>
      <g
        role="button"
        tabIndex={0}
        aria-label="Seros gate control"
        onClick={onTry}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTry())}
        className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-[#f5c21b]"
      >
        <rect x="28" y="206" width="84" height="58" rx="8" fill="#ffffff" stroke="#17203d" strokeWidth="3" />
        <image href="/branding/seros-logo.png" x="36" y="222" width="68" height="26" preserveAspectRatio="xMidYMid meet" />
        <circle className={trying ? 'blink-fast' : 'blink-amber'} cx="70" cy="196" r="8" fill="#ff9d1c" />
        <circle className={trying ? 'blink-fast' : 'blink-amber'} cx="70" cy="196" r="16" fill="#ff9d1c" fillOpacity="0.25" />
      </g>
    </svg>
  )
}

export default function AccessDenied() {
  const [trying, setTrying] = useState(false)
  const [joke, setJoke] = useState(JOKES[0])
  const timer = useRef(0)
  const lastJoke = useRef(-1)
  useEffect(() => () => clearTimeout(timer.current), [])
  function tryGate() {
    if (trying) return
    let i = Math.floor(Math.random() * JOKES.length)
    if (i === lastJoke.current) i = (i + 1) % JOKES.length // never the same line twice running
    lastJoke.current = i
    setJoke(JOKES[i])
    setTrying(true)
    timer.current = setTimeout(() => setTrying(false), 3000)
  }
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-10">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative">
          <Gate trying={trying} onTry={tryGate} />
          {trying && (
            <p role="status" className="animate-in fade-in-0 slide-in-from-bottom-2 absolute bottom-3 left-1/2 w-max max-w-[92%] -translate-x-1/2 rounded-full bg-[#17203d]/90 px-4 py-1.5 text-center text-sm font-semibold text-white shadow-lg duration-300 motion-reduce:animate-none">
              {joke}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-4 px-8 pb-9 pt-7 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Access denied</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Authorised crew only</h1>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-muted-foreground">
              You don't have permission to view this page. If you think this is a mistake, ask an admin to
              grant you access under User Rights.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={tryGate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Unlock access
            </button>
            <Link
              to="/"
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back to the home page
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
