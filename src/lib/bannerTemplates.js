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

function make({ greeting, message, caption, bg, angle = 110, pattern, contours, layers, layout = 'standard', tint = '#ffffff' }) {
  counter = 0
  const d = cloneDesign(DEFAULT_DESIGN)
  d.layout = layout
  d.text = { greeting, message, caption, color: null }
  d.background = { type: bg.length === 1 ? 'solid' : 'gradient', colors: bg, angle }
  if (pattern) d.pattern = { type: pattern[0], color: pattern[1], opacity: pattern[2], scale: pattern[3] ?? 1 }
  d.contours = contours ? { on: true, color: contours[0], opacity: contours[1], density: 2 } : { on: false, color: '#ffffff', opacity: 0.12, density: 2 }
  d.search = { tint }
  d.layers = layers()
  return d
}

// `when` is [first month, first day, last month, last day] for a fixed-date occasion.

// A garland: marigolds hung along two sagging loops across the top of the banner.
function garland(colours) {
  const out = []
  for (let i = 0; i < 30; i++) {
    const loop = i < 15 ? i : i - 15
    const t = loop / 14
    out.push(S('flower', 20 + i * 40 + (i < 15 ? 0 : 0), 22 + 30 * Math.sin(Math.PI * t), 38, 38, colours[i % colours.length], { opacity: 0.95 }))
  }
  return out
}

// A handful of gears of different sizes and see-through-ness, so a cluster looks lively rather than stamped out.
const gears = (items) => items.map(([x, y, size, fill, opacity, rot]) => S('gear', x, y, size, size, fill, { opacity, rot }))

export const TEMPLATES = [
  {
    key: 'republic', label: 'Republic Day', note: '26 January', when: [1, 26, 1, 26],
    design: make({ tint: '#fffdf6', greeting: 'Happy Republic Day, {name}', message: 'The day the Constitution came into force. Proud of every crew that keeps the nation moving.', caption: '26 January', bg: ['#ffb066', '#f6f1e6', '#8fdc9a'], angle: 180,
      // The parade as the country sees it: India Gate on Kartavya Path, the fly-past leaving tricolour smoke, and the Constitution.
      layers: () => [
        S('circle', 1050, 346, 220, 14, '#14532d', { opacity: 0.18 }),
        S('indiagate', 1050, 262, 140, 180, '#1c448a', { opacity: 0.94 }),
        S('book', 905, 304, 66, 86, '#1c448a', { opacity: 0.9, rot: -6 }),
        S('swoosh', 760, 150, 250, 110, '#ff9933', { p: 0.055 }), S('swoosh', 760, 160, 250, 110, '#ffffff', { p: 0.055 }), S('swoosh', 760, 170, 250, 110, '#138808', { p: 0.055 }),
        S('jet', 876, 84, 56, 56, '#1c448a', { rot: 40 }), S('jet', 836, 118, 42, 42, '#1c448a', { rot: 40, opacity: 0.85 }), S('jet', 904, 118, 42, 42, '#1c448a', { rot: 40, opacity: 0.85 }),
      ] }),
  },
  {
    key: 'independence', label: 'Independence Day', note: '15 August', when: [8, 15, 8, 15],
    design: make({ tint: '#f4f9ff', greeting: 'Happy Independence Day, {name}', message: 'From the ramparts, the tricolour unfurled. Free skies, steady rigs.', caption: '15 August', bg: ['#cfe8ff', '#fff6e5'], angle: 100,
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
    design: make({ tint: '#fffbe6', greeting: 'Safety first, {name}', message: 'National Safety Day. Look out for each other today.', caption: 'Safety Day', bg: ['#f5c400', '#e8a900'], angle: 100, pattern: ['stripes', '#111827', 0.09, 1.2],
      // The signs of safety: a hard hat, a first-aid cross, a warning triangle and a cone.
      layers: () => [
        S('hardhat', 1050, 262, 200, 138, '#111827'),
        S('circle', 905, 284, 116, 116, '#16a34a'), S('rect', 905, 284, 68, 22, '#ffffff', { p: 0.25 }), S('rect', 905, 284, 22, 68, '#ffffff', { p: 0.25 }),
        S('triangle', 1175, 296, 88, 78, '#f5c400', { stroke: '#111827', sw: 7 }), S('text', 1175, 306, 0, 0, '#111827', { text: '!', size: 44, bold: true, font: 'sans', spacing: 0 }),
        S('cone', 780, 298, 62, 90, '#d94b2b'),
        S('sparkle', 740, 70, 30, 30, '#111827', { opacity: 0.35 }), S('sparkle', 1150, 190, 20, 20, '#111827', { opacity: 0.3 }),
      ] }),
  },
  {
    key: 'women', label: 'International Women’s Day', note: '8 March', when: [3, 8, 3, 8],
    design: make({ tint: '#fdf2f8', greeting: 'Happy Women’s Day, {name}', message: 'Thank you for everything you bring to every rig and office.', caption: '8 March', bg: ['#7c3aed', '#ec4899'], angle: 120, pattern: ['dots', '#ffffff', 0.14, 1.3],
      layers: () => [S('heart', 1060, 300, 70, 62, '#ffffff', { opacity: 0.9 }), S('sparkle', 700, 70, 40, 40, '#fde68a'), S('sparkle', 780, 200, 28, 28, '#ffffff', { opacity: 0.8 }), S('sparkle', 1130, 330, 36, 36, '#fde68a'), S('sparkle', 900, 310, 30, 30, '#ffffff', { opacity: 0.7 })] }),
  },
  {
    key: 'labour', label: 'Labour Day', note: '1 May', when: [5, 1, 5, 1],
    // A thank-you the whole company can use: the roles that make the work happen, each with an editable label, so HR can name the
    // departments or trades it wants to thank.
    design: make({ tint: '#f1f5f9', greeting: 'Happy Labour Day, {name}', message: 'Every role. One crew. Thank you for the work you do, on the rig and off it.', caption: '1 May', bg: ['#0f172a', '#334155'], angle: 115, contours: ['#cbd5e1', 0.07],
      layers: () => [
        S('line', 954, 322, 440, 2, '#64748b', { opacity: 0.7 }),
        S('rig', 790, 286, 44, 76, '#e2e8f0', { opacity: 0.92 }), S('ship', 872, 296, 76, 40, '#e2e8f0', { opacity: 0.92 }), S('helicopter', 954, 292, 74, 38, '#e2e8f0', { opacity: 0.92 }),
        S('gear', 1036, 292, 54, 54, '#94a3b8', { opacity: 0.95 }), S('hardhat', 1118, 298, 60, 44, '#fbbf24'),
        ...[['Rig', 790], ['Marine', 872], ['Aviation', 954], ['Engineering', 1036], ['Safety', 1118]].map(([label, x]) => S('text', x, 337, 0, 0, '#cbd5e1', { text: label, size: 12, bold: true, font: 'sans', spacing: 1, opacity: 0.85 })),
      ] }),
  },
  {
    key: 'environment', label: 'World Environment Day', note: '5 June', when: [6, 5, 6, 5],
    design: make({ tint: '#f0fdf4', greeting: 'Happy Environment Day, {name}', message: 'Small choices on the rig make a big difference to the planet.', caption: '5 June', bg: ['#0f5132', '#16a34a'], angle: 110, pattern: ['waves', '#ffffff', 0.12, 1.3],
      layers: () => [S('tree', 1040, 270, 110, 150, '#bbf7d0'), S('tree', 930, 290, 80, 110, '#86efac'), S('sun', 720, 70, 70, 70, '#fde68a'), S('cloud', 800, 150, 110, 60, '#ffffff', { opacity: 0.5 }), S('drop', 1135, 306, 34, 46, '#7dd3fc')] }),
  },
  {
    key: 'engineers', label: 'Engineers’ Day', note: '15 September', when: [9, 15, 9, 15],
    design: make({ tint: '#eef2ff', greeting: 'Happy Engineers’ Day, {name}', message: 'To everyone who builds, fixes and keeps things running.', caption: '15 September', bg: ['#0f172a', '#4338ca'], angle: 120, pattern: ['grid', '#c7d2fe', 0.06, 1], contours: ['#c7d2fe', 0.08],
      layers: () => [
        ...gears([[1060, 276, 150, '#a5b4fc', 0.9, 0], [950, 314, 84, '#818cf8', 0.75, 15], [1150, 316, 66, '#c7d2fe', 0.6, -10], [870, 290, 50, '#6366f1', 0.55, 8], [790, 318, 34, '#a5b4fc', 0.5, -5], [1010, 196, 38, '#818cf8', 0.4, 20]]),
        S('wrench', 1100, 200, 130, 48, '#e0e7ff', { rot: -35, opacity: 0.8 }), S('drillbit', 760, 286, 40, 56, '#e0e7ff', { rot: 180, opacity: 0.7 }),
      ] }),
  },
  {
    key: 'gandhi', label: 'Gandhi Jayanti', note: '2 October', when: [10, 2, 10, 2],
    design: make({ tint: '#fffdf7', greeting: 'Gandhi Jayanti, {name}', message: 'Truth, simplicity and doing the right thing, every day.', caption: '2 October', bg: ['#f6efe0', '#e9dfc9'], angle: 100, contours: ['#1c448a', 0.08],
      // Round spectacles with both arms curling the same way.
      layers: () => [
        S('circle', 934, 288, 86, 86, '#1c448a', { opacity: 0.07 }), S('circle', 1046, 288, 86, 86, '#1c448a', { opacity: 0.07 }),
        S('spectacles', 990, 288, 360, 130, '#1c448a', { p: 0.03 }),
      ] }),
  },
  {
    key: 'ganesh', label: 'Ganesh Chaturthi', note: 'Set the dates for this year', when: null,
    design: make({ tint: '#fff4e5', greeting: 'Ganpati Bappa Morya, {name}', message: 'Wishing you joy, wisdom and a fresh beginning.', caption: 'Ganesh Chaturthi', bg: ['#6b0f2a', '#c2410c'], angle: 120, pattern: ['dots', '#fbbf24', 0.12, 1.2],
      layers: () => [
        ...garland(['#fbbf24', '#f59e0b', '#fde68a', '#f97316']),
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
    design: make({ tint: '#fff1e0', greeting: 'Happy Dussehra, {name}', message: 'May good triumph over evil in all that we do.', caption: 'Vijayadashami', bg: ['#7f1d1d', '#c2410c', '#991b1b'], angle: 100,
      // A glowing red-orange sky, temples rising in hazy rows, a golden bow with its arrow raised, and marigolds along the foot.
      layers: () => [
        S('circle', 1000, 210, 460, 460, '#fb923c', { opacity: 0.16 }), S('circle', 1000, 210, 300, 300, '#fdba74', { opacity: 0.18 }), S('circle', 1000, 210, 160, 160, '#fed7aa', { opacity: 0.22 }),
        S('temple', 770, 276, 90, 150, '#fb923c', { opacity: 0.16 }), S('temple', 1190, 270, 100, 160, '#fb923c', { opacity: 0.16 }), S('temple', 880, 270, 84, 140, '#fdba74', { opacity: 0.14 }),
        S('temple', 1100, 280, 120, 170, '#7f1d1d', { opacity: 0.55 }), S('temple', 940, 292, 96, 130, '#7f1d1d', { opacity: 0.5 }), S('temple', 1190, 300, 90, 120, '#7f1d1d', { opacity: 0.5 }),
        S('bow', 1000, 226, 380, 250, '#fde68a', { fill2: '#f59e0b', grad: 70 }),
        ...Array.from({ length: 14 }, (_, i) => S('flower', 650 + i * 40, 332 + (i % 2) * 6, 34, 34, ['#f59e0b', '#fbbf24', '#f97316', '#fcd34d'][i % 4], { opacity: 0.95 })),
        S('sparkle', 726, 80, 34, 34, '#fde68a', { opacity: 0.9 }), S('sparkle', 1150, 150, 22, 22, '#fde68a', { opacity: 0.8 }), S('sparkle', 810, 190, 16, 16, '#fde68a', { opacity: 0.7 }),
      ] }),
  },
  {
    key: 'diwali', label: 'Diwali', note: 'Set the dates for this year', when: null,
    design: make({ tint: '#fff3e0', greeting: 'Happy Diwali, {name}', message: 'May every home and every rig glow bright.', caption: 'Festival of lights', bg: ['#2b1055', '#9a3412'], angle: 120, pattern: ['dots', '#fde68a', 0.22, 1.1],
      // Clay lamps, each with a three-layer flame (red-orange, gold, pale) and a soft halo.
      layers: () => [
        S('circle', 800, 266, 99, 99, '#fde68a', { opacity: 0.16 }), S('diya', 800, 306, 137, 77, '#ea580c', { fill2: '#b91c1c', grad: 90 }), S('flame', 800, 266, 37, 82, '#f97316', { fill2: '#dc2626', grad: 90 }), S('flame', 800, 270, 24, 59, '#fbbf24'), S('flame', 800, 274, 12, 34, '#fef3c7'),
        S('circle', 960, 283, 79, 79, '#fde68a', { opacity: 0.16 }), S('diya', 960, 314, 110, 62, '#ea580c', { fill2: '#b91c1c', grad: 90 }), S('flame', 960, 283, 29, 66, '#f97316', { fill2: '#dc2626', grad: 90 }), S('flame', 960, 287, 19, 47, '#fbbf24'), S('flame', 960, 291, 9, 27, '#fef3c7'),
        S('circle', 1110, 264, 93, 93, '#fde68a', { opacity: 0.16 }), S('diya', 1110, 302, 130, 72, '#ea580c', { fill2: '#b91c1c', grad: 90 }), S('flame', 1110, 264, 35, 78, '#f97316', { fill2: '#dc2626', grad: 90 }), S('flame', 1110, 268, 23, 56, '#fbbf24'), S('flame', 1110, 272, 11, 32, '#fef3c7'),
        S('sparkle', 740, 64, 44, 44, '#fde68a'), S('sparkle', 1135, 150, 26, 26, '#fde68a', { opacity: 0.8 }), S('star', 690, 200, 30, 30, '#fde68a', { opacity: 0.7 }),
      ] }),
  },
  {
    key: 'holi', label: 'Holi', note: 'Set the dates for this year', when: null,
    design: make({ tint: '#fff5f9', greeting: 'Happy Holi, {name}', message: 'Wishing you a colourful and joyful day.', caption: 'Festival of colours', bg: ['#fde68a', '#fbcfe8', '#a5f3fc'], angle: 110,
      // Clouds of gulal, paint splashes, water balloons and flying colour, every one a bright blend of two colours.
      layers: () => [
        S('burst', 1040, 300, 250, 250, '#ec4899', { fill2: '#f97316', grad: 60, opacity: 0.9 }),
        S('burst', 915, 322, 170, 170, '#22d3ee', { fill2: '#6366f1', grad: 120, opacity: 0.88 }),
        S('burst', 1160, 322, 180, 180, '#facc15', { fill2: '#22c55e', grad: 70, opacity: 0.88 }),
        S('burst', 820, 330, 120, 120, '#4ade80', { fill2: '#06b6d4', grad: 90, opacity: 0.85 }),
        S('burst', 1000, 220, 110, 110, '#a855f7', { fill2: '#ec4899', grad: 45, opacity: 0.8 }),
        S('splash', 760, 90, 130, 130, '#db2777', { fill2: '#f472b6', grad: 45, rot: 15 }),
        S('splash', 1130, 66, 110, 110, '#0ea5e9', { fill2: '#22d3ee', grad: 60, rot: -20 }),
        S('splash', 880, 190, 76, 76, '#f59e0b', { fill2: '#fde047', grad: 90, rot: 30 }),
        S('balloon', 700, 214, 42, 70, '#ec4899', { fill2: '#f97316', grad: 90, rot: -14 }), S('balloon', 826, 150, 46, 76, '#38bdf8', { fill2: '#6366f1', grad: 90, rot: 8 }),
        S('drop', 940, 70, 30, 42, '#f43f5e', { rot: 20 }), S('drop', 1010, 150, 24, 34, '#0ea5e9', { rot: -25 }), S('drop', 1175, 190, 28, 40, '#7c3aed', { rot: 15 }), S('drop', 730, 40, 22, 30, '#16a34a', { rot: -12 }),
        S('circle', 1176, 120, 16, 16, '#ec4899', { opacity: 0.9 }), S('circle', 780, 240, 13, 13, '#f43f5e', { opacity: 0.9 }), S('circle', 960, 130, 12, 12, '#38bdf8', { opacity: 0.9 }), S('circle', 1090, 140, 10, 10, '#facc15', { opacity: 0.95 }), S('circle', 710, 120, 11, 11, '#22c55e', { opacity: 0.9 }), S('circle', 1050, 36, 12, 12, '#a855f7', { opacity: 0.9 }),
        S('sparkle', 860, 60, 22, 22, '#ffffff', { opacity: 0.9 }), S('sparkle', 1100, 230, 18, 18, '#ffffff', { opacity: 0.85 }),
      ] }),
  },
  {
    key: 'eid', label: 'Eid', note: 'Set the dates for this year', when: null,
    design: make({ tint: '#ecfdf9', greeting: 'Eid Mubarak, {name}', message: 'Wishing you peace, joy and togetherness.', caption: 'Eid', bg: ['#07142e', '#0f766e'], angle: 125, pattern: ['dots', '#fde68a', 0.1, 1],
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
    design: make({ tint: '#ffffff', greeting: 'Merry Christmas, {name}', message: 'Wishing you warmth and joy with the people you love.', caption: 'Christmas', bg: ['#f0f7ff', '#ffffff'], angle: 120,
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
    design: make({ tint: '#eef2ff', greeting: 'Happy New Year, {name}', message: 'Here is to a safe and successful year ahead.', caption: 'New Year', bg: ['#0f172a', '#4338ca'], angle: 120, pattern: ['grid', '#c7d2fe', 0.05, 1], contours: ['#c7d2fe', 0.07],
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
