// The hidden "convoy" scene for the home banner (typed into the home search: "convoy" or "green logistics"). Seros's road fleet drives
// across a dusty highway at sunrise, after the trucks in Seros's own photos:
//   1. An electric truck (bronze cab, no exhaust) with steel coils chained on its flatbed leads.
//   2. An LNG tanker: a white insulated barrel with the big SEROS and LNG marks, hazard diamonds and a vent that breathes a little vapour.
//   3. A road bulk tanker: a silver elliptical tank in compartments, with its manhole and ladder.
//   4. A second electric truck, carrying a bundle of pipes.
// The sun climbs through the haze, and a roadside board reads
// #SerosGreenLogistics. 16 seconds: the convoy takes 15 s to cross and the timings live in index.css (`.hero-convoy`), so change
// them together. Decoration only.

const ROAD = 346 // where the wheels meet the road (the banner is 1200 wide, 360 tall)
const TRUCK_K = 1.2 // how much each truck is scaled up
const PITCH = 214 // from one truck's front to the next truck's front, in the banner's units
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

// Everything for one truck is drawn facing right, with the front bumper at x = 0 and the road at y = 0 (up is negative), then scaled up
// by TRUCK_K. A tractor unit is about 72 long and its trailer about 88.
const WR = 7.2 // wheel radius
function Wheel({ x }) {
  return (
    <g transform={`translate(${x} ${-WR})`}>
      <circle r={WR} fill="#14171d" />
      <circle r={WR * 0.74} fill="#222730" />
      <circle r={WR * 0.52} fill="#bcc6d3" />
      <circle r={WR * 0.52} fill="none" stroke="#7c8696" strokeWidth="0.6" />
      <g className="cv-spin">
        <rect x={WR * 0.64} y="-0.7" width="1.5" height="1.4" fill="#e8edf5" />
        {[0, 60, 120, 180, 240, 300].map((a) => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 2.5} cy={Math.sin((a * Math.PI) / 180) * 2.5} r="0.55" fill="#5d6675" />)}
      </g>
      <circle r="1.4" fill="#3a4250" />
    </g>
  )
}

const LIVERY = {
  ev: { body: 'url(#cv-ev)', trim: '#6a4d2a', text: '#ffffff' },
  lng: { body: 'url(#cv-wht)', trim: '#aab4c4', text: '#1a3f7a' },
  bulk: { body: 'url(#cv-blu)', trim: '#12306a', text: '#ffffff' },
}

// The tractor unit: a flat-fronted forward-control cab (windscreen, door with its glass, handle, step, mirror, sun visor, headlamp,
// bumper, roof marker lights and a driver at the wheel), the chassis behind it, fifth wheel, tyres and mudguards. Electric
// trucks have no exhaust or fuel tank: they carry battery packs along the chassis with an orange high-voltage cable and a green bolt.
function Tractor({ kind }) {
  const L = LIVERY[kind]
  const ev = kind === 'ev'
  return (
    <g>
      {/* chassis rails, the fifth wheel and the air lines to the trailer */}
      <rect x="-74" y="-18" width="64" height="5" fill="#1d2129" />
      <rect x="-68" y="-20.6" width="16" height="2.6" rx="0.8" fill="#2d333d" />
      <path d="M-35,-32 Q-42,-24 -54,-23" stroke="#14171d" strokeWidth="1.3" fill="none" />
      {ev ? (
        <g>
          {[[-47, 12], [-34, 12]].map(([x, w]) => (
            <g key={x}>
              <rect x={x} y="-14" width={w} height="9.6" rx="1.2" fill="#28303c" stroke="#4a5668" strokeWidth="0.6" />
              <rect x={x + 1.4} y="-9.6" width={w - 2.8} height="1.2" fill="#2fd08a" />
              <path d={`M${x + 3},-12.4 l1.8,3 h-3.6 z`} fill="#f08a24" />
            </g>
          ))}
          <path d="M-72,-15.4 L-10,-15.4" stroke="#f08a24" strokeWidth="1.1" />
        </g>
      ) : (
        <g>
          <rect x="-47" y="-14" width="12" height="9.4" rx="3" fill="#b4bdca" stroke="#7c8696" strokeWidth="0.6" />
          <rect x="-33" y="-13.4" width="6" height="7" fill="#262b34" />
          <rect x="-37.4" y="-66" width="2.6" height="49" fill="#3a4250" /><rect x="-38.2" y="-67.4" width="4.2" height="2" rx="0.8" fill="#cfd8e6" />
        </g>
      )}
      {/* the cab */}
      <path d="M-0.5,-13 L-0.5,-48.5 Q-0.5,-52 -4,-52 L-30,-52 Q-34,-52 -34,-48.5 L-34,-13 Z" fill={L.body} stroke={L.trim} strokeWidth="0.6" />
      <rect x="-34" y="-52" width="33.5" height="2.2" rx="1" fill="#ffffff" fillOpacity="0.28" />
      <rect x="-9" y="-53.4" width="9" height="1.8" rx="0.8" fill="#1a1f27" />
      <path d="M-0.8,-49 L-6,-48.4 L-6,-31.6 L-0.8,-32.4 Z" fill="url(#cv-glass)" stroke="#12161d" strokeWidth="0.6" />
      <path d="M-8.2,-47.6 L-26,-47.6 Q-27.4,-47.6 -27.4,-46.2 L-27.4,-33 L-8.2,-33 Z" fill="url(#cv-glass)" stroke="#12161d" strokeWidth="0.6" />
      <circle cx="-12" cy="-41.4" r="2.5" fill="#0e141f" /><path d="M-16.6,-33 Q-16.6,-37.4 -12,-37.4 Q-7.8,-37.4 -7.8,-33 Z" fill="#0e141f" />
      <path d="M-30,-15 L-7.4,-15 L-7.4,-49 L-30,-49 Z" fill="none" stroke={L.trim} strokeWidth="0.55" />
      <rect x="-11.4" y="-30" width="3.4" height="1.2" rx="0.6" fill="#14171d" />
      <rect x="-27" y="-14.8" width="16" height="1.8" fill="#59627a" />
      <text x="-18.6" y="-24.6" textAnchor="middle" fontSize="4.6" fontWeight="800" letterSpacing="0.8" fill={L.text} fontFamily={FONT}>SEROS</text>
      {ev
        ? <g><rect x="-34" y="-20.6" width="33.5" height="2" fill="#6a4d2a" /><rect x="-34" y="-18.4" width="33.5" height="1.2" fill="#f4f8fd" /></g>
        : <g><rect x="-34" y="-20.6" width="33.5" height="2" fill={kind === 'lng' ? '#f08a24' : '#f4f8fd'} /><rect x="-34" y="-18.4" width="33.5" height="1.2" fill={kind === 'lng' ? '#1a3f7a' : '#f08a24'} /></g>}
      {/* the front: headlamp, indicator, bumper and the mirror on its arm */}
      <path d="M-0.4,-27 L-1.6,-27 L-1.6,-20.6 L-0.4,-20.6 Z" fill="#c4ccd8" stroke="#7c8696" strokeWidth="0.3" /><rect x="-1.6" y="-30.4" width="1.2" height="2.2" fill="#f5a623" />
      <rect x="-2.6" y="-14.4" width="3.8" height="7.4" rx="1" fill="#cdd4df" stroke="#7c8696" strokeWidth="0.5" /><rect x="-2.6" y="-9.6" width="3.8" height="2.6" fill="#14171d" />
      <path d="M-6,-44 L2,-47" stroke="#14171d" strokeWidth="0.9" /><rect x="1.4" y="-52" width="3" height="11" rx="1" fill="#14171d" />
      {[-26, -22, -18].map((x) => <circle key={x} cx={x} cy="-54.2" r="0.9" fill="#f5a623" />)}
      {kind === 'lng' && (
        <g>
          <path d="M-26,-52 L-26,-56 M-8,-52 L-8,-56" stroke="#59627a" strokeWidth="0.8" />
          <rect x="-30" y="-65" width="26" height="9.4" rx="1.2" fill="#ffffff" stroke="#1a3f7a" strokeWidth="0.7" />
          <text x="-17" y="-59.2" textAnchor="middle" fontSize="4.2" fontWeight="800" letterSpacing="0.6" fill="#1a3f7a" fontFamily={FONT}>SEROS</text>
          <text x="-17" y="-56.4" textAnchor="middle" fontSize="2.8" fontWeight="800" letterSpacing="1.2" fill="#2bb5a0" fontFamily={FONT}>LNG</text>
        </g>
      )}
      {kind !== 'lng' && <path d="M-34,-52 L-34,-61 Q-30,-63 -24,-59.6 L-14,-53 L-14,-52 Z" fill={L.body} stroke={L.trim} strokeWidth="0.5" />}
      {/* tyres and mudguards */}
      <path d="M-67.6,-7.2 A8.8,8.8 0 0 1 -49.4,-7.2 Z M-76.6,-7.2 A8.8,8.8 0 0 1 -58.4,-7.2 Z" fill="#1d2129" opacity="0.0" />
      <rect x="-74" y="-17" width="26" height="2" rx="1" fill="#2d333d" />
      <Wheel x={-10} /><Wheel x={-58} /><Wheel x={-67} />
    </g>
  )
}

// What every trailer shares: the chassis rails and the reflective tape along them, the landing legs, the tri-axle with its springs,
// the mudflaps, the rear bumper and the tail lights.
function Running() {
  return (
    <g>
      <rect x="-141" y="-20" width="89" height="4.4" fill="#20262f" />
      <g>{Array.from({ length: 14 }, (_, i) => <rect key={i} x={-140 + i * 6.2} y="-17.4" width="3.1" height="1.2" fill={i % 2 ? '#d33' : '#f4f6fa'} />)}</g>
      <rect x="-76" y="-16" width="2" height="8.6" fill="#59627a" /><rect x="-78.4" y="-8" width="6.8" height="1.6" fill="#3a4250" />
      {[-112, -122, -132].map((x) => <path key={x} d={`M${x - 8},-14.4 Q${x},-17.6 ${x + 8},-14.4`} stroke="#14171d" strokeWidth="1.2" fill="none" />)}
      <rect x="-144" y="-14" width="1.6" height="9" fill="#14171d" />
      <rect x="-143" y="-18.6" width="3.6" height="3.4" fill="#2d333d" />
      <rect x="-142.4" y="-23" width="2.2" height="3" fill="#e23b32" />
      {[-60, -80, -100, -120].map((x) => <circle key={x} cx={x} cy="-14.6" r="0.7" fill="#f5a623" />)}
      <Wheel x={-112} /><Wheel x={-122} /><Wheel x={-132} />
    </g>
  )
}

// A flatbed with a load: coils (eye horizontal, in cradles, chained down) or a bundle of pipes between stakes, strapped.
function Flatbed({ load }) {
  return (
    <g>
      <rect x="-141" y="-24.4" width="89" height="4.6" fill="#b9733a" stroke="#7a4f26" strokeWidth="0.5" />
      <g stroke="#7a4f26" strokeWidth="0.4">{Array.from({ length: 14 }, (_, i) => <line key={i} x1={-134 + i * 6.2} y1="-24.4" x2={-134 + i * 6.2} y2="-19.8" />)}</g>
      <rect x="-53.6" y="-36" width="2.4" height="11.6" fill="#7a4f26" /><rect x="-54.6" y="-37" width="4.4" height="1.6" fill="#59627a" />
      {[-136, -118, -100, -82, -64].map((x) => <rect key={x} x={x} y="-30" width="1.3" height="5.6" fill="#3a4250" />)}
      {load === 'coils' ? (
        <g>
          {[-112, -86].map((cx) => (
            <g key={cx}>
              <path d={`M${cx - 9},-24.4 L${cx - 4},-27 L${cx + 4},-27 L${cx + 9},-24.4 Z`} fill="#3a2a18" />
              <circle cx={cx} cy="-36" r="10.6" fill="url(#cv-coil)" />
              <circle cx={cx} cy="-36" r="8.4" fill="none" stroke="#a8b2c0" strokeWidth="0.5" /><circle cx={cx} cy="-36" r="6.4" fill="none" stroke="#8a95a4" strokeWidth="0.5" />
              <circle cx={cx} cy="-36" r="4" fill="#2a2f38" /><circle cx={cx} cy="-36" r="4" fill="none" stroke="#9aa4b2" strokeWidth="0.6" />
              <path d={`M${cx - 10.6},-36 A10.6,10.6 0 0 1 ${cx + 10.6},-36`} fill="none" stroke="#1d2129" strokeWidth="1.3" strokeDasharray="2.2 1.2" />
            </g>
          ))}
          <path d="M-112,-46.6 Q-99,-52 -86,-46.6" fill="none" stroke="#1d2129" strokeWidth="1.1" strokeDasharray="2.2 1.2" />
        </g>
      ) : (
        <g>
          {[[-134, -62, -29.4], [-132, -64, -35], [-130, -66, -40.6], [-128, -68, -46.2]].map(([x1, x2, y]) => (
            <g key={y}>
              <rect x={x1} y={y} width={x2 - x1} height="5.4" rx="2.7" fill="url(#cv-pipe)" stroke="#6e7886" strokeWidth="0.5" />
              <ellipse cx={x2 - 2.4} cy={y + 2.7} rx="1.5" ry="2.4" fill="#4a5360" />
            </g>
          ))}
          <rect x="-136.4" y="-50" width="1.5" height="26" fill="#3a4250" /><rect x="-61.6" y="-50" width="1.5" height="26" fill="#3a4250" />
          {[-122, -98, -76].map((x) => <g key={x}><rect x={x} y="-48.6" width="1.5" height="24" fill="#d9a21b" /><rect x={x - 1} y="-37" width="3.5" height="3" rx="0.6" fill="#59627a" /></g>)}
        </g>
      )}
      <Running />
    </g>
  )
}

// The LNG tanker: a tall white insulated barrel on its frame, the big SEROS (with the S mark) and LNG on its side, hoops and a
// top walkway rail, a pressure vent, and a rear valve cabinet with hazard diamonds.
function LngTrailer() {
  return (
    <g>
      <g fill="#2d333d">{[-132, -108, -84, -62].map((x) => <rect key={x} x={x} y="-27" width="3" height="8" />)}</g>
      <rect x="-139" y="-55.4" width="87" height="30.4" rx="15" fill="url(#cv-barrel)" stroke="#aab4c4" strokeWidth="0.6" />
      <g stroke="#c1cad7" strokeWidth="0.7" fill="none">{[-124, -106, -88, -70].map((x) => <path key={x} d={`M${x},-53.6 Q${x - 1.6},-40 ${x},-26.6`} />)}</g>
      <path d="M-128,-48 Q-96,-52.6 -64,-48" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2" fill="none" strokeLinecap="round" />
      <image href="/branding/seros-mark.png" x="-131" y="-48.6" width="9.6" height="15.4" preserveAspectRatio="xMidYMid meet" />
      <text x="-92" y="-36.4" textAnchor="middle" fontSize="13.4" fontWeight="800" fontStyle="italic" letterSpacing="1" fill="#1a3f7a" fontFamily={FONT}>SEROS</text>
      <text x="-92" y="-29.8" textAnchor="middle" fontSize="5" fontWeight="800" letterSpacing="2.4" fill="#2bb5a0" fontFamily={FONT}>LNG</text>
      <path d="M-122,-57.4 L-66,-57.4 M-122,-55 L-122,-58.6 M-94,-55 L-94,-58.6 M-66,-55 L-66,-58.6" stroke="#aab4c4" strokeWidth="0.7" fill="none" />
      <rect x="-70.8" y="-64" width="2.2" height="9" fill="#9eacc0" /><rect x="-72.4" y="-65.4" width="5.4" height="1.8" rx="0.8" fill="#7c8696" />
      <rect x="-147" y="-37" width="9" height="19" rx="1" fill="#d0d6df" stroke="#8d97a6" strokeWidth="0.5" />
      <g fill="#d33"><circle cx="-144" cy="-31" r="1.7" /><circle cx="-144" cy="-25" r="1.7" /></g>
      <g transform="translate(-142.5 -20) rotate(45)"><rect x="-2.6" y="-2.6" width="5.2" height="5.2" fill="#d33" stroke="#fff" strokeWidth="0.5" /></g>
      <Running />
    </g>
  )
}

// A road bulk tanker: a polished silver elliptical tank in compartments with its manholes, a walkway rail, a rear ladder,
// discharge pipework and flammable-liquid diamonds.
function BulkTrailer() {
  return (
    <g>
      <g fill="#2d333d">{[-130, -106, -82, -62].map((x) => <rect key={x} x={x} y="-27" width="3" height="8" />)}</g>
      <rect x="-139" y="-52" width="87" height="26.6" rx="11" fill="url(#cv-silver)" stroke="#7c8696" strokeWidth="0.6" />
      <g stroke="#8f9bad" strokeWidth="0.8" fill="none">{[-116, -92, -68].map((x) => <path key={x} d={`M${x},-50.6 Q${x - 1.6},-39 ${x},-27`} />)}</g>
      <path d="M-130,-46 Q-96,-50.4 -62,-46" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {[-126, -102, -78].map((x) => <g key={x}><rect x={x} y="-55.4" width="10" height="3.8" rx="1.4" fill="#59627a" /><rect x={x + 3.4} y="-57.4" width="3.2" height="2.2" rx="0.8" fill="#7c8696" /></g>)}
      <path d="M-134,-58.4 L-58,-58.4" stroke="#aab4c4" strokeWidth="0.7" />
      <text x="-96" y="-35" textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="1.6" fill="#1a3f7a" fontFamily={FONT}>SEROS</text>
      <rect x="-96" y="-30.6" width="0" height="0" />
      <path d="M-134,-24 L-62,-24" stroke="#14171d" strokeWidth="2" />
      {[-124, -96, -68].map((x) => <circle key={x} cx={x} cy="-24" r="1.7" fill="#d33" />)}
      <path d="M-142.6,-50 L-142.6,-19 M-139.6,-50 L-139.6,-19" stroke="#59627a" strokeWidth="0.8" fill="none" />
      {[-46, -41, -36, -31, -26, -21].map((y) => <line key={y} x1="-142.6" y1={y} x2="-139.6" y2={y} stroke="#59627a" strokeWidth="0.7" />)}
      {[-112, -76].map((x) => <g key={x} transform={`translate(${x} -29) rotate(45)`}><rect x="-3.2" y="-3.2" width="6.4" height="6.4" fill="#d33" stroke="#fff" strokeWidth="0.5" /><rect x="-1.4" y="-1.4" width="2.8" height="2.8" fill="#fff" /></g>)}
      <Running />
    </g>
  )
}

// One truck in the convoy, its shadow (long, because the sun is low and ahead of it) and the dust it kicks up behind its trailer.
function Truck({ i, kind, trailer }) {
  return (
    <g transform={`translate(${-i * PITCH} ${ROAD}) scale(${TRUCK_K})`}>
      <ellipse cx="-70" cy="2" rx="86" ry="3.4" fill="#000" fillOpacity="0.32" />
      <ellipse cx="-110" cy="1.6" rx="110" ry="2" fill="#000" fillOpacity="0.14" />
      <g className={`cv-bob cv-bob-${i}`}>
        {trailer}
        <Tractor kind={kind} />
      </g>
      {kind === 'lng' && (
        <g>
          <g className="cv-vapor"><circle cx="-69.7" cy="-67" r="2.6" fill="#ffffff" /></g>
          <g className="cv-vapor cv-vapor-b"><circle cx="-69.7" cy="-67" r="2.2" fill="#ffffff" /></g>
        </g>
      )}
    </g>
  )
}

function Pylon({ x, h }) {
  const top = 316 - h
  return (
    <g stroke="#1b2a45" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d={`M${x - 11},316 L${x - 2},${top + 14} L${x},${top} L${x + 2},${top + 14} L${x + 11},316`} />
      <path d={`M${x - 8},${top + 38} L${x + 8},${top + 38} M${x - 5},${top + 22} L${x + 5},${top + 22}`} strokeWidth="1" />
      <path d={`M${x - 8},${top + 38} L${x + 6},${top + 22} M${x + 8},${top + 38} L${x - 6},${top + 22}`} strokeWidth="0.8" />
      <path d={`M${x - 20},${top + 12} L${x + 20},${top + 12}`} strokeWidth="1.6" />
    </g>
  )
}

// The refinery skyline across the far side of the road, after a silhouette: columns with their pipe loops, lattice structures, stacks,
// cooling towers, spheres, a row of horizontal tanks, a long pipe rack and a flare. Two layers: pale and far, dark and near.
const BASE = 316
const Column = ({ x, w, h, loop = true }) => (
  <g>
    <path d={`M${x},${BASE} L${x},${BASE - h + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w},${BASE - h + w / 2} L${x + w},${BASE} Z`} />
    {loop && <path d={`M${x + w},${BASE - h + 8} h7 v26 M${x},${BASE - h * 0.55} h-6 v16`} fill="none" stroke="currentColor" strokeWidth="2" />}
    {[0.3, 0.5, 0.7].map((f) => <rect key={f} x={x - 1.6} y={BASE - h * f} width={w + 3.2} height="2" />)}
  </g>
)
const Lattice = ({ x, w, h }) => (
  <g fill="none" stroke="currentColor" strokeWidth="1.1">
    <rect x={x} y={BASE - h} width={w} height={h} />
    {Array.from({ length: Math.floor(h / 12) }, (_, i) => <path key={i} d={`M${x},${BASE - i * 12} L${x + w},${BASE - (i + 1) * 12} M${x + w},${BASE - i * 12} L${x},${BASE - (i + 1) * 12}`} />)}
  </g>
)
const Stack = ({ x, w, h }) => <path d={`M${x},${BASE} L${x + w * 0.25},${BASE - h} L${x + w * 0.75},${BASE - h} L${x + w},${BASE} Z`} />
const Cooling = ({ x, w, h }) => <path d={`M${x},${BASE} Q${x + w * 0.28},${BASE - h * 0.5} ${x + w * 0.2},${BASE - h} L${x + w * 0.8},${BASE - h} Q${x + w * 0.72},${BASE - h * 0.5} ${x + w},${BASE} Z`} />
function Refinery() {
  return (
    <g>
      <g fill="#3b5380" color="#3b5380" opacity="0.6">
        <Stack x={640} w={5} h={128} /><Stack x={706} w={6} h={150} /><Stack x={1012} w={6} h={138} /><Stack x={1156} w={5} h={118} />
        <Cooling x={756} w={46} h={60} /><Cooling x={1056} w={50} h={64} />
        <Column x={826} w={14} h={96} loop={false} /><Column x={868} w={10} h={82} loop={false} /><Column x={1118} w={12} h={88} loop={false} />
      </g>
      <g fill="#16233b" color="#16233b">
        <rect x="520" y={BASE - 13} width="680" height="2.6" /><rect x="520" y={BASE - 8.6} width="680" height="2" />
        {Array.from({ length: 56 }, (_, i) => <rect key={i} x={524 + i * 12} y={BASE - 13} width="1.8" height="13" />)}
        <Column x={600} w={13} h={58} /><Column x={690} w={16} h={92} /><Column x={730} w={12} h={70} /><Column x={792} w={20} h={108} /><Column x={884} w={14} h={86} />
        <Column x={944} w={16} h={100} /><Column x={1000} w={12} h={64} /><Column x={1092} w={14} h={74} />
        <Lattice x={762} w={18} h={104} /><Lattice x={912} w={16} h={78} /><Lattice x={1068} w={20} h={96} />
        <Stack x={974} w={6} h={118} /><Stack x={1138} w={5} h={96} />
        {[536, 566].map((x) => <rect key={x} x={x} y={BASE - 12} width="26" height="12" rx="6" />)}
        <circle cx="1170" cy={BASE - 11} r="11" /><circle cx="1194" cy={BASE - 9} r="9" />
        <rect x="1182" y={BASE - 100} width="3" height="100" />
        <rect x="620" y={BASE - 26} width="52" height="26" /><rect x="940" y={BASE - 20} width="46" height="20" />
      </g>
      <g className="cv-flare"><path d="M1183.5,216 C1180,211 1181,208 1183.5,203 C1186,208 1187,211 1183.5,216 Z" fill="#ff8a1f" /></g>
    </g>
  )
}

// The ground between the refinery and the road: a soft, uneven rise (not a flat band) with scrub on it.
function Verge() {
  const tufts = [[70, 4], [168, 5], [290, 3.4], [470, 4.6], [560, 3.6], [718, 4.2], [852, 5], [1010, 3.6], [1100, 4.4], [1180, 3.4]]
  return (
    <g>
      <path d="M0,330 L0,320 Q90,311 190,318 T380,316 T560,319 T760,314 T960,318 T1200,313 L1200,330 Z" fill="url(#cv-ground)" />
      <g fill="#16233b">{tufts.map(([x, r]) => <g key={x}><ellipse cx={x} cy={317 - r * 0.4} rx={r * 2.4} ry={r} /><ellipse cx={x + r * 1.7} cy={318 - r * 0.2} rx={r * 1.6} ry={r * 0.8} /></g>)}</g>
    </g>
  )
}

export default function ConvoyScene() {
  const stars = [[60, 40, 1.2], [190, 22, 1], [330, 58, 1.1], [520, 30, 1], [640, 14, 1.3], [760, 50, 1], [1040, 62, 1]]
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="cv-dawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5a25a" stopOpacity="0" /><stop offset="55%" stopColor="#f5a25a" stopOpacity="0.5" /><stop offset="100%" stopColor="#ffd9a0" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="cv-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#fff3c9" stopOpacity="1" /><stop offset="35%" stopColor="#ffc46b" stopOpacity="0.55" /><stop offset="100%" stopColor="#ff9f4a" stopOpacity="0" /></radialGradient>
        <linearGradient id="cv-barrel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="60%" stopColor="#e4e9f1" /><stop offset="100%" stopColor="#b7c2d2" /></linearGradient>
        <linearGradient id="cv-silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eef1f6" /><stop offset="55%" stopColor="#b7c1cf" /><stop offset="100%" stopColor="#8f9bad" /></linearGradient>
        <linearGradient id="cv-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16233b" /><stop offset="100%" stopColor="#2a2f38" /></linearGradient>
        <linearGradient id="cv-ev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dcbb86" /><stop offset="55%" stopColor="#b08d5b" /><stop offset="100%" stopColor="#7d5e33" /></linearGradient>
        <linearGradient id="cv-wht" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#cdd5e2" /></linearGradient>
        <linearGradient id="cv-blu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b74d6" /><stop offset="100%" stopColor="#173f86" /></linearGradient>
        <linearGradient id="cv-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#86a8cf" /><stop offset="100%" stopColor="#2b4468" /></linearGradient>
        <radialGradient id="cv-coil" cx="0.4" cy="0.35" r="0.75"><stop offset="0%" stopColor="#b9c3d1" /><stop offset="100%" stopColor="#566170" /></radialGradient>
        <linearGradient id="cv-pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8f9bab" /><stop offset="100%" stopColor="#4a5360" /></linearGradient>
        <linearGradient id="cv-board" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#12805a" /><stop offset="100%" stopColor="#2bb5a0" /></linearGradient>
        <linearGradient id="cv-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffc98a" stopOpacity="0" /><stop offset="100%" stopColor="#e0a468" stopOpacity="0.55" /></linearGradient>
      </defs>
      <g className="cv-scene">
        {stars.map(([x, y, r]) => <circle key={x} className="cv-star" cx={x} cy={y} r={r} fill="#fff" fillOpacity="0.5" />)}
        <rect className="cv-dawn" x="0" y="150" width="1200" height="170" fill="url(#cv-dawn)" />
        <g className="cv-sun"><circle cx="900" cy="270" r="70" fill="url(#cv-sun)" /><circle cx="900" cy="270" r="17" fill="#fff0c2" /></g>

        {/* the far side of the road, in silhouette: pylons and their wires behind a refinery skyline */}
        <g opacity="0.92">
          <path d="M150,204 Q385,226 600,214" stroke="#1b2a45" strokeWidth="0.8" fill="none" />
          <Pylon x={150} h={122} /><Pylon x={600} h={110} />
          <Refinery />
        </g>

        {/* the roadside board, with the Seros S mark */}
        <g transform="translate(322 0)">
          <rect x="22" y="288" width="2.4" height="30" fill="#2a2f3a" /><rect x="114" y="288" width="2.4" height="30" fill="#2a2f3a" />
          <rect x="0" y="262" width="138" height="30" rx="2" fill="url(#cv-board)" stroke="#0b5a40" strokeWidth="1" />
          <rect x="5" y="265.5" width="17" height="23" rx="3" fill="#f2f6f8" />
          <image href="/branding/seros-mark.png" x="7.4" y="267.4" width="12.2" height="19.6" preserveAspectRatio="xMidYMid meet" />
          <text x="82" y="281" textAnchor="middle" fontSize="9.4" fontWeight="800" letterSpacing="0.4" fill="#ffffff" fontFamily={FONT}>#SerosGreenLogistics</text>
        </g>

        {/* the verge and the road with its centre line */}
        <Verge />
        <rect x="0" y="321" width="1200" height="39" fill="#2a2f38" />
        <path d="M0,334 L1200,334" stroke="#e8edf5" strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="22 18" />
        <rect x="0" y="296" width="1200" height="34" fill="url(#cv-haze)" />

        {/* the convoy: all four trucks cross together, the leader's front at x = 0 when it starts */}
        <g className="cv-convoy">
          <Truck i={0} kind="ev" trailer={<Flatbed load="coils" />} />
          <Truck i={1} kind="lng" trailer={<LngTrailer />} />
          <Truck i={2} kind="bulk" trailer={<BulkTrailer />} />
          <Truck i={3} kind="ev" trailer={<Flatbed load="pipes" />} />
        </g>
      </g>
    </svg>
  )
}
