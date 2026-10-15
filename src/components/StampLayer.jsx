import { useEffect, useRef, useState } from 'react'
import { lowPowerDevice } from '@/lib/perf'

// APPROVED / REJECTED, stamped onto the page: it drops in large, lands with a thump (a brief shake of the
// screen and an ink ring), stays a moment, then lifts away. The edges are roughened with an SVG filter so it
// looks inked, not typeset. Plays on `seros:stamp`; with reduced motion it simply appears and fades.
const KINDS = {
  approved: { word: 'APPROVED', colour: '#15803d', sub: 'Signed off' },
  rejected: { word: 'REJECTED', colour: '#b91c1c', sub: null },
}
const SHOW_MS = 2300

export default function StampLayer() {
  const [kind, setKind] = useState(null)
  const [run, setRun] = useState(0)
  const timer = useRef(0)

  useEffect(() => {
    const play = (e) => {
      if (!KINDS[e.detail?.kind]) return
      clearTimeout(timer.current)
      setKind(e.detail.kind)
      setRun((n) => n + 1)
      timer.current = setTimeout(() => setKind(null), SHOW_MS)
      // the thump: a short shake of the page as the stamp lands
      const main = document.getElementById('main-content')
      if (main && !lowPowerDevice() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        main.animate(
          [{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(-2px,-1px)' }, { transform: 'translate(0,0)' }],
          { duration: 260, delay: 230, easing: 'ease-out' },
        )
      }
    }
    window.addEventListener('seros:stamp', play)
    return () => {
      window.removeEventListener('seros:stamp', play)
      clearTimeout(timer.current)
    }
  }, [])

  const k = kind && KINDS[kind]
  if (!k) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center">
      <svg width="0" height="0" className="absolute">
        <filter id="stamp-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </svg>
      {(
        <div key={run} role="status" className="stamp-thump relative" style={{ color: k.colour }}>
          <span className="stamp-ring absolute inset-0 rounded-[1.25rem] border-4" style={{ borderColor: k.colour }} />
          <div
            className="rounded-[1.25rem] border-[7px] px-10 py-4 text-center"
            style={{ borderColor: k.colour, filter: lowPowerDevice() ? undefined : 'url(#stamp-ink)', background: 'rgba(255,255,255,0.0)' }}
          >
            <p className="text-6xl font-black leading-none tracking-[0.12em] sm:text-7xl">{k.word}</p>
            {k.sub && <p className="mt-2 text-sm font-bold uppercase tracking-[0.4em] opacity-80">{k.sub}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
