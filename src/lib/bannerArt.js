import { GULAL_BOX, GULAL_PIECES } from '@/lib/bannerGulal'
import { EARTH_GLOBE, PLANT_BOX, PLANT_PIECES } from '@/lib/bannerEarthday'
// Ready-made pictures for banners: small outlined illustrations made of several coloured pieces, drawn on a 100 x 100 frame
// and shown at the layer's width and height. Their colours are part of the picture, so they are not recoloured in the editor.

const ARGS = { M: 2, L: 2, C: 6, Q: 4, H: 1, V: 1, Z: 0, A: 7 }

// Turns path data written on the 100 x 100 frame into the centred unit box the banner's shapes use.
function frame(d) {
  const t = d.match(/[a-zA-Z]|-?\d*\.?\d+/g)
  let out = ''
  let i = 0
  let cmd = ''
  const n = (v) => +v.toFixed(4)
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++]
    if (cmd === 'Z') { out += 'Z'; continue }
    const nums = t.slice(i, i + ARGS[cmd]).map(Number)
    i += ARGS[cmd]
    let v
    if (cmd === 'H') v = [(nums[0] - 50) / 100]
    else if (cmd === 'V') v = [(nums[0] - 50) / 100]
    else if (cmd === 'A') v = [nums[0] / 100, nums[1] / 100, nums[2], nums[3], nums[4], (nums[5] - 50) / 100, (nums[6] - 50) / 100]
    else v = nums.map((x) => (x - 50) / 100)
    out += cmd + v.map(n).join(',')
  }
  return out
}

const rr = (x, y, w, h, r) => `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`
const circ = (cx, cy, r) => `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`
const INK = '#0F172A'
const piece = (d, fill, sw = 3, extra = {}) => ({ d: frame(d), fill, stroke: sw ? INK : undefined, sw: sw / 100, ...extra })
const line = (d, color, sw) => ({ d: frame(d), fill: 'none', stroke: color, sw: sw / 100, round: true })

// The same, for artwork traced on a 500 x 500 canvas.
const big = (d) => frame(d.replace(/-?\d*\.?\d+/g, (x) => String(Number(x) / 5)))
const LINE = '#2a2540'
const ink = (d, w = 1.5) => ({ d: big(d), fill: 'none', stroke: LINE, sw: w / 100, round: true })
const blob = (d, fill) => ({ d: big(d), fill, stroke: undefined, sw: 0 })
// a petal and its mirror image about the lotus's middle (x = 262)
const mirror = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => `${524 - Number(x)},${y}`)
const LOTUS = [
  'M262,316 C224,346 226,398 262,430 C298,398 300,346 262,316 Z',
  'M224,348 C176,366 168,414 250,434 C222,410 216,380 224,348 Z',
  'M186,384 C146,396 146,428 246,438 C206,428 190,410 186,384 Z',
  'M156,414 C156,432 206,442 242,440 C210,438 178,430 156,414 Z',
]
const lotusLines = [...LOTUS, ...LOTUS.slice(1).map(mirror)].map((d) => ink(d, 1.15))

const ART_RAW = {}
export const ART = {
  artlotus: [
    blob('M150,372 C150,340 192,332 226,338 C256,312 306,310 322,334 C348,346 392,376 380,420 C366,452 300,452 270,446 C226,452 160,442 150,402 Z', '#B9A0D9'),
    ...lotusLines,
    ink('M142,424 C200,440 330,440 384,414', 1.3),
  ],
  artwoman: [
    blob('M118,104 C112,76 148,56 186,70 C216,86 248,94 286,92 C312,92 308,150 270,168 C230,176 170,172 140,150 C124,140 120,122 118,104 Z', '#FBD9A1'),
    blob('M150,372 C150,340 192,332 226,338 C256,312 306,310 322,334 C348,346 392,376 380,420 C366,452 300,452 270,446 C226,452 160,442 150,402 Z', '#B9A0D9'),
    ink('M268,0 C242,30 212,50 190,72 C160,98 140,132 140,186 C140,252 176,302 240,309 C292,313 326,282 342,240', 1.25),
    ink('M346,160 C300,190 304,240 330,266 C342,300 336,340 344,372 C352,402 420,420 422,404 C422,392 396,396 380,408', 1.25),
    ink('M58,456 C140,436 200,452 252,434', 1.4),
    ink('M156,110 C186,86 226,90 246,108', 1.4), ink('M284,106 C304,92 336,92 352,106', 1.4),
    ink('M160,140 C180,154 216,154 236,140', 2.2), ink('M286,140 C306,154 336,152 346,140', 2.2),
    ink('M168,148 L162,158 M184,152 L180,163 M200,153 L198,164 M218,151 L218,162', 1.1), ink('M296,148 L292,158 M312,152 L310,163 M328,151 L328,162', 1.1),
    ink('M252,160 C246,190 232,206 230,214 C236,224 264,224 272,214', 1.4), ink('M264,158 C272,186 274,204 270,213', 1.2),
    ink('M218,246 C236,238 250,236 258,241 C268,236 282,238 296,246 C280,264 238,264 218,246 Z', 1.4), ink('M218,246 C246,252 270,252 296,246', 1.2),
    ...lotusLines,
  ],
  arthat: [
    piece('M16 64 C16 34 32 18 50 18 C68 18 84 34 84 64 Z', '#22C55E', 3.5),
    piece('M43 18.5 C43 32 44 48 44 64 L56 64 C56 48 57 32 57 18.5 Z', '#16A34A', 3),
    line('M26 40 C32 28 42 22 50 22', '#86EFAC', 3),
    piece('M10 64 C10 61 14 60 20 60 L80 60 C86 60 90 61 90 64 C90 70 82 72 50 72 C18 72 10 70 10 64 Z', '#15803D', 3.5),
    piece(rr(38, 55, 24, 6, 2), '#86EFAC', 2.5),
  ],
  artcone: [
    piece('M14 80 L86 80 L78 88 L22 88 Z', '#EA580C', 3.5),
    piece('M46 16 L54 16 L57 32 L43 32 Z', '#F97316', 3),
    piece('M43 32 L57 32 L60 46 L40 46 Z', '#F8FAFC', 3),
    piece('M40 46 L60 46 L64 60 L36 60 Z', '#F97316', 3),
    piece('M36 60 L64 60 L68 74 L32 74 Z', '#F8FAFC', 3),
    piece('M32 74 L68 74 L70 80 L30 80 Z', '#EA580C', 3),
  ],
  artgear: [
    piece('M44 14 L56 14 L57 23 C60 24 63 26 66 28 L74 23 L81 30 L76 38 C78 41 80 44 81 47 L90 48 L90 60 L81 61 C80 64 78 67 76 70 L81 78 L74 85 L66 80 C63 82 60 84 57 85 L56 94 L44 94 L43 85 C40 84 37 82 34 80 L26 85 L19 78 L24 70 C22 67 20 64 19 61 L10 60 L10 48 L19 47 C20 44 22 41 24 38 L19 30 L26 23 L34 28 C37 26 40 24 43 23 Z', '#94A3B8', 3.5),
    piece(circ(50, 54, 18), '#64748B', 3),
    piece(circ(50, 54, 9), '#F1F5F9', 2.5),
  ],
  artclipboard: [
    piece(rr(22, 16, 56, 74, 6), '#D97706', 3.5),
    piece(rr(28, 24, 44, 60, 3), '#FFFFFF', 2.5),
    piece(rr(38, 12, 24, 9, 3), '#94A3B8', 3),
    piece(circ(50, 16, 2.5), '#F8FAFC', 0),
    piece(rr(33, 34, 8, 8, 1.5), '#DCFCE7', 0, { stroke: '#16A34A', sw: 0.02 }),
    line('M34 38 L37 41 L43 34', '#16A34A', 2), line('M46 38 L66 38', '#94A3B8', 2.5),
    piece(rr(33, 48, 8, 8, 1.5), '#DCFCE7', 0, { stroke: '#16A34A', sw: 0.02 }),
    line('M34 52 L37 55 L43 48', '#16A34A', 2), line('M46 52 L66 52', '#94A3B8', 2.5),
    piece(rr(33, 62, 8, 8, 1.5), '#F1F5F9', 0, { stroke: '#64748B', sw: 0.02 }),
    line('M46 66 L62 66', '#94A3B8', 2.5),
  ],
  artgoggles: [
    piece(rr(5, 40, 90, 18, 8), '#334155', 3),
    piece(rr(44, 43, 12, 9, 2), '#475569', 2.5),
    piece(rr(11, 31, 36, 34, 13), '#BAE6FD', 3),
    piece(rr(53, 31, 36, 34, 13), '#BAE6FD', 3),
    line('M18 40 C21 37 27 36 32 36', '#FFFFFF', 2.5),
    line('M60 40 C63 37 69 36 74 36', '#FFFFFF', 2.5),
  ],
}

// ── wider pictures, drawn on their own canvas (coordinates as written, not on the 100 x 100 frame) ──
export const ARTBOX = { artdraft: [232, 170], artcircuit: [320, 220], artlabour: [280, 220], artsite: [300, 220], artskyline: [560, 300], artcharkha: [372, 250], artdiwali: [340, 260], artearth: [260, 240] }
const R = (d, fill, sw = 2.5, extra = {}) => ({ d, fill, stroke: sw ? INK : undefined, sw, ...extra })
const RL = (d, color, sw, extra = {}) => ({ d, fill: 'none', stroke: color, sw, round: true, ...extra })
const GEAR = 'M-8 -28 L8 -28 L6 -20 C10 -19 14 -16 18 -13 L25 -16 L31 -7 L24 -1 C25 3 25 7 24 11 L31 17 L25 26 L18 23 C14 26 10 29 6 30 L8 38 L-8 38 L-6 30 C-10 29 -14 26 -18 23 L-25 26 L-31 17 L-24 11 C-25 7 -25 3 -24 -1 L-31 -7 L-25 -16 L-18 -13 C-14 -16 -10 -19 -6 -20 Z'
const gear = (x, y, k, body, light, hub) => {
  const t = `translate(${x} ${y}) scale(${k})`
  return [
    R(GEAR, body, 2.6 / k, { t }),
    { d: 'M-17 -4 C-14 -14 -6 -19 3 -19 C-6 -14 -12 -8 -17 -4 Z', fill: light, t },
    R(circ(0, 5, 11), hub, 2.2 / k, { t }),
    R(circ(0, 5, 4), body, 0, { t }),
  ]
}
// a tiny engineer in a hard hat and orange vest; `dir` turns them to face left (-1) or right (1)
const person = (x, y, dir, tool) => [
  R(rr(x - 5, y + 16, 4.5, 13, 1.5), '#1E3A8A', 1.6), R(rr(x + 0.5, y + 16, 4.5, 13, 1.5), '#1E3A8A', 1.6),
  R(rr(x - 7, y, 14, 18, 4), '#FB923C', 1.8),
  RL(`M${x + dir * 5} ${y + 5} L${x + dir * 13} ${y - 3}`, '#FB923C', 3.2),
  R(circ(x, y - 6, 5.2), '#FDD9B5', 1.6),
  R(`M${x - 6.5} ${y - 7} Q${x} ${y - 17} ${x + 6.5} ${y - 7} Z`, '#FACC15', 1.6),
  ...(tool ? [RL(`M${x + dir * 13} ${y - 3} L${x + dir * 19} ${y - 10}`, '#94A3B8', 2.6), R(circ(x + dir * 19.5, y - 10.5, 2.8), '#CBD5E1', 1.3)] : []),
]

ART_RAW.artdraft = [
  // steel truss tower and crane, behind the screen
  RL('M14 166 L14 30 M40 166 L40 30', '#2563EB', 3.2),
  RL('M14 56 L40 82 L14 108 L40 134 L14 160 M40 56 L14 82 L40 108 L14 134 L40 160', '#60A5FA', 1.4),
  RL('M14 56 H40 M14 82 H40 M14 108 H40 M14 134 H40', '#60A5FA', 1.4),
  RL('M6 30 H104', '#2563EB', 3.6), RL('M27 30 V10 M27 10 L104 30 M27 10 L2 30', '#60A5FA', 1.6), RL('M98 30 V46', '#334155', 1.5), R(circ(98, 49, 3), '#FB923C', 1.4),
  // the drafting tablet
  R(rr(46, 42, 152, 112, 10), '#1D4ED8', 3),
  { d: 'M52 46 H190 Q194 46 194 50 V54 H48 V50 Q48 46 52 46 Z', fill: '#3B82F6' },
  R(rr(58, 52, 128, 90, 5), '#FFFFFF', 2),
  ...[64, 76, 88].map((y) => R(circ(52, y, 2.4), '#93C5FD', 0)),
  RL('M70 52 V142 M58 122 H186', '#E2E8F0', 1.3, { dash: '3 3' }),
  RL('M66 64 H98 V80 H66 Z M104 64 H124 M66 94 H90 V110 H66 Z', '#BFDBFE', 1.4),
  R(circ(122, 98, 36), 'none', 1.4, { stroke: '#93C5FD', dash: '4 4' }),
  RL('M68 134 H176 M68 131 V137 M176 131 V137', '#94A3B8', 1.2),
  ...gear(122, 94, 1.0, '#2563EB', '#60A5FA', '#FFFFFF'),
  // a teal gear breaking out of the corner, and a compass over the top
  ...gear(178, 50, 0.64, '#0D9488', '#5EEAD4', '#FFFFFF'),
  R('M116 20 L101 70 L106 71 L119 28 L132 71 L137 70 L122 20 Z', '#334155', 2),
  R(circ(119, 16, 4.6), '#60A5FA', 2), R('M101 70 L103 78 L106 71 Z', '#CBD5E1', 1.2), R('M137 70 L135 78 L132 71 Z', '#CBD5E1', 1.2),
  // a caliper down the right-hand side
  R(rr(204, 24, 11, 108, 2), '#E2E8F0', 2),
  ...[34, 44, 54, 64, 74, 84, 94, 104, 114].map((y, i) => RL(`M204 ${y} H${i % 2 ? 209 : 212}`, '#64748B', 1)),
  R(rr(196, 30, 19, 7, 1.5), '#94A3B8', 1.8), R(rr(196, 62, 19, 7, 1.5), '#94A3B8', 1.8),
  // circuit traces and nodes
  RL('M215 100 H224 L229 105 V130', '#0D9488', 1.8), R(circ(229, 134, 2.6), '#2DD4BF', 0), RL('M215 80 H221 L226 75 V50', '#0D9488', 1.8), R(circ(226, 46, 2.6), '#2DD4BF', 0),
  RL('M92 154 V162 H76', '#38BDF8', 1.8), R(circ(73, 162, 2.6), '#38BDF8', 0), RL('M120 154 V166 H138', '#38BDF8', 1.8), R(circ(141, 166, 2.6), '#38BDF8', 0), RL('M160 154 V160 H176 L181 165 H196', '#38BDF8', 1.8), R(circ(199, 165, 2.6), '#38BDF8', 0),
  // more circuit traces: a bus of parallel lines under the tablet, branches along the top and right, vias and small chips
  RL('M104 154 V160 L110 166 H124 M112 154 V158 L116 162 H128', '#38BDF8', 1.2),
  RL('M146 154 V164 H152 L158 170', '#38BDF8', 1.2),
  RL('M174 154 V158 L180 164 H206 L212 158 H222', '#0D9488', 1.4), R(circ(225, 158, 2.2), '#FFFFFF', 1.2, { stroke: '#0D9488' }),
  RL('M215 28 H224 L229 33 V44 M215 38 H219 L222 41 V62', '#0D9488', 1.4), R(circ(229, 47, 2.2), '#FFFFFF', 1.2, { stroke: '#0D9488' }),
  RL('M215 110 H219 L224 115 H229 V122 M215 120 H221 L225 124', '#0D9488', 1.2),
  R(rr(206, 138, 20, 14, 2), '#CCFBF1', 1.6), RL('M209 138 V135 M214 138 V135 M219 138 V135 M223 138 V135 M209 152 V155 M214 152 V155 M219 152 V155 M223 152 V155', '#0D9488', 1.1),
  RL('M76 154 V160 H66 L60 154 V150', '#38BDF8', 1.2), R(circ(60, 147, 2.2), '#FFFFFF', 1.2, { stroke: '#38BDF8' }),
  RL('M70 154 H62 L56 148', '#38BDF8', 1.0),
  RL('M0 150 H14 L22 158 H40', '#38BDF8', 1.2), RL('M0 158 H10 L16 164 H34', '#38BDF8', 1.2), R(circ(42, 158, 2.2), '#FFFFFF', 1.2, { stroke: '#38BDF8' }), R(circ(36, 164, 2.2), '#FFFFFF', 1.2, { stroke: '#38BDF8' }),
  // a zigzag resistor on the bottom trace
  RL('M146 164 L150 160 L154 168 L158 160 L162 168 L166 162', '#38BDF8', 1.2),
  // two tiny engineers
  ...person(30, 132, 1, true), ...person(167, 31, -1, false),
  // sparkles
  R('M86 36 L88 29 L90 36 L97 38 L90 40 L88 47 L86 40 L79 38 Z', '#F59E0B', 0), R('M214 14 L215.5 9 L217 14 L222 15.5 L217 17 L215.5 22 L214 17 L209 15.5 Z', '#38BDF8', 0),
]

// A panel of printed-circuit line art: buses with 45-degree bends, vias, resistors and chips with pins. Meant to sit faintly behind other art.
const TEAL = '#0D9488'
const pcb = []
const via = (x, y) => R(circ(x, y, 3), '#FFFFFF', 1.3, { stroke: TEAL })
const chip = (x, y, w, h, pins) => {
  const out = [R(rr(x, y, w, h, 4), '#CCFBF1', 1.6, { stroke: TEAL })]
  for (let i = 1; i <= pins; i++) {
    const px = x + (w * i) / (pins + 1)
    const py = y + (h * i) / (pins + 1)
    out.push(RL(`M${px} ${y} V${y - 8} M${px} ${y + h} V${y + h + 8} M${x} ${py} H${x - 8} M${x + w} ${py} H${x + w + 8}`, TEAL, 1.2))
  }
  out.push(R(circ(x + 9, y + 9, 2.6), TEAL, 0))
  return out
}
for (let i = 0; i < 6; i++) {
  const y = 78 + i * 12
  pcb.push(RL(`M0 ${y} H${44 + i * 4} L${64 + i * 4} ${y - 24 - i * 3} H122`, TEAL, 1.3))
  pcb.push(RL(`M198 ${y} H${232 - i * 4} L${252 - i * 4} ${y + 22 + i * 3} H320`, TEAL, 1.3))
}
for (let i = 0; i < 5; i++) {
  const x = 140 + i * 11
  pcb.push(RL(`M${x} 62 V${40 - i * 2} L${x + 14} ${26 - i * 2} V0`, TEAL, 1.3), RL(`M${x} 158 V${176 + i * 2} L${x - 14} ${190 + i} V220`, TEAL, 1.3))
}
pcb.push(...chip(122, 80, 76, 68, 6), ...chip(236, 18, 46, 34, 4), ...chip(24, 150, 40, 30, 3))
pcb.push(RL('M262 52 V70 L278 86 H320', TEAL, 1.3), RL('M64 150 V130 L80 114 H104', TEAL, 1.3))
pcb.push(RL('M10 50 H40 L44 44 L50 56 L56 44 L62 56 L66 50 H96', TEAL, 1.3), RL('M222 190 H236 L240 184 L246 196 L252 184 L258 196 L262 190 H290', TEAL, 1.3))
;[[122, 54], [122, 30], [0, 50], [320, 86], [320, 146], [0, 190], [284, 220], [140, 0], [104, 114], [96, 50], [290, 190]].forEach(([x, y]) => pcb.push(via(x, y)))
ART_RAW.artcircuit = pcb

// a filled piece with no outline (optionally turned or moved by `t`)
const F = (d, fill, t) => ({ d, fill, sw: 0, t })

// A flat, leafy picture for Environment Day: the earth with a seedling growing from the soil, leaves, solar panels, wind turbines,
// birds and butterflies, and people planting and watering. The globe comes from a source file
// (see bannerEarthday.js); everything else is drawn here.
const vein = (d, c = 'rgba(0,0,0,0.18)', w = 1) => RL(d, c, w)
const folk = (x, y, shirt, pants, hair, kneel = false) => [
  F(circ(x, y - 18, 7.2), hair), F(circ(x + 0.4, y - 17, 6.2), '#F0C29B'),
  F(rr(x - 7, y - 11, 14, 22, 5), shirt),
  ...(kneel ? [F(rr(x - 6, y + 10, 18, 6, 3), pants), F(rr(x + 9, y + 10, 5, 13, 2.5), pants)] : [F(rr(x - 6, y + 10, 5.4, 25, 2.4), pants), F(rr(x + 0.8, y + 10, 5.4, 25, 2.4), pants), F(rr(x - 7.4, y + 33, 7.4, 3.4, 1.6), '#3b2a22'), F(rr(x + 0.2, y + 33, 7.4, 3.4, 1.6), '#3b2a22')]),
]
const panel = (pts, leg) => {
  const [a, b, c, d] = pts
  const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
  const grid = []
  for (let i = 1; i < 4; i++) { const t = i / 4; const m1 = mix(a, b, t); const m2 = mix(d, c, t); grid.push(`M${m1[0]} ${m1[1]} L${m2[0]} ${m2[1]}`) }
  for (let i = 1; i < 3; i++) { const t = i / 3; const m1 = mix(a, d, t); const m2 = mix(b, c, t); grid.push(`M${m1[0]} ${m1[1]} L${m2[0]} ${m2[1]}`) }
  return [RL(leg, '#8a6a4a', 2), F(`M${a} L${b} L${c} L${d} Z`.replace(/,/g, ' '), '#3D84CF'), RL(grid.join(' '), '#E8F2FC', 0.8)]
}
const blades = (x, y, k) => [
  F(`M${x} ${y} L${x - 2 * k} ${y - 24 * k} L${x + 2 * k} ${y - 24 * k} Z`, '#F2B987'),
  F(`M${x} ${y} L${x + 22 * k} ${y + 12 * k} L${x + 20 * k} ${y + 16 * k} Z`, '#F2B987'),
  F(`M${x} ${y} L${x - 22 * k} ${y + 12 * k} L${x - 20 * k} ${y + 16 * k} Z`, '#F2B987'),
  F(circ(x, y, 2.6 * k), '#E39A5C'),
]
ART_RAW.artearth = [
  // leaves behind the globe
  F('M20 92 C14 84 22 76 30 80 C32 70 44 70 46 78 C56 72 66 82 58 90 C68 94 66 106 56 104 C60 114 48 120 42 112 C34 122 22 114 28 104 C16 106 12 96 20 92 Z', '#E07A3A'), vein('M24 98 C36 94 46 92 58 90'),
  F('M30 62 C40 30 70 22 92 34 C82 64 56 80 30 60 Z', '#4E8A4A'), vein('M34 60 C54 52 72 42 90 36', 'rgba(255,255,255,0.25)'),
  F('M10 150 C30 128 72 138 102 176 C70 192 30 182 10 150 Z', '#3F7F4A'), vein('M16 152 C44 150 74 160 98 176', 'rgba(255,255,255,0.2)'),
  F('M68 120 C72 152 96 178 124 186 C120 154 100 128 68 120 Z', '#9DBB5A'), vein('M72 124 C92 144 108 164 122 184'),
  F('M198 58 C214 80 214 112 196 126 C190 100 192 80 198 58 Z', '#9BBF5A'),
  // wind turbines behind the globe
  F('M205 36 L207 36 L211 160 L201 160 Z', '#EDAE78'), ...blades(206, 34, 1),
  F('M237 70 L239 70 L242 150 L234 150 Z', '#EDAE78'), ...blades(238, 70, 0.7),
  // the earth
  ...EARTH_GLOBE,
  // solar panels
  ...panel([[60, 40], [100, 33], [107, 52], [67, 60]], 'M84 58 V74'),
  ...panel([[200, 152], [236, 138], [247, 166], [211, 180]], 'M224 166 V196'),
  // a patch of ground for the people to stand on
  F('M40 214 C70 204 120 200 150 202 C190 200 230 206 252 216 C220 224 70 226 40 214 Z', '#B9D58A'),
  // orange oak leaf and green leaves at the right
  F('M190 130 C210 118 226 122 232 132 C218 152 200 152 190 132 Z', '#E07A3A'),
  F('M176 160 C196 150 214 154 218 164 C206 180 186 178 176 160 Z', '#4E8A4A'),
  // people: watering, tending, kneeling, planting
  ...folk(46, 154, '#F0A24A', '#2E7D6F', '#5A3A28'),
  RL('M52 152 L68 156', '#F0A24A', 3.4), F(rr(64, 152, 13, 9, 2.5), '#E07A3A'), RL('M76 154 L88 150', '#E07A3A', 2), RL('M90 152 L100 162 M94 150 L106 158 M98 148 L110 154', '#6FB7E6', 1.3),
  ...folk(190, 122, '#E8743A', '#2E6B5A', '#2F2A28'), RL('M184 124 L172 132', '#E8743A', 3.4),
  ...folk(176, 192, '#E8743A', '#2E6B5A', '#5A3A28', true),
  ...folk(232, 184, '#E8743A', '#2E6B5A', '#2F2A28'), RL('M226 188 L210 200', '#E8743A', 3.4),
  RL('M206 214 V196', '#4C8A3A', 2), F('M206 200 C198 192 200 186 208 188 C210 194 208 198 206 200 Z', '#5FA04A'), F('M206 196 C212 188 220 190 220 196 C216 200 210 200 206 196 Z', '#79B04A'),
  // birds, butterflies and a breath of wind
  RL('M56 20 Q62 13 68 20 Q74 13 80 20', '#2B5F7D', 1.6), RL('M24 44 Q28 40 32 44 Q36 40 40 44', '#2B5F7D', 1.3),
  F('M236 100 C230 92 226 100 234 104 Z', '#F08A3C'), F('M236 100 C244 92 248 100 240 104 Z', '#F4A15E'), F('M36 34 C30 28 26 36 34 38 Z', '#F08A3C'), F('M36 34 C44 28 48 36 40 38 Z', '#F4A15E'),
  RL('M160 16 C174 4 192 12 204 2', '#9BB5A0', 1.3), RL('M164 26 C176 16 190 22 200 14', '#9BB5A0', 1,),
]

// Labour Day: a worker in a hard hat and safety vest, a wrench in hand, in front of a big slate gear and a diagonal steel truss.
const BIGGEAR = 'M-12 -58 L12 -58 L10 -44 C18 -41 24 -37 30 -32 L42 -38 L58 -22 L52 -10 C56 -4 58 2 60 10 L74 12 L74 36 L60 38 C58 46 56 52 52 58 L58 70 L42 86 L30 80 C24 85 18 89 10 92 L12 106 L-12 106 L-10 92 C-18 89 -24 85 -30 80 L-42 86 L-58 70 L-52 58 C-56 52 -58 46 -60 38 L-74 36 L-74 12 L-60 10 C-58 2 -56 -4 -52 -10 L-58 -22 L-42 -38 L-30 -32 C-24 -37 -18 -41 -10 -44 Z'
const gt = 'translate(180 120)'
const wt = 'translate(158 136) rotate(-20)'
const armL = 'M88 108 L74 126 L86 138'
ART_RAW.artlabour = [
  RL('M24 180 L180 24', '#2A3749', 12, { op: 0.6 }), RL('M50 180 L206 24', '#2A3749', 12, { op: 0.6 }),
  RL('M60 150 L80 120', '#64748B', 3, { op: 0.6 }), RL('M100 110 L120 80', '#64748B', 3, { op: 0.6 }), RL('M140 70 L160 40', '#64748B', 3, { op: 0.6 }),
  R(BIGGEAR, '#334155', 3.5, { t: gt, grad: ['#475569', '#1E293B', 0, 1] }),
  R(circ(0, 24, 30), '#0F172A', 2.5, { t: gt, stroke: '#64748B' }), F(circ(0, 24, 14), '#334155', gt),
  R('M92 144 L90 205 L108 205 L112 156 L116 156 L120 205 L138 205 L136 144 Z', '#1E293B', 3),
  R(rr(84, 202, 26, 10, 3), '#D97706', 2), R(rr(118, 202, 26, 10, 3), '#D97706', 2),
  R('M88 106 L140 106 L144 146 L84 146 Z', '#EA580C', 3),
  F('M100 106 H106 V146 H100 Z', '#FEF08A'), F('M122 106 H128 V146 H122 Z', '#FEF08A'), RL('M86 134 L142 134', '#FEF08A', 4, { round: false }),
  RL(armL, '#EA580C', 12), RL(armL, '#0F172A', 3), R(circ(86, 138, 6), '#FDBA74', 2),
  RL('M140 108 L156 122 L158 136', '#EA580C', 12), R(circ(158, 136, 6), '#FDBA74', 2),
  R(rr(-4, -36, 8, 68, 2), '#E2E8F0', 2.5, { t: wt }),
  R('M-11 -34 C-11 -44 -4 -48 0 -48 C4 -48 11 -44 11 -34 C11 -29 8 -26 5 -29 L3 -36 L-3 -36 L-5 -29 C-8 -26 -11 -29 -11 -34 Z', '#CBD5E1', 2, { t: wt }),
  R(circ(0, 32, 8), '#CBD5E1', 2, { t: wt }), F(circ(0, 32, 3.5), '#0F172A', wt),
  R('M108 96 H120 V108 H108 Z', '#FDBA74', 2), R(circ(114, 90, 14), '#FDBA74', 2.5),
  R('M98 84 C98 64 105 56 114 56 C123 56 130 64 130 84 Z', '#FBBF24', 3, { grad: ['#FBBF24', '#F59E0B', 1, 1] }),
  R('M94 84 C94 81 100 80 114 80 C128 80 134 81 134 84 C134 88 126 90 114 90 C102 90 94 88 94 84 Z', '#D97706', 2.5),
  F('M112 56 L112 80 L116 80 L116 56 Z', '#FEF08A'),
  F('M52 46 L54 40 L56 46 L62 48 L56 50 L54 56 L52 50 L46 48 Z', '#F59E0B'), F('M230 52 L232 48 L234 52 L238 53 L234 55 L232 59 L230 55 L226 53 Z', '#38BDF8'), F(circ(218, 184, 3), '#F59E0B'),
]
const sl = (d, w = 1.3, c = '#94A3B8') => RL(d, c, w)
ART_RAW.artsite = [
  // a tower crane
  sl('M214 218 V30 M232 218 V30', 2.4), sl('M214 60 L232 78 L214 96 L232 114 L214 132 L232 150 L214 168 L232 186 L214 204 M232 60 L214 78 L232 96 L214 114 L232 132 L214 150 L232 168 L214 186 L232 204', 1),
  sl('M150 30 H300 M223 30 V8 M223 8 L150 30 M223 8 L296 30', 2), sl('M170 30 V70', 1.2), F(rr(164, 70, 12, 12, 2), '#94A3B8'),
  // scaffolding
  sl('M20 218 V90 M60 218 V90 M100 218 V90 M20 120 H100 M20 150 H100 M20 180 H100 M20 90 H100', 1.6),
  sl('M20 90 L60 120 L20 150 L60 180 L20 218 M60 90 L100 120 L60 150 L100 180 L60 218', 1),
  // blueprint rectangles and a dimension line
  sl('M118 120 H196 V200 H118 Z M118 150 H196 M150 120 V200', 1.1), sl('M118 106 H196 M118 102 V110 M196 102 V110', 1),
]

// A silhouette of a working site, in two dark tones for depth: lattice tower cranes, a concrete frame going up, an excavator,
// an oil derrick and a distant skyline. Meant to sit faintly behind other art.
const FAR = '#34415E'
const NEAR = '#1E2842'
const GY = 268
const towerCrane = (x, gy, h, c) => {
  const w = h * 0.032 + 3
  const top = gy - h
  const lat = []
  const n = Math.max(6, Math.round(h / (w * 2.3)))
  const step = h / n
  for (let i = 0; i < n; i++) {
    const y0 = gy - i * step
    const y1 = y0 - step
    lat.push(i % 2 ? `M${x + w} ${y0} L${x - w} ${y1}` : `M${x - w} ${y0} L${x + w} ${y1}`, `M${x - w} ${y1} H${x + w}`)
  }
  const ah = h * 0.15
  const apex = top - ah
  const jl = h * 0.8
  const cl = h * 0.3
  const jh = h * 0.06
  const jib = [`M${x} ${top} H${x + jl}`, `M${x + w} ${top - jh} L${x + jl} ${top}`]
  const N = 14
  const dx = (jl - w) / N
  let zig = `M${x + w} ${top}`
  for (let k = 0; k < N; k++) {
    const xm = x + w + (k + 0.5) * dx
    zig += ` L${xm} ${top - jh * (1 - (k + 0.5) / N)} L${x + w + (k + 1) * dx} ${top}`
  }
  const counter = [`M${x - w} ${top - h * 0.025} L${x - cl} ${top - h * 0.01}`, `M${x} ${top} H${x - cl}`]
  const stays = [`M${x} ${apex} L${x + jl} ${top}`, `M${x} ${apex} L${x + jl * 0.55} ${top - jh * 0.45}`, `M${x} ${apex} L${x - cl} ${top}`, `M${x - w} ${top} L${x} ${apex} L${x + w} ${top}`]
  const tx = x + jl * 0.6
  return [
    RL(lat.join(' '), c, Math.max(1.1, h * 0.006)),
    RL(`M${x - w} ${gy} V${top} M${x + w} ${gy} V${top}`, c, Math.max(1.6, h * 0.011)),
    RL([...jib, zig, ...counter].join(' '), c, Math.max(1.1, h * 0.007)),
    RL(stays.join(' '), c, Math.max(0.8, h * 0.0035)),
    F(rr(x - w - 3, top - 4, 2 * w + 6, 8, 2), c), F(rr(x + w + 1, top + h * 0.012, h * 0.07, h * 0.055, 2), c),
    F(rr(x - cl - 2, top + 2, h * 0.075, h * 0.06, 1), c), F(rr(x - cl + h * 0.08, top + 2, h * 0.06, h * 0.05, 1), c),
    F(rr(tx - 3, top, 7, 6, 1), c), RL(`M${tx} ${top + 6} V${top + h * 0.34}`, c, 0.9),
    F(rr(tx - 11, top + h * 0.34, 22, 6, 1), c), F(rr(tx - 7, top + h * 0.34 + 6, 14, 5, 1), c), F(rr(x - w - 4, gy - 5, 2 * w + 8, 5), c),
  ]
}
const frameBuilding = (x, gy, c) => {
  const out = []
  const fl = 6
  const fh = 25
  for (let i = 0; i <= fl; i++) out.push(F(`M${x} ${gy - i * fh - 4} H${x + 122} V${gy - i * fh} H${x} Z`, c))
  ;[0, 30, 60, 91, 118].forEach((cx) => out.push(F(`M${x + cx} ${gy - fl * fh} h4 V${gy} h-4 Z`, c)))
  // rebar standing out of the top floor, and a hoist with a stack of pallets
  out.push(RL([0, 30, 60, 91, 118].map((cx) => `M${x + cx + 2} ${gy - fl * fh} V${gy - fl * fh - 14 - (cx % 3) * 3}`).join(' '), c, 1.2))
  out.push(RL(`M${x + 130} ${gy} V${gy - fl * fh - 8} M${x + 134} ${gy} V${gy - fl * fh - 8}`, c, 1.6), F(rr(x + 128, gy - 70, 10, 14, 1), c))
  out.push(RL(`M${x} ${gy - 3 * fh} L${x + 30} ${gy - 4 * fh} M${x + 60} ${gy - 3 * fh} L${x + 91} ${gy - 4 * fh}`, c, 0.9))
  // tiny workers on the slabs
  ;[[x + 14, gy - 4 * fh - 4], [x + 76, gy - 2 * fh - 4]].forEach(([wx, wy]) => out.push(F(circ(wx, wy - 14, 2.6), c), F(`M${wx - 3} ${wy - 11} h6 v11 h-6 Z`, c), F(`M${wx - 3.4} ${wy - 15.4} a3.4 3.4 0 0 1 6.8 0 Z`, c)))
  return out
}
const excavator = (x, gy, k, c) => [
  F(rr(x, gy - 14 * k, 68 * k, 14 * k, 7 * k), c), F(rr(x + 6 * k, gy - 36 * k, 44 * k, 22 * k, 4 * k), c),
  F(`M${x + 34 * k} ${gy - 36 * k} L${x + 36 * k} ${gy - 56 * k} L${x + 54 * k} ${gy - 56 * k} L${x + 60 * k} ${gy - 36 * k} Z`, c), F(rr(x, gy - 32 * k, 10 * k, 16 * k, 2 * k), c),
  RL(`M${x + 52 * k} ${gy - 34 * k} L${x + 88 * k} ${gy - 66 * k} L${x + 118 * k} ${gy - 30 * k}`, c, 7 * k),
  RL(`M${x + 50 * k} ${gy - 26 * k} L${x + 78 * k} ${gy - 52 * k}`, c, 2.4 * k),
  F(`M${x + 114 * k} ${gy - 30 * k} L${x + 134 * k} ${gy - 22 * k} L${x + 128 * k} ${gy - 6 * k} L${x + 108 * k} ${gy - 12 * k} Z`, c),
]
const derrick = (x, gy, h, c) => {
  const lines = [`M${x - 22} ${gy} L${x - 5} ${gy - h}`, `M${x + 22} ${gy} L${x + 5} ${gy - h}`]
  const diag = []
  const n = 9
  for (let i = 0; i < n; i++) {
    const t0 = i / n
    const t1 = (i + 1) / n
    const hw = (t) => 22 - 17 * t
    diag.push(`M${x - hw(t0)} ${gy - h * t0} L${x + hw(t1)} ${gy - h * t1} M${x + hw(t0)} ${gy - h * t0} L${x - hw(t1)} ${gy - h * t1}`, `M${x - hw(t1)} ${gy - h * t1} H${x + hw(t1)}`)
  }
  return [RL(lines.join(' '), c, 2.2), RL(diag.join(' '), c, 0.9), F(rr(x - 8, gy - h - 8, 16, 9, 1.5), c), RL(`M${x} ${gy - h - 8} V${gy - h - 18}`, c, 1.6), F(rr(x - 30, gy - 14, 60, 14, 2), c)]
}
const skyline = (c) => [[48, 70], [70, 118], [96, 84], [330, 74], [352, 104], [378, 66], [402, 90], [430, 60], [456, 96], [484, 72], [514, 110], [538, 80]].map(([bx, bh]) => F(`M${bx} ${GY} V${GY - bh} h${bx % 3 ? 22 : 18} V${GY} Z`, c))
ART_RAW.artskyline = [
  ...skyline(FAR),
  ...towerCrane(128, GY, 188, FAR), ...towerCrane(392, GY, 214, FAR),
  ...frameBuilding(52, GY, NEAR), ...derrick(520, GY, 150, NEAR),
  ...towerCrane(238, GY, 262, NEAR),
  ...excavator(286, GY, 0.92, NEAR),
  R(`M0 ${GY} H560 V300 H0 Z`, NEAR, 0, { grad: ['rgba(30,40,66,0)', NEAR, 0.3, 0] }),
]

// A charkha (spinning wheel) in clean line art: a spoked wheel with a notched rim, a pillar and hub, a long base rail and the
// spindle post at the right, joined by the drive cords.
const CK = '#4A4640'
const PAPER = '#F4ECDA'
const ring = (cx, cy, r) => circ(cx, cy, r)
const chark = () => {
  const cx = 120
  const cy = 112
  const out = []
  // base rail and the right-hand post, behind the wheel
  out.push(R(rr(110, 222, 236, 12, 2), PAPER, 2, { stroke: CK }))
  out.push(R(rr(302, 150, 26, 76, 6), PAPER, 2, { stroke: CK }), R(rr(326, 138, 26, 88, 6), PAPER, 2, { stroke: CK }))
  out.push(R(circ(339, 150, 7), PAPER, 2, { stroke: CK }), R(circ(339, 150, 2.6), CK, 0))
  out.push(R('M292 234 H362 L366 246 H288 Z', PAPER, 2, { stroke: CK }))
  // drive cords from the wheel to the spindle post
  out.push(RL('M196 46 L328 144 M208 76 L328 160 M214 110 L328 168', CK, 1.6))
  // the rim: two rings with a band of small notches around it
  out.push(R(ring(cx, cy, 100), 'none', 2.2, { stroke: CK }), R(ring(cx, cy, 92), 'none', 1.6, { stroke: CK }))
  let teeth = ''
  for (let i = 0; i < 44; i++) {
    const a = (Math.PI * 2 * i) / 44
    const pts = [[102, -2.4], [107, -2.4], [107, 2.4], [102, 2.4]].map(([rad, off]) => [cx + rad * Math.cos(a) - off * Math.sin(a), cy + rad * Math.sin(a) + off * Math.cos(a)])
    teeth += `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z `
  }
  out.push(R(teeth, PAPER, 1.3, { stroke: CK }))
  // spokes in pairs, each pair meeting at a small block on the inside of the rim
  let spokes = ''
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24
    const b1 = a - 0.05
    const b2 = a + 0.05
    spokes += `M${cx + 16 * Math.cos(a)} ${cy + 16 * Math.sin(a)} L${cx + 91 * Math.cos(b1)} ${cy + 91 * Math.sin(b1)} M${cx + 16 * Math.cos(a)} ${cy + 16 * Math.sin(a)} L${cx + 91 * Math.cos(b2)} ${cy + 91 * Math.sin(b2)} `
  }
  out.push(RL(spokes, CK, 1.1))
  let blocks = ''
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24
    blocks += `M${cx + 88 * Math.cos(a) - 3 * Math.sin(a)} ${cy + 88 * Math.sin(a) + 3 * Math.cos(a)} L${cx + 94 * Math.cos(a) - 3 * Math.sin(a)} ${cy + 94 * Math.sin(a) + 3 * Math.cos(a)} L${cx + 94 * Math.cos(a) + 3 * Math.sin(a)} ${cy + 94 * Math.sin(a) - 3 * Math.cos(a)} L${cx + 88 * Math.cos(a) + 3 * Math.sin(a)} ${cy + 88 * Math.sin(a) - 3 * Math.cos(a)} Z `
  }
  out.push(R(blocks, PAPER, 1.1, { stroke: CK }))
  // the pillar, the hub and the foot in front of the wheel
  out.push(R(rr(106, 108, 30, 112, 6), PAPER, 2.2, { stroke: CK }), RL('M114 126 V214 M128 126 V214', CK, 0.9))
  out.push(R(circ(cx, cy, 15), PAPER, 2.2, { stroke: CK }), R(circ(cx, cy, 8), PAPER, 2, { stroke: CK }), R(circ(cx, cy, 2.6), CK, 0))
  out.push(R('M72 224 H168 L176 238 H64 Z', PAPER, 2.2, { stroke: CK }), R(rr(66, 238, 108, 8, 2), PAPER, 2, { stroke: CK }))
  return out
}
ART_RAW.artcharkha = chark()

// Deepavali: a large ornate diya with a glowing flame and halo, a hanging kandil lantern, a lotus rangoli beneath, a marigold garland
// and starbursts. Gradients are written as {kind, x1, y1, x2, y2, stops: [[offset, colour, opacity]]} on the piece.
const lin = (x1, y1, x2, y2, stops) => ({ kind: 'linear', x1, y1, x2, y2, stops })
const rad = (stops) => ({ kind: 'radial', stops })
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
const G = (d, gd, sw = 0, extra = {}) => ({ d, fill: '#000', gd, stroke: sw ? INK : undefined, sw, ...extra })
// The marigold: ten round petals round a centre, in a yellow and an orange kind, each with a dark eye (the same flower as the Marigold shape).
const MARIGOLD = 'M0.17,0 A0.17,0.17 0 1,1 -0.17,0 A0.17,0.17 0 1,1 0.17,0 Z M0.4700,0.0000 A0.14,0.14 0 1,1 0.1900,0.0000 A0.14,0.14 0 1,1 0.4700,0.0000 Z M0.4070,0.1940 A0.14,0.14 0 1,1 0.1270,0.1940 A0.14,0.14 0 1,1 0.4070,0.1940 Z M0.2420,0.3138 A0.14,0.14 0 1,1 -0.0380,0.3138 A0.14,0.14 0 1,1 0.2420,0.3138 Z M0.0380,0.3138 A0.14,0.14 0 1,1 -0.2420,0.3138 A0.14,0.14 0 1,1 0.0380,0.3138 Z M-0.1270,0.1940 A0.14,0.14 0 1,1 -0.4070,0.1940 A0.14,0.14 0 1,1 -0.1270,0.1940 Z M-0.1900,0.0000 A0.14,0.14 0 1,1 -0.4700,0.0000 A0.14,0.14 0 1,1 -0.1900,0.0000 Z M-0.1270,-0.1940 A0.14,0.14 0 1,1 -0.4070,-0.1940 A0.14,0.14 0 1,1 -0.1270,-0.1940 Z M0.0380,-0.3138 A0.14,0.14 0 1,1 -0.2420,-0.3138 A0.14,0.14 0 1,1 0.0380,-0.3138 Z M0.2420,-0.3138 A0.14,0.14 0 1,1 -0.0380,-0.3138 A0.14,0.14 0 1,1 0.2420,-0.3138 Z M0.4070,-0.1940 A0.14,0.14 0 1,1 0.1270,-0.1940 A0.14,0.14 0 1,1 0.4070,-0.1940 Z'
const bloom = (x, y, k, fill, eye, eyeOp) => {
  const t = `translate(${x} ${y}) scale(${k})`
  return [{ d: MARIGOLD, fill, sw: 0, t }, { d: circ(0, 0, 0.0816), fill: eye, sw: 0, op: eyeOp, t }]
}
const marigoldYellow = (x, y, k) => bloom(x, y, k, '#F59E0B', '#7C2D12', 0.55)
const marigoldOrange = (x, y, k) => bloom(x, y, k, '#EA580C', '#431407', 0.6)
const sparkleAt = (x, y, r, fill, core) => [
  F(`M0 ${-r} L${r * 0.21} ${-r * 0.29} L${r} 0 L${r * 0.21} ${r * 0.29} L0 ${r} L${-r * 0.21} ${r * 0.29} L${-r} 0 L${-r * 0.21} ${-r * 0.29} Z`, fill, `translate(${x} ${y})`),
  ...(core ? [F(circ(0, 0, r * 0.18), '#FFFFFF', `translate(${x} ${y})`)] : []),
]
const kt = 'translate(60 10)'
const rt = 'translate(195 192)'
const dt = 'translate(195 172)'
const petal = (d, fill, stroke, op = 1) => ({ d, fill, stroke, sw: 1, op, round: false })
ART_RAW.artdiwali = [
  // hanging kandil
  { d: 'M28 0 L28 28', fill: 'none', stroke: '#FBBF24', sw: 1.2, dash: '2 2', t: kt },
  G('M28 28 L44 44 L28 60 L12 44 Z', lin(0, 0, 1, 1, [[0, '#F43F5E'], [0.5, '#E11D48'], [1, '#9F1239']]), 1.5, { stroke: '#FBBF24', t: kt }),
  { d: 'M28 34 L38 44 L28 54 L18 44 Z', fill: '#FEF08A', sw: 0, op: 0.85, t: kt },
  F('M12 44 L4 52 L14 50 Z', '#F59E0B', kt), F('M44 44 L52 52 L42 50 Z', '#F59E0B', kt),
  { d: 'M20 60 Q18 78 14 90 M24 60 Q24 82 23 94 M28 60 L28 96 M32 60 Q32 82 33 94 M36 60 Q38 78 42 90', fill: 'none', stroke: '#FBBF24', sw: 1.2, round: true, t: kt },
  // lotus rangoli beneath
  petal('M0 0 C-25 35 -65 35 -90 10 C-60 -10 -30 0 0 0 Z', '#047857', '#10B981', 0.9), petal('M0 0 C25 35 65 35 90 10 C60 -10 30 0 0 0 Z', '#047857', '#10B981', 0.9),
  petal('M0 0 C-45 40 -85 30 -115 25 C-85 0 -45 5 0 0 Z', '#047857', '#10B981', 0.9), petal('M0 0 C45 40 85 30 115 25 C85 0 45 5 0 0 Z', '#047857', '#10B981', 0.9),
  petal('M0 0 C-20 25 -50 30 -70 20 C-45 5 -20 2 0 0 Z', '#DC2626', '#F87171'), petal('M0 0 C20 25 50 30 70 20 C45 5 20 2 0 0 Z', '#DC2626', '#F87171'),
  petal('M0 0 C-10 30 -25 42 -40 38 C-25 15 -10 10 0 0 Z', '#DC2626', '#F87171'), petal('M0 0 C10 30 25 42 40 38 C25 15 10 10 0 0 Z', '#DC2626', '#F87171'),
  ...[[-110, 22, 2], [-85, 10, 2], [-65, 22, 2], [-38, 38, 2], [0, 44, 2.5], [38, 38, 2], [65, 22, 2], [85, 10, 2], [110, 22, 2]].map(([x, y, r]) => ({ d: circ(x, y, r), fill: '#FFFFFF', sw: 0, op: 0.95 })),
].map((q, i) => (i >= 6 ? { ...q, t: rt } : q)) // the first six pieces are the kandil; the rest sit on the rangoli's origin
ART_RAW.artdiwali.push(
  // the diya: pedestal, clay bowl, brass rim, oil and wick
  { d: 'M-32 24 C-20 34 20 34 32 24 L22 36 C12 40 -12 40 -22 36 Z', fill: '#7C2D12', stroke: '#451A03', sw: 2, t: dt },
  G('M-90 -6 C-84 28 -50 42 0 42 C50 42 84 28 90 -6 C55 10 -55 10 -90 -6 Z', lin(0, 0, 0, 1, [[0, '#D97706'], [0.3, '#B45309'], [0.7, '#9A3412'], [1, '#541C0A']]), 2.5, { stroke: '#451A03', t: dt }),
  { d: 'M-70 8 Q-35 28 0 28 Q35 28 70 8', fill: 'none', stroke: '#FDE68A', sw: 1.8, round: true, t: dt },
  ...[[-50, 16, 2.5], [-25, 22, 2.5], [0, 24, 3], [25, 22, 2.5], [50, 16, 2.5]].map(([x, y, r]) => ({ d: circ(x, y, r), fill: '#F59E0B', sw: 0, t: dt })),
  G(ell(0, -6, 90, 16), lin(0, 0, 1, 0, [[0, '#FDE68A'], [0.5, '#F59E0B'], [1, '#D97706']]), 2.5, { stroke: '#451A03', t: dt }),
  { d: ell(0, -6, 76, 11), fill: '#78350F', stroke: '#B45309', sw: 1.5, t: dt }, { d: ell(0, -5, 66, 7), fill: '#F59E0B', sw: 0, op: 0.35, t: dt },
  { d: 'M-8 -8 Q0 -18 0 -24', fill: 'none', stroke: '#FFFBEB', sw: 4.5, round: true, t: dt }, { d: 'M-8 -8 Q0 -18 0 -24', fill: 'none', stroke: '#78350F', sw: 2, round: true, t: dt },
  // the flame and its halo
  G(circ(195, 115, 75), rad([[0, '#FBBF24', 0.85], [0.35, '#F59E0B', 0.45], [0.7, '#EA580C', 0.18], [1, '#7C2D12', 0]])),
  G('M195 72 C183 95 172 118 177 134 C182 148 208 148 213 134 C218 118 207 95 195 72 Z', lin(0, 1, 0, 0, [[0, '#EA580C'], [0.45, '#F59E0B'], [0.85, '#FDE047'], [1, '#FFFFFF']])),
  G('M195 86 C188 102 182 120 186 132 C190 142 200 142 204 132 C208 120 202 102 195 86 Z', lin(0, 1, 0, 0, [[0, '#F59E0B'], [0.4, '#FDE047'], [1, '#FFFFFF']])),
  F(ell(195, 136, 4.5, 7), '#FFFFFF'),
  // marigold garland
  ...marigoldOrange(86, 194, 28), ...marigoldYellow(112, 208, 30), ...marigoldOrange(144, 218, 32),
  ...marigoldYellow(248, 218, 32), ...marigoldOrange(278, 208, 30), ...marigoldYellow(304, 194, 28),
  F('M98 202 C104 196 108 198 106 205 Z', '#15803D'), F('M128 214 C134 208 138 210 136 217 Z', '#15803D'), F('M264 214 C258 208 254 210 256 217 Z', '#15803D'), F('M292 202 C286 196 282 198 284 205 Z', '#15803D'),
  // starbursts and glints
  ...sparkleAt(290, 60, 14, '#FDE047', true), ...sparkleAt(135, 95, 10, '#FBBF24', true), ...sparkleAt(225, 42, 8, '#FDE68A', false),
  ...[[105, 140, 2, '#FDE047', 0.8], [120, 70, 1.5, '#F59E0B', 0.7], [160, 45, 2.5, '#FEF08A', 0.9], [265, 90, 2.2, '#FDE047', 0.85], [315, 125, 1.8, '#FBBF24', 0.7], [310, 160, 2, '#FEF08A', 0.8]].map(([x, y, r, c, o]) => ({ d: circ(x, y, r), fill: c, sw: 0, op: o })),
)

// the six plates of gulal, each on the canvas of its source artwork
Object.assign(ARTBOX, GULAL_BOX, PLANT_BOX)
Object.assign(ART_RAW, GULAL_PIECES, PLANT_PIECES)

export const isArt = (type) => type in ART || type in ART_RAW
export const artPieces = (type) => ART[type] || ART_RAW[type]
