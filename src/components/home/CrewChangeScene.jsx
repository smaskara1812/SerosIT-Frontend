import { Swell, Wildcat, WildcatDefs } from '@/components/home/Wildcat'

// The hidden "crew change" scene for the home banner. The Essar Wildcat stands about two thirds of the way across, with a
// helipad out on its left that rises out of the sea together with it. A crew helicopter flies in from the top left,
// flares and settles onto the pad; three people walk off it and three come out of the rig to take their places, with no
// hurry; then it lifts and flies off the right edge of the banner in front of the rig. The whole thing runs
// 18 seconds; its timings live in index.css (`.hero-crew`) and the people's delays below, so change them together.
// Decoration only.

const RIG_X = 800 // where the rig stands across the banner (the banner is 1200 wide)
const RIG_Y = 330 // its waterline
const RIG_S = 0.46 // its size relative to the ship scene's rig (0.62)
const DECK_LEFT = RIG_X - 168 * RIG_S // the left end of the rig's deck
const PAD_Y = RIG_Y - 98 * RIG_S // the top of the deck, where the pad is level with it
const PAD_W = 82
const PAD_CX = DECK_LEFT - PAD_W / 2
const HELI_X = PAD_CX + 6 // where the helicopter stands on the pad
const HELI_K = 0.55 // the helicopter is drawn big and scaled down by this much
const DOOR_X = HELI_X - 1.7 // its rear cabin door
const HUT_X = DECK_LEFT - 7 // the door in the rig's hut, at the pad's right-hand end
const WALK = HUT_X - DOOR_X
const WALK_S = 3.4

// Three people each way, a little apart. [delay in seconds]
const INBOUND = [6.5, 7.0, 7.5] // helicopter -> rig
const OUTBOUND = [7.2, 7.7, 8.2] // rig -> helicopter

const EDGE_LIGHTS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2
  return { x: PAD_CX + (PAD_W / 2 - 1.5) * Math.cos(a), y: PAD_Y + 2.7 * Math.sin(a), i }
})

function Person({ from, dx, delay, lane, flip }) {
  return (
    <g transform={`translate(${from} ${PAD_Y + lane}) scale(0.72)`}>
      <g className="crew-walk" style={{ '--dx': `${dx / 0.72}px`, animationDelay: `${delay}s`, animationDuration: `${WALK_S}s` }}>
        <g transform={flip ? 'scale(-1 1)' : undefined}>
          <g className="crew-step" style={{ animationDelay: `${delay}s` }}>
            {/* legs, a body in an orange survival suit with a reflective band, arms, and a white hard hat */}
            <rect className="crew-leg" x="-1.5" y="-4" width="1.3" height="4.2" fill="#1f2a44" />
            <rect className="crew-leg crew-leg-b" x="0.2" y="-4" width="1.3" height="4.2" fill="#1f2a44" />
            <rect x="-2" y="-8.4" width="4" height="5" rx="1.2" fill="#f26a1b" />
            <rect x="-2" y="-6.2" width="4" height="0.7" fill="#f6e08a" />
            <rect x="-2.9" y="-8" width="1.1" height="3.6" rx="0.5" fill="#e45a10" />
            <circle cx="0" cy="-10" r="1.6" fill="#e8b48f" />
            <path d="M-1.9,-10.2 A1.9,1.9 0 0 1 1.9,-10.2 Z" fill="#f4f7fb" />
          </g>
        </g>
      </g>
    </g>
  )
}

function Helicopter() {
  // A light twin-blade-style helicopter in the Airbus H125 mould (compact bubble cabin, short boom, tall fin, skids), drawn
  // facing right and standing on its skids at (0, 0). The animation layers move and tilt it.
  return (
    <g className="heli-x">
      <g className="heli-y">
        <g className="heli-pitch">
          <g transform={`scale(${HELI_K})`}>
            {/* tail: fin up and down, the little stabiliser, the tail rotor and the strobe */}
            <path d="M-48,-22.5 L-57.5,-40.5 L-63,-40 L-60.5,-19 L-48,-20 Z" fill="#f6f8fb" />
            <path d="M-57.5,-40.5 L-63,-40 L-62.2,-35.5 L-56,-35.5 Z" fill="#1d4fa3" />
            <path d="M-56,-19.5 L-58,-11.4 L-61.2,-11.8 L-60.5,-19.5 Z" fill="#e9edf3" />
            <rect x="-58" y="-21.2" width="12" height="1.4" rx="0.5" fill="#c8d0dc" />
            <g transform="translate(-62.4 -29)">
              <circle r="1" fill="#20263a" />
              <ellipse className="heli-tail-rotor" rx="0.7" ry="5" fill="#2a3042" fillOpacity="0.55" />
            </g>
            <circle className="heli-strobe" cx="-60.5" cy="-41.2" r="1" fill="#ff4a3d" />
            {/* the fuselage: one tall rounded cabin that narrows into a slim boom */}
            <path d="M38,-13 C38,-20 34,-25 28,-28 L21,-31 C14,-34 2,-34.5 -6,-33 L-14,-25 L-60,-22.5 L-60,-19.5 L-14,-13.5 L-11,-9.5 C-6,-7 5,-7 14,-8 C24,-8.5 33,-9 36,-10.5 C37.6,-11.2 38,-12 38,-13 Z" fill="#f6f8fb" />
            <path d="M-12,-30 C-10,-36.5 6,-37.5 12,-34.5 L10,-33 L-12,-31 Z" fill="#e3e8f0" />
            <rect x="-6" y="-37" width="4" height="2.6" rx="1" fill="#8a6a55" />
            <path d="M-11,-9.5 L-14,-13.5 L37.4,-14.6 C38,-13 37.8,-11.8 36,-10.5 C33,-9 24,-8.5 14,-8 C5,-7 -6,-7 -11,-9.5 Z" fill="#1d4fa3" />
            <line x1="-14" y1="-15.4" x2="37.8" y2="-16.4" stroke="#3dbdb0" strokeWidth="0.9" />
            <text x="-36" y="-20.2" textAnchor="middle" fontSize="3.4" fontWeight="800" letterSpacing="0.5" fill="#1d4fa3" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" transform="rotate(1.4 -36 -20.2)">SEROS</text>
            {/* glass: the big wraparound windscreen and cockpit side window, the door and its window, the rear cabin window */}
            <path d="M29.4,-26.4 C33,-22.6 34.6,-18.5 34.4,-15.8 L19,-15.8 L19,-27.4 Z" fill="#162c52" />
            <path d="M28.4,-25.4 C30.5,-23.2 31.6,-21 31.8,-19 L25,-19 L25,-26.4 Z" fill="#8fb0dd" fillOpacity="0.4" />
            <rect x="5.4" y="-27" width="12.4" height="12" rx="1.4" fill="none" stroke="#aab6c9" strokeWidth="0.5" />
            <rect x="7" y="-25.6" width="8.6" height="7.4" rx="1.2" fill="#162c52" />
            <rect x="-6.6" y="-26" width="5.6" height="6" rx="1" fill="#162c52" />
            <rect x="-10" y="-26" width="14" height="13.6" rx="1.2" fill="#162c52" />
            <rect className="heli-door" x="-10" y="-26" width="14" height="13.6" rx="1.2" fill="#f6f8fb" stroke="#aab6c9" strokeWidth="0.5" />
            <rect className="heli-door-window" x="-8" y="-24.6" width="9" height="5.2" rx="1" fill="#162c52" />
            {/* skids and the two struts that carry them */}
            <g fill="none" stroke="#2a2f3c" strokeLinecap="round">
              <path d="M-14,-1 L30,-1 C34,-1 36,-3 36.6,-5.6" strokeWidth="1.8" />
              <line x1="21" y1="-8" x2="19.6" y2="-1.4" strokeWidth="1.3" /><line x1="-5" y1="-7.6" x2="-6.4" y2="-1.4" strokeWidth="1.3" />
            </g>
            {/* mast, hub, and the rotor: fast blur in flight, slow visible blades while it idles on the pad */}
            <rect x="5.4" y="-41" width="3" height="7.6" fill="#3b4256" />
            <rect x="3" y="-42.8" width="8" height="2.6" rx="0.9" fill="#2a3042" />
            <g className="heli-rotor-fast">
              <ellipse cx="7" cy="-41.6" rx="44" ry="2.6" fill="#aab6c9" fillOpacity="0.28" />
              <line className="heli-blade" x1="-37" y1="-41.6" x2="51" y2="-41.6" stroke="#2a2f3c" strokeOpacity="0.55" strokeWidth="1.1" />
            </g>
            <g className="heli-rotor-slow">
              <path className="heli-blade-slow" d="M-37,-39.6 Q7,-43.6 51,-39.6" fill="none" stroke="#2a2f3c" strokeWidth="1.3" strokeLinecap="round" />
              <path className="heli-blade-slow heli-blade-slow-b" d="M-37,-39.6 Q7,-43.6 51,-39.6" fill="none" stroke="#2a2f3c" strokeWidth="1.3" strokeLinecap="round" />
            </g>
            <circle className="heli-strobe heli-strobe-b" cx="7" cy="-43.6" r="0.9" fill="#ff4a3d" />
          </g>
        </g>
      </g>
    </g>
  )
}

export default function CrewChangeScene() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <WildcatDefs />
      </defs>

      {/* the Essar Wildcat */}
      <Wildcat x={RIG_X} y={RIG_Y} scale={RIG_S} />

      {/* the helipad: struts out from the rig, a slab, the lit top with its H, the safety net, a windsock. It rises with the rig. */}
      <g className="pad-rise" style={{ '--rise': `${60 * RIG_S}px` }}>
        <g stroke="#6b778c" strokeWidth="1.2" strokeLinecap="round">
          <line x1={DECK_LEFT - PAD_W + 6} y1={PAD_Y + 3} x2={DECK_LEFT + 14} y2={RIG_Y - 20} />
          <line x1={DECK_LEFT - PAD_W / 2} y1={PAD_Y + 3} x2={DECK_LEFT + 14} y2={RIG_Y - 28} />
        </g>
        <path d={`M${DECK_LEFT - PAD_W},${PAD_Y + 0.4} L${DECK_LEFT - PAD_W - 7},${PAD_Y + 3.6} L${DECK_LEFT - PAD_W - 7},${PAD_Y + 5.2} L${DECK_LEFT - PAD_W},${PAD_Y + 3} Z`} fill="#aab4c4" fillOpacity="0.7" />
        <rect x={DECK_LEFT - PAD_W} y={PAD_Y} width={PAD_W} height="3.6" fill="#252c3a" />
        <ellipse cx={PAD_CX} cy={PAD_Y} rx={PAD_W / 2} ry="3.2" fill="#445066" />
        <ellipse cx={PAD_CX} cy={PAD_Y} rx={PAD_W / 2 - 7} ry="2.4" fill="none" stroke="#f3f5f9" strokeOpacity="0.85" strokeWidth="0.6" />
        <text x={PAD_CX} y={PAD_Y + 1.3} textAnchor="middle" fontSize="5" fontWeight="800" fill="#f3f5f9" fillOpacity="0.9" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" transform={`translate(0 ${PAD_Y}) scale(1 0.45) translate(0 ${-PAD_Y})`}>H</text>
        {EDGE_LIGHTS.map((l) => <circle key={l.i} className={`pad-light ${l.i % 2 ? 'pad-light-b' : ''}`} cx={l.x} cy={l.y} r="0.7" fill="#58f0a0" />)}
        {/* the hut at the rig end with the door the crew use */}
        <rect x={HUT_X - 5.5} y={PAD_Y - 8.4} width="11" height="8.6" fill="#e3e7ee" /><rect x={HUT_X - 5.5} y={PAD_Y - 9.2} width="11" height="1.3" fill="#d94b2b" />
        <rect x={HUT_X - 2.4} y={PAD_Y - 6.8} width="4.8" height="6.9" fill="#1b2a44" />
        {/* windsock */}
        <line x1={DECK_LEFT - PAD_W + 6} y1={PAD_Y} x2={DECK_LEFT - PAD_W + 6} y2={PAD_Y - 13} stroke="#c9ced8" strokeWidth="0.8" />
        <g className="crew-sock" style={{ transformOrigin: `${DECK_LEFT - PAD_W + 6}px ${PAD_Y - 13}px` }}>
          <path d={`M${DECK_LEFT - PAD_W + 6},${PAD_Y - 13.6} l-6,.8 l0,2.4 l6,.8 Z`} fill="#f08a2c" /><path d={`M${DECK_LEFT - PAD_W},${PAD_Y - 12.8} l-5,.6 l0,1.4 l5,.6 Z`} fill="#f4f7fb" />
        </g>
      </g>
      <ellipse className="heli-shadow" cx={HELI_X - 4} cy={PAD_Y + 0.4} rx="24" ry="1.8" fill="#0b1220" />

      {/* the helicopter, standing at its place on the pad when the animation ends */}
      <g transform={`translate(${HELI_X} ${PAD_Y})`}>
        <Helicopter />
      </g>

      {/* the people: three off the helicopter into the rig (nearer the viewer), three out of the rig into it */}
      {INBOUND.map((d) => <Person key={`in${d}`} from={DOOR_X} dx={WALK} delay={d} lane={1.1} />)}
      {OUTBOUND.map((d) => <Person key={`out${d}`} from={HUT_X} dx={-WALK} delay={d} lane={-0.8} flip />)}

      <Swell />
    </svg>
  )
}
