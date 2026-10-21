import { Wildcat, WildcatDefs } from '@/components/home/Wildcat'

// The hidden "rig move" scene for the home banner (typed into the home search: "anchors away" or "anchor handling"). The Essar Wildcat,
// Seros's semi-submersible, moves to a new location, the way it is done offshore:
//   1. She is deballasted to transit draft, so her pontoons ride high, and two anchor-handling tug supply vessels (AHTS) tow her in:
//      one ahead on a tow wire, one astern holding her back.
//   2. On location the tow wire is let go and both vessels sail away out of the scene.
//   3. The rig ballasts down to drilling draft, and her own cranes lower two anchors, one each side: each falls (a splash as it enters the
//      water, slower through the water), hits the seabed upright, bounces, topples over and settles on its side with its flukes dug in.
//      The hoist wire is released and the mooring rope drapes from the rig's fairlead to the anchor with a sag, then comes taut (but
//      not straight).
//   4. Her deck lights and flare come on.
// The sea is a cross-section so the anchors and lines can be seen. 17.6 seconds; its timings live in index.css (`.hero-move`), so change
// them together. Decoration only.

const WL = 300 // the waterline across the banner (the banner is 1200 wide, 360 tall)
const SEABED = 346
const RIG_X = 800 // where the Wildcat ends up
const SC = 0.36 // the Wildcat's scale (a small rig in a big sea)
const VS = 0.75 // and the vessels', a little shorter than the rig is wide
const FAIR = 56 // how far from the rig's centre her ends are, at pontoon level (where the tow wires fasten)
const FAIR_Y = WL + 8
const AHTS_HALF = 66 * VS // half the length of an AHTS
const GAP = 45 // between a vessel and the rig while towing
const LEAD_X = RIG_X + FAIR + GAP + AHTS_HALF // the lead AHTS's centre while towing, ahead of the rig
const TRAIL_X = RIG_X - FAIR - GAP - AHTS_HALF // the trailing AHTS's centre
// the two anchors, lowered from the rig's cranes (the hook of each crane, in the Wildcat's drawing) to the seabed
const CRANE = 56 // how far from the rig's centre each crane's hook is
const HOOK_Y = WL - 45
const FAIR_IN = 17 // the inner fairleads, at pontoon level
const DROPY = SEABED - 9 - HOOK_Y // how far the anchor's centre falls, hook to seabed
const FAIR_LOCAL = { x: FAIR_IN - CRANE, y: FAIR_Y - HOOK_Y } // the fairlead, seen from the right-hand hook
const RING = { x: -12, y: 76 } // where the anchor's ring ends up once it has toppled, seen from the hook
const SLACK = `M${FAIR_LOCAL.x},${FAIR_LOCAL.y} Q${(FAIR_LOCAL.x + RING.x) / 2 + 4},${(FAIR_LOCAL.y + RING.y) / 2 + 14} ${RING.x},${RING.y}`
const TAUT = `M${FAIR_LOCAL.x},${FAIR_LOCAL.y} Q${(FAIR_LOCAL.x + RING.x) / 2 + 2},${(FAIR_LOCAL.y + RING.y) / 2 + 3} ${RING.x},${RING.y}`
const SIDES = [{ k: 'a', sgn: 1, x: RIG_X + CRANE }, { k: 'b', sgn: -1, x: RIG_X - CRANE }]

const wave = (y, amp, len) => {
  let d = `M0,${y}`
  for (let x = 0; x <= 2400; x += 20) d += ` L${x},${(y + amp * Math.sin((x / len) * Math.PI * 2)).toFixed(1)}`
  return `${d} L2400,420 L0,420 Z`
}

function Anchor({ x = 0, y = 0, colour = '#c9d2de', k = 1 }) {
  // A stocked anchor: ring, shank, stock, and the two curved arms with their flukes.
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} fill="none" stroke={colour} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-10" r="1.8" />
      <line x1="0" y1="-8" x2="0" y2="6" />
      <line x1="-4.5" y1="-6" x2="4.5" y2="-6" />
      <path d="M-7,2 Q-6.5,7.5 0,7.5 Q6.5,7.5 7,2" />
      <path d="M-7,2 L-9.5,3.6 L-5,4 Z M7,2 L9.5,3.6 L5,4 Z" fill={colour} strokeWidth="0.8" />
    </g>
  )
}

// An anchor handling tug supply vessel, facing right, waterline at y = 0: a high flared bow, the accommodation and bridge forward, and a
// long open working deck aft with two winch drums, shark-jaw towing pins, a stern roller and the anchor ready on it.
function Ahts({ trail = false }) {
  return (
    <g>
      {/* the hull: blue, with the bow flaring up, a white sheer line and a red boot-topping stripe */}
      <path d="M-70,-13 L48,-13 L68,-26 L64,-8 L56,4 L-62,4 L-70,-3 Z" fill="#1d4fa3" />
      <path d="M-70,-13 L48,-13 L56,-17 L66,-24 L68,-26 L48,-10 L-70,-10 Z" fill="#f4f8fd" />
      <path d="M-70,-3 L-62,4 L56,4 L64,-8 L64,-3 L-70,-3 Z" fill="#d8574a" />
      <g className={`mv-name ${trail ? 'mv-name-b' : ''}`}>
        <text x="-6" y="-4.6" textAnchor="middle" fontSize="6.6" fontWeight="800" letterSpacing="2.2" fill="#ffffff" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">SEROS</text>
      </g>
      {[40, 52, 62].map((x) => <circle key={x} cx={x} cy="-6" r="2.2" fill="#1c1f26" />)}
      {/* the long working deck aft: plate, rails, tow pins, two winch drums, the stern roller */}
      <rect x="-68" y="-16" width="92" height="3.5" fill="#59627a" />
      <path d="M-68,-27 L24,-27 M-68,-22 L24,-22" stroke="#d9e1ec" strokeWidth="0.8" strokeOpacity="0.7" fill="none" />
      {[-68, -46, -24, -2, 20].map((x) => <line key={x} x1={x} y1="-27" x2={x} y2="-16" stroke="#d9e1ec" strokeWidth="0.8" strokeOpacity="0.7" />)}
      <rect x="-34" y="-24" width="3.4" height="8" fill="#e8a43a" /><rect x="-27" y="-24" width="3.4" height="8" fill="#e8a43a" />
      {[-14, 6].map((x) => <g key={x}><rect x={x} y="-27" width="16" height="11" rx="1.5" fill="#e8a43a" /><rect x={x - 1.5} y="-28" width="3" height="13" rx="1" fill="#c4862a" /><rect x={x + 14.5} y="-28" width="3" height="13" rx="1" fill="#c4862a" /><line x1={x + 3} y1="-21.5" x2={x + 13} y2="-21.5" stroke="#8a5f17" strokeWidth="1" /></g>)}
      <g transform="translate(-69 -12)"><circle r="6.2" fill="#6d7787" /><circle r="3.2" fill="#aab4c4" /></g>
      <Anchor x={-60} y={-22} />
      {/* accommodation, bridge and its windows, the funnel, the mast with its radar and beacon */}
      <rect x="22" y="-36" width="34" height="23" fill="#f4f8fd" /><rect x="22" y="-37.4" width="34" height="2" fill="#d8dde7" />
      <rect x="27" y="-49" width="26" height="13" fill="#f4f8fd" /><rect x="25" y="-51" width="30" height="2.6" fill="#d8574a" />
      <rect x="29" y="-46" width="22" height="6" fill="#162c52" />{[30, 36, 42, 48].map((x) => <rect key={x} x={x} y="-45" width="3.4" height="4" fill="#ffd77a" fillOpacity="0.9" />)}
      {[26, 32, 38, 44, 50].map((x) => <rect key={x} x={x} y="-31" width="3.6" height="4" fill="#ffd77a" fillOpacity="0.85" />)}
      <rect x="10" y="-44" width="9" height="30" fill="#d8574a" /><rect x="10" y="-44" width="9" height="4" fill="#17356f" />
      <line x1="40" y1="-51" x2="40" y2="-64" stroke="#d9e1ec" strokeWidth="1.2" /><line x1="34" y1="-60" x2="46" y2="-60" stroke="#d9e1ec" strokeWidth="1.2" />
      <g className="mv-radar"><line x1="36" y1="-65" x2="44" y2="-65" stroke="#aab4c4" strokeWidth="1.4" strokeLinecap="round" /></g>
      <circle className="mv-blink" cx="40" cy="-66" r="1.4" fill="#ff4a3d" />
      <circle className="mv-smoke" cx="14.5" cy="-46" r="3" fill="#cfd8e6" fillOpacity="0.5" /><circle className="mv-smoke mv-smoke-b" cx="14.5" cy="-46" r="2.4" fill="#cfd8e6" fillOpacity="0.4" />
      {/* the bow wave and the wash astern, while she is making way: both show which way she is going */}
      <g className="mv-wash" fill="#eaf6fb" fillOpacity="0.8"><path d="M64,3 C70,-1 76,-3 82,-2 C78,0 74,3 70,5 Z" /><ellipse cx="-78" cy="2" rx="9" ry="1.8" /><ellipse cx="-92" cy="3" rx="7" ry="1.3" /></g>
    </g>
  )
}

function Seabed() {
  return (
    <g>
      <path d={`M0,${SEABED} Q120,${SEABED - 4} 260,${SEABED} T520,${SEABED - 1} T800,${SEABED + 1} T1100,${SEABED - 2} T1300,${SEABED} L1300,420 L0,420 Z`} fill="#6e6150" />
      <path d={`M0,${SEABED + 6} Q200,${SEABED + 2} 420,${SEABED + 6} T900,${SEABED + 5} T1300,${SEABED + 6} L1300,420 L0,420 Z`} fill="#4c4338" />
      <g fill="#8a7b66"><ellipse cx="640" cy={SEABED + 1} rx="11" ry="4" /><ellipse cx="1010" cy={SEABED} rx="14" ry="5" /><ellipse cx="300" cy={SEABED + 1} rx="9" ry="3" /></g>
    </g>
  )
}

export default function RigMoveScene() {
  const stars = [[60, 40, 1.2], [190, 22, 1], [330, 58, 1.1], [520, 30, 1], [640, 14, 1.3], [760, 50, 1], [900, 26, 1.2], [1040, 62, 1], [1120, 18, 1.1], [1170, 70, 1]]
  const fairR = RIG_X + FAIR
  const fairL = RIG_X - FAIR
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <WildcatDefs />
        <linearGradient id="mv-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f8fb3" stopOpacity="0.3" /><stop offset="100%" stopColor="#0b2b45" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="mv-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#ffd77a" stopOpacity="0.5" /><stop offset="100%" stopColor="#ffd77a" stopOpacity="0" /></radialGradient>
      </defs>
      <g className="mv-scene">
        {stars.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="#fff" fillOpacity="0.5" />)}
        <Seabed />

        {/* the tow: the rig and both vessels travel in together, on their wires */}
        <g className="mv-tow">
          {/* the Wildcat, deballasted (high on her pontoons) until she ballasts down on location */}
          <g className="mv-ballast"><g className="mv-rigbob"><Wildcat x={RIG_X} y={WL} scale={SC} moorings={false} /></g></g>
          <ellipse className="mv-deckglow" cx={RIG_X} cy={WL - 38} rx="86" ry="44" fill="url(#mv-glow)" />

          {/* the tow wire from the lead vessel's stern to the rig's bow, and the holding line from the trailing vessel */}
          <g className="mv-towwire" fill="none" stroke="#d9c9a0" strokeWidth="1.3">
            <path d={`M${LEAD_X - AHTS_HALF - 2},${WL - 8} Q${(LEAD_X - AHTS_HALF + fairR) / 2},${WL + 6} ${fairR},${WL - 6}`} />
            <path d={`M${TRAIL_X + AHTS_HALF + 2},${WL - 8} Q${(TRAIL_X + AHTS_HALF + fairL) / 2},${WL + 6} ${fairL},${WL - 6}`} />
          </g>

          {/* the lead AHTS, ahead of the rig: she lets go and sails off to the right, bow first */}
          <g transform={`translate(${LEAD_X} ${WL + 2})`}>
            <g className="mv-lead"><g className="mv-vbob"><g transform={`scale(${VS})`}><Ahts /></g></g></g>
          </g>
          {/* the trailing AHTS, astern: she turns round and sails off to the left, bow first */}
          <g transform={`translate(${TRAIL_X} ${WL + 2})`}>
            <g className="mv-trail"><g className="mv-vbob mv-vbob-b"><g transform={`scale(${VS})`}><Ahts trail /></g></g></g>
          </g>
        </g>

        {/* the rig's own anchors, lowered from her cranes: the hoist wire, then the mooring rope from the fairlead (slack, then taut) */}
        {SIDES.map(({ k, sgn, x }) => (
          <g key={k} transform={`translate(${x} ${HOOK_Y}) scale(${sgn} 1)`}>
            <g className={`mv-hoist mv-hoist-${k}`}><line x1="0" y1="0" x2="0" y2={DROPY} stroke="#d9c9a0" strokeWidth="1.1" vectorEffect="non-scaling-stroke" /></g>
            <path className={`mv-rope mv-slack mv-slack-${k}`} d={SLACK} fill="none" stroke="#cfe3f5" strokeWidth="1.3" strokeLinecap="round" />
            <path className="mv-rope mv-taut" d={TAUT} fill="none" stroke="#e8f2fb" strokeWidth="1.5" strokeLinecap="round" />
            <g className={`mv-anchor mv-anchor-${k}`}><Anchor k={1.1} colour="#d4dbe6" /></g>
          </g>
        ))}

        {/* the sea in front, so everything under the surface looks submerged, and the swell on top */}
        <rect x="0" y={WL} width="1200" height={420 - WL} fill="url(#mv-sea)" />
        <g className="swell swell-a"><path d={wave(WL - 2, 3.5, 200)} fill="#7fd1e0" fillOpacity="0.22" /></g>
        <g className="swell swell-b"><path d={wave(WL + 5, 3, 140)} fill="#1a3f7a" fillOpacity="0.28" /></g>

        {/* a splash where each anchor enters the water, and puffs of seabed where it lands and where it topples */}
        {SIDES.map(({ k, sgn, x }) => (
          <g key={k} transform={`translate(${x} 0) scale(${sgn} 1)`}>
            <ellipse className={`mv-splash mv-splash-${k}`} cx="0" cy={WL + 1} rx="9" ry="2.4" fill="none" stroke="#eaf6fb" strokeWidth="1.2" />
            <ellipse className={`mv-puff mv-puff-${k}`} cx="-1" cy={SEABED - 3} rx="12" ry="3.4" fill="#c9b99a" />
            <ellipse className={`mv-puff mv-puff2 mv-puff2-${k}`} cx="-9" cy={SEABED - 3} rx="11" ry="3.2" fill="#c9b99a" />
          </g>
        ))}
      </g>
    </svg>
  )
}
