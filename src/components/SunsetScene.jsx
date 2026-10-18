import { useEffect, useMemo } from 'react'
import { lowPowerDevice } from '@/lib/perf'

// The sunset: a full-page scene played once, after the secret phrase is typed into the home search.
// A Seros land rig at the end of a tour. The sun goes down behind layered ridges dotted with acacia and far-off rigs, the
// sky runs from gold to dusk to the brand's navy night with a teal glow on the horizon, the rig is rim-lit by the last
// sun and then its lights come on one by one (the doghouse sign, the floodlights, the mast, the camp windows, the
// pickup's headlights), a pumpjack keeps nodding in the foreground, stars come out, a shooting star crosses, and the
// crew waves goodnight. Click or press a key to end it early.
//
// Loaded on demand (see SunsetLoader) and removed when it finishes. Everything it needs, styles included, is in
// this file, so none of it weighs on the rest of the app. Plain SVG and CSS: no canvas, no filters, no timers.
const TOTAL = 16000 // ms the scene stays on screen
const LOGO = '/branding/seros-logo.png'

const CSS = `
.ss-root { position: fixed; inset: 0; z-index: 96; overflow: hidden; cursor: pointer; background: #050a1f; animation: ss-in 1s ease-out both, ss-out 1s ease-in ${TOTAL - 1000}ms forwards; }
.ss-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
@keyframes ss-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ss-out { to { opacity: 0; } }
.ss-dusk { opacity: 0; animation: ss-fade 5.5s ease-in-out 2s forwards; }
.ss-night { opacity: 0; animation: ss-fade 5.5s ease-in-out 7s forwards; }
.ss-teal { opacity: 0; animation: ss-fade 4s ease-in-out 9s forwards; }
@keyframes ss-fade { to { opacity: 1; } }
.ss-haze { animation: ss-haze 9s ease-in-out 1s forwards; }
@keyframes ss-haze { to { opacity: 0; } }
.ss-sun { animation: ss-set 9s cubic-bezier(.45,.05,.55,.95) 1s forwards; }
@keyframes ss-set { to { transform: translateY(340px); } }
.ss-sun-core { animation: ss-sun-colour 9s linear 1s forwards; }
@keyframes ss-sun-colour { 0% { fill: #ffe9a0; } 50% { fill: #ffa63d; } 100% { fill: #ff5a2e; } }
.ss-glow { animation: ss-glow-out 9s linear 1s forwards; }
@keyframes ss-glow-out { 0% { opacity: .95; } 75% { opacity: .7; } 100% { opacity: 0; } }
.ss-rays { transform-box: fill-box; transform-origin: 50% 100%; animation: ss-rays 9s linear 1s forwards; }
@keyframes ss-rays { 0% { opacity: .5; } 100% { opacity: 0; } }
.ss-far { color: #8d6b9b; animation: ss-far 9s ease-in-out 1s forwards; }
.ss-mid { color: #5b4678; animation: ss-mid 9s ease-in-out 1s forwards; }
.ss-near { color: #2c2150; animation: ss-near 9s ease-in-out 1s forwards; }
.ss-ground { color: #1d1440; animation: ss-ground 9s ease-in-out 1s forwards; }
@keyframes ss-far { to { color: #1a2650; } }
@keyframes ss-mid { to { color: #101a3f; } }
@keyframes ss-near { to { color: #0a1230; } }
@keyframes ss-ground { to { color: #060a1b; } }
.ss-rig { color: #35295a; animation: ss-rig 9.5s ease-in-out 1s forwards; }
@keyframes ss-rig { to { color: #04070f; } }
.ss-light { opacity: 0; animation: ss-on .7s ease-out forwards; }
@keyframes ss-on { from { opacity: 0; } to { opacity: 1; } }
.ss-flood { opacity: 0; animation: ss-flood 2.2s ease-out forwards; }
@keyframes ss-flood { to { opacity: 1; } }
.ss-beacon { animation: ss-blink 1.2s steps(1) 9.5s infinite; }
@keyframes ss-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: .15; } }
.ss-star { opacity: 0; transform-box: fill-box; transform-origin: center; animation: ss-star-in 1.4s ease-out forwards, ss-twinkle 3s ease-in-out infinite alternate; }
@keyframes ss-star-in { to { opacity: .95; } }
@keyframes ss-twinkle { from { transform: scale(1); } to { transform: scale(.55); } }
.ss-moon { opacity: 0; transform: translateY(46px); animation: ss-moon 3.2s ease-out 9s forwards; }
@keyframes ss-moon { to { opacity: 1; transform: translateY(0); } }
.ss-shoot { opacity: 0; animation: ss-shoot 1.3s ease-in 12s forwards; }
@keyframes ss-shoot { 0% { opacity: 0; transform: translate(0, 0); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(-420px, 190px); } }
.ss-wave { transform-box: fill-box; transform-origin: 50% 0%; animation: ss-wave .6s ease-in-out infinite alternate; }
@keyframes ss-wave { from { transform: rotate(-155deg); } to { transform: rotate(-95deg); } }
.ss-bird { animation: ss-fly 10s linear forwards; }
@keyframes ss-fly { from { transform: translate(-120px, 0); } to { transform: translate(1750px, -70px); } }
.ss-flap { transform-box: fill-box; transform-origin: 50% 100%; animation: ss-flap .5s ease-in-out infinite alternate; }
@keyframes ss-flap { from { transform: scaleY(1); } to { transform: scaleY(.35); } }
.ss-cloud { animation: ss-drift 18s linear forwards; }
.ss-cloud-day { animation: ss-cloud-out 4s ease-in-out 7s forwards; }
.ss-cloud-night { opacity: 0; animation: ss-cloud-in 4s ease-in-out 8s forwards; }
@keyframes ss-cloud-out { to { opacity: 0; } }
@keyframes ss-cloud-in { to { opacity: 1; } }
@keyframes ss-drift { from { transform: translateX(0); } to { transform: translateX(190px); } }
.ss-puff { transform-box: fill-box; transform-origin: center; animation: ss-puff 3.2s ease-out infinite; }
@keyframes ss-puff { 0% { opacity: .55; transform: translate(0, 0) scale(.5); } 100% { opacity: 0; transform: translate(8px, -26px) scale(2.2); } }
.ss-rim { color: #ffb066; opacity: .9; animation: ss-rim 9s linear 1s forwards; }
@keyframes ss-rim { 0% { opacity: .95; } 70% { opacity: .55; } 100% { opacity: 0; } }
.ss-nod { transform-origin: 0 0; animation: ss-nod 4.4s ease-in-out infinite alternate; }
@keyframes ss-nod { from { transform: rotate(-9deg); } to { transform: rotate(8deg); } }
.ss-crank { transform-origin: 0 0; animation: ss-crank 8.8s linear infinite; }
@keyframes ss-crank { to { transform: rotate(360deg); } }
.ss-flare { transform-box: fill-box; transform-origin: 50% 100%; animation: ss-flicker .4s ease-in-out infinite alternate; }
@keyframes ss-flicker { from { transform: scaleY(.85) scaleX(1); } to { transform: scaleY(1.2) scaleX(.85); } }
.ss-card-wrap { position: absolute; left: 0; right: 0; bottom: 44px; display: flex; justify-content: center; padding: 0 16px; pointer-events: none; }
.ss-card { opacity: 0; display: flex; align-items: center; gap: 16px; max-width: 640px; border-radius: 20px; background: rgba(255,255,255,.96); padding: 14px 24px 14px 20px; box-shadow: 0 24px 50px rgba(0,0,0,.45), 0 0 0 1px rgba(61,189,176,.45); animation: ss-card 1.3s ease-out 10.2s forwards; }
@keyframes ss-card { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.ss-card img { height: 30px; width: auto; flex: none; }
.ss-card-rule { width: 2px; align-self: stretch; background: linear-gradient(#3dbdb0, #1a3f7a); border-radius: 2px; flex: none; }
.ss-card p { margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f2650; line-height: 1.3; }
.ss-card-title { font-size: 18px; font-weight: 800; letter-spacing: -.01em; }
.ss-card-sub { font-size: 14px; font-weight: 600; color: #1a3f7a; opacity: .75; }
@media (prefers-reduced-motion: reduce) {
  .ss-root, .ss-dusk, .ss-night, .ss-teal, .ss-haze, .ss-sun, .ss-sun-core, .ss-glow, .ss-rays, .ss-far, .ss-mid, .ss-near, .ss-ground, .ss-rig,
  .ss-light, .ss-flood, .ss-beacon, .ss-star, .ss-moon, .ss-shoot, .ss-wave, .ss-bird, .ss-flap, .ss-cloud, .ss-cloud-day, .ss-cloud-night, .ss-puff, .ss-flare, .ss-card { animation: none !important; }
  .ss-dusk, .ss-night, .ss-teal, .ss-light, .ss-flood, .ss-star, .ss-moon, .ss-card, .ss-cloud-night { opacity: 1; transform: none; }
  .ss-rim { opacity: 0; }
  .ss-rim, .ss-nod, .ss-crank { animation: none !important; }
  .ss-sun, .ss-glow, .ss-rays, .ss-haze, .ss-shoot, .ss-bird, .ss-puff, .ss-cloud-day { opacity: 0; }
  .ss-far { color: #1a2650; } .ss-mid { color: #101a3f; } .ss-near { color: #0a1230; } .ss-ground { color: #060a1b; } .ss-rig { color: #04070f; }
}
`

// a small seeded generator, so the stars, ridges and grass are the same every time and nothing here depends on Math.random
function rng(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// A rolling ridge line as one smooth closed path, plus a way to ask how high it is at a given x (to stand trees on it).
function ridge(seed, base, amp, step = 40) {
  const r = rng(seed)
  const pts = []
  for (let x = -60; x <= 1660; x += step) {
    pts.push([x, base + amp * (0.55 * Math.sin(x / 230 + seed) + 0.3 * Math.sin(x / 97 + seed * 2) + (r() - 0.5) * 0.4)])
  }
  let d = `M${pts[0][0]},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i++) {
    d += ` Q${pts[i][0]},${pts[i][1].toFixed(1)} ${((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1)},${((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1)}`
  }
  d += ' L1660,900 L-60,900 Z'
  const at = (x) => {
    const i = Math.max(0, Math.min(pts.length - 2, Math.floor((x + 60) / step)))
    const t = (x - pts[i][0]) / step
    return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t
  }
  return { d, at }
}
const FAR = ridge(11, 592, 40)
const MID = ridge(23, 650, 30)
const NEAR = ridge(37, 698, 22)
const GROUND = ridge(41, 738, 7, 60)

// A flat-topped acacia, the tree of dry country: a few bent limbs and a layered canopy.
function Acacia({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="currentColor" stroke="currentColor">
      <path d="M-1.4,1 Q-1,-14 -6,-25 M1.4,1 Q1,-12 6,-22 M-.4,-12 Q2.5,-21 0,-28" fill="none" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="0" cy="-31" rx="24" ry="5.2" stroke="none" /><ellipse cx="-15" cy="-27.6" rx="13" ry="4" stroke="none" /><ellipse cx="16" cy="-27" rx="13" ry="4" stroke="none" />
      <ellipse cx="-4" cy="-35" rx="13" ry="3.6" stroke="none" />
    </g>
  )
}

// A person, feet at (0, 0), about 36 high: hard hat with a brim, shoulders, tapered torso, arms and legs with boots.
const PERSON_BODY = (
  <>
    <path d="M-4.3,-30.4 a4.3,4.3 0 0 1 8.6,0 z" stroke="none" />
    <rect x="-5.5" y="-30.9" width="11" height="1.2" rx=".6" stroke="none" />
    <circle cx="0" cy="-29" r="3.2" stroke="none" />
    <rect x="-1.4" y="-26.2" width="2.8" height="2.2" stroke="none" />
    <path d="M-5.9,-24.6 Q0,-27.2 5.9,-24.6 L5.1,-12 L-5.1,-12 Z" stroke="none" />
    <path d="M-4.9,-12.4 L-.4,-12.4 L-1,-1.8 L-4.1,-1.8 Z M.4,-12.4 L4.9,-12.4 L4.1,-1.8 L1,-1.8 Z" stroke="none" />
    <rect x="-4.9" y="-2" width="4.2" height="2" rx=".8" stroke="none" /><rect x=".6" y="-2" width="4.2" height="2" rx=".8" stroke="none" />
    <path d="M-5.6,-24 L-7,-12.6" fill="none" strokeWidth="2.8" strokeLinecap="round" />
  </>
)

// A pickup truck, feet on the ground at (0, 0), facing right.
const PICKUP = 'M-42,-9 L-42,-19 Q-42,-22 -39,-22 L-13,-22 L-10.6,-31 Q-9.6,-34 -6,-34.4 L8,-34.4 Q12,-34.4 14,-31.6 L22,-22.6 L35,-21 Q40.4,-20.4 41.4,-15 L42,-9 Z'

// The rig, in its own units: the ground at y = 0, up is negative, the mast on x = -40. One shape, drawn twice (a dark copy
// and a thin sunlit copy just behind it), so the last sun catches the left edge of everything.
const MX = -40
const BASEY = -80
const TOPY = -440
const leg = (side, y) => {
  const t = (BASEY - y) / (BASEY - TOPY)
  return side < 0 ? MX - 22 + 15 * t : MX + 22 - 15 * t
}
const RUNGS = Array.from({ length: 24 }, (_, i) => BASEY - 6 - i * 15)
const TOWERS = [{ x: 100, h: 160 }, { x: -210, h: 130 }, { x: 420, h: 132 }]
const MAST_LAMPS = [-130, -180, -230, -280, -330, -380, -420]

function RigShape() {
  return (
    <g id="ss-rigshape" fill="currentColor" stroke="currentColor">
      {/* guy lines */}
      <g strokeWidth=".7" strokeOpacity=".7" fill="none"><line x1={MX} y1="-436" x2="-390" y2="0" /><line x1={MX} y1="-436" x2="300" y2="0" /><line x1={MX} y1="-330" x2="-250" y2="0" /><line x1={MX} y1="-330" x2="180" y2="0" /></g>

      {/* substructure: deck, posts and cross braces */}
      <rect x="-146" y="-80" width="212" height="10" stroke="none" /><rect x="-142" y="-70" width="204" height="4" stroke="none" />
      <g strokeWidth="4.2">{[-136, -88, -40, 8, 56].map((x) => <line key={x} x1={x} y1="-68" x2={x} y2="0" />)}</g>
      <g strokeWidth="1.8" fill="none">{[-136, -88, -40, 8].map((x) => <g key={x}><line x1={x} y1="-66" x2={x + 48} y2="-2" /><line x1={x + 48} y1="-66" x2={x} y2="-2" /></g>)}</g>
      <rect x="-140" y="-6" width="204" height="6" stroke="none" />

      {/* the mast: tapering legs, rungs and zig-zag bracing, racked stands of pipe inside it, the monkey board, crown block */}
      <g fill="none" strokeLinecap="round">
        <line x1={leg(-1, BASEY)} y1={BASEY} x2={leg(-1, TOPY)} y2={TOPY} strokeWidth="4" /><line x1={leg(1, BASEY)} y1={BASEY} x2={leg(1, TOPY)} y2={TOPY} strokeWidth="4" />
        {RUNGS.map((y, i) => (
          <g key={y} strokeWidth="1.4">
            <line x1={leg(-1, y)} y1={y} x2={leg(1, y)} y2={y} />
            <line x1={i % 2 ? leg(-1, y) : leg(1, y)} y1={y} x2={i % 2 ? leg(1, y - 15) : leg(-1, y - 15)} y2={y - 15} />
          </g>
        ))}
        <g strokeWidth="2.2" strokeOpacity=".9">{[-50, -45, -40, -35, -30].map((x) => <line key={x} x1={x} y1="-296" x2={x + (x + 40) * 0.1} y2="-84" />)}</g>
        <g strokeWidth=".9" strokeOpacity=".85"><line x1="-46" y1="-446" x2="-46" y2="-250" /><line x1="-34" y1="-446" x2="-34" y2="-250" /><line x1="-42" y1="-446" x2="-42" y2="-250" /><line x1="-38" y1="-446" x2="-38" y2="-250" /></g>
      </g>
      <rect x="-48" y="-252" width="16" height="26" rx="2" stroke="none" /><path d="M-40,-226 v8" fill="none" strokeWidth="2.2" /><circle cx="-40" cy="-215" r="3.4" fill="none" strokeWidth="1.6" />
      <rect x="-37" y="-304" width="44" height="5" rx="1" stroke="none" />
      <g fill="none" strokeWidth="1.1"><line x1="-37" y1="-318" x2="7" y2="-318" /><line x1="7" y1="-318" x2="7" y2="-304" /><line x1="-37" y1="-318" x2="-37" y2="-304" /><line x1="-15" y1="-318" x2="-15" y2="-304" /></g>
      <rect x="-56" y="-456" width="32" height="14" rx="1.5" stroke="none" /><g stroke="none">{[-50, -43, -36, -29].map((x) => <circle key={x} cx={x} cy="-459" r="3.4" />)}</g>
      <line x1={MX} y1="-456" x2={MX} y2="-478" strokeWidth="1.6" />

      {/* doghouse, with the roof unit; the sign plate itself is added later in its own colours */}
      <rect x="24" y="-118" width="64" height="38" stroke="none" /><path d="M19,-118 L93,-118 L90,-123 L22,-123 Z" stroke="none" /><rect x="60" y="-131" width="18" height="8" rx="1" stroke="none" />
      <rect x="8" y="-100" width="16" height="20" stroke="none" />
      {/* floor rail, and the people's handrail posts */}
      <g fill="none" strokeWidth="1.2"><line x1="-146" y1="-103" x2="16" y2="-103" />{[-146, -128, -110, -92, -74, -56, -38, -20, -2, 16].map((x) => <line key={x} x1={x} y1="-80" x2={x} y2="-103" />)}</g>

      {/* the V-door ramp with its rail, and the pipe rack beside it */}
      <line x1="-146" y1="-76" x2="-338" y2="-6" strokeWidth="9" stroke="currentColor" />
      <g fill="none" strokeWidth="1.5"><line x1="-146" y1="-100" x2="-322" y2="-34" />{[-176, -208, -240, -272, -304].map((x, i) => <line key={x} x1={x} y1={-88 + i * 11.3} x2={x} y2={-64 + i * 11.3} strokeWidth=".9" />)}</g>
      <g stroke="none">
        {[-478, -432, -386].map((x) => <rect key={x} x={x} y="-34" width="4" height="34" />)}
        {[0, 1, 2].map((r) => <rect key={r} x="-486" y={-12 - r * 9.5} width="116" height="8.6" rx="4.3" />)}
        <rect x="-476" y="-44" width="90" height="8.6" rx="4.3" />
      </g>

      {/* the engine house with its stacks, the two mud tanks with walkways and the shaker, the fuel tank, the water tower, the flare */}
      <rect x="100" y="-52" width="106" height="52" stroke="none" /><path d="M96,-52 L210,-52 L206,-58 L100,-58 Z" stroke="none" />
      <g stroke="none">{[114, 134, 154, 174].map((x) => <g key={x}><rect x={x} y="-92" width="5.4" height="36" /><rect x={x - 2.6} y="-98" width="10.6" height="7" rx="1.5" /></g>)}</g>
      <rect x="216" y="-42" width="108" height="42" stroke="none" /><rect x="328" y="-34" width="90" height="34" stroke="none" />
      <g fill="none" strokeWidth="1.1"><line x1="216" y1="-56" x2="418" y2="-56" /><line x1="216" y1="-56" x2="216" y2="-42" /><line x1="324" y1="-56" x2="324" y2="-42" />{[240, 264, 288, 312, 346, 372, 398].map((x) => <line key={x} x1={x} y1="-56" x2={x} y2={x < 330 ? -42 : -34} />)}<line x1="418" y1="-56" x2="418" y2="-34" /></g>
      <rect x="236" y="-66" width="46" height="24" stroke="none" /><rect x="244" y="-76" width="8" height="10" stroke="none" />
      <g strokeWidth="1.4" fill="none"><line x1="324" y1="-30" x2="336" y2="-6" /><line x1="324" y1="-20" x2="336" y2="-6" /></g>
      <rect x="452" y="-112" width="42" height="40" rx="11" stroke="none" />
      <g strokeWidth="2.4" fill="none"><line x1="458" y1="-74" x2="452" y2="0" /><line x1="488" y1="-74" x2="494" y2="0" /><line x1="456" y1="-50" x2="490" y2="-24" strokeWidth="1" /><line x1="490" y1="-50" x2="456" y2="-24" strokeWidth="1" /></g>
      <line x1="520" y1="0" x2="520" y2="-132" strokeWidth="3.2" /><g strokeWidth=".7" strokeOpacity=".7" fill="none"><line x1="520" y1="-120" x2="474" y2="0" /><line x1="520" y1="-120" x2="572" y2="0" /></g>

      {/* light towers */}
      {TOWERS.map((t) => (
        <g key={t.x} fill="none">
          <line x1={t.x - 5} y1="0" x2={t.x - 1.6} y2={-t.h} strokeWidth="2.4" /><line x1={t.x + 5} y1="0" x2={t.x + 1.6} y2={-t.h} strokeWidth="2.4" />
          {[0.2, 0.4, 0.6, 0.8].map((k) => <line key={k} x1={t.x - 5 + 3.4 * k} y1={-t.h * k} x2={t.x + 5 - 3.4 * k} y2={-t.h * k - 10} strokeWidth="1" />)}
          <rect x={t.x - 13} y={-t.h - 6} width="26" height="6" rx="1" fill="currentColor" stroke="none" />
        </g>
      ))}

      {/* crew: three on the drill floor (one waves), two by the ramp's foot, one on the tank walkway; stances differ a little */}
      <use href="#ss-person" x="-124" y="-80" /><use href="#ss-person" x="-60" y="-80" />
      <use href="#ss-person" x="-300" y="-7" /><use href="#ss-person" x="-279" y="-3" />
      <use href="#ss-person" x="278" y="-56" />
    </g>
  )
}

export default function SunsetScene({ name, onDone }) {
  const lite = useMemo(() => lowPowerDevice(), [])

  useEffect(() => {
    const finish = setTimeout(onDone, TOTAL)
    const key = () => onDone()
    window.addEventListener('keydown', key)
    return () => {
      clearTimeout(finish)
      window.removeEventListener('keydown', key)
    }
  }, [onDone])

  const stars = useMemo(() => {
    const r = rng(20261015)
    return Array.from({ length: lite ? 40 : 110 }, () => ({
      x: r() * 1600, y: r() * 520, r: 0.7 + r() * 1.8, delay: 8500 + r() * 3600, tw: r() * 3000,
    }))
  }, [lite])
  const grass = useMemo(() => {
    const r = rng(77)
    const n = lite ? 34 : 90
    return Array.from({ length: n }, (_, i) => {
      const x = (i / n) * 1700 - 40 + r() * 22
      const h = 22 + r() * 54
      const lean = r() * 18 - 9
      return `M${x.toFixed(1)},905 Q${(x + lean * 0.2).toFixed(1)},${(905 - h * 0.6).toFixed(1)} ${(x + lean).toFixed(1)},${(905 - h).toFixed(1)}`
    })
  }, [lite])
  const mastLights = MAST_LAMPS.map((y, i) => ({ y, delay: 6600 + i * 480 }))

  return (
    <div className="ss-root" onClick={onDone} role="presentation">
      <style>{CSS}</style>
      <svg className="ss-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="ss-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#35649f" /><stop offset="30%" stopColor="#6f8fc4" /><stop offset="52%" stopColor="#b9b3c8" /><stop offset="68%" stopColor="#f2b27c" /><stop offset="86%" stopColor="#fbcf90" /><stop offset="100%" stopColor="#fde4b0" />
          </linearGradient>
          <linearGradient id="ss-dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f1a5c" /><stop offset="30%" stopColor="#5a3a8c" /><stop offset="55%" stopColor="#b2528f" /><stop offset="72%" stopColor="#e67a7a" /><stop offset="88%" stopColor="#f7a066" /><stop offset="100%" stopColor="#f9c681" />
          </linearGradient>
          <linearGradient id="ss-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#02040f" /><stop offset="50%" stopColor="#071230" /><stop offset="82%" stopColor="#10244f" /><stop offset="100%" stopColor="#1a3f7a" />
          </linearGradient>
          <linearGradient id="ss-tealband" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3dbdb0" stopOpacity="0" /><stop offset="100%" stopColor="#3dbdb0" stopOpacity=".5" />
          </linearGradient>
          <linearGradient id="ss-hazeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0" /><stop offset="100%" stopColor="#ffd9a0" stopOpacity=".6" />
          </linearGradient>
          <linearGradient id="ss-sk-day" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffd9b0" stopOpacity="0" /><stop offset="35%" stopColor="#ffe2c0" stopOpacity=".7" /><stop offset="70%" stopColor="#f7b0a0" stopOpacity=".55" /><stop offset="100%" stopColor="#d98aa0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ss-sk-night" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6a7fb8" stopOpacity="0" /><stop offset="40%" stopColor="#6a7fb8" stopOpacity=".34" /><stop offset="100%" stopColor="#3a4a86" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ss-sunglow"><stop offset="0%" stopColor="#ffd27a" stopOpacity=".9" /><stop offset="40%" stopColor="#ff9d5c" stopOpacity=".32" /><stop offset="100%" stopColor="#ff8a4c" stopOpacity="0" /></radialGradient>
          <radialGradient id="ss-lamp"><stop offset="0%" stopColor="#ffe6a0" stopOpacity=".95" /><stop offset="100%" stopColor="#ffe6a0" stopOpacity="0" /></radialGradient>
          <radialGradient id="ss-pool"><stop offset="0%" stopColor="#ffe9b0" stopOpacity=".55" /><stop offset="100%" stopColor="#ffe9b0" stopOpacity="0" /></radialGradient>
          <linearGradient id="ss-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffeab0" stopOpacity=".55" /><stop offset="100%" stopColor="#ffeab0" stopOpacity="0" /></linearGradient>
          <linearGradient id="ss-lens" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ffd69a" stopOpacity="0" /><stop offset="50%" stopColor="#ffe6b8" stopOpacity=".55" /><stop offset="100%" stopColor="#ffd69a" stopOpacity="0" /></linearGradient>
          <linearGradient id="ss-groundlit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d98a6a" stopOpacity=".5" /><stop offset="100%" stopColor="#d98a6a" stopOpacity="0" /></linearGradient>
          <radialGradient id="ss-vig" cx="50%" cy="48%" r="75%"><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".55" /></radialGradient>
          <g id="ss-person" fill="currentColor" stroke="currentColor">{PERSON_BODY}<path d="M5.6,-24 L7,-12.6" fill="none" strokeWidth="2.8" strokeLinecap="round" /></g>
          <g id="ss-person-w" fill="currentColor" stroke="currentColor">{PERSON_BODY}</g>
          <RigShape />
        </defs>

        {/* sky: gold, then dusk, then night, cross-fading; a teal glow gathers on the horizon at the end */}
        <rect width="1600" height="900" fill="url(#ss-day)" />
        <rect className="ss-dusk" width="1600" height="900" fill="url(#ss-dusk)" />
        <rect className="ss-night" width="1600" height="900" fill="url(#ss-night)" />
        <rect className="ss-teal" y="430" width="1600" height="300" fill="url(#ss-tealband)" />

        {/* stars, a shooting star, the moon */}
        <g fill="#fffbe8">
          {stars.map((s, i) => (
            <circle key={i} className="ss-star" cx={s.x} cy={s.y} r={s.r}
              style={{ animationDelay: `${s.delay}ms, ${s.delay + 1400 + s.tw}ms`, ...(lite ? { animationName: 'ss-star-in' } : null) }} />
          ))}
        </g>
        <g className="ss-shoot"><line x1="1220" y1="90" x2="1290" y2="68" stroke="#fffbe8" strokeWidth="2.4" strokeLinecap="round" /><line x1="1290" y1="68" x2="1340" y2="52" stroke="#fffbe8" strokeOpacity=".25" strokeWidth="1.5" strokeLinecap="round" /></g>
        <g className="ss-moon">
          <circle cx="1210" cy="170" r="92" fill="url(#ss-lamp)" />
          <circle cx="1210" cy="170" r="34" fill="#f6f2dc" />
          <g fill="#d9d4b8" fillOpacity=".7"><circle cx="1199" cy="160" r="6" /><circle cx="1220" cy="182" r="4.5" /><circle cx="1217" cy="156" r="3" /><circle cx="1204" cy="178" r="2.6" /></g>
        </g>

        {/* long streaks of high cloud: warm and rose-lit while the sun is up, then the same shapes in moonlit blue */}
        <g className="ss-cloud">
          <g className="ss-cloud-day">
            {[[300, 210, 330, 9], [880, 168, 430, 11], [1250, 262, 300, 8], [640, 330, 380, 7], [110, 340, 260, 6], [1390, 150, 270, 7], [560, 120, 240, 5]].map(([x, y, rx, ry], i) => (
              <g key={i} fill="url(#ss-sk-day)"><ellipse cx={x} cy={y} rx={rx} ry={ry} /><ellipse cx={x + rx * 0.15} cy={y + ry * 1.6} rx={rx * 0.7} ry={ry * 0.45} /><ellipse cx={x - rx * 0.2} cy={y - ry * 1.5} rx={rx * 0.5} ry={ry * 0.35} /></g>
            ))}
          </g>
          <g className="ss-cloud-night">
            {[[300, 210, 330, 9], [880, 168, 430, 11], [1250, 262, 300, 8], [640, 330, 380, 7], [110, 340, 260, 6], [1390, 150, 270, 7], [560, 120, 240, 5]].map(([x, y, rx, ry], i) => (
              <g key={i} fill="url(#ss-sk-night)"><ellipse cx={x} cy={y} rx={rx} ry={ry} /><ellipse cx={x + rx * 0.15} cy={y + ry * 1.6} rx={rx * 0.7} ry={ry * 0.45} /></g>
            ))}
          </g>
        </g>

        {/* birds going home: small gulls with a body and bent wings */}
        <g fill="#2a1d4a">
          {[[0, 330, 0], [60, 300, 300], [-40, 362, 600], [110, 342, 900], [-90, 318, 1300]].map(([dx, y, d], i) => (
            <g key={i} className="ss-bird" style={{ animationDelay: `${600 + d}ms`, opacity: 0.8 }} transform={`translate(${dx} ${y})`}>
              <g className="ss-flap" style={{ animationDelay: `${d}ms` }}>
                <path d="M0,0 C4,-6 9,-8 14,-2.4 C19,-8 24,-6 28,0 C23,-3.4 18,-3.6 14,0.6 C10,-3.4 5,-3.4 0,0 Z" />
              </g>
            </g>
          ))}
        </g>

        {/* the sun, going down behind the ridges, with its rays and a thin lens streak across the horizon */}
        <g className="ss-sun">
          <g className="ss-rays" fill="#ffe2a0" fillOpacity=".11">
            <polygon points="470,470 150,-60 330,-60" /><polygon points="470,470 520,-60 700,-60" /><polygon points="470,470 880,-60 1060,-60" />
          </g>
          <circle className="ss-glow" cx="470" cy="470" r="300" fill="url(#ss-sunglow)" />
          <circle className="ss-sun-core" cx="470" cy="470" r="62" fill="#ffe9a0" />
          <ellipse className="ss-glow" cx="470" cy="470" rx="900" ry="9" fill="url(#ss-lens)" />
        </g>

        {/* ridges, each fading into the haze in front of the one behind it; far-off rigs on the farthest, acacia and a camp on the next */}
        <g className="ss-far" fill="currentColor">
          <path d={FAR.d} />
          {[[190, 1], [1340, 0.8]].map(([x, s]) => (
            <g key={x} transform={`translate(${x} ${FAR.at(x) + 2}) scale(${s})`}><path d="M-9,0 L-1,-52 L1,-52 L9,0 L5,0 L0,-40 L-5,0 Z" /><rect x="-12" y="-4" width="24" height="5" /><circle className="ss-beacon" cx="0" cy="-54" r="1.8" fill="#ff5a4f" /></g>
          ))}
        </g>
        <rect className="ss-haze" y="540" width="1600" height="130" fill="url(#ss-hazeg)" />
        <g className="ss-mid" fill="currentColor">
          <path d={MID.d} />
          {[[120, 0.8], [330, 0.6], [1500, 0.85], [760, 0.5]].map(([x, s]) => <Acacia key={x} x={x} y={MID.at(x) + 2} s={s} />)}
          <g>{[1240, 1282, 1324, 1366].map((x) => <rect key={x} x={x} y={MID.at(x) - 13} width="30" height="14" rx="1.5" />)}</g>
        </g>
        <g className="ss-light" style={{ animationDelay: '7400ms' }}>
          {[1250, 1292, 1334, 1376].map((x) => <rect key={x} x={x} y={MID.at(x) - 9} width="7" height="4.4" fill="#ffd36a" />)}
          {[1250, 1334].map((x) => <circle key={x} cx={x + 3.5} cy={MID.at(x) - 7} r="14" fill="url(#ss-lamp)" />)}
        </g>
        <g className="ss-near" fill="currentColor">
          <path d={NEAR.d} />
          {[[560, 1.15], [1010, 0.95], [1460, 1.2]].map(([x, s]) => <Acacia key={x} x={x} y={NEAR.at(x) + 3} s={s} />)}
        </g>
        <g className="ss-ground" fill="currentColor"><path d={GROUND.d} /></g>
        <g className="ss-haze">
          <rect y="730" width="1600" height="170" fill="url(#ss-groundlit)" />
          <path d="M650,900 L1010,900 L946,758 L918,758 Z" fill="#f0b27a" fillOpacity=".2" />
          <path d="M770,900 L880,900 L934,758 L926,758 Z" fill="#ffd9a8" fillOpacity=".12" />
        </g>

        {/* the rig stands on the ground plane: a long shadow, a sunlit left edge, then the dark silhouette */}
        <g transform="translate(900 762) scale(1.25)">
          <path className="ss-haze" d="M-62,0 L-18,0 L520,20 L470,10 Z" fill="#000" fillOpacity=".28" />
          <use href="#ss-rigshape" className="ss-rim" transform="translate(-1.7 -0.5)" />
          <use href="#ss-rigshape" className="ss-rig" />
          {/* the person who waves: a copy of the figure with the arm raised, standing at the front of the drill floor */}
          <g className="ss-rig"><use href="#ss-person-w" x="-86" y="-80" /><g transform="translate(-80.4 -104.6)"><rect className="ss-wave" x="-1.4" y="0" width="2.8" height="12" rx="1.4" fill="currentColor" /></g></g>
          {/* the pickup, a hat for the pipe stack, and a pumpjack's cousin: the truck itself parked at the left */}
          <g className="ss-rig" transform="translate(-560 6)"><path d={PICKUP} /><circle cx="-26" cy="-7.5" r="7.6" /><circle cx="24" cy="-7.5" r="7.6" /></g>

          {/* things that keep their own colours: the sign plate with the Seros logo, and the lights */}
          <rect x="29" y="-111" width="54" height="25" rx="2.4" fill="#f4f8fd" fillOpacity=".95" />
          <image href={LOGO} x="33" y="-108" width="46" height="19" preserveAspectRatio="xMidYMid meet" />
          <g className="ss-light" style={{ animationDelay: '6000ms' }}>
            <rect x="29" y="-86" width="54" height="2" fill="#3dbdb0" /><rect x="24" y="-90" width="64" height="10" fill="#3dbdb0" fillOpacity=".16" />
            <rect x="12" y="-93" width="6" height="8" fill="#ffd36a" fillOpacity=".9" /><circle cx="15" cy="-89" r="18" fill="url(#ss-lamp)" />
            <rect x="104" y="-42" width="6" height="6" fill="#ffd36a" /><rect x="190" y="-42" width="6" height="6" fill="#ffd36a" />
            <rect x="242" y="-58" width="6" height="5" fill="#ffd36a" /><rect x="262" y="-58" width="6" height="5" fill="#ffd36a" />
          </g>

          {/* the flare, far right: flame and its pool of light */}
          <g className="ss-light" style={{ animationDelay: '5200ms' }}>
            <path className="ss-flare" d="M520,-132 C512,-146 517,-158 520,-172 C524,-158 530,-146 520,-132 Z" fill="#ff9a2e" />
            <path className="ss-flare" d="M520,-132 C516,-141 518,-148 520,-155 C522,-148 525,-141 520,-132 Z" fill="#ffe08a" />
            <circle cx="520" cy="-146" r="46" fill="url(#ss-lamp)" fillOpacity=".55" /><ellipse cx="520" cy="0" rx="70" ry="10" fill="url(#ss-pool)" />
          </g>

          {/* floodlight cones and the pools they leave on the ground */}
          <g className="ss-flood" style={{ animationDelay: '6000ms' }}>
            {TOWERS.map((t) => (
              <g key={t.x}>
                <polygon points={`${t.x},${-t.h - 3} ${t.x - 62},0 ${t.x + 62},0`} fill="url(#ss-cone)" />
                <circle cx={t.x} cy={-t.h - 3} r="11" fill="url(#ss-lamp)" />
                <ellipse cx={t.x} cy="0" rx="64" ry="9" fill="url(#ss-pool)" />
              </g>
            ))}
          </g>
          {mastLights.map((l) => (
            <g key={l.y} className="ss-light" style={{ animationDelay: `${l.delay}ms` }}>
              <circle cx={MX} cy={l.y} r="9" fill="url(#ss-lamp)" /><circle cx={MX} cy={l.y} r="1.8" fill="#fff1c4" />
            </g>
          ))}
          <g className="ss-light" style={{ animationDelay: '9800ms' }}>
            <circle className="ss-beacon" cx={MX} cy="-480" r="3.6" fill="#ff5a4f" /><circle cx={MX} cy="-480" r="12" fill="#ff5a4f" fillOpacity=".25" />
          </g>
          {/* the pickup's lights: headlights with a beam, tail light, a lit cab */}
          <g className="ss-light" style={{ animationDelay: '8000ms' }} transform="translate(-560 6)">
            <path d="M-12,-22 l3,-8 h9 v8 z" fill="#ffd36a" fillOpacity=".5" />
            <polygon points="41,-17 130,-4 130,-34" fill="url(#ss-cone)" fillOpacity=".95" />
            <circle cx="41" cy="-16" r="2.6" fill="#fff4cf" /><circle cx="41" cy="-16" r="12" fill="url(#ss-lamp)" />
            <circle cx="-41.4" cy="-17" r="1.6" fill="#ff4a3f" /><circle cx="-41.4" cy="-17" r="6" fill="#ff4a3f" fillOpacity=".25" />
          </g>
          {!lite && (
            <g fill="#bfa9d6">
              {[0, 1, 2].map((i) => <circle key={i} className="ss-puff" cx="156.3" cy="-98" r="3.4" style={{ animationDelay: `${i * 1000}ms` }} />)}
            </g>
          )}
        </g>

        {/* a pumpjack in the foreground, nodding all the while */}
        <g className="ss-ground" fill="currentColor" stroke="currentColor" transform="translate(250 842) scale(1.6)">
          <rect x="-40" y="-6" width="86" height="6" rx="1" stroke="none" />
          <path d="M-6,-6 L0,-52 L6,-6 Z" stroke="none" /><g strokeWidth="2" fill="none"><line x1="-14" y1="-6" x2="0" y2="-52" /><line x1="14" y1="-6" x2="0" y2="-52" /></g>
          <g transform="translate(0 -54)">
            <g className="ss-nod">
              <rect x="-46" y="-4" width="92" height="6" rx="2" stroke="none" />
              <path d="M-46,-6 Q-62,-6 -64,12 L-58,12 Q-56,2 -46,2 Z" stroke="none" />
              <g strokeWidth="1.4" fill="none"><line x1="-58" y1="10" x2="-58" y2="48" /></g>
              <rect x="30" y="-12" width="20" height="14" rx="2" stroke="none" />
            </g>
          </g>
          <g transform="translate(34 -22)"><circle r="12" fill="none" strokeWidth="4" /><g className="ss-crank"><rect x="-1.6" y="-16" width="3.2" height="16" stroke="none" /><circle cy="-16" r="4.6" stroke="none" /></g></g>
          <rect x="-61" y="42" width="6" height="14" stroke="none" />
        </g>

        {/* foreground: boulders, scrub and dry grass, to close the picture */}
        <g className="ss-ground" fill="currentColor">
          <path d="M-20,905 Q30,860 120,872 Q190,880 210,905 Z" /><path d="M1360,905 Q1420,850 1520,862 Q1600,872 1640,905 Z" /><path d="M900,905 Q925,880 975,886 Q1010,892 1020,905 Z" />
        </g>
        <g className="ss-ground" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {grass.map((d, i) => <path key={i} d={d} />)}
        </g>

        <rect width="1600" height="900" fill="url(#ss-vig)" />
      </svg>

      <div className="ss-card-wrap">
        <div className="ss-card" role="status">
          <img src={LOGO} alt="Seros" />
          <span className="ss-card-rule" />
          <div>
            <p className="ss-card-title">End of tour{name ? `, ${name}` : ''}.</p>
            <p className="ss-card-sub">See you on the next one.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
