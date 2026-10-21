// The hidden "frac job" scene for the home banner (typed into the home search: "frac job" or "fracking"). A Seros frac fleet on a
// land well pad, with the Axom Rhino (a 3000 HP derrick rig, rig #26 in the system) in the background drilling the next well:
//   1. The fleet is rigged up: water tanks and a sand unit feed the blender, the pump trucks push the mix through the treating iron
//      into the manifold and on to the frac tree on the wellhead.
//   2. Plug and perf, three stages, toe first. A wireline truck runs a perforating gun down the horizontal lateral, fires it
//      (flash) and sets a plug behind it, then pulls out.
//   3. The pumps come up to rate (engines work harder, the iron shakes, the water and sand levels drop); slurry runs down the well to
//      the perforations and fractures spread out from them. The data van's trace follows the pressure and rate.
//   4. After the last stage the pumps wind down and the flowback flare lights.
// A cross-section below the pad shows the well. 18 seconds; the timings live in index.css (`.hero-frac`) and in PUMP below, so change
// them together. Decoration only.

const G = 292 // the pad surface across the banner (the banner is 1200 wide, 360 tall)
const WH = 840 // the wellhead
const LAT = 338 // the horizontal lateral
const HEEL = 862 // where the well turns horizontal
const STAGES = [1070, 985, 900] // plug and perf, toe first
const PUMP = [[3.9, 6.8], [9.4, 12.2], [14.5, 17.1]] // seconds the pumps are at rate, one window per stage
const END = 18
const DX = 1100 // the Axom Rhino's centre

const WELL = `M${WH},${G} L${WH},${LAT - 20} Q${WH},${LAT} ${HEEL},${LAT} L1130,${LAT}`
const SLURRY = STAGES.map((sx) => `M${WH},${G} L${WH},${LAT - 20} Q${WH},${LAT} ${HEEL},${LAT} L${sx},${LAT}`)

// The data van's trace: pressure (and rate) climb to a plateau with each stage and fall when the pumps stop. Same timings as PUMP.
const trace = (peak, lift) => {
  const x = (t) => ((t / END) * 76).toFixed(1)
  const y = (v) => (30 - v * 26).toFixed(1)
  let d = `M0,${y(0.04)}`
  PUMP.forEach(([s, e]) => {
    d += ` L${x(s - 0.1)},${y(0.05)} L${x(s + 0.5)},${y(peak)} L${x(e - 0.3)},${y(peak + lift)} L${x(e)},${y(0.05)}`
  })
  return `${d} L76,${y(0.04)}`
}


// The fractures: for each stage, a few clusters of perforations, each with a jagged crack running up and down from the lateral
// (never a straight line), side branches off it, and a rare sub-branch. Drawn once from a fixed seed so they are the same every time.
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const crack = (r, dir, len, drift) => {
  // returns the main path's points (relative to the perforation) and the branches off it
  const pts = [[0, 0]]
  let x = 0
  let y = 0
  const branches = []
  while (Math.abs(y) < len) {
    y += dir * (3 + r() * 2.2)
    x += drift + (r() - 0.5) * 4.2
    pts.push([x, y])
    if (r() < 0.55 && Math.abs(y) > 4) {
      const side = r() < 0.5 ? -1 : 1
      const bl = 4 + r() * 8
      const ang = 0.7 + r() * 0.7
      const bpts = [[x, y]]
      let bx = x
      let by = y
      for (let i = 0; i < 3 && Math.hypot(bx - x, by - y) < bl; i += 1) {
        bx += side * (2.4 + r() * 2.2)
        by += dir * (1 + r() * 2.2) * ang
        bpts.push([bx, by])
      }
      branches.push(bpts)
      if (r() < 0.3) {
        const [sx, sy] = bpts[bpts.length - 1]
        branches.push([[sx, sy], [sx + side * (1.5 + r() * 2), sy + dir * (2 + r() * 2.4)], [sx + side * (2.5 + r() * 3), sy + dir * (3.5 + r() * 3)]])
      }
    }
  }
  return { main: pts, branches }
}
const line = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const FRACS = STAGES.map((_, k) => {
  const r = rng(11 + k * 97)
  const paths = []
  ;[-10, 0, 10].forEach((cx, ci) => {
    ;[-1, 1].forEach((dir) => {
      const len = dir < 0 ? 17 + r() * 8 : 12 + r() * 5 // above the lateral there is more room than below
      const c = crack(r, dir, len, (r() - 0.5) * 0.8)
      const off = (pts) => pts.map(([x, y]) => [x + cx, y])
      paths.push({ d: line(off(c.main)), w: 1.8, delay: ci * 0.12 + (dir > 0 ? 0.1 : 0) })
      c.branches.forEach((b, bi) => paths.push({ d: line(off(b)), w: 0.9, delay: 0.5 + ci * 0.12 + bi * 0.06 + r() * 0.3 }))
    })
  })
  return paths
})

// Gas bubbles seeping out of the rock into each stage's fractures once they open: small, in clusters around the cracks, drifting up and
// fading, on for the rest of the scene.
const BUBBLES = STAGES.map((sx, k) => {
  const r = rng(301 + k * 53)
  return Array.from({ length: 36 }, () => ({
    x: sx + (r() - 0.5) * 64,
    y: LAT - 20 + r() * 40,
    r: 1 + r() * 1.7,
    rise: 10 + r() * 16,
    sway: (r() - 0.5) * 7,
    dur: 2.6 + r() * 2.4,
    delay: r() * 3,
  }))
})

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

// Everything below is drawn with its ground line at y = 0 and its left edge at x = 0.
function Wheels({ xs, r = 3.1 }) {
  return xs.map((x) => (
    <g key={x} transform={`translate(${x} ${-r})`}><circle r={r} fill="#161a21" /><circle r={r * 0.45} fill="#7d8798" /></g>
  ))
}

// A pump truck (a frac pumper): cab to the left, three plungers on top, discharge at the rear, and the exhaust stack. The stacks smoke
// lightly all the time and heavily while the pumps are at rate.
function Pumper({ x, i }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <g className="fz-vib">
        <rect x="0" y="-7" width="38" height="3.2" fill="#20262f" />
        <rect x="0.5" y="-18" width="10" height="11" rx="1.4" fill="#f2f5fa" />
        <rect x="2" y="-16" width="6.2" height="4.4" fill="#27456f" />
        <rect x="11.5" y="-15.5" width="26.5" height="8.5" fill="#1a3f7a" />
        <rect x="11.5" y="-11.4" width="26.5" height="1.3" fill="#2bb5a0" />
        <rect x="14" y="-21" width="21" height="5.6" rx="1" fill="#3b4658" />
        {[16.5, 23, 29.5].map((px) => <rect key={px} x={px} y="-24" width="3.6" height="4" fill="#aab4c4" />)}
        <text x="25" y="-8.6" textAnchor="middle" fontSize="4.2" fontWeight="800" letterSpacing="0.8" fill="#fff" fontFamily={FONT}>SEROS</text>
        <rect x="7.4" y="-25" width="1.8" height="8" fill="#2a2f3a" />
        <circle cx="38" cy="-13.5" r="1.4" fill="#cfd8e6" />
      </g>
      <Wheels xs={[6, 25, 32]} />
      <g className="fz-heavy">
        <circle className={`fz-smoke fz-smoke-${i % 3}`} cx="8.3" cy="-26" r="3.2" fill="#aeb6c4" />
        <circle className={`fz-smoke fz-smoke-${(i + 1) % 3}`} cx="8.3" cy="-26" r="2.6" fill="#aeb6c4" />
      </g>
      <circle className={`fz-smoke fz-smoke-light fz-smoke-${i % 3}`} cx="8.3" cy="-26" r="2" fill="#aeb6c4" />
    </g>
  )
}

// A frac tank: a long water tank on a trailer. Its level drops as the job goes on.
function Tank({ x }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <rect x="3" y="-7" width="41" height="2.6" fill="#20262f" />
      <rect x="4" y="-22" width="39" height="15.5" rx="3.4" fill="#cdd6e3" />
      <rect x="4" y="-22" width="39" height="2.4" rx="1.2" fill="#9eacc0" />
      <rect x="8" y="-19" width="31" height="9.4" rx="1.4" fill="#27456f" />
      <g transform="translate(8 -9.6)"><rect className="fz-level fz-level-water" x="0" y="-9.4" width="31" height="9.4" rx="1.4" fill="#4aa3d6" /></g>
      <text x="23.5" y="-13.4" textAnchor="middle" fontSize="3.8" fontWeight="800" letterSpacing="0.8" fill="#fff" fillOpacity="0.9" fontFamily={FONT}>SEROS</text>
      <Wheels xs={[33, 39]} />
      <rect x="0" y="-5" width="5" height="2.4" fill="#59627a" />
    </g>
  )
}

// The sand (proppant) storage unit: a tall silo on legs, with a window showing how much sand is left.
function Silo({ x }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <path d="M2,-12 L16,-12 L12.5,-5.5 L5.5,-5.5 Z" fill="#aab4c4" />
      <rect x="1" y="-40" width="16" height="28" rx="2" fill="#d8dde6" />
      <rect x="1" y="-40" width="16" height="3" rx="1.4" fill="#9eacc0" />
      <rect x="6.4" y="-35" width="5.2" height="20" rx="1" fill="#27456f" />
      <g transform="translate(6.4 -15)"><rect className="fz-level fz-level-sand" x="0" y="-20" width="5.2" height="20" rx="1" fill="#e0c27a" /></g>
      {[3, 14.5].map((lx) => <rect key={lx} x={lx} y="-6" width="1.5" height="6" fill="#59627a" />)}
      <rect x="0" y="-1.4" width="18" height="1.4" fill="#3b4658" />
    </g>
  )
}

// The blender: mixes the water, the sand and the chemicals into slurry. A sand hopper on top.
function Blender({ x }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <g className="fz-vib">
        <rect x="0" y="-7" width="38" height="3.2" fill="#20262f" />
        <rect x="0.5" y="-18" width="10" height="11" rx="1.4" fill="#f2f5fa" />
        <rect x="2" y="-16" width="6.2" height="4.4" fill="#27456f" />
        <rect x="11.5" y="-14" width="26.5" height="7" fill="#e8edf5" />
        <rect x="11.5" y="-10.6" width="26.5" height="1.3" fill="#2bb5a0" />
        <path d="M14,-26 L33,-26 L29,-14 L18,-14 Z" fill="#9eacc0" />
        <path d="M15,-25 L32,-25 L29.4,-18 L17.6,-18 Z" fill="#e0c27a" />
        <rect x="20" y="-14.5" width="6" height="2.6" fill="#59627a" />
        <text x="26" y="-8.2" textAnchor="middle" fontSize="3.8" fontWeight="800" letterSpacing="0.8" fill="#1a3f7a" fontFamily={FONT}>SEROS</text>
      </g>
      <Wheels xs={[6, 25, 32]} />
    </g>
  )
}

// The manifold trailer: collects the pumps' flow into one line to the wellhead.
function Manifold({ x }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <rect x="1" y="-6" width="36" height="2.8" fill="#20262f" />
      <rect x="2" y="-9" width="34" height="3" fill="#3b4658" />
      <g stroke="#d9a21b" strokeWidth="2.2" strokeLinecap="round">{[7, 14, 21, 28].map((px) => <line key={px} x1={px} y1="-9" x2={px} y2="-20" />)}</g>
      <line x1="5" y1="-21" x2="31" y2="-21" stroke="#d9a21b" strokeWidth="2.4" strokeLinecap="round" />
      <g fill="#a33b32">{[7, 21].map((px) => <circle key={px} cx={px} cy="-14" r="1.7" />)}</g>
      <Wheels xs={[11, 29]} r={2.8} />
    </g>
  )
}

// The data van, the job's control room, with the wireline truck beside it. The truck's drum turns as the gun goes in and comes out.
function DataVan({ x }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <rect x="0" y="-7" width="46" height="2.8" fill="#20262f" />
      <rect x="1" y="-24" width="44" height="17.5" rx="1.8" fill="#eef2f8" />
      <rect x="1" y="-24" width="44" height="2.2" rx="1" fill="#c9d2de" />
      <rect x="1" y="-10.6" width="44" height="1.5" fill="#2bb5a0" />
      {[6, 15, 24].map((wx) => <rect key={wx} x={wx} y="-20" width="6" height="4.6" fill="#27456f" />)}
      <rect x="35" y="-21" width="6.4" height="11" fill="#c9d2de" />
      <rect x="9" y="-27" width="11" height="3.2" rx="0.8" fill="#9eacc0" />
      <text x="26" y="-12.4" textAnchor="middle" fontSize="4.2" fontWeight="800" letterSpacing="0.8" fill="#1a3f7a" fontFamily={FONT}>SEROS</text>
      <line x1="41" y1="-24" x2="41" y2="-34" stroke="#cfd8e6" strokeWidth="0.9" />
      <circle className="fz-blink" cx="41" cy="-34.6" r="1.1" fill="#ff4a3d" />
      <Wheels xs={[9, 36, 41]} />
    </g>
  )
}

function Wireline({ x }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <rect x="0" y="-6" width="36" height="2.8" fill="#20262f" />
      <rect x="0.5" y="-17" width="10" height="11" rx="1.4" fill="#f2f5fa" />
      <rect x="2" y="-15" width="6.2" height="4.2" fill="#27456f" />
      <rect x="11.5" y="-18" width="24.5" height="12" fill="#1a3f7a" />
      <rect x="11.5" y="-10.4" width="24.5" height="1.3" fill="#2bb5a0" />
      <g transform="translate(24 -13)">
        <circle r="5.6" fill="#2b3340" /><circle r="5.6" fill="none" stroke="#9eacc0" strokeWidth="0.8" />
        <g className="fz-reel"><line x1="-4.4" y1="0" x2="4.4" y2="0" stroke="#d9a21b" strokeWidth="1.2" /><line x1="0" y1="-4.4" x2="0" y2="4.4" stroke="#d9a21b" strokeWidth="1.2" /></g>
        <circle r="1.2" fill="#9eacc0" />
      </g>
      <Wheels xs={[6, 28, 33]} r={2.9} />
    </g>
  )
}

// The frac tree on the wellhead: gate valves with handwheels, the treating iron coming in on the left, and the wireline lubricator on top.
function Tree() {
  return (
    <g transform={`translate(${WH} ${G})`}>
      <rect x="-9" y="-3" width="18" height="3" fill="#59627a" />
      <rect x="-3.4" y="-24" width="6.8" height="21" fill="#d9a21b" />
      <rect x="-5" y="-12" width="10" height="2.6" fill="#b8860f" /><rect x="-5" y="-20" width="10" height="2.6" fill="#b8860f" />
      <rect x="-13" y="-16.4" width="10" height="5.6" fill="#d9a21b" /><rect x="3" y="-16.4" width="7" height="5.6" fill="#d9a21b" /><rect x="9" y="-17.4" width="1.8" height="7.6" fill="#59627a" />
      <circle cx="-8" cy="-19.6" r="2.4" fill="none" stroke="#a33b32" strokeWidth="1.1" /><circle cx="6.4" cy="-27" r="0" />
      <rect x="-2" y="-46" width="4" height="22" fill="#7a8697" /><rect x="-3" y="-47.4" width="6" height="2" fill="#59627a" />
      <circle cx="0" cy="-49" r="2.2" fill="#59627a" />
    </g>
  )
}

// The Axom Rhino, a 3000 HP derrick rig, drilling the next well on the pad. Drawn small and a touch hazy, behind the fleet.
function Rhino() {
  const leg = (s, y) => s * (18 - (13 * (y + 22)) / -116) // half-width of the mast at height y (y from -22 to -138)
  const rungs = Array.from({ length: 7 }, (_, i) => -22 - 14 - i * 16)
  return (
    <g transform={`translate(${DX} ${G})`} opacity="0.95">
      {/* the pits, pumps and the generator house either side of the sub */}
      <rect x="-86" y="-10" width="44" height="10" rx="1" fill="#233d6b" /><rect x="-82" y="-15" width="14" height="5" fill="#2d4a78" />
      {[-82, -72, -62, -52].map((x) => <rect key={x} x={x} y="-8" width="5" height="5.6" fill="#ffd77a" fillOpacity="0.55" />)}
      <rect x="42" y="-12" width="40" height="12" rx="1" fill="#233d6b" /><rect x="48" y="-17" width="12" height="5" fill="#2d4a78" />
      {[48, 58, 68].map((x) => <rect key={x} x={x} y="-9" width="6" height="5.4" fill="#ffd77a" fillOpacity="0.55" />)}
      <path d="M34,-4 L60,0 L34,0 Z" fill="#2a4575" />
      {/* the substructure, with the rig's name */}
      <rect x="-34" y="-22" width="68" height="22" fill="#1d3562" />
      <path d="M-34,-22 L34,-22 M-34,-11 L34,-11 M-34,-22 L-17,-11 M-17,-22 L0,-11 M0,-22 L17,-11 M17,-22 L34,-11" stroke="#3d5f99" strokeWidth="0.8" fill="none" />
      <rect x="-26" y="-20" width="52" height="16" rx="1.4" fill="#142a52" />
      <text x="0" y="-12.8" textAnchor="middle" fontSize="7" fontWeight="800" letterSpacing="0.9" fill="#ffffff" fontFamily={FONT}>AXOM RHINO</text>
      <text x="0" y="-6.2" textAnchor="middle" fontSize="4.6" fontWeight="700" letterSpacing="1.2" fill="#8fe6da" fontFamily={FONT}>3000 HP</text>
      {/* the mast: two leaning legs, rungs and bracing, the racking board and the crown */}
      <g stroke="#8aa6cf" strokeLinecap="round" fill="none">
        <line x1="-18" y1="-22" x2="-5" y2="-138" strokeWidth="1.5" /><line x1="18" y1="-22" x2="5" y2="-138" strokeWidth="1.5" />
        {rungs.map((y) => (
          <g key={y} strokeWidth="0.75">
            <line x1={-leg(1, y)} y1={y} x2={leg(1, y)} y2={y} />
            <line x1={-leg(1, y)} y1={y} x2={leg(1, y - 16)} y2={y - 16} /><line x1={leg(1, y)} y1={y} x2={-leg(1, y - 16)} y2={y - 16} />
          </g>
        ))}
      </g>
      <rect x="-9" y="-100" width="18" height="2.6" fill="#8aa6cf" />
      <rect x="-8" y="-144" width="16" height="6" rx="1" fill="#2d4a78" stroke="#8aa6cf" strokeWidth="0.8" />
      <circle className="fz-blink" cx="0" cy="-147" r="1.5" fill="#ff4a3d" />
      {/* the drill line and the travelling block going up and down as it drills */}
      <line x1="0" y1="-138" x2="0" y2="-26" stroke="#d9e1ec" strokeWidth="0.7" strokeOpacity="0.7" />
      <g className="fz-block"><rect x="-4.4" y="-92" width="8.8" height="9" rx="1" fill="#e8a43a" /><rect x="-1.6" y="-83" width="3.2" height="9" fill="#c4862a" /></g>
      <rect x="-3" y="-22" width="6" height="4" fill="#59627a" />
      {/* work lights */}
      {[-60, -78, -110].map((y) => <circle key={y} cx={y === -60 ? -13 : 13} cy={y} r="1.5" fill="#ffd77a" fillOpacity="0.9" />)}
      <ellipse cx="0" cy="-60" rx="46" ry="62" fill="url(#fz-glow)" />
    </g>
  )
}

// The cross-section below the pad: soil, the target formation, the well down and out along the lateral, and each stage's plug,
// perforation flash and spreading fractures. The wireline and its gun run in the lateral.
function Underground() {
  return (
    <g>
      <rect x="0" y={G} width="1200" height={360 - G} fill="url(#fz-soil)" />
      <rect x="0" y={LAT - 12} width="1200" height="26" fill="#8a6a46" fillOpacity="0.32" />
      <g stroke="#2d2a26" strokeOpacity="0.5" strokeWidth="0.8" fill="none"><path d={`M0,${G + 14} Q300,${G + 10} 600,${G + 15} T1200,${G + 13}`} /><path d={`M0,${LAT - 14} Q300,${LAT - 17} 600,${LAT - 13} T1200,${LAT - 15}`} /><path d={`M0,${LAT + 15} Q400,${LAT + 12} 800,${LAT + 16} T1200,${LAT + 14}`} /></g>
      <path d={WELL} fill="none" stroke="#10151c" strokeWidth="5" strokeLinejoin="round" />
      <path d={WELL} fill="none" stroke="#7f8a9b" strokeWidth="1.9" strokeLinejoin="round" />
      {STAGES.map((sx, k) => (
        <g key={sx} transform={`translate(${sx} ${LAT})`}>
          <g className="fz-frac" style={{ '--s': `${PUMP[k][0] + 1}s` }} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {FRACS[k].map((f, i) => <path key={i} className="fz-crack fz-crack-glow" d={f.d} pathLength="1" strokeWidth={f.w * 2.6} style={{ '--d': `${f.delay}s` }} />)}
            {FRACS[k].map((f, i) => <path key={i} className="fz-crack" d={f.d} pathLength="1" strokeWidth={f.w} style={{ '--d': `${f.delay}s` }} />)}
          </g>
          <circle className={`fz-flash fz-flash-${k}`} r="5" fill="#ffd77a" />
          <rect className={`fz-plug fz-plug-${k}`} x="-1.6" y="-3.2" width="3.2" height="6.4" rx="0.8" fill="#e8a43a" stroke="#10151c" strokeWidth="0.6" />
        </g>
      ))}
      {BUBBLES.map((bs, k) => (
        <g key={k} style={{ '--s': `${PUMP[k][0] + 1.6}s` }}>
          {bs.map((b, i) => (
            <circle key={i} className="fz-bubble" cx={b.x} cy={b.y} r={b.r} fill="#d9f4ef" fillOpacity="0.35" stroke="#eafffb" strokeWidth="0.7"
              style={{ '--rise': `${-b.rise}px`, '--sway': `${b.sway}px`, '--dur': `${b.dur}s`, '--d': `${b.delay}s` }} />
          ))}
        </g>
      ))}
      {SLURRY.map((d, k) => <path key={k} className={`fz-slurry fz-slurry-${k}`} d={d} pathLength="1" fill="none" stroke="#f3d98f" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />)}
      {/* the wireline and the perforating gun, going in and out along the lateral */}
      <g transform={`translate(${HEEL} ${LAT})`}>
        <line className="fz-wire" x1="0" y1="0" x2="210" y2="0" stroke="#e8edf5" strokeWidth="0.9" />
        <g className="fz-gun"><rect x="-12" y="-2.2" width="13" height="4.4" rx="1.6" fill="#9aa4b4" /><g stroke="#e8a43a" strokeWidth="1"><line x1="-9" y1="-2.2" x2="-9" y2="-3.6" /><line x1="-5" y1="-2.2" x2="-5" y2="-3.6" /><line x1="-1" y1="-2.2" x2="-1" y2="-3.6" /></g></g>
      </g>
    </g>
  )
}

export default function FracJobScene() {
  const stars = [[60, 40, 1.2], [190, 22, 1], [330, 58, 1.1], [520, 30, 1], [640, 14, 1.3], [760, 50, 1], [900, 26, 1.2], [1040, 62, 1], [1120, 18, 1.1], [1170, 70, 1]]
  const pumpers = [624, 666, 708]
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="fz-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5c5242" /><stop offset="40%" stopColor="#4a4034" /><stop offset="100%" stopColor="#2f2a26" /></linearGradient>
        <radialGradient id="fz-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#ffd77a" stopOpacity="0.16" /><stop offset="100%" stopColor="#ffd77a" stopOpacity="0" /></radialGradient>
      </defs>
      <g className="fz-scene">
        {stars.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="#fff" fillOpacity="0.5" />)}
        <Rhino />
        {/* the pad: a strip of gravel where the fleet stands */}
        <rect x="0" y={G - 1.5} width="1200" height="3" fill="#6f6552" />
        <Underground />
        <g className="fz-site">
          {/* the suction hose from the tanks to the blender, and the sand belt from the silo into its hopper */}
          <path d={`M508,${G - 3} Q530,${G + 1} 586,${G - 3}`} fill="none" stroke="#161a21" strokeWidth="1.6" />
          <path d={`M577,${G - 30} L${594},${G - 25}`} stroke="#59627a" strokeWidth="2" />
          <Tank x={466} />
          <Tank x={512} />
          <Silo x={559} />
          <Blender x={582} />
          {pumpers.map((x, i) => <Pumper key={x} x={x} i={i} />)}
          <Manifold x={752} />
          <Tree />
          <Wireline x={868} />
          <DataVan x={911} />
          {/* the treating iron: from each pump's discharge up to a header, across to the manifold, and from the manifold into the frac tree */}
          <g className="fz-iron" fill="none" stroke="#b9c3d3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {pumpers.map((x) => <path key={x} d={`M${x + 38},${G - 13.5} L${x + 41},${G - 13.5} L${x + 41},${G - 30}`} />)}
            <path d={`M${pumpers[0] + 41},${G - 30} L${771},${G - 30} L771,${G - 21}`} />
            <path d={`M${788},${G - 14} L${WH - 3},${G - 14}`} />
          </g>
          {/* the wireline up to the lubricator, and the flowback line and its flare */}
          <path d={`M${868 + 24},${G - 18} L${WH},${G - 49}`} stroke="#e8edf5" strokeWidth="0.7" fill="none" strokeOpacity="0.8" />
          <g transform={`translate(1002 ${G})`}>
            <rect x="-1.4" y="-34" width="2.8" height="34" fill="#9eacc0" /><rect x="-4" y="-2.4" width="8" height="2.4" fill="#59627a" />
            <g className="fz-flame"><path d="M0,-34 C-5,-41 -3,-45 0,-52 C3,-46 5,-41 0,-34 Z" fill="#ff8a1f" /><path d="M0,-34 C-2.4,-38 -1.4,-41 0,-45 C1.4,-41 2.4,-38 0,-34 Z" fill="#ffd77a" /></g>
          </g>
        </g>
        {/* the data van's screen: pressure (amber) and rate (blue) drawn as the job goes on */}
        <g transform="translate(905 236)">
          <rect x="-4" y="-9" width="84" height="43" rx="3" fill="#0c1a33" fillOpacity="0.85" stroke="#2bb5a0" strokeOpacity="0.6" strokeWidth="0.8" />
          <text x="0" y="-1.5" fontSize="4.6" fontWeight="800" letterSpacing="1" fill="#8fe6da" fontFamily={FONT}>PRESSURE · RATE</text>
          <g stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.5"><line x1="0" y1="8" x2="76" y2="8" /><line x1="0" y1="18" x2="76" y2="18" /><line x1="0" y1="30" x2="76" y2="30" /></g>
          <path className="fz-trace" d={trace(0.72, 0.16)} pathLength="1" fill="none" stroke="#f5b942" strokeWidth="1.3" strokeLinejoin="round" />
          <path className="fz-trace fz-trace-b" d={trace(0.42, 0.04)} pathLength="1" fill="none" stroke="#5db7f0" strokeWidth="1.1" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  )
}
