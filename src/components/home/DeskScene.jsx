// A signature, not part of the product: the room of the IT intern who built this app, seen from a low corner viewpoint at night (an
// isometric cut-away, the camera about window height). The desk fills the left corner with three screens facing us: a terminal typing a
// `git blame` that points at S.M., the self-test result and a commit (left), an editor (middle) and the app's own home page (right), a
// silhouette at them with headphones on. A cut view of the bed runs off the bottom-left, with the rebuild drawn on a whiteboard above it, and a Yorkshire terrier standing on the rug. The whole right wall is a big window onto
// Manhattan at night across the river, in a vivid purple sky with a full moon: One World Trade, the Chrysler Building's crown, a
// green-spired tower, the Empire State Building, rooftop water tanks, a lit skyline reflected in colourful streaks on the water, a
// ferry and a sailing boat, and a plane. Lights twinkle, steam rises. 16 seconds; the timings live in index.css
// (`.hero-desk`), so change them together. Decoration only.

// The room's geometry: B is the far corner of the floor on screen; u runs down-right along the right wall, v down-left along the left
// wall, z is up. A point (u, v, z) lands at (BX + u - v, BY + CY (u + v) - z). CY is small because the camera is low.
const BX = 600
const BY = 250
const H = 330 // tall enough that the walls' top edges are above the banner
const U = 900 // and long enough that their ends are off the banner too
const V = 900
const VL = 560 // the left wall's pictures count their x from here: x = VL - v
const CY = 0.28
const P = (u, v, z = 0) => [BX + u - v, BY + CY * (u + v) - z]
const r1 = (n) => Math.round(n * 10) / 10
const pts = (a) => a.map(([u, v, z]) => P(u, v, z).map(r1).join(',')).join(' ')
// Pictures on a wall are drawn flat, in the wall's own units, and skewed onto it: x runs along the wall, y down from `zTop`.
const planeR = (v0, zTop) => `matrix(1 ${CY} 0 1 ${BX - v0} ${BY + CY * v0 - zTop})` // the right wall (v = v0): x = u
const planeL = (u0, zTop) => `matrix(1 ${-CY} 0 1 ${BX + u0 - VL} ${BY + CY * (u0 + VL) - zTop})` // the left wall (u = u0): x = VL - v

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ---- Manhattan, in the window's own units (480 wide, 110 tall; the rooftops end at y = 78, the river and streets lie below) ----
const WW = 440 // the window's width, and its height: the city is drawn 110 tall and set 30 down, with more sky above
const WH = 140
const WC = 110
const BASE = 72
const CITY = (() => {
  const r = rng(77)
  const layers = [
    { colour: '#1d154a', min: 8, max: 34, gap: 0, lit: 0.2 },
    { colour: '#150f3c', min: 12, max: 44, gap: 1, lit: 0.32 },
    { colour: '#0d0a2c', min: 10, max: 36, gap: 0.6, lit: 0.42 },
  ]
  const towers = []
  const tanks = []
  const lights = { warm: ['', '', ''], cool: ['', '', ''] }
  layers.forEach((L, li) => {
    let x = -2 + li * 2.2
    while (x < WW + 2) {
      const w = 5 + r() * 9
      const h = L.min + r() * (L.max - L.min)
      towers.push({ x, w, y: BASE - h, h, colour: L.colour, setback: r() < 0.4, glass: li > 0 && r() < 0.2 })
      if (li === 2 && r() < 0.16) tanks.push({ x: x + w * 0.3, y: BASE - h })
      for (let wy = BASE - h + 2; wy < BASE - 1; wy += 2.8) {
        for (let wx = x + 1; wx < x + w - 1.2; wx += 2.6) {
          if (r() < L.lit) lights[r() < 0.78 ? 'warm' : 'cool'][Math.floor(r() * 3)] += `M${r1(wx)},${r1(wy)}h1.2 `
        }
      }
      x += w + L.gap
    }
  })
  const stars = Array.from({ length: 30 }, () => ({ x: r() * WW, y: r() * 30, r: 0.25 + r() * 0.5, o: 0.4 + r() * 0.5 }))
  // the colourful reflections of the lights in the river, and the lights along the far shore
  const palette = ['#ff9a3a', '#ff4a8a', '#4aa0ff', '#ffd24a', '#ff3a3a', '#3ad0ff', '#c46aff']
  const streaks = Array.from({ length: 110 }, () => ({ x: r() * WW, y: BASE + 2 + r() * 6, h: 6 + r() * 26, w: 1 + r() * 3.2, c: palette[Math.floor(r() * palette.length)], o: 0.22 + r() * 0.4, cls: ['dv-tw-a', 'dv-tw-b', 'dv-tw-c'][Math.floor(r() * 3)] }))
  const shore = Array.from({ length: 150 }, () => ({ x: r() * WW, y: BASE - 1 + r() * 3, r: 0.4 + r() * 0.5, c: ['#ffd9a0', '#ff9a52', '#ffffff', '#8fd0ff'][Math.floor(r() * 4)] }))
  return { towers, tanks, lights, stars, streaks, shore }
})()

// ---- the terminal ----
const CHAR = 3 // one character of the 5px monospace font
const G = '#5ee0a0'
const AMB = '#e0a53a'
const TEAL = '#8fe6da'
const DIM = '#8c97aa'
const WHITE = '#e8edf5'
const blame = (hash, tag) => [[hash, AMB], [' (S.M.) ', TEAL], [tag, DIM]]
const LINES = [
  { row: 0, at: 0.9, dur: 1.5, parts: [['$ ', G], ['git blame Home.jsx', WHITE]] },
  { row: 1, at: 2.6, dur: 0.5, parts: blame('7c1e4a9', 'RigMoveScene') },
  { row: 2, at: 3.1, dur: 0.5, parts: blame('a02b9d3', 'FracJobScene') },
  { row: 3, at: 3.6, dur: 0.5, parts: blame('e5d83f0', 'ConvoyScene') },
  { row: 4, at: 4.6, dur: 1.0, parts: [['$ ', G], ['selftest --fast', WHITE]] },
  { row: 5, at: 6.0, dur: 0.9, parts: [['1248 checks, ', DIM], ['0 failures', G]] },
  { row: 6, at: 7.4, dur: 1.5, parts: [['$ ', G], ['git commit -m "one more"', WHITE]] },
  { row: 7, at: 9.2, dur: 0.6, parts: [['[main 9f3b2a1] one more', DIM]] },
]
const len = (parts) => parts.reduce((n, [t]) => n + t.length, 0)
const TX = 3.5
const TY = 14.4
const TSTEP = 5.2

function TerminalLine({ row, at, dur, parts }) {
  const n = len(parts)
  const y = TY + row * TSTEP
  const starts = parts.map((_, i) => TX + len(parts.slice(0, i)) * CHAR)
  return (
    <g>
      {parts.map(([text, fill], i) => (
        <text key={i} x={starts[i]} y={y} fontSize="5" fontFamily={MONO} fill={fill} xmlSpace="preserve" textLength={text.length * CHAR} lengthAdjust="spacing">{text}</text>
      ))}
      <rect className="dv-cover" x={TX - 0.6} y={y - 4.6} width={n * CHAR + 1.4} height="6.2" fill="#0a111f" style={{ '--n': n, '--t': `${at}s`, '--d': `${dur}s` }} />
    </g>
  )
}

// ---- furniture ----
function Box({ u0, v0, u1, v1, z0 = 0, z1, top, left, right }) {
  return (
    <g>
      <polygon points={pts([[u1, v0, z0], [u1, v1, z0], [u1, v1, z1], [u1, v0, z1]])} fill={right} />
      <polygon points={pts([[u0, v1, z0], [u1, v1, z0], [u1, v1, z1], [u0, v1, z1]])} fill={left} />
      <polygon points={pts([[u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1]])} fill={top} />
    </g>
  )
}

const MW = 96 // the side screens
const MH = 60

// A monitor standing on the desk, in its wall's units: bezel, screen contents `children`, and its stand.
function Monitor({ plane, x, children, decor }) {
  return (
    <g transform={plane}>
      <rect x={x + MW / 2 - 16} y={MH + 1} width="32" height="3.4" rx="1" fill="#10152a" />
      <rect x={x + MW / 2 - 3} y={MH - 1} width="6" height="7" fill="#171d36" />
      <rect x={x - 2.4} y="-2.4" width={MW + 4.8} height={MH + 4.8} rx="3" fill="#0c1124" stroke="#2a3358" strokeWidth="0.6" />
      <g transform={`translate(${x} 0)`} clipPath="url(#dr-screen)">{children}</g>
      {decor}
    </g>
  )
}

function Terminal() {
  return (
    <g>
      <rect width={MW} height={MH} fill="#0a111f" />
      <rect width={MW} height="6.6" fill="#18213a" />
      {[3.6, 8, 12.4].map((x, i) => <circle key={x} cx={x} cy="3.3" r="1.2" fill={['#e06a5a', '#e0b24a', '#5ec07a'][i]} />)}
      {LINES.map((l) => <TerminalLine key={l.row} {...l} />)}
      <rect className="dv-cursor" x={TX} y={TY + 8 * TSTEP - 4.2} width="2.6" height="5" fill={WHITE} />
    </g>
  )
}

function Editor() {
  const r = rng(5)
  const lines = Array.from({ length: 36 }, () => ({ indent: Math.floor(r() * 4) * 3.4, w: 8 + r() * 30, c: ['#7fb0ff', '#e0a53a', '#8fe6da', '#c6a0f0', '#e8edf5', '#6ee0a0'][Math.floor(r() * 6)], c2: ['#8c97aa', '#e8edf5'][Math.floor(r() * 2)] }))
  return (
    <g>
      <rect width="100" height="58" fill="#10162b" />
      <rect width="11" height="58" fill="#0a0f20" />
      <g className="dv-scroll">
        {lines.map((l, i) => (
          <g key={i}>
            <rect x="3.6" y={5 + i * 5.2} width="3.6" height="1.7" fill="#3a4466" />
            <rect x={14 + l.indent} y={5 + i * 5.2} width={l.w} height="1.9" rx="0.7" fill={l.c} />
            <rect x={16 + l.indent + l.w} y={5 + i * 5.2} width={l.w * 0.5} height="1.9" rx="0.7" fill={l.c2} fillOpacity="0.6" />
          </g>
        ))}
      </g>
      <rect width="100" height="6" fill="#0a0f20" /><rect x="12" width="26" height="6" fill="#10162b" />
      <rect x="15.6" y="2.2" width="15" height="1.7" rx="0.7" fill="#8c97aa" />
    </g>
  )
}

// The app's own home page, drawn small (76 x 46 units, scaled onto the screen): the navy sidebar, the greeting banner with its search, a
// notice, and the shelf of tiles.
function Homepage() {
  return (
    <g transform="scale(1.263 1.304)">
      <rect width="76" height="46" fill="#eef2f8" />
      <rect width="9" height="46" fill="#17356f" />
      <rect x="2" y="3" width="5" height="5" rx="1" fill="#2bb5a0" />
      {[13, 18, 23, 28, 33].map((y) => <rect key={y} x="2.4" y={y} width="4.2" height="2.4" rx="0.8" fill="#ffffff" fillOpacity="0.55" />)}
      <rect x="9" width="67" height="5" fill="#ffffff" /><rect x="52" y="1.4" width="12" height="2.2" rx="1.1" fill="#dfe5ef" /><circle cx="70" cy="2.5" r="1.6" fill="#2563eb" />
      <rect x="12" y="7.5" width="61" height="19" rx="2.4" fill="url(#dr-hero)" />
      <g clipPath="url(#dr-hero-clip)"><g transform="skewX(-18)"><rect className="dv-sweep" x="4" y="7.5" width="12" height="19" fill="#ffffff" fillOpacity="0.1" /></g></g>
      <text x="15" y="14.2" fontSize="4" fontWeight="800" fill="#ffffff" fontFamily={FONT}>Good evening</text>
      <rect x="15" y="16.4" width="22" height="1.2" rx="0.6" fill="#ffffff" fillOpacity="0.55" />
      <rect x="15" y="20" width="30" height="3.6" rx="1.8" fill="#ffffff" /><circle cx="17.4" cy="21.8" r="0.9" fill="#a3aec2" /><rect className="dv-caret" x="20" y="20.7" width="0.5" height="2.2" fill="#17356f" />
      <rect x="52" y="10" width="18" height="12" rx="1.6" fill="#ffffff" fillOpacity="0.14" /><rect x="54" y="12" width="9" height="1.2" rx="0.6" fill="#ffffff" fillOpacity="0.8" /><rect x="54" y="15" width="13" height="0.9" fill="#ffffff" fillOpacity="0.45" /><rect x="54" y="17.4" width="10" height="0.9" fill="#ffffff" fillOpacity="0.45" />
      <rect x="12" y="29.4" width="14" height="1.6" rx="0.6" fill="#17356f" />
      {[12, 26.4, 40.8, 55.2].map((x, i) => (
        <g key={x}><rect x={x} y="32.6" width="13.4" height="11" rx="1.4" fill="#ffffff" stroke="#dbe2ee" strokeWidth="0.3" /><rect x={x + 1.6} y="34.2" width="3.4" height="3.4" rx="0.8" fill={['#2563eb', '#2bb5a0', '#e8a43a', '#17356f'][i]} /><rect x={x + 1.6} y="39" width="8.4" height="1" fill="#c6cfdd" /><rect x={x + 1.6} y="41" width="5.6" height="1" fill="#dbe2ee" /></g>
      ))}
    </g>
  )
}

// The Chrysler Building's crown: nested stainless arches with lit triangular windows, and the needle.
function Chrysler({ cx }) {
  const rings = [[10, 36], [8.4, 30], [6.8, 24.6], [5.2, 19.6], [3.6, 15.4]]
  return (
    <g>
      <rect x={cx - 11} y="42" width="22" height={BASE - 42} fill="#0a0a2a" /><rect x={cx - 8} y="34" width="16" height="9" fill="#0a0a2a" />
      {rings.map(([w, y], i) => (
        <g key={i}>
          <path d={`M${cx - w},${y + 6} L${cx - w},${y} A${w},${w * 0.95} 0 0 1 ${cx + w},${y} L${cx + w},${y + 6} Z`} fill="#120e38" stroke="#e6edf8" strokeWidth="0.9" />
          {[-0.55, 0, 0.55].map((f) => <path key={f} d={`M${cx + f * w - 0.9},${y - 0.5} L${cx + f * w + 0.9},${y - 0.5} L${cx + f * w},${y - 3.2} Z`} fill="#fff4d0" />)}
        </g>
      ))}
      <line x1={cx} y1="15" x2={cx} y2="1" stroke="#e6edf8" strokeWidth="1" />
      <circle cx={cx} cy="0.8" r="0.8" fill="#fff" />
      {[46, 52, 58, 64, 70].map((y) => <path key={y} className="dv-tw-b" d={`M${cx - 8},${y} h1.2 M${cx - 4},${y} h1.2 M${cx},${y} h1.2 M${cx + 4},${y} h1.2 M${cx + 7},${y} h1.2`} stroke="#ffd9a0" strokeWidth="1.2" />)}
    </g>
  )
}

// The Empire State Building: the stepped tiers, lit at the top, with its mast and beacon.
function EmpireState({ cx }) {
  const tiers = [[17, 34, BASE], [12, 24, 34], [8, 16, 24], [5, 10, 16], [2.6, 6, 10]]
  return (
    <g>
      <ellipse cx={cx} cy="22" rx="28" ry="28" fill="#fff1b8" fillOpacity="0.14" />
      {tiers.map(([w, top, bottom], i) => <rect key={i} className={i > 0 ? 'dv-esb' : undefined} x={cx - w} y={top} width={w * 2} height={bottom - top} fill={i > 0 ? '#f4ecd0' : '#0b0a2c'} />)}
      <g stroke="#0b0a2c" strokeWidth="0.5" strokeOpacity="0.7">{[29, 20, 13].map((y) => <line key={y} x1={cx - 9} y1={y} x2={cx + 9} y2={y} />)}</g>
      <line x1={cx} y1="6" x2={cx} y2="0" stroke="#e8edf5" strokeWidth="0.9" />
      <circle className="dv-beacon" cx={cx} cy="0.8" r="0.9" fill="#ff4a3d" />
      {[40, 46, 52, 58, 64].map((y) => <path key={y} className="dv-tw-a" d={`M${cx - 14},${y} h1.2 M${cx - 9},${y} h1.2 M${cx - 4},${y} h1.2 M${cx + 1},${y} h1.2 M${cx + 6},${y} h1.2 M${cx + 11},${y} h1.2`} stroke="#ffd9a0" strokeWidth="1.2" />)}
    </g>
  )
}

// One World Trade Center: tall and slender, a square base tapering to a faceted top and its spire, lit along the edges.
function OneWTC({ cx }) {
  return (
    <g>
      <polygon points={`${cx - 8},${BASE} ${cx + 8},${BASE} ${cx + 8},34 ${cx},10 ${cx - 8},34`} fill="#0e0d36" />
      <polygon points={`${cx - 8},34 ${cx},10 ${cx},${BASE} ${cx - 8},${BASE}`} fill="#1c2a62" />
      <path d={`M${cx - 8},34 L${cx},10 L${cx + 8},34 M${cx},10 L${cx},${BASE}`} stroke="#bcd8ff" strokeWidth="0.6" strokeOpacity="0.75" fill="none" />
      <line x1={cx} y1="10" x2={cx} y2="0" stroke="#e8edf5" strokeWidth="1" />
      <circle className="dv-beacon" cx={cx} cy="0.8" r="1.1" fill="#ffffff" />
      <path d={`M${cx - 8},46 L${cx + 8},46 M${cx - 8},58 L${cx + 8},58`} stroke="#9fc4ff" strokeWidth="0.4" strokeOpacity="0.5" />
      {[40, 48, 56, 64].map((y) => <path key={y} className="dv-tw-c" d={`M${cx - 5.4},${y} h1.2 M${cx - 1.6},${y} h1.2 M${cx + 2},${y} h1.2 M${cx + 5},${y} h1.2`} stroke="#bcd8ff" strokeWidth="1.2" />)}
    </g>
  )
}

// A wooden rooftop water tank on legs: the shape of New York's roofs.
function WaterTank({ x, y }) {
  return (
    <g fill="#07061e">
      <rect x={x} y={y - 6} width="5" height="6" /><path d={`M${x - 0.6},${y - 6} L${x + 2.5},${y - 8.6} L${x + 5.6},${y - 6} Z`} />
      <rect x={x + 0.6} y={y - 0.2} width="0.5" height="2.4" /><rect x={x + 3.9} y={y - 0.2} width="0.5" height="2.4" />
    </g>
  )
}

// A passenger ferry, lit along its decks, and a sailing boat.
function Ferry() {
  return (
    <g>
      <path d="M0,102 L22,102 L20,106 L3,106 Z" fill="#1a1230" />
      <rect x="3" y="98" width="16" height="4" fill="#2a1d48" /><rect x="6" y="95" width="9" height="3.4" fill="#2a1d48" />
      <g fill="#ffcf7a">{[4, 7, 10, 13, 16].map((x) => <rect key={x} x={x} y="99.4" width="1.6" height="1.6" />)}{[7.4, 10.4, 13.4].map((x) => <rect key={x} x={x} y="96" width="1.4" height="1.4" />)}</g>
      <rect x="2" y="106" width="20" height="1.2" fill="#ff9a3a" fillOpacity="0.5" />
    </g>
  )
}


const HAND = "'Segoe Print', 'Bradley Hand', 'Marker Felt', 'Comic Sans MS', cursive"

// The whiteboard over the bed: the rebuild, as drawn in marker. The old ASP.NET app, an arrow, Django and React, and under them the two
// databases (MySQL while developing, SQL Server in production). Drawn a little crooked on purpose.
function Whiteboard() {
  return (
    <g>
      <rect x="6.4" y="12.4" width="135.4" height="91.6" rx="1.6" fill="#f1f4f8" stroke="#8d97aa" strokeWidth="1.2" />
      <rect x="6.4" y="12.4" width="135.4" height="91.6" rx="1.6" fill="#1a2040" fillOpacity="0.2" />
      <path d="M8,100 L60,14 L72,14 L20,100 Z" fill="#ffffff" fillOpacity="0.1" />
      <rect x="8" y="104" width="132" height="3.4" rx="1" fill="#aab4c4" /><rect x="40" y="103" width="6" height="2" fill="#d33" /><rect x="50" y="103" width="6" height="2" fill="#2563eb" />
      <g fontFamily={HAND} fontWeight="700" textAnchor="middle">
        <text x="40" y="27" fontSize="8" fill="#d33" textAnchor="middle">REBUILD</text>
        <text x="34" y="48.6" fontSize="6.6" fill="#222">ASP.NET</text>
        <text x="34" y="55" fontSize="4.2" fill="#777" fontWeight="400">legacy</text>
        <text x="105" y="42.2" fontSize="6.4" fill="#2a9d4a">Django</text>
        <text x="105" y="58.2" fontSize="6.4" fill="#2563eb">React</text>
        <text x="94" y="84.4" fontSize="4.6" fill="#222">MySQL</text>
        <text x="124" y="84.4" fontSize="3.9" fill="#222">SQL Server</text>
        <text x="94" y="97" fontSize="4.2" fill="#777" fontWeight="400">dev</text>
        <text x="124" y="97" fontSize="4.2" fill="#777" fontWeight="400">prod</text>
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17,30 Q40,32.4 63,29.6" stroke="#d33" strokeWidth="1.2" />
        <path d="M16,36 L52,35.2 L52.8,57 L15.6,57.6 Z" stroke="#222" strokeWidth="1.2" />
        <path d="M56,46.6 Q66,44 76,46.4 M72,42 L77.4,46.4 L72.4,50.6" stroke="#d33" strokeWidth="1.5" />
        <path d="M82,34 L128.4,33.4 L128.8,45.4 L81.6,46 Z" stroke="#2a9d4a" strokeWidth="1.2" />
        <path d="M82,50 L128.4,49.4 L128.8,61.4 L81.6,62 Z" stroke="#2563eb" strokeWidth="1.2" />
        <path d="M94,64 L94,72 M91,69.4 L94,72.4 L97,69.4 M124,64 L124,72 M121,69.4 L124,72.4 L127,69.4" stroke="#222" strokeWidth="1" />
        {[94, 124].map((cx) => (
          <g key={cx} stroke="#222" strokeWidth="1.1"><ellipse cx={cx} cy="75.4" rx="12" ry="3.4" /><path d={`M${cx - 12},75.4 L${cx - 12},87.6 Q${cx},92 ${cx + 12},87.6 L${cx + 12},75.4`} /></g>
        ))}
      </g>
    </g>
  )
}

// A music note, drifting up from the headphones.
function Note({ dx, delay, flip = false }) {
  return (
    <g className="dv-note" style={{ '--dx': `${dx}px`, '--d': `${delay}s` }}>
      <g transform={flip ? 'scale(-1 1)' : undefined}>
        <ellipse cx="0" cy="0" rx="1.9" ry="1.4" fill="#8fe6da" transform="rotate(-20)" /><path d="M1.6,-0.4 L1.6,-7 Q4.6,-6 4.2,-3.4" stroke="#8fe6da" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

// The ID lanyard hanging off the top-right corner of the right-hand screen, down its outer edge (not in front of the screen), in the
// screen's own units.
function Lanyard({ x }) {
  const ax = x + MW + 1 // the bezel's right edge
  return (
    <g className="dv-sway">
      <path d={`M${ax + 4},-3.4 L${ax + 9},22 M${ax + 14},-3.4 L${ax + 9},22`} stroke="#17356f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={`M${ax + 4},-3.4 L${ax + 9},22 M${ax + 14},-3.4 L${ax + 9},22`} stroke="#2bb5a0" strokeWidth="0.6" fill="none" />
      <rect x={ax + 7} y="21" width="4" height="3" rx="0.8" fill="#aab4c4" />
      <rect x={ax + 0.6} y="23.6" width="16.8" height="23" rx="1.8" fill="#f4f7fb" stroke="#c6cfdd" strokeWidth="0.5" />
      <rect x={ax + 0.6} y="23.6" width="16.8" height="6.4" rx="1.8" fill="#17356f" />
      <image href="/branding/seros-mark.png" x={ax + 6.4} y="24" width="5" height="8" preserveAspectRatio="xMidYMid meet" />
      <circle cx={ax + 9} cy="35" r="3.4" fill="#cdd6e6" /><path d={`M${ax + 3.6},43 Q${ax + 9},37 ${ax + 14.4},43 Z`} fill="#cdd6e6" />
      <text x={ax + 9} y="45.4" textAnchor="middle" fontSize="2.9" fontWeight="800" letterSpacing="0.4" fill="#17356f" fontFamily={FONT}>IT INTERN</text>
    </g>
  )
}

// The Yorkshire terrier, standing on the rug (the user's own drawing of a Yorkie, with its background removed).
function Dog() {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="17" ry="3.6" fill="#000" fillOpacity="0.4" />
      <g className="dv-breathe"><image href="/branding/yorkie.png" x="-18" y="-39.6" width="36" height="40.4" preserveAspectRatio="xMidYMax meet" /></g>
    </g>
  )
}

// The big window along the right wall: Manhattan at night across the river, in a vivid purple sky with a full moon.
function CityWindow() {
  const { towers, tanks, lights, stars, streaks, shore } = CITY
  return (
    <g>
      <g clipPath="url(#dr-win)"><g transform="translate(0 30)">
        <rect y="-30" width={WW} height={WC + 30} fill="url(#dr-sky)" />
        {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" fillOpacity={s.o} />)}
        <ellipse cx="240" cy={BASE} rx="320" ry="40" fill="#ff5a8a" fillOpacity="0.2" />
        <g>
          <circle cx="292" cy="20" r="22" fill="#ffe9b8" fillOpacity="0.1" /><circle cx="292" cy="20" r="14" fill="#ffe9b8" fillOpacity="0.14" />
          <circle cx="292" cy="20" r="10.5" fill="#fff3d6" />
          <g fill="#d8cdb6" fillOpacity="0.7"><circle cx="289" cy="17" r="2.6" /><circle cx="296" cy="24" r="2" /><circle cx="294" cy="14" r="1.2" /><circle cx="288" cy="24" r="1.4" /></g>
        </g>
        <path d="M236,14 Q264,8 292,12 Q320,8 346,16 M140,6 Q180,2 222,10 M360,28 Q390,22 426,30" stroke="#150f3c" strokeWidth="3.4" strokeOpacity="0.55" fill="none" strokeLinecap="round" />
        {towers.map((t, i) => (
          <g key={i}>
            <rect x={t.x} y={t.y} width={t.w} height={t.h + 3} fill={t.colour} />
            {t.glass && <rect x={t.x + 0.6} y={t.y + 1} width={t.w - 1.2} height={t.h} fill="#3b7be0" fillOpacity="0.3" />}
            {t.setback && <rect x={t.x + t.w * 0.2} y={t.y - 2.4} width={t.w * 0.6} height="2.6" fill={t.colour} />}
          </g>
        ))}
        {tanks.map((t, i) => <WaterTank key={i} x={t.x} y={t.y} />)}
        <OneWTC cx={64} />
        <Chrysler cx={190} />
        <EmpireState cx={384} />
        <rect x="262" y="26" width="9" height={BASE - 26} fill="#0d0a2c" /><path d="M262,26 L266.5,12 L271,26 Z" fill="#0d0a2c" /><path d="M266.5,12 L266.5,3" stroke="#5dffb0" strokeWidth="1" /><path d="M263,26 L266.5,13 L270,26" fill="none" stroke="#5dffb0" strokeWidth="0.6" strokeOpacity="0.8" />
        {['dv-tw-a', 'dv-tw-b', 'dv-tw-c'].map((c, i) => <path key={c} className={c} d={lights.warm[i]} stroke="#ffd9a0" strokeWidth="1.2" fill="none" />)}
        {['dv-tw-b', 'dv-tw-c', 'dv-tw-a'].map((c, i) => <path key={c} className={c} d={lights.cool[i]} stroke="#9fd6ff" strokeWidth="1.2" fill="none" />)}
        {/* the far shore's lights, the river, the reflections of the city in it, ripples and boats */}
        <rect y={BASE} width={WW} height={WC - BASE} fill="url(#dr-river)" />
        <g>{shore.map((d, i) => <circle key={i} className={i % 4 === 0 ? 'dv-tw-a' : undefined} cx={d.x} cy={d.y} r={d.r} fill={d.c} />)}</g>
        <g>{streaks.map((d, i) => <rect key={i} className={d.cls} x={d.x} y={d.y} width={d.w} height={d.h} fill={d.c} fillOpacity={d.o} />)}</g>
        <g stroke="#ffffff" strokeOpacity="0.18" strokeWidth="0.5">{Array.from({ length: 22 }, (_, i) => <line key={i} x1={(i * 71) % 460} y1={BASE + 6 + ((i * 13) % 30)} x2={((i * 71) % 460) + 14 + (i % 4) * 5} y2={BASE + 6 + ((i * 13) % 30)} />)}</g>
        <g className="dv-boat"><Ferry /></g>
        <g transform="translate(120 98)"><path d="M0,6 L14,6 L12,9 L2,9 Z" fill="#1a1230" /><path d="M7,6 L7,-6 L13,5 Z" fill="#f4f6fa" /><path d="M6,5 L6,-3 L1,5 Z" fill="#dfe6f2" /></g>
        <g className="dv-plane"><circle cx="0" cy="18" r="0.8" fill="#ff4a3d" /><circle cx="-3" cy="18" r="0.7" fill="#fff" /></g>
        <polygon points="40,-30 90,-30 50,110 0,110" fill="#ffffff" fillOpacity="0.03" /><polygon points="250,-30 280,-30 240,110 210,110" fill="#ffffff" fillOpacity="0.025" />
      </g></g>
      <rect width={WW} height={WH} fill="none" stroke="#2b3556" strokeWidth="3" />
      <path d={`M${WW / 4},0 L${WW / 4},${WH} M${WW / 2},0 L${WW / 2},${WH} M${(WW * 3) / 4},0 L${(WW * 3) / 4},${WH}`} stroke="#2b3556" strokeWidth="2.4" />
      <rect x="-4" y={WH} width={WW + 8} height="3.6" fill="#3a4672" />
    </g>
  )
}

export default function DeskScene() {
  const planks = Array.from({ length: 23 }, (_, i) => i * 40)
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="dr-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#05061a" /><stop offset="55%" stopColor="#1a1046" /><stop offset="100%" stopColor="#4a1e6a" /></linearGradient>
        <linearGradient id="dr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#090a2e" /><stop offset="38%" stopColor="#261460" /><stop offset="66%" stopColor="#7a2377" /><stop offset="100%" stopColor="#d4506e" /></linearGradient>
        <linearGradient id="dr-river" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a1d62" /><stop offset="45%" stopColor="#1c1046" /><stop offset="100%" stopColor="#0a0824" /></linearGradient>
        <linearGradient id="dr-wallR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#222c52" /><stop offset="100%" stopColor="#141b36" /></linearGradient>
        <linearGradient id="dr-wallL" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1b2346" /><stop offset="100%" stopColor="#0e142b" /></linearGradient>
        <linearGradient id="dr-floor" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#242b46" /><stop offset="100%" stopColor="#141831" /></linearGradient>
        <linearGradient id="dr-hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1c448a" /><stop offset="100%" stopColor="#0f2650" /></linearGradient>
        <radialGradient id="dr-blue" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#5db7f0" stopOpacity="0.3" /><stop offset="100%" stopColor="#5db7f0" stopOpacity="0" /></radialGradient>
        <radialGradient id="dr-warm" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#ffc46b" stopOpacity="0.5" /><stop offset="100%" stopColor="#ffc46b" stopOpacity="0" /></radialGradient>
        <linearGradient id="dr-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e6d09c" /><stop offset="100%" stopColor="#a98d55" /></linearGradient>
        <clipPath id="dr-win"><rect width={WW} height={WH} /></clipPath>
        <clipPath id="dr-screen"><rect width={MW} height={MH} rx="1" /></clipPath>
        <clipPath id="dr-screen-c"><rect width="100" height="58" rx="1" /></clipPath>
        <clipPath id="dr-hero-clip"><rect x="12" y="7.5" width="61" height="19" rx="2.4" /></clipPath>
      </defs>
      <g className="dv-scene">
        {/* the night outside the tower: sky, stars and a far skyline behind the left wall */}
        <rect width="1200" height="360" fill="url(#dr-back)" />
        {[[40, 30], [120, 70], [200, 20], [300, 60], [380, 24], [60, 110], [250, 100], [440, 50]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="0.8" fill="#fff" fillOpacity="0.6" />)}
        <g fill="#0a0f26" fillOpacity="0.85">{[[0, 150, 30, 60], [34, 132, 26, 80], [64, 160, 36, 50], [104, 142, 28, 70], [136, 120, 24, 92], [164, 150, 34, 60], [202, 136, 26, 76], [232, 158, 38, 52], [274, 128, 24, 86], [302, 148, 32, 64], [338, 138, 28, 74], [370, 156, 36, 56], [410, 130, 26, 82], [440, 150, 34, 62]].map(([x, y, w, h]) => <rect key={x} x={x} y={y} width={w} height={h} />)}</g>
        <path className="dv-tw-a" d="M8,166 h2 M40,150 h2 M46,170 h2 M72,176 h2 M110,160 h2 M142,134 h2 M150,160 h2 M170,168 h2 M208,152 h2 M240,172 h2 M280,142 h2 M290,166 h2 M310,160 h2 M344,154 h2 M376,170 h2 M416,146 h2 M448,166 h2" stroke="#ffd9a0" strokeWidth="2" />

        {/* the two walls, with a lighter top edge */}
        <polygon points={pts([[0, 0, 0], [U, 0, 0], [U, 0, H], [0, 0, H]])} fill="url(#dr-wallR)" />
        <polygon points={pts([[0, 0, 0], [0, V, 0], [0, V, H], [0, 0, H]])} fill="url(#dr-wallL)" />
        <polyline points={pts([[0, V, H], [0, 0, H], [U, 0, H]])} fill="none" stroke="#3a4672" strokeWidth="2.4" strokeLinejoin="round" />
        <polyline points={pts([[0, V, 6], [0, 0, 6], [U, 0, 6]])} fill="none" stroke="#0a0f20" strokeWidth="2.4" strokeLinejoin="round" />

        {/* the window runs along the right wall; the plaque above the screens; pictures on the left wall */}
        <g transform={`${planeR(0, 180)} translate(180 0)`}><CityWindow /></g>
        <g transform={planeR(0, 180)} className="dv-plate">
          <rect x="68" y="60" width="112" height="10" rx="1.2" fill="url(#dr-plate)" stroke="#7a6232" strokeWidth="0.4" />
          <text x="124" y="67.4" textAnchor="middle" fontSize="5.2" fontWeight="800" letterSpacing="0.9" fill="#3a2d18" fontFamily={FONT}>S.M.  ·  IT INTERN, SEROS</text>
        </g>
        <g transform={planeL(0, 140)}>
          <g transform="translate(0 0)"><Whiteboard /></g>
          <rect x="150" y="46" width="86" height="48" rx="1.4" fill="#0a0f20" stroke="#3a4672" strokeWidth="1.1" />
          <rect x="153" y="49" width="80" height="42" fill="url(#dr-sky)" />
          <path d="M153,78 L233,78 L233,91 L153,91 Z" fill="#0e2a47" /><path d="M153,78 L233,78" stroke="#6a3a52" strokeWidth="0.7" />
          <g fill="#c8512b"><rect x="186" y="66" width="5" height="12" /><rect x="196" y="66" width="5" height="12" /><rect x="184" y="63" width="19" height="3.6" /></g>
          <path d="M191,63 L193.5,48 L196,63 Z" fill="#8c97aa" /><rect x="192.8" y="46" width="1.4" height="2.4" fill="#ffd77a" />
          <rect x="268" y="40" width="38" height="52" rx="1.2" fill="#17356f" stroke="#3a4672" strokeWidth="1" />
          <image href="/branding/seros-mark.png" x="280" y="46" width="14" height="22" preserveAspectRatio="xMidYMid meet" />
          <text x="287" y="78" textAnchor="middle" fontSize="3.8" fontWeight="800" letterSpacing="0.4" fill="#8fe6da" fontFamily={FONT}>#BeTheUnstoppable</text>
          <g transform="translate(330 44)"><circle r="15" fill="#e8edf5" stroke="#2a3358" strokeWidth="1.6" /><g stroke="#2a3358" strokeWidth="1">{[0, 90, 180, 270].map((a) => <line key={a} x1="0" y1="-12" x2="0" y2="-10" transform={`rotate(${a})`} />)}</g><line x1="0" y1="0" x2="0" y2="-8.6" stroke="#10152a" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-62)" /><line x1="0" y1="0" x2="0" y2="-11.4" stroke="#10152a" strokeWidth="1.1" strokeLinecap="round" transform="rotate(100)" /><line className="dv-second" x1="0" y1="2.4" x2="0" y2="-11.8" stroke="#d33" strokeWidth="0.6" /><circle r="1.2" fill="#10152a" /></g>
        </g>

        {/* the floor: planks, a rug, and the light the screens throw */}
        <polygon points={pts([[0, 0, 0], [U, 0, 0], [U, V, 0], [0, V, 0]])} fill="url(#dr-floor)" />
        <g stroke="#0c1124" strokeOpacity="0.55" strokeWidth="0.8">{planks.map((v) => <polyline key={v} points={pts([[0, v, 0], [U, v, 0]])} fill="none" />)}</g>
        <polygon points={pts([[50, 50, 0], [200, 50, 0], [200, 200, 0], [50, 200, 0]])} fill="#1a3a4a" />
        <polygon points={pts([[58, 58, 0], [192, 58, 0], [192, 192, 0], [58, 192, 0]])} fill="none" stroke="#2bb5a0" strokeOpacity="0.4" strokeWidth="1" />
        <ellipse cx={P(110, 110)[0]} cy={P(110, 110)[1] + 6} rx="120" ry="30" fill="url(#dr-blue)" />
        <ellipse cx={P(260, 0)[0]} cy={P(260, 0)[1] + 50} rx="190" ry="34" fill="#ffd9a0" fillOpacity="0.05" />

        {/* the desk fills the left corner: a long run on each wall, with end panels and a drawer unit */}
        <Box u0={0} v0={0} u1={230} v1={46} z0={32} z1={36} top="#3b4568" left="#262d4a" right="#1a2038" />
        <Box u0={0} v0={46} u1={46} v1={230} z0={32} z1={36} top="#3b4568" left="#262d4a" right="#1a2038" />
        <Box u0={224} v0={2} u1={228} v1={44} z0={0} z1={32} top="#262d4a" left="#1d2340" right="#161b33" />
        <Box u0={2} v0={224} u1={44} v1={228} z0={0} z1={32} top="#262d4a" left="#1d2340" right="#161b33" />
        <Box u0={150} v0={4} u1={222} v1={42} z0={4} z1={31} top="#2a3150" left="#20274a" right="#181e3a" />

        {/* three screens: the terminal on the left wall, the editor in the corner facing us, the home page on the right wall */}
        <Monitor plane={planeL(18, 100)} x={382}><Terminal /></Monitor>
        <g transform={`translate(${BX - 50} ${BY + CY * 2 * 40 - 102})`}>
          <rect x="34" y="59" width="32" height="3.4" rx="1" fill="#10152a" /><rect x="47" y="57" width="6" height="7" fill="#171d36" />
          <rect x="-2.4" y="-2.4" width="104.8" height="62.8" rx="3" fill="#0c1124" stroke="#2a3358" strokeWidth="0.6" />
          <g clipPath="url(#dr-screen-c)"><Editor /></g>
        </g>
        <Monitor plane={planeR(18, 100)} x={84} decor={<Lanyard x={84} />}><Homepage /></Monitor>
        {/* things on the desk: a mug with steam, a stack of books */}
        <g transform={`translate(${P(206, 26, 36)[0]} ${P(206, 26, 36)[1]})`}>
          <rect x="-5.5" y="-10" width="11" height="10" rx="1.8" fill="#e8edf5" /><rect x="-5.5" y="-4.6" width="11" height="1.8" fill="#1a3f7a" /><path d="M5.5,-8 Q10,-7 5.5,-2.4" fill="none" stroke="#e8edf5" strokeWidth="1.3" />
          <g stroke="#cfd8e6" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeOpacity="0.6"><path className="dv-steam" d="M-1.4,-12 Q-3.4,-17 -1.4,-22" /><path className="dv-steam dv-steam-b" d="M2,-12 Q4,-17 2,-22" /></g>
        </g>
        <g transform={`translate(${P(12, 210, 36)[0]} ${P(12, 210, 36)[1]})`}>
          <rect x="-9" y="-4.4" width="18" height="4.4" fill="#a33b32" /><rect x="-8" y="-8.8" width="16" height="4.4" fill="#1a3f7a" /><rect x="-7" y="-12.2" width="14" height="3.4" fill="#2bb5a0" />
        </g>

        {/* the person at the desk, seen from behind with headphones on, and the chair */}
        <g transform={`translate(${P(120, 120)[0]} ${P(120, 120)[1]}) scale(1.3)`}>
          <g className="dv-swivel">
          <ellipse cx="0" cy="-40" rx="30" ry="34" fill="url(#dr-blue)" /><ellipse cx="0" cy="2" rx="28" ry="9" fill="#000" fillOpacity="0.4" />
          <g stroke="#10152a" strokeWidth="2.2" strokeLinecap="round"><line x1="0" y1="-7" x2="-17" y2="1" /><line x1="0" y1="-7" x2="17" y2="1" /><line x1="0" y1="-7" x2="-10" y2="5" /><line x1="0" y1="-7" x2="10" y2="5" /><line x1="0" y1="-7" x2="0" y2="-2" /></g>
          <rect x="-1.8" y="-24" width="3.6" height="18" fill="#171c33" />
          <ellipse cx="0" cy="-25" rx="17" ry="7" fill="#1b2140" /><ellipse cx="0" cy="-26" rx="15" ry="5.6" fill="#262e55" />
          <g className="dv-person">
            <path className="dv-arm" d="M-13,-52 Q-20,-42 -14,-32 L-8,-34 Q-12,-42 -9,-49 Z" fill="#0a0f22" stroke="#5db7f0" strokeWidth="0.7" strokeOpacity="0.6" />
            <path className="dv-arm dv-arm-b" d="M13,-52 Q20,-42 14,-32 L8,-34 Q12,-42 9,-49 Z" fill="#0a0f22" stroke="#5db7f0" strokeWidth="0.7" strokeOpacity="0.6" />
            <path d="M-13,-51 Q-13,-58 -6,-59 L6,-59 Q13,-58 13,-51 L11,-28 L-11,-28 Z" fill="#0a0f22" stroke="#5db7f0" strokeWidth="0.9" strokeOpacity="0.7" strokeLinejoin="round" />
            <g className="dv-head">
              <rect x="-2.6" y="-62" width="5.2" height="5" fill="#070a16" />
              <circle cx="0" cy="-67" r="6.4" fill="#0a0f22" stroke="#5db7f0" strokeWidth="0.9" strokeOpacity="0.75" />
              <path d="M-6.8,-67 Q0,-80 6.8,-67" fill="none" stroke="#242c52" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="-6.8" cy="-66" r="2.6" fill="#1f2650" stroke="#5db7f0" strokeWidth="0.6" strokeOpacity="0.7" /><circle cx="6.8" cy="-66" r="2.6" fill="#1f2650" stroke="#5db7f0" strokeWidth="0.6" strokeOpacity="0.7" />
            </g>
          </g>
          <rect x="-12.5" y="-40" width="25" height="14" rx="5" fill="#2c3668" /><path d="M-10,-39 Q0,-42 10,-39" fill="none" stroke="#4a5896" strokeWidth="1" strokeLinecap="round" />
          <rect x="-17" y="-36" width="4" height="10" rx="1.6" fill="#1a2040" /><rect x="13" y="-36" width="4" height="10" rx="1.6" fill="#1a2040" />
          </g>
          <g transform="translate(0 -76)"><g transform="translate(-9 0)"><Note dx={-8} delay={0} flip /><Note dx={-4} delay={1.7} flip /></g><g transform="translate(9 0)"><Note dx={8} delay={0.9} /><Note dx={4} delay={2.6} /></g></g>
        </g>

        {/* the dog, a Yorkshire terrier, standing on the rug */}
        <g transform={`translate(${P(176, 96)[0]} ${P(176, 96)[1]})`}><Dog /></g>

        {/* a cut view of the bed against the left wall, running off the bottom-left, and a nightstand with a lamp */}
        <Box u0={0} v0={296} u1={6} v1={474} z0={0} z1={40} top="#232942" left="#1a2038" right="#141a2e" />
        <Box u0={6} v0={300} u1={140} v1={470} z0={4} z1={22} top="#2c3558" left="#1d2542" right="#161c34" />
        <Box u0={46} v0={298} u1={141} v1={472} z0={18} z1={28} top="#24437a" left="#18305a" right="#112345" />
        <Box u0={48} v0={300} u1={139} v1={470} z0={27} z1={28.6} top="#2d5190" left="#203d70" right="#18305a" />
        <Box u0={10} v0={308} u1={36} v1={372} z0={22} z1={32} top="#c9d2e6" left="#8f9ab8" right="#6e7a9c" />
        <Box u0={10} v0={384} u1={36} v1={448} z0={22} z1={32} top="#c9d2e6" left="#8f9ab8" right="#6e7a9c" />
        <Box u0={4} v0={258} u1={32} v1={290} z0={0} z1={28} top="#2a3052" left="#1f2542" right="#171c34" />
        <g transform={`translate(${P(18, 274, 28)[0]} ${P(18, 274, 28)[1]})`}>
          <ellipse className="dv-lamp" cx="0" cy="-20" rx="46" ry="38" fill="url(#dr-warm)" />
          <rect x="-1" y="-13" width="2" height="13" fill="#59627a" /><ellipse cx="0" cy="0" rx="6.4" ry="2.4" fill="#2b3140" />
          <path d="M-7.6,-13 L7.6,-13 L4.4,-24 L-4.4,-24 Z" fill="#ffd77a" /><path d="M-4.4,-24 L4.4,-24 L7.6,-13" fill="none" stroke="#fff4c9" strokeWidth="0.6" />
        </g>
      </g>
    </svg>
  )
}
