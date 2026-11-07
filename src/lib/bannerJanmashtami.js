import { canvasScale, lowPowerDevice, makeFrameGuard } from '@/lib/perf'
import { endShow, setShowHint, startShow } from '@/lib/bannerShow'

// "Break the handi" (Dahi Handi), and you do the breaking. A night square under warm lights. A decorated matka of dahi hangs from a rope, with
// marigolds round its neck and little flags. Six kids build a 3-2-1 pyramid under it: three stand side by side with their arms round each
// other, then two climb up onto their shoulders, then the smallest climbs to the top. The matka pulses gently and the line at the bottom asks you to
// click it. When you do, the boy on top swings his stick, the matka cracks and breaks, and the dahi pours: thick and glossy like poured paint or
// oil, merging into one liquid, running over the heads and shoulders and down the kids' backs, with shards, marigolds and flags falling. The kids
// cheer, and the show then closes by itself (or any time with Esc). The kids are drawn as flat vector figures in code from a few joints, so every
// pose is built, not pasted. One canvas that exists only while the show plays; nothing is loaded until a button is pressed. Kind to slow machines:
// less dahi and a coarser liquid on a low-power device and when frames run slow, an early finish when very slow. With reduced motion the finished
// pyramid stands still; a click breaks the pot into a still puddle and the show closes soon after.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const lerp = (a, b, k) => a + (b - a) * k
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
const easeOut = (x) => 1 - (1 - x) ** 3
const easeOutBack = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

function normHex(c) {
  const s = String(c).trim().toLowerCase()
  return /^#[0-9a-f]{3}$/.test(s) ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s
}

function glow(colour, size = 64) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `${colour}ff`)
  grd.addColorStop(0.28, `${colour}aa`)
  grd.addColorStop(0.6, `${colour}33`)
  grd.addColorStop(1, `${colour}00`)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  return c
}

// ── the kids ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const OUT = '#3a2416'
const SKINS = ['#e3a77a', '#cf8f62', '#dfa06f', '#c98456', '#d99a6a', '#e8b087']
const HAIRS = ['#3a2416', '#2b1a10', '#4a2e1c', '#33200f']
const BOTTOMS = ['#d9382b', '#2f7d3a', '#2f5fbf', '#efe2c6', '#c9302c', '#1f4aa8']
const SASHES = ['#2f5fbf', '#f28c1c', '#d63a2a', '#2f7d3a']
const SH = 0.135 // half the width of the shoulders, in kid heights

// Two-bone limb: from a to the target t with bones l1 and l2. The joint bends toward `out` (-1 left, +1 right). A target too far is reached as far as
// the limb stretches. Returns the joint and the end.
function ik(ax, ay, tx, ty, l1, l2, out) {
  let dx = tx - ax
  let dy = ty - ay
  let d = Math.hypot(dx, dy) || 0.0001
  const max = (l1 + l2) * 0.999
  if (d > max) {
    dx *= max / d
    dy *= max / d
    d = max
  }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const mx = ax + (dx * a) / d
  const my = ay + (dy * a) / d
  const p1 = [mx + (-dy / d) * h, my + (dx / d) * h]
  const p2 = [mx - (-dy / d) * h, my - (dx / d) * h]
  const pickFirst = (p1[0] - mx) * out >= (p2[0] - mx) * out
  const j = pickFirst ? p1 : p2
  return { jx: j[0], jy: j[1], ex: ax + dx, ey: ay + dy }
}

// ── the matka, pre-drawn once ──────────────────────────────────────────────────────────────────────────────────────────────────────

// Pot body with its painted bands, the rim and the neck, drawn on a 300 x 300 sheet; the pot's centre is at (150, 170) and its body radius is 100.
function potBody() {
  const c = document.createElement('canvas')
  c.width = 300
  c.height = 300
  const g = c.getContext('2d')
  const body = g.createRadialGradient(108, 130, 8, 150, 175, 118)
  body.addColorStop(0, '#f0a05a')
  body.addColorStop(0.45, '#cf6a2e')
  body.addColorStop(1, '#6e2a0e')
  g.fillStyle = body
  g.strokeStyle = '#4a1d08'
  g.lineWidth = 3
  // neck
  g.beginPath()
  g.moveTo(112, 92)
  g.lineTo(122, 62)
  g.lineTo(178, 62)
  g.lineTo(188, 92)
  g.closePath()
  g.fill()
  g.stroke()
  // belly
  g.beginPath()
  g.ellipse(150, 172, 104, 96, 0, 0, TAU)
  g.fill()
  g.stroke()
  // painted bands: dots, a zigzag of mustard triangles, dots again
  const bx = (a) => 150 + Math.sin(a) * 100
  g.fillStyle = '#fff1cf'
  for (let i = -8; i <= 8; i += 1) {
    const a = i * 0.115
    g.beginPath()
    g.arc(bx(a), 144 + (1 - Math.cos(a)) * 30, 3.4, 0, TAU)
    g.fill()
  }
  g.fillStyle = '#f0b429'
  g.strokeStyle = '#5a2208'
  g.lineWidth = 1.6
  for (let i = -6; i <= 5; i += 1) {
    const a0 = i * 0.16
    const a1 = (i + 1) * 0.16
    const x0 = bx(a0)
    const x1 = bx(a1)
    const y0 = 158 + (1 - Math.cos(a0)) * 34
    const y1 = 158 + (1 - Math.cos(a1)) * 34
    g.beginPath()
    if (i % 2 === 0) {
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.lineTo((x0 + x1) / 2, y0 + 26)
    } else {
      g.moveTo(x0, y0 + 26)
      g.lineTo(x1, y1 + 26)
      g.lineTo((x0 + x1) / 2, y0)
    }
    g.closePath()
    g.fill()
    g.stroke()
  }
  g.fillStyle = '#fff1cf'
  for (let i = -7; i <= 7; i += 1) {
    const a = i * 0.13
    g.beginPath()
    g.arc(bx(a), 198 + (1 - Math.cos(a)) * 36, 3.2, 0, TAU)
    g.fill()
  }
  // shine and shade
  const side = g.createLinearGradient(46, 0, 254, 0)
  side.addColorStop(0, 'rgba(255,230,190,0.32)')
  side.addColorStop(0.35, 'rgba(255,230,190,0)')
  side.addColorStop(0.7, 'rgba(0,0,0,0)')
  side.addColorStop(1, 'rgba(30,5,0,0.42)')
  g.fillStyle = side
  g.beginPath()
  g.ellipse(150, 172, 104, 96, 0, 0, TAU)
  g.fill()
  // rim
  const rim = g.createLinearGradient(0, 50, 0, 74)
  rim.addColorStop(0, '#e0894a')
  rim.addColorStop(1, '#9c4418')
  g.fillStyle = rim
  g.strokeStyle = '#4a1d08'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(150, 62, 46, 12, 0, 0, TAU)
  g.fill()
  g.stroke()
  g.fillStyle = '#2a0f06'
  g.beginPath()
  g.ellipse(150, 62, 37, 8, 0, 0, TAU)
  g.fill()
  return c
}

// The dahi brimming at the mouth, with two tongues running down the outside; drawn over the body while the pot is whole.
function potDahi() {
  const c = document.createElement('canvas')
  c.width = 300
  c.height = 300
  const g = c.getContext('2d')
  g.fillStyle = '#fff6e5'
  g.strokeStyle = '#d9c7a3'
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(150, 58, 40, 11, 0, 0, TAU)
  g.fill()
  g.beginPath()
  g.moveTo(116, 60)
  g.bezierCurveTo(120, 36, 180, 36, 184, 60)
  g.bezierCurveTo(170, 66, 130, 66, 116, 60)
  g.fill()
  g.stroke()
  for (const [x, len, w] of [[124, 40, 9], [177, 28, 8]]) {
    g.beginPath()
    g.moveTo(x - w, 60)
    g.lineTo(x - w * 0.7, 60 + len)
    g.arc(x, 60 + len, w * 0.7, Math.PI, 0, true)
    g.lineTo(x + w, 60)
    g.closePath()
    g.fill()
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.beginPath()
  g.ellipse(138, 50, 14, 4, -0.2, 0, TAU)
  g.fill()
  return c
}

// one marigold blossom
function blossom(size = 56) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  g.translate(size / 2, size / 2)
  const ring = (n, r, rx, ry, a, b, off) => {
    for (let k = 0; k < n; k += 1) {
      g.save()
      g.rotate((k / n) * TAU + off)
      const grd = g.createLinearGradient(0, -r - ry, 0, -r + ry)
      grd.addColorStop(0, b)
      grd.addColorStop(1, a)
      g.fillStyle = grd
      g.strokeStyle = 'rgba(110,40,0,0.35)'
      g.lineWidth = 1
      g.beginPath()
      g.ellipse(0, -r, rx, ry, 0, 0, TAU)
      g.fill()
      g.stroke()
      g.restore()
    }
  }
  ring(11, size * 0.27, size * 0.12, size * 0.2, '#ffb703', '#e85d04', 0)
  ring(8, size * 0.16, size * 0.09, size * 0.14, '#ffd166', '#fb8500', 0.4)
  g.fillStyle = '#7a2e00'
  g.beginPath()
  g.arc(0, 0, size * 0.06, 0, TAU)
  g.fill()
  return c
}

// The pot's sheet cut into shards: a ring of triangles around a point a little off its centre and a ring of four-sided pieces outside them, each cut
// out of the pot body so it keeps its paint.
function cutShards(body) {
  const cx = 150 + rnd(-8, 8)
  const cy = 175 + rnd(-8, 8)
  const n = 8
  const base = rnd(0, TAU)
  const angs = Array.from({ length: n }, (_, i) => base + (i / n) * TAU + rnd(-0.18, 0.18)).sort((a, b) => a - b)
  const j = () => rnd(-5, 5)
  const at = (a, r) => [cx + Math.cos(a) * r + j(), cy + Math.sin(a) * r + j()]
  const shards = []
  for (let ring = 0; ring < 2; ring += 1) {
    for (let i = 0; i < n; i += 1) {
      const a0 = angs[i]
      const a1 = i + 1 < n ? angs[i + 1] : angs[0] + TAU
      const pts = ring === 0 ? [[cx, cy], at(a0, 58), at(a1, 58)] : [at(a0, 58), at(a1, 58), at(a1, 134), at(a0, 134)]
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const x0 = Math.floor(Math.min(...xs)) - 2
      const y0 = Math.floor(Math.min(...ys)) - 2
      const w = Math.ceil(Math.max(...xs)) - x0 + 4
      const h = Math.ceil(Math.max(...ys)) - y0 + 4
      const sheet = document.createElement('canvas')
      sheet.width = Math.max(4, w)
      sheet.height = Math.max(4, h)
      const g = sheet.getContext('2d')
      g.beginPath()
      pts.forEach(([x, y], k) => (k ? g.lineTo(x - x0, y - y0) : g.moveTo(x - x0, y - y0)))
      g.closePath()
      g.save()
      g.clip()
      g.drawImage(body, -x0, -y0)
      g.restore()
      g.strokeStyle = 'rgba(40,12,2,0.7)'
      g.lineWidth = 2
      g.stroke()
      shards.push({ sprite: sheet, cx: x0 + w / 2 - 150, cy: y0 + h / 2 - 170, w, h })
    }
  }
  return shards
}

// ── the dahi: a liquid made of many soft blobs, thresholded into one glossy shape ───────────────────────────────────────────

const BLOB = (() => {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.3, 'rgba(255,255,255,0.86)')
  grd.addColorStop(0.55, 'rgba(255,255,255,0.46)')
  grd.addColorStop(0.8, 'rgba(255,255,255,0.12)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return c
})()

export function playJanmashtami({ colors, bursts }) {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const low = lowPowerDevice()
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const scale = canvasScale()
  const W = window.innerWidth
  const H = window.innerHeight
  const R = Math.min(W, H)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const palette = (colors?.length ? colors : ['#f28c1c', '#2f5fbf', '#2f7d3a', '#d63a2a']).map(normHex)
  const col = (i) => palette[i % palette.length]
  const sprites = {}
  for (const c of new Set(['#ffd166', '#ffb347', '#ffffff', '#fdf6e3'])) sprites[c] = glow(c)

  const body = potBody()
  const dahiTop = potDahi()
  const bloom = blossom()
  const shardSet = cutShards(body)

  // sizes: everything follows `fh`, the height of one kid
  const cx = W / 2
  const GY = H * 0.94
  const fh = Math.min(0.255 * H, 0.3 * W)
  const potR = 0.3 * fh
  const potK = potR / 100
  const POT_CY0 = GY - 3.01 * fh
  const PIVOT = { x: cx, y: -24 }
  const ropeLen = POT_CY0 - PIVOT.y

  // the timeline
  const POT_IN = 0.4
  const BASE_T0 = 1.0
  const T2_T0 = 2.2
  const TOP_T0 = 3.4
  const READY = 5.1
  const STRIKE = 0.34
  const AFTER = 7.2 // seconds after the break until the show closes by itself
  const IDLE_END = 60

  // ── the six kids ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const mk = (tier, idx, i) => ({
    tier,
    idx,
    s: fh,
    O: { x: cx, y: GY },
    lean: 0,
    phase: rnd(0, TAU),
    top: col(i),
    bottom: pick(BOTTOMS),
    long: Math.random() < 0.4,
    sash: pick(SASHES),
    skin: pick(SKINS),
    hair: pick(HAIRS),
    vis: false,
    air: 0,
    walk: false,
    stanceK: 0,
    splash: 0,
    stages: [],
    start: { x: cx, y: GY },
    foot: null,
  })
  const A = mk(0, 0, 0)
  const B = mk(0, 1, 1)
  const C = mk(0, 2, 2)
  const TL = mk(1, 0, 3)
  const TR = mk(1, 1, 0)
  const TP = mk(2, 0, 2)
  TP.s = fh * 0.97
  const kids = [A, B, C, TL, TR, TP]
  const Wp = (f, lx, ly) => {
    const c = Math.cos(f.lean)
    const s = Math.sin(f.lean)
    const x = lx * f.s
    const y = ly * f.s
    return [f.O.x + x * c - y * s, f.O.y + x * s + y * c]
  }
  const mid = (p, q) => ({ x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2 })
  const pt = (p) => ({ x: p[0], y: p[1] })
  const SP = 0.46 // spacing between kids, in kid heights
  const offL = -W / 2 - fh
  const offR = W / 2 + fh

  const ground = (x) => ({ x, y: GY })
  A.start = ground(cx + offL)
  B.start = ground(cx + offL - fh * 0.8)
  C.start = ground(cx + offR)
  A.stages = [{ t0: BASE_T0, t1: BASE_T0 + 0.9, to: () => ground(cx - SP * fh) }]
  B.stages = [{ t0: BASE_T0 + 0.3, t1: BASE_T0 + 1.3, to: () => ground(cx) }]
  C.stages = [{ t0: BASE_T0 + 0.15, t1: BASE_T0 + 1.05, to: () => ground(cx + SP * fh) }]
  TL.start = ground(cx + offL)
  TL.stages = [
    { t0: T2_T0, t1: T2_T0 + 0.7, to: () => ground(A.O.x - 0.42 * fh) },
    { t0: T2_T0 + 0.7, t1: T2_T0 + 1.1, hop: 0.12, to: () => pt(Wp(A, -SH, -0.8)) },
    { t0: T2_T0 + 1.1, t1: T2_T0 + 1.5, hop: 0.12, final: true, to: () => mid(Wp(A, SH, -0.8), Wp(B, -SH, -0.8)) },
  ]
  TR.start = ground(cx + offR)
  TR.stages = [
    { t0: T2_T0 + 0.3, t1: T2_T0 + 1.0, to: () => ground(C.O.x + 0.42 * fh) },
    { t0: T2_T0 + 1.0, t1: T2_T0 + 1.4, hop: 0.12, to: () => pt(Wp(C, SH, -0.8)) },
    { t0: T2_T0 + 1.4, t1: T2_T0 + 1.8, hop: 0.12, final: true, to: () => mid(Wp(B, SH, -0.8), Wp(C, -SH, -0.8)) },
  ]
  TP.start = ground(cx + offL - fh)
  TP.stages = [
    { t0: TOP_T0, t1: TOP_T0 + 0.6, to: () => ground(A.O.x - 0.44 * fh) },
    { t0: TOP_T0 + 0.6, t1: TOP_T0 + 1.0, hop: 0.12, to: () => pt(Wp(A, -SH, -0.8)) },
    { t0: TOP_T0 + 1.0, t1: TOP_T0 + 1.4, hop: 0.12, to: () => pt(Wp(TL, -SH, -0.8)) },
    { t0: TOP_T0 + 1.4, t1: TOP_T0 + 1.8, hop: 0.14, final: true, to: () => mid(Wp(TL, SH, -0.8), Wp(TR, -SH, -0.8)) },
  ]
  // where each kid's feet go when it stands on the shoulders below
  TL.foot = () => [Wp(A, SH, -0.8), Wp(B, -SH, -0.8)]
  TR.foot = () => [Wp(B, SH, -0.8), Wp(C, -SH, -0.8)]
  TP.foot = () => [Wp(TL, SH, -0.8), Wp(TR, -SH, -0.8)]
  const landings = [TL, TR, TP].flatMap((f) => f.stages.filter((s) => s.hop).map((s) => s.t1))

  function place(f, t) {
    const st = f.stages
    if (t < st[0].t0) {
      f.vis = false
      f.O = { ...f.start }
      f.air = 0
      f.walk = false
      f.stanceK = 0
      return
    }
    f.vis = true
    let from = f.start
    for (let i = 0; i < st.length; i += 1) {
      const s = st[i]
      const to = s.to()
      if (t >= s.t1) {
        from = to
        if (i === st.length - 1) {
          f.O = { ...to }
          f.air = 0
          f.walk = false
          f.stanceK = f.foot ? 1 : 0
          return
        }
        continue
      }
      const u = clamp((t - s.t0) / (s.t1 - s.t0))
      const e = s.hop ? easeInOut(u) : u
      f.O = { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - (s.hop ? Math.sin(Math.PI * u) * s.hop * fh : 0) }
      f.air = s.hop ? Math.sin(Math.PI * u) : 0
      f.walk = !s.hop
      f.stanceK = s.final ? smooth(0.5, 1, u) : 0
      return
    }
  }

  // a wobble that runs through the pyramid each time somebody lands on it
  const wobble = (t) => {
    let w = 0
    for (const l of landings) if (t > l) w += 0.016 * Math.exp(-(t - l) * 3) * Math.cos((t - l) * 13)
    return w
  }

  // ── state ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const guard = makeFrameGuard()
  let thin = false
  let broken = false
  let breakAt = -1 // when the click happened
  let hitAt = -1
  let debris = []
  let dahi = []
  let sparks = []
  let surfaces = []
  let potWorld = { x: cx, y: POT_CY0, a: 0 }
  let hover = false
  let raf = 0
  let t = still ? READY + 0.5 : 0
  let last = 0
  const stars = Array.from({ length: low ? 24 : 54 }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.6), r: rnd(0.5, 1.6), ph: rnd(0, TAU), f: rnd(0.8, 2.4) }))
  const motes = Array.from({ length: low ? 8 : 16 }, () => ({ x: rnd(0, W), y: rnd(H * 0.1, H), r: rnd(R * 0.04, R * 0.1), ph: rnd(0, TAU), f: rnd(0.4, 1) }))

  // the liquid's two low-resolution sheets
  const q = low ? 0.34 : 0.5
  const lw = Math.ceil(W * q)
  const lh = Math.ceil(H * q)
  const acc = document.createElement('canvas')
  acc.width = lw
  acc.height = lh
  const accCtx = acc.getContext('2d', { willReadFrequently: true })
  const outc = document.createElement('canvas')
  outc.width = lw
  outc.height = lh
  const outCtx = outc.getContext('2d')

  const end = () => {
    cancelAnimationFrame(raf)
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.remove()
    endShow(end)
  }
  startShow(end)

  // ── pointer ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const overPot = (e) => Math.hypot(e.clientX - potWorld.x, e.clientY - potWorld.y) < potR * 1.7
  const onMove = (e) => {
    const h = !broken && overPot(e)
    if (h !== hover) {
      hover = h
      canvas.style.cursor = h ? 'pointer' : 'default'
    }
  }
  const onDown = (e) => {
    if (broken || breakAt >= 0) return
    if (overPot(e)) {
      breakAt = t
      hitAt = still ? t : t + STRIKE
      setShowHint(end, '')
    } else if (coarse) {
      end() // a touch screen has no Esc: a tap anywhere but the pot closes it
    }
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)

  // ── drawing the kids ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const lw1 = () => Math.max(1.3, fh * 0.009)

  const seg = (pts, w, color) => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.strokeStyle = OUT
    ctx.lineWidth = w + lw1() * 2
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.stroke()
  }

  // where a kid's feet are, in the world
  function feet(f) {
    const tuck = f.air * 0.2
    const def = [Wp(f, -0.085, -tuck), Wp(f, 0.085, -tuck * 0.6)]
    if (f.walk) {
      const ph = t * 11 + f.phase
      def[0][1] -= Math.max(0, Math.sin(ph)) * 0.05 * f.s
      def[1][1] -= Math.max(0, -Math.sin(ph)) * 0.05 * f.s
    }
    if (!f.foot || f.stanceK <= 0) return def
    const fin = f.foot()
    return [[lerp(def[0][0], fin[0][0], f.stanceK), lerp(def[0][1], fin[0][1], f.stanceK)], [lerp(def[1][0], fin[1][0], f.stanceK), lerp(def[1][1], fin[1][1], f.stanceK)]]
  }

  function drawLegs(f, fp) {
    for (const [side, foot] of [[-1, fp[0]], [1, fp[1]]]) {
      const hip = Wp(f, side * 0.055, -0.47)
      const k = ik(hip[0], hip[1], foot[0], foot[1], 0.27 * f.s, 0.27 * f.s, side)
      seg([hip, [k.jx, k.jy]], 0.108 * f.s, f.bottom)
      seg([[k.jx, k.jy], [k.ex, k.ey]], 0.08 * f.s, f.long ? f.bottom : f.skin)
    }
  }

  function drawFeet(f, fp) {
    for (const [px, py] of fp) {
      ctx.fillStyle = f.skin
      ctx.strokeStyle = OUT
      ctx.lineWidth = lw1()
      ctx.beginPath()
      ctx.ellipse(px + f.s * 0.014, py, f.s * 0.064, f.s * 0.032, f.lean, 0, TAU)
      ctx.fill()
      ctx.stroke()
    }
  }

  function drawTorso(f) {
    const P = (x, y) => Wp(f, x, y)
    const sl = P(-SH, -0.8)
    const sr = P(SH, -0.8)
    const nl = P(-0.058, -0.808)
    const nr = P(0.058, -0.808)
    const nd = P(0, -0.738)
    const wl = P(-0.108, -0.5)
    const wr = P(0.108, -0.5)
    ctx.beginPath()
    ctx.moveTo(sl[0], sl[1])
    ctx.lineTo(nl[0], nl[1])
    ctx.quadraticCurveTo(nd[0], nd[1], nr[0], nr[1])
    ctx.lineTo(sr[0], sr[1])
    ctx.quadraticCurveTo(...P(SH + 0.014, -0.65), wr[0], wr[1])
    ctx.lineTo(wl[0], wl[1])
    ctx.quadraticCurveTo(...P(-SH - 0.014, -0.65), sl[0], sl[1])
    ctx.closePath()
    ctx.fillStyle = f.top
    ctx.fill()
    ctx.strokeStyle = OUT
    ctx.lineWidth = lw1()
    ctx.lineJoin = 'round'
    ctx.stroke()
    // a soft shade down one side
    ctx.fillStyle = 'rgba(0,0,0,0.13)'
    ctx.beginPath()
    ctx.moveTo(...P(0.04, -0.78))
    ctx.lineTo(...sr)
    ctx.quadraticCurveTo(...P(SH + 0.014, -0.65), wr[0], wr[1])
    ctx.lineTo(...P(0.04, -0.5))
    ctx.closePath()
    ctx.fill()
    // the sash round the waist, with its tail
    ctx.fillStyle = f.sash
    ctx.beginPath()
    ctx.moveTo(...P(-0.115, -0.54))
    ctx.lineTo(...P(0.115, -0.54))
    ctx.lineTo(...P(0.112, -0.465))
    ctx.lineTo(...P(-0.112, -0.465))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(...P(0.08, -0.505))
    ctx.quadraticCurveTo(...P(0.15, -0.46), ...P(0.165, -0.37))
    ctx.lineTo(...P(0.1, -0.395))
    ctx.quadraticCurveTo(...P(0.09, -0.45), ...P(0.06, -0.485))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  function drawHead(f, look, joy) {
    const c = Wp(f, 0, -0.915)
    const r = 0.097 * f.s
    // neck
    seg([Wp(f, 0, -0.79), Wp(f, 0, -0.86)], 0.066 * f.s, f.skin)
    ctx.save()
    ctx.translate(c[0], c[1])
    ctx.rotate(f.lean + look * 0.16)
    ctx.lineWidth = lw1()
    ctx.strokeStyle = OUT
    // ears
    ctx.fillStyle = f.skin
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(s * r * 0.98, r * 0.12, r * 0.2, 0, TAU)
      ctx.fill()
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fill()
    ctx.stroke()
    // hair: a cap with a side-swept fringe
    ctx.fillStyle = f.hair
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.05, Math.PI * 0.97, Math.PI * 2.03)
    ctx.quadraticCurveTo(r * 0.55, -r * 0.2, -r * 0.05, -r * 0.5)
    ctx.quadraticCurveTo(-r * 0.6, -r * 0.35, -r * 1.02, r * 0.06)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // eyes and brows
    const ey = r * 0.06 - look * r * 0.05
    ctx.fillStyle = OUT
    ctx.strokeStyle = OUT
    ctx.lineCap = 'round'
    for (const s of [-1, 1]) {
      if (joy > 0.6) {
        ctx.lineWidth = lw1() * 1.3
        ctx.beginPath()
        ctx.arc(s * r * 0.38, ey + r * 0.06, r * 0.13, Math.PI * 1.05, Math.PI * 1.95)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.ellipse(s * r * 0.38, ey, r * 0.085, r * 0.125, 0, 0, TAU)
        ctx.fill()
      }
      ctx.lineWidth = lw1() * 1.1
      ctx.beginPath()
      ctx.moveTo(s * r * 0.22, ey - r * 0.27 - (joy > 0.3 ? r * 0.05 : 0))
      ctx.lineTo(s * r * 0.56, ey - r * 0.3 - (joy > 0.3 ? r * 0.1 : 0))
      ctx.stroke()
    }
    // mouth
    ctx.lineWidth = lw1() * 1.1
    if (joy > 0.3) {
      ctx.fillStyle = '#7a1f1f'
      ctx.beginPath()
      ctx.moveTo(-r * 0.3, r * 0.42)
      ctx.quadraticCurveTo(0, r * (0.42 + 0.55 * joy), r * 0.3, r * 0.42)
      ctx.quadraticCurveTo(0, r * 0.5, -r * 0.3, r * 0.42)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.fillRect(-r * 0.22, r * 0.44, r * 0.44, r * 0.09)
    } else {
      ctx.beginPath()
      ctx.arc(0, r * 0.28, r * 0.26, Math.PI * 0.15, Math.PI * 0.85)
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawArm(f, side, target, wave = 0) {
    const sh = Wp(f, side * (SH - 0.014), -0.772)
    const e = ik(sh[0], sh[1], target[0] + wave, target[1], 0.17 * f.s, 0.16 * f.s, side)
    seg([sh, [e.jx, e.jy]], 0.078 * f.s, f.skin)
    seg([[e.jx, e.jy], [e.ex, e.ey]], 0.066 * f.s, f.skin)
    ctx.fillStyle = f.skin
    ctx.strokeStyle = OUT
    ctx.lineWidth = lw1()
    ctx.beginPath()
    ctx.arc(e.ex, e.ey, 0.04 * f.s, 0, TAU)
    ctx.fill()
    ctx.stroke()
    return e
  }

  // The poses. `cheer` is 0 until the pot breaks, then 1. Targets are in the world.
  function armTargets(f, cheerK, tt) {
    const P = (x, y) => Wp(f, x, y)
    const wv = Math.sin(tt * 9 + f.phase) * f.s * 0.03
    if (f === TP) {
      return null
    }
    const cheer = [P(-0.2, -1.14 + wv * 0.02), P(0.2, -1.14 - wv * 0.02)]
    let idle
    if (f === A) idle = [P(-0.24, -0.5), Wp(B, -(SH - 0.02), -0.77)]
    else if (f === B) idle = [Wp(A, SH - 0.02, -0.77), Wp(C, -(SH - 0.02), -0.77)]
    else if (f === C) idle = [Wp(B, SH - 0.02, -0.77), P(0.2, -0.5)]
    else if (f === TL) idle = [P(-0.3, -0.64), Wp(TR, -(SH - 0.02), -0.77)]
    else idle = [Wp(TL, SH - 0.02, -0.77), P(0.3, -0.64)]
    return idle.map((p, i) => [lerp(p[0], cheer[i][0], cheerK) + wv * cheerK, lerp(p[1], cheer[i][1], cheerK)])
  }

  function drawKid(f, phase, tt, cheerK) {
    // phase: 'body' draws legs + torso + head; 'arms' draws the arms
    if (!f.vis) return
    const joy = clamp(f.splash / 3 + cheerK * 0.9)
    const look = broken ? 0 : 1
    if (phase === 'body') {
      drawTorso(f)
      drawHead(f, look, joy)
    }
  }

  function drawTopKid(tt, cheerK) {
    const f = TP
    if (!f.vis) return
    const reach = !broken
    const pot = [potWorld.x, potWorld.y]
    const bellyReach = [pot[0] + Math.sin(potWorld.a) * 0, pot[1] + potR * 0.95]
    const joy = clamp(f.splash / 3 + cheerK * 0.9)
    drawTorso(f)
    drawHead(f, reach ? 1 : 0, joy)
    // the left arm up and out for balance, or cheering
    const lt = reach ? Wp(f, -0.2, -1.1) : Wp(f, -0.22, -1.16 + Math.sin(tt * 9) * 0.03)
    drawArm(f, -1, lt)
    // the right arm: raised to the pot, then the swing
    let target = bellyReach
    let aim = [pot[0], pot[1]]
    if (breakAt >= 0 && !still) {
      const u = clamp((tt - breakAt) / STRIKE)
      const wind = Wp(f, 0.24, -1.12)
      const windAim = Wp(f, 0.42, -1.5)
      if (u < 0.38) {
        const k = easeOut(u / 0.38)
        target = [lerp(bellyReach[0], wind[0], k), lerp(bellyReach[1], wind[1], k)]
        aim = [lerp(pot[0], windAim[0], k), lerp(pot[1], windAim[1], k)]
      } else if (tt < hitAt + 0.5) {
        const k = easeInOut(clamp((u - 0.38) / 0.62)) ** 2
        target = [lerp(wind[0], bellyReach[0], k), lerp(wind[1], bellyReach[1], k)]
        aim = [lerp(windAim[0], pot[0], k), lerp(windAim[1], pot[1], k)]
      }
    } else if (broken) {
      target = Wp(f, 0.24, -1.2 + Math.sin(tt * 9 + 1) * 0.04)
      aim = Wp(f, 0.24, -1.6)
    }
    const sh = Wp(f, SH - 0.014, -0.772)
    const e = ik(sh[0], sh[1], target[0], target[1], 0.17 * f.s, 0.16 * f.s, 1)
    seg([sh, [e.jx, e.jy]], 0.078 * f.s, f.skin)
    // the stick, held in the hand and pointing at what it will hit
    const ang = Math.atan2(aim[1] - e.ey, aim[0] - e.ex)
    const len = 0.34 * f.s
    const bx = e.ex - Math.cos(ang) * 0.06 * f.s
    const by = e.ey - Math.sin(ang) * 0.06 * f.s
    seg([[bx, by], [e.ex + Math.cos(ang) * len, e.ey + Math.sin(ang) * len]], 0.036 * f.s, '#d98a2b')
    ctx.strokeStyle = '#7a4a10'
    ctx.lineWidth = Math.max(1, f.s * 0.006)
    ctx.setLineDash([f.s * 0.02, f.s * 0.03])
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(e.ex + Math.cos(ang) * len, e.ey + Math.sin(ang) * len)
    ctx.stroke()
    ctx.setLineDash([])
    seg([[e.jx, e.jy], [e.ex, e.ey]], 0.066 * f.s, f.skin)
    ctx.fillStyle = f.skin
    ctx.strokeStyle = OUT
    ctx.lineWidth = lw1()
    ctx.beginPath()
    ctx.arc(e.ex, e.ey, 0.04 * f.s, 0, TAU)
    ctx.fill()
    ctx.stroke()
  }

  // ── the pot ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const garland = Array.from({ length: 12 }, (_, i) => {
    const u = i / 11
    return { x: -0.95 + 1.9 * u, y: -0.38 + 0.42 * Math.sin(Math.PI * u) + (u < 0.5 ? 0 : 0.0), s: 0.3 + 0.03 * Math.sin(i * 2.1) }
  })
  const flags = [
    { x: -0.5, y: -1.08, dx: -0.7, dy: -0.78, c: '#d63a2a', c2: '#fff' },
    { x: 0.5, y: -1.08, dx: 0.74, dy: -0.8, c: '#f28c1c', c2: '#2f7d3a' },
    { x: 0.05, y: -1.12, dx: 0.1, dy: -0.95, c: '#2f5fbf', c2: '#fff' },
  ]

  function ropeLine(x0, y0, x1, y1, w) {
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#6b4414'
    ctx.lineWidth = w + 2
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.strokeStyle = '#c99a4a'
    ctx.lineWidth = w
    ctx.stroke()
    ctx.strokeStyle = 'rgba(90,55,12,0.6)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 4])
    ctx.stroke()
    ctx.setLineDash([])
  }

  function drawPot(tt, env) {
    const swingA = (still ? 0 : 0.035 * Math.sin(tt * 2.1)) + (hitAt >= 0 && tt > hitAt ? 0.03 * Math.exp(-(tt - hitAt) * 1.6) * Math.sin((tt - hitAt) * 8) : 0)
    const px = PIVOT.x + Math.sin(swingA) * ropeLen
    const py = PIVOT.y + Math.cos(swingA) * ropeLen
    potWorld = { x: px, y: py, a: swingA }
    const kx = px - Math.sin(swingA) * potR * 1.5
    const ky = py - Math.cos(swingA) * potR * 1.5
    ctx.globalAlpha = env
    // the rope from above, down to the knot
    ropeLine(PIVOT.x, PIVOT.y, kx, ky - potR * 0.55, 4)
    if (!broken) {
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(swingA)
      const att = [[-0.88, -0.92], [0.88, -0.92], [0, -1.18]]
      for (const [ax, ay] of att) ropeLine(0, -potR * 2.05, ax * potR, ay * potR, 3)
      ctx.drawImage(body, -150 * potK, -170 * potK, 300 * potK, 300 * potK)
      // dahi at the mouth
      ctx.drawImage(dahiTop, -150 * potK, -170 * potK, 300 * potK, 300 * potK)
      // flags on little sticks
      for (const fl of flags) {
        const flutter = Math.sin(tt * 5 + fl.x * 3) * 0.06
        ctx.strokeStyle = '#7a4a10'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(fl.x * potR * 0.9, -0.85 * potR)
        ctx.lineTo(fl.dx * potR, fl.dy * potR * 1.45)
        ctx.stroke()
        ctx.save()
        ctx.translate(fl.dx * potR, fl.dy * potR * 1.45)
        ctx.rotate(flutter)
        ctx.fillStyle = fl.c
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.sign(fl.dx || 1) * potR * 0.5, potR * 0.06)
        ctx.lineTo(0, potR * 0.28)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = OUT
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      }
      // the garland across the front of the belly
      for (const g of garland) {
        const bs = g.s * potR * 1.6
        ctx.drawImage(bloom, g.x * potR - bs / 2, (g.y + 0.1) * potR - bs / 2, bs, bs)
      }
      ctx.restore()
      // a soft ring that asks for the click
      if (!still && tt > READY - 0.2 && breakAt < 0) {
        const pulse = (tt * 0.9) % 1
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = env * (1 - pulse) * 0.55
        ctx.strokeStyle = '#ffd166'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(px, py, potR * (1.25 + pulse * 0.75), 0, TAU)
        ctx.stroke()
        ctx.globalAlpha = env * (0.35 + 0.2 * Math.sin(tt * 4))
        const gs = potR * 4.2
        ctx.drawImage(sprites['#ffb347'], px - gs / 2, py - gs / 2, gs, gs)
        ctx.globalCompositeOperation = 'source-over'
      }
    } else {
      // what is left: the rope and its loops, swinging
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(swingA)
      const sw = Math.sin(tt * 6) * potR * 0.12
      for (const [ax, ay] of [[-0.55, 1.1], [0.55, 1.1], [0, 1.4]]) ropeLine(0, -potR * 2.05, ax * potR + sw, ay * potR * 0.5 - potR, 3)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  // ── the break ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function breakPot() {
    broken = true
    const px = potWorld.x
    const py = potWorld.y
    if (still) {
      // a still puddle at the foot of the pyramid
      for (let i = 0; i < 26; i += 1) dahi.push({ x: cx + rnd(-0.9, 0.9) * fh, y: GY + rnd(-0.01, 0.01) * fh, vx: 0, vy: 0, r: rnd(R * 0.016, R * 0.03), state: 'ground', sx: 2.4 + Math.random(), life: 0 })
      return
    }
    for (const s of shardSet) {
      const a = Math.atan2(s.cy, s.cx) + rnd(-0.5, 0.5)
      const sp = rnd(120, 420) * (R / 800)
      debris.push({ kind: 'shard', s, x: px + s.cx * potK, y: py + s.cy * potK, vx: Math.cos(a) * sp * 0.7, vy: Math.sin(a) * sp - 120 * (R / 800), rot: potWorld.a, spin: rnd(-9, 9) })
    }
    for (const g of garland) {
      debris.push({ kind: 'bloom', size: g.s * potR * 1.6, x: px + g.x * potR, y: py + (g.y + 0.1) * potR, vx: g.x * 160 * (R / 800) + rnd(-60, 60), vy: rnd(-220, -20) * (R / 800), rot: rnd(0, TAU), spin: rnd(-6, 6) })
    }
    for (const fl of flags) {
      debris.push({ kind: 'flag', c: fl.c, x: px + fl.dx * potR, y: py + fl.dy * potR * 1.45, vx: fl.dx * 200 * (R / 800), vy: rnd(-180, -40) * (R / 800), rot: 0, spin: rnd(-5, 5), size: potR * 0.5 })
    }
    // the burst of dahi from inside the pot
    const n = Math.round((low || thin ? 120 : 190) * (bursts / 8))
    for (let i = 0; i < n; i += 1) {
      const a = rnd(0, TAU)
      const rr = Math.sqrt(Math.random()) * potR * 0.85
      const x = px + Math.cos(a) * rr
      const y = py + Math.sin(a) * rr * 0.9
      dahi.push({ x, y, vx: (x - px) * rnd(4, 8) + rnd(-120, 120), vy: (y - py) * rnd(2, 5) + rnd(-230, 20), r: rnd(R * 0.008, R * 0.017), state: 'fly', sx: 1, life: 0 })
    }
    for (let i = 0; i < 14; i += 1) {
      const a = rnd(0, TAU)
      sparks.push({ x: px, y: py, vx: Math.cos(a) * rnd(100, 380), vy: Math.sin(a) * rnd(100, 380) - 60, life: 0, max: rnd(0.4, 0.9) })
    }
  }

  // the places dahi can land: heads, shoulders and chests of the kids, each a circle that moves with them
  function buildSurfaces() {
    surfaces = []
    for (const f of [TP, TL, TR, B, A, C]) {
      if (!f.vis) continue
      const h = Wp(f, 0, -0.915)
      surfaces.push({ x: h[0], y: h[1], r: 0.105 * f.s, f })
      for (const s of [-1, 1]) {
        const sh = Wp(f, s * (SH - 0.01), -0.78)
        surfaces.push({ x: sh[0], y: sh[1], r: 0.075 * f.s, f })
      }
      const ch = Wp(f, 0, -0.66)
      surfaces.push({ x: ch[0], y: ch[1], r: 0.125 * f.s, f })
    }
  }

  function stepDahi(dt) {
    const g = 1250 * (R / 800)
    const cap = low || thin ? 320 : 560
    for (const p of dahi) {
      p.life += dt
      if (p.state === 'fly') {
        p.vy += g * dt
        p.vx *= Math.exp(-0.5 * dt)
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.vy > 0) {
          for (const s of surfaces) {
            if (p.skip === s) continue
            const d = Math.hypot(p.x - s.x, p.y - s.y)
            if (d < s.r + p.r * 0.45) {
              p.state = 'slide'
              p.on = s
              p.ang = Math.atan2(p.y - s.y, p.x - s.x)
              p.dir = p.x >= s.x ? 1 : -1
              p.hold = rnd(0.35, 1.1)
              p.t0 = p.life
              s.f.splash += 0.06
              break
            }
          }
        }
        if (p.state === 'fly' && p.y > GY - p.r * 0.3) {
          p.state = 'ground'
          p.y = GY - p.r * 0.2 + rnd(-p.r * 0.25, p.r * 0.1)
          p.vx *= 0.3
          p.sx = 1.2
        }
      } else if (p.state === 'slide') {
        const s = p.on
        const w = (1.2 + Math.abs(Math.cos(p.ang)) * 1.8) * p.dir
        p.ang += w * dt
        const rr = s.r + p.r * 0.4
        p.x = s.x + Math.cos(p.ang) * rr
        p.y = s.y + Math.sin(p.ang) * rr
        const past = p.dir > 0 ? p.ang > 0.3 : p.ang < -Math.PI - 0.3
        if (p.life - p.t0 > p.hold || past) {
          p.state = 'fly'
          p.vx = Math.cos(p.ang + (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2)) * 40 + rnd(-10, 10)
          p.vy = 30
          p.skip = s
        }
      } else if (p.state === 'ground') {
        p.x += p.vx * dt
        p.vx *= Math.exp(-3 * dt)
        p.sx = Math.min(3.2, p.sx + dt * 1.6)
      }
    }
    // the pour that follows the burst: the rest of the dahi falling from where the pot was
    if (hitAt >= 0 && t < hitAt + 1.0) {
      let c = (low || thin ? 130 : 230) * (bursts / 8) * dt
      while (Math.random() < c) {
        if (dahi.length < cap) dahi.push({ x: potWorld.x + rnd(-0.9, 0.9) * potR, y: potWorld.y + rnd(0, 0.6) * potR, vx: rnd(-40, 40), vy: rnd(20, 120), r: rnd(R * 0.008, R * 0.017), state: 'fly', sx: 1, life: 0 })
        c -= 1
      }
    }
    if (dahi.length > cap) {
      // the oldest in the air go first; the puddle stays
      let extra = dahi.length - cap
      dahi = dahi.filter((p) => !(extra > 0 && p.state !== 'ground' && extra-- > 0))
    }
    dahi = dahi.filter((p) => p.y < H + 60)
  }

  function drawDahi() {
    if (!dahi.length) return
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const p of dahi) {
      const w = p.r * 3.4 * p.sx
      const h = p.r * 3.4 * (p.state === 'ground' ? 0.7 : 1)
      x0 = Math.min(x0, p.x - w)
      y0 = Math.min(y0, p.y - h)
      x1 = Math.max(x1, p.x + w)
      y1 = Math.max(y1, p.y + h)
    }
    const rx0 = clamp(Math.floor((x0 - 4) * q), 0, lw - 1)
    const ry0 = clamp(Math.floor((y0 - 4) * q), 0, lh - 1)
    const rx1 = clamp(Math.ceil((x1 + 4) * q), 1, lw)
    const ry1 = clamp(Math.ceil((y1 + 4) * q), 1, lh)
    const rw = rx1 - rx0
    const rh = ry1 - ry0
    if (rw < 3 || rh < 3) return
    accCtx.clearRect(rx0, ry0, rw, rh)
    accCtx.globalCompositeOperation = 'source-over'
    for (const p of dahi) {
      const w = p.r * 3.4 * q * p.sx
      // a drop stretches along its fall
      const stretch = p.state === 'fly' ? 1 + clamp(Math.abs(p.vy) / 900) * 0.8 : p.state === 'ground' ? 0.7 : 1
      const h = p.r * 3.4 * q * stretch
      accCtx.drawImage(BLOB, p.x * q - w / 2, p.y * q - h / 2, w, h)
    }
    const img = accCtx.getImageData(rx0, ry0, rw, rh)
    const d = img.data
    const out = outCtx.createImageData(rw, rh)
    const o = out.data
    const alphaAt = (x, y) => d[(clamp(y, 0, rh - 1) * rw + clamp(x, 0, rw - 1)) * 4 + 3] / 255
    for (let y = 0; y < rh; y += 1) {
      for (let x = 0; x < rw; x += 1) {
        const a = d[(y * rw + x) * 4 + 3] / 255
        if (a < 0.38) continue
        const m = smooth(0.42, 0.6, a)
        const gx = alphaAt(x + 1, y) - alphaAt(x - 1, y)
        const gy = alphaAt(x, y + 1) - alphaAt(x, y - 1)
        const lit = clamp(0.5 + (gx * 0.62 + gy * 0.78) * 2.2, 0, 1)
        const rim = (1 - smooth(0.56, 0.78, a)) * 0.22
        const k = 0.92 + 0.16 * lit - rim
        const spec = lit > 0.82 ? (lit - 0.82) * 190 : 0
        const i = (y * rw + x) * 4
        o[i] = clamp(250 * k + spec, 0, 255)
        o[i + 1] = clamp(240 * k + spec, 0, 255)
        o[i + 2] = clamp(222 * k + spec * 0.9, 0, 255)
        o[i + 3] = 250 * m
      }
    }
    outCtx.clearRect(rx0, ry0, rw, rh)
    outCtx.putImageData(out, rx0, ry0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(outc, rx0, ry0, rw, rh, rx0 / q, ry0 / q, rw / q, rh / q)
  }

  // ── each frame ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const frame = (now) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016)
    last = now
    t += dt
    const mode = guard(now)
    thin = mode !== 'full'
    if (mode === 'stop') return end()
    if (hitAt >= 0 && t > hitAt + (still ? 2.5 : AFTER)) return end()
    if (breakAt < 0 && t > IDLE_END) return end()

    const fadeOut = hitAt >= 0 ? clamp((hitAt + (still ? 2.5 : AFTER) - t) / 1.3) : 1
    const env = Math.min(1, t / 0.8) * fadeOut
    canvas.style.background = `radial-gradient(ellipse at 50% 60%, rgba(70,28,18,${0.55 * env}) 0%, rgba(24,14,40,${0.78 * env}) 60%, rgba(8,6,24,${0.88 * env}) 100%)`
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // the page waits for the click only once the pyramid stands
    if (t >= READY && canvas.style.pointerEvents !== 'auto') {
      canvas.style.pointerEvents = 'auto'
      setShowHint(end, coarse ? 'Tap the matka to break it  ·  tap anywhere else to close' : 'Click the matka to break it  ·  Esc to close')
    }
    if (hitAt >= 0 && t >= hitAt && !broken) {
      breakPot()
      setShowHint(end, '')
    }

    // night: stars and warm lights
    for (const s of stars) {
      ctx.globalAlpha = env * (0.35 + 0.35 * Math.sin(t * s.f + s.ph))
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, TAU)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'lighter'
    for (const m of motes) {
      ctx.globalAlpha = env * (0.07 + 0.05 * Math.sin(t * m.f + m.ph))
      const sz = m.r * 2
      ctx.drawImage(sprites['#ffb347'], m.x - sz / 2, m.y - sz / 2, sz, sz)
    }
    // a warm pool of light on the ground under the pyramid
    ctx.globalAlpha = env * 0.35
    const pw = fh * 3.2
    ctx.drawImage(sprites['#ffb347'], cx - pw / 2, GY - pw * 0.13, pw, pw * 0.26)
    ctx.globalCompositeOperation = 'source-over'
    // the ground: a soft shadow under the kids
    ctx.globalAlpha = env * 0.4
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(cx, GY + fh * 0.02, fh * 0.85, fh * 0.07, 0, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = env

    // the pot comes down from the top at the start
    const potDrop = still ? 1 : easeOutBack(clamp((t - POT_IN) / 0.9))
    ctx.save()
    ctx.translate(0, -(1 - potDrop) * (POT_CY0 + 100))
    drawPot(t, env)
    ctx.restore()
    potWorld.y -= (1 - potDrop) * (POT_CY0 + 100)

    // the kids, tier by tier, back to front
    const wob = still ? 0 : wobble(t)
    const cheerK = hitAt >= 0 ? easeOut(clamp((t - hitAt - 0.1) / 0.5)) : 0
    const sway = (amp, ph) => (still ? 0 : amp * Math.sin(t * 1.7 + ph)) + wob
    for (const f of [A, B, C]) place(f, t)
    A.lean = sway(0.004, A.phase) * 0.4
    B.lean = sway(0.004, B.phase) * 0.4
    C.lean = sway(0.004, C.phase) * 0.4
    for (const f of [A, B, C]) f.lean *= 1 + cheerK * 2
    // the upper tiers lean with the ones they stand on
    place(TL, t)
    place(TR, t)
    TL.lean = (A.lean + B.lean) / 2 + sway(0.007, TL.phase) * (1 + cheerK) * 0.9
    TR.lean = (B.lean + C.lean) / 2 + sway(0.007, TR.phase) * (1 + cheerK) * 0.9
    place(TL, t)
    place(TR, t)
    place(TP, t)
    TP.lean = (TL.lean + TR.lean) / 2 + sway(0.011, TP.phase) * 1.2 + (hitAt >= 0 ? 0.03 * Math.exp(-Math.max(0, t - hitAt) * 3) * Math.sin(Math.max(0, t - hitAt) * 12) : 0)

    const fps = new Map(kids.map((f) => [f, f.vis ? feet(f) : null]))
    ctx.globalAlpha = env
    // upper kids' legs go behind the kids below them; their feet are put on top afterwards
    for (const f of [TP, TL, TR]) if (f.vis) drawLegs(f, fps.get(f))
    for (const f of [A, B, C]) if (f.vis) drawLegs(f, fps.get(f))
    for (const f of [A, B, C]) if (f.vis) drawFeet(f, fps.get(f))
    for (const f of [A, B, C]) drawKid(f, 'body', t, cheerK)
    for (const f of [A, B, C]) {
      if (!f.vis) continue
      const tg = armTargets(f, cheerK, t)
      drawArm(f, -1, tg[0])
      drawArm(f, 1, tg[1])
    }
    for (const f of [TL, TR]) if (f.vis) drawFeet(f, fps.get(f))
    for (const f of [TL, TR]) drawKid(f, 'body', t, cheerK)
    for (const f of [TL, TR]) {
      if (!f.vis) continue
      const tg = armTargets(f, cheerK, t)
      drawArm(f, -1, tg[0])
      drawArm(f, 1, tg[1])
    }
    if (TP.vis) {
      drawFeet(TP, fps.get(TP))
      drawTopKid(t, cheerK)
    }

    // debris: shards, marigolds and flags
    debris = debris.filter((d) => {
      d.vy += 1500 * (R / 800) * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.rot += d.spin * dt
      if (d.y > GY + fh * 0.1 && d.kind === 'shard') {
        d.y = GY + fh * 0.1
        d.vy *= -0.25
        d.vx *= 0.5
        d.spin *= 0.4
      }
      if (d.y > H + 80) return false
      ctx.save()
      ctx.globalAlpha = env
      ctx.translate(d.x, d.y)
      ctx.rotate(d.rot)
      if (d.kind === 'shard') ctx.drawImage(d.s.sprite, (-d.s.w / 2) * potK, (-d.s.h / 2) * potK, d.s.w * potK, d.s.h * potK)
      else if (d.kind === 'bloom') ctx.drawImage(bloom, -d.size / 2, -d.size / 2, d.size, d.size)
      else {
        ctx.fillStyle = d.c
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(d.size, d.size * 0.1)
        ctx.lineTo(0, d.size * 0.5)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      return true
    })

    // the dahi
    if (broken) {
      buildSurfaces()
      if (!still) stepDahi(dt)
      ctx.globalAlpha = env
      drawDahi()
    }

    // sparks off the break
    ctx.globalCompositeOperation = 'lighter'
    sparks = sparks.filter((s) => {
      s.life += dt
      const k = s.life / s.max
      if (k >= 1) return false
      s.vx *= Math.exp(-2.2 * dt)
      s.vy = s.vy * Math.exp(-2.2 * dt) + 300 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      ctx.globalAlpha = (1 - k) * env
      const r = 7 * (1 - k * 0.5)
      ctx.drawImage(sprites['#ffd166'], s.x - r, s.y - r, r * 2, r * 2)
      return true
    })
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return end
}
