import { useMemo } from 'react'

// The Essar Wildcat, a semi-submersible drilling rig, shared by the hidden banner scenes (the Konami ship scene and the
// crew change). Drawn after the fleet photo: big rust-orange columns with a black splash-zone band, diagonal bracing, a
// dark deck with the name on its face, a white accommodation block, a lattice derrick and two blue cranes. Decoration only.

const wave = (y, amp, len) => {
  let d = `M0,${y}`
  for (let x = 0; x <= 2400; x += 20) d += ` L${x},${(y + amp * Math.sin((x / len) * Math.PI * 2)).toFixed(1)}`
  return `${d} L2400,400 L0,400 Z`
}

// The derrick's two leaning legs and zigzag bracing, in the rig's own units (waterline at y = 0, up is negative).
const DERRICK_BASE = -100
const DERRICK_TOP = -262
const legL = (y) => -26 + (10 * (DERRICK_BASE - y)) / (DERRICK_BASE - DERRICK_TOP)
const legR = (y) => 10 - (10 * (DERRICK_BASE - y)) / (DERRICK_BASE - DERRICK_TOP)
const RUNGS = Array.from({ length: 9 }, (_, i) => DERRICK_BASE - 8 - i * 17)
const COLUMNS = [[-140, 30], [-47, 24], [47, 24], [140, 30]] // x of each column and its width
const BACK = [-94, 0, 94]


// The gradients the rig uses; render once inside the scene's <defs>.
export function WildcatDefs() {
  return (
    <>

        <linearGradient id="wc-col" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ee7a33" /><stop offset="55%" stopColor="#cf5a22" /><stop offset="100%" stopColor="#9c3d17" /></linearGradient>
        <linearGradient id="wc-back" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#a8441b" /><stop offset="100%" stopColor="#7a2f12" /></linearGradient>
      
    </>
  )
}

// `x`, `y` is where the waterline meets the rig's centre; `scale` shrinks it.
export function Wildcat({ x, y, scale }) {
  const rungs = useMemo(() => RUNGS, [])
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="rig-rise">
          {/* mooring lines running out into the water, and the pontoons just under the surface */}
          <g stroke="#cfe3f5" strokeOpacity=".35" strokeWidth="1.3" fill="none">
            <line x1="-148" y1="-14" x2="-236" y2="30" /><line x1="148" y1="-14" x2="236" y2="30" /><line x1="-100" y1="-4" x2="-190" y2="34" /><line x1="100" y1="-4" x2="190" y2="34" />
          </g>
          <rect x="-158" y="-2" width="316" height="17" rx="8.5" fill="#151a26" fillOpacity=".9" />

          {/* the far row of columns, then the bracing, then the near row */}
          {BACK.map((x) => <rect key={x} x={x - 8} y="-66" width="16" height="64" fill="url(#wc-back)" />)}
          <g stroke="#241d1a" strokeWidth="2.4" strokeLinecap="round">
            {COLUMNS.slice(0, -1).map(([x], i) => {
              const nx = COLUMNS[i + 1][0]
              return <g key={x}><line x1={x} y1="-62" x2={nx} y2="-14" /><line x1={nx} y1="-62" x2={x} y2="-14" strokeOpacity=".7" /></g>
            })}
            <line x1="-140" y1="-12" x2="140" y2="-12" strokeWidth="3" />
          </g>
          {COLUMNS.map(([x, w]) => (
            <g key={x}>
              <rect x={x - w / 2} y="-74" width={w} height="74" fill="url(#wc-col)" />
              <rect x={x - w / 2} y="-24" width={w} height="16" fill="#1f1410" fillOpacity=".92" />
              <rect x={x - w / 2 + 3} y="-72" width="3" height="46" fill="#ffb27a" fillOpacity=".4" />
              <rect x={x + w / 4} y="-62" width="2" height="34" fill="#5a1f0a" fillOpacity=".45" />
            </g>
          ))}

          {/* deck, with the name on its face, and the helideck out at the left end */}
          <rect x="-168" y="-96" width="336" height="24" fill="#3a4252" />
          <rect x="-168" y="-98" width="336" height="3" fill="#5f6b80" />
          <rect x="-168" y="-74" width="336" height="3" fill="#232a36" />
          <text x="96" y="-79" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="3" fill="#f4f7fb" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">WILDCAT</text>
          <rect x="-186" y="-103" width="62" height="4" fill="#6b778c" />
          <g stroke="#6b778c" strokeWidth="2"><line x1="-176" y1="-99" x2="-160" y2="-90" /><line x1="-136" y1="-99" x2="-148" y2="-90" /></g>

          {/* accommodation block, mud tanks, vent stacks */}
          <rect x="-92" y="-132" width="62" height="34" fill="#eef1f6" />
          <rect x="-92" y="-110" width="62" height="4" fill="#e0562a" />
          <rect x="-80" y="-146" width="40" height="14" fill="#e3e7ee" />
          <g fill="#2b3a55">{[-86, -76, -66, -56, -46, -36].map((x) => <rect key={x} x={x} y="-125" width="6" height="5" />)}{[-74, -62, -50].map((x) => <rect key={x} x={x} y="-141" width="6" height="5" />)}</g>
          <rect x="24" y="-112" width="34" height="14" fill="#d94b2b" />
          <rect x="64" y="-117" width="10" height="19" fill="#e8ecf3" /><rect x="78" y="-117" width="10" height="19" fill="#e8ecf3" />
          <line x1="104" y1="-98" x2="104" y2="-128" stroke="#c9ced8" strokeWidth="2.6" /><rect x="112" y="-126" width="5" height="28" fill="#d7452a" />

          {/* the derrick: a drill floor, two leaning legs, bracing, a white racking board and the crown */}
          <rect x="-34" y="-108" width="52" height="8" fill="#4d5565" />
          <g fill="none" stroke="#6f6c69" strokeLinecap="round">
            <line x1={legL(DERRICK_BASE)} y1={DERRICK_BASE} x2={legL(DERRICK_TOP)} y2={DERRICK_TOP} strokeWidth="3.2" />
            <line x1={legR(DERRICK_BASE)} y1={DERRICK_BASE} x2={legR(DERRICK_TOP)} y2={DERRICK_TOP} strokeWidth="3.2" />
            {rungs.map((y, i) => (
              <g key={y} strokeWidth="1.8">
                <line x1={legL(y)} y1={y} x2={legR(y)} y2={y} />
                <line x1={i % 2 ? legL(y) : legR(y)} y1={y} x2={i % 2 ? legR(y - 17) : legL(y - 17)} y2={y - 17} />
              </g>
            ))}
          </g>
          <rect x="-19" y="-270" width="22" height="9" rx="1.5" fill="#4a4846" />
          <rect x="2" y="-200" width="28" height="15" fill="#f1f3f7" stroke="#8b93a1" strokeWidth="1" />
          <line x1="0" y1="-193" x2="2" y2="-193" stroke="#6f6c69" strokeWidth="2" />

          {/* two blue cranes */}
          <g stroke="#2f73b8" fill="#2f73b8" strokeLinecap="round">
            <rect x="-134" y="-112" width="8" height="16" stroke="none" /><rect x="-138" y="-118" width="16" height="8" rx="1.5" stroke="none" />
            <line x1="-130" y1="-116" x2="-162" y2="-158" strokeWidth="4.4" /><line x1="-162" y1="-158" x2="-162" y2="-128" strokeWidth="1" stroke="#cfd8e6" />
            <rect x="120" y="-110" width="8" height="14" stroke="none" /><rect x="116" y="-116" width="16" height="8" rx="1.5" stroke="none" />
            <line x1="126" y1="-114" x2="150" y2="-150" strokeWidth="4" /><line x1="150" y1="-150" x2="150" y2="-126" strokeWidth="1" stroke="#cfd8e6" />
          </g>

          {/* flare boom and flame, lights */}
          <line x1="150" y1="-98" x2="196" y2="-126" stroke="#c9ced8" strokeWidth="3" />
          <path className="rig-flare" d="M196,-126 C189,-138 193,-150 196,-162 C199,-150 205,-138 196,-126 Z" fill="#f59e0b" />
          <path className="rig-flare rig-flare-b" d="M196,-126 C192,-133 194,-140 196,-146 C198,-140 201,-133 196,-126 Z" fill="#fde68a" />
          <circle className="rig-light" cx="-8" cy="-275" r="4" fill="#ff5a4f" />
          <circle className="rig-light rig-light-b" cx="-166" cy="-104" r="3.4" fill="#7fe3d6" />
          <circle className="rig-light" cx="150" cy="-102" r="3.4" fill="#f59e0b" />
        </g>
      
    </g>
  )
}

// Two layers of swell rolling in front of everything.
export function Swell() {
  return (
    <>
      <g className="swell swell-a"><path d={wave(318, 7, 220)} fill="#3dbdb0" fillOpacity="0.2" /></g>
      <g className="swell swell-b"><path d={wave(332, 6, 160)} fill="#1a3f7a" fillOpacity="0.55" /></g>
    </>
  )
}
