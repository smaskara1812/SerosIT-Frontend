import { DEFAULT_DESIGN, cloneDesign, localDateString } from '@/lib/bannerDesign'
import { textBox } from '@/lib/bannerShapes'

// Occasion templates for Banner Events: a whole design (look, words and shapes) to start from, plus the usual dates. They
// are ordinary designs, so everything in them can be changed in the editor. Festivals whose dates move each year have no
// dates here: the person sets them for the year.

let counter = 0
const S = (type, x, y, w, h, fill, extra = {}) => {
  const layer = { id: `t${++counter}`, type, x, y, w, h, rot: 0, fill, opacity: 1, ...extra }
  return type === 'text' ? { ...layer, ...textBox(layer) } : layer // a text label's box follows its words
}

function make({ titleFont = 'default', bodyFont = 'default', greeting, message, caption, bg, angle = 110, pattern, contours, layers, layout = 'standard', tint = '#ffffff', notice = { x: null, y: 0 }, edges = [], actions = [] }) {
  counter = 0
  const d = cloneDesign(DEFAULT_DESIGN)
  d.layout = layout
  d.text = { greeting, message, caption, color: null, titleFont, bodyFont }
  d.background = { type: bg.length === 1 ? 'solid' : 'gradient', colors: bg, angle }
  if (pattern) d.pattern = { type: pattern[0], color: pattern[1], opacity: pattern[2], scale: pattern[3] ?? 1 }
  d.contours = contours ? { on: true, color: contours[0], opacity: contours[1], density: 2 } : { on: false, color: '#ffffff', opacity: 0.12, density: 2 }
  d.search = { tint }
  d.notice = { ...notice }
  d.edges = edges.map((e) => ({ opacity: 1, size: 44, spacing: 1, ...e }))
  d.actions = actions.map((a, i) => ({ id: `ta${i}`, ...a }))
  d.layers = layers()
  return d
}

// The Diwali button: fireworks in the festival's own colours.
const LIGHT_IT_UP = [{ label: 'Light it up', kind: 'effect', effect: 'fireworks', colors: ['#ffc83d', '#ff6a1a', '#ff2d7a', '#ffffff'], bursts: 7, color: null }]

// The Holi button: a play of colour in the festival's own colours.
const PLAY_HOLI = [{ label: 'Play Holi', kind: 'effect', effect: 'holi', colors: ['#ff2d95', '#ffd600', '#00b8ff', '#6fd400', '#ff6a00', '#8e44ff'], bursts: 8, color: null, icon: 'party' }]

// The Christmas button: snow and Santa's sleigh.
const CALL_SLEIGH = [{ label: 'Call the sleigh', kind: 'effect', effect: 'christmas', colors: ['#ffffff', '#ffd24a', '#e63946', '#2a9d8f'], bursts: 8, color: null, icon: 'sparkles' }]

// The New Year button: the ball drops, then midnight.
const DROP_BALL = [{ label: 'Drop the ball', kind: 'effect', effect: 'newyear', colors: ['#ffd24a', '#dfe6f2', '#ffffff', '#5aa9ff'], bursts: 8, color: null, icon: 'party' }]

// The flag button for Republic Day and Independence Day: the tricolour is run up the pole.
const HOIST_FLAG = [{ label: 'Hoist the flag', kind: 'effect', effect: 'flag', colors: ['#ff9933', '#ffffff', '#138808', '#000080'], bursts: 8, color: null, icon: 'party' }]

// The Navratri button: a rangoli of light, nine glowing rings in the nine colours.
const GARBA_NIGHT = [{ label: 'Join the Garba', kind: 'effect', effect: 'navratri', colors: ['#f97316', '#f8fafc', '#dc2626', '#2563eb', '#facc15', '#16a34a', '#94a3b8', '#7e22ce', '#0d9488'], bursts: 8, color: null, icon: 'sparkles' }]

// The Ganesh Chaturthi button: a lotus, lamps, modaks and an aarti, with no figure.
const WELCOME_BAPPA = [{ label: 'Welcome Bappa', kind: 'effect', effect: 'ganesh', colors: ['#f59e0b', '#dc2626', '#fde68a', '#f472b6'], bursts: 8, color: null, icon: 'sparkles' }]

// The Janmashtami button: the pyramid reaches the pot and breaks the handi.
const BREAK_HANDI = [{ label: 'Break the handi', kind: 'effect', effect: 'janmashtami', colors: ['#ffd166', '#fdf6e3', '#38bdf8', '#f472b6'], bursts: 8, color: null, icon: 'party' }]


// A peacock feather with its eye: the feather outline, then the eye drawn as layered ellipses where the feather's eye sits.
const featherWithEye = (cx, cy, w, h, rot, fill, fill2) => {
  const r = (rot * Math.PI) / 180
  const lx = 0.05 * w
  const ly = -0.24 * h
  const ex = cx + lx * Math.cos(r) - ly * Math.sin(r)
  const ey = cy + lx * Math.sin(r) + ly * Math.cos(r)
  return [
    S('feather', cx, cy, w * 1.14, h * 1.04, '#d6b23a', { opacity: 0.3, rot }),
    S('feather', cx, cy, w, h, fill, { fill2, grad: 90, rot }),
    S('circle', ex, ey, w * 0.66, h * 0.25, '#e0b030', { rot }), S('circle', ex, ey, w * 0.54, h * 0.2, '#2f9e5a', { rot }), S('circle', ex, ey, w * 0.42, h * 0.155, '#0e8aa3', { rot }),
    S('circle', ex, ey, w * 0.28, h * 0.1, '#1d4ed8', { rot }), S('circle', ex, ey, w * 0.12, h * 0.045, '#0b1a4a', { rot }), S('circle', ex - w * 0.04, ey - h * 0.02, w * 0.06, h * 0.02, '#ffffff', { opacity: 0.45, rot }),
  ]
}

// A pyramid of glowing orbs, five then four then three then two then one, each with a soft halo: the team under the hanging pot.
const orbPyramid = (cx, baseY) => {
  const cols = [['#fff1b8', '#ffd166'], ['#ffffff', '#fdf6e3'], ['#bfe9ff', '#38bdf8'], ['#ffd1e6', '#f472b6']]
  const out = []
  for (let ti = 0; ti < 5; ti += 1) {
    const n = 5 - ti
    for (let i = 0; i < n; i += 1) {
      const [c0, c1] = cols[(i + ti) % 4]
      const x = cx + (i - (n - 1) / 2) * 35
      const y = baseY - ti * 33
      out.push(S('circle', x, y, 56, 56, c1, { opacity: 0.16 }), S('circle', x, y, 30, 30, c0, { fill2: c1, grad: 135 }))
    }
  }
  return out
}

// `when` is [first month, first day, last month, last day] for a fixed-date occasion.

export const TEMPLATES = [
  {
    key: 'republic', label: 'Republic Day', note: '26 January', when: [1, 26, 1, 26],
    design: make({ actions: HOIST_FLAG, edges: [{ edge: 'top', type: 'bunting', size: 34, colors: ['#ff9933', '#ffffff', '#138808'], opacity: 0.9 }, { edge: 'bottom', type: 'bands', size: 12, colors: ['#ff9933', '#ffffff', '#138808'] }], tint: '#fffdf6', greeting: 'Happy Republic Day, {name}', message: 'The day the Constitution came into force. Proud of every crew that keeps the nation moving.', caption: '', bg: ['#ffb066', '#f6f1e6', '#8fdc9a'], angle: 180,
      // The parade as the country sees it: India Gate on Kartavya Path, the fly-past leaving tricolour smoke, and the Constitution.
      layers: () => [
        S('circle', 1050, 346, 220, 14, '#14532d', { opacity: 0.18 }),
        S('indiagate', 1050, 262, 140, 180, '#1c448a', { opacity: 0.94 }),
        S('book', 905, 304, 66, 86, '#1c448a', { opacity: 0.9, rot: -6 }),
        S('swoosh', 630, 150, 250, 110, '#ff9933', { p: 0.055 }), S('swoosh', 630, 160, 250, 110, '#ffffff', { p: 0.055 }), S('swoosh', 630, 170, 250, 110, '#138808', { p: 0.055 }),
        S('jet', 746, 84, 56, 56, '#1c448a', { rot: 40 }), S('jet', 706, 118, 42, 42, '#1c448a', { rot: 40, opacity: 0.85 }), S('jet', 774, 118, 42, 42, '#1c448a', { rot: 40, opacity: 0.85 }),
      ] }),
  },
  {
    key: 'independence', label: 'Independence Day', note: '15 August', when: [8, 15, 8, 15],
    design: make({ actions: HOIST_FLAG, edges: [{ edge: 'top', type: 'bunting', size: 34, colors: ['#ff9933', '#ffffff', '#138808'], opacity: 0.9 }], tint: '#f4f9ff', greeting: 'Happy Independence Day, {name}', message: 'From the ramparts, the tricolour unfurled. Free skies, steady rigs.', caption: '', bg: ['#cfe8ff', '#fff6e5'], angle: 100,
      // The ramparts of the Red Fort with the tricolour unfurled over them: a great fluttering flag behind, the fort and its wall in front.
      layers: () => [
        S('ribbon', 974, 86, 520, 220, '#ff9933', { opacity: 0.34 }), S('ribbon', 974, 196, 520, 220, '#ffffff', { opacity: 0.55 }), S('ribbon', 974, 306, 520, 220, '#138808', { opacity: 0.34 }),
        S('chakra', 974, 184, 74, 74, '#1c448a', { opacity: 0.32 }),
        S('rect', 712, 185, 6, 340, '#475569', { p: 0.5 }), S('circle', 712, 18, 14, 14, '#b45309'),
        ...Array.from({ length: 22 }, (_, i) => S('rect', 678 + i * 26, 322, 14, 14, '#9f1d16', { p: 0 })),
        S('rect', 930, 342, 560, 26, '#b3261e', { p: 0 }),
        S('redfort', 990, 286, 330, 122, '#b3261e'),
        S('bird', 800, 70, 46, 28, '#1c448a', { opacity: 0.7, rot: -12 }), S('bird', 860, 40, 32, 20, '#1c448a', { opacity: 0.6, rot: 6 }), S('bird', 740, 110, 36, 22, '#1c448a', { opacity: 0.55, rot: -6 }),
      ] }),
  },
  {
    key: 'safety', label: 'National Safety Day', note: '4 March', when: [3, 4, 3, 4],
    design: make({ tint: '#eff6ff', greeting: 'Happy National Safety Day, {name}!', message: 'Building a safer, healthier workplace together.', caption: '', bg: ['#ecfdf5', '#f0f9ff', '#fef3c7'], angle: 100, pattern: ['grid', '#0f766e', 0.05, 1.6],
      // Fresh and encouraging: mint melting into sky blue and pale amber, faint blueprint gears and a shield behind, and a friendly cluster of
      // the kit of a safe site on the right: hard hat, goggles, checklist, cone, gears and a spanner, with a few leaves for care.
      layers: () => [
        S('gear', 590, 62, 170, 170, '#0f766e', { opacity: 0.07 }), S('gear', 905, 58, 92, 92, '#0f766e', { opacity: 0.06 }), S('shield', 735, 262, 190, 212, '#0f766e', { opacity: 0.07 }),
        S('circle', 1010, 330, 330, 20, '#0f766e', { opacity: 0.12 }),
        S('wrench', 1148, 188, 170, 64, '#cbd5e1', { rot: 52, stroke: '#0f172a', sw: 3 }),
        S('artgear', 1095, 232, 150, 150, '#000000'), S('artgear', 905, 292, 98, 98, '#000000', { rot: 14 }),
        S('artclipboard', 900, 212, 132, 132, '#000000', { rot: -9 }),
        S('arthat', 1010, 238, 196, 196, '#000000'),
        S('artgoggles', 1005, 312, 128, 128, '#000000'),
        S('artcone', 1125, 292, 118, 118, '#000000'),
        S('leaf', 835, 150, 34, 22, '#4ade80', { stroke: '#0f172a', sw: 2.5, rot: -35 }), S('leaf', 1176, 262, 34, 22, '#4ade80', { stroke: '#0f172a', sw: 2.5, rot: 40 }), S('leaf', 960, 150, 30, 20, '#22c55e', { stroke: '#0f172a', sw: 2.5, rot: 25 }),
        S('sparkle', 1180, 120, 22, 22, '#0f766e', { opacity: 0.25 }),
      ] }),
  },
  {
    key: 'women', label: 'International Women’s Day', note: '8 March', when: [3, 8, 3, 8],
    design: make({ titleFont: 'playfair', bodyFont: 'default', notice: { x: 66, y: 25 }, edges: [{ edge: 'top', type: 'pearls', size: 30, colors: ['#c4b5fd', '#fde68a'], opacity: 0.9 }], tint: '#fff1f2', greeting: 'Happy Women’s Day, {name}', message: 'Thank you for everything you bring to every rig and office.', caption: '', bg: ['#faf5ff', '#fff7ed'], angle: 110, pattern: ['dots', '#7c3aed', 0.06, 1.4],
      // Soft line art: a calm portrait drawn in one flowing line, a lotus at her shoulder, and blobs of amber and lavender behind.
      layers: () => [
        S('circle', 1010, 190, 330, 330, '#e9d5ff', { opacity: 0.3 }),
        S('artwoman', 1010, 205, 300, 300, '#000000'),
        S('sparkle', 840, 110, 30, 30, '#f59e0b', { opacity: 0.7 }), S('sparkle', 1175, 300, 24, 24, '#7c3aed', { opacity: 0.5 }), S('sparkle', 870, 300, 20, 20, '#7c3aed', { opacity: 0.4 }),
      ] }),
  },
  {
    key: 'labour', label: 'Labour Day', note: '1 May', when: [5, 1, 5, 1],
    // Dignified and warm: deep navy, amber and steel. A worker in a hard hat and safety vest, wrench in hand, stands before a big slate gear
    // and a steel truss, with a soft amber glow behind. (The earlier role strip with editable department labels was replaced.)
    design: make({ titleFont: 'bebas', bodyFont: 'default', notice: { x: 60, y: 25 }, tint: '#ffffff', greeting: 'Happy Labour Day, {name}!', message: 'Honouring the hands, minds and dedication that build our everyday.', caption: '', bg: ['#1b1f4f', '#334155'], angle: 100, pattern: ['grid', '#94a3b8', 0.04, 1.6],
      layers: () => [
        S('gear', 585, 66, 170, 170, '#94a3b8', { opacity: 0.07 }), S('gear', 905, 58, 84, 84, '#94a3b8', { opacity: 0.06 }),
        S('artskyline', 910, 205, 580, 311, '#000000'),
        S('artlabour', 967, 183, 350, 275, '#000000'),
      ] }),
  },
  {
    key: 'environment', label: 'World Environment Day', note: '5 June', when: [6, 5, 6, 5],
    design: make({ notice: { x: 56, y: 4 }, tint: '#ffffff', greeting: 'Happy World Environment Day, {name}!', message: 'Nurturing our planet, restoring ecosystems and building a sustainable future together.', caption: '', bg: ['#fff1e0', '#fbd5d0'], angle: 100,
      // Warm and hopeful: peach melting into soft rose, faint leaves, sprouts and wind behind, and on the right the earth with leaves, solar panels, wind turbines, birds and butterflies, and people planting and watering, and a faint
      // growing plant behind like a watermark.
      layers: () => [
        S('leaf', 330, 40, 110, 170, '#e07a3a', { opacity: 0.09, rot: 25 }), S('leaf', 590, 322, 120, 150, '#e07a3a', { opacity: 0.08, rot: -20 }), S('leaf', 800, 70, 70, 100, '#4e8a4a', { opacity: 0.07, rot: 40 }),
        S('artplant', 640, 196, 260, 200, '#000000', { opacity: 0.13 }),
        S('circle', 1010, 200, 330, 330, '#fff7ee', { opacity: 0.55 }),
        S('artearth', 1010, 198, 330, 305, '#000000'),
      ] }),
  },
  {
    key: 'engineers', label: 'Engineers’ Day', note: '15 September', when: [9, 15, 9, 15],
    design: make({ notice: { x: 60, y: 25 }, tint: '#ffffff', greeting: 'Happy Engineers’ Day, {name}!', message: 'Honouring the vision, precision and ingenuity that build our tomorrow.', caption: '', bg: ['#f0fdfa', '#eff6ff'], angle: 100, pattern: ['grid', '#2563eb', 0.05, 1.1],
      // Bright and technical: teal melting into cyber blue, faint blueprint gears and formulas behind, and on the right a drafting
      // tablet with a gear assembly, a compass, a caliper, a crane tower, circuit traces and two tiny engineers at work.
      layers: () => [
        S('gear', 585, 66, 170, 170, '#0d9488', { opacity: 0.07 }), S('gear', 760, 312, 120, 120, '#2563eb', { opacity: 0.06 }), S('gear', 900, 60, 80, 80, '#2563eb', { opacity: 0.06 }),
        S('text', 554, 300, 0, 0, '#1e3a8a', { text: 'x² + y² = c²', size: 24, bold: false, font: 'serif', spacing: 1, opacity: 0.12 }),
        S('text', 630, 260, 0, 0, '#1e3a8a', { text: 'F = m · a', size: 22, bold: false, font: 'serif', spacing: 1, opacity: 0.1 }),
        S('artcircuit', 949, 178, 543, 374, '#000000', { opacity: 0.2 }),
        S('circle', 960, 336, 300, 18, '#1e3a8a', { opacity: 0.12 }),
        S('artdraft', 957, 171, 340, 249, '#000000'),
      ] }),
  },
  {
    key: 'gandhi', label: 'Gandhi Jayanti', note: '2 October', when: [10, 2, 10, 2],
    design: make({ titleFont: 'lora', bodyFont: 'lora', tint: '#f6efdf', greeting: 'Gandhi Jayanti, {name}', message: 'Truth, simplicity and doing the right thing, every day.', caption: '', bg: ['#f6efe0', '#e9dfc9'], angle: 100, contours: ['#1c448a', 0.08],
      // Round spectacles, the thing to see, over a faint charkha that sits behind like a watermark.
      layers: () => [
        S('artcharkha', 960, 190, 470, 316, '#000000', { opacity: 0.1 }),
        S('circle', 934, 288, 86, 86, '#1c448a', { opacity: 0.07 }), S('circle', 1046, 288, 86, 86, '#1c448a', { opacity: 0.07 }),
        S('spectacles', 990, 288, 360, 130, '#1c448a', { p: 0.03 }),
      ] }),
  },
  {
    key: 'janmashtami', label: 'Janmashtami', note: 'Set the dates for this year', when: null,
    design: make({ titleFont: 'yatra', bodyFont: 'default', actions: BREAK_HANDI, edges: [{ edge: 'top', type: 'garland', size: 42, colors: ['#fbbf24', '#f59e0b', '#fde68a', '#f472b6'] }], tint: '#eef2ff', greeting: 'Happy Janmashtami, {name}', message: 'A midnight of music, butter and joy.', caption: '', bg: ['#0b1240', '#1e2a78', '#3b2a7a'], angle: 150, pattern: ['dots', '#fde68a', 0.14, 1.2],
      // A midnight sky with a big moon behind drifting cloud; a painted matka on a rope with butter at its lip; a pyramid of glowing orbs
      // reaching up to it; crossed peacock feathers and a bamboo flute.
      layers: () => [
        S('circle', 1090, 100, 380, 380, '#6d5bd0', { opacity: 0.14 }), S('circle', 1090, 100, 230, 230, '#fdf6e3', { opacity: 0.1 }),
        S('ring', 1090, 92, 200, 200, '#fdf6e3', { opacity: 0.16, p: 0.05 }),
        S('circle', 1090, 92, 120, 120, '#fffdf0', { fill2: '#e3dcbd', grad: 135 }), S('circle', 1064, 76, 26, 26, '#cbd5e1', { opacity: 0.4 }), S('circle', 1116, 112, 34, 34, '#cbd5e1', { opacity: 0.36 }), S('circle', 1098, 64, 14, 14, '#cbd5e1', { opacity: 0.3 }),
        S('cloud', 1020, 138, 170, 50, '#27338a', { opacity: 0.55 }), S('cloud', 1175, 150, 120, 38, '#33419f', { opacity: 0.45 }),
        S('sparkle', 730, 58, 26, 26, '#fde68a'), S('sparkle', 842, 28, 16, 16, '#fde68a', { opacity: 0.8 }), S('sparkle', 900, 96, 12, 12, '#fff', { opacity: 0.7 }), S('star', 1010, 26, 14, 14, '#fde68a', { opacity: 0.8 }), S('sparkle', 1190, 188, 18, 18, '#fde68a', { opacity: 0.8 }), S('sparkle', 770, 170, 14, 14, '#fff', { opacity: 0.6 }),
        S('circle', 960, 128, 210, 210, '#ffd166', { opacity: 0.09 }),
        S('line', 960, 38, 86, 3, '#d9b77a', { rot: 90 }),
        S('matka', 960, 134, 118, 120, '#e8924d', { fill2: '#7a2c10', grad: 90 }),
        S('line', 960, 134, 92, 3, '#8f1d14', { opacity: 0.9 }), S('line', 960, 168, 96, 3, '#8f1d14', { opacity: 0.9 }),
        ...[-36, -24, -12, 0, 12, 24, 36].map((dx) => S('circle', 960 + dx, 151 + Math.abs(dx) * 0.05, 5, 5, '#fff1cf')),
        S('circle', 960, 78, 38, 15, '#ffd34d'), S('circle', 960, 70, 10, 10, '#e6a800'),
        ...[-18, -9, 0, 9, 18].map((dx) => S('flower', 960 + dx, 96, 14, 14, '#fb923c')),
        S('drop', 934, 92, 9, 16, '#fdf6e3', { rot: 10 }), S('drop', 988, 98, 8, 14, '#fdf6e3', { rot: -12 }), S('drop', 1000, 118, 6, 10, '#fdf6e3', { opacity: 0.9 }),
        ...orbPyramid(960, 332),
        ...featherWithEye(800, 250, 84, 250, -20, '#3fa65a', '#0f7f8f'),
        ...featherWithEye(752, 262, 74, 220, 12, '#2f8f55', '#0b6b82'),
        S('flute', 1130, 322, 170, 13, '#ecbd4a', { fill2: '#a8741a', grad: 90, rot: -9 }),
        S('sparkle', 1050, 296, 14, 14, '#fde68a', { opacity: 0.8 }), S('sparkle', 1214, 276, 12, 12, '#fff', { opacity: 0.6 }),
      ] }),
  },
  {
    key: 'ganesh', label: 'Ganesh Chaturthi', note: 'Set the dates for this year', when: null,
    design: make({ titleFont: 'yatra', bodyFont: 'default', actions: WELCOME_BAPPA, edges: [{ edge: 'top', type: 'garland', size: 46, colors: ['#fbbf24', '#f59e0b', '#fde68a', '#f97316'] }], tint: '#fff4e5', greeting: 'Ganpati Bappa Morya, {name}', message: 'Wishing you joy, wisdom and a fresh beginning.', caption: '', bg: ['#6b0f2a', '#c2410c'], angle: 120, pattern: ['dots', '#fbbf24', 0.12, 1.2],
      layers: () => [
        // A heap of modaks on a plantain leaf, as the festival is painted, with rose petals scattered round it.
        S('bananaleaf', 1030, 334, 430, 88, '#84cc16', { fill2: '#365314', grad: 90, rot: -2 }),
        S('modak', 968, 226, 112, 120, '#f59e0b', { fill2: '#b45309', grad: 90 }), S('modak', 1092, 226, 112, 120, '#f59e0b', { fill2: '#b45309', grad: 90 }),
        S('modak', 930, 280, 122, 122, '#fdba74', { fill2: '#ea580c', grad: 90 }), S('modak', 1130, 280, 122, 122, '#fdba74', { fill2: '#ea580c', grad: 90 }),
        S('modak', 1030, 270, 138, 138, '#fed7aa', { fill2: '#f97316', grad: 90 }),
        S('leaf', 872, 236, 26, 18, '#fb7185', { fill2: '#e11d48', grad: 60, rot: 20 }), S('leaf', 1176, 244, 26, 18, '#fb7185', { fill2: '#e11d48', grad: 60, rot: -35 }), S('leaf', 850, 318, 24, 16, '#f472b6', { fill2: '#be185d', grad: 60, rot: -50 }), S('leaf', 1190, 318, 24, 16, '#f472b6', { fill2: '#be185d', grad: 60, rot: 15 }), S('leaf', 1030, 150, 22, 15, '#fb7185', { fill2: '#e11d48', grad: 60, rot: 80 }),
        S('sparkle', 760, 270, 30, 30, '#fde68a', { opacity: 0.8 }), S('sparkle', 840, 200, 22, 22, '#fde68a', { opacity: 0.6 }),
      ] }),
  },
  {
    key: 'dussehra', label: 'Dussehra', note: 'Set the dates for this year', when: null,
    design: make({ titleFont: 'yatra', bodyFont: 'default', edges: [{ edge: 'bottom', type: 'garland', size: 46, colors: ['#f59e0b', '#fbbf24', '#f97316', '#fcd34d'] }], tint: '#fff1e0', greeting: 'Happy Dussehra, {name}', message: 'May good triumph over evil in all that we do.', caption: '', bg: ['#7f1d1d', '#c2410c', '#991b1b'], angle: 100,
      // A glowing red-orange sky, temples rising in hazy rows, a golden bow with its arrow raised, and marigolds along the foot.
      layers: () => [
        S('circle', 1000, 210, 460, 460, '#fb923c', { opacity: 0.16 }), S('circle', 1000, 210, 300, 300, '#fdba74', { opacity: 0.18 }), S('circle', 1000, 210, 160, 160, '#fed7aa', { opacity: 0.22 }),
        S('temple', 770, 276, 90, 150, '#fb923c', { opacity: 0.16 }), S('temple', 1190, 270, 100, 160, '#fb923c', { opacity: 0.16 }), S('temple', 880, 270, 84, 140, '#fdba74', { opacity: 0.14 }),
        S('temple', 1100, 280, 120, 170, '#7f1d1d', { opacity: 0.55 }), S('temple', 940, 292, 96, 130, '#7f1d1d', { opacity: 0.5 }), S('temple', 1190, 300, 90, 120, '#7f1d1d', { opacity: 0.5 }),
        S('bow', 1000, 262, 330, 218, '#fde68a', { fill2: '#f59e0b', grad: 70 }),
        S('sparkle', 726, 80, 34, 34, '#fde68a', { opacity: 0.9 }), S('sparkle', 1150, 150, 22, 22, '#fde68a', { opacity: 0.8 }), S('sparkle', 810, 190, 16, 16, '#fde68a', { opacity: 0.7 }),
      ] }),
  },
  {
    key: 'navratri', label: 'Navratri', note: 'Set the dates for this year', when: null,
    design: make({ titleFont: 'yatra', bodyFont: 'default', actions: GARBA_NIGHT, edges: [{ edge: 'top', type: 'garland', size: 44, colors: ['#fb8500', '#ffb703', '#f97316', '#ffd166'] }], tint: '#fff0e6', greeting: 'Shubh Navratri, {name}', message: 'Nine nights of colour, music and devotion.', caption: '', bg: ['#2b0a3d', '#8a1c4a', '#e85d1b'], angle: 115, pattern: ['dots', '#ffd166', 0.2, 1.1],
      // Nine clay lamps in a row, each with a flame in a different night's colour, under soft lights and sparkles.
      layers: () => [
        S('circle', 1000, 214, 420, 420, '#fbbf24', { opacity: 0.1 }), S('circle', 1000, 214, 250, 250, '#fdba74', { opacity: 0.12 }),
        ...[['#f97316', 770], ['#f8fafc', 850], ['#dc2626', 930], ['#2563eb', 1010], ['#facc15', 1090], ['#16a34a', 1170], ['#7e22ce', 1250]].flatMap(([c, x], i) => [
          S('circle', x, 292 - (i % 2) * 6, 70, 70, c, { opacity: 0.16 }), S('diya', x, 312 - (i % 2) * 6, 78, 44, '#ea580c', { fill2: '#9a2c12', grad: 90 }), S('flame', x, 280 - (i % 2) * 6, 22, 50, c, { fill2: '#fde68a', grad: 90 }),
        ]),
        S('sparkle', 740, 70, 38, 38, '#fde68a'), S('sparkle', 1140, 120, 24, 24, '#fde68a', { opacity: 0.8 }), S('sparkle', 960, 60, 18, 18, '#ffd166', { opacity: 0.7 }),
      ] }),
  },
  {
    key: 'diwali', label: 'Diwali', note: 'Set the dates for this year', when: null,
    design: make({ actions: LIGHT_IT_UP, edges: [{ edge: 'top', type: 'lights', size: 44, colors: ['#fde047', '#fb923c', '#fef3c7'] }], tint: '#fff3e0', greeting: 'Happy Diwali, {name}', message: 'May every home and every rig glow bright.', caption: '', bg: ['#2b1055', '#9a3412'], angle: 120, pattern: ['dots', '#fde68a', 0.22, 1.1],
      // Clay lamps, each with a three-layer flame (red-orange, gold, pale) and a soft halo.
      layers: () => [
        S('circle', 800, 266, 99, 99, '#fde68a', { opacity: 0.16 }), S('diya', 800, 306, 137, 77, '#ea580c', { fill2: '#b91c1c', grad: 90 }), S('flame', 800, 266, 37, 82, '#f97316', { fill2: '#dc2626', grad: 90 }), S('flame', 800, 270, 24, 59, '#fbbf24'), S('flame', 800, 274, 12, 34, '#fef3c7'),
        S('circle', 960, 283, 79, 79, '#fde68a', { opacity: 0.16 }), S('diya', 960, 314, 110, 62, '#ea580c', { fill2: '#b91c1c', grad: 90 }), S('flame', 960, 283, 29, 66, '#f97316', { fill2: '#dc2626', grad: 90 }), S('flame', 960, 287, 19, 47, '#fbbf24'), S('flame', 960, 291, 9, 27, '#fef3c7'),
        S('circle', 1110, 264, 93, 93, '#fde68a', { opacity: 0.16 }), S('diya', 1110, 302, 130, 72, '#ea580c', { fill2: '#b91c1c', grad: 90 }), S('flame', 1110, 264, 35, 78, '#f97316', { fill2: '#dc2626', grad: 90 }), S('flame', 1110, 268, 23, 56, '#fbbf24'), S('flame', 1110, 272, 11, 32, '#fef3c7'),
        S('sparkle', 740, 64, 44, 44, '#fde68a'), S('sparkle', 1135, 150, 26, 26, '#fde68a', { opacity: 0.8 }), S('star', 690, 200, 30, 30, '#fde68a', { opacity: 0.7 }),
      ] }),
  },
  {
    key: 'deepavali', label: 'Deepavali', note: 'Set the dates for this year', when: null,
    design: make({ actions: LIGHT_IT_UP, titleFont: 'cinzel', bodyFont: 'default', edges: [{ edge: 'top', type: 'diamonds', size: 26, colors: ['#fbbf24', '#b45309'], opacity: 0.9 }], notice: { x: 60, y: 25 }, tint: '#fff4dc', greeting: 'Shubh Deepavali, {name}', message: 'May the light of the diya bring prosperity, peace and joy to you and your family.', caption: '', bg: ['#1b0c3d', '#4a1259', '#7a1d3c'], angle: 110, pattern: ['sunburst', '#fbbf24', 0.07, 1.2],
      // Royal: deep indigo melting into plum and crimson, a gold sunburst behind, and on the right a great ornate diya with a glowing
      // flame, a hanging kandil, a lotus rangoli and a marigold garland, under gold rings and stars.
      layers: () => [
        S('ring', 1010, 196, 420, 420, '#fbbf24', { opacity: 0.16, p: 0.012 }), S('ring', 1010, 196, 350, 350, '#fbbf24', { opacity: 0.1, p: 0.008 }),
        S('circle', 1010, 200, 300, 300, '#f59e0b', { opacity: 0.1 }),
        S('artdiwali', 985, 204, 368, 281, '#000000'),
        S('sparkle', 760, 90, 30, 30, '#fde68a', { opacity: 0.8 }), S('sparkle', 700, 250, 22, 22, '#fbbf24', { opacity: 0.6 }), S('star', 820, 320, 22, 22, '#fde68a', { opacity: 0.5, n: 5, p: 0.45 }),
      ] }),
  },
  {
    key: 'holi', label: 'Holi', note: 'Set the dates for this year', when: null,
    design: make({ actions: PLAY_HOLI, titleFont: 'baloo', bodyFont: 'baloo', edges: [{ edge: 'top', type: 'bunting', size: 34, colors: ['#ec4899', '#f59e0b', '#22c55e', '#3b82f6'] }], tint: '#fff7fb', notice: { x: 58, y: 30 }, greeting: 'Happy Holi, {name}', message: 'Wishing you a colourful and joyful day.', caption: '', bg: ['#fff1b0', '#ffc0dc', '#a9d8ff'], angle: 105, pattern: ['dots', '#ffffff', 0.4, 0.7],
      // Festive but not crowded: bunting and a fine speckle, four soft clouds of colour, a few outlined splashes and two glossy balloons,
      // and four plates of gulal in a loose group.
      layers: () => [
        S('burst', 1010, 250, 360, 360, '#ec4899', { fill2: '#f97316', grad: 60, opacity: 0.62 }),
        S('burst', 800, 292, 270, 270, '#22d3ee', { fill2: '#6366f1', grad: 120, opacity: 0.5 }),
        S('burst', 1160, 258, 270, 270, '#facc15', { fill2: '#22c55e', grad: 70, opacity: 0.42 }),
        S('burst', 650, 304, 190, 190, '#a855f7', { fill2: '#ec4899', grad: 45, opacity: 0.35 }),
        S('splash', 766, 98, 120, 120, '#7c3aed', { opacity: 0.16, rot: 15 }), S('splash', 760, 90, 120, 120, '#db2777', { fill2: '#f472b6', grad: 45, rot: 15, stroke: '#ffffff', sw: 3 }),
        S('splash', 1136, 76, 100, 100, '#7c3aed', { opacity: 0.16, rot: -20 }), S('splash', 1130, 68, 100, 100, '#0ea5e9', { fill2: '#22d3ee', grad: 60, rot: -20, stroke: '#ffffff', sw: 3 }),
        S('artgulalteal', 905, 218, 128, 103, '#000000'), S('artgulalyellow', 1090, 218, 143, 103, '#000000'),
        S('artgulalpink', 995, 298, 146, 121, '#000000'), S('artgulalgreen', 1132, 306, 118, 95, '#000000'),
        S('balloon', 706, 222, 42, 70, '#7c3aed', { opacity: 0.16, rot: -14 }), S('balloon', 700, 214, 42, 70, '#ec4899', { fill2: '#f97316', grad: 90, rot: -14, stroke: '#ffffff', sw: 2.5 }), S('circle', 693, 196, 8, 14, '#ffffff', { opacity: 0.6, rot: -14 }),
        S('balloon', 836, 128, 40, 66, '#7c3aed', { opacity: 0.16, rot: 8 }), S('balloon', 830, 120, 40, 66, '#38bdf8', { fill2: '#6366f1', grad: 90, rot: 8, stroke: '#ffffff', sw: 2.5 }), S('circle', 823, 102, 7, 13, '#ffffff', { opacity: 0.6, rot: 8 }),
        S('drop', 960, 70, 24, 34, '#f43f5e', { rot: 20, stroke: '#ffffff', sw: 2 }), S('drop', 1190, 172, 22, 32, '#7c3aed', { rot: 15, stroke: '#ffffff', sw: 2 }),
        S('circle', 1176, 120, 14, 14, '#ec4899', { opacity: 0.9 }), S('circle', 1050, 138, 10, 10, '#facc15', { opacity: 0.95 }),
        S('sparkle', 860, 60, 20, 20, '#ffffff', { opacity: 0.9 }), S('sparkle', 1060, 150, 16, 16, '#ffffff', { opacity: 0.85 }),
      ] }),
  },
  {
    key: 'eid', label: 'Eid', note: 'Set the dates for this year', when: null,
    design: make({ edges: [{ edge: 'top', type: 'bunting', size: 34, colors: ['#047857', '#fde68a', '#ffffff'], opacity: 0.9 }], tint: '#ecfdf9', greeting: 'Eid Mubarak, {name}', message: 'Wishing you peace, joy and togetherness.', caption: '', bg: ['#07142e', '#0f766e'], angle: 125, pattern: ['dots', '#fde68a', 0.1, 1],
      // A night sky over the Taj Mahal: a slender crescent with sharp horns, opening to the right, and a star, hanging lanterns at different lengths, and a faint eight-pointed geometric star.
      layers: () => [
        S('star', 960, 190, 360, 360, '#fde68a', { n: 8, p: 0.72, opacity: 0.05 }),
        S('tajmahal', 1010, 262, 340, 188, '#04211f', { opacity: 0.92 }),
        S('moon', 716, 96, 80, 92, '#fde68a', { fill2: '#f59e0b', grad: 100, rot: -12 }), S('star', 770, 70, 24, 24, '#fde68a', { n: 5, p: 0.45 }),
        S('line', 690, 30, 62, 2, '#fbbf24', { rot: 90, opacity: 0.7 }), S('lantern', 690, 90, 40, 70, '#fde68a', { fill2: '#f59e0b', grad: 90 }),
        S('line', 790, 50, 100, 2, '#fbbf24', { rot: 90, opacity: 0.7 }), S('lantern', 790, 140, 46, 78, '#fde68a', { fill2: '#ea580c', grad: 90 }),
        S('line', 850, 22, 44, 2, '#fbbf24', { rot: 90, opacity: 0.7 }), S('lantern', 850, 70, 34, 58, '#fde68a', { fill2: '#f59e0b', grad: 90, opacity: 0.9 }),
        S('sparkle', 1150, 40, 26, 26, '#fde68a', { opacity: 0.9 }), S('sparkle', 740, 190, 18, 18, '#fde68a', { opacity: 0.8 }), S('sparkle', 900, 80, 14, 14, '#fde68a', { opacity: 0.7 }), S('sparkle', 1170, 150, 16, 16, '#fde68a', { opacity: 0.7 }),
      ] }),
  },
  {
    key: 'christmas', label: 'Christmas', note: '25 December', when: [12, 25, 12, 25],
    design: make({ actions: CALL_SLEIGH, edges: [{ edge: 'top', type: 'icicles', size: 40, colors: ['#ffffff', '#bfdbfe', '#e0f2fe'], opacity: 0.95 }], tint: '#ffffff', greeting: 'Merry Christmas, {name}', message: 'Wishing you warmth and joy with the people you love.', caption: '', bg: ['#f0f7ff', '#ffffff'], angle: 120,
      // A frosted winter morning: pale blue to snow white with faint snowflakes and golden glow, balanced by deep evergreen,
      // crimson berries and amber lights so it feels warm rather than stark.
      layers: () => [
        S('snowflake', 760, 84, 70, 70, '#93c5fd', { opacity: 0.35 }), S('snowflake', 1130, 56, 90, 90, '#bfdbfe', { opacity: 0.45 }), S('snowflake', 700, 220, 36, 36, '#93c5fd', { opacity: 0.35 }), S('snowflake', 890, 200, 28, 28, '#bfdbfe', { opacity: 0.5 }), S('snowflake', 1170, 200, 40, 40, '#93c5fd', { opacity: 0.3 }), S('snowflake', 960, 40, 24, 24, '#93c5fd', { opacity: 0.4 }),
        S('circle', 1000, 190, 280, 280, '#fde68a', { opacity: 0.1 }), S('circle', 1000, 190, 170, 170, '#fcd34d', { opacity: 0.1 }),
        S('circle', 1030, 350, 360, 64, '#e0f2fe'),
        S('tree', 1050, 262, 130, 170, '#166534', { fill2: '#14532d', grad: 90 }), S('star', 1050, 168, 30, 30, '#fbbf24', { n: 5, p: 0.45 }),
        S('bauble', 1020, 262, 20, 24, '#dc2626'), S('bauble', 1075, 292, 20, 24, '#f59e0b'), S('bauble', 1048, 226, 16, 19, '#f59e0b'), S('bauble', 1090, 252, 16, 19, '#dc2626'), S('bauble', 1004, 300, 18, 22, '#fbbf24'),
        S('holly', 892, 316, 36, 66, '#166534', { rot: -50 }), S('holly', 926, 318, 36, 66, '#14532d', { rot: 40 }), S('holly', 908, 312, 34, 62, '#15803d', { rot: -4 }),
        S('circle', 905, 326, 13, 13, '#b91c1c'), S('circle', 918, 330, 13, 13, '#dc2626'), S('circle', 911, 318, 12, 12, '#b91c1c'),
        S('holly', 1140, 316, 34, 62, '#166534', { rot: 38 }), S('circle', 1148, 332, 11, 11, '#dc2626'), S('circle', 1136, 335, 10, 10, '#b91c1c'),
        S('circle', 800, 150, 10, 10, '#fbbf24', { opacity: 0.55 }), S('circle', 840, 300, 8, 8, '#fbbf24', { opacity: 0.6 }), S('circle', 1100, 110, 9, 9, '#fcd34d', { opacity: 0.5 }), S('circle', 740, 170, 7, 7, '#fbbf24', { opacity: 0.5 }), S('circle', 980, 90, 8, 8, '#fde68a', { opacity: 0.7 }), S('circle', 1170, 290, 8, 8, '#fbbf24', { opacity: 0.55 }),
        S('sparkle', 860, 120, 20, 20, '#f59e0b', { opacity: 0.75 }), S('sparkle', 1090, 190, 16, 16, '#f59e0b', { opacity: 0.6 }), S('sparkle', 780, 276, 14, 14, '#f59e0b', { opacity: 0.6 }),
      ] }),
  },
  {
    key: 'newyear', label: 'New Year', note: '31 December to 1 January', when: [12, 31, 1, 1],
    // The same electric-indigo and slate theme as Engineers' Day: fireworks of different sizes, sparkles and a big gold year.
    design: make({ actions: DROP_BALL, edges: [{ edge: 'top', type: 'stars', size: 34, colors: ['#fde68a', '#ffffff', '#fbbf24'], opacity: 0.9 }], tint: '#eef2ff', greeting: 'Happy New Year, {name}', message: 'Here is to a safe and successful year ahead.', caption: '', bg: ['#0f172a', '#4338ca'], angle: 120, pattern: ['grid', '#c7d2fe', 0.05, 1], contours: ['#c7d2fe', 0.07],
      layers: () => [
        S('text', 1020, 280, 0, 0, '#fde68a', { text: '{newyear}', size: 84, bold: true, font: 'sans', spacing: 4, fill2: '#f59e0b', grad: 90 }),
        S('sun', 720, 84, 84, 84, '#fde68a', { opacity: 0.8 }), S('sun', 1120, 120, 56, 56, '#f472b6', { opacity: 0.6 }), S('sun', 880, 190, 36, 36, '#a5b4fc', { opacity: 0.6 }), S('sun', 790, 290, 48, 48, '#fde68a', { opacity: 0.55 }),
        S('sparkle', 840, 60, 34, 34, '#fde68a'), S('sparkle', 1150, 36, 24, 24, '#ffffff', { opacity: 0.8 }), S('sparkle', 760, 200, 22, 22, '#ffffff', { opacity: 0.7 }), S('sparkle', 920, 318, 28, 28, '#fde68a', { opacity: 0.9 }),
        S('star', 1160, 250, 30, 30, '#fde68a', { n: 5, p: 0.45, opacity: 0.85 }), S('star', 690, 310, 20, 20, '#c7d2fe', { n: 5, p: 0.45, opacity: 0.7 }),
        S('circle', 800, 140, 8, 8, '#f472b6', { opacity: 0.8 }), S('circle', 980, 60, 6, 6, '#fde68a', { opacity: 0.7 }), S('circle', 1100, 210, 7, 7, '#ffffff', { opacity: 0.6 }), S('circle', 740, 250, 6, 6, '#a5b4fc', { opacity: 0.7 }),
      ] }),
  },
]

// The dates to suggest for a template: the next time the occasion comes round (this year, or next if it has passed).
export function templateDates(t, today = new Date()) {
  if (!t.when) return null
  const [m1, d1, m2, d2] = t.when
  const pad = (n) => String(n).padStart(2, '0')
  const todayStr = localDateString(today)
  const year = today.getFullYear()
  const build = (y) => ({ starts_on: `${y}-${pad(m1)}-${pad(d1)}`, ends_on: `${m2 < m1 ? y + 1 : y}-${pad(m2)}-${pad(d2)}` })
  let dates = build(year)
  if (dates.ends_on < todayStr) dates = build(year + 1)
  return dates
}
