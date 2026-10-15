import { useEffect, useMemo } from 'react'
import { lowPowerDevice } from '@/lib/perf'

// The sunset: a full-page scene played once, after the secret phrase is typed into the home search.
// A Seros land rig at the end of a tour. The sun goes down behind layered ridges, the sky runs from gold to dusk to
// the brand's navy night with a teal glow on the horizon, the lights come on one by one (the doghouse sign, the
// floodlights, the mast, the pickup's headlights), stars come out, a shooting star crosses, and the crew waves
// goodnight. Click or press a key to end it early.
//
// Loaded on demand (see SunsetLoader) and removed when it finishes. Everything it needs, styles included, is in
// this file, so none of it weighs on the rest of the app. Plain SVG and CSS: no canvas, no filters, no timers.
const TOTAL = 16000 // ms the scene stays on screen
const MAST_BASE = 190
const MAST_TOP = 28
const legX = (y) => ((MAST_BASE - y) / (MAST_BASE - MAST_TOP)) * 8
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
.ss-rig { color: #4d3f75; animation: ss-rig 9.5s ease-in-out 1s forwards; }
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
  .ss-sun, .ss-glow, .ss-rays, .ss-haze, .ss-shoot, .ss-bird, .ss-puff, .ss-cloud-day { opacity: 0; }
  .ss-far { color: #1a2650; } .ss-mid { color: #101a3f; } .ss-near { color: #0a1230; } .ss-ground { color: #060a1b; } .ss-rig { color: #04070f; }
}
`

// a small seeded generator, so the stars are the same every time and nothing here depends on Math.random
function rng(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// A crew member: hard hat, head, torso, legs, one arm down and one (for the wavers) swinging from the shoulder.
function Crew({ x, y, wave, delay = 0, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="currentColor" stroke="currentColor">
      <path d="M-3.6,-17.4 a3.6,3.6 0 0 1 7.2,0 z" />
      <rect x="-4.2" y="-17.6" width="8.4" height="1.1" rx=".5" stroke="none" />
      <circle cx="0" cy="-15" r="2.5" stroke="none" />
      <path d="M-3,-12.4 h6 l.5,8.2 h-7 z" stroke="none" />
      <line x1="-1.3" y1="-4.4" x2="-1.5" y2="0" strokeWidth="1.9" /><line x1="1.3" y1="-4.4" x2="1.5" y2="0" strokeWidth="1.9" />
      <line x1="-2.9" y1="-11.5" x2="-3.9" y2="-5.2" strokeWidth="1.6" />
      {wave ? (
        <g transform="translate(2.9 -11.5)">
          <rect className="ss-wave" x="-.85" y="0" width="1.7" height="7.8" rx=".85" stroke="none" style={{ animationDelay: `${delay}ms` }} />
        </g>
      ) : (
        <line x1="2.9" y1="-11.5" x2="3.9" y2="-5.2" strokeWidth="1.6" />
      )}
    </g>
  )
}

// A cumulus: a flat base with overlapping rounded puffs along the top, built from one path so it stays light.
const CLOUDS = [{ x: 150, y: 250, s: 1.1 }, { x: 900, y: 150, s: 1.3 }, { x: 520, y: 345, s: 0.8 }, { x: 1320, y: 300, s: 0.9 }]
function cloud(x, y, s) {
  const p = (dx, dy) => `${(x + dx * s).toFixed(1)},${(y + dy * s).toFixed(1)}`
  return [
    `M${p(0, 0)}`,
    `C${p(-8, -14)} ${p(14, -26)} ${p(30, -16)}`,
    `C${p(36, -38)} ${p(70, -40)} ${p(80, -20)}`,
    `C${p(100, -34)} ${p(130, -22)} ${p(124, -4)}`,
    `C${p(146, -2)} ${p(150, 14)} ${p(130, 16)}`,
    `L${p(10, 16)}`,
    `C${p(-14, 16)} ${p(-14, 0)} ${p(0, 0)} Z`,
  ].join(' ')
}

// A low scrub bush for the foreground
const bush = (x, y, w) => `M${x},${y} q${w * 0.1},${-w * 0.35} ${w * 0.3},${-w * 0.3} q${w * 0.1},${-w * 0.3} ${w * 0.35},${-w * 0.12} q${w * 0.25},${-w * 0.2} ${w * 0.35},${w * 0.42} z`

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
    return Array.from({ length: lite ? 26 : 60 }, (_, i) => {
      const x = (i / (lite ? 26 : 60)) * 1650 - 20 + r() * 20
      const h = 26 + r() * 46
      return `M${x},905 q${r() * 8 - 4},${-h * 0.55} ${r() * 14 - 7},${-h}`
    })
  }, [lite])
  const rungs = useMemo(() => Array.from({ length: 10 }, (_, i) => MAST_BASE - 8 - i * 16), [])
  const mastLights = [180, 160, 138, 116, 94, 72, 50].map((y, i) => ({ y, delay: 6600 + i * 500 }))

  return (
    <div className="ss-root" onClick={onDone} role="presentation">
      <style>{CSS}</style>
      <svg className="ss-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="ss-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f6fb5" /><stop offset="40%" stopColor="#8fa6cf" /><stop offset="70%" stopColor="#f1b878" /><stop offset="100%" stopColor="#fddca5" />
          </linearGradient>
          <linearGradient id="ss-dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c2268" /><stop offset="38%" stopColor="#8b4a93" /><stop offset="68%" stopColor="#e0708d" /><stop offset="88%" stopColor="#f59a63" /><stop offset="100%" stopColor="#f8c27c" />
          </linearGradient>
          <linearGradient id="ss-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#030615" /><stop offset="55%" stopColor="#0a1638" /><stop offset="85%" stopColor="#12275a" /><stop offset="100%" stopColor="#1a3f7a" />
          </linearGradient>
          <linearGradient id="ss-tealband" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3dbdb0" stopOpacity="0" /><stop offset="100%" stopColor="#3dbdb0" stopOpacity=".5" />
          </linearGradient>
          <linearGradient id="ss-hazeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd48a" stopOpacity="0" /><stop offset="100%" stopColor="#ffd48a" stopOpacity=".55" />
          </linearGradient>
          <radialGradient id="ss-sunglow"><stop offset="0%" stopColor="#ffd27a" stopOpacity=".9" /><stop offset="45%" stopColor="#ff9d5c" stopOpacity=".3" /><stop offset="100%" stopColor="#ff8a4c" stopOpacity="0" /></radialGradient>
          <radialGradient id="ss-lamp"><stop offset="0%" stopColor="#ffe6a0" stopOpacity=".95" /><stop offset="100%" stopColor="#ffe6a0" stopOpacity="0" /></radialGradient>
          <radialGradient id="ss-pool"><stop offset="0%" stopColor="#ffe9b0" stopOpacity=".55" /><stop offset="100%" stopColor="#ffe9b0" stopOpacity="0" /></radialGradient>
          <linearGradient id="ss-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffeab0" stopOpacity=".6" /><stop offset="100%" stopColor="#ffeab0" stopOpacity="0" /></linearGradient>
          <linearGradient id="ss-cloudg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff3da" stopOpacity=".92" /><stop offset="60%" stopColor="#f3b7a0" stopOpacity=".8" /><stop offset="100%" stopColor="#c47f9e" stopOpacity=".7" /></linearGradient>
          <linearGradient id="ss-cloudn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a6fae" stopOpacity=".85" /><stop offset="100%" stopColor="#1a2550" stopOpacity=".8" /></linearGradient>
          <radialGradient id="ss-vig" cx="50%" cy="48%" r="75%"><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".55" /></radialGradient>
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
          <circle cx="1210" cy="170" r="84" fill="url(#ss-lamp)" />
          <circle cx="1210" cy="170" r="34" fill="#f6f2dc" />
          <g fill="#d9d4b8" fillOpacity=".7"><circle cx="1199" cy="160" r="6" /><circle cx="1220" cy="182" r="4.5" /><circle cx="1217" cy="156" r="3" /></g>
        </g>

        {/* clouds: puffy, gold and rose while the sun is up, then the same shapes in moonlit blue-grey */}
        <g className="ss-cloud">
          <g className="ss-cloud-day" fill="url(#ss-cloudg)">{CLOUDS.map((c, i) => <path key={i} d={cloud(c.x, c.y, c.s)} />)}</g>
          <g className="ss-cloud-night" fill="url(#ss-cloudn)">{CLOUDS.map((c, i) => <path key={i} d={cloud(c.x, c.y, c.s)} />)}</g>
        </g>

        {/* birds going home */}
        <g fill="none" stroke="#2a1d4a" strokeWidth="2.4" strokeLinecap="round">
          {[[0, 330, 0], [60, 300, 300], [-40, 360, 600], [110, 340, 900]].map(([dx, y, d], i) => (
            <g key={i} className="ss-bird" style={{ animationDelay: `${600 + d}ms`, opacity: .8 }} transform={`translate(${dx} ${y})`}>
              <path className="ss-flap" d="M0,0 q9,-9 18,0 q9,-9 18,0" style={{ animationDelay: `${d}ms` }} />
            </g>
          ))}
        </g>

        {/* the sun, going down behind the ridges, with its rays */}
        <g className="ss-sun">
          <g className="ss-rays" fill="#ffe2a0" fillOpacity=".16">
            <polygon points="470,470 150,-60 330,-60" /><polygon points="470,470 520,-60 700,-60" /><polygon points="470,470 880,-60 1060,-60" />
          </g>
          <circle className="ss-glow" cx="470" cy="470" r="280" fill="url(#ss-sunglow)" />
          <circle className="ss-sun-core" cx="470" cy="470" r="62" fill="#ffe9a0" />
        </g>

        {/* three ridges, each fading into the haze behind it, and the ground */}
        <g className="ss-far" fill="currentColor"><path d="M0,590 Q150,520 330,575 T680,560 T1020,590 T1340,545 T1600,580 L1600,900 L0,900 Z" /></g>
        <rect className="ss-haze" y="540" width="1600" height="120" fill="url(#ss-hazeg)" />
        <g className="ss-mid" fill="currentColor"><path d="M0,640 Q220,585 430,630 T820,620 T1210,648 T1600,615 L1600,900 L0,900 Z" /></g>
        <g className="ss-near" fill="currentColor"><path d="M0,690 Q300,650 620,682 T1180,676 T1600,660 L1600,900 L0,900 Z" /></g>
        <g className="ss-ground" fill="currentColor"><path d="M0,728 Q400,700 800,722 T1600,712 L1600,900 L0,900 Z" /></g>

        {/* the rig: a silhouette that darkens as the light goes */}
        <g className="ss-rig" transform="translate(38 -14) scale(3)" stroke="currentColor" fill="currentColor">
          {/* guy lines */}
          <g strokeWidth=".5" strokeOpacity=".6"><line x1="254" y1="34" x2="120" y2="240" /><line x1="254" y1="34" x2="404" y2="240" /><line x1="254" y1="60" x2="170" y2="240" /></g>
          {/* substructure, with cross bracing, and the ramps with steps and rails */}
          <g fill="none">
            <g strokeWidth="2.2"><line x1="196" y1="196" x2="196" y2="238" /><line x1="232" y1="196" x2="232" y2="238" /><line x1="278" y1="196" x2="278" y2="238" /><line x1="314" y1="196" x2="314" y2="238" /></g>
            <g strokeWidth="1.1"><line x1="196" y1="198" x2="232" y2="236" /><line x1="232" y1="198" x2="196" y2="236" /><line x1="278" y1="198" x2="314" y2="236" /><line x1="314" y1="198" x2="278" y2="236" /></g>
            <g strokeWidth="3"><line x1="190" y1="192" x2="118" y2="238" /><line x1="320" y1="192" x2="392" y2="238" /></g>
            <g strokeWidth="1.3"><line x1="190" y1="174" x2="124" y2="216" /><line x1="320" y1="174" x2="386" y2="216" /></g>
            <g strokeWidth=".8">{[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><line x1={184 - i * 11} y1={194 + i * 7} x2={180 - i * 11} y2={187 + i * 7} /><line x1={326 + i * 11} y1={194 + i * 7} x2={330 + i * 11} y2={187 + i * 7} /></g>)}</g>
          </g>
          <rect x="186" y="188" width="138" height="9" rx="1.5" stroke="none" />
          {/* floodlight poles, with their lamp heads */}
          <g strokeWidth="1.6"><line x1="214" y1="188" x2="214" y2="164" /><line x1="300" y1="188" x2="300" y2="159" /></g>
          <rect x="210" y="160" width="8" height="5" rx="1" stroke="none" /><rect x="296" y="155" width="8" height="5" rx="1" stroke="none" />
          {/* floor rail */}
          <g fill="none" strokeWidth=".9"><line x1="262" y1="176" x2="324" y2="176" />{[268, 280, 292, 304, 316, 324].map((x) => <line key={x} x1={x} y1="176" x2={x} y2="188" />)}</g>
          {/* mast: two leaning legs, zigzag bracing, monkey board with rail, crown block */}
          <g fill="none" strokeLinecap="round">
            <line x1="238" y1={MAST_BASE} x2="246" y2={MAST_TOP} strokeWidth="3.2" /><line x1="270" y1={MAST_BASE} x2="262" y2={MAST_TOP} strokeWidth="3.2" />
            {rungs.map((y, i) => (
              <g key={y} strokeWidth="1.2">
                <line x1={238 + legX(y)} y1={y} x2={270 - legX(y)} y2={y} />
                <line x1={i % 2 ? 238 + legX(y) : 270 - legX(y)} y1={y} x2={i % 2 ? 270 - legX(y + 16) : 238 + legX(y + 16)} y2={y + 16} />
              </g>
            ))}
          </g>
          <rect x="262" y="82" width="38" height="4" rx="1" stroke="none" />
          <g fill="none" strokeWidth="1"><line x1="266" y1="72" x2="300" y2="72" /><line x1="300" y1="72" x2="300" y2="82" /><line x1="266" y1="72" x2="266" y2="82" /><line x1="283" y1="72" x2="283" y2="82" /></g>
          <rect x="244" y="22" width="20" height="9" rx="1.5" stroke="none" />
          {/* doghouse, with its sign plate (brand colours, never silhouetted) added below */}
          <rect x="198" y="158" width="68" height="31" rx="1" stroke="none" /><rect x="194" y="154" width="76" height="6" rx="1" stroke="none" />
          {/* mud tank, pumps and pipes */}
          <rect x="348" y="214" width="58" height="26" rx="2" stroke="none" />
          <g fill="none" strokeWidth="1.2"><line x1="324" y1="226" x2="348" y2="226" /><line x1="324" y1="232" x2="348" y2="232" /></g>
          <rect x="392" y="204" width="3" height="10" stroke="none" />
          {/* pipe rack */}
          <g stroke="none">{[0, 1, 2, 3].map((r) => <rect key={r} x={56 + r * 3} y={232 - r * 5} width={62 - r * 6} height="4" rx="2" />)}</g>
          <g strokeWidth="1.4"><line x1="62" y1="238" x2="62" y2="228" /><line x1="108" y1="238" x2="108" y2="228" /></g>
          {/* pickup */}
          <g transform="translate(-24 0)"><path stroke="none" d="M452,238 v-12 q0,-4 4,-4 h14 l6,-8 h20 l6,8 h8 q4,0 4,4 v12 z" />
            <circle cx="468" cy="239" r="5" stroke="none" /><circle cx="504" cy="239" r="5" stroke="none" /></g>
          {/* crew */}
          <Crew x={282} y={188} />
          <Crew x={298} y={188} wave delay={0} />
          <Crew x={313} y={188} scale={0.95} />
          <Crew x={150} y={238} scale={1.1} />
          <Crew x={140} y={236} />
          <Crew x={414} y={238} scale={1.1} />
        </g>

        {/* things that keep their own colours: the sign plate with the Seros logo, and the lights */}
        <g transform="translate(38 -14) scale(3)">
          <rect x="203" y="161" width="58" height="23" rx="2.5" fill="#f4f8fd" fillOpacity=".94" />
          <image href={LOGO} x="207.5" y="165" width="49" height="14" preserveAspectRatio="xMidYMid meet" />
          <g className="ss-light" style={{ animationDelay: '6000ms' }}><rect x="203" y="184" width="58" height="1.8" fill="#3dbdb0" /><rect x="198" y="183" width="68" height="6" fill="#3dbdb0" fillOpacity=".18" /></g>

          {/* flame at the flare pit, far right */}
          <g className="ss-light" style={{ animationDelay: '5200ms' }}>
            <path className="ss-flare" d="M522,238 C516,228 520,218 522,208 C525,218 530,228 522,238 Z" fill="#ff9a2e" />
            <path className="ss-flare" d="M522,238 C519,231 521,225 522,219 C523,225 526,231 522,238 Z" fill="#ffe08a" />
            <ellipse cx="522" cy="236" rx="30" ry="8" fill="url(#ss-pool)" />
          </g>

          {/* floodlight cones and the pools of light they leave on the ground */}
          <g className="ss-flood" style={{ animationDelay: '6000ms' }}>
            <polygon points="214,164 186,238 244,238" fill="url(#ss-cone)" />
            <polygon points="300,159 262,238 340,238" fill="url(#ss-cone)" />
            <circle cx="214" cy="163" r="9" fill="url(#ss-lamp)" /><circle cx="300" cy="158" r="9" fill="url(#ss-lamp)" />
            <ellipse cx="215" cy="238" rx="42" ry="7" fill="url(#ss-pool)" /><ellipse cx="301" cy="238" rx="50" ry="8" fill="url(#ss-pool)" />
          </g>
          {[[200, 186], [246, 186], [296, 186], [322, 186]].map(([x, y], i) => (
            <g key={x} className="ss-light" style={{ animationDelay: `${5600 + i * 380}ms` }}>
              <circle cx={x} cy={y} r="12" fill="url(#ss-lamp)" /><circle cx={x} cy={y} r="2" fill="#ffe9a8" />
            </g>
          ))}
          {mastLights.map((l) => (
            <g key={l.y} className="ss-light" style={{ animationDelay: `${l.delay}ms` }}>
              <circle cx="254" cy={l.y} r="9" fill="url(#ss-lamp)" /><circle cx="254" cy={l.y} r="1.7" fill="#fff1c4" />
            </g>
          ))}
          <g className="ss-light" style={{ animationDelay: '9800ms' }}>
            <circle className="ss-beacon" cx="254" cy="18" r="3.4" fill="#ff5a4f" />
            <circle cx="254" cy="18" r="11" fill="#ff5a4f" fillOpacity=".25" />
          </g>
          {/* the pickup: moonlit rim, lit windows, headlights and tail light */}
          <g className="ss-light" style={{ animationDelay: '8000ms' }} transform="translate(-24 0)">
            <path d="M452,238 v-12 q0,-4 4,-4 h14 l6,-8 h20 l6,8 h8 q4,0 4,4 v12 z" fill="none" stroke="#8fb0ff" strokeOpacity=".75" strokeWidth="1" />
            <circle cx="468" cy="239" r="5" fill="none" stroke="#8fb0ff" strokeOpacity=".7" strokeWidth=".9" /><circle cx="504" cy="239" r="5" fill="none" stroke="#8fb0ff" strokeOpacity=".7" strokeWidth=".9" />
            <path d="M477,222 l4,-6 h8 v6 z" fill="#ffd36a" fillOpacity=".55" />
            <polygon points="452,233 410,241 410,228" fill="url(#ss-cone)" fillOpacity=".95" />
            <circle cx="453" cy="232" r="2.6" fill="#fff4cf" /><circle cx="453" cy="232" r="11" fill="url(#ss-lamp)" />
            <circle cx="509" cy="231" r="1.6" fill="#ff4a3f" /><circle cx="509" cy="231" r="6" fill="#ff4a3f" fillOpacity=".25" />
          </g>
          {!lite && (
            <g fill="#bfa9d6">
              {[0, 1, 2].map((i) => <circle key={i} className="ss-puff" cx="393.5" cy="202" r="3" style={{ animationDelay: `${i * 1000}ms` }} />)}
            </g>
          )}
        </g>

        {/* foreground: scrub and dry grass, to close the picture */}
        <g className="ss-ground" fill="currentColor">
          <path d={bush(40, 860, 160)} /><path d={bush(1340, 870, 200)} /><path d={bush(210, 885, 110)} /><path d={bush(1230, 890, 120)} />
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
